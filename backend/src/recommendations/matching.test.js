import { describe, expect, it } from 'vitest';
import { recommend, rankOffers } from './matching.js';
import { categories, knowledgeForSkill, relationships, canonicalFields } from './knowledge.js';
import { createSchema } from '../opportunities/validation.js';
import { profileSchema } from '../students/validation.js';

const names = [...new Set(categories.flatMap((category) => category.names))];
const id = (name) => names.indexOf(name) + 1;
const knowledge = new Map(
  names.map((name) => {
    const info = knowledgeForSkill(name);
    return [
      id(name),
      {
        id: id(name),
        name,
        category: { isGeneric: info.isGeneric },
        fields: info.fields,
        relationships: relationships.flatMap(([a, b, similarityWeight]) =>
          a === name || b === name
            ? [
                {
                  relatedSkillId: id(a === name ? b : a),
                  similarityWeight,
                  relationType: 'related',
                },
              ]
            : [],
        ),
      },
    ];
  }),
);
const requirement = (name, weight = 1, requirementType = 'required') => ({
  skill: { id: id(name), name },
  weight,
  requirementType,
});
const offer = {
  field: 'technology',
  workMode: 'onsite',
  type: 'internship',
  location: 'Prishtinë',
  skills: [requirement('React', 3), requirement('SQL', 2), requirement('Git', 1, 'preferred')],
};
const student = (skills, preferences = true) => ({
  skills: skills.map((name) => ({ skillId: id(name) })),
  ...(preferences
    ? {
        preferredField: 'technology',
        preferredWorkMode: 'onsite',
        preferredJobType: 'internship',
        preferredLocation: 'Prishtinë',
      }
    : {}),
});
const score = (person, job = offer) => recommend(person, job, knowledge);

describe('Knowledge-based recommendation rules', () => {
  it('1. exact skills and all preferences produce 100', () => {
    const result = score(student(['React', 'SQL', 'Git']));
    expect(result.matchScore).toBe(100);
    expect(result.matchedSkills).toEqual(['React', 'SQL', 'Git']);
    expect(result.missingSkills).toEqual([]);
  });
  it('2. exact and related skills earn partial, never duplicate, credit', () => {
    const result = score(student(['React', 'MySQL', 'PostgreSQL', 'Git']));
    expect(result.breakdown.earnedSkillPoints).toBe(9.8);
    expect(result.relatedSkills).toHaveLength(1);
    expect(result.matchScore).toBe(92);
    expect(result.missingSkills).toContain('SQL');
    expect(result.matchedSkills).not.toContain('SQL');
  });
  it('3. the same field with few requirements is not a strong recommendation', () => {
    expect(score(student(['Git'])).matchScore).toBeLessThan(40);
  });
  it('4. generic skills alone cannot rank an unrelated profession highly', () => {
    const result = score(student(['Komunikim', 'Punë në ekip']), {
      ...offer,
      field: 'health',
      skills: [requirement('Komunikim'), requirement('Punë në ekip')],
    });
    expect(result.skillScore).toBe(100);
    expect(result.matchScore).toBe(35);
    expect(result.breakdown.cap).toBe(35);
  });
  it('5. a student without skills receives at most 20', () => {
    expect(score(student([])).matchScore).toBeLessThanOrEqual(20);
    expect(score(student([]), { ...offer, skills: [] }).matchScore).toBe(20);
  });
  it('6. complete professional skills remain relevant with different preferences', () => {
    expect(
      score({
        ...student(['React', 'SQL', 'Git'], false),
        preferredField: 'health',
        preferredWorkMode: 'remote',
        preferredJobType: 'job',
        preferredLocation: 'Tiranë',
      }).matchScore,
    ).toBe(70);
  });
  it('7. remote location receives full location credit despite another city', () => {
    const result = score(
      { ...student(['React', 'SQL', 'Git']), preferredLocation: 'Tiranë' },
      { ...offer, workMode: 'remote' },
    );
    expect(result.breakdown.components.location).toBe(5);
    expect(result.reasons.some((reason) => reason.includes('qyteti'))).toBe(true);
  });
  it('8. missing a critical requirement significantly reduces the score', () => {
    const result = score(student(['SQL', 'Git']));
    expect(result.breakdown.criticalMultiplier).toBe(0.5);
    expect(result.matchScore).toBe(31);
    expect(result.missingImportantSkills[0]).toMatchObject({ name: 'React', weight: 3 });
    expect(score(student(['JavaScript', 'SQL', 'Git'])).breakdown.criticalMultiplier).toBe(0.75);
  });
  it('9. one skill belongs to several fields and works in each', () => {
    const fields = knowledgeForSkill('Microsoft Excel').fields.map((item) => item.field);
    expect(fields).toEqual(['finance', 'administration', 'logistics']);
    expect(knowledgeForSkill('Canva').fields.map((item) => item.field)).toEqual([
      'design',
      'marketing',
    ]);
    for (const field of fields)
      expect(
        score(student(['Microsoft Excel'], false), {
          ...offer,
          field,
          skills: [requirement('Microsoft Excel')],
        }).matchScore,
      ).toBe(70);
  });
  it('10. deterministic scores always stay in 0–100 for every subset', () => {
    const choices = ['React', 'SQL', 'Git', 'JavaScript', 'MySQL'];
    for (let mask = 0; mask < 32; mask++) {
      const person = student(choices.filter((_, index) => mask & (1 << index)));
      for (const mode of ['onsite', 'hybrid', 'remote']) {
        const result = score(person, { ...offer, workMode: mode });
        expect(result.matchScore).toBeGreaterThanOrEqual(0);
        expect(result.matchScore).toBeLessThanOrEqual(100);
        expect(result).toEqual(score(person, { ...offer, workMode: mode }));
      }
    }
  });
  it('required skills contribute more than preferred skills of equal weight', () => {
    const result = score(student(['SQL'], false), {
      ...offer,
      skills: [requirement('SQL', 2), requirement('React', 2, 'preferred')],
    });
    expect(result.skillScore).toBe(66.67);
  });
  it('does not infer similarity from categories or transitive relationships', () => {
    expect(score(student(['Python']), { ...offer, skills: [requirement('Java')] }).skillScore).toBe(
      0,
    );
  });
  it('missing preferences give no bonus and location comparison normalizes case and whitespace', () => {
    expect(score(student(['React', 'SQL', 'Git'], false)).matchScore).toBe(70);
    expect(
      score({ ...student(['React']), preferredLocation: '  PRISHTINË  ' }).breakdown.components
        .location,
    ).toBe(5);
  });
  it('uses unrounded scores, publication time, then ID for stable ordering', () => {
    expect(
      rankOffers(
        { id: 1, match: { rawScore: 60.1 }, publishedAt: '2026-01-01' },
        { id: 2, match: { rawScore: 60.2 }, publishedAt: '2026-01-01' },
      ),
    ).toBeGreaterThan(0);
    expect(
      rankOffers(
        { id: 1, match: { rawScore: 60 }, publishedAt: '2026-01-01' },
        { id: 2, match: { rawScore: 60 }, publishedAt: '2026-01-01' },
      ),
    ).toBeGreaterThan(0);
  });
  it('knowledge covers all canonical fields, with partial relationships only', () => {
    expect(canonicalFields).toHaveLength(11);
    for (const field of canonicalFields)
      expect(
        categories.some((category) => !category.isGeneric && category.fields.includes(field)),
      ).toBe(true);
    for (const [a, b, weight] of relationships) {
      expect(id(a)).toBeGreaterThan(0);
      expect(id(b)).toBeGreaterThan(0);
      expect(weight).toBeGreaterThan(0);
      expect(weight).toBeLessThan(1);
    }
    expect(knowledgeForSkill('Unknown future skill')).toMatchObject({
      isGeneric: true,
      fields: [],
    });
  });
  it('rejects invalid skill weights, status and preferences', () => {
    const base = {
      title: 'Test',
      description: 'A test opportunity',
      location: 'Test',
      type: 'job',
      employmentType: 'full_time',
      deadline: null,
    };
    for (const weight of [0, 4, 1.5])
      expect(
        createSchema.safeParse({
          ...base,
          skillRequirements: [{ name: 'React', requirementType: 'required', weight }],
        }).success,
      ).toBe(false);
    expect(
      createSchema.safeParse({
        ...base,
        skillRequirements: [{ name: 'React', requirementType: 'critical', weight: 3 }],
      }).success,
    ).toBe(false);
    expect(profileSchema.shape.preferredField.safeParse('medicine').success).toBe(false);
    expect(profileSchema.shape.preferredWorkMode.safeParse(null).success).toBe(true);
  });
});
