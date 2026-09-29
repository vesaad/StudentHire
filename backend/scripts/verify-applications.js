import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import { PDFDocument } from 'pdf-lib';
import { createDatabaseClient } from '../src/config/database.js';
import { createApplicationRouter } from '../src/applications/routes.js';
import { applyForOffer, changeApplicationStatus } from '../src/applications/service.js';
import { createCvStorage } from '../src/students/cv-storage.js';
import { replaceCv, deleteCv } from '../src/students/cv-service.js';
import { createSession } from '../src/auth/service.js';
import { errorHandler } from '../src/middleware/errors.js';

const prisma = createDatabaseClient();
const directory = await mkdtemp(path.join(tmpdir(), 'studenthire-application-check-'));
const storage = createCvStorage(directory);
const ids = [];
let checks = 0;
function check(actual, expected) {
  assert.deepEqual(actual, expected);
  checks++;
}
async function account(role) {
  const user = await prisma.user.create({
    data: {
      email: `application-${randomUUID()}@example.invalid`,
      passwordHash: 'test-only',
      role,
      ...(role === 'company'
        ? { company: { create: { name: 'Application test company', status: 'approved' } } }
        : role === 'student'
          ? { student: { create: { firstName: 'Test', lastName: 'Student' } } }
          : {}),
    },
    include: { company: true, student: true },
  });
  ids.push(user.id);
  return user;
}
function failingNotifications() {
  return new Proxy(prisma, {
    get(target, key) {
      if (key === '$transaction')
        return (callback, options) =>
          prisma.$transaction(
            (tx) =>
              callback(
                new Proxy(tx, {
                  get(object, field) {
                    if (field === 'notification')
                      return {
                        create() {
                          throw new Error('Simulated notification failure');
                        },
                      };
                    return object[field];
                  },
                }),
              ),
            options,
          );
      return target[key];
    },
  });
}
try {
  const company = await account('company');
  const otherCompany = await account('company');
  const student = await account('student');
  const otherStudent = await account('student');
  const admin = await account('admin');
  const base = {
    companyId: company.company.id,
    title: 'Application test offer',
    description: 'Private application test.',
    location: 'Prishtinë',
    type: 'internship',
    employmentType: 'part_time',
    status: 'published',
    publishedAt: new Date(),
  };
  const offer = await prisma.opportunity.create({ data: base });
  const app = express();
  app.use(express.json());
  app.use('/applications', createApplicationRouter(prisma, storage));
  app.use(errorHandler);
  const call = (method, route = '', body, user = student) =>
    request(app)
      [method](`/applications${route}`)
      .auth(createSession(user).token, { type: 'bearer' })
      .send(body);
  const apply = (opportunityId = offer.id, user = student) =>
    call('post', '', { opportunityId, message: 'Mesazh prove' }, user);
  check((await request(app).get('/applications')).status, 401);
  check((await call('get', '', undefined, admin)).status, 403);
  check((await apply(offer.id, company)).status, 403);
  check((await apply()).status, 400);
  check(
    (await call('post', '', { opportunityId: offer.id, studentId: otherStudent.student.id }))
      .status,
    400,
  );
  check(
    (await call('post', '', { opportunityId: offer.id, message: 'x'.repeat(3001) })).status,
    400,
  );
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText('Original CV');
  const original = Buffer.from(await pdf.save());
  const file = {
    originalname: 'CV-original.pdf',
    mimetype: 'application/pdf',
    buffer: original,
    size: original.length,
  };
  await replaceCv(prisma, storage, student.id, 0, file);
  for (const data of [
    { status: 'draft' },
    { status: 'closed' },
    { status: 'published', deadline: new Date(Date.now() - 1000) },
  ]) {
    await prisma.opportunity.update({ where: { id: offer.id }, data });
    check((await apply()).status, 409);
  }
  await prisma.opportunity.update({
    where: { id: offer.id },
    data: { status: 'published', deadline: null },
  });
  for (const status of ['pending', 'rejected']) {
    await prisma.company.update({ where: { id: company.company.id }, data: { status } });
    check((await apply()).status, 409);
  }
  await prisma.company.update({ where: { id: company.company.id }, data: { status: 'approved' } });
  await prisma.user.update({ where: { id: company.id }, data: { status: 'suspended' } });
  check((await apply()).status, 409);
  await prisma.user.update({ where: { id: company.id }, data: { status: 'active' } });
  await prisma.user.update({ where: { id: student.id }, data: { status: 'suspended' } });
  check((await apply()).status, 403);
  await prisma.user.update({ where: { id: student.id }, data: { status: 'active' } });
  const beforeFiles = (await readdir(directory)).sort();
  await assert.rejects(
    applyForOffer(failingNotifications(), storage, student, {
      opportunityId: offer.id,
      message: '',
    }),
    /Simulated/,
  );
  checks++;
  check((await readdir(directory)).sort(), beforeFiles);
  check(await prisma.application.count({ where: { opportunityId: offer.id } }), 0);
  check(await prisma.applicationStatusHistory.count({ where: { actorId: student.id } }), 0);
  const responses = await Promise.all([apply(), apply()]);
  check(responses.map((item) => item.status).sort(), [201, 409]);
  const applicationId = responses.find((item) => item.status === 201).body.data.id;
  const stored = await prisma.application.findUnique({ where: { id: applicationId } });
  const profile = await prisma.student.findUnique({ where: { userId: student.id } });
  check(stored.cvSnapshotKey !== profile.cvStorageKey, true);
  check(await storage.read(stored.cvSnapshotKey), original);
  check(await prisma.notification.count({ where: { applicationId, userId: company.id } }), 1);
  check(await prisma.applicationStatusHistory.count({ where: { applicationId } }), 1);
  check((await call('get', `/for-offer/${offer.id}`)).body.data.id, applicationId);
  check((await call('get', `/for-offer/${offer.id}`, undefined, otherStudent)).body.data, null);
  for (const user of [otherStudent, otherCompany]) {
    check((await call('get', `/${applicationId}`, undefined, user)).status, 404);
    check((await call('get', `/${applicationId}/cv`, undefined, user)).status, 404);
    check(
      (
        await call(
          'post',
          `/${applicationId}/status`,
          { status: 'rejected', expectedStatus: 'pending' },
          user,
        )
      ).status,
      404,
    );
    check((await call('get', '', undefined, user)).body.data.total, 0);
  }
  check((await call('get', `/${applicationId}`, undefined, company)).status, 200);
  check('cvSnapshotKey' in (await call('get', `/${applicationId}`)).body.data, false);
  check((await call('get', `?opportunityId=${offer.id}`, undefined, company)).body.data.total, 1);
  check((await call('get', '?page=2')).body.data.items.length, 0);
  check((await call('get', '?status=wrong')).status, 400);
  const replacementDoc = await PDFDocument.create();
  replacementDoc.addPage().drawText('Replacement');
  const replacement = Buffer.from(await replacementDoc.save());
  await replaceCv(prisma, storage, student.id, 1, {
    ...file,
    buffer: replacement,
    size: replacement.length,
  });
  await deleteCv(prisma, storage, student.id, 2);
  check(await storage.read(stored.cvSnapshotKey), original);
  check((await call('get', `/${applicationId}/cv`, undefined, company)).status, 200);
  check((await call('get', `/${applicationId}/cv`)).headers['content-type'], 'application/pdf');
  const transition = (status, expectedStatus, user = company) =>
    call(
      'post',
      `/${applicationId}/status`,
      { status, expectedStatus, note: 'Shënim prove' },
      user,
    );
  check((await transition('accepted', 'pending', student)).status, 409);
  check((await transition('withdrawn', 'pending')).status, 409);
  await assert.rejects(
    changeApplicationStatus(failingNotifications(), company, applicationId, {
      status: 'reviewed',
      expectedStatus: 'pending',
      note: '',
    }),
    /Simulated/,
  );
  checks++;
  check((await prisma.application.findUnique({ where: { id: applicationId } })).status, 'pending');
  check(await prisma.applicationStatusHistory.count({ where: { applicationId } }), 1);
  check((await transition('reviewed', 'pending')).status, 200);
  check((await transition('accepted', 'pending')).status, 409);
  check((await call('get', '?status=reviewed', undefined, company)).body.data.total, 1);
  check(await prisma.notification.count({ where: { applicationId, userId: student.id } }), 1);
  await prisma.company.update({ where: { id: company.company.id }, data: { status: 'rejected' } });
  check((await call('get', `/${applicationId}/cv`, undefined, company)).status, 403);
  check((await transition('accepted', 'reviewed')).status, 403);
  check((await transition('withdrawn', 'reviewed', student)).status, 200);
  await prisma.company.update({ where: { id: company.company.id }, data: { status: 'approved' } });
  check((await apply()).status, 409);
  check((await transition('accepted', 'withdrawn')).status, 409);
  check(await prisma.applicationStatusHistory.count({ where: { applicationId } }), 3);
  await replaceCv(prisma, storage, student.id, 3, file);
  for (const finalStatus of ['accepted', 'rejected']) {
    const anotherOffer = await prisma.opportunity.create({ data: base });
    const result = await apply(anotherOffer.id);
    check(result.status, 201);
    const id = result.body.data.id;
    await prisma.opportunity.update({ where: { id: anotherOffer.id }, data: { status: 'closed' } });
    check(
      (
        await call(
          'post',
          `/${id}/status`,
          { status: finalStatus, expectedStatus: 'pending' },
          company,
        )
      ).status,
      200,
    );
    check(
      (
        await call(
          'post',
          `/${id}/status`,
          { status: 'withdrawn', expectedStatus: finalStatus },
          student,
        )
      ).status,
      409,
    );
  }
  const raceOffer = await prisma.opportunity.create({ data: base });
  const raceId = (await apply(raceOffer.id)).body.data.id;
  const race = await Promise.all([
    call('post', `/${raceId}/status`, { status: 'accepted', expectedStatus: 'pending' }, company),
    call('post', `/${raceId}/status`, { status: 'withdrawn', expectedStatus: 'pending' }, student),
  ]);
  check(race.map((item) => item.status).sort(), [200, 409]);
  check(await prisma.applicationStatusHistory.count({ where: { applicationId: raceId } }), 2);
  check(await prisma.notification.count({ where: { applicationId: raceId } }), 2);
  console.log(`${checks} application checks passed.`);
} finally {
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.applicationStatusHistory.deleteMany({ where: { actorId: { in: ids } } });
  await prisma.application.deleteMany({ where: { student: { userId: { in: ids } } } });
  await prisma.opportunity.deleteMany({ where: { company: { userId: { in: ids } } } });
  await prisma.student.deleteMany({ where: { userId: { in: ids } } });
  await prisma.company.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  for (const file of await readdir(directory)) await unlink(path.join(directory, file));
  await rmdir(directory);
  await prisma.$disconnect();
}
