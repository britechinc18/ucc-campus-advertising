import { sql } from 'drizzle-orm';
import { db } from './db';
import { query } from './store';
import { storage, type ObjectStorage } from './storage';
export async function maintenance(objects?: ObjectStorage) {
  const expired = await db().execute(
    sql`update adverts set state='expired' where state='published' and expires_at<=now()`,
  );
  await db().execute(sql`delete from rate_limit_buckets where expires_at<now()-interval '1 day'`);
  await db().execute(sql`delete from idempotency_keys where created_at<now()-interval '60 days'`);
  // Do not remove an advert's historical moderation evidence. Only unattached assets qualify.
  const stale = await db().transaction(async (tx) => {
    const rows = await query<{ id: string; object_key: string; advertiser_id: string }>(
      tx,
      sql`select m.id,m.object_key,m.advertiser_id from media_assets m where m.created_at<now()-interval '1 day' and m.state in ('staged','ready','deleting') and not exists(select 1 from revision_media rm where rm.media_id=m.id) and not exists(select 1 from business_profiles b where b.approved->>'logoMediaId'=m.id::text or b.pending->>'logoMediaId'=m.id::text) order by m.id for update skip locked limit 50`,
    );
    for (const m of rows)
      await tx.execute(sql`update media_assets set state='deleting' where id=${m.id}`);
    return rows;
  });
  let cleaned = 0;
  if (stale.length) {
    const objectsClient = objects ?? storage();
    for (const m of stale) {
      await objectsClient.remove(m.object_key);
      await objectsClient.remove(`derived/${m.id}.webp`);
      await objectsClient.remove(`staged/${m.advertiser_id}/${m.id}`);
      await db().execute(
        sql`update media_assets set state='deleted' where id=${m.id} and state='deleting'`,
      );
      cleaned++;
    }
  }
  // Remove recreated staged originals for finalized assets after signed URLs have expired.
  const finalized = await query<{ id: string; advertiser_id: string }>(
    db(),
    sql`select id,advertiser_id from media_assets where state='ready' and created_at between now()-interval '2 days' and now()-interval '1 day' limit 50`,
  );
  if (finalized.length) {
    const objectsClient = objects ?? storage();
    for (const m of finalized) await objectsClient.remove(`staged/${m.advertiser_id}/${m.id}`);
  }
  return { expired: expired.rowCount, cleaned };
}
