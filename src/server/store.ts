import { sql, type SQL } from 'drizzle-orm';
import { db, type Executor } from './db';
import { ensure } from './errors';
export async function query<T>(tx: Executor, statement: SQL): Promise<T[]> {
  return (await tx.execute(statement)).rows as T[];
}
export async function one<T>(tx: Executor, statement: SQL): Promise<T> {
  const rows = await query<T>(tx, statement);
  ensure(rows[0], 404, 'NOT_FOUND', 'Resource not found');
  return rows[0];
}
export interface Actor {
  id: string;
  role: string;
  suspended: boolean;
}
export async function actor(tx: Executor, userId: string, admin = false) {
  const user = await one<Actor>(
    tx,
    sql`select id,role,suspended from users where id=${userId} for update`,
  );
  ensure(!user.suspended, 403, 'SUSPENDED', 'Account suspended');
  ensure(!admin || user.role === 'admin', 403, 'FORBIDDEN', 'Administrator required');
  return user;
}
export interface Advertiser {
  id: string;
  user_id: string | null;
  suspended: boolean;
  kind: string;
}
export async function advertiser(tx: Executor, user: Actor, advertiserId?: string) {
  const candidates = await query<Advertiser>(
    tx,
    advertiserId
      ? sql`select * from advertisers where id=${advertiserId} for update`
      : sql`select * from advertisers where user_id=${user.id} order by created_at,id for update`,
  );
  ensure(candidates.length, 404, 'NOT_FOUND', 'Advertiser not found');
  ensure(
    advertiserId || candidates.length === 1,
    422,
    'IDENTITY_REQUIRED',
    'Choose a personal or business identity',
  );
  const value = candidates[0];
  ensure(
    user.role === 'admin' || value.user_id === user.id,
    403,
    'FORBIDDEN',
    'Advertiser ownership required',
  );
  ensure(!value.suspended, 403, 'SUSPENDED', 'Advertiser suspended');
  return value;
}
export interface Settings {
  max_active: number;
  daily_limit: number;
  duration_days: number;
  max_images: number;
  max_image_bytes: number;
  version: number;
}
export async function limits(tx: Executor) {
  return one<Settings>(tx, sql`select * from platform_settings where id=1 for share`);
}
export async function audit(
  tx: Executor,
  userId: string,
  action: string,
  targetId: string,
  detail: unknown = {},
) {
  await tx.execute(
    sql`insert into audit_events(actor_id,action,target_id,detail) values(${userId},${action},${targetId},${JSON.stringify(detail)}::jsonb)`,
  );
}
export async function rateLimit(key: string, limit: number, seconds: number) {
  const row = await one<{ count: number }>(
    db(),
    sql`insert into rate_limit_buckets(key,count,expires_at) values(${key},1,now()+${seconds}*interval '1 second') on conflict(key) do update set count=case when rate_limit_buckets.expires_at<=now() then 1 else rate_limit_buckets.count+1 end,expires_at=case when rate_limit_buckets.expires_at<=now() then now()+${seconds}*interval '1 second' else rate_limit_buckets.expires_at end returning count`,
  );
  ensure(
    row.count <= limit,
    429,
    'RATE_LIMIT',
    'Too many requests; retry after the current rate-limit window',
  );
}
// a,r,p,u aliases are fixed within public queries; never include unapproved revisions.
export const visible = sql`a.state='published' and a.expires_at>now() and r.status='approved' and not p.suspended and (u.id is null or not u.suspended) and (r.data->'details'->>'endsAt' is null or (r.data->'details'->>'endsAt')::timestamptz>now())`;

// The owner user row serializes submissions across personal and business identities.
export const ownerIdentities = (sellerId: string) =>
  sql`select p.id from advertisers p where p.id=${sellerId} or p.user_id=(select user_id from advertisers where id=${sellerId})`;
