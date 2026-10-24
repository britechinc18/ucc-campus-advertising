import Link from 'next/link';
import { requireViewer } from '@/server/viewer';
import { accountContext, ownBusiness } from '@/server/frontend';
import { personalProfile } from '@/server/profiles';
import { query } from '@/server/store';
import { db } from '@/server/db';
import { sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { PersonalProfileForm } from './personal-profile-form';
import { BusinessForm, type OwnBusiness } from './business-form';
import type { Account } from '@/lib/market';

export async function ProfileWorkspace({ business = false }: { business?: boolean }) {
  const user = await requireViewer('/my-profile');
  const account = await accountContext(user.id);
  if (!account.profiles.length) redirect('/onboarding?next=/my-profile');
  const identity = account.profiles.find((p) => p.kind === 'business');
  const showBusiness = business && !!identity;
  return (
    <main id="main" className="container profile-workspace">
      <header className="profile-page-heading">
        <h1>My Profile</h1>
        <p>Your seller details, in one place.</p>
      </header>
      {identity ? (
        <nav className="profile-switch" aria-label="Profile identity">
          <Link href="/my-profile" aria-current={!showBusiness ? 'page' : undefined}>
            Personal
          </Link>
          <Link
            href="/my-profile?identity=business"
            aria-current={showBusiness ? 'page' : undefined}
          >
            Business
          </Link>
        </nav>
      ) : null}
      {showBusiness ? (
        <BusinessForm
          key={identity.id}
          account={{ ...account, profile: identity } as Account}
          business={JSON.parse(JSON.stringify(await ownBusiness(user.id))) as OwnBusiness | null}
          categories={await query<{ id: string; name: string }>(
            db(),
            sql`select id,name from categories where active order by name`,
          )}
        />
      ) : (
        <PersonalProfileForm key="personal" profile={await personalProfile(user.id)} />
      )}
    </main>
  );
}
