'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Wordmark, ThemeButton } from './shell';
import { Dialog } from './ui';
import { Icon } from './icon';
export const adminLinks = [
  ['/admin', 'grid', 'Overview'],
  ['/admin/submissions', 'clock', 'Pending queue'],
  ['/admin/adverts', 'list', 'All adverts'],
  ['/admin/reports', 'flag', 'Reports'],
  ['/admin/advertisers', 'users', 'Advertisers'],
  ['/admin/businesses', 'store', 'Businesses'],
  ['/admin/categories', 'grid', 'Categories'],
  ['/admin/settings', 'settings', 'Settings'],
  ['/admin/audit', 'list', 'Audit trail'],
];
export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const navigation = (
    <nav className="admin-links" aria-label="Administration">
      {adminLinks.map(([href, glyph, label]) => (
        <Link
          className={(href === '/admin' ? path === href : path.startsWith(href)) ? 'active' : ''}
          href={href}
          onClick={() => setOpen(false)}
          key={href}
        >
          <Icon name={glyph} />
          {label}
        </Link>
      ))}
    </nav>
  );
  return (
    <div className="admin-layout">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="admin-sidebar">
        <Wordmark />
        <p className="eyebrow">ADMINISTRATION</p>
        {navigation}
        <div className="admin-sidebar-bottom">
          <Link href="/">
            <Icon name="back" />
            Back to marketplace
          </Link>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-top">
          <p className="muted">
            Administration /{' '}
            {adminLinks.find(([href]) => href !== '/admin' && path.startsWith(href))?.[2] ??
              'Overview'}
          </p>
          <div className="admin-mobile-brand">
            <button
              className="icon-btn"
              onClick={() => setOpen(true)}
              aria-label="Open administration menu"
            >
              <Icon name="menu" />
            </button>
            <Wordmark />
          </div>
          <div className="header-actions">
            <ThemeButton />
            <Link href="/my-adverts" className="avatar" aria-label="My account">
              AD
            </Link>
          </div>
        </header>
        <main id="main" className="admin-main">
          {children}
        </main>
      </div>
      {open ? (
        <Dialog title="Administration" onClose={() => setOpen(false)}>
          {navigation}
          <Link className="text-link" href="/">
            Back to marketplace →
          </Link>
        </Dialog>
      ) : null}
    </div>
  );
}
