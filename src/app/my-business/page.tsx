import { ProfileWorkspace } from '@/components/profile-workspace';
import { query } from '@/server/store';
import { db } from '@/server/db';
import { sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { requireViewer } from '@/server/viewer';
import { accountContext, ownBusiness } from '@/server/frontend';
import { BusinessForm, type OwnBusiness } from '@/components/business-form';
import type { Account } from '@/lib/market';
export const metadata = { title: 'My business profile' };
export default async function MyBusiness() {
  const u = await requireViewer('/my-business');
  const context = await accountContext(u.id);
  const profile = context.profiles.find((p) => p.kind === 'business');
  if (!profile) redirect('/onboarding?kind=business&next=/my-business');
  const business = await ownBusiness(u.id);
  if (business) return <ProfileWorkspace business />;
  const categories = await query<{ id: string; name: string }>(
    db(),
    sql`select id,name from categories where active order by name`,
  );
  return (
    <main id="main" className="container">
      <BusinessForm
        categories={categories}
        account={{ ...context, profile } as Account}
        business={JSON.parse(JSON.stringify(business)) as OwnBusiness | null}
      />
    </main>
  );
}
