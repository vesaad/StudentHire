import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { createDatabaseClient } from '../src/config/database.js';
import { createCatalogRouter } from '../src/catalog/routes.js';
import { createSavedOffersRouter } from '../src/saved-offers/routes.js';
import { createSession } from '../src/auth/service.js';
import { errorHandler } from '../src/middleware/errors.js';

const prisma = createDatabaseClient();
const marker = `catalog-${randomUUID()}`;
const userIds = [];
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
      passwordHash: 'test-only',
      role,
      ...(role === 'company'
        ? { company: { create: { name: marker, status: 'approved' } } }
        : { student: { create: { firstName: 'Test', lastName: 'Student' } } }),
    },
    include: { company: true, student: true },
  });
  userIds.push(user.id);
  return user;
}
try {
  const company = await account('company', 'company');
  const student = await account('student', 'student');
  const other = await account('student', 'other');
  skill = await prisma.skill.create({ data: { name: marker } });
  const base = {
    companyId: company.company.id,
    title: `${marker} Developer`,
    description: 'Unique searchable description nebula',
    location: 'Prishtinë',
    type: 'job',
    employmentType: 'full_time',
    field: 'technology',
    status: 'published',
    publishedAt: new Date(),
  };
  const offer = await prisma.opportunity.create({
    data: { ...base, skills: { create: { skillId: skill.id } } },
  });
  const app = express();
  app.use(express.json());
  app.use('/offers', createCatalogRouter(prisma));
  app.use('/saved', createSavedOffersRouter(prisma));
  app.use(errorHandler);
  const search = (query = {}) =>
    request(app)
      .get('/offers')
      .query({ q: marker, ...query });
  const saved = (method, path = '', user = student) =>
    request(app)[method](`/saved${path}`).auth(createSession(user).token, { type: 'bearer' });
  check((await search()).body.data.total, 1);
  const sectorResponse = await request(app).get('/offers/sectors');
  check(sectorResponse.status, 200);
  const technologyCount = sectorResponse.body.data.find(item => item.value === 'technology').total;
  check(technologyCount >= 1, true);
  check(sectorResponse.body.data.every(item => Number.isInteger(item.total) && item.total >= 0), true);
  for (const query of [
    { location: 'Prisht' },
    { type: 'job' },
    { employmentType: 'full_time' },
    { skillId: skill.id },
    { q: 'nebula', location: 'Prishtinë', skillId: skill.id },
  ])
    check(
      (await search(query)).body.data.items.some((item) => item.id === offer.id),
      true,
    );
  for (const query of [
    { location: 'NoSuchPlace' },
    { type: 'internship' },
    { employmentType: 'contract' },
    { skillId: 4294967295 },
  ])
    check((await search(query)).body.data.total, 0);
  for (const query of [
    { page: 0 },
    { page: 'bad' },
    { type: 'bad' },
    { skillId: -1 },
    { q: 'a'.repeat(101) },
    { companyId: company.company.id },
  ])
    check((await search(query)).status, 400);
  const detail = await request(app).get(`/offers/${offer.id}`);
  check(detail.status, 200);
  check(detail.body.data.description, base.description);
  check('userId' in detail.body.data.company, false);
  check('revision' in detail.body.data, false);
  check((await request(app).get('/offers/bad')).status, 400);
  check((await request(app).get('/offers/4294967295')).status, 404);
  for (const data of [
    { status: 'draft' },
    { status: 'closed' },
    { status: 'published', deadline: new Date(Date.now() - 1000) },
  ]) {
    await prisma.opportunity.update({ where: { id: offer.id }, data });
    check((await search()).body.data.total, 0);
    check((await request(app).get(`/offers/${offer.id}`)).status, 404);
    check((await saved('put', `/${offer.id}`)).status, 404);
  }
  await prisma.opportunity.update({
    where: { id: offer.id },
    data: { status: 'published', deadline: new Date(Date.now() + 86400000) },
  });
  for (const status of ['pending', 'rejected']) {
    await prisma.company.update({ where: { id: company.company.id }, data: { status } });
    check((await search()).body.data.total, 0);
    check((await request(app).get(`/offers/${offer.id}`)).status, 404);
    check((await saved('put', `/${offer.id}`)).status, 404);
  }
  await prisma.company.update({ where: { id: company.company.id }, data: { status: 'approved' } });
  await prisma.user.update({ where: { id: company.id }, data: { status: 'suspended' } });
  check((await search()).body.data.total, 0);
  check((await saved('put', `/${offer.id}`)).status, 404);
  await prisma.user.update({ where: { id: company.id }, data: { status: 'active' } });
  check((await request(app).get('/saved')).status, 401);
  check((await saved('get', '', company)).status, 403);
  check((await saved('put', `/${offer.id}`, company)).status, 403);
  check((await saved('get', '?studentId=1')).status, 400);
  const parallel = await Promise.all([saved('put', `/${offer.id}`), saved('put', `/${offer.id}`)]);
  check(
    parallel.map((item) => item.status),
    [200, 200],
  );
  check(await prisma.savedOpportunity.count({ where: { studentId: student.student.id } }), 1);
  check((await saved('get', `/${offer.id}`)).body.data.saved, true);
  check((await saved('get', '', other)).body.data.total, 0);
  check((await saved('delete', `/${offer.id}`, other)).status, 200);
  check((await saved('get', `/${offer.id}`)).body.data.saved, true);
  check((await saved('get')).body.data.items[0].offer.id, offer.id);
  await prisma.opportunity.update({ where: { id: offer.id }, data: { status: 'closed' } });
  check((await saved('get')).body.data.items[0].offer, null);
  check((await saved('delete', `/${offer.id}`)).status, 200);
  check((await saved('delete', `/${offer.id}`)).status, 200);
  check((await saved('get', `/${offer.id}`)).body.data.saved, false);
  await prisma.user.update({ where: { id: student.id }, data: { status: 'suspended' } });
  check((await saved('get')).status, 403);
  check((await saved('put', `/${offer.id}`)).status, 403);
  await prisma.user.update({ where: { id: student.id }, data: { status: 'active' } });
  const more = [];
  for (let index = 0; index < 12; index++)
    more.push(
      await prisma.opportunity.create({
        data: { ...base, title: `${marker} ${index}`, type: 'internship' },
      }),
    );
  const first = (await search()).body.data;
  const second = (await search({ page: 2 })).body.data;
  check(first.items.length, 10);
  check(second.items.length, 2);
  check(first.total, 12);
  check(
    first.items.some((item) => second.items.some((next) => next.id === item.id)),
    false,
  );
  for (const item of more) await saved('put', `/${item.id}`);
  check((await saved('get')).body.data.items.length, 10);
  check((await saved('get', '?page=2')).body.data.items.length, 2);
  check((await saved('get')).body.data.total, 12);
  console.log(`${checks} catalog/saved-offer checks passed.`);
} finally {
  await prisma.savedOpportunity.deleteMany({ where: { student: { userId: { in: userIds } } } });
  await prisma.opportunity.deleteMany({ where: { company: { userId: { in: userIds } } } });
  await prisma.company.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.student.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  if (skill) await prisma.skill.delete({ where: { id: skill.id } });
  await prisma.$disconnect();
}
