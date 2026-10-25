'use client';
import { useState, useRef, type ReactNode } from 'react';
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
  lifecycle,
}: {
  initial: ProfileDetails;
  version: number;
  id: string;
  business?: boolean;
  assisted?: boolean;
  href?: string;
  categories?: { id: string; name: string }[];
  lifecycle?: (name: string) => ReactNode;
}) {
  const [data, setData] = useState(initial),
    [pendingFields, setPendingFields] = useState<string[]>([]),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const versionRef = useRef(initialVersion);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [publicHref, setPublicHref] = useState(href);
  async function save(field: string, value: unknown, contactConsent?: boolean) {
    setPendingFields((fields) => [...fields, field]);
    const previous = queue.current;
    let release!: () => void;
    queue.current = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    setError('');
    setNotice('');
    try {
      const result = await api<{
        data: ProfileDetails;
        version: number;
        complete: boolean;
        pending?: boolean;
      }>(assisted ? `admin/advertisers/${id}/profile-details` : 'me/profile-details', 'PATCH', {
        kind: business ? 'business' : 'student',
        field,
        value,
        version: versionRef.current,
        ...(contactConsent ? { contactConsent: true } : {}),
      });
      setData(result.data);
      versionRef.current = result.version;
      if (business && result.complete && !result.pending && result.data.slug)
        setPublicHref(`/businesses/${result.data.slug}`);
      setNotice(
        result.pending
          ? 'Changes submitted for approval. Your public profile keeps its approved details.'
          : 'Saved.',
      );

      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.');
      return false;
    } finally {
      setPendingFields((fields) => fields.filter((item) => item !== field));
      release();
    }
  }
  return (
    <div className="managed-profile">
      <ProfileOverview
        data={data}
        business={business}
        href={publicHref}
        lifecycle={lifecycle?.(data.name ?? '')}
        advertiserId={id}
        categories={categories}
        pendingFields={pendingFields}
        error={error}
        onReset={() => {
          setError('');
          setNotice('');
        }}
        onSave={save}
      />
      {notice ? (
        <p className="sr-only" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
