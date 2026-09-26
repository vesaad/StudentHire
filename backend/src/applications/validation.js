import { z } from 'zod';
import { idSchema, pageSchema } from '../catalog/validation.js';
import { authError } from '../auth/service.js';

const status = z.enum(['pending', 'reviewed', 'accepted', 'rejected', 'withdrawn']);
export const applicationSchema = z
  .object({ opportunityId: idSchema, message: z.string().trim().max(3000).default('') })
  .strict();
export const decisionSchema = z
  .object({ status, expectedStatus: status, note: z.string().trim().max(2000).default('') })
  .strict();
export const listSchema = pageSchema.extend({
  status: status.optional(),
  opportunityId: idSchema.optional(),
});
export { idSchema };
export function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success)
    throw authError(
      400,
      'VALIDATION_ERROR',
      'Kontrollo të dhënat e aplikimit, statusin dhe gjatësinë e mesazhit.',
    );
  return result.data;
}
