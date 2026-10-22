'use client';
import { useState } from 'react';
import type { Category } from '@/lib/market';
import { SearchInput } from './search-input';
import { Icon } from './icon';
export function HomeSearch({ categories }: { categories: Category[] }) {
  const [selected, setSelected] = useState('');
  return (
    <section className="home-search-band" aria-label="Find an advert">
      <form action="/explore" method="get" role="search">
        <div className="home-search-input">
          <Icon name="search" />
          <label className="sr-only" htmlFor="market-search">
            Search the marketplace
          </label>
          <SearchInput
            id="market-search"
            value=""
            placeholder="Search books, gadgets, rooms, services…"
          />
        </div>
        <div className="home-category-select">
          <Icon name="filter" />
          <label className="sr-only" htmlFor="home-category">
            Filter by category
          </label>
          <select
            id="home-category"
            name="category"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button className="btn" type="submit" aria-label="Search listings">
          <span>Search</span>
          <Icon name="arrow" />
        </button>
      </form>
      <span className="home-search-place">
        <Icon name="pin" />
        Cape Coast, Ghana
      </span>
      {selected ? (
        <p className="home-search-selection" role="status">
          Searching in {categories.find((c) => c.id === selected)?.name}
        </p>
      ) : null}
    </section>
  );
}
