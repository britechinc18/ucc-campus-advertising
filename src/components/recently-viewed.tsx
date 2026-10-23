'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { savedIds } from './bookmark-button';
import { ListingGrid } from './listings';
import { FlyerGrid } from './campus';
import { EmptyState, ErrorMessage, Loading } from './ui';
import { isFlyer } from '@/lib/campus';
import type { Listing } from '@/lib/market';
const key = 'medstash:recent:v1';
const event = 'medstash:recent-change';
function snapshot() {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(event, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(event, callback);
  };
}
function write(ids: string[]) {
  localStorage.setItem(key, JSON.stringify(ids.slice(0, 30)));
  window.dispatchEvent(new Event(event));
}
export function rememberAdvert(id: string) {
  try {
    write([id, ...savedIds(snapshot()).filter((value) => value !== id)]);
  } catch {
    /* Browsing still works with storage disabled. */
  }
}
export function RecentlyViewed() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => '');
  const ids = savedIds(raw).slice(0, 30);
  const requestKey = ids.join(',');
  const [result, setResult] = useState<{
    key: string;
    items: Listing[];
    unavailable: string[];
    error?: string;
  } | null>(null);
  const [clearError, setClearError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve().then(async () => {
      try {
        let data = { items: [] as Listing[], unavailable: [] as string[] };
        if (requestKey) {
          const response = await fetch(`/api/v1/saved?ids=${encodeURIComponent(requestKey)}`, {
            signal: controller.signal,
          });
          if (!response.ok)
            throw Error('Could not load recently viewed adverts. Please try again.');
          data = await response.json();
        }
        if (!controller.signal.aborted) setResult({ key: requestKey, ...data });
      } catch (e) {
        if (!controller.signal.aborted)
          setResult({
            key: requestKey,
            items: [],
            unavailable: [],
            error: e instanceof Error ? e.message : 'Could not load history.',
          });
      }
    });
    return () => controller.abort();
  }, [requestKey]);
  return (
    <>
      <div className="page-head">
        <h1 className="recent-page-title">Recently viewed</h1>
        {ids.length ? (
          <button
            className="btn secondary"
            onClick={() => {
              try {
                write([]);
                setClearError('');
              } catch {
                setClearError('This browser could not clear your history.');
              }
            }}
          >
            Clear history
          </button>
        ) : null}
      </div>
      {clearError ? <ErrorMessage message={clearError} /> : null}
      {result?.key !== requestKey ? (
        <Loading label="Loading recent adverts…" />
      ) : result.error ? (
        <ErrorMessage message={result.error} />
      ) : !ids.length ? (
        <EmptyState
          title="Your discoveries start here."
          message="Open an advert or flyer and you’ll find it here later."
        />
      ) : (
        <>
          {result.unavailable.length ? (
            <p className="inline-notice">
              {result.unavailable.length} recently viewed advert(s) are no longer available.
            </p>
          ) : null}
          <ListingGrid items={result.items.filter((a) => !isFlyer(a.data.kind))} />
          <FlyerGrid items={result.items.filter((a) => isFlyer(a.data.kind))} />
        </>
      )}
    </>
  );
}
