'use client';
import { useEffect, useState } from 'react';
import { savedIds, useSavedSnapshot, writeSaved } from './bookmark-button';
import { ListingGrid } from './listings';
import { FlyerGrid } from './campus';
import { ErrorMessage, Loading } from './ui';
import { isFlyer } from '@/lib/campus';
import type { Listing } from '@/lib/market';
export function SavedPage() {
  const raw = useSavedSnapshot();
  const ids = savedIds(raw);
  const requestKey = ids.join(',');
  const [result, setResult] = useState<{
    key: string;
    items: Listing[];
    unavailable: string[];
    error?: string;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    if (!requestKey) {
      Promise.resolve().then(() => {
        if (!controller.signal.aborted) setResult({ key: requestKey, items: [], unavailable: [] });
      });
      return () => controller.abort();
    }
    fetch(`/api/v1/saved?ids=${encodeURIComponent(requestKey)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw Error('Saved adverts could not be loaded. Please try again.');
        return response.json();
      })
      .then((data) => setResult({ key: requestKey, ...data }))
      .catch((e) => {
        if (!controller.signal.aborted)
          setResult({ key: requestKey, items: [], unavailable: [], error: e.message });
      });
    return () => controller.abort();
  }, [requestKey]);
  const ready = result?.key === requestKey;
  const items = ready ? result.items : [];
  return (
    <>
      <h1 className="sr-only">Saved bookmarks</h1>
      <p className="saved-device-note">
        Bookmarks show on this browser and device. They do not automatically sync.
      </p>
      {!ready ? (
        <Loading label="Checking your saved adverts…" />
      ) : result.error ? (
        <ErrorMessage message={result.error} />
      ) : !ids.length ? null : (
        <>
          {result.unavailable.length ? (
            <div className="inline-notice">
              <div>
                <p>
                  {result.unavailable.length} saved advert(s) are no longer available. They may have
                  expired or been withdrawn.
                </p>
                <button
                  className="text-link"
                  onClick={() => writeSaved(ids.filter((id) => !result.unavailable.includes(id)))}
                >
                  Remove unavailable bookmarks
                </button>
              </div>
            </div>
          ) : null}
          <ListingGrid items={items.filter((a) => !isFlyer(a.data.kind))} />
          <FlyerGrid items={items.filter((a) => isFlyer(a.data.kind))} />
          <button
            className="btn secondary"
            style={{ marginTop: 24 }}
            onClick={() => writeSaved([])}
          >
            Clear saved adverts
          </button>
        </>
      )}
    </>
  );
}
