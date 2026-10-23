import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, type Executor } from './db';
import { actor, advertiser, audit, one, query } from './store';
import { id, phone, socialUrl } from './validation';
import { ensure } from './errors';
import { effectiveContent } from './profile-visibility';
import type { ProfileDefaults, ManagedProfile } from '../lib/seller-profile';
export const visibilitySchema = z
  .object({
    phone: z.boolean().optional(),
    whatsapp: z.boolean().optional(),
    tiktok: z.boolean().optional(),
    snapchat: z.boolean().optional(),
    instagram: z.boolean().optional(),
    x: z.boolean().optional(),
    photo: z.boolean().optional(),
  })
  .strict();
export const socialsSchema = z
  .object({
    tiktok: socialUrl('tiktok').optional(),
    snapchat: socialUrl('snapchat').optional(),
    instagram: socialUrl('instagram').optional(),
    x: socialUrl('x').optional(),
  })
  .strict();
export const defaultsSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    phone: phone.optional(),
    whatsapp: phone.optional(),
    location: z.string().trim().min(2).max(120).optional(),
    bio: z.string().trim().max(500).optional(),
    photoMediaId: id.optional(),
    socials: socialsSchema.optional(),
    visibility: visibilitySchema.optional(),
    contactConsent: z.boolean().optional(),
    defaultsEnabled: z.boolean().optional(),
  })
  .strict();
export function requireCompleteDefaults(value: ProfileDefaults) {
  ensure(
    value && value.name && value.phone && value.whatsapp && value.location && value.contactConsent,
    422,
    'PROFILE_INCOMPLETE',
    'Save a display name, WhatsApp, phone and location with contact consent in the selected profile',
  );
}
export async function checkProfileImage(tx: Executor, sellerId: string, mediaId?: string) {
  if (!mediaId) return;
  const m = await one<{ advertiser_id: string; state: string }>(
    tx,
    sql`select advertiser_id,state from media_assets where id=${mediaId} for share`,
  );
  ensure(
    m.advertiser_id === sellerId && m.state === 'ready',
    422,
    'INVALID_MEDIA',
    'Choose a completed image belonging to this profile',
  );
}
export async function applyPrivacy(
  tx: Executor,
  sellerId: string,
  visibility: ProfileDefaults['visibility'],
) {
  const hidden = Object.fromEntries(
    Object.entries(visibility ?? {}).filter(([, v]) => v === false),
  );
  if (!Object.keys(hidden).length) return;
  await tx.execute(
    sql`update advertisers set privacy=privacy||${JSON.stringify(hidden)}::jsonb where id=${sellerId}`,
  );
  await tx.execute(
    sql`update adverts a set privacy_hidden=true from advert_revisions r,advertisers p where a.approved_revision_id=r.id and a.advertiser_id=p.id and p.id=${sellerId} and a.state='published' and nullif(${effectiveContent}->>'phone','') is null and nullif(${effectiveContent}->>'whatsapp','') is null`,
  );
}
export async function personalProfile(userId: string, sellerId?: string): Promise<ManagedProfile> {
  return db().transaction(async (tx) => {
    const user = await actor(tx, userId, !!sellerId);
    const p = await one<{
      id: string;
      kind: string;
      name: string;
      defaults_version: number;
      approved_defaults_version: number;
      draft_defaults: ProfileDefaults | null;
      approved_defaults: ProfileDefaults | null;
      profile_state: string;
      profile_reason: string | null;
      suspended: boolean;
      deactivated_at: Date | null;
      reactivation_pending: boolean;
    }>(
      tx,
      sellerId
        ? sql`select * from advertisers where id=${id.parse(sellerId)} and closed_at is null`
        : sql`select * from advertisers where user_id=${userId} and kind='student' and closed_at is null`,
    );
    ensure(
      user.role === 'admin' || (await advertiser(tx, user, p.id)),
      403,
      'FORBIDDEN',
      'Profile ownership required',
    );
    ensure(p.kind === 'student', 422, 'PERSONAL_REQUIRED', 'Choose a personal profile');
    const counts = await one<{ linked: number; overrides: number }>(
      tx,
      sql`select count(*) filter(where jsonb_array_length(coalesce(r.data->'contactSources','[]'::jsonb))>0)::int as linked,count(*) filter(where coalesce(jsonb_array_length(r.data->'contactSources'),0)<8)::int as overrides from adverts a join advert_revisions r on r.id=a.approved_revision_id where a.advertiser_id=${p.id} and a.state='published' and a.expires_at>now()`,
    );
    return {
      id: p.id,
      kind: p.kind,
      name: p.name,
      version: p.defaults_version,
      approvedVersion: p.approved_defaults_version,
      draft: p.draft_defaults,
      approved: p.approved_defaults,
      state: p.profile_state,
      reason: p.profile_reason,
      suspended: p.suspended,
      deactivated: !!p.deactivated_at,
      reactivationPending: p.reactivation_pending,
      linkedCount: counts.linked,
      overrideCount: counts.overrides,
    };
  });
}
export async function savePersonalProfile(userId: string, input: unknown, sellerId?: string) {
  const data = z
    .object({
      profile: defaultsSchema,
      version: z.number().int().min(0),
      submit: z.boolean().default(true),
    })
    .strict()
    .parse(input);
  return db().transaction(async (tx) => {
    const user = await actor(tx, userId, !!sellerId);
    const own =
      sellerId ??
      (
        await one<{ id: string }>(
          tx,
          sql`select id from advertisers where user_id=${userId} and kind='student' and closed_at is null`,
        )
      ).id;
    const p = await advertiser(tx, user, own);
    ensure(p.kind === 'student', 422, 'PERSONAL_REQUIRED', 'Choose a personal profile');
    const old = await one<{ defaults_version: number; draft_defaults: ProfileDefaults | null }>(
      tx,
      sql`select defaults_version,draft_defaults from advertisers where id=${own}`,
    );
    ensure(
      old.defaults_version === data.version,
      409,
      'PROFILE_CHANGED',
      'This profile changed. Reload it before saving',
    );
    if (data.submit) requireCompleteDefaults(data.profile);
    await checkProfileImage(tx, own, data.profile.photoMediaId);
    await applyPrivacy(tx, own, data.profile.visibility);
    const saved = await one<{ version: number }>(
      tx,
      sql`update advertisers set draft_defaults=${JSON.stringify(data.profile)}::jsonb,defaults_version=defaults_version+1,profile_state=${data.submit ? 'pending' : 'incomplete'},profile_reason=null,automatic_personal=false where id=${own} returning defaults_version as version`,
    );
    await audit(
      tx,
      userId,
      data.submit ? 'personal_profile_submitted' : 'personal_profile_draft_saved',
      own,
      { version: saved.version, previous: old.draft_defaults, submitted: data.profile },
    );
    return saved;
  });
}
export async function personalProfileQueue(userId: string) {
  return db().transaction(async (tx) => {
    await actor(tx, userId, true);
    return query(
      tx,
      sql`select p.id,p.name,p.defaults_version as version,p.draft_defaults as pending,p.approved_defaults as approved,(select count(*)::int from adverts a join advert_revisions r on r.id=a.approved_revision_id where a.advertiser_id=p.id and r.data->'contactSources' is not null and a.state='published') as linked_count from advertisers p where p.kind='student' and p.profile_state='pending' and p.closed_at is null order by p.created_at,p.id limit 50`,
    );
  });
}
export async function moderatePersonalProfile(userId: string, sellerId: string, input: unknown) {
  id.parse(sellerId);
  const data = z
    .object({
      decision: z.enum(['approve', 'reject']),
      version: z.number().int().min(0),
      reason: z.string().trim().min(3).max(1000),
    })
    .strict()
    .parse(input);
  return db().transaction(async (tx) => {
    await actor(tx, userId, true);
    const p = await one<{
      draft_defaults: ProfileDefaults;
      defaults_version: number;
      profile_state: string;
    }>(
      tx,
      sql`select * from advertisers where id=${sellerId} and kind='student' and closed_at is null for update`,
    );
    ensure(
      p.profile_state === 'pending' && p.defaults_version === data.version,
      409,
      'PROFILE_CHANGED',
      'Profile changed or was already reviewed; reload the review',
    );
    if (data.decision === 'approve') {
      requireCompleteDefaults(p.draft_defaults);
      await checkProfileImage(tx, sellerId, p.draft_defaults.photoMediaId);
      await tx.execute(
        sql`update advertisers set approved_defaults=draft_defaults,approved_defaults_version=defaults_version,name=${p.draft_defaults.name!},privacy=${JSON.stringify(p.draft_defaults.visibility ?? {})}::jsonb,profile_state='approved',profile_reason=${data.reason} where id=${sellerId}`,
      );
    } else
      await tx.execute(
        sql`update advertisers set profile_state='rejected',profile_reason=${data.reason} where id=${sellerId}`,
      );
    await audit(tx, userId, 'personal_profile_' + data.decision, sellerId, {
      version: data.version,
      reason: data.reason,
      profile: p.draft_defaults,
    });
    return { id: sellerId, decision: data.decision };
  });
}
export async function businessLifecycle(userId: string, input: unknown, sellerId?: string) {
  const data = z
    .object({
      action: z.enum(['deactivate', 'reactivate', 'close']),
      confirm: z.literal(true),
      name: z.string().max(100).optional(),
    })
    .strict()
    .parse(input);
  return db().transaction(async (tx) => {
    const user = await actor(tx, userId, !!sellerId);
    const own =
      sellerId ??
      (
        await one<{ id: string }>(
          tx,
          sql`select id from advertisers where user_id=${userId} and kind='business' and closed_at is null`,
        )
      ).id;
    const p = await advertiser(tx, user, own);
    ensure(p.kind === 'business', 422, 'BUSINESS_REQUIRED', 'Choose a business profile');
    if (data.action === 'deactivate')
      await tx.execute(
        sql`update advertisers set deactivated_at=coalesce(deactivated_at,now()),reactivation_pending=false where id=${own}`,
      );
    if (data.action === 'reactivate') {
      ensure(p.deactivated_at, 409, 'ALREADY_ACTIVE', 'Business is already active');
      await tx.execute(sql`update advertisers set reactivation_pending=true where id=${own}`);
    }
    if (data.action === 'close') {
      const n = await one<{ name: string }>(
        tx,
        sql`select coalesce(b.approved->>'name',p.name) as name from advertisers p left join business_profiles b on b.advertiser_id=p.id where p.id=${own}`,
      );
      ensure(
        data.name === n.name,
        422,
        'CONFIRM_NAME',
        'Enter the business name to confirm closure',
      );
      await tx.execute(
        sql`update advert_revisions set status='cancelled' where advert_id in(select id from adverts where advertiser_id=${own}) and status in('draft','pending')`,
      );
      await tx.execute(
        sql`update adverts set state='withdrawn' where advertiser_id=${own} and state in('draft','pending','published','rejected')`,
      );
      await tx.execute(
        sql`update advertisers set closed_at=now(),deactivated_at=coalesce(deactivated_at,now()),reactivation_pending=false where id=${own}`,
      );
    }
    await audit(tx, userId, 'business_' + data.action, own);
    return { id: own, action: data.action };
  });
}
export async function reviewReactivation(userId: string, sellerId: string, input: unknown) {
  id.parse(sellerId);
  const data = z
    .object({ decision: z.enum(['approve', 'reject']), reason: z.string().trim().min(3).max(1000) })
    .strict()
    .parse(input);
  return db().transaction(async (tx) => {
    await actor(tx, userId, true);
    const p = await one<{
      kind: string;
      suspended: boolean;
      reactivation_pending: boolean;
      closed_at: Date | null;
    }>(tx, sql`select * from advertisers where id=${sellerId} for update`);
    ensure(
      p.kind === 'business' && !p.suspended && !p.closed_at && p.reactivation_pending,
      409,
      'STATE_CONFLICT',
      'No eligible reactivation request',
    );
    if (data.decision === 'approve') {
      const b = await one<{ approved: unknown; state: string }>(
        tx,
        sql`select approved,state from business_profiles where advertiser_id=${sellerId}`,
      );
      ensure(
        b.approved && b.state !== 'suspended',
        409,
        'PROFILE_REVIEW_REQUIRED',
        'Approve the business profile before reactivation',
      );
      await tx.execute(
        sql`update advertisers set deactivated_at=null,reactivation_pending=false where id=${sellerId}`,
      );
    } else
      await tx.execute(sql`update advertisers set reactivation_pending=false where id=${sellerId}`);
    await audit(tx, userId, 'business_reactivation_' + data.decision, sellerId, {
      reason: data.reason,
    });
    return { id: sellerId, decision: data.decision };
  });
}
