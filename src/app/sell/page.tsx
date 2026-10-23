import { redirect } from 'next/navigation';
import { viewer } from '@/server/viewer';
import { AccountModeSwitch } from '@/components/account-mode-switch';
export const metadata = { title: 'Start selling' };
export default async function Sell() {
  const v = await viewer();
  if (!v.user) redirect('/sign-in?next=/onboarding%3Fnext%3D%2Fpost');
  if (!v.user.seller_active) redirect('/onboarding?next=/post');
  return (
    <main id="main" className="container seller-welcome-layout">
      <section className="seller-welcome">
        <h1>Ready to post?</h1>
        <p>Your seller profile is ready.</p>
        <AccountModeSwitch mode="seller" destination="/post" className="btn" />
      </section>
    </main>
  );
}
