import { z } from 'zod';
import { authError } from '../auth/service.js';

const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);
const website = z
  .union([
    z.literal(''),
    z
      .string()
      .trim()
      .url()
      .max(500)
      .refine((value) => /^https?:\/\//i.test(value)),
  ])
  .transform((value) => value || null);
export const profileSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    name: z.string().trim().min(1).max(200),
    description: optionalText(5000),
    industry: optionalText(150),
    location: optionalText(150),
    address: optionalText(300).optional(),
    phone: z
      .string()
      .trim()
      .regex(/^(?:\+383\d{8})?$/, 'Telefoni duhet të ketë 8 shifra pas +383.')
      .transform((value) => value || null),
    website,
  })
  .strict();
export const decisionSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    action: z.enum(['approve', 'reject', 'suspend', 'reactivate']),
    reason: z.string().trim().max(2000).default(''),
  })
  .strict()
  .refine((data) => !['reject', 'suspend'].includes(data.action) || data.reason.length > 0);
export const listSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    status: z.enum(['pending', 'approved', 'rejected', 'all']).default('pending'),
    q: z.string().trim().max(100).default(''),
  })
  .strict();
export const idSchema = z.coerce.number().int().positive().max(4294967295);
export function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success)
    throw authError(
      400,
      'VALIDATION_ERROR',
      'Kontrollo fushat. Refuzimi dhe pezullimi kërkojnë arsyetim; website duhet të jetë adresë http/https.',
    );
  return result.data;
}
