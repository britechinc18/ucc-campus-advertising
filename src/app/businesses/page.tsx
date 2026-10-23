import { BusinessDirectory } from '@/components/business-directory';
import { BusinessCallout } from '@/components/business-callout';
export const metadata = { title: 'Local businesses' };
export default async function Businesses({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; offset?: string }>;
}) {
  const { q = '', offset } = await searchParams;
  return (
    <main id="main" className="container business-directory-page">
      <h1 className="sr-only">Local businesses</h1>
      <BusinessDirectory q={q} offset={Math.min(10000, Math.max(0, Number(offset) || 0))} />
      <BusinessCallout />
    </main>
  );
}
