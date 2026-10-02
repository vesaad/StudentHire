import { authError } from '../auth/service.js';

function statusCounts(rows) {
  return Object.fromEntries(rows.map((row) => [row.status, row._count._all]));
}
export async function dashboardSummary(prisma, user) {
  return prisma.$transaction(async (tx) => {
    const unreadCount = await tx.notification.count({ where: { userId: user.id, readAt: null } });
    if (user.role === 'student') {
      const student = await tx.student.findUnique({
        where: { userId: user.id },
        select: {
          id: true,
          firstName: true,
          cvOriginalName: true,
          _count: { select: { skills: true, savedOpportunities: true } },
        },
      });
      if (!student) throw authError(404, 'NOT_FOUND', 'Profili nuk u gjet.');
      const applications = statusCounts(
        await tx.application.groupBy({
          by: ['status'],
          where: { studentId: student.id },
          _count: { _all: true },
        }),
      );
      return {
        role: 'student',
        name: student.firstName,
        unreadCount,
        applications,
        savedCount: student._count.savedOpportunities,
        skillCount: student._count.skills,
        hasCv: Boolean(student.cvOriginalName),
      };
    }
    if (user.role === 'company') {
      const company = await tx.company.findUnique({
        where: { userId: user.id },
        select: { id: true, name: true, status: true },
      });
      if (!company) throw authError(404, 'NOT_FOUND', 'Kompania nuk u gjet.');
      const offers = statusCounts(
        await tx.opportunity.groupBy({
          by: ['status'],
          where: { companyId: company.id },
          _count: { _all: true },
        }),
      );
      const applications = statusCounts(
        await tx.application.groupBy({
          by: ['status'],
          where: { opportunity: { companyId: company.id } },
          _count: { _all: true },
        }),
      );
      return {
        role: 'company',
        name: company.name,
        companyStatus: company.status,
        unreadCount,
        offers,
        applications,
      };
    }
    if (user.role !== 'admin') throw authError(403, 'FORBIDDEN', 'Nuk ke qasje.');
    const [users, students, companies, offers, applications] = await Promise.all([
      tx.user.count(),
      tx.student.count(),
      tx.company.groupBy({ by: ['status'], _count: { _all: true } }),
      tx.opportunity.groupBy({ by: ['status'], _count: { _all: true } }),
      tx.application.count(),
    ]);
    return {
      role: 'admin',
      unreadCount,
      users,
      students,
      companies: statusCounts(companies),
      offers: statusCounts(offers),
      applicationCount: applications,
    };
  });
}
