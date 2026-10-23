import { effectiveContent } from './profile-visibility';
import { sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { db } from './db';
import { one, query, visible } from './store';
import { id, contactLinks, type Content } from './validation';
const searchSchema = z
  .object({
    surface: z.enum(['market', 'campus', 'all']).default('market'),
    q: z.string().trim().max(100).default(''),
    category: id.optional(),
    kind: z
      .enum(['product', 'service', 'wanted', 'event', 'promotion', 'announcement', 'business_ad'])
      .optional(),
    condition: z.enum(['new', 'used', 'not_applicable']).optional(),
    location: z.string().max(120).optional(),
    business: id.optional(),
    seller: id.optional(),
    min: z.coerce.number().int().min(0).max(100000000).optional(),
    max: z.coerce.number().int().min(0).max(100000000).optional(),
    sort: z.enum(['fresh', 'price_asc', 'price_desc', 'trending']).default('fresh'),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().max(2000).optional(),
  })
  .strict()
  .refine(
    (v) => v.min === undefined || v.max === undefined || v.min <= v.max,
    'Minimum price exceeds maximum',
  );
interface PublicAdvert {
  category_name: string | null;
  id: string;
  advertiser_id: string;
  seller: string;
  seller_kind: string;
  published_at: Date;
  expires_at: Date;
  data: Content;
  score: number;
  price: number | null;
  cursor_published_at: string;
}
const base = sql`from adverts a join advert_revisions r on r.id=a.approved_revision_id join advertisers p on p.id=a.advertiser_id left join users u on u.id=p.user_id`;
const select = sql`a.id,a.advertiser_id,(select c.name from categories c where c.id=r.category_id) as category_name,coalesce(${effectiveContent}->>'displayName',p.name) as seller,p.kind as seller_kind,a.published_at,to_char(a.published_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as cursor_published_at,a.expires_at,(${effectiveContent} - 'contactSources' - 'profileVersion') as data,(r.data->>'pricePesewas')::int as price,
 coalesce((select sum(least(m.views,1000)+least(m.contacts,100)*3)::int from daily_advert_metrics m where m.advert_id=a.id and m.day>=to_char(now()-interval '7 days','YYYY-MM-DD')),0)::int as score`;
function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, '\\$&');
}
export async function listAdverts(input: unknown, extra?: SQL) {
  const s = searchSchema.parse(input);
  const filters: SQL[] = [visible];
  if (s.surface === 'market') filters.push(sql`r.data->>'kind' in ('product','service','wanted')`);
  if (s.surface === 'campus')
    filters.push(sql`r.data->>'kind' in ('event','promotion','announcement','business_ad')`);
  if (extra) filters.push(extra);
  if (s.q)
    filters.push(
      sql`to_tsvector('simple',coalesce(r.data->>'title','') || ' ' || coalesce(r.data->>'description','')) @@ plainto_tsquery('simple',${s.q})`,
    );
  if (s.category) filters.push(sql`r.category_id=${s.category}`);
  if (s.kind) filters.push(sql`r.data->>'kind'=${s.kind}`);
  if (s.condition) filters.push(sql`r.data->>'condition'=${s.condition}`);
  if (s.location)
    filters.push(sql`${effectiveContent}->>'location' ilike ${`%${escapeLike(s.location)}%`}`);
  if (s.seller) filters.push(sql`a.advertiser_id=${s.seller}`);
  if (s.business) filters.push(sql`a.advertiser_id=${s.business} and p.kind='business'`);
  if (s.min !== undefined) filters.push(sql`(r.data->>'pricePesewas')::int>=${s.min}`);
  if (s.max !== undefined) filters.push(sql`(r.data->>'pricePesewas')::int<=${s.max}`);
  const sort =
    s.sort === 'price_asc'
      ? sql`price asc nulls last,id asc`
      : s.sort === 'price_desc'
        ? sql`price desc nulls last,id asc`
        : s.sort === 'trending'
          ? sql`score desc,published_at desc,id desc`
          : sql`published_at desc,id desc`;
  const cursorSchema = z.object({
    id: id,
    published: z.iso.datetime(),
    price: z.number().int().nullable(),
    score: z.number().int().min(0),
    sort: z.literal(s.sort),
  });
  let after = sql`true`;
  if (s.cursor) {
    let value: unknown;
    try {
      value = JSON.parse(Buffer.from(s.cursor, 'base64url').toString());
    } catch {
      value = null;
    }
    const c = cursorSchema.parse(value);
    if (s.sort === 'fresh')
      after = sql`(published_at,id)<(${c.published}::timestamptz,${c.id}::uuid)`;
    if (s.sort === 'trending')
      after = sql`(score,published_at,id)<(${c.score},${c.published}::timestamptz,${c.id}::uuid)`;
    if (s.sort.startsWith('price_'))
      after =
        c.price === null
          ? sql`price is null and id>${c.id}::uuid`
          : sql`price is null or (price=${c.price} and id>${c.id}::uuid) or price ${s.sort === 'price_asc' ? sql`>` : sql`<`} ${c.price}`;
  }
  const rows = await query<PublicAdvert>(
    db(),
    sql`select * from (select ${select} ${base} where ${sql.join(filters, sql` and `)}) listing where (${after}) order by ${sort} limit ${s.limit + 1}`,
  );
  const hasMore = rows.length > s.limit;
  const items = rows.slice(0, s.limit);
  const last = items.at(-1);
  return {
    items,
    nextCursor:
      hasMore && last
        ? Buffer.from(
            JSON.stringify({
              id: last.id,
              published: last.cursor_published_at,
              price: last.price,
              score: last.score,
              sort: s.sort,
            }),
          ).toString('base64url')
        : null,
  };
}
export async function advertDetail(advertId: string) {
  id.parse(advertId);
  const a = await one<PublicAdvert>(
    db(),
    sql`select ${select} ${base} where a.id=${advertId} and ${visible}`,
  );
  return {
    ...a,
    contacts: contactLinks(
      a.data,
      `${process.env.APP_ORIGIN}/adverts/${a.id}`,
      a.category_name ?? undefined,
    ),
  };
}
export async function home() {
  const [fresh, trending, deals, featured] = await Promise.all([
    listAdverts({ limit: 8 }),
    listAdverts({ limit: 8, sort: 'trending' }),
    listAdverts(
      { limit: 8, max: 9999 },
      sql`r.data->>'kind'<>'wanted' and r.data->>'priceMode'<>'contact'`,
    ),
    query<PublicAdvert>(
      db(),
      sql`select ${select} ${base} join featured_adverts f on f.advert_id=a.id where ${visible} and r.data->>'kind' in ('product','service','wanted') and f.starts_at<=now() and f.ends_at>now() order by f.position,a.id limit 12`,
    ),
  ]);
  return {
    fresh,
    trending: {
      ...trending,
      basis: trending.items.some((a) => a.score > 0) ? 'recent_engagement' : 'fresh_fallback',
    },
    deals,
    featured,
  };
}
export async function reportAdvert(advertId: string, reporterHash: string, input: unknown) {
  id.parse(advertId);
  const data = z
    .object({
      reason: z.enum(['spam', 'duplicate', 'fraud', 'prohibited', 'other']),
      detail: z.string().trim().max(1000).optional(),
    })
    .strict()
    .parse(input);
  await advertDetail(advertId);
  await db().execute(
    sql`insert into reports(advert_id,reason,detail,reporter_hash,day) values(${advertId},${data.reason},${data.detail ?? null},${reporterHash},to_char(now() at time zone 'Africa/Accra','YYYY-MM-DD')) on conflict(advert_id,reporter_hash,day) do nothing`,
  );
  return { accepted: true };
}
export async function recordEvent(advertId: string, input: unknown) {
  id.parse(advertId);
  const data = z
    .object({ type: z.enum(['view', 'contact']) })
    .strict()
    .parse(input);
  await advertDetail(advertId);
  await db().execute(
    sql`insert into daily_advert_metrics(advert_id,day,views,contacts) values(${advertId},to_char(now() at time zone 'Africa/Accra','YYYY-MM-DD'),${data.type === 'view' ? 1 : 0},${data.type === 'contact' ? 1 : 0}) on conflict(advert_id,day) do update set views=daily_advert_metrics.views+excluded.views,contacts=daily_advert_metrics.contacts+excluded.contacts`,
  );
  return { accepted: true };
}

export async function publicSeller(sellerId: string, cursor?: string) {
  id.parse(sellerId);
  // An account is public only through its currently approved, visible adverts.
  const seller = await one<{
    id: string;
    name: string;
    kind: string;
    profile: import('../lib/seller-profile').ProfileDefaults | null;
    privacy: Record<string, boolean>;
  }>(
    db(),
    sql`select p.id,coalesce((select b.approved->>'name' from business_profiles b where b.advertiser_id=p.id and b.approved is not null and b.state<>'suspended'),p.approved_defaults->>'name',p.name) as name,p.kind,p.approved_defaults as profile,p.privacy ${base} where a.advertiser_id=${sellerId} and ${visible} limit 1`,
  );
  const listings = await listAdverts({
    seller: sellerId,
    surface: 'all',
    limit: 20,
    ...(cursor ? { cursor } : {}),
  });
  const profile = seller.profile;
  const socials = profile?.socials
    ? Object.fromEntries(
        Object.entries(profile.socials).filter(
          ([key]) =>
            seller.privacy[key] !== false &&
            profile.visibility?.[key as keyof typeof profile.visibility] !== false,
        ),
      )
    : undefined;
  return {
    seller: {
      id: seller.id,
      name: seller.name,
      kind: seller.kind,
      bio: profile?.bio,
      photoMediaId:
        seller.privacy.photo !== false && profile?.visibility?.photo !== false
          ? profile?.photoMediaId
          : undefined,
      socials,
    },
    ...listings,
  };
}
