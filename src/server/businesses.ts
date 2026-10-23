import { applyPrivacy, requireCompleteDefaults, socialsSchema, visibilitySchema } from './profiles';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from './db';
import { actor, advertiser, audit, one, query, limits } from './store';
import { ensure } from './errors';
import { id, phone } from './validation';
const profile = z
  .object({
    version: z.number().int().min(0).optional(),
    defaultsEnabled: z.boolean().optional(),
    categoryId: id.optional(),
    socials: socialsSchema.optional(),
    visibility: visibilitySchema.optional(),
    name: z.string().trim().min(2).max(100).optional(),
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
  data.visibility = { ...data.visibility, phone: true, whatsapp: true };
  return db().transaction(async (tx) => {
    const user = await actor(tx, userId, !!sellerId);
    const own = sellerId
      ? null
      : await query<{ id: string }>(
          tx,
          sql`select id from advertisers where user_id=${userId} and kind='business' and closed_at is null`,
        );
    const p = await advertiser(tx, user, sellerId ?? own?.[0]?.id);
    if (data.defaultsEnabled) requireCompleteDefaults(data);
    const version = await one<{ defaults_version: number }>(
      tx,
      sql`select defaults_version from advertisers where id=${p.id}`,
    );
    ensure(
      data.version === undefined || data.version === version.defaults_version,
      409,
      'PROFILE_CHANGED',
      'Business profile changed. Reload before saving',
    );
    if (data.categoryId)
      await one(tx, sql`select id from categories where id=${data.categoryId} and active`);
    await applyPrivacy(tx, p.id, data.visibility);
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
      sql`insert into business_profiles(advertiser_id,slug,approved,state) values(${p.id},${data.slug},${JSON.stringify(data)}::jsonb,'approved') on conflict(advertiser_id) do update set approved=excluded.approved,pending=null,state='approved',reason=null returning id`,
    );
    await tx.execute(
      sql`update advertisers set defaults_version=defaults_version+1,approved_defaults_version=defaults_version+1,privacy=${JSON.stringify(data.visibility)}::jsonb,name=coalesce(${data.name ?? null},name) where id=${p.id}`,
    );
    await audit(tx, userId, 'business_profile_saved', b.id, {
      version: version.defaults_version + 1,
      profile: data,
    });
    return b;
  });
}
export async function moderateBusiness(userId: string, businessId: string, input: unknown) {
  id.parse(businessId);
  const data = z
    .object({
      version: z.number().int().min(0).optional(),
      decision: z.enum(['approve', 'reject', 'suspend']),
      reason: z.string().trim().min(3).max(1000),
    })
    .strict()
    .parse(input);
  return db().transaction(async (tx) => {
    await actor(tx, userId, true);
    const lookup = await one<{ advertiser_id: string }>(
      tx,
      sql`select advertiser_id from business_profiles where id=${businessId}`,
    );
    // Match profile saving and lifecycle operations: lock the identity before the storefront.
    const owner = await one<{ defaults_version: number }>(
      tx,
      sql`select defaults_version from advertisers where id=${lookup.advertiser_id} and closed_at is null for update`,
    );
    const b = await one<{
      pending: { defaultsEnabled?: boolean; visibility?: Record<string, boolean> };
      advertiser_id: string;
    }>(tx, sql`select * from business_profiles where id=${businessId} for update`);
    ensure(
      data.decision === 'suspend' || b.pending,
      409,
      'STATE_CONFLICT',
      'No business revision pending',
    );
    ensure(
      !b.pending?.defaultsEnabled || data.version === owner.defaults_version,
      409,
      'PROFILE_CHANGED',
      'Reload the business review before deciding',
    );
    if (data.decision === 'approve' && b.pending?.defaultsEnabled)
      requireCompleteDefaults(b.pending);
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
    if (data.decision === 'approve')
      await tx.execute(
        sql`update advertisers set approved_defaults_version=defaults_version,privacy=${JSON.stringify(b.pending?.visibility ?? {})}::jsonb where id=${b.advertiser_id}`,
      );
    await audit(tx, userId, 'business_moderated', businessId, {
      ...data,
      version: owner.defaults_version,
      profile: b.pending,
    });
    return { id: businessId, decision: data.decision };
  });
}
export async function listBusinesses(slug?: string, search = '', offset = 0) {
  const rows = await query(
    db(),
    sql`select b.id,b.advertiser_id,b.slug,medstash_effective_content(b.approved || jsonb_build_object('contactSources',jsonb_build_array('phone','whatsapp','tiktok','snapchat','instagram','x'),'profileVersion',p.approved_defaults_version),b.approved,p.approved_defaults_version,p.privacy) - 'contactSources' - 'profileVersion' - (case when p.privacy->>'photo'='false' then 'logoMediaId' else '__no_field__' end) as approved,coalesce(b.approved->>'name',p.name) as name from business_profiles b join advertisers p on p.id=b.advertiser_id left join users u on u.id=p.user_id where b.approved is not null and b.state<>'suspended' and not p.suspended and p.closed_at is null and p.deactivated_at is null and (u.id is null or not u.suspended) ${slug ? sql`and b.slug=${slug}` : sql``} ${search ? sql`and (coalesce(b.approved->>'name',p.name) || ' ' || coalesce(b.approved->>'description','') || ' ' || coalesce(b.approved->>'location','')) ilike ${'%' + search.slice(0, 100).replace(/[\\%_]/g, '\\$&') + '%'}` : sql``} order by coalesce(b.approved->>'name',p.name),b.id limit 50 offset ${Math.max(0, Math.min(10000, offset))}`,
  );
  if (slug) ensure(rows[0], 404, 'NOT_FOUND', 'Business not found');
  return slug ? rows[0] : rows;
}
export async function businessQueue(userId: string) {
  return db().transaction(async (tx) => {
    await actor(tx, userId, true);
    return query(
      tx,
      sql`select b.*,p.defaults_version as version from business_profiles b join advertisers p on p.id=b.advertiser_id where b.pending is not null and p.closed_at is null order by b.id limit 50`,
    );
  });
}

export async function assistedBusinessContext(userId: string, sellerId: string) {
  id.parse(sellerId);
  return db().transaction(async (tx) => {
    const user = await actor(tx, userId, true);
    const p = await advertiser(tx, user, sellerId);
    ensure(p.kind === 'business', 422, 'BUSINESS_REQUIRED', 'Choose a business advertiser');
    const profile = await one<{ id: string; name: string; kind: string; suspended: boolean }>(
      tx,
      sql`select id,name,kind,suspended from advertisers where id=${sellerId}`,
    );
    const rows = await query(
      tx,
      sql`select b.*,p.defaults_version as version from business_profiles b join advertisers p on p.id=b.advertiser_id where advertiser_id=${sellerId}`,
    );
    return {
      business: rows[0] ?? null,
      account: {
        role: user.role,
        profile,
        profiles: [],
        settings: await limits(tx),
        activeCount: 0,
        dailyUsed: 0,
      },
    };
  });
}
