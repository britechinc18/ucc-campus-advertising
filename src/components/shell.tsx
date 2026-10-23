'use client';
/* eslint-disable @next/next/no-img-element -- Google avatars use native loading and an initials fallback without caching identity images. */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Notifications } from './notifications';
import { initials } from '@/lib/market';
import { Icon } from './icon';
import { AccountModeSwitch } from './account-mode-switch';
export function Wordmark({ showLogo = false }: { showLogo?: boolean }) {
  return (
    <Link className="wordmark" href="/" aria-label="MedStash home">
      {showLogo ? (
        <img className="brand-logo" src="/icons/icon-192.png?v=2" alt="" width={40} height={40} />
      ) : null}
      <span>
        medstash<span className="wordmark-period">.</span>
      </span>
    </Link>
  );
}
export function ThemeButton() {
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      try {
        if (!localStorage.getItem('ucc-theme'))
          document.documentElement.dataset.theme = media.matches ? 'dark' : 'light';
      } catch {}
    };
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  return (
    <button
      className="icon-btn theme-toggle"
      aria-label="Toggle light and dark theme"
      onClick={() => {
        const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = theme;
        try {
          localStorage.setItem('ucc-theme', theme);
        } catch {}
      }}
    >
      <span className="theme-sun">
        <Icon name="sun" />
      </span>
      <span className="theme-moon">
        <Icon name="moon" />
      </span>
    </button>
  );
}
export function Shell({
  children,
  footer,
  user,
}: {
  children: React.ReactNode;
  footer: React.ReactNode;
  user: {
    name: string | null;
    role: string;
    sellerActive?: boolean;
    buyerMode?: boolean;
    image?: string | null;
  } | null;
}) {
  const path = usePathname();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const accountMenu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!accountMenu.current?.contains(e.target as Node))
        accountMenu.current?.removeAttribute('open');
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && accountMenu.current?.open) {
        accountMenu.current.removeAttribute('open');
        accountMenu.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, []);
  useEffect(() => {
    accountMenu.current?.removeAttribute('open');
  }, [path]);
  const admin = path.startsWith('/admin');
  const detail = /^\/adverts\/[^/]+$/.test(path);
  if (admin) return <>{children}</>;
  const seller = !!user?.sellerActive && !user?.buyerMode;
  const nav = seller
    ? [
        ['/', 'home', 'Home'],
        ['/explore', 'compass', 'Market'],
        ['/post', 'plus', 'Post'],
        ['/campus-360', 'grid', 'Campus 360'],
        ['/my-adverts', 'list', 'My Ads'],
      ]
    : [
        ['/', 'home', 'Home'],
        ['/explore', 'compass', 'Market'],
        ['/campus-360', 'grid', 'Campus 360'],
        ['/saved', 'heart', 'Saved'],
      ];
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header
        className={`site-header ${path === '/' ? 'home-header' : ''} ${path === '/explore' ? 'market-header' : ''} ${detail ? 'advert-header' : ''} ${path === '/recently-viewed' ? 'recent-header' : ''} ${path.startsWith('/campus-360') ? 'campus-header' : ''}`}
      >
        <div className="container header-inner">
          <Wordmark />
          {path === '/explore' || path === '/recently-viewed' || path.startsWith('/campus-360') ? (
            <span
              className="wordmark mobile-header-title"
              role={
                ['/campus-360', '/explore', '/recently-viewed'].includes(path)
                  ? 'heading'
                  : undefined
              }
              aria-level={
                ['/campus-360', '/explore', '/recently-viewed'].includes(path) ? 1 : undefined
              }
            >
              {path === '/explore'
                ? 'Market'
                : path === '/recently-viewed'
                  ? 'Recently viewed'
                  : 'Campus 360'}
            </span>
          ) : null}
          <nav className="desktop-nav" aria-label="Main navigation">
            {[
              ['/', 'Home'],
              ['/explore', 'Market'],
              ['/campus-360', 'Campus 360'],
              ['/saved', 'Saved'],
              ...(seller ? [['/my-adverts', 'My Ads']] : []),
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                aria-current={
                  (href === '/' ? path === '/' : path.startsWith(href)) ? 'page' : undefined
                }
              >
                {label}
              </Link>
            ))}
          </nav>
          <form
            className="header-search"
            action={path.startsWith('/campus-360') ? '/campus-360' : '/explore'}
            role="search"
          >
            <Icon name="search" />
            <input
              type="search"
              name="q"
              placeholder="Find your next campus connection"
              aria-label="Search MedStash"
              maxLength={100}
            />
          </form>
          <div className="header-actions">
            <Link
              className="icon-btn header-search-trigger"
              href={
                path === '/'
                  ? '/#home-search'
                  : path.startsWith('/campus-360')
                    ? '/campus-360#campus-search'
                    : '/explore#market-search'
              }
              aria-label="Search MedStash"
              onClick={(event) => {
                const target = document.getElementById(
                  path === '/'
                    ? 'home-search'
                    : path.startsWith('/campus-360')
                      ? 'campus-search'
                      : 'market-search',
                );
                if (target) {
                  event.preventDefault();
                  target.focus();
                  target.scrollIntoView({
                    block: 'center',
                    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
                      ? 'instant'
                      : 'smooth',
                  });
                }
              }}
            >
              <Icon name="search" />
            </Link>
            {user?.sellerActive && !seller ? (
              <AccountModeSwitch mode="seller" className="btn" />
            ) : (
              <Link className="btn" href={seller ? '/post' : '/sell'}>
                <Icon name={seller ? 'plus' : 'store'} />
                <span>{seller ? 'Post advert' : 'Start Selling'}</span>
              </Link>
            )}
            <Notifications
              key={`${user?.name ?? 'anonymous'}:${!!user?.sellerActive}:${path}`}
              scope={path}
            />
            <details
              className="account-menu"
              ref={accountMenu}
              onToggle={(e) => {
                if (e.currentTarget.open)
                  document.querySelector('.notification-menu[open]')?.removeAttribute('open');
              }}
            >
              <summary className="icon-btn" aria-label={seller ? 'Account menu' : 'Menu'}>
                {seller ? (
                  <span className="seller-avatar">
                    {user?.image?.startsWith('https://') && !avatarFailed ? (
                      <img
                        src={user.image}
                        alt=""
                        width={32}
                        height={32}
                        referrerPolicy="no-referrer"
                        onError={() => setAvatarFailed(true)}
                      />
                    ) : (
                      initials(user?.name ?? 'Seller')
                    )}
                  </span>
                ) : (
                  <Icon name="menu" />
                )}
              </summary>
              <div className="account-dropdown">
                {seller ? <p>{user?.name ?? 'Your seller account'}</p> : null}
                {seller ? (
                  <>
                    <Link href="/my-medstash">My MedStash</Link>
                    <Link href="/my-personal-profile">My Personal Profile</Link>
                    <Link href="/my-adverts">My adverts</Link>
                    <Link href="/my-business">Business profile</Link>
                  </>
                ) : !user?.sellerActive ? (
                  <Link href="/sell">Start Selling</Link>
                ) : null}
                <Link href="/saved">Saved adverts</Link>
                <Link href="/recently-viewed">Recently viewed</Link>
                {user?.sellerActive ? (
                  <AccountModeSwitch mode={seller ? 'buyer' : 'seller'} />
                ) : null}
                {user?.role === 'admin' ? <Link href="/admin">Administration</Link> : null}
                {user ? (
                  <form
                    action="/sign-out"
                    method="post"
                    onSubmit={() => {
                      try {
                        Object.keys(sessionStorage)
                          .filter((k) => k.startsWith('ucc-draft-v1:'))
                          .forEach((k) => sessionStorage.removeItem(k));
                      } catch {}
                    }}
                  >
                    <button type="submit">Sign out</button>
                  </form>
                ) : null}
                <div className="menu-theme">
                  <span>Appearance</span>
                  <ThemeButton />
                </div>
                <Link href="/help">Help & safe trading</Link>
              </div>
            </details>
          </div>
        </div>
      </header>
      {children}
      {footer}
      {!detail ? (
        <nav
          className={`bottom-nav ${seller ? 'seller-nav' : 'buyer-nav'}`}
          aria-label="Mobile navigation"
        >
          {nav.map(([href, glyph, label]) => (
            <Link
              key={href}
              href={href}
              className={`${(href === '/' ? path === '/' : path.startsWith(href)) ? 'active' : ''} ${href === '/post' ? 'post-nav' : ''}`}
              aria-current={
                (href === '/' ? path === '/' : path.startsWith(href)) ? 'page' : undefined
              }
            >
              <Icon name={glyph} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      ) : null}
    </>
  );
}
