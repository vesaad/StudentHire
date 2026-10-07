import { authError } from '../auth/service.js';
import { resolveSkillNames } from '../skills/resolve.js';
import { skillKey } from '../../../shared/jobFields.js';

async function requirementRows(tx, skillIds, input, previous = []) {
  const skills = await tx.skill.findMany({ where: { id: { in: skillIds } } });
  const byName = new Map(skills.map((skill) => [skillKey(skill.name), skill.id]));
  const settings = new Map();
  for (const item of input || []) {
    const id = byName.get(skillKey(item.name));
    if (!id || settings.has(id))
      throw authError(
        400,
        'INVALID_SKILLS',
        'Pesha duhet të lidhet me një aftësi të zgjedhur, pa përsëritje.',
      );
    settings.set(id, { requirementType: item.requirementType, weight: item.weight });
  }
  return skillIds.map((skillId) => {
    const existing = previous.find((item) => item.skillId === skillId);
    return {
      skillId,
      ...(settings.get(skillId) || {
        requirementType: existing?.requirementType || 'required',
        weight: existing?.weight || 1,
      }),
    };
  });
}

export const opportunityDetails = {
  skills: { include: { skill: { select: { id: true, name: true, isActive: true } } } },
};
const conflict = () =>
  authError(409, 'CONFLICT', 'Oferta ka ndryshuar. Rifresko të dhënat dhe provo përsëri.');

// Kyçi ruan rendin kompani → përdorues, si vendimet e administratorit.
async function withCompany(prisma, companyId, operation) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM companies WHERE id = ${companyId} FOR UPDATE`;
    const company = await tx.company.findUnique({ where: { id: companyId } });
    if (!company)
      throw authError(403, 'COMPANY_NOT_APPROVED', 'Kompania nuk është e disponueshme.');
    const users =
      await tx.$queryRaw`SELECT status, role FROM users WHERE id = ${company.userId} FOR UPDATE`;
    if (
      company.status !== 'approved' ||
      users[0]?.status !== 'active' ||
      users[0]?.role !== 'company'
    )
      throw authError(403, 'COMPANY_NOT_APPROVED', 'Kërkohet kompani aktive dhe e aprovuar.');
    return operation(tx);
  });
}
function checkDeadline(deadline) {
  if (deadline && new Date(deadline).getTime() <= Date.now())
    throw authError(400, 'INVALID_DEADLINE', 'Afati i publikimit duhet të jetë në të ardhmen.');
}
async function checkSkills(tx, skillIds, previousIds = []) {
  const skills = await tx.skill.findMany({ where: { id: { in: skillIds } } });
  if (
    skills.length !== skillIds.length ||
    skills.some((skill) => !skill.isActive && !previousIds.includes(skill.id))
  )
    throw authError(400, 'INVALID_SKILLS', 'Zgjidh aftësi nga katalogu aktiv.');
}
export async function getOpportunity(prisma, companyId, id) {
  const offer = await prisma.opportunity.findFirst({
    where: { id, companyId },
    include: opportunityDetails,
  });
  if (!offer) throw authError(404, 'NOT_FOUND', 'Oferta nuk u gjet.');
  return offer;
}
export async function createOpportunity(prisma, companyId, input) {
  return withCompany(prisma, companyId, async (tx) => {
    const { skillIds: inputIds = [], skillNames, skillRequirements, ...fields } = input;
    const skillIds = skillNames !== undefined ? await resolveSkillNames(tx, skillNames) : inputIds;
    await checkSkills(tx, skillIds);
    const requirements = await requirementRows(tx, skillIds, skillRequirements);
    return tx.opportunity.create({
      data: {
        ...fields,
        deadline: fields.deadline ? new Date(fields.deadline) : null,
        companyId,
        skills: { create: requirements },
      },
      include: opportunityDetails,
    });
  });
}
export async function updateOpportunity(prisma, companyId, id, input) {
  return withCompany(prisma, companyId, async (tx) => {
    const offer = await getOpportunity(tx, companyId, id);
    if (offer.status === 'closed')
      throw authError(409, 'CLOSED', 'Oferta e mbyllur nuk mund të ndryshohet.');
    if (offer.revision !== input.revision) throw conflict();
    const { revision, skillIds: inputIds = [], skillNames, skillRequirements, ...fields } = input;
    const skillIds =
      skillNames !== undefined
        ? await resolveSkillNames(
            tx,
            skillNames,
            offer.skills.map((item) => item.skillId),
          )
        : inputIds;
    if (offer.status === 'published') checkDeadline(fields.deadline);
    await checkSkills(
      tx,
      skillIds,
      offer.skills.map((item) => item.skillId),
    );
    const requirements = await requirementRows(tx, skillIds, skillRequirements, offer.skills);
    const changed = await tx.opportunity.updateMany({
      where: { id, companyId, revision },
      data: {
        ...fields,
        deadline: fields.deadline ? new Date(fields.deadline) : null,
        revision: { increment: 1 },
      },
    });
    if (changed.count !== 1) throw conflict();
    await tx.opportunitySkill.deleteMany({ where: { opportunityId: id } });
    if (skillIds.length)
      await tx.opportunitySkill.createMany({
        data: requirements.map((item) => ({ opportunityId: id, ...item })),
      });
    return getOpportunity(tx, companyId, id);
  });
}
export async function changeStatus(prisma, companyId, id, revision, action) {
  return withCompany(prisma, companyId, async (tx) => {
    const offer = await getOpportunity(tx, companyId, id);
    if (offer.revision !== revision) throw conflict();
    if (offer.status === 'closed' || (action === 'publish' && offer.status !== 'draft'))
      throw authError(409, 'INVALID_TRANSITION', 'Ky ndryshim statusi nuk lejohet.');
    const now = new Date();
    if (action === 'publish') checkDeadline(offer.deadline);
    const changed = await tx.opportunity.updateMany({
      where: { id, companyId, revision },
      data:
        action === 'publish'
          ? { status: 'published', publishedAt: now, revision: { increment: 1 } }
          : { status: 'closed', closedAt: now, revision: { increment: 1 } },
    });
    if (changed.count !== 1) throw conflict();
    // Mbyllja ndryshon vetëm ofertën; aplikimet dhe historiku mbeten të paprekura.
    return getOpportunity(tx, companyId, id);
  });
}
