import Link from 'next/link';
export const metadata = { title: 'Privacy policy' };
export default function PrivacyPage() {
  return (
    <main id="main" className="container">
      <article className="content-prose">
        <h1>Privacy policy</h1>
        <p>
          MedStash uses information to run the marketplace, publish adverts and help keep the
          community safe.
        </p>
        <h2>Accounts and adverts</h2>
        <p>
          When you sign in or create an advertiser profile, MedStash stores account and profile
          information needed to identify you and manage your adverts. Advert content, uploaded
          photographs and the contact information you approve for publication are shown publicly
          with published listings. Optional social links are public when included in an advert.
        </p>
        <h2>Browsing and device storage</h2>
        <p>
          Saved listings, recently viewed advert IDs and appearance preferences are stored in your
          browser on this device. Sign-in uses session cookies. Clearing browser storage can remove
          your bookmarks and preferences and browsing history. Recently viewed history stays on this
          device and can be cleared from its page.
        </p>
        <h2>Safety and operation</h2>
        <p>
          Reports, moderation records and technical information are used to review adverts, prevent
          abuse and operate the service. Listing views and contact actions may contribute to
          marketplace activity counts.
        </p>
        <h2>Service providers</h2>
        <p>
          MedStash uses hosting, database, sign-in and file-storage providers to operate the site.
          Following a WhatsApp, phone or social link takes you to a separate service with its own
          privacy practices.
        </p>
        <h2>Your choices</h2>
        <p>
          Only publish information and photographs you have permission to share. You can manage your
          adverts from your seller account. To raise a privacy concern, use the contact and
          reporting guidance on the help page.
        </p>
        <Link className="text-link" href="/help#report">
          Contact & reports →
        </Link>
      </article>
    </main>
  );
}
