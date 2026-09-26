import { authError } from '../auth/service.js';
import { createNotification } from '../notifications/service.js';
import { visibleOffers } from '../catalog/service.js';
import { ownerFilter } from './queries.js';

const conflict = () => authError(409, 'CONFLICT', 'Aplikimi ka ndryshuar. Rifresko të dhënat.');
const duplicate = () =>
  authError(
    409,
    'ALREADY_APPLIED',
    'Ke aplikuar tashmë në këtë ofertë. Nuk mund të aplikosh përsëri, edhe pas tërheqjes.',
  );

async function requireActiveActor(tx, user) {
  const rows = await tx.$queryRaw`SELECT status, role FROM users WHERE id = ${user.id} FOR UPDATE`;
  if (rows[0]?.status !== 'active' || rows[0]?.role !== user.role)
    throw authError(403, 'FORBIDDEN', 'Llogaria nuk lejon këtë veprim.');
}
async function cleanSnapshot(storage, key) {
  if (!key) return;
  try {
    await storage.remove(key);
  } catch {
    console.error('Application CV cleanup failed; kontrollo storage për kopje të palidhura.');
  }
}

export async function applyForOffer(prisma, storage, user, input) {
  if (user.role !== 'student')
    throw authError(403, 'FORBIDDEN', 'Vetëm studentët mund të aplikojnë.');
  const offer = await prisma.opportunity.findUnique({
    where: { id: input.opportunityId },
    select: { companyId: true },
  });
  if (!offer) throw authError(404, 'NOT_FOUND', 'Oferta nuk është e disponueshme.');
  let snapshotKey;
  try {
    return await prisma.$transaction(
      async (tx) => {
        // Mbyllja e ofertës/vendimet e kompanisë përdorin të njëjtin kyç.
        await tx.$queryRaw`SELECT id FROM companies WHERE id = ${offer.companyId} FOR UPDATE`;
        // Pengon zëvendësimin/fshirjen e CV-së deri sa të kopjohet.
        await tx.$queryRaw`SELECT id FROM students WHERE user_id = ${user.id} FOR UPDATE`;
        await requireActiveActor(tx, user);
        const student = await tx.student.findUnique({ where: { userId: user.id } });
        if (!student) throw authError(404, 'NOT_FOUND', 'Profili i studentit nuk u gjet.');
        const existing = await tx.application.findUnique({
          where: {
            studentId_opportunityId: { studentId: student.id, opportunityId: input.opportunityId },
          },
        });
        if (existing) throw duplicate();
        const available = await tx.opportunity.findFirst({
          where: { id: input.opportunityId, ...visibleOffers() },
          include: { company: true },
        });
        if (!available)
          throw authError(
            409,
            'UNAVAILABLE',
            'Oferta është mbyllur, i ka kaluar afati ose kompania nuk është aktive.',
          );
        if (!student.cvStorageKey)
          throw authError(400, 'CV_REQUIRED', 'Ngarko CV-në PDF në profil përpara aplikimit.');
        const buffer = await storage.read(student.cvStorageKey);
        snapshotKey = await storage.save(buffer);
        const application = await tx.application.create({
          data: {
            studentId: student.id,
            opportunityId: input.opportunityId,
            message: input.message || null,
            cvSnapshotKey: snapshotKey,
            cvOriginalName: student.cvOriginalName,
            cvSizeBytes: buffer.length,
            history: { create: { actorId: user.id, toStatus: 'pending' } },
          },
          select: { id: true, status: true },
        });
        await createNotification(tx, {
          userId: available.company.userId,
          applicationId: application.id,
          type: 'application_received',
          title: 'Aplikim i ri',
          message: `Ke një aplikim të ri për ${available.title}.`,
        });
        return application;
      },
      { timeout: 15000 },
    );
  } catch (error) {
    await cleanSnapshot(storage, snapshotKey);
    if (error.code === 'P2002') throw duplicate();
    throw error;
  }
}

export async function changeApplicationStatus(prisma, user, id, input) {
  const initial = await prisma.application.findFirst({
    where: { id, ...ownerFilter(user) },
    select: { opportunity: { select: { companyId: true } } },
  });
  if (!initial) throw authError(404, 'NOT_FOUND', 'Aplikimi nuk u gjet.');
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM companies WHERE id = ${initial.opportunity.companyId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM applications WHERE id = ${id} FOR UPDATE`;
    await requireActiveActor(tx, user);
    const application = await tx.application.findFirst({
      where: { id, ...ownerFilter(user) },
      include: {
        student: true,
        opportunity: { include: { company: { include: { user: true } } } },
      },
    });
    if (!application) throw authError(404, 'NOT_FOUND', 'Aplikimi nuk u gjet.');
    const company = application.opportunity.company;
    if (
      user.role === 'company' &&
      (company.status !== 'approved' || company.user.status !== 'active')
    )
      throw authError(403, 'COMPANY_NOT_APPROVED', 'Kërkohet kompani aktive dhe e aprovuar.');
    if (application.status !== input.expectedStatus) throw conflict();
    const allowed =
      user.role === 'student'
        ? ['withdrawn']
        : application.status === 'pending'
          ? ['reviewed', 'accepted', 'rejected']
          : ['accepted', 'rejected'];
    if (!['pending', 'reviewed'].includes(application.status) || !allowed.includes(input.status))
      throw authError(409, 'INVALID_TRANSITION', 'Ky ndryshim statusi nuk lejohet.');
    const changed = await tx.application.updateMany({
      where: { id, status: input.expectedStatus },
      data: { status: input.status },
    });
    if (changed.count !== 1) throw conflict();
    await tx.applicationStatusHistory.create({
      data: {
        applicationId: id,
        actorId: user.id,
        fromStatus: application.status,
        toStatus: input.status,
        note: input.note || null,
      },
    });
    const labels = {
      reviewed: 'Në shqyrtim',
      accepted: 'I pranuar',
      rejected: 'I refuzuar',
      withdrawn: 'I tërhequr',
    };
    await createNotification(tx, {
      userId: user.role === 'student' ? company.userId : application.student.userId,
      applicationId: id,
      type: 'application_status_changed',
      title: `Aplikimi: ${labels[input.status]}`,
      message: `Statusi i aplikimit për ${application.opportunity.title}: ${labels[input.status]}.`,
    });
    return { id, status: input.status };
  });
}
