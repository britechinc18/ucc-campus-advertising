'use client';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import type { NotificationFeed } from '@/lib/notifications';
import { dateText } from '@/lib/market';
import { Icon } from './icon';

export function Notifications({ scope }: { scope: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const id = useId();
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<NotificationFeed | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch('/api/v1/notifications', {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.json() as Promise<NotificationFeed>;
      })
      .then((data) => {
        setFeed(data);
        setError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [open, retry, scope]);
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) ref.current?.removeAttribute('open');
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && ref.current?.open) {
        ref.current.removeAttribute('open');
        ref.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, []);
  return (
    <details
      className="notification-menu"
      ref={ref}
      onToggle={(e) => {
        const next = e.currentTarget.open;
        setOpen(next);
        if (next) {
          setFeed(null);
          setError(false);
          document.querySelector('.account-menu[open]')?.removeAttribute('open');
        }
      }}
    >
      <summary
        className="icon-btn"
        aria-label="Notifications"
        aria-controls={id}
        aria-expanded={open}
      >
        <Icon name="bell" />
      </summary>
      <section className="notification-panel" id={id} aria-label="Notifications">
        <div className="notification-heading">
          <div>
            <h2>Notifications</h2>
            <p>
              {feed?.audience === 'seller' ? 'Your adverts & campus updates' : 'From around campus'}
            </p>
          </div>
          <button
            className="icon-btn"
            aria-label="Close notifications"
            onClick={() => {
              ref.current?.removeAttribute('open');
              ref.current?.querySelector('summary')?.focus();
            }}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="notification-content" aria-busy={!feed && !error} aria-live="polite">
          {error ? (
            <div className="notification-empty">
              <p role="alert">We couldn’t load your updates.</p>
              <button
                className="btn secondary small"
                onClick={() => {
                  setError(false);
                  setRetry((n) => n + 1);
                }}
              >
                Try again
              </button>
            </div>
          ) : !feed ? (
            <div className="notification-loading">
              <span className="sr-only">Loading notifications</span>
              {[1, 2, 3].map((n) => (
                <div className="skeleton" key={n} />
              ))}
            </div>
          ) : feed.items.length ? (
            <ul>
              {feed.items.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} onClick={() => ref.current?.removeAttribute('open')}>
                    <span className="notification-title">{item.title}</span>
                    <span>{item.message}</span>
                    <time dateTime={item.date}>{dateText(item.date)}</time>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="notification-empty">
              <Icon name="bell" />
              <h3>No updates yet.</h3>
              <p>
                {feed.audience === 'seller'
                  ? 'Approval, review and expiry updates will appear here.'
                  : 'Approved campus announcements will appear here.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </details>
  );
}
