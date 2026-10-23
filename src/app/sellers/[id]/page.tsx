import Link from 'next/link';
import { notFound } from 'next/navigation';
import { publicSeller } from '@/server/discovery';
import { AppError } from '@/server/errors';
import { MediaImage } from '@/components/ui';
import { ListingGrid } from '@/components/listings';
import { SocialProfiles } from '@/components/social-profiles';
import { initials, type Listing } from '@/lib/market';
export const metadata = { title: 'Seller adverts' };
export default async function SellerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { id } = await params;
  const { cursor } = await searchParams;
  let result: Awaited<ReturnType<typeof publicSeller>>;
  try {
    result = await publicSeller(id, cursor);
  } catch (error) {
    if (
      (error instanceof AppError && error.status === 404) ||
      (error instanceof Error && error.name === 'ZodError')
    )
      notFound();
    throw error;
  }
  return (
    <main id="main" className="container seller-page">
      <Link className="text-link" href="/explore">
        ← Market
      </Link>
      <header className="seller-profile-heading">
        <div className="avatar">
          {result.seller.photoMediaId ? (
            <MediaImage id={result.seller.photoMediaId} alt={result.seller.name} />
          ) : (
            initials(result.seller.name)
          )}
        </div>
        <div>
          <h1>{result.seller.name}</h1>
          <p>{result.seller.kind === 'business' ? 'Business' : 'Seller'}</p>
        </div>
      </header>
      {result.seller.bio ? <p className="description">{result.seller.bio}</p> : null}
      <SocialProfiles
        socials={
          result.seller.socials ??
          result.items.find((item) => item.data.socials && Object.keys(item.data.socials).length)
            ?.data.socials
        }
      />
      <section className="section" aria-labelledby="seller-adverts">
        <div className="section-head">
          <h2 id="seller-adverts">Adverts from this seller</h2>
        </div>
        <ListingGrid items={result.items as unknown as Listing[]} />
        {result.nextCursor ? (
          <Link
            className="btn secondary"
            href={`/sellers/${id}?${new URLSearchParams({ cursor: result.nextCursor })}`}
          >
            More adverts
          </Link>
        ) : null}
      </section>
    </main>
  );
}
