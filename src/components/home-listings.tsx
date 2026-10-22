import { ListingCard } from './listings';
import { initials, type Listing } from '@/lib/market';
function listingAge(value: string) {
  const date = Date.parse(value);
  if (!Number.isFinite(date)) return null;
  const days = Math.max(0, Math.floor((Date.now() - date) / 86400000));
  return days === 0
    ? 'Today'
    : days === 1
      ? 'Yesterday'
      : days < 30
        ? `${days} days ago`
        : new Intl.DateTimeFormat('en-GH', {
            day: 'numeric',
            month: 'short',
            timeZone: 'Africa/Accra',
          }).format(new Date(date));
}
export function HomeListings({ items }: { items: Listing[] }) {
  const hasDemos = items.some((a) => /\bdemo\b/i.test(a.data.title + ' ' + a.data.description));
  return (
    <>
      <div className="home-listing-grid">
        {items.map((advert) => {
          const demo = /\bdemo\b/i.test(advert.data.title + ' ' + advert.data.description);
          const age = listingAge(advert.published_at);
          return (
            <div className="home-listing-card" key={advert.id}>
              <ListingCard advert={advert} />
              {demo ? <span className="home-demo-tag">Demo</span> : null}
              <div className="home-seller">
                <span className="home-seller-initial" aria-hidden="true">
                  {initials(advert.seller)}
                </span>
                <span>{advert.seller}</span>
                {age ? <time dateTime={advert.published_at}>{age}</time> : null}
              </div>
            </div>
          );
        })}
      </div>
      {hasDemos ? (
        <p className="home-demo-note">Listings marked Demo are examples and are not for sale.</p>
      ) : null}
    </>
  );
}
