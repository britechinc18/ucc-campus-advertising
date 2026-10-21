import { z } from 'zod';
const schema = z.object({
  DATABASE_URL: z.string().url(), AUTH_SECRET: z.string().min(32),
  AUTH_GOOGLE_ID: z.string().min(1), AUTH_GOOGLE_SECRET: z.string().min(1),
  APP_ORIGIN: z.string().url(), ABUSE_HASH_SECRET: z.string().min(32),
  MAINTENANCE_SECRET: z.string().min(32),
});
export function config() {
  const result = schema.safeParse(process.env);
  if (!result.success) throw new Error(`Missing/invalid server configuration: ${result.error.issues.map(i => i.path.join('.')).join(', ')}`);
  return result.data;
}
