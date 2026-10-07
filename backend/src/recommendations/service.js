import { recommendationContext, availableOffers, availableOffer } from './repository.js';
import { recommend, rankOffers } from './matching.js';

export async function recommendations(prisma, userId, page) {
  return prisma.$transaction(async (tx) => {
    const { student, knowledge } = await recommendationContext(tx, userId);
    const offers = await availableOffers(tx);
    const ranked = offers
      .map((offer) => ({ ...offer, match: recommend(student, offer, knowledge) }))
      .sort(rankOffers);
    return {
      items: ranked.slice((page - 1) * 10, page * 10),
      total: ranked.length,
      page,
      studentSkillCount: student.skills.length,
    };
  });
}

export async function offerMatch(prisma, userId, id) {
  return prisma.$transaction(async (tx) => {
    const { student, knowledge } = await recommendationContext(tx, userId);
    return recommend(student, await availableOffer(tx, id), knowledge);
  });
}
