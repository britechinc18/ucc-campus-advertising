import Link from 'next/link';
export const metadata = { title: 'Frequently asked questions' };
const questions = [
  [
    'Do I need an account to browse?',
    'No. You can browse listings and contact advertisers without signing in. Sign in to post and manage your own adverts.',
  ],
  [
    'How do I buy an item?',
    'Open the listing and contact the advertiser using the available WhatsApp or call options. Agree on the price and meeting arrangements directly. MedStash does not process payments.',
  ],
  [
    'How do I post an advert?',
    'Choose Post an advert, sign in and complete your advertiser details. Add an accurate description, your own photographs and contact details you consent to publish. Adverts are reviewed before publication.',
  ],
  [
    'What does “under GH₵100” mean?',
    'Shop deals shows adverts with a stated price strictly below GH₵100. Listings without a stated price are excluded from that price filter.',
  ],
  [
    'Do saved listings sync between devices?',
    'Bookmarks are stored in your browser on this device. They do not automatically sync to other browsers or devices.',
  ],
  [
    'How do I report an advert?',
    'Open the advert and choose Report advert. Give enough detail for the administrators to review your concern. For immediate danger, contact campus security or the appropriate authorities.',
  ],
];
export default function FaqPage() {
  return (
    <main id="main" className="container">
      <article className="content-prose faq-page">
        <h1>Frequently asked questions</h1>
        {questions.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
        <Link className="text-link" href="/help">
          More about safe trading →
        </Link>
      </article>
    </main>
  );
}
