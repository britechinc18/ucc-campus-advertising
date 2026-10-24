import { redirect } from 'next/navigation';
import { requireViewer } from '@/server/viewer';
import { safeReturn } from '@/lib/market';

export default async function CompleteSignIn({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeReturn(params.next);
  const user = await requireViewer(`/sign-in/complete?${new URLSearchParams({ next })}`);
  const destination = new URL(next, 'https://medstash.invalid');
  const sellerEntry =
    destination.pathname === '/sell' ||
    (destination.pathname === '/onboarding' && !destination.searchParams.has('kind')) ||
    (destination.pathname === '/post' && !destination.searchParams.has('edit'));
  if (user.seller_active && sellerEntry) redirect('/my-adverts');
  // A return path must never send this completion page back to itself.
  redirect(destination.pathname === '/sign-in/complete' ? '/my-adverts' : next);
}
