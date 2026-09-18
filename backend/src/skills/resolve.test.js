import { describe, expect, it, vi } from 'vitest';
import { resolveSkillNames } from './resolve.js';
import { searchSchema } from '../catalog/validation.js';
import { searchOffers } from '../catalog/service.js';
import { jobFields } from '../../../shared/jobFields.js';

describe('Typed skills and multi-sector filters', () => {
  it('normalizes whitespace and case duplicates before catalog writes', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 7, name: 'Excel', isActive: true });
    expect(
      await resolveSkillNames({ skill: { upsert } }, [' Excel ', 'EXCEL', 'Ｅｘｃｅｌ']),
    ).toEqual([7]);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0].update).toEqual({});
  });
  it('does not reactivate an inactive catalog skill', async () => {
    const tx = {
      skill: { upsert: vi.fn().mockResolvedValue({ id: 9, name: 'SEO', isActive: false }) },
    };
    await expect(resolveSkillNames(tx, ['SEO'])).rejects.toMatchObject({ code: 'INVALID_SKILLS' });
    expect(await resolveSkillNames(tx, ['SEO'], [9])).toEqual([9]);
  });
  it('validates fields and rejects malformed or unbounded skill filters', () => {
    for (const field of jobFields)
      expect(searchSchema.safeParse({ field: field.value }).success).toBe(true);
    expect(searchSchema.parse({ skillIds: '2,3,2' }).skillIds).toEqual([2, 3]);
    for (const input of [
      { field: 'invalid' },
      { skillIds: '2,x' },
      { skillIds: '0' },
      { skillIds: '99999999999' },
    ])
      expect(searchSchema.safeParse(input).success).toBe(false);
  });
  it('filters by position field independently of company industry and combines skills with OR', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = {
      opportunity: { findMany, count: vi.fn().mockResolvedValue(0) },
      $transaction: (queries) => Promise.all(queries),
    };
    await searchOffers(
      prisma,
      searchSchema.parse({ field: 'finance', workMode: 'hybrid', skillIds: '3,5' }),
    );
    const clauses = findMany.mock.calls[0][0].where.AND;
    expect(clauses).toContainEqual({ field: 'finance' });
    expect(clauses).toContainEqual({ workMode: 'hybrid' });
    expect(clauses).toContainEqual({ skills: { some: { skillId: { in: [3, 5] } } } });
    expect(JSON.stringify(clauses)).not.toContain('industry');
  });
});
