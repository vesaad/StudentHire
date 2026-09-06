import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './app.js';
import { parseEnv } from './config/env.js';
describe('API foundation', () => {
  it('responds without a database connection', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
  });
  it('returns a JSON 404', async () => {
    const response = await request(app).get('/api/missing');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
  it('handles malformed JSON', async () => {
    const response = await request(app).post('/api/missing').set('Content-Type', 'application/json').send('{');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
    expect(response.body.error.stack).toBeUndefined();
  });
  it('rejects oversized bodies', async () => {
    const response = await request(app).post('/api/missing').send({ value: 'a'.repeat(110000) });
    expect(response.status).toBe(413);
  });
  it('allows the configured frontend origin', async () => {
    const response = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
  it('rejects invalid configuration', () => {
    expect(() => parseEnv({ PORT: 'invalid' })).toThrow('PORT');
    expect(() => parseEnv({ CLIENT_ORIGIN: 'invalid' })).toThrow('CLIENT_ORIGIN');
  });
});
