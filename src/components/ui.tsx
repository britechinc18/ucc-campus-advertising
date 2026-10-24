'use client';
/* eslint-disable @next/next/no-img-element -- Visibility-checked media uses native images and private revalidation. */
import { useState, useRef, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from './icon';
export function MediaImage({
  id,
  alt,
  className = '',
  variant = 'full',
  ...rest
}: {
  id?: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  variant?: 'card' | 'full';
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return id && !failed ? (
    <img
      src={`/api/v1/media/${id}${variant === 'card' ? '?width=720' : ''}`}
      srcSet={
        variant === 'card'
          ? `/api/v1/media/${id}?width=360 360w, /api/v1/media/${id}?width=720 720w`
          : undefined
      }
      sizes={
        variant === 'card'
          ? '(max-width: 360px) calc((100vw - 42px) / 2), (max-width: 599px) calc((100vw - 53px) / 2), (max-width: 1023px) calc((100vw - 100px) / 3), (max-width: 1330px) calc((100vw - 162px) / 4), 292px'
          : undefined
      }
      alt={alt}
      className={`${className} media-image ${loaded ? 'is-loaded' : 'is-loading'}`}
      onLoad={() => setLoaded(true)}
      loading={rest.loading ?? 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  ) : (
    <div
      className={`image-placeholder ${className}`}
      role="img"
      aria-label={alt || 'No photograph'}
    >
      <Icon name="bag" />
      <span>No photo</span>
    </div>
  );
}
export function Dialog({
  title,
  children,
  onClose,
  initialFocus,
  className = '',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  initialFocus?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    if (initialFocus) d?.querySelector<HTMLElement>(initialFocus)?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      d?.close();
      document.body.style.overflow = previous;
    };
  }, [initialFocus]);
  return (
    <dialog
      ref={ref}
      className={`app-dialog ${className}`}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="sheet-head">
        <h2 id="dialog-title">{title}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function EmptyState({
  title = 'No finds just yet.',
  message = 'Fresh adverts will appear here as they are published.',
  action = true,
}: {
  title?: string;
  message?: string;
  action?: boolean;
}) {
  return (
    <section className="empty-state">
      <div className="empty-icon">
        <Icon name="search" />
      </div>
      <h2>{title}</h2>
      <p>{message}</p>
      {action ? (
        <Link className="btn secondary" href="/explore">
          Explore all adverts <Icon name="arrow" />
        </Link>
      ) : null}
    </section>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="inline-notice error-notice" role="alert">
      <Icon name="info" />
      <span>{message}</span>
    </div>
  );
}
export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="loading-dot" />
      {label}
    </div>
  );
}
export function SafeNote() {
  return (
    <div className="safe-note">
      <Icon name="shield" />
      <div>
        <strong>Meet safely. Check before you pay.</strong>Meet in a public place and inspect the
        item. Never send money before you are satisfied.
      </div>
    </div>
  );
}
