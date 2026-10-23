'use client';
import type { ProfileDefaults } from '@/lib/seller-profile';
import { socialPlatforms } from '@/lib/socials';
export function readProfileContacts(f: FormData) {
  const socials = Object.fromEntries(
    socialPlatforms.map((p) => [p, String(f.get(`social.${p}`) ?? '').trim()]).filter(([, v]) => v),
  );
  return {
    ...(String(f.get('phone') ?? '').trim() ? { phone: String(f.get('phone')).trim() } : {}),
    ...(String(f.get('whatsapp') ?? '').trim()
      ? { whatsapp: String(f.get('whatsapp')).trim() }
      : {}),
    socials,
    visibility: {
      phone: true,
      whatsapp: true,
      ...Object.fromEntries(
        [...socialPlatforms, 'photo'].map((p) => [p, f.get(`visible.${p}`) === 'on']),
      ),
    },
    contactConsent: f.get('consent') === 'on',
  };
}
export function ProfileContacts({
  data,
  business = false,
}: {
  data: ProfileDefaults;
  business?: boolean;
}) {
  return (
    <>
      <div className="form-grid">
        <label className="form-group">
          <span className="form-label">{business ? 'Business WhatsApp' : 'WhatsApp number'}</span>
          <input
            className="field-input"
            name="whatsapp"
            type="tel"
            required
            autoComplete="tel"
            defaultValue={data.whatsapp ?? ''}
          />
        </label>
        <label className="form-group">
          <span className="form-label">{business ? 'Business phone' : 'Phone number'}</span>
          <input
            className="field-input"
            name="phone"
            aria-label={business ? 'Business phone' : 'Phone number'}
            type="tel"
            required
            defaultValue={data.phone ?? ''}
          />
          <span className="helper">May be the same as your WhatsApp number.</span>
        </label>
      </div>
      <fieldset className="profile-fields">
        <legend>Social profiles (optional)</legend>
        {socialPlatforms.map((p) => (
          <label className="form-group" key={p}>
            <span className="form-label">
              {p === 'x' ? 'X' : p[0].toUpperCase() + p.slice(1)} profile URL
            </span>
            <input
              className="field-input"
              type="url"
              name={`social.${p}`}
              maxLength={300}
              defaultValue={data.socials?.[p] ?? ''}
            />
          </label>
        ))}
      </fieldset>
      <fieldset className="profile-fields">
        <legend>Public visibility</legend>
        <p className="helper">
          Choose which optional socials and photo appear publicly. Phone and WhatsApp are always
          shown.
        </p>
        {([...socialPlatforms, 'photo'] as const).map((p) => (
          <label className="check" key={p}>
            <input
              type="checkbox"
              name={`visible.${p}`}
              defaultChecked={data.visibility?.[p] !== false}
            />
            <span>Show {p === 'photo' ? 'profile photo / logo' : p === 'x' ? 'X' : p}</span>
          </label>
        ))}
      </fieldset>
      <label className="check">
        <input type="checkbox" name="consent" defaultChecked={!!data.contactConsent} required />
        <span>I consent to publish the visible contact details and social profiles above.</span>
      </label>
    </>
  );
}
