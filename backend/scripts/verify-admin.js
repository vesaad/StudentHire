import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { createDatabaseClient } from '../src/config/database.js';
import { createAdminRouter } from '../src/admin/routes.js';
import { changeAccount, moderateOffer } from '../src/admin/service.js';
import { createSession } from '../src/auth/service.js';
import { authenticate } from '../src/auth/middleware.js';
import { errorHandler } from '../src/middleware/errors.js';
const db = createDatabaseClient();
const ids = [];
const skillIds = [];
let checks = 0;
function check(actual, expected) {
  assert.deepEqual(actual, expected);
  checks++;
}
async function user(role) {
  const result = await db.user.create({
    data: {
      email: `admin-test-${randomUUID()}@example.invalid`,
      passwordHash: 'test-only',
      role,
      ...(role === 'student'
        ? { student: { create: { firstName: 'Test', lastName: 'Student' } } }
        : role === 'company'
          ? { company: { create: { name: 'Moderation test', status: 'approved' } } }
          : {}),
    },
    include: { student: true, company: true },
  });
  ids.push(result.id);
  return result;
}
function broken() {
  return new Proxy(db, {
    get(target, key) {
      if (key === '$transaction')
        return (callback) =>
          db.$transaction((tx) =>
            callback(
              new Proxy(tx, {
                get(object, field) {
                  if (field === 'notification')
                    return {
                      create() {
                        throw new Error('Simulated failure');
                      },
                    };
                  return object[field];
                },
              }),
            ),
          );
      return target[key];
    },
  });
}
try {
  const admin = await user('admin');
  const student = await user('student');
  const company = await user('company');
  const app = express();
  app.use(express.json());
  app.use('/admin', createAdminRouter(db));
  app.get('/session', authenticate(db), (req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  const call = (method, path, body, actor = admin) =>
    request(app)
      [method](`/admin${path}`)
      .auth(createSession(actor).token, { type: 'bearer' })
      .send(body);
  check((await request(app).get('/admin/users')).status, 401);
  for (const actor of [student, company])
    for (const path of ['/users', '/skills', '/offers'])
      check((await call('get', path, undefined, actor)).status, 403);
  check((await call('get', '/users?page=0')).status, 400);
  check((await call('get', '/users?role=bad')).status, 400);
  const users = (await call('get', `/users?q=${encodeURIComponent(student.email)}`)).body.data;
  check(users.total, 1);
  check('passwordHash' in users.items[0], false);
  const change = { revision: 0, status: 'suspended', reason: 'Test suspension' };
  check(
    (await call('patch', `/users/${student.id}/status`, { ...change, role: 'admin' })).status,
    400,
  );
  check(
    (await call('patch', `/users/${student.id}/status`, { ...change, reason: '' })).status,
    400,
  );
  check((await call('patch', `/users/${admin.id}/status`, change)).status, 403);
  check((await call('patch', `/users/${company.id}/status`, change)).status, 403);
  await assert.rejects(changeAccount(broken(), admin.id, student.id, change), /Simulated/);
  checks++;
  check((await db.user.findUnique({ where: { id: student.id } })).status, 'active');
  check((await call('patch', `/users/${student.id}/status`, change)).status, 200);
  check(
    (await request(app).get('/session').auth(createSession(student).token, { type: 'bearer' }))
      .status,
    403,
  );
  check((await call('patch', `/users/${student.id}/status`, change)).status, 409);
  check(
    (
      await call('patch', `/users/${student.id}/status`, {
        ...change,
        status: 'active',
        revision: 1,
      })
    ).status,
    200,
  );
  check(
    await db.notification.count({ where: { userId: student.id, type: 'account_status_changed' } }),
    2,
  );
  const skillName = `Test skill ${randomUUID()}`;
  const created = await call('post', '/skills', { name: skillName });
  check(created.status, 201);
  const skill = created.body.data;
  skillIds.push(skill.id);
  check((await call('post', '/skills', { name: skillName })).status, 409);
  check((await call('post', '/skills', { name: '   ' })).status, 400);
  check((await call('post', '/skills', { name: 'x', isActive: false })).status, 400);
  await db.studentSkill.create({ data: { studentId: student.student.id, skillId: skill.id } });
  const base = {
    companyId: company.company.id,
    title: 'Moderation test offer',
    description: 'Offer for moderation test',
    location: 'Test',
    type: 'job',
    employmentType: 'full_time',
    status: 'published',
    publishedAt: new Date(),
  };
  const offer = await db.opportunity.create({
    data: { ...base, skills: { create: { skillId: skill.id } } },
  });
  check(
    (await call('put', `/skills/${skill.id}`, { name: skillName, isActive: false, revision: 0 }))
      .status,
    200,
  );
  check(await db.studentSkill.count({ where: { skillId: skill.id } }), 1);
  check(await db.opportunitySkill.count({ where: { skillId: skill.id } }), 1);
  check(
    (await call('put', `/skills/${skill.id}`, { name: skillName, isActive: true, revision: 0 }))
      .status,
    409,
  );
  check(
    (
      await call('put', `/skills/${skill.id}`, {
        name: skillName + ' edited',
        isActive: true,
        revision: 1,
      })
    ).status,
    200,
  );
  check((await call('get', `/skills?q=${encodeURIComponent(skillName)}`)).body.data.total, 1);
  const application = await db.application.create({
    data: {
      studentId: student.student.id,
      opportunityId: offer.id,
      cvSnapshotKey: randomUUID() + '.pdf',
      cvOriginalName: 'fixture.pdf',
      cvSizeBytes: 1,
      history: { create: { actorId: student.id, toStatus: 'pending' } },
    },
    include: { history: true },
  });
  await db.savedOpportunity.create({
    data: { studentId: student.student.id, opportunityId: offer.id },
  });
  const close = { revision: 0, reason: 'Test moderation reason' };
  check((await call('post', `/offers/${offer.id}/close`, { ...close, reason: 'x' })).status, 400);
  check((await call('post', `/offers/${offer.id}/close`, close, company)).status, 403);
  await assert.rejects(moderateOffer(broken(), admin.id, offer.id, close), /Simulated/);
  checks++;
  check((await db.opportunity.findUnique({ where: { id: offer.id } })).status, 'published');
  const outcomes = await Promise.all([
    call('post', `/offers/${offer.id}/close`, close),
    call('post', `/offers/${offer.id}/close`, close),
  ]);
  check(outcomes.map((item) => item.status).sort(), [200, 409]);
  const closed = await db.opportunity.findUnique({ where: { id: offer.id } });
  check(closed.status, 'closed');
  check(closed.moderatedById, admin.id);
  check(closed.moderationReason, close.reason);
  check(Boolean(closed.moderatedAt), true);
  check(
    await db.application.findUnique({ where: { id: application.id }, include: { history: true } }),
    application,
  );
  check(await db.savedOpportunity.count({ where: { opportunityId: offer.id } }), 1);
  check(
    await db.notification.count({ where: { userId: company.id, type: 'opportunity_moderated' } }),
    1,
  );
  check((await call('post', `/offers/${offer.id}/close`, { ...close, revision: 1 })).status, 409);
  const list = (await call('get', '/offers?q=Moderation%20test%20offer&status=closed')).body.data;
  check(
    list.items.some((item) => item.id === offer.id && item.moderatedBy.id === admin.id),
    true,
  );
  await db.user.update({ where: { id: admin.id }, data: { status: 'suspended' } });
  check((await call('get', '/users')).status, 403);
  check((await call('post', '/skills', { name: 'Blocked' })).status, 403);
  console.log(`${checks} admin/moderation checks passed.`);
} finally {
  await db.notification.deleteMany({ where: { userId: { in: ids } } });
  await db.applicationStatusHistory.deleteMany({ where: { actorId: { in: ids } } });
  await db.application.deleteMany({ where: { student: { userId: { in: ids } } } });
  await db.savedOpportunity.deleteMany({ where: { student: { userId: { in: ids } } } });
  await db.opportunity.deleteMany({ where: { company: { userId: { in: ids } } } });
  await db.student.deleteMany({ where: { userId: { in: ids } } });
  await db.company.deleteMany({ where: { userId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.skill.deleteMany({ where: { id: { in: skillIds } } });
  await db.$disconnect();
}
