'use client';
import { ProfileOverview } from './profile-overview';
import { useState, useEffect, useRef } from 'react';
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
  const [editing, setEditing] = useState(false);
  const editorRef = useRef<HTMLFormElement>(null);
  const focusField = useRef('name');
  useEffect(() => {
    if (!editing) return;
    const control = editorRef.current?.elements.namedItem(focusField.current);
    if (control instanceof HTMLElement) control.focus();
  }, [editing]);
  if (!editing)
    return (
      <div className="managed-profile">
        {notice ? (
          <p role="status" className="form-success">
            {notice}
          </p>
        ) : null}
        <ProfileOverview
          data={data}
          image={data.photoMediaId}
          href={`/sellers/${profile.id}`}
          onEdit={(field) => {
            focusField.current = field ?? 'name';
            setPhoto(data.photoMediaId ? [data.photoMediaId] : []);
            setNotice('');
            setError('');
            setEditing(true);
          }}
        />
      </div>
    );
  return (
    <section className="managed-profile profile-editor">
      <div className="page-head">
        <div>
          <p className="eyebrow">PERSONAL IDENTITY</p>
          <h1>My Personal Profile</h1>
          <p>Introduce yourself and choose what appears on your profile.</p>
        </div>
      </div>
      <form
        ref={editorRef}
        className="panel form-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const f = new FormData(form);
          const submit = true;
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
              submit ? 'Profile saved. Your changes are now live.' : 'Private draft saved.',
            );
            router.refresh();
            if (submit) setEditing(false);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save profile.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="profile-editor-identity">
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
        </div>
        <div className="profile-editor-contacts">
          <ProfileContacts data={data} />
        </div>
        {error ? <ErrorMessage message={error} /> : null}
        {notice ? (
          <p className="form-success" role="status">
            {notice}
          </p>
        ) : null}
        <div className="form-actions">
          <button
            type="button"
            className="btn secondary"
            disabled={busy}
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
          <button className="btn" disabled={busy || uploading}>
            Save changes
          </button>
        </div>
        <p className="helper">
          Login email and account credentials are never included in this profile.
        </p>
      </form>
    </section>
  );
}
