import { requireViewer } from '@/server/viewer';
import { ownedAdverts } from '@/server/frontend';
import { OwnerDetail } from '@/components/owner-adverts';
import { EmptyState } from '@/components/ui';
import type { OwnAdvert } from '@/lib/market';
export const metadata = { title: 'Manage advert' };
export default async function Manage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireViewer(`/my-adverts/${id}`);
  let advert: unknown;
  try {
    advert = await ownedAdverts(u.id, 0, id);
  } catch {
    return (
      <main id="main" className="container">
        <EmptyState
          title="Advert unavailable."
          message="This advert could not be found for your account."
        />
      </main>
    );
  }
  return (
    <main id="main" className="container">
      <OwnerDetail key={id} advert={JSON.parse(JSON.stringify(advert)) as OwnAdvert} />
    </main>
  );
}
