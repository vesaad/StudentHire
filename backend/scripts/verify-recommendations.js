import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { createDatabaseClient } from '../src/config/database.js';
import { createRecommendationRouter } from '../src/recommendations/routes.js';
import { matchSkills, rankOffers } from '../src/recommendations/matching.js';
import { createSession } from '../src/auth/service.js';
import { errorHandler } from '../src/middleware/errors.js';

const db = createDatabaseClient();
const users = [];
const skills = [];
let checks = 0;
function check(actual, expected) {
  assert.deepEqual(actual, expected);
  checks++;
}
async function account(role) {
  const user = await db.user.create({
    data: {
      email: `match-${randomUUID()}@example.invalid`,
      passwordHash: 'test-only',
      role,
      ...(role === 'student'
        ? { student: { create: { firstName: 'Test', lastName: 'Match' } } }
        : { company: { create: { name: 'Match test', status: 'approved' } } }),
    },
    include: { student: true, company: true },
  });
  users.push(user.id);
  return user;
}
try {
  const student = await account('student');
  const other = await account('student');
  const company = await account('company');
  for (let i = 0; i < 3; i++)
    skills.push(await db.skill.create({ data: { name: `match-${randomUUID()}` } }));
  const ids = skills.map((skill) => skill.id);
  check(matchSkills([], []).percentage, null);
  check(matchSkills([], skills).percentage, 0);
  check(matchSkills(ids, skills).percentage, 100);
  check(matchSkills([ids[0]], skills).percentage, 33);
  check(matchSkills([ids[0], ids[0]], skills).matchedCount, 1);
  check(
    matchSkills([ids[0]], skills).missing.map((skill) => skill.id),
    ids.slice(1),
  );
  check(
    rankOffers(
      { id: 1, publishedAt: new Date(), match: { matchedCount: 1, requiredCount: 3 } },
      { id: 2, publishedAt: new Date(), match: { matchedCount: 33, requiredCount: 100 } },
    ) < 0,
    true,
  );
  await db.studentSkill.create({ data: { studentId: student.student.id, skillId: ids[0] } });
  const base = {
    companyId: company.company.id,
    title: 'Match test',
    description: 'Test matching skills.',
    location: 'Test',
    type: 'job',
    employmentType: 'full_time',
    status: 'published',
    publishedAt: new Date(),
  };
  const offers = [];
  for (const required of [[ids[0]], ids, [ids[1]], []])
    offers.push(
      await db.opportunity.create({
        data: { ...base, skills: { create: required.map((skillId) => ({ skillId })) } },
      }),
    );
  const app = express();
  app.use('/recommendations', createRecommendationRouter(db));
  app.use(errorHandler);
  const get = (path = '', user = student) =>
    request(app).get(`/recommendations${path}`).auth(createSession(user).token, { type: 'bearer' });
  check((await request(app).get('/recommendations')).status, 401);
  check((await get('', company)).status, 403);
  check((await get('?page=0')).status, 400);
  check((await get(`?userId=${other.id}`)).status, 400);
  check((await get('/bad')).status, 400);
  check((await get(`/${offers[0].id}`)).body.data.percentage, 100);
  check((await get(`/${offers[0].id}`, other)).body.data.percentage, 0);
  check((await get(`/${offers[1].id}`)).body.data.common[0].id, ids[0]);
  check((await get(`/${offers[3].id}`)).body.data.percentage, null);
  const list = (await get()).body.data;
  check(list.studentSkillCount, 1);
  // Compare the fixture subset without relying on the user's existing offers.
  const own = list.items.filter((item) => offers.some((offer) => offer.id === item.id));
  check(
    own.map((item) => item.match.percentage),
    [...own].sort(rankOffers).map((item) => item.match.percentage),
  );
  await db.skill.update({ where: { id: ids[0] }, data: { isActive: false } });
  check((await get(`/${offers[0].id}`)).body.data.percentage, 100);
  await db.studentSkill.deleteMany({ where: { studentId: student.student.id } });
  check((await get(`/${offers[0].id}`)).body.data.percentage, 0);
  check((await get()).body.data.studentSkillCount, 0);
  for (const data of [
    { status: 'draft' },
    { status: 'closed' },
    { status: 'published', deadline: new Date(Date.now() - 1000) },
  ]) {
    await db.opportunity.update({ where: { id: offers[0].id }, data });
    check((await get(`/${offers[0].id}`)).status, 404);
    check(
      (await get()).body.data.items.some((item) => item.id === offers[0].id),
      false,
    );
  }
  await db.opportunity.update({
    where: { id: offers[0].id },
    data: { status: 'published', deadline: null },
  });
  for (const status of ['pending', 'rejected']) {
    await db.company.update({ where: { id: company.company.id }, data: { status } });
    check((await get(`/${offers[0].id}`)).status, 404);
  }
  await db.company.update({ where: { id: company.company.id }, data: { status: 'approved' } });
  await db.user.update({ where: { id: company.id }, data: { status: 'suspended' } });
  check((await get(`/${offers[0].id}`)).status, 404);
  await db.user.update({ where: { id: company.id }, data: { status: 'active' } });
  await db.user.update({ where: { id: student.id }, data: { status: 'suspended' } });
  check((await get()).status, 403);
  await db.user.update({ where: { id: student.id }, data: { status: 'active' } });
  for (let i = 0; i < 12; i++)
    await db.opportunity.create({ data: { ...base, skills: { create: { skillId: ids[1] } } } });
  const first = (await get()).body.data;
  const second = (await get('?page=2')).body.data;
  check(first.items.length, 10);
  check(second.items.length > 0, true);
  check(
    first.items.some((item) => second.items.some((next) => next.id === item.id)),
    false,
  );
  check((await get('?page=100000')).body.data.items.length, 0);
  console.log(`${checks} recommendation checks passed.`);
} finally {
  await db.opportunity.deleteMany({ where: { company: { userId: { in: users } } } });
  await db.student.deleteMany({ where: { userId: { in: users } } });
  await db.company.deleteMany({ where: { userId: { in: users } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.skill.deleteMany({ where: { id: { in: skills.map((skill) => skill.id) } } });
  await db.$disconnect();
}
