import Link from 'next/link';
import { listBusinesses } from '@/server/businesses';
import { BusinessCard } from './businesses';
import { Search } from './listings';
import { EmptyState, ErrorMessage } from './ui';
import type { Business } from '@/lib/market';
export async function BusinessDirectory({
  q = '',
  offset = 0,
  action = '/businesses',
}: {
  q?: string;
  offset?: number;
  action?: string;
}) {
  let businesses: Business[] = [];
  try {
    businesses = (await listBusinesses(undefined, q, offset)) as Business[];
  } catch {
    return <ErrorMessage message="Businesses couldn’t be loaded. Please try again shortly." />;
  }
  const link = (next: number) =>
    `${action}?${new URLSearchParams({ offset: String(next), ...(q ? { q } : {}) })}`;
  return (
    <>
      <Search action={action} value={q} placeholder="Search businesses and services…" />
      <p className="directory-intro">Discover the people and services around you.</p>
      {businesses.length ? (
        <div className="business-grid">
          {businesses.map((b) => (
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
      <div className="form-actions">
        {offset ? (
          <Link className="btn secondary" href={link(Math.max(0, offset - 50))}>
            Previous businesses
          </Link>
        ) : null}
        {businesses.length === 50 ? (
          <Link className="btn secondary" href={link(offset + 50)}>
            More businesses →
          </Link>
        ) : null}
      </div>
    </>
  );
}
