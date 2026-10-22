import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { listAdverts } from '@/server/discovery';
import { query } from '@/server/store';
import { db } from '@/server/db';
import { ListingGrid, Search } from '@/components/listings';
import { Filters } from '@/components/filters';
import { EmptyState, ErrorMessage } from '@/components/ui';
import type { Category, Listing } from '@/lib/market';
export const metadata = { title: 'Explore adverts' };
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
  const next = new URLSearchParams(params);
  if (result?.nextCursor) next.set('cursor', result.nextCursor);
  return (
    <main id="main" className="container explore-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">DISCOVER ON CAMPUS</p>
          <h1>Explore adverts</h1>
          <p>Good finds, useful services and wanted items.</p>
        </div>
      </div>
      <Search value={params.q} />
      <div className="explore-layout">
        <Filters key={JSON.stringify(params)} categories={categories} params={params} />
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
              message="Try a different search or clear a filter. New adverts appear after approval."
            />
          )}
        </section>
      </div>
    </main>
  );
}
