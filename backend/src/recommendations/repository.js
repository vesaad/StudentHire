import { authError } from '../auth/service.js';
import { visibleOffers, offerSummary, offerDetails } from '../catalog/service.js';

export async function recommendationContext(tx, userId) {
  const student = await tx.student.findUnique({
    where: { userId },
    select: {
      preferredField: true,
      preferredJobType: true,
      preferredWorkMode: true,
      preferredLocation: true,
      skills: { select: { skillId: true } },
    },
  });
  if (!student) throw authError(404, 'NOT_FOUND', 'Profili i studentit nuk u gjet.');
  const skills = await tx.skill.findMany({
    include: { fields: true, category: true, relationships: true },
  });
  return { student, knowledge: new Map(skills.map((skill) => [skill.id, skill])) };
}
export const availableOffers = (tx) =>
  tx.opportunity.findMany({ where: visibleOffers(), select: offerSummary });
export const availableOffer = (tx, id) => offerDetails(tx, id);
