import { sql } from 'drizzle-orm';
import type { Executor } from './db';
import { limits, query } from './store';
import { controlMode } from '../lib/platform-controls';

export async function registrationAllowed(tx: Executor, email: string) {
  if (controlMode(await limits(tx), 'registration') !== 'paused') return true;
  return (await query(tx, sql`select id from users where email=${email} limit 1`)).length > 0;
}
