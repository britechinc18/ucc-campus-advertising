'use client';
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
      <ProfileFieldEditor
        key={id}
        id={id}
        initial={data}
        version={business?.version ?? identity?.version ?? 0}
        business
        assisted={assisted}
        categories={categories}
        href={business?.approved ? `/businesses/${business.slug}` : undefined}
      />
      {!assisted ? (
        <BusinessLifecycle
          name={data.name ?? ''}
          deactivated={!!identity?.deactivated}
          reactivationPending={!!identity?.reactivationPending}
        />
      ) : null}
    </>
  );
}
