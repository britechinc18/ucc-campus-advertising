import { sql } from 'drizzle-orm';
import { db } from './db';
import { query } from './store';
import { isAuthenticationConfigured } from './config';
// This endpoint checks schema readiness, not live OAuth or storage connectivity.
// It returns no connection strings, bucket identifiers, account IDs or secrets.
export async function readiness() {
  let databaseReady = false;
  if (process.env.DATABASE_URL) {
    try {
      const rows = await query<{ ready: boolean }>(
        db(),
        sql`select exists(select 1 from platform_settings where id=1) and exists(select 1 from information_schema.columns where table_schema='public' and table_name='advert_revisions' and column_name='quota_charged') as ready`,
      );
      databaseReady = rows[0]?.ready === true;
    } catch {
      databaseReady = false;
    }
  }
  const imageStorageConfigured = [
    'S3_ENDPOINT',
    'S3_BUCKET',
    'S3_ACCESS_KEY_ID',
    'S3_SECRET_ACCESS_KEY',
  ].every((k) => Boolean(process.env[k]));
  return {
    status: databaseReady ? 200 : 503,
    body: {
      service: 'ucc-campus-advertising',
      mode: 'backend-preview',
      databaseReady,
      authenticationConfigured: isAuthenticationConfigured(),
      imageStorageConfigured,
    },
  };
}
