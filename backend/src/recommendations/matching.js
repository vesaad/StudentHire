// Krahasimi bëhet me ID-të e katalogut, jo me emrat e aftësive.
export function matchSkills(studentSkillIds, requiredSkills) {
  const owned = new Set(studentSkillIds);
  const common = requiredSkills.filter((skill) => owned.has(skill.id));
  const missing = requiredSkills.filter((skill) => !owned.has(skill.id));
  return {
    percentage: requiredSkills.length
      ? Math.round((common.length / requiredSkills.length) * 100)
      : null,
    matchedCount: common.length,
    requiredCount: requiredSkills.length,
    common,
    missing,
  };
}

export function rankOffers(first, second) {
  const a = first.match;
  const b = second.match;
  // Renditja përdor raportin e plotë; rrumbullakimi shërben vetëm për paraqitje.
  const scoreA = a.requiredCount ? a.matchedCount / a.requiredCount : -1;
  const scoreB = b.requiredCount ? b.matchedCount / b.requiredCount : -1;
  return (
    scoreB - scoreA ||
    new Date(second.publishedAt) - new Date(first.publishedAt) ||
    second.id - first.id
  );
}
