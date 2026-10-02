import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { createDatabaseClient } from '../src/config/database.js';
import { createDashboardRouter } from '../src/dashboard/routes.js';
import { createNotificationRouter } from '../src/notifications/routes.js';
import { createSession } from '../src/auth/service.js';
import { errorHandler } from '../src/middleware/errors.js';

const db = createDatabaseClient();
const ids = [];
let checks = 0;
function check(actual, expected) {
  assert.deepEqual(actual, expected);
  checks++;
}
async function account(role) {
  const user = await db.user.create({
    data: {
      email: `dashboard-${randomUUID()}@example.invalid`,
      passwordHash: 'test-only',
      role,
      ...(role === 'student'
        ? { student: { create: { firstName: 'Test', lastName: 'Dashboard' } } }
        : role === 'company'
          ? { company: { create: { name: 'Dashboard test', status: 'approved' } } }
          : {}),
    },
    include: { student: true, company: true },
  });
  ids.push(user.id);
  return user;
}
try {
  const student = await account('student');
  const other = await account('student');
  const company = await account('company');
  const otherCompany = await account('company');
  const admin = await account('admin');
  const app = express();
  app.use('/dashboard', createDashboardRouter(db));
  app.use('/notifications', createNotificationRouter(db));
  app.use(errorHandler);
  const get = (path, user = student) =>
    request(app).get(path).auth(createSession(user).token, { type: 'bearer' });
  const read = (id, user = student) =>
    request(app)
      .patch(`/notifications/${id}/read`)
      .auth(createSession(user).token, { type: 'bearer' });
  check((await request(app).get('/dashboard')).status, 401);
  check((await request(app).get('/notifications')).status, 401);
  check((await request(app).get('/notifications/unread-count')).status, 401);
  check((await request(app).patch('/notifications/1/read')).status, 401);
  const empty = (await get('/dashboard')).body.data;
  check(empty.role, 'student');
  check(empty.applications, {});
  check(empty.hasCv, false);
  check(empty.savedCount, 0);
  check(empty.skillCount, 0);
  check(empty.unreadCount, 0);
  const base = {
    companyId: company.company.id,
    title: 'Dashboard test',
    description: 'Dashboard fixture',
    location: 'Test',
    type: 'job',
    employmentType: 'full_time',
  };
  const draft = await db.opportunity.create({ data: base });
  const published = await db.opportunity.create({
    data: { ...base, status: 'published', publishedAt: new Date() },
  });
  await db.opportunity.create({ data: { ...base, status: 'closed', closedAt: new Date() } });
  await db.opportunity.create({ data: { ...base, companyId: otherCompany.company.id } });
  const application = await db.application.create({
    data: {
      studentId: student.student.id,
      opportunityId: published.id,
      status: 'reviewed',
      cvSnapshotKey: randomUUID() + '.pdf',
      cvOriginalName: 'fixture.pdf',
      cvSizeBytes: 1,
    },
  });
  await db.savedOpportunity.create({
    data: { studentId: student.student.id, opportunityId: published.id },
  });
  const own = [];
  for (let i = 0; i < 12; i++)
    own.push(
      await db.notification.create({
        data: {
          userId: student.id,
          applicationId: application.id,
          type: 'application_status_changed',
          title: `Test ${i}`,
          message: 'Test notification',
        },
      }),
    );
  const foreign = await db.notification.create({
    data: { userId: other.id, type: 'company_decision', title: 'Private', message: 'Other user' },
  });
  await db.notification.create({
    data: {
      userId: company.id,
      applicationId: application.id,
      type: 'application_received',
      title: 'New application',
      message: 'Test',
    },
  });
  const dashboard = (await get('/dashboard')).body.data;
  check(dashboard.applications, { reviewed: 1 });
  check(dashboard.savedCount, 1);
  check(dashboard.unreadCount, 12);
  check('users' in dashboard, false);
  check((await get(`/dashboard?userId=${other.id}&role=admin`)).body.data, dashboard);
  check((await get('/dashboard', other)).body.data.applications, {});
  const companyData = (await get('/dashboard', company)).body.data;
  check(companyData.offers, { draft: 1, published: 1, closed: 1 });
  check(companyData.applications, { reviewed: 1 });
  check(companyData.unreadCount, 1);
  check((await get('/dashboard', otherCompany)).body.data.offers, { draft: 1 });
  await db.company.update({ where: { id: company.company.id }, data: { status: 'pending' } });
  check((await get('/dashboard', company)).body.data.companyStatus, 'pending');
  check((await get('/notifications', company)).status, 200);
  const adminData = (await get('/dashboard', admin)).body.data;
  check(adminData.role, 'admin');
  check(adminData.users, await db.user.count());
  check(adminData.students, await db.student.count());
  check(adminData.applicationCount, await db.application.count());
  check(adminData.companies.pending, await db.company.count({ where: { status: 'pending' } }));
  check(adminData.unreadCount, 0);
  const first = (await get('/notifications')).body.data;
  const second = (await get('/notifications?page=2')).body.data;
  check(first.items.length, 10);
  check(second.items.length, 2);
  check(first.total, 12);
  check(first.unreadCount, 12);
  check(
    first.items.some((item) => second.items.some((next) => next.id === item.id)),
    false,
  );
  check(
    first.items.some((item) => item.id === foreign.id),
    false,
  );
  check('userId' in first.items[0], false);
  check((await get('/notifications/unread-count')).body.data.count, 12);
  check((await get('/notifications?page=0')).status, 400);
  check((await get('/notifications?filter=bad')).status, 400);
  check((await get(`/notifications?userId=${other.id}`)).status, 400);
  check((await read('bad')).status, 400);
  check((await read(foreign.id)).status, 404);
  check((await read(own[0].id, other)).status, 404);
  check((await read(own[0].id, admin)).status, 404);
  check((await db.notification.findUnique({ where: { id: foreign.id } })).readAt, null);
  const marked = await read(own[0].id);
  check(marked.status, 200);
  check(Boolean(marked.body.data.readAt), true);
  check((await read(own[0].id)).body.data.readAt, marked.body.data.readAt);
  const parallel = await Promise.all([read(own[1].id), read(own[1].id)]);
  check(
    parallel.map((item) => item.status),
    [200, 200],
  );
  check(parallel[0].body.data.readAt, parallel[1].body.data.readAt);
  check((await get('/notifications?filter=unread')).body.data.total, 10);
  check((await get('/notifications')).body.data.total, 12);
  check((await get('/notifications/unread-count')).body.data.count, 10);
  check((await get('/dashboard')).body.data.unreadCount, 10);
  check((await get('/notifications', other)).body.data.unreadCount, 1);
  await db.user.update({ where: { id: student.id }, data: { status: 'suspended' } });
  check((await get('/dashboard')).status, 403);
  check((await get('/notifications')).status, 403);
  check((await read(own[2].id)).status, 403);
  console.log(`${checks} dashboard/notification checks passed.`);
} finally {
  await db.notification.deleteMany({ where: { userId: { in: ids } } });
  await db.application.deleteMany({ where: { student: { userId: { in: ids } } } });
  await db.savedOpportunity.deleteMany({ where: { student: { userId: { in: ids } } } });
  await db.opportunity.deleteMany({ where: { company: { userId: { in: ids } } } });
  await db.student.deleteMany({ where: { userId: { in: ids } } });
  await db.company.deleteMany({ where: { userId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
}
