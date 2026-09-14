import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z
  .string()
  .min(8)
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') <= 72,
    'Fjalëkalimi duhet të ketë jo më shumë se 72 bytes.',
  );
const name = z.string().trim().min(1).max(100);
const credentials = { email: emailSchema, password: passwordSchema };
export const registrationSchema = z.discriminatedUnion('role', [
  z
    .object({ ...credentials, role: z.literal('student'), firstName: name, lastName: name })
    .strict(),
  z
    .object({
      ...credentials,
      role: z.literal('company'),
      companyName: z.string().trim().min(1).max(200),
    })
    .strict(),
]);
export const loginSchema = z
  .object({ email: emailSchema, password: z.string().min(1).max(200) })
  .strict();

export function validate(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    const error = new Error(
      'Kontrollo fushat. Fjalëkalimi i ri duhet të ketë të paktën 8 karaktere.',
    );
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }
  return result.data;
}
