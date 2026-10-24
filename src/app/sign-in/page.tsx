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
          src="/editorial/electronics-desk.webp"
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
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
                style={{ flexShrink: 0 }}
              >
                <path
                  fill="#4285F4"
                  d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z"
                />
                <path
                  fill="#34A853"
                  d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.23-2.51c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.41 13.92A6 6 0 0 1 6.1 12c0-.67.11-1.32.31-1.92V7.49H3.07A10 10 0 0 0 2 12c0 1.61.38 3.14 1.07 4.51l3.34-2.59Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z"
                />
              </svg>
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
