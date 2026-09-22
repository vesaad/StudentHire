import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import { PDFDocument, PDFName, PDFString } from 'pdf-lib';
import { createDatabaseClient } from '../src/config/database.js';
import { createStudentRouter } from '../src/students/routes.js';
import { createCvStorage } from '../src/students/cv-storage.js';
import { replaceCv } from '../src/students/cv-service.js';
import { createSession } from '../src/auth/service.js';
import { errorHandler } from '../src/middleware/errors.js';

const prisma = createDatabaseClient();
const directory = await mkdtemp(path.join(tmpdir(), 'studenthire-cv-check-'));
const storage = createCvStorage(directory);
const marker = randomUUID();
const ids = [];
let skillId;
let checks = 0;
function check(actual, expected) {
  assert.equal(actual, expected);
  checks++;
}
async function createUser(role) {
  const user = await prisma.user.create({
    data: {
      email: `${role}-${randomUUID()}@example.invalid`,
      passwordHash: 'test-only',
      role,
      ...(role === 'student'
        ? { student: { create: { firstName: 'Test', lastName: 'Student' } } }
        : {}),
    },
  });
  ids.push(user.id);
  return user;
}
try {
  const owner = await createUser('student');
  const other = await createUser('student');
  const company = await createUser('company');
  const skill = await prisma.skill.create({ data: { name: marker } });
  skillId = skill.id;
  const app = express();
  app.use(express.json());
  app.use('/students', createStudentRouter(prisma, storage));
  app.use(errorHandler);
  const token = createSession(owner).token;
  const auth = (req) => req.auth(token, { type: 'bearer' });
  const get = () => auth(request(app).get('/students/me'));
  check((await request(app).get('/students/me')).status, 401);
  check(
    (await request(app).get('/students/me').auth(createSession(company).token, { type: 'bearer' }))
      .status,
    403,
  );
  const profile = {
    revision: 0,
    firstName: 'New',
    lastName: 'Student',
    phone: '',
    location: 'Prishtinë',
    university: 'University',
    fieldOfStudy: 'IT',
    bio: 'Student',
    graduationYear: 2027,
    skillIds: [skill.id],
  };
  check(
    (await auth(request(app).put('/students/me')).send({ ...profile, userId: other.id })).status,
    400,
  );
  check(
    (
      await auth(request(app).put('/students/me')).send({
        ...profile,
        skillIds: [skill.id, skill.id],
      })
    ).status,
    400,
  );
  check(
    (await auth(request(app).put('/students/me')).send({ ...profile, skillIds: [4294967295] }))
      .status,
    400,
  );
  check((await get()).body.data.revision, 0);
  check((await auth(request(app).put('/students/me')).send(profile)).status, 200);
  check((await get()).body.data.skills[0].skill.id, skill.id);
  check((await auth(request(app).put('/students/me')).send(profile)).status, 409);
  await prisma.skill.update({ where: { id: skill.id }, data: { isActive: false } });
  check(
    (await auth(request(app).get('/students/skills'))).body.data.some(
      (item) => item.id === skill.id,
    ),
    false,
  );
  check(
    (await auth(request(app).put('/students/me')).send({ ...profile, revision: 1 })).status,
    200,
  );
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const bytes = Buffer.from(await pdf.save());
  const upload = (revision, buffer = bytes, name = 'cv.pdf', mime = 'application/pdf') =>
    auth(request(app).post('/students/me/cv'))
      .field('revision', String(revision))
      .attach('cv', buffer, { filename: name, contentType: mime });
  check((await upload(2, Buffer.from('fake'), 'cv.pdf')).status, 400);
  check((await upload(2, bytes, 'cv.txt')).status, 400);
  check((await upload(2, Buffer.alloc(5 * 1024 * 1024 + 1), 'cv.pdf')).status, 413);
  check((await auth(request(app).post('/students/me/cv')).send({})).status, 400);
  const active = await PDFDocument.create();
  active.addPage();
  active.catalog.set(
    PDFName.of('OpenAction'),
    active.context.obj({ S: PDFName.of('JavaScript'), JS: PDFString.of('alert(1)') }),
  );
  check((await upload(2, Buffer.from(await active.save()))).status, 400);
  check((await upload(2)).status, 200);
  const first = await prisma.student.findUnique({ where: { userId: owner.id } });
  check((await get()).body.data.cvStorageKey, undefined);
  const download = await auth(request(app).get('/students/me/cv'));
  check(download.status, 200);
  check(download.headers['content-type'], 'application/pdf');
  check(download.headers['content-disposition'].startsWith('attachment'), true);
  check(Buffer.compare(download.body, bytes), 0);
  check(
    (await request(app).get('/students/me/cv').auth(createSession(other).token, { type: 'bearer' }))
      .status,
    404,
  );
  check((await upload(2)).status, 409);
  const snapshotKey = await storage.save(bytes);
  check((await upload(3)).status, 200);
  check((await readdir(directory)).includes(first.cvStorageKey), false);
  check(Buffer.compare(await storage.read(snapshotKey), bytes), 0);
  const beforeFiles = (await readdir(directory)).length;
  const failure = {
    student: {
      findUnique: (args) => prisma.student.findUnique(args),
      updateMany: () => {
        throw new Error('Database failure');
      },
    },
  };
  await assert.rejects(
    () =>
      replaceCv(failure, storage, owner.id, 4, {
        buffer: bytes,
        size: bytes.length,
        originalname: 'cv.pdf',
        mimetype: 'application/pdf',
      }),
    /Database failure/,
  );
  checks++;
  check((await readdir(directory)).length, beforeFiles);
  const race = await Promise.all([upload(4), upload(4)]);
  check(race.filter((result) => result.status === 200).length, 1);
  check(race.filter((result) => result.status === 409).length, 1);
  check((await readdir(directory)).length, 2);
  check((await auth(request(app).delete('/students/me/cv')).send({ revision: 4 })).status, 409);
  check((await auth(request(app).delete('/students/me/cv')).send({ revision: 5 })).status, 200);
  check((await auth(request(app).get('/students/me/cv'))).status, 404);
  check((await get()).body.data.cvOriginalName, null);
  check((await readdir(directory)).length, 1);
  check(Buffer.compare(await storage.read(snapshotKey), bytes), 0);
  await prisma.user.update({ where: { id: owner.id }, data: { status: 'suspended' } });
  check((await upload(6)).status, 403);
  console.log(`${checks} kontrolle studenti/CV kaluan.`);
} finally {
  await prisma.$transaction(async (tx) => {
    await tx.studentSkill.deleteMany({ where: { student: { userId: { in: ids } } } });
    await tx.student.deleteMany({ where: { userId: { in: ids } } });
    await tx.user.deleteMany({ where: { id: { in: ids } } });
    if (skillId) await tx.skill.delete({ where: { id: skillId } });
  });
  for (const file of await readdir(directory)) await unlink(path.join(directory, file));
  await rmdir(directory);
  await prisma.$disconnect();
}
