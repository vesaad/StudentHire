import { z } from 'zod';
import { authError } from '../auth/service.js';
import { jobFieldValues } from '../../../shared/jobFields.js';
const fields = {
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(15000),
  location: z.string().trim().min(1).max(150),
  type: z.enum(['job', 'internship']),
  employmentType: z.enum(['full_time', 'part_time', 'contract']),
  field: z.enum(jobFieldValues).optional(),
  workMode: z.enum(['onsite', 'hybrid', 'remote']).optional(),
  deadline: z.string().datetime({ offset: true }).nullable(),
  skillIds: z
    .array(z.number().int().positive())
    .max(100)
    .refine((ids) => new Set(ids).size === ids.length)
    .default([]),
  skillNames: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
  skillRequirements: z
    .array(
      z
        .object({
          name: z.string().trim().min(1).max(100),
          requirementType: z.enum(['required', 'preferred']),
          weight: z.number().int().min(1).max(3),
        })
        .strict(),
    )
    .max(100)
    .optional(),
};
export const createSchema = z.object(fields).strict();
export const updateSchema = z
  .object({ ...fields, revision: z.number().int().nonnegative() })
  .strict();
export const revisionSchema = z.object({ revision: z.number().int().nonnegative() }).strict();
export const idSchema = z.coerce.number().int().positive().max(4294967295);
export const listSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    status: z.enum(['all', 'draft', 'published', 'closed']).default('all'),
  })
  .strict();
export function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success)
    throw authError(
      400,
      'VALIDATION_ERROR',
      'Kontrollo titullin (3–200 karaktere), përshkrimin (10–15000), lokacionin, afatin dhe aftësitë.',
    );
  return result.data;
}
