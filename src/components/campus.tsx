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
export function FlyerGrid({ items }: { items: Listing[] }) {
  return (
    <div className="flyer-grid">
      {items.map((a) => (
        <article className="flyer-card" key={a.id}>
          <Link href={`/adverts/${a.id}`} className="flyer-link">
            <div className="flyer-art">
              <MediaImage
                id={a.data.mediaIds[0]}
                alt={`${a.data.title} — advertiser supplied flyer`}
              />
            </div>
            <div className="flyer-copy">
              <p className="eyebrow">{kindName(a.data.kind)}</p>
              <h3>{a.data.title}</h3>
              <p>
                {a.data.details?.startsAt ? dateText(a.data.details.startsAt) : a.data.location}
              </p>
              <span className="meta">{a.seller}</span>
            </div>
          </Link>
          <SaveButton id={a.id} title={a.data.title} />
        </article>
      ))}
    </div>
  );
}
