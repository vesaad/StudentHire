import { authError } from '../auth/service.js';
import { visibleOffers, offerSummary, offerDetails } from '../catalog/service.js';
import { matchSkills, rankOffers } from './matching.js';

async function studentSkills(prisma, userId) {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: { skills: { select: { skillId: true } } },
  });
  if (!student) throw authError(404, 'NOT_FOUND', 'Profili i studentit nuk u gjet.');
  return student.skills.map((item) => item.skillId);
}

export async function recommendations(prisma, userId, page) {
  return prisma.$transaction(async (tx) => {
    const ids = await studentSkills(tx, userId);
    const offers = await tx.opportunity.findMany({ where: visibleOffers(), select: offerSummary });
    const ranked = offers
      .map((offer) => ({
        ...offer,
        match: matchSkills(
          ids,
          offer.skills.map((item) => item.skill),
        ),
      }))
      .sort(rankOffers);
    return {
      items: ranked.slice((page - 1) * 10, page * 10),
      total: ranked.length,
      page,
      studentSkillCount: ids.length,
    };
  });
}

export async function offerMatch(prisma, userId, id) {
  return prisma.$transaction(async (tx) => {
    const ids = await studentSkills(tx, userId);
    const offer = await offerDetails(tx, id);
    return matchSkills(
      ids,
      offer.skills.map((item) => item.skill),
    );
  });
}
