import { SearchInput } from './search-input';
import Link from 'next/link';
import { SaveButton } from './bookmark-button';
import { Icon } from './icon';
import { MediaImage } from './ui';
import { ListingLink } from './browse-link';
import { priceText, dateText, type Listing, type Category } from '@/lib/market';
export function ListingCard({ advert, featured = false }: { advert: Listing; featured?: boolean }) {
  const d = advert.data;
  return (
    <article className="listing">
      <ListingLink className="listing-link" href={`/adverts/${advert.id}`}>
        <div className="listing-photo">
          <MediaImage variant="card" key={d.mediaIds[0]} id={d.mediaIds[0]} alt={d.title} />
          {d.condition !== 'not_applicable' ? (
            <span className="condition-badge">{d.condition === 'new' ? 'New' : 'Used'}</span>
          ) : null}
          {featured ? (
            <span className="photo-tag">FEATURED</span>
          ) : d.kind === 'wanted' ? (
            <span className="photo-tag">WANTED</span>
          ) : null}
        </div>
        <p className="listing-category">
          {advert.category_name ??
            (d.kind === 'service' ? 'Services' : d.kind === 'wanted' ? 'Wanted' : 'Campus finds')}
        </p>
        <h3 className="listing-title">{d.title}</h3>
        <p className="price">{priceText(d)}</p>
        <div className="meta listing-meta">
          <span className="listing-location">
            <Icon name="pin" />
            <span>{d.location}</span>
          </span>
          <time dateTime={new Date(advert.published_at).toISOString()}>
            {dateText(advert.published_at)}
          </time>
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
  id,
  value = '',
  placeholder = 'Search phones, books, services…',
  action = '/explore',
  params = {},
}: {
  id?: string;
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
      <label
        className="sr-only"
        htmlFor={id ?? (action.startsWith('/campus-360') ? 'campus-search' : 'market-search')}
      >
        {action.startsWith('/campus-360') ? 'Search Campus 360' : 'Search the marketplace'}
      </label>
      <SearchInput
        id={id ?? (action.startsWith('/campus-360') ? 'campus-search' : 'market-search')}
        value={value}
        placeholder={placeholder}
      />
      <button className="btn" type="submit">
        Search <Icon name="arrow" />
      </button>
    </form>
  );
}
export function CategoryChips({
  categories,
  selected,
  params = {},
}: {
  categories: Category[];
  selected?: string;
  params?: Record<string, string>;
}) {
  const categoryHref = (id?: string) => {
    const next = new URLSearchParams(params);
    next.delete('cursor');
    if (id) next.set('category', id);
    else next.delete('category');
    return `/explore?${next}`;
  };
  return (
    <div className="categories" aria-label="Categories">
      <Link
        className="chip category-tile"
        href={categoryHref()}
        aria-current={!selected ? 'page' : undefined}
      >
        <Icon name="grid" />
        <span>All</span>
      </Link>
      {categories.map((c) => (
        <Link
          key={c.id}
          className="chip category-tile"
          href={categoryHref(c.id)}
          aria-current={selected === c.id ? 'page' : undefined}
        >
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
