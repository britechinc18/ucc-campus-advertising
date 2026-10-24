'use client';
import { useState } from 'react';
import Link from 'next/link';
import { initials } from '@/lib/market';
import {
  profileSocialPlatforms,
  socialLabels,
  socialExamples,
  socialProfile,
  type SocialPlatform,
} from '@/lib/socials';
import { MediaImage, Dialog, ErrorMessage } from './ui';
import { SocialIcon } from './social-profiles';
import { Icon } from './icon';
import { Uploads } from './uploads';
import type { ProfileDetails } from './profile-field-editor';
export function ProfileOverview({
  data,
  business = false,
  href,
  advertiserId,
  categories,
  busy,
  error,
  onSave,
  onReset,
}: {
  data: ProfileDetails;
  business?: boolean;
  href?: string;
  advertiserId: string;
  categories: { id: string; name: string }[];
  busy: boolean;
  error: string;
  onReset: () => void;
  onSave: (field: string, value: unknown, consent?: boolean) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState<string | null>(null),
    [value, setValue] = useState(''),
    [consent, setConsent] = useState(false),
    [photo, setPhoto] = useState<string[]>([]),
    [uploading, setUploading] = useState(false);
  const imageField = business ? 'logoMediaId' : 'photoMediaId',
    image = data[imageField],
    bioField = business ? 'description' : 'bio',
    bio = data[bioField];
  const name = data.name || 'Add your name';
  const labels: Record<string, string> = {
    name: business ? 'Business name' : 'Display name',
    phone: 'Phone number',
    whatsapp: 'WhatsApp number',
    location: 'Location',
    slug: 'Business URL',
    categoryId: 'Business category',
    photoMediaId: 'Profile photo',
    logoMediaId: 'Business logo',
  };
  const social = editing?.startsWith('social.') ? (editing.slice(7) as SocialPlatform) : null;
  const label = social
    ? `${socialLabels[social]} profile`
    : (labels[editing ?? ''] ?? 'Introduction');
  const requiresConsent =
    !!editing &&
    (editing === 'phone' || editing === 'whatsapp' || !!social) &&
    !data.contactConsent;
  function open(field: string) {
    onReset();
    setEditing(field);
    setConsent(false);
    setValue(
      field.startsWith('social.')
        ? (data.socials?.[field.slice(7) as SocialPlatform] ?? '')
        : String(data[field as keyof ProfileDetails] ?? ''),
    );
    setPhoto(image ? [image] : []);
  }
  async function submit() {
    if (!editing) return;
    let next: unknown = value.trim();
    if (social && next && !String(next).startsWith('https://'))
      next = socialExamples[social].replace('username', String(next).replace(/^@/, ''));
    if (editing === imageField) next = photo[0] ?? null;
    if (await onSave(editing, next, consent)) setEditing(null);
  }
  function visibility(field: 'photo' | SocialPlatform, label: string) {
    return (
      <button
        className="profile-visibility-switch"
        role="switch"
        aria-checked={data.visibility?.[field] !== false}
        aria-label={`Show ${label}`}
        disabled={busy}
        onClick={() => void onSave(`visible.${field}`, data.visibility?.[field] === false)}
      >
        <span />
      </button>
    );
  }
  return (
    <section
      className="profile-overview profile-dashboard"
      aria-label={business ? 'Business profile' : 'Personal profile'}
    >
      <div className="profile-left-column">
        <section className="profile-section profile-identity-card">
          <div className="profile-photo-wrap">
            <div className="profile-portrait">
              {image ? <MediaImage id={image} alt={name} /> : <span>{initials(name)}</span>}
            </div>
            <button
              className="profile-camera"
              aria-label={business ? 'Change business logo' : 'Change profile photo'}
              disabled={busy}
              onClick={() => open(imageField)}
            >
              <Icon name="camera" />
            </button>
          </div>
          <div className="profile-name-row">
            <h2>{name}</h2>
            <button
              className="icon-btn"
              aria-label="Edit name"
              disabled={busy}
              onClick={() => open('name')}
            >
              <Icon name="edit" />
            </button>
          </div>
          <span className="profile-kind">{business ? 'Business seller' : 'Personal seller'}</span>
          <div className="profile-photo-visibility">
            <span>Show {business ? 'logo' : 'photo'}</span>
            {visibility('photo', business ? 'business logo' : 'profile photo')}
          </div>
        </section>
        <section className="profile-section profile-about">
          <h2>{business ? 'About your business' : 'About you'}</h2>
          {editing === bioField ? (
            <form
              className="profile-inline-editor"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <label className="form-group">
                <span className="form-label">
                  {business ? 'Business introduction' : 'Short bio'}
                </span>
                <textarea
                  className="field-input"
                  autoFocus
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  maxLength={business ? 2000 : 500}
                  placeholder={
                    business
                      ? 'Tell students what your business offers, where to find you and what makes it useful.'
                      : 'Tell buyers what you study, what you sell or what you enjoy about campus life.'
                  }
                />
              </label>
              <p className="helper">
                {value.length}/{business ? 2000 : 500}
              </p>
              {error ? <ErrorMessage message={error} /> : null}
              <div className="profile-editor-actions">
                <button
                  type="button"
                  className="btn secondary"
                  disabled={busy}
                  onClick={() => {
                    setEditing(null);
                    onReset();
                  }}
                >
                  Cancel
                </button>
                <button className="btn" disabled={busy}>
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="profile-bio">
                {bio ||
                  (business
                    ? 'Tell buyers about your business and what you offer.'
                    : 'Tell buyers a little about yourself and what you sell.')}
              </p>
              <button className="text-link" disabled={busy} onClick={() => open(bioField)}>
                {bio ? 'Edit introduction' : 'Add introduction'} →
              </button>
            </>
          )}
        </section>
      </div>
      <div className="profile-right-column">
        <section className="profile-section">
          <h2>Contact information</h2>
          <p className="profile-section-note">Used to fill in your advert contact details.</p>
          {(
            [
              { label: 'WhatsApp', field: 'whatsapp', value: data.whatsapp, icon: 'chat' },
              { label: 'Phone number', field: 'phone', value: data.phone, icon: 'phone' },
              { label: 'Location', field: 'location', value: data.location, icon: 'pin' },
            ] as const
          ).map((row) => (
            <div className="profile-detail-row" key={row.field}>
              <span className="profile-row-icon">
                <Icon name={row.icon} />
              </span>
              <div>
                <h3>{row.label}</h3>
                <p>{row.value || 'Not added'}</p>
              </div>
              <button
                className="profile-row-action"
                disabled={busy}
                aria-label={`${row.value ? 'Edit' : 'Add'} ${row.label}`}
                onClick={() => open(row.field)}
              >
                {row.value ? 'Edit' : 'Add'}
              </button>
            </div>
          ))}
        </section>
        <section className="profile-section">
          <h2>
            Social media <span>(optional)</span>
          </h2>
          {profileSocialPlatforms.map((platform) => {
            const link = data.socials?.[platform]
              ? socialProfile(platform, data.socials[platform]!)
              : null;
            return (
              <div className="profile-detail-row" key={platform}>
                <span className="profile-row-icon profile-social-letter">
                  <SocialIcon platform={platform} />
                </span>
                <div>
                  <h3>{socialLabels[platform]}</h3>
                  <p>
                    {link ? (
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        @{link.username}
                      </a>
                    ) : (
                      'Not added'
                    )}
                  </p>
                </div>
                <div className="profile-row-controls">
                  {visibility(platform, socialLabels[platform])}
                  <button
                    className="profile-row-action"
                    disabled={busy}
                    aria-label={`${link ? 'Edit' : 'Add'} ${socialLabels[platform]}`}
                    onClick={() => open(`social.${platform}`)}
                  >
                    {link ? 'Edit' : 'Add'}
                  </button>
                </div>
              </div>
            );
          })}
        </section>
        {business ? (
          <section className="profile-section">
            <h2>Business details</h2>
            {['slug', 'categoryId'].map((field) => (
              <div className="profile-detail-row" key={field}>
                <div>
                  <h3>{labels[field]}</h3>
                  <p>
                    {field === 'categoryId'
                      ? (categories.find((c) => c.id === data.categoryId)?.name ?? 'Not added')
                      : (data.slug ?? 'Assigned when your profile is complete')}
                  </p>
                </div>
                <button
                  className="profile-row-action"
                  disabled={busy || (field === 'slug' && !!href)}
                  onClick={() => open(field)}
                  aria-label={`Edit ${labels[field]}`}
                >
                  Edit
                </button>
              </div>
            ))}
          </section>
        ) : null}
        {error && !editing ? <ErrorMessage message={error} /> : null}
        <div className="profile-overview-links">
          {href ? (
            <Link className="text-link" href={href}>
              View public profile →
            </Link>
          ) : null}
          <Link className="text-link" href="/my-adverts">
            Manage adverts →
          </Link>
        </div>
      </div>
      {editing && editing !== bioField ? (
        <Dialog
          initialFocus=".profile-field-dialog input:not([type='checkbox']), .profile-field-dialog select"
          title={label}
          onClose={() => {
            setEditing(null);
            onReset();
          }}
        >
          <form
            className="profile-field-dialog"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {editing === imageField ? (
              <>
                <p className="helper">
                  Choose a JPEG, PNG or WebP image up to 5 MB. Remove the current image to replace
                  it.
                </p>
                <Uploads
                  profilePhoto
                  advertiserId={advertiserId}
                  ids={photo}
                  onChange={setPhoto}
                  max={1}
                  onBusy={setUploading}
                />
              </>
            ) : editing === 'categoryId' ? (
              <label className="form-group">
                <span className="form-label">{label}</span>
                <select
                  className="field-input"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                >
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="form-group">
                <span className="form-label">{label}</span>
                <input
                  className="field-input"
                  autoFocus
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  type={editing === 'phone' || editing === 'whatsapp' ? 'tel' : 'text'}
                  required={!social}
                  maxLength={social ? 300 : editing === 'name' ? 100 : 120}
                  placeholder={
                    editing === 'phone' || editing === 'whatsapp'
                      ? '024 123 4567'
                      : social
                        ? '@username'
                        : editing === 'location'
                          ? 'e.g. Science Market'
                          : undefined
                  }
                  aria-describedby="profile-field-help"
                />
                <span className="helper" id="profile-field-help">
                  {editing === 'phone' || editing === 'whatsapp'
                    ? 'Use a Ghanaian number such as 024 123 4567, or include your country code: +233 24 123 4567.'
                    : social
                      ? `Enter your username or a full link, e.g. ${socialExamples[social]}. Leave blank to remove it.`
                      : editing === 'slug'
                        ? 'Use 3–60 lowercase letters, numbers or hyphens. This URL stays fixed after publication.'
                        : editing === 'location'
                          ? 'Use a recognizable campus area, market or neighbourhood.'
                          : 'Use the name you want buyers to see.'}
                </span>
              </label>
            )}
            {requiresConsent ? (
              <label className="check">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>I agree to show this contact on my public profile and adverts.</span>
              </label>
            ) : null}
            {error ? <ErrorMessage message={error} /> : null}
            <div className="profile-editor-actions">
              <button
                type="button"
                className="btn secondary"
                disabled={busy || uploading}
                onClick={() => {
                  setEditing(null);
                  onReset();
                }}
              >
                Cancel
              </button>
              <button className="btn" disabled={busy || uploading}>
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </section>
  );
}
