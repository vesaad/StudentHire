import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createDatabaseClient } from '../src/config/database.js';
import { saveProfile } from '../src/students/service.js';
import { createOpportunity, changeStatus } from '../src/opportunities/service.js';
import { searchOffers } from '../src/catalog/service.js';
import { searchSchema } from '../src/catalog/validation.js';

const prisma = createDatabaseClient();
const rollback = new Error('ROLLBACK_VERIFICATION');
try {
  await prisma.$transaction(
    async (tx) => {
      const adapter = new Proxy(tx, {
        get: (target, key) =>
          key === '$transaction'
            ? (operation) =>
                typeof operation === 'function' ? operation(tx) : Promise.all(operation)
            : target[key],
      });
      const suffix = randomUUID();
      const studentUser = await tx.user.create({
        data: {
          email: `skill-student-${suffix}@example.test`,
          passwordHash: 'unused-test-account',
          role: 'student',
          student: { create: { firstName: 'Test', lastName: 'Student' } },
        },
      });
      const companyUser = await tx.user.create({
        data: {
          email: `skill-company-${suffix}@example.test`,
          passwordHash: 'unused-test-account',
          role: 'company',
          company: {
            create: { name: 'Verification Company', industry: 'Banking', status: 'approved' },
          },
        },
        include: { company: true },
      });
      const skillName = `Skill ${suffix}`;
      const input = {
        revision: 0,
        firstName: 'Test',
        lastName: 'Student',
        phone: null,
        location: null,
        university: null,
        fieldOfStudy: null,
        bio: null,
        graduationYear: null,
        skillNames: [`  ${skillName}  `, skillName.toUpperCase()],
      };
      const profile = await saveProfile(adapter, studentUser.id, input);
      assert.equal(profile.skills.length, 1);
      assert.equal(profile.skills[0].skill.name.toLowerCase(), skillName.toLowerCase());
      const offer = await createOpportunity(adapter, companyUser.company.id, {
        title: `Position ${suffix}`,
        description: 'A verification opportunity for cross-sector filtering.',
        location: 'Prishtinë',
        field: 'technology',
        workMode: 'hybrid',
        type: 'internship',
        employmentType: 'part_time',
        deadline: null,
        skillNames: [skillName],
      });
      assert.equal(offer.skills[0].skillId, profile.skills[0].skill.id);
      await changeStatus(adapter, companyUser.company.id, offer.id, offer.revision, 'publish');
      const matching = await searchOffers(
        adapter,
        searchSchema.parse({
          q: suffix,
          field: 'technology',
          workMode: 'hybrid',
          skillIds: String(profile.skills[0].skill.id),
        }),
      );
      assert.equal(matching.total, 1);
      const different = await searchOffers(
        adapter,
        searchSchema.parse({ q: suffix, field: 'finance' }),
      );
      assert.equal(different.total, 0);
      const removed = await saveProfile(adapter, studentUser.id, {
        ...input,
        revision: profile.revision,
        skillNames: [],
      });
      assert.equal(removed.skills.length, 0);
      console.log(
        'PASS: typed skill creation, deduplication, shared offer matching, field/work-mode filters, removal.',
      );
      throw rollback;
    },
    { timeout: 20000 },
  );
} catch (error) {
  if (error !== rollback) throw error;
  console.log('Verification records rolled back; no test accounts or offers retained.');
} finally {
  await prisma.$disconnect();
}
