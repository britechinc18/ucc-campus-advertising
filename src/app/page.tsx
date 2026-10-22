import Link from 'next/link';
import Image from 'next/image';
import { sql } from 'drizzle-orm';
import { listAdverts } from '@/server/discovery';
import { query } from '@/server/store';
import { db } from '@/server/db';
import { viewer } from '@/server/viewer';
import type { Category, Listing } from '@/lib/market';
import { HomeSearch } from '@/components/home-search';
import { HomeListings } from '@/components/home-listings';
import { Icon } from '@/components/icon';
import { EmptyState, ErrorMessage } from '@/components/ui';
import './home.css';
function categoryIcon(name: string) {
  return /book|notes/i.test(name)
    ? 'book'
    : /electronic|tech/i.test(name)
      ? 'laptop'
      : /fashion|clothing/i.test(name)
        ? 'shirt'
        : /food|drink/i.test(name)
          ? 'food'
          : /service/i.test(name)
            ? 'tools'
            : /housing|accommodation|room/i.test(name)
              ? 'home'
              : /furniture/i.test(name)
                ? 'furniture'
                : 'grid';
}
export default async function HomePage() {
  const [adverts, categoriesResult, v] = await Promise.allSettled([
    listAdverts({ surface: 'market', limit: 8 }),
    query<Category>(db(), sql`select id,name,slug from categories where active order by name`),
    viewer(),
  ]);
  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
  const items =
    adverts.status === 'fulfilled'
      ? (JSON.parse(JSON.stringify(adverts.value.items)) as Listing[])
      : [];
  const postHref = v.status === 'fulfilled' && v.value.user?.seller_active ? '/post' : '/sell';
  return (
    <main id="main" className="container medstash-home">
      <section className="home-hero" aria-labelledby="home-heading">
        <div className="home-hero-copy">
          <p className="eyebrow">UCC CAMPUS MARKETPLACE</p>
          <h1 id="home-heading">
            Buy, Sell &amp;
            <br />
            Discover <span>on Campus</span>
          </h1>
          <p className="home-hero-description">
            From textbooks to tech, furniture to fashion — find what you need and share what you
            have within the UCC community.
          </p>
          <div className="home-hero-actions">
            <Link className="btn" href="/explore">
              Explore Listings <Icon name="arrow" />
            </Link>
            <Link className="btn secondary" href={postHref}>
              Post an Advert
            </Link>
          </div>
          <div className="home-hero-notes">
            <span>
              <Icon name="users" />
              Made for UCC
            </span>
            <span>
              <Icon name="chat" />
              WhatsApp or call
            </span>
          </div>
        </div>
        <div className="home-hero-art">
          <Image
            src="/editorial/campus-essentials.webp"
            alt="Editorial still life of a laptop, textbooks, backpack and white sneakers"
            fill
            priority
            sizes="(max-width: 699px) 100vw, (max-width: 1023px) 48vw, 50vw"
          />
        </div>
      </section>
      <HomeSearch categories={categories} />
      <section className="home-section home-categories" aria-labelledby="home-categories-heading">
        <div className="home-section-heading">
          <div>
            <h2 id="home-categories-heading">Browse by Category</h2>
            <p>Find exactly what you need, or discover something new.</p>
          </div>
          <Link className="text-link" href="/explore#filters">
            View all categories <Icon name="arrow" />
          </Link>
        </div>
        {categoriesResult.status === 'rejected' ? (
          <ErrorMessage message="Categories couldn’t be loaded. You can still explore the marketplace." />
        ) : (
          <div className="home-category-grid">
            {categories.map((c) => (
              <Link key={c.id} href={`/explore?category=${c.id}`}>
                <span className={`home-category-icon tone-${categoryIcon(c.name)}`}>
                  <Icon name={categoryIcon(c.name)} />
                </span>
                <span>{c.name}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
      <section className="home-section home-latest" aria-labelledby="home-latest-heading">
        <div className="home-section-heading">
          <div>
            <h2 id="home-latest-heading">Latest on MedStash</h2>
            <p>Fresh finds from the UCC community.</p>
          </div>
          <Link className="text-link" href="/explore">
            View all listings <Icon name="arrow" />
          </Link>
        </div>
        {adverts.status === 'rejected' ? (
          <ErrorMessage message="We couldn’t load the latest adverts. Please refresh or try Explore." />
        ) : items.length ? (
          <HomeListings items={items} />
        ) : (
          <EmptyState
            title="Your next campus find starts here."
            message="Approved listings will appear here. Explore the marketplace or share your first advert."
            action={false}
          />
        )}
      </section>
      <section className="home-business-banner" aria-labelledby="home-business-heading">
        <div className="home-business-image">
          <Image
            src="/editorial/student-businesses.webp"
            alt="Editorial portrait of a student entrepreneur at a workspace with her phone and packaged goods"
            fill
            sizes="(max-width: 699px) 100vw, 65vw"
          />
        </div>
        <div className="home-business-copy">
          <p className="eyebrow">BUILT ON CAMPUS</p>
          <h2 id="home-business-heading">
            Support Student
            <br />
            Businesses
          </h2>
          <p>Discover and support amazing student-run businesses at UCC.</p>
          <Link className="btn" href="/businesses">
            Explore Businesses <Icon name="arrow" />
          </Link>
        </div>
      </section>
      <section className="home-trust" aria-label="The MedStash community">
        {[
          ['users', 'Made for UCC', 'A marketplace focused on the campus community.'],
          ['chat', 'Connect Directly', 'Contact advertisers through WhatsApp or phone.'],
          ['tag', 'Post with Ease', 'Simple listing submissions, reviewed before publishing.'],
        ].map(([icon, title, copy]) => (
          <div key={title}>
            <span className="home-trust-icon">
              <Icon name={icon} />
            </span>
            <div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          </div>
        ))}
      </section>
      <p className="home-editorial-note">
        Hero and business imagery are editorial illustrations. Available adverts are shown in Latest
        on MedStash.
      </p>
    </main>
  );
}
