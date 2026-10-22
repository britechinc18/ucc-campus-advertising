'use client';
import { useSyncExternalStore, useState } from 'react';
import { Icon } from './icon';
const key = 'medstash:saved:v1';
const changed = 'medstash:saved-change';
const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function snapshot() {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(changed, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(changed, callback);
  };
}
export function savedIds(raw: string): string[] {
  try {
    const ids = JSON.parse(raw);
    return Array.isArray(ids)
      ? [
          ...new Set(ids.filter((id): id is string => typeof id === 'string' && validId.test(id))),
        ].slice(0, 40)
      : [];
  } catch {
    return [];
  }
}
export function writeSaved(ids: string[]) {
  localStorage.setItem(key, JSON.stringify(ids));
  window.dispatchEvent(new Event(changed));
}
export function useSavedSnapshot() {
  return useSyncExternalStore(subscribe, snapshot, () => '');
}
export function SaveButton({ id, title }: { id: string; title: string }) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => '');
  const ids = savedIds(raw),
    saved = ids.includes(id);
  const [error, setError] = useState('');
  return (
    <div className="save-control">
      <button
        type="button"
        className={`save-button ${saved ? 'is-saved' : ''}`}
        aria-label={`${saved ? 'Unsave' : 'Save'} advert: ${title}`}
        aria-pressed={saved}
        onClick={() => {
          try {
            if (!saved && ids.length >= 40)
              throw Error('You can save up to 40 adverts on this device. Remove one first.');
            writeSaved(saved ? ids.filter((v) => v !== id) : [...ids, id]);
            setError('');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Saving is unavailable in this browser.');
          }
        }}
      >
        <Icon name="heart" />
      </button>
      {error ? (
        <span className="save-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
