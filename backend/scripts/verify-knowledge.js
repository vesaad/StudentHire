import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { createDatabaseClient } from '../src/config/database.js';
import { seedKnowledge } from '../prisma/seed-knowledge.js';
import { saveProfile } from '../src/students/service.js';
import { createOpportunity, updateOpportunity } from '../src/opportunities/service.js';
import { createRecommendationRouter } from '../src/recommendations/routes.js';
import { createCatalogRouter } from '../src/catalog/routes.js';
import { createSession } from '../src/auth/service.js';
import { errorHandler } from '../src/middleware/errors.js';

const db = createDatabaseClient();
const rollback = new Error('ROLLBACK_TEST_FIXTURES');
let checks = 0;
const check = (actual, expected) => {
  assert.deepEqual(actual, expected);
  checks++;
};
try {
  await db.$transaction(
    async (tx) => {
      // Test all writes, including seeds, in one transaction which is always rolled back.
      const facade = new Proxy(tx, {
        get: (target, key) => (key === '$transaction' ? (fn) => fn(tx) : target[key]),
      });
      const counts = async () =>
        Promise.all([
          tx.skill.count(),
          tx.fieldSkill.count(),
          tx.skillCategory.count(),
          tx.skillRelationship.count(),
        ]);
      const before = await counts();
      const report = await seedKnowledge(tx);
      check(report.unclassified, []);
      await seedKnowledge(tx);
      check(await counts(), before);
      check(await tx.skill.count({ where: { fields: { none: {} } } }), 0);
      const excel = await tx.skill.findUnique({
        where: { name: 'Microsoft Excel' },
        include: { fields: true },
      });
      check(excel.fields.map((item) => item.field).sort(), [
        'administration',
        'finance',
        'logistics',
      ]);
      const skills = await tx.skill.findMany({
        where: { name: { in: ['React', 'SQL', 'MySQL', 'Git'] } },
      });
      const ids = Object.fromEntries(skills.map((skill) => [skill.name, skill.id]));
      const suffix = randomUUID();
      const student = await tx.user.create({
        data: {
          email: `kb-student-${suffix}@example.invalid`,
          passwordHash: 'test',
          role: 'student',
          student: { create: { firstName: 'KB', lastName: 'Test' } },
        },
        include: { student: true },
      });
      const company = await tx.user.create({
        data: {
          email: `kb-company-${suffix}@example.invalid`,
          passwordHash: 'test',
          role: 'company',
          company: { create: { name: 'KB Test', status: 'approved' } },
        },
        include: { company: true },
      });
      const profile = await saveProfile(facade, student.id, {
        revision: 0,
        firstName: 'KB',
        lastName: 'Test',
        skillIds: [ids.React, ids.MySQL, ids.Git],
        preferredField: 'technology',
        preferredWorkMode: 'remote',
        preferredJobType: 'internship',
        preferredLocation: 'Prishtinë',
      });
      check(profile.preferredWorkMode, 'remote');
      const input = {
        title: 'KB fixture',
        description: 'Knowledge based integration fixture',
        location: 'Tiranë',
        type: 'internship',
        employmentType: 'part_time',
        field: 'technology',
        workMode: 'remote',
        deadline: null,
        skillNames: ['React', 'SQL', 'Git'],
        skillRequirements: [
          { name: 'React', requirementType: 'required', weight: 3 },
          { name: 'SQL', requirementType: 'required', weight: 2 },
          { name: 'Git', requirementType: 'preferred', weight: 1 },
        ],
      };
      let offer = await createOpportunity(facade, company.company.id, input);
      check(offer.skills.find((item) => item.skill.name === 'React').weight, 3);
      check(offer.skills.find((item) => item.skill.name === 'Git').requirementType, 'preferred');
      // Older clients omitting metadata must preserve existing settings.
      const { skillRequirements, ...legacy } = input;
      offer = await updateOpportunity(facade, company.company.id, offer.id, {
        ...legacy,
        revision: offer.revision,
      });
      check(offer.skills.find((item) => item.skill.name === 'React').weight, 3);
      await assert.rejects(
        updateOpportunity(facade, company.company.id, offer.id, {
          ...input,
          revision: offer.revision,
          skillRequirements: [{ name: 'Not selected', requirementType: 'required', weight: 1 }],
        }),
        { code: 'INVALID_SKILLS' },
      );
      checks++;
      await tx.opportunity.update({
        where: { id: offer.id },
        data: { status: 'published', publishedAt: new Date() },
      });
      const app = express();
      app.use('/api/recommendations', createRecommendationRouter(facade));
      app.use('/api/opportunities', createCatalogRouter(facade));
      app.use(errorHandler);
      const get = (path, user = student) =>
        request(app).get(path).auth(createSession(user).token, { type: 'bearer' });
      const path = `/api/opportunities/${offer.id}/match`;
      check((await request(app).get(path)).status, 401);
      check((await get(path, company)).status, 403);
      const response = await get(path);
      check(response.status, 200);
      check(response.body.data.matchScore, 92);
      check(response.body.data.relatedSkills[0].requiredSkill, 'SQL');
      check(response.body.data.breakdown.components.location, 5);
      check((await get(`/api/recommendations/${offer.id}`)).body.data, response.body.data);
      const list = (await get('/api/recommendations')).body.data;
      check(
        list.items.every(
          (item, index) =>
            index === 0 || list.items[index - 1].match.rawScore >= item.match.rawScore,
        ),
        true,
      );
      check(
        (await request(app).get('/api/opportunities/skills?field=marketing')).body.data.some(
          (skill) => skill.name === 'Canva',
        ),
        true,
      );
      await saveProfile(facade, student.id, {
        revision: profile.revision,
        firstName: 'KB',
        lastName: 'Test',
        skillIds: [ids.React],
        preferredField: null,
        preferredWorkMode: null,
        preferredJobType: null,
        preferredLocation: null,
      });
      check((await get(path)).body.data.breakdown.components.field, 0);
      await tx.opportunity.update({ where: { id: offer.id }, data: { status: 'draft' } });
      check((await get(path)).status, 404);
      throw rollback;
    },
    { timeout: 60000 },
  );
} catch (error) {
  if (error !== rollback) throw error;
  console.log(`${checks} knowledge integration checks passed; fixture writes rolled back.`);
} finally {
  await db.$disconnect();
}
