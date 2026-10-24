import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from './db';
import { actor, one, query, limits } from './store';
import { id } from './validation';
import { z } from 'zod';
import type { SellerIdentity } from '../lib/market';
import { ensure } from './errors';

// Additive, bounded reads for frontend screens. Every private read checks the actor.
export async function accountContext(userId: string, selectedId?: string) {
  return db().transaction(async (tx) => {
    const user = await actor(tx, userId);
    const profiles = await query<SellerIdentity>(
      tx,
      sql`select id,coalesce((select b.approved->>'name' from business_profiles b where b.advertiser_id=advertisers.id and b.approved is not null and b.state<>'suspended'),name) as name,kind,suspended,defaults_version as version,approved_defaults_version as "approvedVersion",reactivation_pending as "reactivationPending",deactivated_at is not null as deactivated,case when kind='business' then coalesce(draft_defaults,(select coalesce(b.pending,b.approved) from business_profiles b where b.advertiser_id=advertisers.id)) else coalesce(draft_defaults,approved_defaults) end as defaults,case when kind='business' then (select b.approved from business_profiles b where b.advertiser_id=advertisers.id) else approved_defaults end as "approvedDefaults" from advertisers where user_id=${userId} and closed_at is null order by created_at,id`,
    );
    if (selectedId) id.parse(selectedId);
    const profile = selectedId
      ? (profiles.find((p) => p.id === selectedId) ?? null)
      : (profiles[0] ?? null);
    ensure(
      !selectedId || profile,
      403,
      'FORBIDDEN',
      'Selected identity does not belong to this account',
    );
    const settings = await limits(tx);
    const usage = profiles.length
      ? await query<{ count: number }>(
          tx,
          sql`select coalesce(sum(count),0)::int as count from advertiser_daily_usage where advertiser_id in (select id from advertisers where user_id=${userId}) and day=to_char(now() at time zone 'Africa/Accra','YYYY-MM-DD')`,
        )
      : [];
    const active = profiles.length
      ? await one<{ count: number }>(
          tx,
          sql`select count(*)::int as count from adverts a where advertiser_id in (select id from advertisers where user_id=${userId}) and ((state='published' and expires_at>now()) or exists(select 1 from advert_revisions r where r.advert_id=a.id and r.status='pending' and r.purpose in ('new','renew')))`,
        )
      : { count: 0 };
    return {
      role: user.role,
      postingLimitExempt: user.role === 'admin',
      profile,
      profiles,
      settings,
      activeCount: active.count,
      dailyUsed: usage[0]?.count ?? 0,
    };
  });
}
export async function ownedAdverts(
  userId: string,
  offset = 0,
  advertId?: string,
  status?: string,
  identity?: string,
) {
  if (advertId) id.parse(advertId);
  if (identity) id.parse(identity);
  if (status)
    z.enum([
      'closed',
      'published',
      'pending',
      'draft',
      'rejected',
      'fulfilled',
      'expired',
      'withdrawn',
      'suspended',
    ]).parse(status);
  return db().transaction(async (tx) => {
    const user = await actor(tx, userId);
    const ownership =
      advertId && user.role === 'admin'
        ? sql`true`
        : sql`p.user_id=${userId} ${identity ? sql`and p.id=${identity}` : sql``}`;
    const rows = await query(
      tx,
      sql`select a.*,p.closed_at is not null as profile_closed,p.deactivated_at is not null as profile_deactivated,coalesce((select b.approved->>'name' from business_profiles b where b.advertiser_id=p.id and b.approved is not null and b.state<>'suspended'),p.name) as advertiser_name,coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id desc) from advert_revisions r where r.advert_id=a.id),'[]'::jsonb) as revisions from adverts a join advertisers p on p.id=a.advertiser_id where ${ownership} ${status === 'closed' ? sql`and (a.state in ('fulfilled','withdrawn','expired','suspended','rejected') or (a.state='published' and a.expires_at<=now()))` : status === 'pending' ? sql`and exists(select 1 from advert_revisions pr where pr.advert_id=a.id and pr.status='pending')` : status ? sql`and (case when a.state='published' and a.expires_at<=now() then 'expired' else a.state end)=${status}` : sql``} ${advertId ? sql`and a.id=${advertId}` : sql``} order by a.created_at desc,a.id desc limit 21 offset ${offset}`,
    );
    if (advertId)
      return one(
        tx,
        sql`select a.*,p.closed_at is not null as profile_closed,p.deactivated_at is not null as profile_deactivated,coalesce((select b.approved->>'name' from business_profiles b where b.advertiser_id=p.id and b.approved is not null and b.state<>'suspended'),p.name) as advertiser_name,coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id desc) from advert_revisions r where r.advert_id=a.id),'[]'::jsonb) as revisions from adverts a join advertisers p on p.id=a.advertiser_id where a.id=${advertId} and ${ownership}`,
      );
    const counts = await query<{ state: string; count: number }>(
      tx,
      sql`select case when a.state='published' and a.expires_at<=now() then 'expired' else a.state end as state,count(*)::int as count from adverts a join advertisers p on p.id=a.advertiser_id where p.user_id=${userId} ${identity ? sql`and p.id=${identity}` : sql``} group by 1`,
    );
    const pending = await one<{ count: number }>(
      tx,
      sql`select count(*)::int as count from advert_revisions r join adverts a on a.id=r.advert_id join advertisers p on p.id=a.advertiser_id where p.user_id=${userId} ${identity ? sql`and p.id=${identity}` : sql``} and r.status='pending'`,
    );
    return {
      items: rows.slice(0, 20),
      nextOffset: rows.length > 20 ? offset + 20 : null,
      counts,
      pendingCount: pending.count,
    };
  });
}
export async function ownBusiness(userId: string) {
  return db().transaction(async (tx) => {
    await actor(tx, userId);
    const rows = await query(
      tx,
      sql`select b.*,p.defaults_version as version from business_profiles b join advertisers p on p.id=b.advertiser_id where p.user_id=${userId} and p.closed_at is null`,
    );
    return rows[0] ?? null;
  });
}
export async function adminView(
  userId: string,
  resource: string,
  offset = 0,
  target?: string,
  search = '',
) {
  if (target) id.parse(target);
  return db().transaction(async (tx) => {
    await actor(tx, userId, true);
    if (resource === 'overview') {
      const counts = await one(
        tx,
        sql`select (select count(*)::int from adverts a join advertisers p on p.id=a.advertiser_id left join users u on u.id=p.user_id where a.state='published' and a.expires_at>now() and not p.suspended and (u.id is null or not u.suspended)) as live,(select count(*)::int from advert_revisions where status='pending') as pending,(select count(*)::int from reports where status='open') as reports,(select count(*)::int from advertisers where created_at>=date_trunc('week',now() at time zone 'Africa/Accra') at time zone 'Africa/Accra') as new_advertisers`,
      );
      const recent = await query(
        tx,
        sql`select id,action,created_at from audit_events order by created_at desc,id desc limit 8`,
      );
      return { counts, recent };
    }
    if (resource === 'businesses')
      return query(
        tx,
        sql`select b.*,p.defaults_version as version,p.name as advertiser_name from business_profiles b join advertisers p on p.id=b.advertiser_id order by b.id limit 50 offset ${offset}`,
      );
    if (resource === 'categories') return query(tx, sql`select * from categories order by name,id`);
    if (resource === 'advertisers' && target) {
      const profile = await one(tx, sql`select * from advertisers where id=${target}`);
      const adverts = await query(
        tx,
        sql`select a.id,a.state,a.expires_at,r.data from adverts a left join advert_revisions r on r.id=a.approved_revision_id where a.advertiser_id=${target} order by a.created_at desc limit 50`,
      );
      const history = await query(
        tx,
        sql`select r.id,r.status,r.reason,r.reviewed_at from advert_revisions r join adverts a on a.id=r.advert_id where a.advertiser_id=${target} and r.reviewed_at is not null order by r.reviewed_at desc limit 30`,
      );
      return { profile, adverts, history };
    }
    if (resource === 'submissions' && target)
      return one(
        tx,
        sql`select r.*,p.defaults_version as profile_version,exists(select 1 from advert_revisions x join adverts other on other.id=x.advert_id where x.advert_id<>r.advert_id and other.advertiser_id<>a.advertiser_id and x.fingerprint=r.fingerprint and (x.status='pending' or x.id=other.approved_revision_id)) as possible_duplicate,a.state as advert_state,a.advertiser_id,p.name as advertiser_name,p.kind as advertiser_kind from advert_revisions r join adverts a on a.id=r.advert_id join advertisers p on p.id=a.advertiser_id where r.id=${target}`,
      );
    if (resource === 'adverts') {
      if (target)
        return one(
          tx,
          sql`select a.*,p.closed_at is not null as profile_closed,p.deactivated_at is not null as profile_deactivated,coalesce((select b.approved->>'name' from business_profiles b where b.advertiser_id=p.id and b.approved is not null and b.state<>'suspended'),p.name) as advertiser_name,coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id desc) from advert_revisions r where r.advert_id=a.id),'[]'::jsonb) as revisions from adverts a join advertisers p on p.id=a.advertiser_id where a.id=${target}`,
        );
      return query(
        tx,
        sql`select a.*,p.closed_at is not null as profile_closed,p.deactivated_at is not null as profile_deactivated,coalesce((select b.approved->>'name' from business_profiles b where b.advertiser_id=p.id and b.approved is not null and b.state<>'suspended'),p.name) as advertiser_name,coalesce(r.data,(select x.data from advert_revisions x where x.advert_id=a.id order by x.created_at desc,x.id desc limit 1)) as data from adverts a join advertisers p on p.id=a.advertiser_id left join advert_revisions r on r.id=a.approved_revision_id where (${search}='' or strpos(lower(p.name||' '||coalesce(r.data->>'title',(select x.data->>'title' from advert_revisions x where x.advert_id=a.id order by x.created_at desc,x.id desc limit 1),'')||' '||a.state),lower(${search}))>0) order by a.created_at desc,a.id desc limit 50 offset ${offset}`,
      );
    }
    return [];
  });
}
