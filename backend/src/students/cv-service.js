import { authError } from '../auth/service.js';
import { conflict, getProfile } from './service.js';
import { validatePdf } from './cv-storage.js';

async function removeOldFile(storage, key) {
  try {
    await storage.remove(key);
  } catch {
    console.error('CV cleanup failed; kontrollo storage privat për skedarë të palidhur.');
  }
}
export async function replaceCv(prisma, storage, userId, revision, file) {
  await validatePdf(file);
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw authError(404, 'NOT_FOUND', 'Profili nuk u gjet.');
  if (student.revision !== revision) throw conflict();
  const key = await storage.save(file.buffer);
  try {
    const changed = await prisma.student.updateMany({
      where: { userId, revision, user: { status: 'active' } },
      data: {
        cvStorageKey: key,
        cvOriginalName: file.originalname.replace(/[\/\\\x00-\x1f\x7f]/g, '_').slice(0, 255),
        cvSizeBytes: file.size,
        cvUploadedAt: new Date(),
        revision: { increment: 1 },
      },
    });
    if (changed.count !== 1) throw conflict();
  } catch (error) {
    await removeOldFile(storage, key);
    throw error;
  }
  await removeOldFile(storage, student.cvStorageKey);
  return getProfile(prisma, userId);
}
export async function deleteCv(prisma, storage, userId, revision) {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw authError(404, 'NOT_FOUND', 'Profili nuk u gjet.');
  if (student.revision !== revision) throw conflict();
  const changed = await prisma.student.updateMany({
    where: { userId, revision, user: { status: 'active' } },
    data: {
      cvStorageKey: null,
      cvOriginalName: null,
      cvSizeBytes: null,
      cvUploadedAt: null,
      revision: { increment: 1 },
    },
  });
  if (changed.count !== 1) throw conflict();
  await removeOldFile(storage, student.cvStorageKey);
  return getProfile(prisma, userId);
}
