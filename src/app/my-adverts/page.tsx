import { redirect } from 'next/navigation';
import { requireViewer } from '@/server/viewer';
import { accountContext, ownedAdverts } from '@/server/frontend';
import { OwnerDashboard, type OwnerPage } from '@/components/owner-adverts';
import type { Account } from '@/lib/market';
export const metadata = { title: 'My adverts' };
export default async function MyAdverts({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string; state?: string; submitted?: string }>;
}) {
  const p = await searchParams;
  const u = await requireViewer('/my-adverts');
  const context = await accountContext(u.id);
  if (!context.profile) redirect('/onboarding?next=/my-adverts');
  const offset = Math.min(10000, Math.max(0, Number(p.offset) || 0));
  const allowed = [
    'published',
    'pending',
    'draft',
    'rejected',
    'fulfilled',
    'expired',
    'withdrawn',
    'suspended',
  ];
  const state = allowed.includes(p.state ?? '') ? (p.state ?? '') : '';
  const page = await ownedAdverts(u.id, offset, undefined, state || undefined);
  return (
    <main id="main" className="container">
      <OwnerDashboard
        account={context as Account}
        page={JSON.parse(JSON.stringify(page)) as OwnerPage}
        offset={offset}
        state={state}
        submitted={p.submitted === '1'}
      />
    </main>
  );
}
