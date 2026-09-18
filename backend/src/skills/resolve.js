import { authError } from '../auth/service.js';
import { normalizeSkillName, skillKey } from '../../../shared/jobFields.js';

// Reuse canonical catalog entries so typed skills still participate in matching.
export async function resolveSkillNames(tx, names, previousIds = []) {
  const result = [];
  const unique = new Map(names.map((name) => [skillKey(name), normalizeSkillName(name)]));
  for (const name of unique.values()) {
    // MySQL's catalog collation also handles case-insensitive uniqueness.
    const skill = await tx.skill.upsert({ where: { name }, update: {}, create: { name } });
    if (!skill.isActive && !previousIds.includes(skill.id))
      throw authError(400, 'INVALID_SKILLS', `Aftësia “${skill.name}” është joaktive.`);
    result.push(skill.id);
  }
  return [...new Set(result)];
}
