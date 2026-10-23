import Link from 'next/link';
import type { SellerIdentity } from '@/lib/market';
export function IdentityPicker({
  profiles,
  kind = 'product',
}: {
  profiles: SellerIdentity[];
  kind?: string;
}) {
  return (
    <section className="narrow panel auth-panel">
      <p className="eyebrow">YOUR PUBLIC IDENTITY</p>
      <h1>Who are you posting as?</h1>
      <p>Your advert will show this name. Contacts and images belong to the selected identity.</p>
      <div className="identity-options">
        {profiles.map((p) =>
          p.suspended ? (
            <div className="identity-option" key={p.id}>
              <strong>{p.name}</strong>
              <span>{p.kind === 'business' ? 'Business' : 'Personal'} · Suspended</span>
            </div>
          ) : (
            <Link
              className="identity-option"
              key={p.id}
              href={`/post?${new URLSearchParams({ advertiserId: p.id, kind })}`}
              aria-disabled={p.suspended ? true : undefined}
              tabIndex={p.suspended ? -1 : undefined}
            >
              <strong>{p.name}</strong>
              <span>
                {p.kind === 'business' ? 'Business' : 'Personal'}
                {p.suspended ? ' · Suspended' : ''}
              </span>
            </Link>
          ),
        )}
      </div>
      <Link className="text-link" href="/my-adverts">
        Back to My Ads →
      </Link>
    </section>
  );
}
