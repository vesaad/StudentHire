import { authError } from '../auth/service.js';
import { createNotification } from '../notifications/service.js';

export const companyDetails = {
  user: { select: { email: true, status: true } },
  approvals: {
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 50,
    include: { admin: { select: { email: true } } },
  },
};
const conflict = () =>
  authError(409, 'CONFLICT', 'Të dhënat kanë ndryshuar. Rifresko faqen dhe provo përsëri.');

export async function saveProfile(prisma, userId, input) {
  const { revision, ...fields } = input;
  const changed = await prisma.company.updateMany({
    where: { userId, revision, user: { status: 'active' } },
    data: { ...fields, revision: { increment: 1 } },
  });
  if (changed.count !== 1) throw conflict();
  return prisma.company.findUnique({ where: { userId }, include: companyDetails });
}

export async function decideCompany(prisma, companyId, adminId, input) {
  return prisma.$transaction(async (tx) => {
    const admin = await tx.user.findUnique({ where: { id: adminId } });
    if (admin?.role !== 'admin' || admin.status !== 'active')
      throw authError(403, 'FORBIDDEN', 'Nuk ke leje për këtë veprim.');
    const company = await tx.company.findUnique({
      where: { id: companyId },
      include: { user: true },
    });
    if (!company) throw authError(404, 'NOT_FOUND', 'Kompania nuk u gjet.');
    if (company.revision !== input.revision) throw conflict();
    let status = company.status;
    let accountStatus = company.user.status;
    if (input.action === 'approve') status = 'approved';
    if (input.action === 'reject') status = 'rejected';
    if (input.action === 'suspend') accountStatus = 'suspended';
    if (input.action === 'reactivate') accountStatus = 'active';
    if (status === company.status && accountStatus === company.user.status) {
      throw authError(409, 'NO_CHANGE', 'Ky status është vendosur tashmë.');
    }
    const changed = await tx.company.updateMany({
      where: { id: companyId, revision: input.revision },
      data: { status, revision: { increment: 1 } },
    });
    if (changed.count !== 1) throw conflict();
    await tx.user.update({ where: { id: company.userId }, data: { status: accountStatus } });
    const decision = await tx.companyApproval.create({
      data: {
        companyId,
        adminId,
        fromStatus: company.status,
        toStatus: status,
        fromAccountStatus: company.user.status,
        toAccountStatus: accountStatus,
        reason: input.reason || null,
      },
    });
    const titles = {
      approve: 'Kompania u aprovua',
      reject: 'Kompania u refuzua',
      suspend: 'Llogaria u pezullua',
      reactivate: 'Llogaria u riaktivizua',
    };
    await createNotification(tx, {
      userId: company.userId,
      companyApprovalId: decision.id,
      type: 'company_decision',
      title: titles[input.action],
      message: input.reason || titles[input.action],
    });
    return tx.company.findUnique({ where: { id: companyId }, include: companyDetails });
  });
}

// Për routes e ofertave/aplikimeve që do të shtohen në fazat pasuese.
export function requireApprovedCompany(prisma) {
  return async (req, res, next) => {
    try {
      const company = await prisma.company.findUnique({
        where: { userId: req.user.id },
        include: { user: true },
      });
      if (
        req.user.role !== 'company' ||
        !company ||
        company.status !== 'approved' ||
        company.user.status !== 'active'
      ) {
        throw authError(403, 'COMPANY_NOT_APPROVED', 'Kërkohet kompani aktive dhe e aprovuar.');
      }
      req.company = company;
      next();
    } catch (error) {
      next(error);
    }
  };
}
