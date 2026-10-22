import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { FlyerGrid } from '@/components/campus';
import { listAdverts } from '@/server/discovery';
import { home } from '@/server/discovery';
import { query } from '@/server/store';
import { db } from '@/server/db';
import type { Category, Listing } from '@/lib/market';
import { ListingGrid, Search, CategoryChips } from '@/components/listings';
import Image from 'next/image';
import { Icon } from '@/components/icon';
import { EmptyState, ErrorMessage } from '@/components/ui';
export default async function HomePage() {
  let feeds: Awaited<ReturnType<typeof home>> | null = null;
  let categories: Category[] = [];
  let campusItems: Listing[] = [];
  let failed = false;
  try {
    [feeds, categories, campusItems] = await Promise.all([
      home(),
      query<Category>(db(), sql`select id,name,slug from categories where active order by name`),
      listAdverts({ surface: 'campus', limit: 4 }).then((r) => r.items as unknown as Listing[]),
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
    <main id="main" className="container live-home-cleanup">
      <section className="campus-hero" aria-labelledby="home-heading">
        <Image
          src="/editorial/workspace.webp"
          alt="A sunlit desk with laptops, books, a chair and plants"
          fill
          priority
          sizes="(max-width: 767px) 100vw, 1360px"
        />
        <div className="campus-hero-copy">
          <h1 id="home-heading">
            Everything you need
            <br />
            on campus.
          </h1>
          <p>Buy, discover and connect within the UCC community.</p>
          <Search id="home-search" placeholder="Search for books, gadgets, rooms…" />
        </div>
      </section>
      <section className="category-section" aria-label="Browse categories">
        <div className="section-head">
          <div>
            <h2>Find your thing around campus</h2>
          </div>
          <Link className="text-link" href="/explore#filters">
            All categories <Icon name="arrow" />
          </Link>
        </div>
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
          <div className="feature-band seller-invitation">
            <div>
              <h2>Something to offer campus?</h2>
              <p>Give it a new home. Or help someone find what they need.</p>
            </div>
            <Link href="/sell" className="btn">
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
                <div className="feature-band seller-invitation">
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
      <section className="section campus-edits" aria-labelledby="edits-heading">
        <div className="section-head">
          <div>
            <p className="eyebrow">A LITTLE INSPIRATION</p>
            <h2 id="edits-heading">For your kind of campus life.</h2>
          </div>
        </div>
        <div className="edit-grid">
          <Link
            className="editorial-tile"
            href={`/explore?${new URLSearchParams(categories.find((c) => /book/i.test(c.name)) ? { category: categories.find((c) => /book/i.test(c.name))!.id } : { q: 'books' })}`}
          >
            <div className="edit-image">
              <Image
                src="/editorial/books.webp"
                alt="Books ready for a new chapter"
                fill
                sizes="(max-width: 599px) 100vw, 33vw"
              />
            </div>
            <div className="edit-copy">
              <p className="eyebrow">THE STUDY EDIT</p>
              <h3>Big ideas. Fresh pages.</h3>
              <span>
                Browse books <Icon name="arrow" />
              </span>
            </div>
          </Link>
          <Link
            className="editorial-tile"
            href={`/explore?${new URLSearchParams(categories.find((c) => /electronic/i.test(c.name)) ? { category: categories.find((c) => /electronic/i.test(c.name))!.id } : { q: 'electronics' })}`}
          >
            <div className="edit-image">
              <Image
                src="/editorial/sound.webp"
                alt="Headphones on a warm yellow background"
                fill
                sizes="(max-width: 599px) 100vw, 33vw"
              />
            </div>
            <div className="edit-copy">
              <p className="eyebrow">EVERYDAY UPGRADES</p>
              <h3>Find your next favourite.</h3>
              <span>
                Explore electronics <Icon name="arrow" />
              </span>
            </div>
          </Link>
          <Link className="business-editorial" href="/businesses">
            <p className="eyebrow">GOOD PEOPLE. GREAT IDEAS.</p>
            <Icon name="store" />
            <h3>
              Small businesses.
              <br />A bigger campus.
            </h3>
            <p>Discover the people making things happen around you.</p>
            <span>
              Meet local businesses <Icon name="arrow" />
            </span>
          </Link>
        </div>
        <p className="editorial-disclaimer">
          Editorial inspiration. Browse each collection for currently available adverts.
        </p>
      </section>
      <section className="section home-campus">
        <div className="section-head">
          <div>
            <p className="eyebrow">BEYOND THE MARKET</p>
            <h2>Campus, in full colour.</h2>
            <p>Events, offers, announcements and the people behind them.</p>
          </div>
          <Link className="text-link" href="/campus-360">
            Campus 360 <Icon name="arrow" />
          </Link>
        </div>
        {campusItems.length ? (
          <FlyerGrid items={campusItems} />
        ) : (
          <Link className="campus-home-invitation" href="/campus-360">
            <Icon name="calendar" />
            <div>
              <h3>There’s more to campus.</h3>
              <p>Explore the new Campus 360 discovery hub.</p>
            </div>
            <Icon name="arrow" />
          </Link>
        )}
      </section>
      <div className="market-promise">
        <span>
          <Icon name="shield" /> Reviewed before publishing
        </span>
        <span>
          <Icon name="chat" /> Connect directly with advertisers
        </span>
      </div>
    </main>
  );
}
