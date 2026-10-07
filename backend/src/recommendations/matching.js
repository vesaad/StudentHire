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
  const scoreA = a.rawScore ?? (a.requiredCount ? a.matchedCount / a.requiredCount : -1);
  const scoreB = b.rawScore ?? (b.requiredCount ? b.matchedCount / b.requiredCount : -1);
  return (
    scoreB - scoreA ||
    new Date(second.publishedAt) - new Date(first.publishedAt) ||
    second.id - first.id
  );
}

const normalized = (value) =>
  (value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('sq');
const round = (value) => Math.round(value * 100) / 100;

// Pure deterministic rules: no DB calls, ML, random values or generated explanations.
export function recommend(student, offer, knowledge = new Map()) {
  const owned = new Set(student.skills.map((item) => item.skillId));
  const common = [],
    missing = [],
    relatedSkills = [],
    missingImportantSkills = [],
    reasons = [];
  let maximum = 0,
    earned = 0,
    criticalTotal = 0,
    criticalDeficit = 0,
    professionalEvidence = false;
  for (const requirement of offer.skills) {
    const skill = requirement.skill;
    const weight = [1, 2, 3].includes(requirement.weight) ? requirement.weight : 1;
    const required = requirement.requirementType !== 'preferred';
    const points = weight * (required ? 2 : 1);
    maximum += points;
    let credit = owned.has(skill.id) ? 1 : 0;
    let sourceId = credit ? skill.id : null;
    if (credit === 1) common.push(skill);
    else {
      const candidates = (knowledge.get(skill.id)?.relationships || [])
        .filter(
          (edge) =>
            edge.relationType === 'related' &&
            owned.has(edge.relatedSkillId) &&
            edge.similarityWeight > 0 &&
            edge.similarityWeight < 1,
        )
        .sort(
          (a, b) => b.similarityWeight - a.similarityWeight || a.relatedSkillId - b.relatedSkillId,
        );
      const best = candidates[0];
      if (best) {
        credit = best.similarityWeight;
        sourceId = best.relatedSkillId;
        relatedSkills.push({
          requiredSkill: skill.name,
          studentSkill: knowledge.get(sourceId)?.name || String(sourceId),
          similarityWeight: credit,
          requirementType: required ? 'required' : 'preferred',
          weight,
        });
      }
      missing.push(skill); // Partial knowledge is still not exact mastery.
      if (required) missingImportantSkills.push({ ...skill, weight, partialCredit: credit });
    }
    earned += points * credit;
    if (required && weight === 3) {
      criticalTotal++;
      criticalDeficit += 1 - credit;
    }
    const metadata = knowledge.get(skill.id);
    if (
      credit > 0 &&
      metadata?.category?.isGeneric === false &&
      knowledge.get(sourceId)?.category?.isGeneric === false &&
      metadata.fields?.some((item) => item.field === offer.field && item.relevanceWeight >= 0.5)
    )
      professionalEvidence = true;
  }
  const skillScore = maximum ? (earned / maximum) * 100 : 0;
  const components = { skills: skillScore * 0.7, field: 0, workMode: 0, jobType: 0, location: 0 };
  reasons.push(`${common.length} nga ${offer.skills.length} aftësi përputhen saktësisht.`);
  if (relatedSkills.length)
    reasons.push(`${relatedSkills.length} aftësi të lidhura marrin vetëm pikë të pjesshme.`);
  if (!maximum)
    reasons.push('Oferta nuk ka aftësi të përcaktuara; mungon baza për vlerësim profesional.');
  for (const [preference, attribute, component, bonus, reason] of [
    ['preferredField', 'field', 'field', 10, 'Oferta përputhet me fushën tënde të preferuar.'],
    [
      'preferredWorkMode',
      'workMode',
      'workMode',
      10,
      'Oferta përputhet me mënyrën tënde të preferuar të punës.',
    ],
    [
      'preferredJobType',
      'type',
      'jobType',
      5,
      'Oferta përputhet me llojin tënd të preferuar: punë ose praktikë.',
    ],
  ]) {
    if (student[preference] && student[preference] === offer[attribute]) {
      components[component] = bonus;
      reasons.push(reason);
    }
  }
  if (offer.workMode === 'remote') {
    components.location = 5;
    reasons.push('Puna është në distancë; qyteti nuk e ul përputhjen.');
  } else if (
    student.preferredLocation &&
    normalized(student.preferredLocation) === normalized(offer.location)
  ) {
    components.location = 5;
    reasons.push('Oferta përputhet me lokacionin tënd të preferuar.');
  }
  const baseScore = Object.values(components).reduce((sum, value) => sum + value, 0);
  const criticalMultiplier = criticalTotal ? 1 - (0.5 * criticalDeficit) / criticalTotal : 1;
  let rawScore = baseScore * criticalMultiplier;
  if (criticalDeficit > 0)
    reasons.push('Mungesa e njohjes së plotë të aftësive kritike e ul rezultatin.');
  const caps = [];
  if (!owned.size || !maximum) {
    caps.push(20);
    reasons.push('Rezultati kufizohet në 20% pa aftësi të studentit ose pa kërkesa të ofertës.');
  } else if (!professionalEvidence) {
    caps.push(35);
    reasons.push(
      'Rezultati kufizohet në 35% pa përputhje profesionale të konfirmuar për këtë fushë.',
    );
  }
  rawScore = Math.max(0, Math.min(100, rawScore, ...caps));
  return {
    matchScore: Math.round(rawScore),
    rawScore,
    // Preserve the old exact-skill contract for existing API consumers.
    ...matchSkills(
      [...owned],
      offer.skills.map((item) => item.skill),
    ),
    skillScore: round(skillScore),
    matchedSkills: common.map((skill) => skill.name),
    missingSkills: missing.map((skill) => skill.name),
    relatedSkills,
    missingImportantSkills,
    reasons,
    breakdown: {
      components: Object.fromEntries(
        Object.entries(components).map(([key, value]) => [key, round(value)]),
      ),
      earnedSkillPoints: round(earned),
      maximumSkillPoints: maximum,
      baseScore: round(baseScore),
      criticalMultiplier: round(criticalMultiplier),
      cap: caps.length ? Math.min(...caps) : null,
    },
  };
}
