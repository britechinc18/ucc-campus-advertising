'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Icon } from './icon';
export function Wordmark() {
  return (
    <Link className="wordmark" href="/" aria-label="MedStash home">
      <span className="mark">
        <Icon name="bag" />
      </span>
      <span>
        MedStash<span className="wordmark-period">.</span>
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
  user,
}: {
  children: React.ReactNode;
  user: { name: string | null; role: string; sellerActive?: boolean } | null;
}) {
  const path = usePathname();
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
  const seller = !!user?.sellerActive;
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
      <header className="site-header">
        <div className="container header-inner">
          <Wordmark />
          <nav className="desktop-nav" aria-label="Main navigation">
            {[
              ['/', 'Home'],
              ['/explore', 'Market'],
              ['/campus-360', 'Campus 360'],
              [seller ? '/my-adverts' : '/saved', seller ? 'My Ads' : 'Saved'],
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
            <ThemeButton />
            <Link className="btn" href={seller ? '/post' : '/sell'}>
              <Icon name={seller ? 'plus' : 'store'} />
              <span>{seller ? 'Post advert' : 'Start Selling'}</span>
            </Link>
            <details className="account-menu" ref={accountMenu}>
              <summary className="icon-btn" aria-label="Account menu">
                <Icon name="users" />
              </summary>
              <div className="account-dropdown">
                <p>{user?.name ?? 'Your campus corner'}</p>
                <Link href="/saved">Saved adverts</Link>
                {seller ? (
                  <>
                    <Link href="/my-adverts">My adverts</Link>
                    <Link href="/my-business">Business profile</Link>
                  </>
                ) : (
                  <Link href="/sell">Start Selling</Link>
                )}
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
                ) : (
                  <Link href="/sign-in">Sign in</Link>
                )}
                <button
                  onClick={() => {
                    try {
                      localStorage.removeItem('ucc-theme');
                    } catch {}
                    document.documentElement.dataset.theme = matchMedia(
                      '(prefers-color-scheme: dark)',
                    ).matches
                      ? 'dark'
                      : 'light';
                  }}
                >
                  Use system theme
                </button>
              </div>
            </details>
          </div>
        </div>
      </header>
      {children}
      <footer className="container footer">
        <Wordmark />
        <p>
          For the UCC medical-student community.
          <br />
          Browse freely. Contact advertisers directly.
        </p>
        <Link className="text-link" href="/help">
          Safe trading & help <Icon name="arrow" />
        </Link>
      </footer>
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
