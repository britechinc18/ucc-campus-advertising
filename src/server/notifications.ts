import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from './db';
import { actor, query } from './store';
import { listAdverts } from './discovery';
import type { NotificationFeed, NotificationItem } from '../lib/notifications';

// Activity is derived from existing records. No invented messages or unread state.
export async function notificationFeed(userId?: string): Promise<NotificationFeed> {
  let seller = false;
  let privateItems: NotificationItem[] = [];
  if (userId) {
    const activity = await db().transaction(async (tx) => {
      await actor(tx, userId);
      const profiles = await query(
        tx,
        sql`select id from advertisers where user_id=${userId} and not suspended`,
      );
      if (!profiles.length) return null;
      return query<NotificationItem>(
        tx,
        sql`
        select * from (
          select r.id::text as id,
            case when r.status='approved' then 'Advert approved' else 'Changes requested' end as title,
            r.data->>'title' as message,
            '/my-adverts/'||a.id::text as href,
            r.reviewed_at as date
          from adverts a join advertisers p on p.id=a.advertiser_id
          join lateral (select * from advert_revisions x where x.advert_id=a.id and x.reviewed_at is not null order by x.reviewed_at desc,x.id desc limit 1) r on true
          where p.user_id=${userId} and not p.suspended and r.status in ('approved','rejected') and r.reviewed_at>now()-interval '30 days'
          union all
          select a.id::text||':expiry' as id,
            case when least(a.expires_at,(r.data->'details'->>'endsAt')::timestamptz)<=now() then 'Advert expired' else 'Advert expiring soon' end as title,
            r.data->>'title' as message,
            '/my-adverts/'||a.id::text as href,
            least(a.expires_at,(r.data->'details'->>'endsAt')::timestamptz) as date
          from adverts a join advertisers p on p.id=a.advertiser_id join advert_revisions r on r.id=a.approved_revision_id
          where p.user_id=${userId} and not p.suspended and a.state in ('published','expired')
            and least(a.expires_at,(r.data->'details'->>'endsAt')::timestamptz) between now()-interval '7 days' and now()+interval '3 days'
        ) updates order by date desc,id desc limit 15`,
      );
    });
    seller = activity !== null;
    privateItems = activity ?? [];
  }
  const announcements = await listAdverts({ surface: 'campus', kind: 'announcement', limit: 5 });
  const publicItems = announcements.items.map((a) => ({
    id: 'announcement:' + a.id,
    title: 'Campus announcement',
    message: a.data.title,
    href: '/adverts/' + a.id,
    date: new Date(a.published_at).toISOString(),
  }));
  return {
    audience: seller ? 'seller' : 'public',
    items: [...privateItems, ...publicItems]
      .map((i) => ({ ...i, date: new Date(i.date).toISOString() }))
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
      .slice(0, 20),
  };
}
