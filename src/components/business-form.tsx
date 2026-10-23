'use client';
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
}
export function BusinessForm({
  business,
  account,
  advertiserId,
  assisted = false,
}: {
  business: OwnBusiness | null;
  account: Account;
  advertiserId?: string;
  assisted?: boolean;
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
              ...(String(f.get('phone')).trim() ? { phone: String(f.get('phone')).trim() } : {}),
              ...(String(f.get('whatsapp')).trim()
                ? { whatsapp: String(f.get('whatsapp')).trim() }
                : {}),
              ...(f.get('consent') ? { contactConsent: true } : {}),
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
          <span className="form-label">Phone (optional)</span>
          <input className="field-input" name="phone" type="tel" defaultValue={data?.phone ?? ''} />
        </label>
        <label className="form-group">
          <span className="form-label">WhatsApp (optional)</span>
          <input
            className="field-input"
            name="whatsapp"
            type="tel"
            defaultValue={data?.whatsapp ?? ''}
          />
        </label>
        <label className="check" style={{ marginTop: 22, alignItems: 'flex-start' }}>
          <input type="checkbox" name="consent" defaultChecked={!!data?.contactConsent} />
          <span>I consent to publish the contact details above on my business profile.</span>
        </label>
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
    </div>
  );
}
