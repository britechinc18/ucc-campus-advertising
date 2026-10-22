import { EmptyState } from '@/components/ui';
export default function NotFound() {
  return (
    <main id="main" className="container">
      <EmptyState
        title="This page has moved on."
        message="Explore the marketplace to find what’s available around campus."
      />
    </main>
  );
}
