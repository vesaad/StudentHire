import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { createDatabaseClient } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { createAuthRouter } from '../src/auth/routes.js';
import { errorHandler } from '../src/middleware/errors.js';

const prisma = createDatabaseClient();
const rollback = new Error('ROLLBACK_AUTH_TEST');
const email = `auth-${randomUUID()}@example.invalid`;
let checks = 0;
function check(actual, expected) {
  assert.equal(actual, expected);
  checks++;
}
try {
  try {
    await prisma.$transaction(
      async (tx) => {
        const app = express();
        app.use(express.json());
        app.use('/auth', createAuthRouter(tx));
        app.use(errorHandler);
        const input = {
          role: 'student',
          email,
          password: 'Test-password-123',
          firstName: 'Test',
          lastName: 'Student',
        };
        const registered = await request(app).post('/auth/register').send(input);
        check(registered.status, 201);
        check(registered.body.data.user.passwordHash, undefined);
        const token = registered.body.data.token;
        const id = registered.body.data.user.id;
        const stored = await tx.user.findUnique({ where: { id }, include: { student: true } });
        check(await bcrypt.compare(input.password, stored.passwordHash), true);
        check(stored.student.firstName, 'Test');
        check(
          (
            await request(app)
              .post('/auth/register')
              .send({ ...input, email: email.toUpperCase() })
          ).status,
          409,
        );
        check(
          (
            await request(app)
              .post('/auth/register')
              .send({ ...input, role: 'admin' })
          ).status,
          400,
        );
        check(
          (
            await request(app)
              .post('/auth/register')
              .send({ ...input, status: 'active' })
          ).status,
          400,
        );
        check(
          (
            await request(app)
              .post('/auth/register')
              .send({ ...input, password: 'ë'.repeat(40) })
          ).status,
          400,
        );
        check(
          (await request(app).post('/auth/login').send({ email, password: 'wrong' })).status,
          401,
        );
        check(
          (
            await request(app)
              .post('/auth/login')
              .send({ email: ' ' + email.toUpperCase() + ' ', password: input.password })
          ).status,
          200,
        );
        check((await request(app).get('/auth/me')).status, 401);
        check(
          (await request(app).get('/auth/me').auth(token, { type: 'bearer' })).body.data.id,
          id,
        );
        check(
          (
            await request(app)
              .get('/auth/me')
              .auth(token + 'invalid', { type: 'bearer' })
          ).status,
          401,
        );
        const expired = jwt.sign({}, env.JWT_ACCESS_SECRET, {
          subject: String(id),
          expiresIn: -1,
          issuer: 'studenthire',
          audience: 'studenthire-web',
        });
        check((await request(app).get('/auth/me').auth(expired, { type: 'bearer' })).status, 401);
        check(
          (await request(app).get('/auth/workspace/admin').auth(token, { type: 'bearer' })).status,
          403,
        );
        const owned = await request(app)
          .get('/auth/workspace/student?userId=999')
          .auth(token, { type: 'bearer' });
        check(owned.body.data.user.id, id);
        await tx.user.update({ where: { id }, data: { status: 'suspended' } });
        check((await request(app).get('/auth/me').auth(token, { type: 'bearer' })).status, 403);
        check(
          (await request(app).post('/auth/login').send({ email, password: input.password })).status,
          403,
        );
        const company = await request(app)
          .post('/auth/register')
          .send({
            role: 'company',
            email: 'company-' + email,
            password: input.password,
            companyName: 'Test Company',
          });
        check(company.status, 201);
        const workspace = await request(app)
          .get('/auth/workspace/company')
          .auth(company.body.data.token, { type: 'bearer' });
        check(workspace.body.data.profile.status, 'pending');
        const admin = await tx.user.create({
          data: { email: 'admin-' + email, role: 'admin', passwordHash: stored.passwordHash },
        });
        const adminLogin = await request(app)
          .post('/auth/login')
          .send({ email: admin.email, password: input.password });
        check(adminLogin.status, 200);
        check(
          (
            await request(app)
              .get('/auth/workspace/admin')
              .auth(adminLogin.body.data.token, { type: 'bearer' })
          ).status,
          200,
        );
        for (let i = 0; i < 21; i++) {
          const response = await request(app)
            .post('/auth/login')
            .send({ email, password: 'wrong' });
          if (i === 20) check(response.status, 429);
        }
        throw rollback;
      },
      { timeout: 60000 },
    );
  } catch (error) {
    if (error !== rollback) throw error;
  }
  check(await prisma.user.count({ where: { email: { endsWith: email } } }), 0);
  console.log(`${checks} kontrolle autentikimi kaluan; llogaritë e provës u anuluan me rollback.`);
} finally {
  await prisma.$disconnect();
}
