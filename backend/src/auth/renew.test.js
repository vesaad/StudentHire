import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createAuthRouter } from './routes.js';
import { createSession } from './service.js';
import { env } from '../config/env.js';
import { errorHandler } from '../middleware/errors.js';

function server(status = 'active') {
  const app = express();
  app.use(express.json());
  app.use(createAuthRouter({ user: { findUnique: async () => ({ id: 1, role: 'student', status, email: 'test@example.invalid' }) } }));
  app.use(errorHandler);
  return app;
}
describe('active session renewal', () => {
  it('issues a fresh 15 minute token to an authenticated user', async () => {
    const token = jwt.sign({ iat: Math.floor(Date.now() / 1000) - 600 }, env.JWT_ACCESS_SECRET, { subject: '1', expiresIn: '15m', issuer: 'studenthire', audience: 'studenthire-web' });
    const response = await request(server()).post('/renew').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(jwt.decode(response.body.data.token).exp).toBeGreaterThan(jwt.decode(token).exp);
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it('rejects an expired token', async () => {
    const token = jwt.sign({}, env.JWT_ACCESS_SECRET, { subject: '1', expiresIn: -1, issuer: 'studenthire', audience: 'studenthire-web' });
    expect((await request(server()).post('/renew').set('Authorization', `Bearer ${token}`)).status).toBe(401);
  });
  it('rejects suspended users and unauthenticated requests', async () => {
    const { token } = createSession({ id: 1, role: 'student', status: 'active' });
    expect((await request(server('suspended')).post('/renew').set('Authorization', `Bearer ${token}`)).status).toBe(403);
    expect((await request(server()).post('/renew')).status).toBe(401);
  });
});
