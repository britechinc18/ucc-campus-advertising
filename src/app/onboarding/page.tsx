import { requireViewer } from '@/server/viewer';
import { accountContext } from '@/server/frontend';
import { AccountModeSwitch } from '@/components/account-mode-switch';
import { safeReturn } from '@/lib/market';
import { Onboarding } from '@/components/onboarding';
export const metadata = { title: 'Activate your seller profile' };
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeReturn(params.next);
  const u = await requireViewer(`/onboarding?next=${encodeURIComponent(next)}`);
  const context = await accountContext(u.id);
  if (context.profile)
    return (
      <main id="main" className="container">
        <section className="narrow panel auth-panel">
          <h1>Your seller account is ready.</h1>
          <p>Your existing listings and profile are waiting for you.</p>
          <AccountModeSwitch mode="seller" destination={next} className="btn" />
        </section>
      </main>
    );
  return (
    <main id="main" className="container">
      <section className="narrow panel auth-panel">
        <p className="eyebrow">BEFORE YOUR FIRST ADVERT</p>
        <h1>Your campus identity.</h1>
        <p>Tell people who they are connecting with.</p>
        <Onboarding name={u.name ?? ''} next={next} />
      </section>
    </main>
  );
}
