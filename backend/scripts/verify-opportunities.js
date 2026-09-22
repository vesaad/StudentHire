import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { createDatabaseClient } from '../src/config/database.js';
import { createOpportunityRouter } from '../src/opportunities/routes.js';
import { createSession } from '../src/auth/service.js';
import { errorHandler } from '../src/middleware/errors.js';

const prisma = createDatabaseClient();
const marker = `offer-check-${randomUUID()}`;
const users = [];
let skill;
let checks = 0;
function check(actual, expected) {
  assert.deepEqual(actual, expected);
  checks++;
}
async function account(role, suffix) {
  const user = await prisma.user.create({
    data: {
      email: `${marker}-${suffix}@example.invalid`,
      passwordHash: 'test-only-no-login',
      role,
      ...(role === 'company'
        ? { company: { create: { name: marker, status: 'approved' } } }
        : { student: { create: { firstName: 'Test', lastName: 'Student' } } }),
    },
    include: { company: true, student: true },
  });
  users.push(user.id);
  return user;
}
try {
  const owner = await account('company', 'owner');
  const other = await account('company', 'other');
  const student = await account('student', 'student');
  skill = await prisma.skill.create({ data: { name: marker } });
  const app = express();
  app.use(express.json());
  app.use('/offers', createOpportunityRouter(prisma));
  app.use(errorHandler);
  const call = (method, path, data, user = owner) =>
    request(app)
      [method](`/offers${path}`)
      .auth(createSession(user).token, { type: 'bearer' })
      .send(data);
  const fields = {
    title: 'Frontend developer',
    description: 'Build accessible user interfaces.',
    location: 'Prishtinë',
    type: 'job',
    employmentType: 'full_time',
    deadline: null,
    skillIds: [skill.id],
  };
  check((await request(app).get('/offers')).status, 401);
  check((await call('get', '', undefined, student)).status, 403);
  for (const status of ['pending', 'rejected']) {
    await prisma.company.update({ where: { id: owner.company.id }, data: { status } });
    check((await call('post', '', fields)).status, 403);
  }
  await prisma.company.update({ where: { id: owner.company.id }, data: { status: 'approved' } });
  await prisma.user.update({ where: { id: owner.id }, data: { status: 'suspended' } });
  check((await call('post', '', fields)).status, 403);
  await prisma.user.update({ where: { id: owner.id }, data: { status: 'active' } });
  for (const invalid of [
    { companyId: other.company.id },
    { status: 'published' },
    { skillIds: [skill.id, skill.id] },
    { skillIds: [4294967295] },
    { title: ' ' },
    { deadline: 'bad-date' },
  ]) {
    check((await call('post', '', { ...fields, ...invalid })).status, 400);
  }
  check(await prisma.opportunity.count({ where: { companyId: owner.company.id } }), 0);
  const created = await call('post', '', fields);
  check(created.status, 201);
  const id = created.body.data.id;
  check(created.body.data.status, 'draft');
  check(created.body.data.skills[0].skillId, skill.id);
  check(created.body.data.publishedAt, null);
  check((await call('get', `/${id}`, undefined, other)).status, 404);
  check((await call('put', `/${id}`, { ...fields, revision: 0 }, other)).status, 404);
  check((await call('post', `/${id}/publish`, { revision: 0 }, other)).status, 404);
  check((await call('post', `/${id}/close`, { revision: 0 }, other)).status, 404);
  check((await call('get', '', undefined, other)).body.data.total, 0);
  check((await call('get', '?page=0')).status, 400);
  check((await call('get', '/invalid')).status, 400);
  check(
    (await call('put', `/${id}`, { ...fields, revision: 0, skillIds: [4294967295] })).status,
    400,
  );
  check((await call('get', `/${id}`)).body.data.revision, 0);
  await prisma.skill.update({ where: { id: skill.id }, data: { isActive: false } });
  check((await call('post', '', fields)).status, 400);
  check((await call('put', `/${id}`, { ...fields, revision: 0 })).status, 200);
  check((await call('put', `/${id}`, { ...fields, revision: 0 })).status, 409);
  const catalog = await call('get', '/skills');
  check(
    catalog.body.data.some((item) => item.id === skill.id),
    false,
  );
  const published = await Promise.all([
    call('post', `/${id}/publish`, { revision: 1 }),
    call('post', `/${id}/publish`, { revision: 1 }),
  ]);
  check(published.map((result) => result.status).sort(), [200, 409]);
  const offer = (await call('get', `/${id}`)).body.data;
  check(offer.status, 'published');
  check(Boolean(offer.publishedAt), true);
  check((await call('post', `/${id}/publish`, { revision: 2 })).status, 409);
  const past = new Date(Date.now() - 86400000).toISOString();
  check((await call('put', `/${id}`, { ...fields, revision: 2, deadline: past })).status, 400);
  const application = await prisma.application.create({
    data: {
      studentId: student.student.id,
      opportunityId: id,
      cvSnapshotKey: marker,
      cvOriginalName: 'test.pdf',
      cvSizeBytes: 1,
      history: { create: { actorId: student.id, toStatus: 'pending' } },
      notifications: {
        create: { userId: owner.id, type: 'application_received', title: 'Test', message: 'Test' },
      },
    },
    include: { history: true, notifications: true },
  });
  await prisma.savedOpportunity.create({
    data: { studentId: student.student.id, opportunityId: id },
  });
  const closed = await call('post', `/${id}/close`, { revision: 2 });
  check(closed.status, 200);
  check(closed.body.data.status, 'closed');
  check(Boolean(closed.body.data.closedAt), true);
  check(
    await prisma.application.findUnique({
      where: { id: application.id },
      include: { history: true, notifications: true },
    }),
    application,
  );
  check(await prisma.savedOpportunity.count({ where: { opportunityId: id } }), 1);
  check((await call('put', `/${id}`, { ...fields, revision: 3 })).status, 409);
  check((await call('post', `/${id}/publish`, { revision: 3 })).status, 409);
  check((await call('post', `/${id}/close`, { revision: 3 })).status, 409);
  const draft = await call('post', '', {
    ...fields,
    type: 'internship',
    skillIds: [],
    deadline: past,
  });
  check(draft.status, 201);
  check(draft.body.data.type, 'internship');
  check((await call('post', `/${draft.body.data.id}/publish`, { revision: 0 })).status, 400);
  check((await call('get', '?status=closed')).body.data.total, 1);
  check((await call('get', '?status=draft')).body.data.total, 1);
  check((await call('get', '?page=2')).body.data.items.length, 0);
  check((await call('post', `/${draft.body.data.id}/close`, { revision: 0 })).status, 200);
  console.log(`${checks} opportunity checks passed.`);
} finally {
  const owned = { company: { userId: { in: users } } };
  await prisma.notification.deleteMany({ where: { userId: { in: users } } });
  await prisma.applicationStatusHistory.deleteMany({ where: { actorId: { in: users } } });
  await prisma.application.deleteMany({ where: { opportunity: owned } });
  await prisma.savedOpportunity.deleteMany({ where: { opportunity: owned } });
  await prisma.opportunity.deleteMany({ where: owned });
  await prisma.company.deleteMany({ where: { userId: { in: users } } });
  await prisma.student.deleteMany({ where: { userId: { in: users } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  if (skill) await prisma.skill.delete({ where: { id: skill.id } });
  await prisma.$disconnect();
}
