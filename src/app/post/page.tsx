import { redirect } from 'next/navigation';
import { sql } from 'drizzle-orm';
import { requireViewer } from '@/server/viewer';
import { accountContext, ownedAdverts } from '@/server/frontend';
import { one, query } from '@/server/store';
import { db } from '@/server/db';
import { PostForm } from '@/components/post-form';
import { EmptyState } from '@/components/ui';
import type { Account, Category, OwnAdvert } from '@/lib/market';
import { contentSchema, id } from '@/server/validation';
export const metadata = { title: 'Post an advert' };
export default async function PostPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; renew?: string; advertiserId?: string; kind?: string }>;
}) {
  const p = await searchParams;
  const parsedKind = contentSchema.shape.kind.safeParse(p.kind);
  const initialKind = parsedKind.success ? parsedKind.data : 'product';
  const u = await requireViewer(`/post${p.edit ? `?edit=${p.edit}` : ''}`);
  const context = await accountContext(u.id);
  const assisted =
    u.role === 'admin' && id.safeParse(p.advertiserId).success ? p.advertiserId : undefined;
  if (!context.profile && !assisted) redirect('/onboarding?next=/post');
  if (context.profile?.suspended)
    return (
      <main id="main" className="container">
        <EmptyState
          title="Posting is currently restricted."
          message="Contact an administrator about your advertiser profile."
        />
      </main>
    );
  let advert: OwnAdvert | undefined;
  let assistedName: string | undefined;
  if (assisted) {
    const profile = await one<{ name: string }>(
      db(),
      sql`select name from advertisers where id=${assisted} and not suspended`,
    );
    assistedName = profile.name;
  }
  if (p.edit) {
    try {
      advert = JSON.parse(JSON.stringify(await ownedAdverts(u.id, 0, p.edit))) as OwnAdvert;
    } catch {
      return (
        <main id="main" className="container">
          <EmptyState
            title="This advert cannot be edited."
            message="Return to My Adverts and select an advert belonging to your account."
          />
        </main>
      );
    }
    if (advert.revisions.some((r) => r.status === 'pending') || advert.state === 'suspended')
      redirect(`/my-adverts/${advert.id}`);
  }
  const categories = await query<Category>(
    db(),
    sql`select id,name,slug from categories where active order by name`,
  );
  return (
    <main id="main" className="container">
      {assistedName ? (
        <p className="inline-notice">
          Posting for <strong>{assistedName}</strong>. Enter their phone and WhatsApp details, with
          their permission. These will appear publicly on the advert.
        </p>
      ) : null}
      <PostForm
        key={p.edit ?? assisted ?? initialKind}
        initialKind={initialKind}
        account={context as Account}
        categories={categories}
        userId={u.id}
        advert={advert}
        renew={p.renew === '1'}
        advertiserId={assisted ?? (u.role === 'admin' ? advert?.advertiser_id : undefined)}
      />
    </main>
  );
}
