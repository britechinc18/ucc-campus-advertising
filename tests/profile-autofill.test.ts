import { describe, it, expect } from 'vitest';
import { autofillContacts, type ContactDraft } from '../src/lib/seller-profile';
const empty: ContactDraft = {
  displayName: '',
  phone: '',
  whatsapp: '',
  location: '',
  socials: {},
  contactOverrides: [],
};
const personal = {
  name: 'Ama',
  version: 1,
  defaults: {
    name: 'Ama',
    phone: '+233241234567',
    whatsapp: '+233543982307',
    location: 'UCC',
    contactConsent: true,
    socials: { instagram: 'https://www.instagram.com/ama' },
  },
};
const business = {
  name: 'Ama Styles',
  version: 2,
  defaults: {
    name: 'Ama Styles',
    phone: '+233201234567',
    whatsapp: '+233501234567',
    location: 'Cape Coast',
    contactConsent: true,
  },
};
describe('profile autofill and advert-specific overrides', () => {
  it('fills defaults only for a complete profile and respects hidden channels', () => {
    const filled = autofillContacts(empty, personal);
    expect(filled.phone).toBe(personal.defaults.phone);
    expect(filled.profileVersion).toBe(1);
    expect(filled.contactSources).toContain('phone');
    const hidden = autofillContacts(empty, {
      ...personal,
      defaults: { ...personal.defaults, visibility: { phone: false } },
    });
    expect(hidden.phone).toBe('');
    expect(hidden.whatsapp).toBe(personal.defaults.whatsapp);
    expect(
      autofillContacts(empty, { name: 'Incomplete', defaults: { name: 'Incomplete' } })
        .contactSources,
    ).toBeUndefined();
  });
  it('preserves overrides, including intentionally blank values, when switching identity', () => {
    const form = {
      ...autofillContacts(empty, personal),
      location: 'Pickup at the library',
      phone: '',
      contactOverrides: ['location', 'phone'] as const,
    };
    const next = autofillContacts(
      { ...form, contactOverrides: [...form.contactOverrides] },
      business,
    );
    expect(next.location).toBe('Pickup at the library');
    expect(next.phone).toBe('');
    expect(next.whatsapp).toBe(business.defaults.whatsapp);
    expect(next.contactSources).not.toContain('phone');
    expect(next.displayName).toBe('Ama Styles');
  });
  it('restores profile defaults only when explicitly requested and leaves the input immutable', () => {
    const current = {
      ...autofillContacts(empty, personal),
      phone: '+233201234567',
      contactOverrides: ['phone'] as ContactDraft['contactOverrides'],
    };
    expect(autofillContacts(current, personal).phone).toBe('+233201234567');
    expect(autofillContacts(current, personal, true).phone).toBe(personal.defaults.phone);
    expect(current.phone).toBe('+233201234567');
  });
  it('uses the last complete approved defaults when an incomplete private draft exists', () => {
    const value = autofillContacts(empty, {
      ...personal,
      defaults: { name: 'Incomplete draft' },
      approvedDefaults: personal.defaults,
    });
    expect(value.whatsapp).toBe(personal.defaults.whatsapp);
  });
});
