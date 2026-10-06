import { z } from 'zod';
import { pageSchema, idSchema } from '../catalog/validation.js';
import { authError } from '../auth/service.js';
export { idSchema };
export const userQuery = pageSchema.extend({
  q: z.string().trim().max(100).default(''),
  role: z.enum(['all', 'student', 'company', 'admin']).default('all'),
  status: z.enum(['all', 'active', 'suspended']).default('all'),
});
export const offerQuery = pageSchema.extend({
  q: z.string().trim().max(100).default(''),
  status: z.enum(['all', 'draft', 'published', 'closed']).default('all'),
});
export const skillQuery = pageSchema.extend({
  q: z.string().trim().max(100).default(''),
  status: z.enum(['all', 'active', 'inactive']).default('all'),
});
const revision = z.number().int().nonnegative();
const reason = z.string().trim().min(3).max(2000);
export const accountSchema = z
  .object({ revision, status: z.enum(['active', 'suspended']), reason })
  .strict();
export const closeSchema = z.object({ revision, reason }).strict();
export const newSkillSchema = z.object({ name: z.string().trim().min(1).max(100) }).strict();
export const skillSchema = newSkillSchema.extend({ revision, isActive: z.boolean() }).strict();
export function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success)
    throw authError(
      400,
      'VALIDATION_ERROR',
      'Kontrollo fushat. Arsyeja duhet të ketë 3–2000 karaktere.',
    );
  return result.data;
}
