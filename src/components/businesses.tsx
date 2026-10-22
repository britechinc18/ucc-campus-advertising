import Link from 'next/link';
import { MediaImage } from './ui';
import { Icon } from './icon';
import { initials, type Business } from '@/lib/market';
export function BusinessCard({ business: b }: { business: Business }) {
  return (
    <article className="panel business-card">
      <div className="business-logo">
        {b.approved.logoMediaId ? (
          <MediaImage id={b.approved.logoMediaId} alt={`${b.name} logo`} />
        ) : (
          initials(b.name)
        )}
      </div>
      <h2>{b.name}</h2>
      <p>{b.approved.location}</p>
      <p>
        {b.approved.description.slice(0, 150)}
        {b.approved.description.length > 150 ? '…' : ''}
      </p>
      <Link className="text-link" href={`/businesses/${b.slug}`}>
        View business <Icon name="arrow" />
      </Link>
    </article>
  );
}
