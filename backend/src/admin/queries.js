export const userFields = {
  id: true,
  email: true,
  role: true,
  status: true,
  revision: true,
  statusReason: true,
  statusChangedAt: true,
  createdAt: true,
  company: { select: { id: true, name: true } },
  student: { select: { firstName: true, lastName: true } },
};
export const offerFields = {
  id: true,
  title: true,
  description: true,
  location: true,
  type: true,
  employmentType: true,
  status: true,
  revision: true,
  deadline: true,
  closedAt: true,
  moderationReason: true,
  moderatedAt: true,
  moderatedBy: { select: { id: true, email: true } },
  company: { select: { id: true, name: true, status: true } },
  skills: { select: { skill: { select: { id: true, name: true } } } },
};
export async function adminList(prisma, section, filters) {
  const where = {};
  let model, select;
  if (section === 'users') {
    model = prisma.user;
    select = userFields;
    if (filters.q) where.email = { contains: filters.q };
    if (filters.role !== 'all') where.role = filters.role;
    if (filters.status !== 'all') where.status = filters.status;
  } else if (section === 'skills') {
    model = prisma.skill;
    select = { id: true, name: true, isActive: true, revision: true };
    if (filters.q) where.name = { contains: filters.q };
    if (filters.status !== 'all') where.isActive = filters.status === 'active';
  } else {
    model = prisma.opportunity;
    select = offerFields;
    if (filters.q)
      where.OR = [
        { title: { contains: filters.q } },
        { company: { name: { contains: filters.q } } },
      ];
    if (filters.status !== 'all') where.status = filters.status;
  }
  const [items, total] = await prisma.$transaction([
    model.findMany({
      where,
      select,
      orderBy: { id: 'desc' },
      skip: (filters.page - 1) * 10,
      take: 10,
    }),
    model.count({ where }),
  ]);
  return { items, total, page: filters.page };
}
