import Link from 'next/link';
import type { Metadata } from 'next';
import { cache } from 'react';
import { sharingMetadata } from '@/server/sharing';
import { advertDetail, listAdverts } from '@/server/discovery';
import { AppError } from '@/server/errors';
import { AdvertDetail } from '@/components/advert-detail';
import { FlyerGrid } from '@/components/campus';
import { isFlyer, campusCategories } from '@/lib/campus';
import { ListingGrid } from '@/components/listings';
import { EmptyState } from '@/components/ui';
import { Icon } from '@/components/icon';
import { BrowseBack } from '@/components/browse-link';
import type { Listing } from '@/lib/market';
const publicAdvert = cache(advertDetail);
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const a = await publicAdvert((await params).id);
    return sharingMetadata(
      a.data.title,
      a.data.description,
      `/adverts/${a.id}`,
      a.data.mediaIds[0],
    );
  } catch {
    return {
      title: 'Advert unavailable',
      robots: { index: false, follow: false },
      openGraph: { title: 'Advert unavailable', images: [] },
      twitter: { card: 'summary', images: [] },
    };
  }
}
export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let advert: Awaited<ReturnType<typeof advertDetail>>;
  try {
    advert = await publicAdvert(id);
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
    const r = await listAdverts(
      isFlyer(advert.data.kind)
        ? { surface: 'campus', kind: advert.data.kind, limit: 5 }
        : { category: advert.data.categoryId, limit: 5 },
    );
    related = r.items.filter((a) => a.id !== id).slice(0, 4) as unknown as Listing[];
  } catch {}
  return (
    <main id="main" className="container detail-bottom-space">
      <div className="breadcrumbs">
        {isFlyer(advert.data.kind) ? (
          <Link
            aria-label="Back to Campus 360"
            href={`/campus-360/${campusCategories.find((c) => c.kind === advert.data.kind)?.slug ?? ''}`}
          >
            <Icon name="back" />
            <span className="browse-back-label">Campus 360</span>
          </Link>
        ) : (
          <BrowseBack />
        )}
      </div>
      <AdvertDetail key={advert.id} advert={JSON.parse(JSON.stringify(advert)) as Listing} />
      {related.length ? (
        <section className="section">
          <div className="section-head">
            <h2>You might also like</h2>
            <Link className="text-link" href="/explore">
              View all <Icon name="arrow" />
            </Link>
          </div>
          {isFlyer(advert.data.kind) ? (
            <FlyerGrid items={related} />
          ) : (
            <ListingGrid items={related} />
          )}
        </section>
      ) : null}
    </main>
  );
}
