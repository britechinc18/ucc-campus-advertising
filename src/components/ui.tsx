'use client';
/* eslint-disable @next/next/no-img-element -- Visibility-checked private media must bypass image caching. */
import { useState, useRef, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from './icon';
export function MediaImage({
  id,
  alt,
  className = '',
  ...rest
}: {
  id?: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return id && !failed ? (
    <img
      src={`/api/v1/media/${id}`}
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
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      d?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="app-dialog"
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
  message = 'Fresh adverts will appear here as they are approved.',
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
