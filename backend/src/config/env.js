import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
});
export function parseEnv(values) {
  const result = schema.safeParse(values);
  if (!result.success)
    throw new Error(
      `Konfigurim i pavlefshëm: ${result.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
    );
  return result.data;
}
export const env = parseEnv(process.env);
