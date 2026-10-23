import Link from 'next/link';
export const metadata = { title: 'Safe trading & help' };
export default function Help() {
  return (
    <main id="main" className="container">
      <article className="content-prose">
        <p className="eyebrow">A SAFER CAMPUS MARKETPLACE</p>
        <h1>Good connections. Sensible precautions.</h1>
        <p>
          MedStash connects buyers and advertisers within the community. Buyers contact advertisers
          directly. We do not process payments or guarantee a transaction.
        </p>
        <h2>When buying or arranging a service</h2>
        <ul>
          <li>Meet in a busy, public place on or near campus.</li>
          <li>Inspect the item and confirm the agreed price before paying.</li>
          <li>Never share passwords, verification codes or financial account details.</li>
          <li>Be cautious about deposits and requests to transfer money before meeting.</li>
        </ul>
        <h2>When posting</h2>
        <p>
          Describe the item or service honestly, use your own photographs and obtain permission for
          any contact details you publish. Do not advertise illegal, unsafe, stolen or prohibited
          goods. All adverts are reviewed before publication.
        </p>
        <h2>Report a concern</h2>
        <p>
          Use “Report advert” on the listing and explain the issue. Reports are reviewed by
          administrators; they do not automatically remove a listing. If you face immediate danger,
          contact campus security or the appropriate authorities.
        </p>
        <h2>Your information</h2>
        <p>
          Your advert’s approved phone and WhatsApp details are public. Only share contacts you
          consent to publish. Signing in is required for advertisers, while browsing is open to
          everyone.
        </p>
        <Link className="text-link" href="/explore">
          Back to Explore →
        </Link>
      </article>
    </main>
  );
}
