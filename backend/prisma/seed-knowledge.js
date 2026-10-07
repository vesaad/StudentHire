import { knowledgeForSkill, relationships } from '../src/recommendations/knowledge.js';
import { skillKey } from '../../shared/jobFields.js';

// Uses existing IDs only. Empty updates preserve reviewed/manual knowledge changes.
export async function seedKnowledge(prisma) {
  const skills = await prisma.skill.findMany({
    select: { id: true, name: true, categoryId: true },
  });
  const unknown = [];
  const categories = new Map();
  for (const skill of skills) {
    const knowledge = knowledgeForSkill(skill.name);
    if (!knowledge.fields.length) unknown.push(skill.name);
    if (!categories.has(knowledge.category)) {
      const category = await prisma.skillCategory.upsert({
        where: { name: knowledge.category },
        update: {},
        create: { name: knowledge.category, isGeneric: knowledge.isGeneric },
      });
      categories.set(knowledge.category, category.id);
    }
    if (!skill.categoryId)
      await prisma.skill.update({
        where: { id: skill.id },
        data: { categoryId: categories.get(knowledge.category) },
      });
    for (const mapping of knowledge.fields)
      await prisma.fieldSkill.upsert({
        where: { field_skillId: { field: mapping.field, skillId: skill.id } },
        update: {},
        create: { skillId: skill.id, ...mapping },
      });
  }
  const ids = new Map(skills.map((skill) => [skillKey(skill.name), skill.id]));
  for (const [first, second, similarityWeight] of relationships) {
    const a = ids.get(skillKey(first));
    const b = ids.get(skillKey(second));
    if (!a || !b || a === b) continue;
    for (const [skillId, relatedSkillId] of [
      [a, b],
      [b, a],
    ])
      await prisma.skillRelationship.upsert({
        where: { skillId_relatedSkillId: { skillId, relatedSkillId } },
        update: {},
        create: { skillId, relatedSkillId, similarityWeight, relationType: 'related' },
      });
  }
  return { skills: skills.length, unclassified: unknown };
}
