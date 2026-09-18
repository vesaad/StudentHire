import { z } from 'zod';
import { authError } from '../auth/service.js';
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);
export const revisionSchema = z.coerce.number().int().nonnegative();
export const profileSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    phone: optionalText(30),
    location: optionalText(150),
    university: optionalText(200),
    fieldOfStudy: optionalText(200),
    bio: optionalText(5000),
    graduationYear: z
      .number()
      .int()
      .min(1950)
      .max(new Date().getFullYear() + 15)
      .nullable(),
    skillIds: z
      .array(z.number().int().positive())
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length)
      .default([]),
    skillNames: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
  })
  .strict();
export function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success)
    throw authError(
      400,
      'VALIDATION_ERROR',
      'Kontrollo fushat e profilit dhe aftësitë e zgjedhura.',
    );
  return result.data;
}
