import Link from 'next/link';
import { Icon } from '@/components/icon';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { viewer } from '@/server/viewer';
import { signIn } from '@/server/auth';
import { safeReturn } from '@/lib/market';
export const metadata = { title: 'Sign in' };
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; returning?: string }>;
}) {
  const params = await searchParams;
  const returning = params.returning === '1';
  const next = returning ? '/my-adverts' : safeReturn(params.next);
  const v = await viewer();
  if (v.user?.suspended) redirect('/account-restricted');
  const afterSignIn = `/sign-in/complete?${new URLSearchParams({ next })}`;
  if (v.user) redirect(afterSignIn);
  return (
    <main id="main" className="container seller-welcome-layout seller-signin-layout">
      <aside className="seller-signin-intro" aria-label="About MedStash">
        <div className="seller-promo-visual">
          <svg className="seller-promo-defs" aria-hidden="true" focusable="false">
            <defs>
              <clipPath id="seller-promo-shape" clipPathUnits="objectBoundingBox">
                <path d="M.08,0 H.92 Q1,0 1,.12 V.88 Q1,1 .92,1 H.65 C.56,1 .59,.76 .49,.76 H.06 Q0,.76 0,.66 V.12 Q0,0 .08,0 Z" />
              </clipPath>
            </defs>
          </svg>
          <Image
            src="/editorial/seller-market-display.webp"
            width={660}
            height={440}
            alt=""
            className="seller-signin-photo"
          />
          <span className="seller-promo-shop" aria-hidden="true">
            <svg className="seller-shop-mark" viewBox="0 0 32 32" focusable="false">
              <path
                fill="currentColor"
                stroke="none"
                d="M6 13h20v15H6zM4 12 7 4h18l3 8v2c0 4-6 4-6 0 0 4-6 4-6 0 0 4-6 4-6 0 0 4-6 4-6 0z"
              />
              <path
                fill="#e1f1e2"
                stroke="none"
                d="M14 20h5v8h-5zM9 20h3v4H9zM9 5h3l-1 7H7zM17 5h3l2 7h-5z"
              />
            </svg>
          </span>
        </div>
        <div className="seller-signin-copy">
          <h2>Sell on MedStash.</h2>
          <p>Connect with buyers on your campus.</p>
        </div>
        <div className="seller-signin-benefits">
          <span>
            <Icon name="bag" />
            List products or services
          </span>
          <span>
            <Icon name="chat" />
            Chat directly with buyers
          </span>
          <span>
            <Icon name="edit" />
            Create and manage your adverts
          </span>
        </div>
      </aside>
      <section className="seller-welcome">
        <Image
          src="/icons/icon-192.png?v=2"
          alt=""
          unoptimized
          className="welcome-logo"
          width={58}
          height={58}
        />
        <h1>
          {v.configured
            ? returning
              ? 'Welcome back.'
              : 'Welcome to MedStash.'
            : 'Sign-in temporarily unavailable'}
        </h1>
        <p>
          {v.configured
            ? returning
              ? 'Sign in to open My Adverts.'
              : 'Your next sale starts here.'
            : 'You can still browse and contact advertisers.'}
        </p>
        {params.error ? (
          <p className="form-error" role="alert">
            {params.error === 'rules'
              ? 'Please agree to the platform rules before continuing.'
              : params.error === 'registration-paused'
                ? 'New account registration is temporarily paused. Existing users can still sign in.'
                : 'Sign-in couldn’t be completed. Please try again.'}
          </p>
        ) : null}
        {v.configured ? (
          <form
            action={async (formData: FormData) => {
              'use server';
              if (formData.get('rules') !== 'on')
                redirect(
                  `/sign-in?${new URLSearchParams({ next, error: 'rules', ...(returning ? { returning: '1' } : {}) })}`,
                );
              await signIn(
                'google',
                {
                  redirectTo: formData.get('intent') === 'returning' ? '/my-adverts' : afterSignIn,
                },
                { prompt: 'select_account' },
              );
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
            <p className="welcome-returning">
              Already have an account?{' '}
              <button type="submit" name="intent" value="returning" className="welcome-signin">
                Sign in
              </button>
            </p>
          </form>
        ) : (
          <Link className="btn" href="/explore">
            Browse the market
          </Link>
        )}
        <Link className="welcome-browse btn secondary" href="/explore">
          Keep browsing <Icon name="arrow" />
        </Link>
      </section>
    </main>
  );
}
