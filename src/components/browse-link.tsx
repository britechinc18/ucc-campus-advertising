'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from './icon';
export function ListingLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className: string;
}) {
  return (
    <Link
      href={href}
      className={className}
      prefetch={false}
      onClick={() => {
        try {
          sessionStorage.setItem(
            'ucc-browse-return',
            JSON.stringify({ to: href, from: location.pathname + location.search }),
          );
        } catch {}
      }}
    >
      {children}
    </Link>
  );
}
export function BrowseBack() {
  const router = useRouter();
  return (
    <Link
      className="text-link"
      href="/explore"
      onClick={(e) => {
        try {
          const raw = sessionStorage.getItem('ucc-browse-return');
          if (!raw) return;
          const saved = JSON.parse(raw);
          if (
            saved.to === location.pathname &&
            typeof saved.from === 'string' &&
            saved.from.startsWith('/') &&
            !saved.from.startsWith('//') &&
            history.length > 1
          ) {
            e.preventDefault();
            sessionStorage.removeItem('ucc-browse-return');
            router.back();
          }
        } catch {}
      }}
    >
      <Icon name="back" />
      Back to browsing
    </Link>
  );
}
