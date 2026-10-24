import { redirect } from 'next/navigation';
import { sql } from 'drizzle-orm';
import { requireViewer } from '@/server/viewer';
import { accountContext, ownedAdverts } from '@/server/frontend';
import { query } from '@/server/store';
import { db } from '@/server/db';
import { PostForm } from '@/components/post-form';
import { EmptyState } from '@/components/ui';
import type { Account, Category, OwnAdvert, SellerIdentity } from '@/lib/market';
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
  let context = await accountContext(u.id);
  const selected = id.safeParse(p.advertiserId).success ? p.advertiserId : undefined;
  const assisted =
    u.role === 'admin' && selected && !context.profiles.some((profile) => profile.id === selected)
      ? selected
      : undefined;
  if (selected && !assisted) context = await accountContext(u.id, selected);
  if (!p.edit && !selected) {
    const business = context.profiles.find(
      (profile) => profile.kind === 'business' && !profile.suspended && !profile.deactivated,
    );
    if (business) context = { ...context, profile: business };
  }
  if (!context.profiles.length && !assisted && !(p.edit && u.role === 'admin'))
    redirect('/onboarding?next=/post');
  if (!p.edit && !assisted && context.profile?.suspended)
    return (
      <main id="main" className="container">
        <EmptyState
          title="Posting is currently restricted."
          message="Contact an administrator about your advertiser profile."
        />
      </main>
    );
  let advert: OwnAdvert | undefined;
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
  const identityId = advert?.advertiser_id ?? assisted ?? selected ?? context.profile?.id;
  const ownIdentity = context.profiles.find((profile) => profile.id === identityId);
  if (ownIdentity) context = { ...context, profile: ownIdentity };
  const postingProfiles = assisted
    ? await query<SellerIdentity>(
        db(),
        sql`select p.id,p.name,p.kind,p.suspended,p.defaults_version as version,p.approved_defaults_version as "approvedVersion",p.deactivated_at is not null as deactivated,case when p.kind='business' then coalesce(b.pending,b.approved) else coalesce(p.draft_defaults,p.approved_defaults) end as defaults,case when p.kind='business' then b.approved else p.approved_defaults end as "approvedDefaults" from advertisers p left join business_profiles b on b.advertiser_id=p.id where p.id=${identityId} and p.closed_at is null and not p.suspended`,
      )
    : context.profiles;
  const categories = await query<Category>(
    db(),
    sql`select id,name,slug from categories where active order by name`,
  );
  return (
    <main id="main" className="container">
      <PostForm
        key={p.edit ?? identityId ?? initialKind}
        postingProfiles={postingProfiles}
        initialKind={initialKind}
        account={context as Account}
        categories={categories}
        userId={u.id}
        advert={advert}
        renew={p.renew === '1'}
        advertiserId={identityId}
      />
    </main>
  );
}
