import { authError } from '../auth/service.js';
import { createNotification } from '../notifications/service.js';
import { userFields } from './queries.js';
const conflict = () => authError(409, 'CONFLICT', 'Të dhënat kanë ndryshuar. Rifresko listën.');
async function checkAdmin(tx, id) {
  const user = await tx.user.findUnique({ where: { id }, select: { role: true, status: true } });
  if (user?.role !== 'admin' || user.status !== 'active')
    throw authError(403, 'FORBIDDEN', 'Kërkohet administrator aktiv.');
}
export async function changeAccount(prisma, adminId, id, input) {
  return prisma.$transaction(async (tx) => {
    // Aplikimi/CV-ja kyçin studentin para përdoruesit.
    await tx.$queryRaw`SELECT id FROM students WHERE user_id = ${id} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${id} FOR UPDATE`;
    await checkAdmin(tx, adminId);
    const user = await tx.user.findUnique({ where: { id } });
    if (!user) throw authError(404, 'NOT_FOUND', 'Përdoruesi nuk u gjet.');
    if (user.role !== 'student')
      throw authError(
        403,
        'FORBIDDEN',
        'Kompanitë menaxhohen te vendimet e kompanisë. Llogaritë admin nuk ndryshohen këtu.',
      );
    if (user.revision !== input.revision) throw conflict();
    if (user.status === input.status)
      throw authError(409, 'NO_CHANGE', 'Statusi është vendosur tashmë.');
    await tx.user.update({
      where: { id },
      data: {
        status: input.status,
        statusReason: input.reason,
        statusChangedAt: new Date(),
        revision: { increment: 1 },
      },
    });
    await createNotification(tx, {
      userId: id,
      type: 'account_status_changed',
      title: input.status === 'active' ? 'Llogaria u riaktivizua' : 'Llogaria u pezullua',
      message: input.reason,
    });
    return tx.user.findUnique({ where: { id }, select: userFields });
  });
}
