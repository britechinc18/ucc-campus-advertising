import { EmptyState } from '@/components/ui';
export default function Restricted() {
  return (
    <main id="main" className="container">
      <EmptyState
        title="Your account is restricted."
        message="Posting and account management are currently unavailable for this account. Contact the campus marketplace administrator for help."
      />
    </main>
  );
}
