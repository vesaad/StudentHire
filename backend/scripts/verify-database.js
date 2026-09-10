import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createDatabaseClient } from '../src/config/database.js';

const prisma = createDatabaseClient();
const rollback = new Error('ROLLBACK_VERIFICATION');
const marker = `verify-${randomUUID()}`;
let checks = 0;

async function rejectsCode(action, code) {
  await assert.rejects(action, (error) => error.code === code);
  checks++;
}

try {
  const tables = await prisma.$queryRaw`SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME <> '_prisma_migrations'`;
  assert.deepEqual(tables.map((row) => row.name).sort(), [
    'users', 'students', 'companies', 'opportunities', 'skills', 'student_skills',
    'opportunity_skills', 'applications', 'application_status_history',
    'notifications', 'saved_opportunities', 'company_approvals',
  ].sort());
  checks++;

  try {
    // Every fixture is rolled back, including when an assertion fails.
    await prisma.$transaction(async (tx) => {
      const studentUser = await tx.user.create({ data: {
        email: `${marker}-student@example.invalid`, passwordHash: 'verification-only-no-login', role: 'student',
        student: { create: { firstName: 'Test', lastName: 'Student', cvStorageKey: `${marker}/current.pdf` } },
      }, include: { student: true } });
      const companyUser = await tx.user.create({ data: {
        email: `${marker}-company@example.invalid`, passwordHash: 'verification-only-no-login', role: 'company',
        company: { create: { name: marker } },
      }, include: { company: true } });
      const admin = await tx.user.create({ data: {
        email: `${marker}-admin@example.invalid`, passwordHash: 'verification-only-no-login', role: 'admin',
      } });
      assert.equal(studentUser.status, 'active');
      assert.equal(companyUser.company.status, 'pending');
      checks++;
      await rejectsCode(() => tx.user.create({ data: {
        email: studentUser.email.toUpperCase(), passwordHash: 'unused', role: 'student',
      } }), 'P2002');
      await rejectsCode(() => tx.student.create({ data: {
        userId: studentUser.id, firstName: 'Duplicate', lastName: 'Profile',
      } }), 'P2002');

      const approval = await tx.companyApproval.create({ data: {
        companyId: companyUser.company.id, adminId: admin.id, fromStatus: 'pending', toStatus: 'approved',
      } });
      await tx.company.update({ where: { id: companyUser.company.id }, data: { status: 'approved' } });
      await tx.notification.create({ data: {
        userId: companyUser.id, companyApprovalId: approval.id,
        type: 'company_decision', title: 'Approved', message: marker,
      } });
      const opportunity = await tx.opportunity.create({ data: {
        companyId: companyUser.company.id, title: marker, description: 'Verification fixture',
        location: 'Prishtinë', type: 'internship', employmentType: 'part_time',
      } });
      assert.equal(opportunity.status, 'draft');
      checks++;
      const skill = await tx.skill.create({ data: { name: marker } });
      const studentSkill = { studentId: studentUser.student.id, skillId: skill.id };
      const opportunitySkill = { opportunityId: opportunity.id, skillId: skill.id };
      await tx.studentSkill.create({ data: studentSkill });
      await tx.opportunitySkill.create({ data: opportunitySkill });
      await rejectsCode(() => tx.studentSkill.create({ data: studentSkill }), 'P2002');
      await rejectsCode(() => tx.opportunitySkill.create({ data: opportunitySkill }), 'P2002');
      await rejectsCode(() => tx.studentSkill.create({ data: { ...studentSkill, skillId: 4294967295 } }), 'P2003');
      const saved = { studentId: studentUser.student.id, opportunityId: opportunity.id };
      await tx.savedOpportunity.create({ data: saved });
      await rejectsCode(() => tx.savedOpportunity.create({ data: saved }), 'P2002');
      const applicationData = {
        ...saved, cvSnapshotKey: `${marker}/application.pdf`, cvOriginalName: 'cv.pdf', cvSizeBytes: 1024,
      };
      const application = await tx.application.create({ data: applicationData });
      assert.equal(application.status, 'pending');
      checks++;
      await tx.applicationStatusHistory.create({ data: {
        applicationId: application.id, actorId: studentUser.id, toStatus: 'pending',
      } });
      await tx.notification.create({ data: {
        userId: companyUser.id, applicationId: application.id,
        type: 'application_received', title: 'New application', message: marker,
      } });
      await tx.student.update({ where: { id: studentUser.student.id }, data: { cvStorageKey: null } });
      assert.equal((await tx.application.findUniqueOrThrow({ where: { id: application.id } })).cvSnapshotKey, applicationData.cvSnapshotKey);
      checks++;
      await tx.application.update({ where: { id: application.id }, data: { status: 'withdrawn' } });
      await tx.applicationStatusHistory.create({ data: {
        applicationId: application.id, actorId: studentUser.id, fromStatus: 'pending', toStatus: 'withdrawn',
      } });
      await rejectsCode(() => tx.application.create({ data: { ...applicationData, cvSnapshotKey: `${marker}/duplicate.pdf` } }), 'P2002');
      await rejectsCode(() => tx.opportunity.delete({ where: { id: opportunity.id } }), 'P2003');
      await rejectsCode(() => tx.application.delete({ where: { id: application.id } }), 'P2003');
      await rejectsCode(() => tx.user.delete({ where: { id: admin.id } }), 'P2003');
      assert.equal(await tx.applicationStatusHistory.count({ where: { applicationId: application.id } }), 2);
      assert.equal(await tx.notification.count({ where: { userId: companyUser.id, readAt: null } }), 2);
      checks++;
      throw rollback;
    }, { timeout: 30000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  assert.equal(await prisma.user.count({ where: { email: { startsWith: marker } } }), 0);
  assert.equal(await prisma.skill.count({ where: { name: marker } }), 0);
  checks++;
  console.log(`${checks} kontrolle të databazës kaluan. Të dhënat e testimit u kthyen mbrapsht (rollback).`);
} finally {
  await prisma.$disconnect();
}
