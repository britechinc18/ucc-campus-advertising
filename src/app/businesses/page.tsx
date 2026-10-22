import { listBusinesses } from '@/server/businesses';
import { BusinessCard } from '@/components/businesses';
import { Search } from '@/components/listings';
import { EmptyState, ErrorMessage } from '@/components/ui';
import type { Business } from '@/lib/market';
import Link from 'next/link';
export const metadata = { title: 'Local businesses' };
export default async function Businesses({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  let rows: Business[] = [];
  let failed = false;
  try {
    rows = (await listBusinesses()) as Business[];
  } catch {
    failed = true;
  }
  const found = rows.filter((b) =>
    `${b.name} ${b.approved.description} ${b.approved.location}`
      .toLowerCase()
      .includes(q.slice(0, 100).toLowerCase()),
  );
  return (
    <main id="main" className="container">
      <div className="page-head">
        <div>
          <p className="eyebrow">CLOSE TO CAMPUS</p>
          <h1>Local businesses</h1>
          <p>Discover the people and services around you.</p>
        </div>
      </div>
      <Search placeholder="Search businesses and services…" action="/businesses" value={q} />
      {failed ? (
        <ErrorMessage message="Businesses couldn’t be loaded. Please try again shortly." />
      ) : found.length ? (
        <div className="business-grid">
          {found.map((b) => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={q ? 'No businesses match that search.' : 'Your local directory is taking shape.'}
          message="Approved campus businesses will appear here with their profiles and available adverts."
          action={false}
        />
      )}
      <div className="feature-band">
        <div>
          <h2>Run a campus business?</h2>
          <p>Create a profile and help students find you.</p>
        </div>
        <Link href="/my-business" className="btn secondary">
          Create your profile →
        </Link>
      </div>
    </main>
  );
}
