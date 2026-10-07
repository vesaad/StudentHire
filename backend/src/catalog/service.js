import { authError } from '../auth/service.js';

// I njëjti kusht përdoret në listë, detaje dhe ofertat e ruajtura.
export function visibleOffers() {
  return {
    status: 'published',
    OR: [{ deadline: null }, { deadline: { gt: new Date() } }],
    company: { status: 'approved', user: { status: 'active', role: 'company' } },
  };
}

export const offerSummary = {
  id: true,
  title: true,
  location: true,
  type: true,
  employmentType: true,
  field: true,
  workMode: true,
  deadline: true,
  publishedAt: true,
  company: { select: { id: true, name: true } },
  skills: {
    select: { requirementType: true, weight: true, skill: { select: { id: true, name: true } } },
  },
};

export async function searchOffers(prisma, filters) {
  const where = { AND: [visibleOffers()] };
  if (filters.q)
    where.AND.push({
      OR: [
        { title: { contains: filters.q } },
        { description: { contains: filters.q } },
        { company: { name: { contains: filters.q } } },
      ],
    });
  if (filters.location) where.AND.push({ location: { contains: filters.location } });
  if (filters.type) where.AND.push({ type: filters.type });
  if (filters.field) where.AND.push({ field: filters.field });
  if (filters.workMode) where.AND.push({ workMode: filters.workMode });
  if (filters.employmentType) where.AND.push({ employmentType: filters.employmentType });
  if (filters.skillId) where.AND.push({ skills: { some: { skillId: filters.skillId } } });
  if (filters.skillIds?.length)
    where.AND.push({ skills: { some: { skillId: { in: filters.skillIds } } } });
  const [items, total] = await prisma.$transaction([
    prisma.opportunity.findMany({
      where,
      select: offerSummary,
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      skip: (filters.page - 1) * 10,
      take: 10,
    }),
    prisma.opportunity.count({ where }),
  ]);
  return { items, total, page: filters.page };
}

export async function offerDetails(prisma, id) {
  const offer = await prisma.opportunity.findFirst({
    where: { id, ...visibleOffers() },
    select: {
      ...offerSummary,
      description: true,
      company: {
        select: {
          id: true,
          name: true,
          description: true,
          industry: true,
          location: true,
          website: true,
        },
      },
    },
  });
  if (!offer) throw authError(404, 'NOT_FOUND', 'Oferta nuk është më e disponueshme.');
  return offer;
}
