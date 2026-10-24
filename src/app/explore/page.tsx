import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { listAdverts } from '@/server/discovery';
import { query } from '@/server/store';
import { db } from '@/server/db';
import { ListingGrid, Search, CategoryChips } from '@/components/listings';
import { Filters } from '@/components/filters';
import { EmptyState, ErrorMessage } from '@/components/ui';
import type { Category, Listing } from '@/lib/market';
export const metadata = { title: 'Market' };
export default async function Explore({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params: Record<string, string> = {};
  for (const k of [
    'q',
    'category',
    'kind',
    'condition',
    'location',
    'business',
    'min',
    'max',
    'sort',
    'cursor',
  ])
    if (typeof raw[k] === 'string' && raw[k]) params[k] = raw[k];
  let categories: Category[] = [];
  let result: Awaited<ReturnType<typeof listAdverts>> | null = null;
  let message = '';
  try {
    [categories, result] = await Promise.all([
      query<Category>(db(), sql`select id,name,slug from categories where active order by name`),
      listAdverts({ ...params, limit: 20 }),
    ]);
  } catch (e) {
    message =
      e instanceof Error && e.name === 'ZodError'
        ? 'Some filters are invalid. Clear the filters and try again.'
        : 'We couldn’t load adverts. Please try again shortly.';
  }
  const selectedCategory = categories.find((c) => c.id === params.category);
  const activeFilters = Object.entries(params).filter(
    ([key]) => !['cursor', 'sort', 'q'].includes(key),
  );
  const next = new URLSearchParams(params);
  if (result?.nextCursor) next.set('cursor', result.nextCursor);
  return (
    <main id="main" className="container explore-page">
      <div className="page-head">
        <div>
          <h1>{selectedCategory?.name ?? 'Market'}</h1>
        </div>
      </div>
      <Filters
        key={JSON.stringify(params)}
        categories={categories}
        params={params}
        search={<Search value={params.q} params={params} />}
      />
      <CategoryChips categories={categories} selected={params.category} params={params} />
      {activeFilters.length ? (
        <nav className="filter-active" aria-label="Active filters">
          {activeFilters.map(([key, value]) => {
            const remaining = new URLSearchParams(
              Object.entries(params).filter(([k]) => k !== key && k !== 'cursor'),
            );
            const label =
              key === 'category'
                ? (selectedCategory?.name ?? 'Category')
                : key === 'min' || key === 'max'
                  ? `${key === 'min' ? 'From' : 'Up to'} GH₵${(Number(value) / 100).toFixed(2)}`
                  : `${key}: ${value.replaceAll('_', ' ')}`;
            return (
              <Link
                className="chip"
                key={key}
                href={`/explore?${remaining}`}
                aria-label={`Remove ${label} filter`}
              >
                {label}
                <span aria-hidden="true">×</span>
              </Link>
            );
          })}
          <Link className="text-link" href="/explore">
            Clear all
          </Link>
        </nav>
      ) : null}
      <div className="explore-layout">
        <section className="explore-results" aria-label="Search results">
          <div className="results-head">
            <span>
              {result?.items.length ?? 0} adverts on this page{params.q ? ` for “${params.q}”` : ''}
            </span>
            {params.cursor ? (
              <Link
                className="text-link"
                href={`/explore?${new URLSearchParams(Object.entries(params).filter(([k]) => k !== 'cursor'))}`}
              >
                Back to first page
              </Link>
            ) : null}
          </div>
          {message ? (
            <>
              <ErrorMessage message={message} />
              <Link className="text-link" href="/explore">
                Clear filters and retry
              </Link>
            </>
          ) : result?.items.length ? (
            <>
              <ListingGrid items={result.items as unknown as Listing[]} />
              {result.nextCursor ? (
                <div className="load-more">
                  <Link className="btn secondary" href={`/explore?${next}`}>
                    Next adverts →
                  </Link>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState
              title="No matches just yet."
              message="Try a different search or clear a filter. New adverts appear when sellers publish them."
            />
          )}
        </section>
      </div>
    </main>
  );
}
