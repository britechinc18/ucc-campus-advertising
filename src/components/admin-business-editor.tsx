import Link from 'next/link';
import { requireViewer } from '@/server/viewer';
import { assistedBusinessContext } from '@/server/businesses';
import { BusinessForm, type OwnBusiness } from './business-form';
import { EmptyState } from './ui';
import { AppError } from '@/server/errors';
export async function AdminBusinessEditor({ advertiserId }: { advertiserId: string }) {
  const user = await requireViewer(`/admin/businesses/${advertiserId}/profile`, true);
  let result: Awaited<ReturnType<typeof assistedBusinessContext>>;
  try {
    result = await assistedBusinessContext(user.id, advertiserId);
  } catch (e) {
    if (!(e instanceof AppError) && !(e instanceof Error && e.name === 'ZodError')) throw e;
    return (
      <EmptyState
        title="Business profile unavailable."
        message="Choose an active business advertiser from Post for someone."
        action={false}
      />
    );
  }
  const { account, business } = result;
  return (
    <>
      <p className="inline-notice">
        Managing <strong>{account.profile.name}</strong> with the owner’s permission. Public
        contacts belong to this business; your admin account remains the private operator.
      </p>
      <BusinessForm
        business={JSON.parse(JSON.stringify(business)) as OwnBusiness | null}
        account={account}
        advertiserId={advertiserId}
        assisted
      />
      <div className="form-actions">
        <Link className="btn" href={`/post?advertiserId=${advertiserId}`}>
          Post for this business →
        </Link>
        <Link className="btn secondary" href={`/admin/advertisers/${advertiserId}`}>
          Advertiser details
        </Link>
        <Link className="text-link" href="/admin/businesses">
          Review business profiles →
        </Link>
      </div>
    </>
  );
}
