'use client';
import { controlMode } from '@/lib/platform-controls';
import type { Account, BusinessProfile } from '@/lib/market';
import { ProfileFieldEditor, type ProfileDetails } from './profile-field-editor';
import { BusinessLifecycle } from './business-lifecycle';
export interface OwnBusiness {
  id: string;
  slug: string;
  approved: BusinessProfile | null;
  pending: BusinessProfile | null;
  state: string;
  reason: string | null;
  version?: number;
}
export function BusinessForm({
  business,
  account,
  advertiserId,
  assisted = false,
  categories = [],
}: {
  business: OwnBusiness | null;
  account: Account;
  advertiserId?: string;
  assisted?: boolean;
  categories?: { id: string; name: string }[];
}) {
  const identity = account.profiles.find((p) => p.kind === 'business');
  const id = advertiserId ?? identity?.id ?? account.profile?.id;
  if (!id) return null;
  const data = (identity?.defaults ??
    business?.pending ??
    business?.approved ?? { name: account.profile?.name }) as ProfileDetails;
  return (
    <>
      {business?.pending ? (
        <p className="inline-notice" role="status">
          Your business changes are awaiting approval. Your approved details stay public until
          reviewed.
        </p>
      ) : null}
      <ProfileFieldEditor
        key={id}
        id={id}
        initial={{ ...data, name: data.name ?? identity?.name ?? account.profile?.name }}
        version={business?.version ?? identity?.version ?? 0}
        business
        assisted={assisted}
        categories={categories}
        href={business?.approved ? `/businesses/${business.slug}` : undefined}
        lifecycle={
          !assisted
            ? (name) => (
                <BusinessLifecycle
                  requiresReview={
                    account.settings.platform_controls
                      ? controlMode(account.settings, 'businessCreation') !== 'open'
                      : !account.settings.auto_publish
                  }
                  name={name}
                  deactivated={!!identity?.deactivated}
                  reactivationPending={!!identity?.reactivationPending}
                />
              )
            : undefined
        }
      />
    </>
  );
}
