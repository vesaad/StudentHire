import { authError } from '../auth/service.js';
import { visibleOffers, offerSummary } from '../catalog/service.js';

export async function findStudent(prisma, userId) {
  const student = await prisma.student.findUnique({ where: { userId }, select: { id: true } });
  if (!student) throw authError(404, 'NOT_FOUND', 'Profili i studentit nuk u gjet.');
  return student;
}

export async function listSaved(prisma, studentId, page) {
  return prisma.$transaction(async (tx) => {
    const where = { studentId };
    const saved = await tx.savedOpportunity.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { opportunityId: 'desc' }],
      skip: (page - 1) * 10,
      take: 10,
      select: { opportunityId: true },
    });
    const offers = await tx.opportunity.findMany({
      where: { id: { in: saved.map((item) => item.opportunityId) }, ...visibleOffers() },
      select: offerSummary,
    });
    // Ofertat jo të disponueshme mund të largohen, pa ekspozuar detajet e tyre.
    const items = saved.map((item) => ({
      opportunityId: item.opportunityId,
      offer: offers.find((offer) => offer.id === item.opportunityId) || null,
    }));
    return { items, total: await tx.savedOpportunity.count({ where }), page };
  });
}

export async function saveOffer(prisma, studentId, id) {
  const offer = await prisma.opportunity.findUnique({ where: { id }, select: { companyId: true } });
  if (!offer) throw authError(404, 'NOT_FOUND', 'Oferta nuk është më e disponueshme.');
  return prisma.$transaction(async (tx) => {
    // Publikimi, mbyllja dhe vendimet e kompanisë kyçin të njëjtin rresht.
    await tx.$queryRaw`SELECT id FROM companies WHERE id = ${offer.companyId} FOR UPDATE`;
    const available = await tx.opportunity.findFirst({
      where: { id, ...visibleOffers() },
      select: { id: true },
    });
    if (!available) throw authError(404, 'NOT_FOUND', 'Oferta nuk është më e disponueshme.');
    await tx.savedOpportunity.upsert({
      where: { studentId_opportunityId: { studentId, opportunityId: id } },
      create: { studentId, opportunityId: id },
      update: {},
    });
  });
}
