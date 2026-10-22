import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { home } from '@/server/discovery';
import { query } from '@/server/store';
import { db } from '@/server/db';
import type { Category, Listing } from '@/lib/market';
import { ListingGrid, Search, CategoryChips } from '@/components/listings';
import { Icon } from '@/components/icon';
import { EmptyState, ErrorMessage } from '@/components/ui';
export default async function HomePage() {
  let feeds: Awaited<ReturnType<typeof home>> | null = null;
  let categories: Category[] = [];
  let failed = false;
  try {
    [feeds, categories] = await Promise.all([
      home(),
      query<Category>(db(), sql`select id,name,slug from categories where active order by name`),
    ]);
  } catch {
    failed = true;
  }
  const sections = feeds
    ? [
        {
          title: 'Fresh Finds',
          sub: 'The latest to land on campus.',
          items: feeds.fresh.items,
          url: '/explore',
          featured: false,
        },
        {
          title: 'Featured on campus',
          sub: 'Selected listings worth a closer look.',
          items: feeds.featured,
          url: '/explore',
          featured: true,
        },
        {
          title: 'Deals under GH₵100',
          sub: 'Small prices. Useful finds.',
          items: feeds.deals.items,
          url: '/explore?max=9999',
          featured: false,
        },
        ...(feeds.trending.basis === 'recent_engagement'
          ? [
              {
                title: 'Trending on Campus',
                sub: 'Popular with the campus community.',
                items: feeds.trending.items,
                url: '/explore?sort=trending',
                featured: false,
              },
            ]
          : []),
      ]
    : [];
  return (
    <main id="main" className="container">
      <section className="hero">
        <div className="hero-main">
          <div>
            <p className="eyebrow">THE UCC CAMPUS MARKETPLACE</p>
            <h1>
              <span className="desktop-copy">Good finds. Right around campus.</span>
              <span className="only-mobile">Find it on campus.</span>
            </h1>
            <p className="muted">Buy, sell and discover services within your campus community.</p>
          </div>
          <div className="campus-note">
            <Icon name="shield" />
            <span>
              Adverts reviewed before publishing.
              <br />
              Contact advertisers directly.
            </span>
          </div>
        </div>
        <Search />
        <CategoryChips categories={categories} />
      </section>
      {failed ? (
        <>
          <ErrorMessage message="We couldn’t load the latest adverts. Please refresh in a moment." />
          <EmptyState
            title="Your campus marketplace is here."
            message="Browse categories, find useful services and connect with advertisers around UCC."
          />
        </>
      ) : !feeds?.fresh.items.length ? (
        <>
          <section className="section">
            <h2>Fresh Finds</h2>
            <EmptyState
              title="Be among the first on campus."
              message="Approved adverts will appear here. Have something to offer? Post an item, service or wanted advert."
              action={false}
            />
          </section>
          <div className="feature-band">
            <div>
              <h2>Something to offer campus?</h2>
              <p>Give it a new home. Or help someone find what they need.</p>
            </div>
            <Link href="/post" className="btn">
              Post an advert <Icon name="arrow" />
            </Link>
          </div>
        </>
      ) : (
        sections
          .filter((s) => s.items.length)
          .map((s, i) => (
            <section className="section" key={s.title}>
              <div className="section-head">
                <div>
                  <h2>{s.title}</h2>
                  <p>{s.sub}</p>
                </div>
                <Link className="text-link" href={s.url}>
                  View all <Icon name="arrow" />
                </Link>
              </div>
              <ListingGrid items={s.items as unknown as Listing[]} featured={s.featured} />
              {i === 0 ? (
                <div className="feature-band">
                  <div>
                    <h2>Something to offer campus?</h2>
                    <p>Give it a new home. Or help someone find what they need.</p>
                  </div>
                  <Link className="btn secondary" href="/post">
                    Post an advert <Icon name="arrow" />
                  </Link>
                </div>
              ) : null}
            </section>
          ))
      )}
    </main>
  );
}
