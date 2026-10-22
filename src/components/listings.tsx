import Link from 'next/link';
import { SaveButton } from './bookmark-button';
import { Icon } from './icon';
import { MediaImage } from './ui';
import { ListingLink } from './browse-link';
import { priceText, type Listing, type Category } from '@/lib/market';
export function ListingCard({ advert, featured = false }: { advert: Listing; featured?: boolean }) {
  const d = advert.data;
  return (
    <article className="listing">
      <ListingLink className="listing-link" href={`/adverts/${advert.id}`}>
        <div className="listing-photo">
          <MediaImage key={d.mediaIds[0]} id={d.mediaIds[0]} alt={d.title} />
          {featured ? (
            <span className="photo-tag">FEATURED</span>
          ) : d.kind === 'wanted' ? (
            <span className="photo-tag">WANTED</span>
          ) : null}
        </div>
        <h3 className="listing-title">{d.title}</h3>
        <p className="price">{priceText(d)}</p>
        <div className="meta">
          <span>
            {d.kind === 'product'
              ? d.condition === 'new'
                ? 'New'
                : 'Used'
              : d.kind === 'service'
                ? 'Service'
                : 'Wanted'}
          </span>
          <span className="dot" />
          <span>{d.location}</span>
        </div>
      </ListingLink>
      <SaveButton id={advert.id} title={d.title} />
    </article>
  );
}
export function ListingGrid({ items, featured = false }: { items: Listing[]; featured?: boolean }) {
  return (
    <div className="listing-grid">
      {items.map((advert) => (
        <ListingCard key={advert.id} advert={advert} featured={featured} />
      ))}
    </div>
  );
}
export function Search({
  value = '',
  placeholder = 'Search phones, books, services…',
  action = '/explore',
  params = {},
}: {
  value?: string;
  placeholder?: string;
  action?: string;
  params?: Record<string, string>;
}) {
  return (
    <form className="search" action={action} method="get" role="search">
      {Object.entries(params)
        .filter(([key]) => !['q', 'cursor'].includes(key))
        .map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
      <Icon name="search" />
      <label className="sr-only" htmlFor="market-search">
        Search the marketplace
      </label>
      <input
        id="market-search"
        type="search"
        name="q"
        defaultValue={value}
        placeholder={placeholder}
        maxLength={100}
      />
      <button className="btn" type="submit">
        Search <Icon name="arrow" />
      </button>
    </form>
  );
}
export function CategoryChips({ categories }: { categories: Category[] }) {
  return (
    <div className="categories" aria-label="Categories">
      {categories.map((c) => (
        <Link key={c.id} className="chip category-tile" href={`/explore?category=${c.id}`}>
          <Icon
            name={
              /book/i.test(c.name)
                ? 'book'
                : /food/i.test(c.name)
                  ? 'food'
                  : /fashion/i.test(c.name)
                    ? 'shirt'
                    : /electronic/i.test(c.name)
                      ? 'laptop'
                      : /service/i.test(c.name)
                        ? 'tools'
                        : /accommodation|housing/i.test(c.name)
                          ? 'home'
                          : 'bag'
            }
          />
          <span>
            {/book/i.test(c.name)
              ? 'Books'
              : /accommodation|housing/i.test(c.name)
                ? 'Housing'
                : /clothing|fashion/i.test(c.name)
                  ? 'Fashion'
                  : /electronic/i.test(c.name)
                    ? 'Tech'
                    : /food/i.test(c.name)
                      ? 'Food'
                      : c.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
