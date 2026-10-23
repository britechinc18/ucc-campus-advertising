import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireViewer } from '@/server/viewer';
import { accountContext } from '@/server/frontend';
export const metadata = { title: 'My MedStash' };
export default async function Management() {
  const user = await requireViewer('/my-medstash');
  const account = await accountContext(user.id);
  if (!account.profiles.length) redirect('/onboarding?next=/my-medstash');
  const business = account.profiles.find((p) => p.kind === 'business');
  return (
    <main id="main" className="container">
      <div className="page-head">
        <div>
          <p className="eyebrow">YOUR SELLER TOOLS</p>
          <h1>My MedStash</h1>
          <p>One account. Separate personal and business identities.</p>
        </div>
      </div>
      <div className="management-links">
        {[
          [
            'My Personal Profile',
            'Your individual identity and reusable contact defaults.',
            '/my-personal-profile',
            'Manage Personal Profile',
          ],
          [
            'My Business',
            business
              ? `${business.name} · Your storefront, branding and catalogue.`
              : 'Create one optional business profile.',
            '/my-business',
            business ? 'Manage Business' : 'Create Business Profile',
          ],
          [
            'My Adverts',
            'Manage personal and business adverts, drafts and review decisions.',
            '/my-adverts',
            'Manage Adverts',
          ],
        ].map(([title, description, href, label]) => (
          <section key={href}>
            <h2>{title}</h2>
            <p>{description}</p>
            <Link className="btn secondary" href={href}>
              {label} →
            </Link>
          </section>
        ))}
      </div>
    </main>
  );
}
