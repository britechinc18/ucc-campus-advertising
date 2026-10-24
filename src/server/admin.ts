import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from './db';
import { actor, audit, one, query } from './store';
import { ensure } from './errors';
import { id, profileSchema, settingsSchema } from './validation';
import { ensurePersonal } from './adverts';

const unusedPersonal = sql`p.kind='student' and p.automatic_personal and p.draft_defaults is null and p.approved_defaults is null and not exists(select 1 from adverts a where a.advertiser_id=p.id) and not exists(select 1 from media_assets m where m.advertiser_id=p.id) and not exists(select 1 from advertiser_daily_usage d where d.advertiser_id=p.id) and not exists(select 1 from business_profiles b where b.advertiser_id=p.id)`;
export async function createAssistedProfile(userId: string, input: unknown) {
  const data = profileSchema.parse(input);
  return db().transaction(async (tx) => {
    await actor(tx, userId, true);
    const p = await one<{ id: string }>(
      tx,
      sql`insert into advertisers(name,kind,consent_at,created_by) values(${data.name},${data.kind},now(),${userId}) returning id`,
    );
    await audit(tx, userId, 'assisted_profile_created', p.id, { consent: true });
    return p;
  });
}
export async function updateSettings(userId: string, input: unknown) {
  const data = settingsSchema
    .extend({
      expectedVersion: z.number().int().positive(),
      reason: z.string().trim().min(3).max(1000),
    })
    .parse(input);
  return db().transaction(async (tx) => {
    await actor(tx, userId, true);
    const rows = await query<{ version: number }>(
      tx,
      sql`update platform_settings set auto_publish=${data.autoPublish},posting_limits_enabled=${data.postingLimitsEnabled},max_active=${data.maxActive},daily_limit=${data.dailyLimit},duration_days=${data.durationDays},max_images=${data.maxImages},max_image_bytes=${data.maxImageBytes},version=version+1 where id=1 and version=${data.expectedVersion} returning version`,
    );
    ensure(rows[0], 409, 'STALE_SETTINGS', 'Settings changed; reload before saving');
    await audit(tx, userId, 'settings_updated', userId, { ...data });
    return rows[0];
  });
}
export async function setAdvertiserSuspension(userId: string, sellerId: string, input: unknown) {
  id.parse(sellerId);
  const data = z
    .object({ suspended: z.boolean(), reason: z.string().trim().min(3).max(1000) })
    .strict()
    .parse(input);
  return db().transaction(async (tx) => {
    await actor(tx, userId, true);
    const p = await one<{ id: string }>(
      tx,
      sql`update advertisers set suspended=${data.suspended} where id=${sellerId} returning id`,
    );
    await audit(tx, userId, 'advertiser_suspension_changed', p.id, data);
    return { ...p, suspended: data.suspended };
  });
}
export async function adminRead(
  userId: string,
  resource: 'submissions' | 'reports' | 'settings' | 'advertisers' | 'audit',
  offset = 0,
  reportStatus = 'open',
  search = '',
) {
  return db().transaction(async (tx) => {
    await actor(tx, userId, true);
    z.enum(['open', 'resolved', 'dismissed']).parse(reportStatus);
    if (resource === 'settings') return one(tx, sql`select * from platform_settings where id=1`);
    if (resource === 'reports')
      return query(
        tx,
        sql`select * from reports where status=${reportStatus} order by created_at,id limit 50 offset ${offset}`,
      );
    if (resource === 'advertisers')
      return query(
        tx,
        sql`select * from advertisers where (${search}='' or strpos(lower(name),lower(${search}))>0) order by created_at,id limit 50 offset ${offset}`,
      );
    if (resource === 'audit')
      return query(
        tx,
        sql`select * from audit_events order by created_at desc,id limit 50 offset ${offset}`,
      );
    // Cross-advertiser matching flags are advisory, never an automatic rejection.
    return query(
      tx,
      sql`select r.*,a.advertiser_id,p.name as advertiser_name,
   exists(select 1 from advert_revisions x join adverts other on other.id=x.advert_id where x.advert_id<>r.advert_id and other.advertiser_id<>a.advertiser_id and x.fingerprint=r.fingerprint and (x.status='pending' or x.id=other.approved_revision_id)) as possible_duplicate
   from advert_revisions r join adverts a on a.id=r.advert_id join advertisers p on p.id=a.advertiser_id where r.status='pending' order by r.submitted_at,r.id limit 50 offset ${offset}`,
    );
  });
}
export async function resolveReport(userId: string, reportId: string, input: unknown) {
  id.parse(reportId);
  const data = z
    .object({
      status: z.enum(['resolved', 'dismissed']),
      resolution: z.string().trim().min(3).max(1000),
    })
    .strict()
    .parse(input);
  return db().transaction(async (tx) => {
    await actor(tx, userId, true);
    const row = await one(
      tx,
      sql`update reports set status=${data.status},resolution=${data.resolution} where id=${reportId} and status='open' returning id,status`,
    );
    await audit(tx, userId, 'report_resolved', reportId, data);
    return row;
  });
}
export async function categoryMutation(userId: string, input: unknown) {
  const data = z
    .object({
      id: id.optional(),
      name: z.string().trim().min(2).max(60),
      slug: z.string().regex(/^[a-z0-9-]{2,60}$/),
      active: z.boolean(),
    })
    .strict()
    .parse(input);
  return db().transaction(async (tx) => {
    await actor(tx, userId, true);
    const row = data.id
      ? await one<{ id: string }>(
          tx,
          sql`update categories set name=${data.name},active=${data.active} where id=${data.id} and slug=${data.slug} returning id`,
        )
      : await one<{ id: string }>(
          tx,
          sql`insert into categories(name,slug,active) values(${data.name},${data.slug},${data.active}) returning id`,
        );
    await audit(tx, userId, 'category_saved', row.id, data);
    return row;
  });
}
export async function featureAdvert(userId: string, advertId: string, input: unknown) {
  id.parse(advertId);
  const data = z
    .object({
      position: z.number().int().min(0).max(100),
      startsAt: z.iso.datetime(),
      endsAt: z.iso.datetime(),
    })
    .strict()
    .refine((v) => v.endsAt > v.startsAt, 'End must follow start')
    .parse(input);
  return db().transaction(async (tx) => {
    await actor(tx, userId, true);
    await one(tx, sql`select id from adverts where id=${advertId}`);
    await tx.execute(
      sql`insert into featured_adverts(advert_id,position,starts_at,ends_at) values(${advertId},${data.position},${data.startsAt}::timestamptz,${data.endsAt}::timestamptz) on conflict(advert_id) do update set position=excluded.position,starts_at=excluded.starts_at,ends_at=excluded.ends_at`,
    );
    await audit(tx, userId, 'advert_featured', advertId, data);
    return { advertId };
  });
}

export async function claimAdvertiser(userId: string, sellerId: string, input: unknown) {
  id.parse(sellerId);
  const data = z
    .object({
      userId: id,
      contactVerified: z.literal(true),
      consent: z.literal(true),
      evidenceReference: z.string().trim().min(5).max(200),
      replaceUnusedPersonal: z.boolean().optional().default(false),
    })
    .strict()
    .parse(input);
  return db().transaction(async (tx) => {
    await actor(tx, userId, true);
    const user = await one<{ suspended: boolean; email_verified: unknown }>(
      tx,
      sql`select suspended,email_verified from users where id=${data.userId} for update`,
    );
    ensure(
      !user.suspended && user.email_verified,
      422,
      'UNVERIFIED_CLAIMANT',
      'Claimant needs a verified active account',
    );
    const source = await one<{ id: string; user_id: string | null; kind: string }>(
      tx,
      sql`select id,user_id,kind from advertisers where id=${sellerId} and closed_at is null for update`,
    );
    if (source.user_id === data.userId) return { id: source.id };
    ensure(!source.user_id, 409, 'ALREADY_CLAIMED', 'This advertiser already has an owner');
    const existing = await query<{ id: string; replaceable: boolean }>(
      tx,
      sql`select p.id,(${unusedPersonal}) as replaceable from advertisers p where p.user_id=${data.userId} and p.kind=${source.kind} and p.closed_at is null for update`,
    );
    const placeholder = existing[0];
    if (placeholder?.replaceable && data.replaceUnusedPersonal) {
      await tx.execute(sql`update advertisers set closed_at=now() where id=${placeholder.id}`);
    }
    ensure(
      !placeholder || (placeholder.replaceable && data.replaceUnusedPersonal),
      409,
      'PROFILE_EXISTS',
      'Claimant already has this identity type; profiles cannot be merged automatically',
    );
    const claimed = await one<{ id: string }>(
      tx,
      sql`update advertisers set user_id=${data.userId} where id=${sellerId} and user_id is null returning id`,
    );
    if (source.kind === 'business') await ensurePersonal(tx, data.userId);
    await audit(tx, userId, 'assisted_profile_claimed', sellerId, {
      claimantId: data.userId,
      supersededPlaceholderId: placeholder?.id ?? null,
      evidenceReference: data.evidenceReference,
      contactVerified: true,
      consent: true,
    });
    return claimed;
  });
}

export async function findClaimants(userId: string, sellerId: string, input: unknown) {
  id.parse(sellerId);
  const search = z.string().trim().min(2).max(100).parse(input);
  return db().transaction(async (tx) => {
    await actor(tx, userId, true);
    const source = await one<{ kind: string }>(
      tx,
      sql`select kind from advertisers where id=${sellerId} and closed_at is null`,
    );
    return query(
      tx,
      sql`select u.id,u.name,u.email,exists(select 1 from advertisers p where p.user_id=u.id and p.kind=${source.kind} and p.closed_at is null and not (${unusedPersonal})) as conflict,exists(select 1 from advertisers p where p.user_id=u.id and p.kind=${source.kind} and p.closed_at is null and (${unusedPersonal})) as replaceable from users u where not u.suspended and u.email_verified is not null and strpos(lower(coalesce(u.name,'')||' '||coalesce(u.email,'')),lower(${search}))>0 order by u.name,u.id limit 20`,
    );
  });
}
