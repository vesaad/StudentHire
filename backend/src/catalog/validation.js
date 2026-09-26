import { z } from 'zod';
import { authError } from '../auth/service.js';
import { jobFieldValues } from '../../../shared/jobFields.js';

export const idSchema = z.coerce.number().int().positive().max(4294967295);
export const pageSchema = z
  .object({ page: z.coerce.number().int().min(1).max(100000).default(1) })
  .strict();
export const searchSchema = pageSchema.extend({
  q: z.string().trim().max(100).default(''),
  location: z.string().trim().max(150).default(''),
  type: z.enum(['', 'job', 'internship']).default(''),
  employmentType: z.enum(['', 'full_time', 'part_time', 'contract']).default(''),
  skillId: idSchema.optional(),
  skillIds: z
    .string()
    .regex(/^\d+(,\d+)*$/)
    .transform((value) => [...new Set(value.split(',').map(Number))])
    .pipe(z.array(idSchema).max(100))
    .optional(),
  field: z.enum(['', ...jobFieldValues]).default(''),
  workMode: z.enum(['', 'onsite', 'hybrid', 'remote']).default(''),
});

export function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success)
    throw authError(400, 'VALIDATION_ERROR', 'Kontrollo filtrat dhe numrin e faqes.');
  return result.data;
}
