import Link from 'next/link';
import { redirect } from 'next/navigation';
import { viewer } from '@/server/viewer';
import { signIn } from '@/server/auth';
import { safeReturn } from '@/lib/market';
import { Icon } from '@/components/icon';
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
    <main id="main" className="container sign-in-layout">
      <section className="narrow panel auth-panel">
        <p className="eyebrow">YOUR CAMPUS CORNER</p>
        <h1>{v.configured ? 'Welcome to MedStash.' : 'Sign-in temporarily unavailable'}</h1>
        <p>
          {v.configured
            ? 'Sign in to post adverts and manage your listings. Browsing and contacting advertisers are always open to everyone.'
            : 'You can still browse the marketplace and contact advertisers. Posting and account management will be available once sign-in is ready.'}
        </p>
        {params.error ? (
          <p className="form-error" role="alert">
            Sign-in couldn’t be completed. Please try again with a verified Google account.
          </p>
        ) : null}
        {v.configured ? (
          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: next });
            }}
          >
            <button className="btn" type="submit">
              Continue with Google <Icon name="arrow" />
            </button>
          </form>
        ) : (
          <Link className="btn" href="/explore">
            Explore the marketplace <Icon name="arrow" />
          </Link>
        )}
        <p className="meta">
          We only publish the contact information you explicitly consent to share on your adverts.
        </p>
      </section>
      <aside className="sign-in-story">
        <p className="eyebrow">YOUR NEXT CAMPUS CONNECTION</p>
        <h2>
          A good find.
          <br />A familiar place.
        </h2>
        <p>
          From a well-loved textbook to a brilliant local service. Find it here, then connect
          directly.
        </p>
        <div className="sign-in-values">
          <span>
            <Icon name="shield" /> Every advert reviewed
          </span>
          <span>
            <Icon name="chat" /> WhatsApp or call directly
          </span>
          <span>
            <Icon name="users" /> Built for your community
          </span>
        </div>
        <Link href="/explore">
          Just browsing? Explore freely <Icon name="arrow" />
        </Link>
      </aside>
    </main>
  );
}
