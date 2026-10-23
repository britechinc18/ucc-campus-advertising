'use client';
import Link from 'next/link';
import { ProfileContacts, readProfileContacts } from './profile-contacts';
import { BusinessLifecycle } from './business-lifecycle';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Account, BusinessProfile } from '@/lib/market';
import { Uploads } from './uploads';
import { ErrorMessage } from './ui';
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
  const data = business?.pending ?? business?.approved;
  const [logo, setLogo] = useState<string[]>(data?.logoMediaId ? [data.logoMediaId] : []);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  return (
    <div className="post-layout">
      <div className="page-head">
        <div>
          <p className="eyebrow">CAMPUS BUSINESS</p>
          <h1>{assisted ? 'Manage business profile' : 'Your business profile'}</h1>
          <p>Help students find your business and current adverts.</p>
        </div>
        {business ? (
          <span className={`badge ${business.state === 'pending' ? 'pending' : ''}`}>
            {business.state}
          </span>
        ) : null}
      </div>
      {business?.reason ? (
        <div className="inline-notice">Latest review: {business.reason}</div>
      ) : null}
      {business?.approved && business.pending ? (
        <div className="inline-notice">
          Your approved profile remains public while changes are reviewed.
        </div>
      ) : null}
      <form
        className="panel form-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          setError('');
          setSaved(false);
          try {
            const profile = {
              name: f.get('name'),
              slug: f.get('slug'),
              description: f.get('description'),
              location: f.get('location'),
              ...(logo[0] ? { logoMediaId: logo[0] } : {}),
              defaultsEnabled: true,
              version:
                business?.version ??
                account.profiles.find((p) => p.kind === 'business')?.version ??
                0,
              ...(String(f.get('categoryId') ?? '')
                ? { categoryId: String(f.get('categoryId')) }
                : {}),
              ...readProfileContacts(f),
            };
            await api(
              assisted ? 'admin/businesses' : 'me/business',
              'POST',
              assisted ? { advertiserId, profile } : profile,
            );
            setSaved(true);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save business profile.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="form-group">
          <span className="form-label">Business name</span>
          <input
            className="field-input"
            name="name"
            required
            minLength={2}
            maxLength={100}
            defaultValue={data?.name ?? account.profile?.name ?? ''}
          />
        </label>
        <label className="form-group">
          <span className="form-label">Business URL</span>
          <input
            className="field-input"
            name="slug"
            required
            minLength={3}
            maxLength={60}
            pattern="[a-z0-9-]{3,60}"
            defaultValue={business?.slug ?? ''}
            readOnly={!!business}
          />
          <span className="helper">
            Lowercase letters, numbers and hyphens. The URL cannot be changed after creation.
          </span>
        </label>
        <label className="form-group">
          <span className="form-label">About your business</span>
          <textarea
            className="field-input"
            name="description"
            required
            minLength={20}
            maxLength={2000}
            defaultValue={data?.description ?? ''}
          />
        </label>
        <label className="form-group">
          <span className="form-label">Campus location</span>
          <input
            className="field-input"
            name="location"
            required
            minLength={2}
            maxLength={120}
            defaultValue={data?.location ?? ''}
          />
        </label>
        <div className="form-group">
          <span className="form-label">Logo (optional)</span>
          <Uploads
            advertiserId={advertiserId ?? account.profiles?.find((p) => p.kind === 'business')?.id}
            ids={logo}
            onChange={setLogo}
            max={1}
            maxBytes={account.settings.max_image_bytes}
            onBusy={setUploading}
          />
          <p className="helper">Your business initials appear when no logo is supplied.</p>
        </div>
        <label className="form-group">
          <span className="form-label">Business category</span>
          <select className="field-input" name="categoryId" defaultValue={data?.categoryId ?? ''}>
            <option value="">Choose a category (optional)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <ProfileContacts data={data ?? {}} business />
        {error ? <ErrorMessage message={error} /> : null}
        {saved ? (
          <p className="form-success" role="status">
            Profile submitted for administrator review.
          </p>
        ) : null}
        <div className="form-bottom">
          <span className="helper">All profile changes require approval.</span>
          <button className="btn" disabled={busy || uploading || business?.state === 'suspended'}>
            {busy ? 'Submitting…' : 'Submit for approval'}
          </button>
        </div>
      </form>
      {business?.approved ? (
        <div className="form-actions">
          <Link className="btn secondary" href={`/businesses/${business.slug}`}>
            View Storefront
          </Link>
          <Link
            className="text-link"
            href={`/my-adverts?identity=${advertiserId ?? account.profiles.find((p) => p.kind === 'business')?.id}`}
          >
            Manage Catalog →
          </Link>
        </div>
      ) : null}
      {!assisted ? (
        <BusinessLifecycle
          name={data?.name ?? account.profile?.name ?? ''}
          deactivated={!!account.profiles.find((p) => p.kind === 'business')?.deactivated}
          reactivationPending={
            !!account.profiles.find((p) => p.kind === 'business')?.reactivationPending
          }
        />
      ) : null}
    </div>
  );
}
