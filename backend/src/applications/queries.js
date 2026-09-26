import { authError } from '../auth/service.js';

export const summaryFields = {
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  opportunity: {
    select: {
      id: true,
      title: true,
      status: true,
      location: true,
      field: true,
      workMode: true,
      deadline: true,
      skills: { select: { skill: { select: { id: true, name: true } } } },
      company: { select: { name: true } },
    },
  },
  student: { select: { firstName: true, lastName: true } },
};
export function ownerFilter(user) {
  if (user.role === 'student') return { student: { userId: user.id } };
  if (user.role === 'company') return { opportunity: { company: { userId: user.id } } };
  throw authError(403, 'FORBIDDEN', 'Nuk ke qasje te aplikimet.');
}
export async function listApplications(prisma, user, filters) {
  const where = {
    ...ownerFilter(user),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.opportunityId ? { opportunityId: filters.opportunityId } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.application.findMany({
      where,
      select: summaryFields,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (filters.page - 1) * 10,
      take: 10,
    }),
    prisma.application.count({ where }),
  ]);
  return { items, total, page: filters.page };
}
export async function applicationDetails(prisma, user, id) {
  const application = await prisma.application.findFirst({
    where: { id, ...ownerFilter(user) },
    select: {
      ...summaryFields,
      message: true,
      cvOriginalName: true,
      cvSizeBytes: true,
      student: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          location: true,
          university: true,
          fieldOfStudy: true,
          graduationYear: true,
          bio: true,
          user: { select: { email: true } },
          skills: { select: { skill: { select: { id: true, name: true } } } },
        },
      },
      history: {
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
          actor: { select: { role: true } },
        },
      },
    },
  });
  if (!application) throw authError(404, 'NOT_FOUND', 'Aplikimi nuk u gjet.');
  return application;
}
