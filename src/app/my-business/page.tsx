import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireViewer } from '@/server/viewer';
import { accountContext, ownBusiness } from '@/server/frontend';
import { BusinessForm, type OwnBusiness } from '@/components/business-form';
import { EmptyState } from '@/components/ui';
import type { Account } from '@/lib/market';
export const metadata = { title: 'My business profile' };
export default async function MyBusiness() {
  const u = await requireViewer('/my-business');
  const context = await accountContext(u.id);
  if (!context.profile) redirect('/onboarding?next=/my-business');
  if (context.profile.kind !== 'business')
    return (
      <main id="main" className="container">
        <EmptyState
          title="Business profiles are for business advertisers."
          message="Your student account can post items, services and wanted adverts through My Adverts."
          action={false}
        />
        <Link className="text-link" href="/my-adverts">
          Go to My Adverts →
        </Link>
      </main>
    );
  const business = await ownBusiness(u.id);
  return (
    <main id="main" className="container">
      <BusinessForm
        account={context as Account}
        business={JSON.parse(JSON.stringify(business)) as OwnBusiness | null}
      />
    </main>
  );
}
