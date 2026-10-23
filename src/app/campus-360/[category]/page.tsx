import Link from 'next/link';
import { BusinessDirectory } from '@/components/business-directory';
import { notFound } from 'next/navigation';
import { campusCategories } from '@/lib/campus';
import { listAdverts } from '@/server/discovery';
import { FlyerGrid } from '@/components/campus';
import { EmptyState, ErrorMessage } from '@/components/ui';
import { Search } from '@/components/listings';
import type { Listing } from '@/lib/market';
export default async function CampusCategory({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ q?: string; cursor?: string; view?: string; offset?: string }>;
}) {
  const { category } = await params;
  const c = campusCategories.find((c) => c.slug === category);
  if (!c) notFound();
  const p = await searchParams;
  let items: Listing[] = [];
  let cursor: string | null = null;
  let failed = false;
  try {
    const r =
      category === 'businesses' && p.view !== 'adverts'
        ? { items: [], nextCursor: null }
        : await listAdverts({
            surface: 'campus',
            kind: c.kind,
            q: (p.q ?? '').slice(0, 100),
            ...(p.cursor ? { cursor: p.cursor } : {}),
            limit: 20,
          });
    items = r.items as unknown as Listing[];
    cursor = r.nextCursor;
  } catch {
    failed = true;
  }
  return (
    <main id="main" className="container campus-page">
      <div className="breadcrumbs">
        <Link href="/campus-360">Campus 360</Link>
        <span>/</span>
        <span>{c.name}</span>
      </div>
      <div className="page-head">
        <div>
          <p className="eyebrow">CAMPUS 360</p>
          <h1>{c.name}</h1>
          <p>{c.description}</p>
        </div>
      </div>
      <nav className="campus-tabs" aria-label="Campus categories">
        {campusCategories.map((cat) => (
          <Link
            href={`/campus-360/${cat.slug}`}
            aria-current={cat.slug === category ? 'page' : undefined}
            key={cat.slug}
          >
            {cat.name}
          </Link>
        ))}
      </nav>
      {category === 'businesses' ? (
        <nav className="tabs" aria-label="Business discovery">
          <Link
            href="/campus-360/businesses"
            aria-current={p.view !== 'adverts' ? 'page' : undefined}
          >
            Business directory
          </Link>
          <Link
            href="/campus-360/businesses?view=adverts"
            aria-current={p.view === 'adverts' ? 'page' : undefined}
          >
            Business adverts
          </Link>
        </nav>
      ) : null}
      {category === 'businesses' && p.view !== 'adverts' ? (
        <BusinessDirectory
          q={p.q}
          offset={Math.min(10000, Math.max(0, Number(p.offset) || 0))}
          action="/campus-360/businesses"
        />
      ) : (
        <>
          <Search
            value={p.q}
            action={`/campus-360/${category}`}
            placeholder={`Search ${c.name.toLowerCase()}…`}
            params={category === 'businesses' ? { view: 'adverts' } : undefined}
          />
          <section className="section" aria-label={`${c.name} gallery`}>
            {failed ? (
              <ErrorMessage message="These updates couldn’t be loaded. Try clearing your search." />
            ) : items.length ? (
              <FlyerGrid items={items} />
            ) : (
              <EmptyState
                title={`No ${c.name.toLowerCase()} just yet.`}
                message="Approved, current adverts appear here. Check back soon, or share your own campus update."
                action={false}
              />
            )}
          </section>
          {cursor ? (
            <div className="load-more">
              <Link
                className="btn secondary"
                href={`/campus-360/${category}?${new URLSearchParams({ cursor, ...(p.q ? { q: p.q } : {}), ...(category === 'businesses' ? { view: 'adverts' } : {}) })}`}
              >
                More updates →
              </Link>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
