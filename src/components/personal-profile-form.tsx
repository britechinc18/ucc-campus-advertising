'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ManagedProfile } from '@/lib/seller-profile';
import { ProfileContacts, readProfileContacts } from './profile-contacts';
import { Uploads } from './uploads';
import { ErrorMessage } from './ui';
import { api } from '@/lib/api';
export function PersonalProfileForm({
  profile,
  assisted = false,
}: {
  profile: ManagedProfile;
  assisted?: boolean;
}) {
  const data = profile.draft ?? profile.approved ?? { name: profile.name };
  const [photo, setPhoto] = useState<string[]>(data.photoMediaId ? [data.photoMediaId] : []);
  const [uploading, setUploading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const router = useRouter();
  return (
    <section className="narrow">
      <div className="page-head">
        <div>
          <p className="eyebrow">PERSONAL IDENTITY</p>
          <h1>My Personal Profile</h1>
          <p>Save your details once. Your business identity stays separate.</p>
        </div>
      </div>
      <p className="helper">
        {profile.state === 'incomplete'
          ? 'Incomplete — private until you choose to use it.'
          : `Profile status: ${profile.state}`}
        {profile.reason ? ` · ${profile.reason}` : ''}
      </p>
      {profile.linkedCount || profile.overrideCount ? (
        <p className="inline-notice">
          {profile.linkedCount} live adverts use linked defaults. {profile.overrideCount} have
          customized fields. <Link href="/my-adverts">Review your adverts →</Link>
        </p>
      ) : null}
      <form
        className="panel form-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const f = new FormData(form);
          const submit =
            (e.nativeEvent as SubmitEvent).submitter?.getAttribute('value') !== 'draft';
          setBusy(true);
          setError('');
          setNotice('');
          try {
            await api(assisted ? `admin/personal/${profile.id}` : 'me/personal', 'PUT', {
              version: profile.version,
              submit,
              profile: {
                ...(String(f.get('name')).trim() ? { name: String(f.get('name')).trim() } : {}),
                ...(String(f.get('location')).trim()
                  ? { location: String(f.get('location')).trim() }
                  : {}),
                bio: String(f.get('bio') ?? ''),
                ...(photo[0] ? { photoMediaId: photo[0] } : {}),
                ...readProfileContacts(f),
              },
            });
            setNotice(
              submit
                ? 'Profile submitted for approval. Existing approved details remain public until review.'
                : 'Private draft saved.',
            );
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save profile.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="form-group">
          <span className="form-label">Display name</span>
          <input
            name="name"
            className="field-input"
            minLength={2}
            maxLength={100}
            required
            defaultValue={data.name ?? profile.name}
          />
        </label>
        <label className="form-group">
          <span className="form-label">Default location</span>
          <input
            name="location"
            className="field-input"
            minLength={2}
            maxLength={120}
            required
            defaultValue={data.location ?? ''}
          />
        </label>
        <label className="form-group">
          <span className="form-label">Short bio (optional)</span>
          <textarea
            name="bio"
            className="field-input"
            maxLength={500}
            defaultValue={data.bio ?? ''}
          />
        </label>
        <div className="form-group">
          <span className="form-label">Profile photo (optional)</span>
          <Uploads
            advertiserId={profile.id}
            ids={photo}
            onChange={setPhoto}
            max={1}
            onBusy={setUploading}
          />
        </div>
        <ProfileContacts data={data} />
        {error ? <ErrorMessage message={error} /> : null}
        {notice ? (
          <p className="form-success" role="status">
            {notice}
          </p>
        ) : null}
        <div className="form-actions">
          <button className="btn" disabled={busy || uploading}>
            Save changes for review
          </button>
          <button
            className="btn secondary"
            type="submit"
            value="draft"
            formNoValidate
            disabled={busy || uploading}
          >
            Save private draft
          </button>
        </div>
        <p className="helper">
          Login email and account credentials are never included in this profile.
        </p>
      </form>
      <Link className="text-link" href="/my-medstash">
        Back to My MedStash →
      </Link>
    </section>
  );
}
