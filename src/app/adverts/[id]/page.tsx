import Link from 'next/link';
import { advertDetail, listAdverts } from '@/server/discovery';
import { AppError } from '@/server/errors';
import { AdvertDetail } from '@/components/advert-detail';
import { ListingGrid } from '@/components/listings';
import { EmptyState } from '@/components/ui';
import { Icon } from '@/components/icon';
import { BrowseBack } from '@/components/browse-link';
import type { Listing } from '@/lib/market';
export const metadata = { title: 'Advert details' };
export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let advert: Awaited<ReturnType<typeof advertDetail>>;
  try {
    advert = await advertDetail(id);
  } catch (e) {
    const unavailable =
      (e instanceof AppError && e.status === 404) || (e instanceof Error && e.name === 'ZodError');
    return (
      <main id="main" className="container">
        <EmptyState
          title={
            unavailable ? 'This advert is no longer available.' : 'We couldn’t load this advert.'
          }
          message={
            unavailable
              ? 'It may have expired, been withdrawn or is awaiting approval. Explore other finds around campus.'
              : 'Please try again shortly.'
          }
        />
      </main>
    );
  }
  let related: Listing[] = [];
  try {
    const r = await listAdverts({ category: advert.data.categoryId, limit: 5 });
    related = r.items.filter((a) => a.id !== id).slice(0, 4) as unknown as Listing[];
  } catch {}
  return (
    <main id="main" className="container detail-bottom-space">
      <div className="breadcrumbs">
        <BrowseBack />
      </div>
      <AdvertDetail advert={JSON.parse(JSON.stringify(advert)) as Listing} />
      {related.length ? (
        <section className="section">
          <div className="section-head">
            <h2>You might also like</h2>
            <Link className="text-link" href="/explore">
              View all <Icon name="arrow" />
            </Link>
          </div>
          <ListingGrid items={related} />
        </section>
      ) : null}
    </main>
  );
}
