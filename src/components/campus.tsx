import Link from 'next/link';
import { MediaImage } from './ui';
import { Icon } from './icon';
import { SaveButton } from './bookmark-button';
import { campusCategories, kindName } from '@/lib/campus';
import { dateText, type Listing } from '@/lib/market';
export function CampusBanners() {
  return (
    <div className="campus-banners">
      {campusCategories.map((c) => (
        <Link
          href={`/campus-360/${c.slug}`}
          key={c.slug}
          className={`campus-banner campus-${c.art}`}
        >
          <div className="banner-art" aria-hidden="true">
            <Icon name={c.icon} />
            <span />
            <i />
          </div>
          <div className="banner-copy">
            <h2>{c.name}</h2>
            <p>{c.description}</p>
          </div>
          <Icon name="arrow" className="banner-arrow" />
        </Link>
      ))}
    </div>
  );
}
export function FlyerGrid({ items, compact = false }: { items: Listing[]; compact?: boolean }) {
  return (
    <div className="flyer-grid">
      {items.map((a) => (
        <article className={`flyer-card${compact ? ' compact-flyer' : ''}`} key={a.id}>
          <Link href={`/adverts/${a.id}`} className="flyer-link" aria-label={a.data.title}>
            <div className="flyer-art">
              <MediaImage
                variant="card"
                id={a.data.mediaIds[0]}
                alt={`${a.data.title} — advertiser supplied flyer`}
              />
            </div>
            {!compact ? (
              <div className="flyer-copy">
                <p className="eyebrow">{kindName(a.data.kind)}</p>
                <h3>{a.data.title}</h3>
                <p>
                  {a.data.details?.startsAt ? dateText(a.data.details.startsAt) : a.data.location}
                </p>
                <span className="meta">{a.seller}</span>
              </div>
            ) : null}
          </Link>
          {compact ? (
            <div className="flyer-caption">
              <span className="flyer-kind">{kindName(a.data.kind)}</span>
              <Link href={`/sellers/${a.advertiser_id}`}>{a.seller}</Link>
              <time dateTime={new Date(a.published_at).toISOString()}>
                {dateText(a.published_at)}
              </time>
            </div>
          ) : null}
          <SaveButton id={a.id} title={a.data.title} />
        </article>
      ))}
    </div>
  );
}
