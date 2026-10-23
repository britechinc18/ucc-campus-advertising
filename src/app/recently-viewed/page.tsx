import { RecentlyViewed } from '@/components/recently-viewed';
export const metadata = { title: 'Recently viewed' };
export default function Recent() {
  return (
    <main id="main" className="container recent-page">
      <RecentlyViewed />
    </main>
  );
}
