import Link from 'next/link';
import { viewer } from '@/server/viewer';
import { AccountModeSwitch } from '@/components/account-mode-switch';
import { Icon } from '@/components/icon';
export const metadata = { title: 'Start selling' };
export default async function Sell() {
  const v = await viewer();
  const active = v.user?.seller_active;
  const href = active
    ? '/post'
    : v.user
      ? '/onboarding?next=/post'
      : '/sign-in?next=/onboarding%3Fnext%3D%2Fpost';
  return (
    <main id="main" className="container">
      <section className="selling-intro">
        <div>
          <p className="eyebrow">YOUR NEXT CAMPUS CONNECTION</p>
          <h1>{active ? 'Your campus. Your audience.' : 'A little space. A new possibility.'}</h1>
          <p>
            Sell an item, offer your skills, or share what’s happening. MedStash connects you
            directly with the people around you.
          </p>
          {active ? (
            <AccountModeSwitch mode="seller" destination="/post" className="btn" />
          ) : (
            <Link className="btn" href={href}>
              {active ? 'Create an advert' : 'Start selling with MedStash'}
              <Icon name="arrow" />
            </Link>
          )}
          <Link className="text-link" href="/explore">
            Keep browsing freely →
          </Link>
        </div>
        <ol className="selling-steps">
          <li>
            <span>01</span>
            <div>
              <h2>Your familiar Google account.</h2>
              <p>Sign in when you’re ready. Browsing always stays open.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h2>A simple campus identity.</h2>
              <p>
                Choose your display name and seller profile. Contact details are shared only with
                your consent on each advert.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h2>Post. Get reviewed. Connect.</h2>
              <p>
                Products, services and Campus 360 flyers follow the same approval and posting
                limits. Buyers WhatsApp or call you directly.
              </p>
            </div>
          </li>
        </ol>
      </section>
    </main>
  );
}
