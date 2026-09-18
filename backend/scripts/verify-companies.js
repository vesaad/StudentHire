import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { createDatabaseClient } from '../src/config/database.js';
import { createCompanyRouter } from '../src/companies/routes.js';
import { decideCompany, requireApprovedCompany } from '../src/companies/service.js';
import { createSession } from '../src/auth/service.js';
import { authenticate } from '../src/auth/middleware.js';
import { errorHandler } from '../src/middleware/errors.js';

const prisma = createDatabaseClient();
const marker = `company-check-${randomUUID()}`;
const ids = [];
let checks = 0;
function check(value, expected) {
  assert.equal(value, expected);
  checks++;
}
async function user(role, suffix) {
  const result = await prisma.user.create({
    data: {
      email: `${marker}-${suffix}@example.invalid`,
      passwordHash: 'test-only-no-login',
      role,
      ...(role === 'company' ? { company: { create: { name: marker } } } : {}),
    },
    include: { company: true },
  });
  ids.push(result.id);
  return result;
}
try {
  const admin = await user('admin', 'admin');
  const owner = await user('company', 'owner');
  const other = await user('company', 'other');
  const student = await user('student', 'student');
  const token = (account) => createSession(account).token;
  const app = express();
  app.use(express.json());
  app.use('/companies', createCompanyRouter(prisma));
  app.get('/publish-check', authenticate(prisma), requireApprovedCompany(prisma), (req, res) =>
    res.json({ companyId: req.company.id }),
  );
  app.use(errorHandler);
  const get = (path, account) => request(app).get(path).auth(token(account), { type: 'bearer' });
  const decide = (revision, action, reason = '') =>
    request(app)
      .post(`/companies/${owner.company.id}/decisions`)
      .auth(token(admin), { type: 'bearer' })
      .send({ revision, action, reason });
  check((await request(app).get('/companies/me')).status, 401);
  check((await get('/companies', owner)).status, 403);
  check((await get('/companies/me', student)).status, 403);
  check((await get(`/companies/${owner.company.id}`, other)).status, 403);
  check((await get('/companies/me', owner)).body.data.id, owner.company.id);
  check((await get('/publish-check', owner)).status, 403);
  const fields = {
    revision: 0,
    name: 'Updated Company',
    description: 'Description',
    industry: 'IT',
    location: 'Prishtinë',
    phone: '123',
    website: 'https://example.com',
  };
  const update = (data) =>
    request(app).put('/companies/me').auth(token(owner), { type: 'bearer' }).send(data);
  check((await update({ ...fields, status: 'approved' })).status, 400);
  check((await update({ ...fields, website: 'javascript:alert(1)' })).status, 400);
  check((await update(fields)).status, 200);
  check((await update(fields)).status, 409);
  check((await prisma.company.findUnique({ where: { id: other.company.id } })).revision, 0);
  check((await decide(1, 'reject')).status, 400);
  check((await decide(0, 'approve')).status, 409);
  check((await decide(1, 'approve')).status, 200);
  check((await get('/publish-check', owner)).status, 200);
  check(await prisma.companyApproval.count({ where: { companyId: owner.company.id } }), 1);
  check(await prisma.notification.count({ where: { userId: owner.id } }), 1);
  check((await decide(2, 'approve')).status, 409);
  check((await decide(2, 'suspend', 'Verification suspension')).status, 200);
  check((await get('/companies/me', owner)).status, 403);
  check((await get('/publish-check', owner)).status, 403);
  check((await decide(3, 'reactivate')).status, 200);
  check((await get('/publish-check', owner)).status, 200);
  check((await decide(4, 'reject', 'Verification rejection')).status, 200);
  check((await get('/publish-check', owner)).status, 403);
  // Dështimi i njoftimit duhet të anulojë vendimin dhe historikun.
  const broken = {
    $transaction: (callback) =>
      prisma.$transaction((tx) =>
        callback(
          new Proxy(tx, {
            get(target, key) {
              if (key === 'notification')
                return {
                  create() {
                    throw new Error('Simulated notification failure');
                  },
                };
              return target[key];
            },
          }),
        ),
      ),
  };
  await assert.rejects(
    () =>
      decideCompany(broken, owner.company.id, admin.id, {
        revision: 5,
        action: 'approve',
        reason: '',
      }),
    /Simulated/,
  );
  checks++;
  check((await prisma.company.findUnique({ where: { id: owner.company.id } })).revision, 5);
  check(await prisma.companyApproval.count({ where: { companyId: owner.company.id } }), 4);
  // Vetëm një nga dy vendimet e njëkohshme lejohet të fitojë.
  const race = await Promise.all([decide(5, 'approve'), decide(5, 'approve')]);
  check(race.filter((result) => result.status === 200).length, 1);
  check(race.filter((result) => result.status === 409).length, 1);
  check(await prisma.notification.count({ where: { userId: owner.id } }), 5);
  const detail = await get(`/companies/${owner.company.id}`, admin);
  check(detail.body.data.approvals.length, 5);
  check(
    detail.body.data.approvals.some((item) => item.toAccountStatus === 'suspended'),
    true,
  );
  check(detail.body.data.user.passwordHash, undefined);
  check((await get('/companies?status=all&page=1', admin)).status, 200);
  check((await get('/companies?status=invalid', admin)).status, 400);
  console.log(`${checks} kontrolle kompanish kaluan.`);
} finally {
  // Fshihen vetëm fixtures me ID të krijuara nga ky ekzekutim.
  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({ where: { userId: { in: ids } } });
    await tx.companyApproval.deleteMany({ where: { company: { userId: { in: ids } } } });
    await tx.company.deleteMany({ where: { userId: { in: ids } } });
    await tx.user.deleteMany({ where: { id: { in: ids } } });
  });
  await prisma.$disconnect();
}
