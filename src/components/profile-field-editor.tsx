'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProfileDefaults } from '@/lib/seller-profile';
import { api } from '@/lib/api';
import { ProfileOverview } from './profile-overview';
export type ProfileDetails = ProfileDefaults & {
  description?: string;
  slug?: string;
  logoMediaId?: string;
  categoryId?: string;
};
export function ProfileFieldEditor({
  initial,
  version: initialVersion,
  id,
  business = false,
  assisted = false,
  href,
  categories = [],
}: {
  initial: ProfileDetails;
  version: number;
  id: string;
  business?: boolean;
  assisted?: boolean;
  href?: string;
  categories?: { id: string; name: string }[];
}) {
  const [data, setData] = useState(initial),
    [version, setVersion] = useState(initialVersion),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const router = useRouter();
  async function save(field: string, value: unknown, contactConsent?: boolean) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api<{ data: ProfileDetails; version: number }>(
        assisted ? `admin/advertisers/${id}/profile-details` : 'me/profile-details',
        'PATCH',
        {
          kind: business ? 'business' : 'student',
          field,
          value,
          version,
          ...(contactConsent ? { contactConsent: true } : {}),
        },
      );
      setData(result.data);
      setVersion(result.version);
      setNotice('Saved.');
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="managed-profile">
      <ProfileOverview
        data={data}
        business={business}
        href={href}
        advertiserId={id}
        categories={categories}
        busy={busy}
        error={error}
        onReset={() => {
          setError('');
          setNotice('');
        }}
        onSave={save}
      />
      {notice ? (
        <p className="form-success" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
