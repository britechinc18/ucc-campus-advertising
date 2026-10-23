import { BusinessDirectory } from '@/components/business-directory';
import Link from 'next/link';
export const metadata = { title: 'Local businesses' };
export default async function Businesses({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; offset?: string }>;
}) {
  const { q = '', offset } = await searchParams;
  return (
    <main id="main" className="container">
      <div className="page-head">
        <div>
          <p className="eyebrow">CLOSE TO CAMPUS</p>
          <h1>Local businesses</h1>
          <p>Discover the people and services around you.</p>
        </div>
      </div>
      <BusinessDirectory q={q} offset={Math.min(10000, Math.max(0, Number(offset) || 0))} />
      <div className="feature-band">
        <div>
          <h2>Run a campus business?</h2>
          <p>Create a profile and help students find you.</p>
        </div>
        <Link href="/my-business" className="btn secondary">
          Create your profile →
        </Link>
      </div>
    </main>
  );
}
