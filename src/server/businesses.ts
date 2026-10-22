import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from './db';
import { actor, advertiser, audit, one, query } from './store';
import { ensure } from './errors';
import { id, phone } from './validation';
const profile = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]{3,60}$/),
    description: z.string().trim().min(20).max(2000),
    location: z.string().trim().min(2).max(120),
    logoMediaId: id.optional(),
    phone: phone.optional(),
    whatsapp: phone.optional(),
    contactConsent: z.literal(true).optional(),
  })
  .strict()
  .refine((v) => !(v.phone || v.whatsapp) || v.contactConsent === true, {
    path: ['contactConsent'],
    message: 'Consent is required to publish contacts',
  });
export async function saveBusiness(userId: string, input: unknown, sellerId?: string) {
  const data = profile.parse(input);
  return db().transaction(async (tx) => {
    const user = await actor(tx, userId, !!sellerId);
    const p = await advertiser(tx, user, sellerId);
    ensure(p.kind === 'business', 422, 'BUSINESS_REQUIRED', 'Business advertiser required');
    if (data.logoMediaId) {
      const media = await one<{ advertiser_id: string; state: string }>(
        tx,
        sql`select advertiser_id,state from media_assets where id=${data.logoMediaId} for share`,
      );
      ensure(
        media.advertiser_id === p.id && media.state === 'ready',
        422,
        'INVALID_MEDIA',
        'Choose a completed image belonging to this business',
      );
    }
    const old = await query<{ id: string; state: string; slug: string }>(
      tx,
      sql`select * from business_profiles where advertiser_id=${p.id} for update`,
    );
    ensure(old[0]?.state !== 'suspended', 409, 'SUSPENDED', 'Business profile suspended');
    ensure(
      !old[0] || old[0].slug === data.slug,
      409,
      'SLUG_IMMUTABLE',
      'Keep the existing business URL',
    );
    const b = await one<{ id: string }>(
      tx,
      sql`insert into business_profiles(advertiser_id,slug,pending) values(${p.id},${data.slug},${JSON.stringify(data)}::jsonb) on conflict(advertiser_id) do update set pending=excluded.pending,state='pending',reason=null returning id`,
    );
    await audit(tx, userId, 'business_submitted', b.id);
    return b;
  });
}
export async function moderateBusiness(userId: string, businessId: string, input: unknown) {
  id.parse(businessId);
  const data = z
    .object({
      decision: z.enum(['approve', 'reject', 'suspend']),
      reason: z.string().trim().min(3).max(1000),
    })
    .strict()
    .parse(input);
  return db().transaction(async (tx) => {
    await actor(tx, userId, true);
    const b = await one<{ pending: unknown }>(
      tx,
      sql`select * from business_profiles where id=${businessId} for update`,
    );
    ensure(
      data.decision === 'suspend' || b.pending,
      409,
      'STATE_CONFLICT',
      'No business revision pending',
    );
    if (data.decision === 'approve')
      await tx.execute(
        sql`update business_profiles set approved=pending,pending=null,state='approved',reason=${data.reason} where id=${businessId}`,
      );
    if (data.decision === 'reject')
      await tx.execute(
        sql`update business_profiles set pending=null,state='rejected',reason=${data.reason} where id=${businessId}`,
      );
    if (data.decision === 'suspend')
      await tx.execute(
        sql`update business_profiles set state='suspended',pending=null,approved=null,reason=${data.reason} where id=${businessId}`,
      );
    await audit(tx, userId, 'business_moderated', businessId, data);
    return { id: businessId, decision: data.decision };
  });
}
export async function listBusinesses(slug?: string) {
  const rows = await query(
    db(),
    sql`select b.id,b.advertiser_id,b.slug,b.approved,p.name from business_profiles b join advertisers p on p.id=b.advertiser_id left join users u on u.id=p.user_id where b.approved is not null and b.state<>'suspended' and not p.suspended and (u.id is null or not u.suspended) ${slug ? sql`and b.slug=${slug}` : sql``} order by p.name,b.id limit 50`,
  );
  if (slug) ensure(rows[0], 404, 'NOT_FOUND', 'Business not found');
  return slug ? rows[0] : rows;
}
export async function businessQueue(userId: string) {
  return db().transaction(async (tx) => {
    await actor(tx, userId, true);
    return query(
      tx,
      sql`select * from business_profiles where pending is not null order by id limit 50`,
    );
  });
}
