'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Dialog } from './ui';
import { Icon } from './icon';
import { parseMoney, type Category } from '@/lib/market';
export function Filters({
  categories,
  params,
}: {
  categories: Category[];
  params: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const next = new URLSearchParams();
    if (params.q) next.set('q', params.q);
    if (params.business) next.set('business', params.business);
    for (const key of ['category', 'kind', 'condition', 'location', 'sort']) {
      const v = String(data.get(key) ?? '').trim();
      if (v) next.set(key, v);
    }
    for (const key of ['min', 'max']) {
      const v = String(data.get(key) ?? '').trim();
      if (v) {
        const n = parseMoney(v);
        if (n === null) {
          setError('Use a valid price with up to two decimal places.');
          return;
        }
        next.set(key, String(n));
      }
    }
    if (next.has('min') && next.has('max') && Number(next.get('min')) > Number(next.get('max'))) {
      setError('Minimum price must not exceed maximum.');
      return;
    }
    setError('');
    setOpen(false);
    startTransition(() => router.push(`/explore?${next}`));
  }
  const fields = (
    <>
      <fieldset className="filter-group">
        <legend>Category</legend>
        <select
          aria-label="Category"
          name="category"
          className="field-input"
          defaultValue={params.category ?? ''}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </fieldset>
      <fieldset className="filter-group">
        <legend>Listing type</legend>
        <select
          aria-label="Listing type"
          name="kind"
          className="field-input"
          defaultValue={params.kind ?? ''}
        >
          <option value="">All types</option>
          <option value="product">Items</option>
          <option value="service">Services</option>
          <option value="wanted">Wanted</option>
        </select>
      </fieldset>
      <fieldset className="filter-group">
        <legend>Price (GH₵)</legend>
        <div className="field-inline">
          <input
            aria-label="Minimum price in Ghana cedis"
            name="min"
            inputMode="decimal"
            placeholder="Min"
            className="field-input"
            defaultValue={params.min ? Number(params.min) / 100 : ''}
          />
          <input
            aria-label="Maximum price in Ghana cedis"
            name="max"
            inputMode="decimal"
            placeholder="Max"
            className="field-input"
            defaultValue={params.max ? Number(params.max) / 100 : ''}
          />
        </div>
      </fieldset>
      <fieldset className="filter-group">
        <legend>Condition</legend>
        <select
          aria-label="Condition"
          name="condition"
          className="field-input"
          defaultValue={params.condition ?? ''}
        >
          <option value="">Any condition</option>
          <option value="new">New</option>
          <option value="used">Used</option>
          <option value="not_applicable">Not applicable</option>
        </select>
      </fieldset>
      <fieldset className="filter-group">
        <legend>Location</legend>
        <input
          aria-label="Campus location"
          name="location"
          className="field-input"
          placeholder="Anywhere around campus"
          defaultValue={params.location ?? ''}
          maxLength={120}
        />
      </fieldset>
      <fieldset className="filter-group">
        <legend>Sort by</legend>
        <select
          aria-label="Sort results"
          name="sort"
          className="field-input"
          defaultValue={params.sort ?? 'fresh'}
        >
          <option value="fresh">Newest first</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="trending">Trending</option>
        </select>
      </fieldset>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? 'Updating…' : 'Apply filters'} <Icon name="arrow" />
      </button>
    </>
  );
  return (
    <>
      <div id="filters" className="mobile-filters">
        <button className="chip" onClick={() => setOpen(true)}>
          <Icon name="filter" />
          Filters & sort
        </button>
        <span className="chip">
          {params.sort === 'price_asc'
            ? 'Lowest price'
            : params.sort === 'price_desc'
              ? 'Highest price'
              : params.sort === 'trending'
                ? 'Trending'
                : 'Newest first'}
        </span>
        {Object.keys(params).some((k) => !['q', 'cursor', 'sort', 'limit'].includes(k)) ? (
          <Link className="text-link" href="/explore">
            Clear filters
          </Link>
        ) : null}
      </div>
      <aside className="filter-sidebar">
        <div className="filter-title">
          <h3>Filters</h3>
          <Link href="/explore" className="text-link">
            Reset
          </Link>
        </div>
        <form onSubmit={submit}>{fields}</form>
      </aside>
      {open ? (
        <Dialog title="Filters & sort" onClose={() => setOpen(false)}>
          <form onSubmit={submit}>{fields}</form>
        </Dialog>
      ) : null}
    </>
  );
}
