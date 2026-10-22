import Link from 'next/link';
import { listAdverts } from '@/server/discovery';
import { CampusBanners, FlyerGrid } from '@/components/campus';
import { Search } from '@/components/listings';
import { EmptyState, ErrorMessage } from '@/components/ui';
import type { Listing } from '@/lib/market';
export const metadata = { title: 'Campus 360' };
export default async function Campus({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const p = await searchParams;
  let items: Listing[] = [];
  let failed = false;
  try {
    items = (await listAdverts({ surface: 'campus', q: (p.q ?? '').slice(0, 100), limit: 12 }))
      .items as unknown as Listing[];
  } catch {
    failed = true;
  }
  return (
    <main id="main" className="container campus-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">THE CAMPUS, IN FULL COLOUR</p>
          <h1>Campus 360.</h1>
          <p>What’s happening. What’s new. Who’s making it happen.</p>
        </div>
        <Link className="text-link" href="/businesses">
          Business directory →
        </Link>
      </div>
      <Search
        action="/campus-360"
        value={p.q}
        placeholder="Search events, offers, announcements…"
      />
      <CampusBanners />
      <section className="section">
        <div className="section-head">
          <h2>{p.q ? `Results for “${p.q.slice(0, 100)}”` : 'Around campus now.'}</h2>
          <Link className="text-link" href="/sell">
            Share something →
          </Link>
        </div>
        {failed ? (
          <ErrorMessage message="Campus updates couldn’t be loaded. Please try again shortly." />
        ) : items.length ? (
          <FlyerGrid items={items} />
        ) : (
          <EmptyState
            title="Good things are on their way."
            message="Approved event flyers, promotions, announcements and business adverts will appear here."
            action={false}
          />
        )}
      </section>
    </main>
  );
}
