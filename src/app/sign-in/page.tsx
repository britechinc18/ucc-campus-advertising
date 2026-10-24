import Link from 'next/link';
import { SellerSetupProgress } from '@/components/seller-setup-progress';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { viewer } from '@/server/viewer';
import { signIn } from '@/server/auth';
import { safeReturn } from '@/lib/market';
export const metadata = { title: 'Sign in' };
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeReturn(params.next);
  const v = await viewer();
  if (v.user && !v.user.suspended) redirect(next);
  return (
    <main id="main" className="container seller-welcome-layout seller-signin-layout">
      <aside className="seller-signin-intro" aria-label="About MedStash">
        <p className="eyebrow">SELL ON MEDSTASH</p>
        <h2>
          Buy. Sell.
          <br />
          Connect on campus.
        </h2>
        <p>A place for your next good find—and your next sale.</p>
        <ul>
          <li>Sell your own items</li>
          <li>Showcase your campus business</li>
          <li>Connect directly with buyers</li>
        </ul>
        <Image
          src="/editorial/onboarding-student.webp"
          width={660}
          height={400}
          alt=""
          className="seller-signin-photo"
        />
      </aside>
      <section className="seller-welcome">
        {next.startsWith('/onboarding') ? <SellerSetupProgress step={1} /> : null}
        <Image
          src="/icons/icon-192.png?v=2"
          alt=""
          unoptimized
          className="welcome-logo"
          width={58}
          height={58}
        />
        <h1>{v.configured ? 'Welcome to MedStash.' : 'Sign-in temporarily unavailable'}</h1>
        <p>
          {v.configured
            ? 'Your next sale starts here.'
            : 'You can still browse and contact advertisers.'}
        </p>
        {params.error ? (
          <p className="form-error" role="alert">
            {params.error === 'rules'
              ? 'Please agree to the platform rules before continuing.'
              : 'Sign-in couldn’t be completed. Please try again.'}
          </p>
        ) : null}
        {v.configured ? (
          <form
            action={async (formData: FormData) => {
              'use server';
              if (formData.get('rules') !== 'on')
                redirect(`/sign-in?${new URLSearchParams({ next, error: 'rules' })}`);
              await signIn('google', { redirectTo: next });
            }}
          >
            <label className="welcome-consent">
              <input type="checkbox" name="rules" required />
              <span>
                I agree to the <Link href="/help#rules">platform rules</Link> and{' '}
                <Link href="/privacy">privacy policy</Link>.
              </span>
            </label>
            <button className="btn google-continue" type="submit">
              <span className="google-g-icon" aria-hidden="true">
                G
              </span>
              Continue with Google
            </button>
          </form>
        ) : (
          <Link className="btn" href="/explore">
            Browse the market
          </Link>
        )}
        <Link className="welcome-browse" href="/explore">
          Keep browsing
        </Link>
      </section>
    </main>
  );
}
