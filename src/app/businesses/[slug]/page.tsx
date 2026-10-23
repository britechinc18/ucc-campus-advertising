import { SocialProfiles } from '@/components/social-profiles';
import Link from 'next/link';
import { cache } from 'react';
import { sharingMetadata } from '@/server/sharing';
import { businessEnquiry } from '@/lib/enquiries';
import { listBusinesses } from '@/server/businesses';
import { listAdverts } from '@/server/discovery';
import { ListingGrid } from '@/components/listings';
import { EmptyState, MediaImage, SafeNote } from '@/components/ui';
import { Icon } from '@/components/icon';
import { initials, type Business, type Listing } from '@/lib/market';
const publicBusiness = cache(listBusinesses);
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const b = (await publicBusiness((await params).slug)) as Business;
    return sharingMetadata(
      b.name,
      b.approved.description,
      `/businesses/${b.slug}`,
      b.approved.logoMediaId,
    );
  } catch {
    return { title: 'Business unavailable', robots: { index: false }, openGraph: { images: [] } };
  }
}
export default async function BusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { slug } = await params;
  const { cursor } = await searchParams;
  let b: Business;
  let items: Listing[] = [];
  let next: string | null = null;
  try {
    b = (await publicBusiness(slug)) as Business;
    const list = await listAdverts({
      business: b.advertiser_id,
      limit: 20,
      ...(cursor ? { cursor } : {}),
    });
    items = list.items as unknown as Listing[];
    next = list.nextCursor;
  } catch {
    return (
      <main id="main" className="container">
        <EmptyState
          title="This business isn’t available."
          message="Please return to the directory or try again shortly."
          action={false}
        />
        <Link className="text-link" href="/businesses">
          Back to businesses
        </Link>
      </main>
    );
  }
  return (
    <main id="main" className="container">
      <div className="breadcrumbs">
        <Link href="/businesses" className="text-link">
          <Icon name="back" />
          Back to businesses
        </Link>
      </div>
      <section className="business-hero">
        <div className="business-identity">
          <div className="business-logo">
            {b.approved.logoMediaId ? (
              <MediaImage id={b.approved.logoMediaId} alt={`${b.name} logo`} />
            ) : (
              initials(b.name)
            )}
          </div>
          <div>
            <p className="eyebrow">CAMPUS BUSINESS</p>
            <h1>{b.name}</h1>
            <p>{b.approved.location}</p>
          </div>
        </div>
        {b.approved.contactConsent ? (
          <div className="contact-buttons">
            {b.approved.whatsapp ? (
              <a
                className="btn"
                href={`https://wa.me/${b.approved.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(businessEnquiry(b.name, `${process.env.APP_ORIGIN}/businesses/${b.slug}`))}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="chat" />
                WhatsApp
              </a>
            ) : null}
            {b.approved.phone ? (
              <a className="btn secondary" href={`tel:${b.approved.phone}`}>
                <Icon name="phone" />
                Call
              </a>
            ) : null}
          </div>
        ) : null}
      </section>
      <SocialProfiles socials={b.approved.socials} />
      <section className="description">
        <h2>A little about us</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>{b.approved.description}</p>
      </section>
      <section className="section">
        <div className="section-head">
          <h2>Adverts from this business</h2>
        </div>
        {items.length ? (
          <ListingGrid items={items} />
        ) : (
          <EmptyState
            title="No live adverts at the moment."
            message="Check back for new offers from this business."
            action={false}
          />
        )}{' '}
        {next ? (
          <div className="load-more">
            <Link
              className="btn secondary"
              href={`/businesses/${slug}?cursor=${encodeURIComponent(next)}`}
            >
              Next adverts →
            </Link>
          </div>
        ) : null}
      </section>
      <SafeNote />
    </main>
  );
}
