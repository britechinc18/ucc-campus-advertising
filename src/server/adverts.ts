import { z } from 'zod';
import { profileComplete, type ProfileDefaults } from '../lib/seller-profile';
import { defaultsSchema, requireCompleteDefaults } from './profiles';
import { sql } from 'drizzle-orm';
import { db, type Executor } from './db';
import {
  actor,
  advertiser,
  audit,
  limits,
  one,
  query,
  type Actor,
  type Settings,
  ownerIdentities,
} from './store';
import { ensure } from './errors';
import {
  contentSchema,
  fingerprint,
  requestHash,
  profileSchema,
  id,
  type Content,
} from './validation';
interface Advert {
  id: string;
  advertiser_id: string;
  state: string;
  approved_revision_id: string | null;
  expires_at: Date | null;
}
interface Revision {
  id: string;
  advert_id: string;
  status: string;
  purpose: string;
  data: Content;
  fingerprint: string;
  quota_charged: boolean;
}
async function owned(tx: Executor, user: Actor, advertId: string) {
  const a = await one<Advert>(tx, sql`select * from adverts where id=${id.parse(advertId)}`);
  const owners = await query<{ user_id: string | null }>(
    tx,
    sql`select user_id from advertisers where id=${a.advertiser_id}`,
  );
  if (owners[0]?.user_id)
    await tx.execute(sql`select id from users where id=${owners[0].user_id} for update`);
  const seller = await advertiser(tx, user, a.advertiser_id);
  // All lifecycle mutations lock advertiser first, then advert.
  const fresh = await one<Advert>(tx, sql`select * from adverts where id=${a.id} for update`);
  return { a: fresh, seller };
}
async function validateContent(tx: Executor, sellerId: string, data: Content, settings: Settings) {
  if (data.contactSources) {
    const p = await one<{
      defaults_version: number;
      draft_defaults: unknown;
      approved_defaults: unknown;
      kind: string;
      closed_at: Date | null;
      deactivated_at: Date | null;
    }>(tx, sql`select * from advertisers where id=${sellerId}`);
    ensure(
      !p.closed_at && !p.deactivated_at,
      409,
      'PROFILE_INACTIVE',
      'Reactivate the selected profile before posting',
    );
    ensure(
      data.profileVersion === p.defaults_version,
      409,
      'PROFILE_CHANGED',
      'Your profile changed. Reload this advert to use the current profile details.',
    );
    const defaults =
      p.kind === 'business'
        ? (
            await one<{ latest: unknown }>(
              tx,
              sql`select case when pending->>'phone' is not null and pending->>'whatsapp' is not null then pending else coalesce(approved,pending) end as latest from business_profiles where advertiser_id=${sellerId}`,
            )
          ).latest
        : profileComplete(p.draft_defaults as Parameters<typeof profileComplete>[0])
          ? p.draft_defaults
          : p.approved_defaults;
    requireCompleteDefaults(defaults as Parameters<typeof requireCompleteDefaults>[0]);
  }
  const c = await one<{ active: boolean }>(
    tx,
    sql`select active from categories where id=${data.categoryId} for share`,
  );
  ensure(c.active, 422, 'CATEGORY_INACTIVE', 'Choose an active category');
  ensure(data.mediaIds.length <= settings.max_images, 422, 'IMAGE_LIMIT', 'Too many images');
  for (const mediaId of [...data.mediaIds].sort()) {
    const m = await one<{ advertiser_id: string; state: string; bytes: number }>(
      tx,
      sql`select * from media_assets where id=${mediaId} for share`,
    );
    ensure(
      m.advertiser_id === sellerId && m.state === 'ready' && m.bytes <= settings.max_image_bytes,
      422,
      'INVALID_MEDIA',
      'Image is unavailable or does not belong to this advertiser',
    );
  }
}
async function writeRevision(
  tx: Executor,
  a: Advert,
  data: Content,
  purpose: string,
  charged = false,
) {
  {
    const identity = await one<{ name: string }>(
      tx,
      sql`select coalesce(b.approved->>'name',p.name) as name from advertisers p left join business_profiles b on b.advertiser_id=p.id where p.id=${a.advertiser_id}`,
    );
    data = { ...data, displayName: identity.name };
  }
  const r = await one<Revision>(
    tx,
    sql`insert into advert_revisions(advert_id,category_id,data,fingerprint,purpose,quota_charged) values(${a.id},${data.categoryId},${JSON.stringify(data)}::jsonb,${fingerprint(data)},${purpose},${charged}) returning *`,
  );
  for (const [position, mediaId] of data.mediaIds.entries())
    await tx.execute(
      sql`insert into revision_media(revision_id,media_id,position) values(${r.id},${mediaId},${position})`,
    );
  return r;
}
export async function createProfile(userId: string, input: unknown) {
  const data = profileSchema
    .extend({
      setup: defaultsSchema
        .pick({
          name: true,
          phone: true,
          whatsapp: true,
          location: true,
          bio: true,
          contactConsent: true,
        })
        .optional(),
      setupVersion: z.number().int().min(0).optional(),
    })
    .parse(input);
  if (data.setup) requireCompleteDefaults({ ...data.setup, name: data.name });
  return db().transaction(async (tx) => {
    await actor(tx, userId);
    await tx.execute(sql`select id from users where id=${userId} for update`);
    if (data.kind === 'business') await ensurePersonal(tx, userId);
    const existing = await query<{ id: string }>(
      tx,
      sql`select id from advertisers where user_id=${userId} and kind=${data.kind} and closed_at is null`,
    );
    if (existing.length && !data.setup)
      return one<{ id: string; name: string; kind: string }>(
        tx,
        sql`select id,name,kind from advertisers where user_id=${userId} and kind=${data.kind} and closed_at is null`,
      );
    const identity =
      existing[0] ??
      (await one<{ id: string }>(
        tx,
        sql`insert into advertisers(user_id,name,kind,consent_at,created_by,automatic_personal) values(${userId},${data.name},${data.kind},now(),${userId},${data.kind === 'student'}) returning id`,
      ));
    if (data.setup) {
      const current = await one<{
        profile_state: string;
        defaults_version: number;
        draft_defaults: (ProfileDefaults & { slug?: string; description?: string }) | null;
        suspended: boolean;
        deactivated_at: Date | null;
      }>(tx, sql`select * from advertisers where id=${identity.id} for update`);
      ensure(
        current.profile_state === 'incomplete' && !current.suspended && !current.deactivated_at,
        409,
        'PROFILE_CHANGED',
        'This profile is already set up or unavailable. Open My Profile to make changes.',
      );
      ensure(
        !existing.length || current.defaults_version === data.setupVersion,
        409,
        'PROFILE_CHANGED',
        'This profile changed. Reload before continuing.',
      );
      const saved = {
        ...current.draft_defaults,
        ...data.setup,
        name: data.name,
        defaultsEnabled: true,
        visibility: { ...current.draft_defaults?.visibility, phone: true, whatsapp: true },
        ...(data.kind === 'business'
          ? {
              description: data.setup.bio ?? '',
              slug: current.draft_defaults?.slug ?? `business-${identity.id}`,
            }
          : {}),
      };
      await tx.execute(
        sql`update advertisers set name=${data.name},privacy=${JSON.stringify(saved.visibility)}::jsonb,draft_defaults=${JSON.stringify(saved)}::jsonb,approved_defaults=${JSON.stringify(saved)}::jsonb,defaults_version=defaults_version+1,approved_defaults_version=defaults_version+1,profile_state='approved',automatic_personal=false where id=${identity.id}`,
      );
      if (data.kind === 'business')
        await tx.execute(
          sql`insert into business_profiles(advertiser_id,slug,approved,state) values(${identity.id},${'slug' in saved ? (saved.slug as string) : `business-${identity.id}`},${JSON.stringify(saved)}::jsonb,'approved')`,
        );
      await audit(tx, userId, 'seller_setup_completed', identity.id);
    }
    return { id: identity.id, name: data.name, kind: data.kind };
  });
}
export async function createAdvert(userId: string, input: unknown, sellerId?: string) {
  const data = contentSchema.parse(input);
  return db().transaction(async (tx) => {
    const user = await actor(tx, userId);
    const seller = await advertiser(tx, user, sellerId);
    const settings = await limits(tx);
    await validateContent(tx, seller.id, data, settings);
    const a = await one<Advert>(
      tx,
      sql`insert into adverts(advertiser_id,created_by) values(${seller.id},${userId}) returning *`,
    );
    const r = await writeRevision(tx, a, data, 'new');
    await audit(tx, userId, sellerId ? 'assisted_draft_created' : 'draft_created', a.id);
    return { advertId: a.id, revisionId: r.id, state: 'draft' };
  });
}
export async function saveAdvert(userId: string, advertId: string, input: unknown, renew = false) {
  const data = contentSchema.parse(input);
  return db().transaction(async (tx) => {
    const user = await actor(tx, userId);
    const { a, seller } = await owned(tx, user, advertId);
    const settings = await limits(tx);
    ensure(a.state !== 'suspended', 409, 'STATE_CONFLICT', 'Suspended advert cannot be edited');
    const open = await query<Revision>(
      tx,
      sql`select * from advert_revisions where advert_id=${a.id} and status in ('draft','pending') for update`,
    );
    ensure(
      open[0]?.status !== 'pending',
      409,
      'PENDING_REVIEW',
      'Withdraw or wait for review before editing',
    );
    const live = await one<{ live: boolean }>(
      tx,
      sql`select ${a.state}='published' and ${a.expires_at}::timestamptz>clock_timestamp() as live`,
    );
    if (renew)
      ensure(
        a.approved_revision_id && !live.live,
        409,
        'STATE_CONFLICT',
        'Only inactive adverts can be renewed',
      );
    else
      ensure(
        !a.approved_revision_id || live.live,
        409,
        'RENEW_REQUIRED',
        'Renew inactive adverts instead of editing',
      );
    await validateContent(tx, seller.id, data, settings);
    let purpose = renew ? 'renew' : a.approved_revision_id ? 'edit' : 'new';
    let charged = false;
    if (open[0]) {
      purpose = open[0].purpose;
      charged = open[0].quota_charged;
      await tx.execute(sql`update advert_revisions set status='cancelled' where id=${open[0].id}`);
    } else {
      const last = await query<Revision>(
        tx,
        sql`select * from advert_revisions where advert_id=${a.id} order by created_at desc,id desc limit 1`,
      );
      // A rejected correction reuses its daily charge; an approved/withdrawn cycle does not.
      charged =
        last[0]?.status === 'rejected' && last[0].purpose === purpose && last[0].quota_charged;
    }
    const r = await writeRevision(tx, a, data, purpose, charged);
    return { advertId: a.id, revisionId: r.id, state: 'draft' };
  });
}
async function activeCount(tx: Executor, sellerId: string) {
  return (
    await one<{ count: number }>(
      tx,
      sql`select count(*)::int as count from adverts a where advertiser_id in (${ownerIdentities(sellerId)}) and ((a.state='published' and a.expires_at>now()) or exists(select 1 from advert_revisions r where r.advert_id=a.id and r.status='pending' and r.purpose in ('new','renew')))`,
    )
  ).count;
}
export async function submitAdvert(
  userId: string,
  advertId: string,
  revisionId: string,
  key: string,
) {
  id.parse(revisionId);
  id.parse(key);
  return db().transaction(async (tx) => {
    const user = await actor(tx, userId);
    const { a, seller } = await owned(tx, user, advertId);
    const settings = await limits(tx);
    const hash = requestHash([a.id, revisionId]);
    const old = await query<{ request_hash: string; response: unknown }>(
      tx,
      sql`select * from idempotency_keys where advertiser_id=${seller.id} and key=${key}`,
    );
    if (old[0]) {
      ensure(
        old[0].request_hash === hash,
        409,
        'IDEMPOTENCY_CONFLICT',
        'Key already used for another submission',
      );
      return old[0].response;
    }
    ensure(
      !seller.deactivated_at,
      409,
      'PROFILE_INACTIVE',
      'Reactivate this business before submitting adverts',
    );
    ensure(a.state !== 'suspended', 409, 'STATE_CONFLICT', 'Suspended advert cannot be submitted');
    const r = await one<Revision>(
      tx,
      sql`select * from advert_revisions where id=${revisionId} and advert_id=${a.id} for update`,
    );
    ensure(r.status === 'draft', 409, 'STATE_CONFLICT', 'Only drafts can be submitted');
    await validateContent(tx, seller.id, contentSchema.parse(r.data), settings);
    if (r.purpose === 'edit') {
      const live = await one<{ live: boolean }>(
        tx,
        sql`select ${a.state}='published' and ${a.expires_at}::timestamptz>clock_timestamp() as live`,
      );
      ensure(live.live, 409, 'EXPIRED', 'Inactive advert must be renewed');
    } else if (settings.posting_limits_enabled && user.role !== 'admin')
      ensure(
        (await activeCount(tx, seller.id)) < settings.max_active,
        409,
        'ACTIVE_LIMIT',
        'Maximum active or pending adverts reached',
      );
    const duplicates = await query(
      tx,
      sql`select r.id from advert_revisions r join adverts other on other.id=r.advert_id where other.advertiser_id in (${ownerIdentities(seller.id)}) and other.id<>${a.id} and (r.status='pending' or (r.id=other.approved_revision_id and other.state='published' and other.expires_at>now())) and (r.fingerprint=${r.fingerprint} or exists(select 1 from revision_media x join media_assets xm on xm.id=x.media_id join revision_media y on y.revision_id=${r.id} join media_assets ym on ym.id=y.media_id where x.revision_id=r.id and xm.checksum=ym.checksum)) limit 1`,
    );
    ensure(
      !settings.posting_limits_enabled || !duplicates.length,
      409,
      'DUPLICATE',
      'A matching advert or image is already pending or published',
    );
    if (
      settings.posting_limits_enabled &&
      user.role !== 'admin' &&
      r.purpose !== 'edit' &&
      !r.quota_charged
    ) {
      const day = await one<{ day: string }>(
        tx,
        sql`select to_char(clock_timestamp() at time zone 'Africa/Accra','YYYY-MM-DD') as day`,
      );
      await tx.execute(
        sql`insert into advertiser_daily_usage(advertiser_id,day,count) values(${seller.id},${day.day},0) on conflict do nothing`,
      );
      const usage = await one<{ count: number }>(
        tx,
        sql`select coalesce(sum(count),0)::int as count from advertiser_daily_usage where advertiser_id in (${ownerIdentities(seller.id)}) and day=${day.day}`,
      );
      ensure(
        usage.count < settings.daily_limit,
        409,
        'DAILY_LIMIT',
        'Daily submission limit reached',
      );
      await tx.execute(
        sql`update advertiser_daily_usage set count=count+1 where advertiser_id=${seller.id} and day=${day.day}`,
      );
    }
    const status = settings.auto_publish ? 'published' : 'pending';
    if (settings.auto_publish) {
      const contact = await one<{ visible: boolean }>(
        tx,
        sql`select (nullif(medstash_effective_content(${JSON.stringify(r.data)}::jsonb,case when p.kind='business' then b.approved else p.approved_defaults end,p.approved_defaults_version,p.privacy)->>'phone','') is not null or nullif(medstash_effective_content(${JSON.stringify(r.data)}::jsonb,case when p.kind='business' then b.approved else p.approved_defaults end,p.approved_defaults_version,p.privacy)->>'whatsapp','') is not null) as visible from advertisers p left join business_profiles b on b.advertiser_id=p.id where p.id=${seller.id}`,
      );
      ensure(
        contact.visible,
        409,
        'CONTACT_HIDDEN',
        'Add a visible phone or WhatsApp number before publishing.',
      );
      await tx.execute(
        sql`update advert_revisions set status='approved',submitted_at=now(),reviewed_at=now() where id=${r.id}`,
      );
      await tx.execute(
        sql`update adverts set approved_revision_id=${r.id},privacy_hidden=false,state='published',published_at=case when ${r.purpose}='edit' then published_at else now() end,expires_at=case when ${r.purpose}='edit' then expires_at else now()+${settings.duration_days}*interval '1 day' end where id=${a.id}`,
      );
    } else {
      await tx.execute(
        sql`update advert_revisions set status='pending',submitted_at=now(),quota_charged=${settings.posting_limits_enabled && (user.role !== 'admin' || r.quota_charged)} where id=${r.id}`,
      );
      if (r.purpose !== 'edit')
        await tx.execute(sql`update adverts set state='pending' where id=${a.id}`);
    }
    await audit(tx, userId, settings.auto_publish ? 'advert_published' : 'advert_submitted', a.id, {
      revisionId: r.id,
      purpose: r.purpose,
      postingLimitExempt: user.role === 'admin' || !settings.posting_limits_enabled,
      automatic: settings.auto_publish,
    });
    const response = { advertId: a.id, revisionId: r.id, status };
    await tx.execute(
      sql`insert into idempotency_keys(advertiser_id,key,request_hash,response) values(${seller.id},${key},${hash},${JSON.stringify(response)}::jsonb)`,
    );
    return response;
  });
}
export async function moderate(
  userId: string,
  revisionId: string,
  decision: 'approve' | 'reject',
  reason: string,
  profileVersion?: number,
) {
  id.parse(revisionId);
  ensure(
    reason.trim().length >= 3 && reason.length <= 1000,
    422,
    'REASON_REQUIRED',
    'Provide a moderation reason',
  );
  return db().transaction(async (tx) => {
    const user = await actor(tx, userId, true);
    const lookup = await one<Revision>(
      tx,
      sql`select * from advert_revisions where id=${revisionId}`,
    );
    const { a, seller } = await owned(tx, user, lookup.advert_id);
    const settings = await limits(tx);
    const r = await one<Revision>(
      tx,
      sql`select * from advert_revisions where id=${revisionId} for update`,
    );
    ensure(r.status === 'pending', 409, 'STATE_CONFLICT', 'Submission is no longer pending');
    if (r.data.contactSources) {
      const current = await one<{ defaults_version: number }>(
        tx,
        sql`select defaults_version from advertisers where id=${seller.id}`,
      );
      ensure(
        profileVersion === current.defaults_version,
        409,
        'PROFILE_CHANGED',
        'The profile changed; reload the advert review',
      );
    }
    if (decision === 'approve') {
      const visibility = await one<{ contact: boolean }>(
        tx,
        sql`select (nullif(medstash_effective_content(${JSON.stringify(r.data)}::jsonb,case when p.kind='business' then b.approved else p.approved_defaults end,p.approved_defaults_version,p.privacy)->>'phone','') is not null or nullif(medstash_effective_content(${JSON.stringify(r.data)}::jsonb,case when p.kind='business' then b.approved else p.approved_defaults end,p.approved_defaults_version,p.privacy)->>'whatsapp','') is not null) as contact from advertisers p left join business_profiles b on b.advertiser_id=p.id where p.id=${seller.id}`,
      );
      ensure(
        visibility.contact,
        409,
        'CONTACT_HIDDEN',
        'Approve a usable visible contact or request an advert-specific contact override',
      );
      ensure(
        !seller.deactivated_at,
        409,
        'PROFILE_INACTIVE',
        'Reactivate this business before publishing',
      );
      const linked = await query<{ suspended: boolean }>(
        tx,
        sql`select suspended from users where id=${seller.user_id}`,
      );
      ensure(!linked[0]?.suspended, 403, 'SUSPENDED', 'Advertiser account suspended');
      ensure(a.state !== 'suspended', 409, 'STATE_CONFLICT', 'Advert suspended');
      await validateContent(tx, seller.id, contentSchema.parse(r.data), settings);
      if (r.purpose === 'edit') {
        const live = await one<{ live: boolean }>(
          tx,
          sql`select ${a.state}='published' and ${a.expires_at}::timestamptz>clock_timestamp() as live`,
        );
        ensure(live.live, 409, 'EXPIRED', 'Edit cannot republish an inactive advert');
      } else {
        // Only a server-recorded admin submission is exempt; ordinary approvals retain limits.
        const exemption = await query(
          tx,
          sql`select id from audit_events where target_id=${a.id} and action='advert_submitted' and detail->>'revisionId'=${r.id} and detail->>'postingLimitExempt'='true' limit 1`,
        );
        if (settings.posting_limits_enabled && !exemption.length)
          ensure(
            (await activeCount(tx, seller.id)) <= settings.max_active,
            409,
            'ACTIVE_LIMIT',
            'Active reservations exceed current limit',
          );
      }
      await tx.execute(
        sql`update advert_revisions set status='approved',reviewed_at=now(),reason=${reason} where id=${r.id}`,
      );
      await tx.execute(
        sql`update adverts set approved_revision_id=${r.id},privacy_hidden=false,state='published',published_at=case when ${r.purpose}='edit' then published_at else now() end,expires_at=case when ${r.purpose}='edit' then expires_at else now()+${settings.duration_days}*interval '1 day' end where id=${a.id}`,
      );
    } else {
      await tx.execute(
        sql`update advert_revisions set status='rejected',reviewed_at=now(),reason=${reason} where id=${r.id}`,
      );
      if (r.purpose !== 'edit')
        await tx.execute(sql`update adverts set state='rejected' where id=${a.id}`);
    }
    await audit(tx, userId, `advert_${decision}`, a.id, { revisionId: r.id, reason });
    return { advertId: a.id, decision };
  });
}
export async function transition(
  userId: string,
  advertId: string,
  state: 'withdrawn' | 'fulfilled' | 'suspended',
  reason?: string,
) {
  return db().transaction(async (tx) => {
    const user = await actor(tx, userId, state === 'suspended');
    const { a } = await owned(tx, user, advertId);
    ensure(
      state === 'suspended' || a.state !== 'suspended',
      409,
      'STATE_CONFLICT',
      'Administrator action required',
    );
    if (state === 'suspended')
      ensure(
        reason && reason.length >= 3 && reason.length <= 1000,
        422,
        'REASON_REQUIRED',
        'Suspension requires a reason',
      );
    await tx.execute(
      sql`update advert_revisions set status='cancelled' where advert_id=${a.id} and status in ('pending','draft')`,
    );
    await tx.execute(sql`update adverts set state=${state} where id=${a.id}`);
    await audit(tx, userId, `advert_${state}`, a.id, { reason });
    return { advertId: a.id, state };
  });
}
export async function myAdverts(userId: string) {
  return db().transaction(async (tx) => {
    await actor(tx, userId);
    return query(
      tx,
      sql`select a.*,coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from advert_revisions r where r.advert_id=a.id),'[]'::jsonb) as revisions from adverts a join advertisers p on p.id=a.advertiser_id where p.user_id=${userId} order by a.created_at desc limit 100`,
    );
  });
}

export async function ensurePersonal(tx: Executor, userId: string) {
  await tx.execute(
    sql`insert into advertisers(user_id,name,kind,consent_at,created_by,automatic_personal) select u.id,coalesce(nullif(u.name,''),'Personal seller'),'student',now(),u.id,true from users u where u.id=${userId} and not exists(select 1 from advertisers p where p.user_id=u.id and p.kind='student' and p.closed_at is null) on conflict do nothing`,
  );
}
