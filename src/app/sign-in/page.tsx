import Link from 'next/link';
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
    <main id="main" className="container seller-welcome-layout">
      <section className="seller-welcome">
        <Image
          src="/icons/icon-192.png?v=2"
          alt=""
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
