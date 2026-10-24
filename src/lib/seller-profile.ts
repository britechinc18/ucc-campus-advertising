import type { SocialLinks } from './socials';
export const contactFields = [
  'displayName',
  'phone',
  'whatsapp',
  'location',
  'tiktok',
  'snapchat',
  'instagram',
  'x',
] as const;
export type ContactField = (typeof contactFields)[number];
export const privacyFields = [
  'phone',
  'whatsapp',
  'tiktok',
  'snapchat',
  'instagram',
  'x',
  'photo',
  'facebook',
] as const;
export type ProfileVisibility = Partial<Record<(typeof privacyFields)[number], boolean>>;
export interface ProfileDefaults {
  name?: string;
  phone?: string;
  whatsapp?: string;
  location?: string;
  bio?: string;
  photoMediaId?: string;
  socials?: SocialLinks;
  visibility?: ProfileVisibility;
  contactConsent?: boolean;
  defaultsEnabled?: boolean;
}
export interface ManagedProfile {
  id: string;
  kind: string;
  name: string;
  version: number;
  approvedVersion: number;
  draft: ProfileDefaults | null;
  approved: ProfileDefaults | null;
  state: string;
  reason: string | null;
  suspended: boolean;
  deactivated: boolean;
  reactivationPending: boolean;
  linkedCount: number;
  overrideCount: number;
}
export function profileField(profile: ProfileDefaults, field: ContactField): string {
  if (field === 'displayName') return profile.name ?? '';
  if (field === 'location') return profile.location ?? '';
  if (profile.visibility?.[field] === false) return '';
  if (field === 'phone' || field === 'whatsapp') return profile[field] ?? '';
  return profile.socials?.[field] ?? '';
}

export function profileComplete(
  value: ProfileDefaults | null | undefined,
): value is ProfileDefaults {
  return !!(value?.name && value.phone && value.whatsapp && value.location && value.contactConsent);
}
export interface ContactDraft {
  displayName: string;
  phone: string;
  whatsapp: string;
  location: string;
  socials: SocialLinks;
  contactSources?: ContactField[];
  profileVersion?: number;
  contactOverrides: ContactField[];
}
export function autofillContacts(
  current: ContactDraft,
  identity: {
    name: string;
    version?: number;
    defaults?: ProfileDefaults | null;
    approvedDefaults?: ProfileDefaults | null;
  },
  restore = false,
): ContactDraft {
  const defaults = profileComplete(identity.defaults)
    ? identity.defaults
    : profileComplete(identity.approvedDefaults)
      ? identity.approvedDefaults
      : (identity.defaults ?? { name: identity.name });
  const overrides = restore ? [] : current.contactOverrides;
  const next = { ...current, socials: { ...current.socials }, contactOverrides: overrides };
  for (const field of contactFields) {
    if (overrides.includes(field)) continue;
    const value = profileField(defaults, field);
    if (
      field === 'displayName' ||
      field === 'phone' ||
      field === 'whatsapp' ||
      field === 'location'
    )
      next[field] = value;
    else if (value) next.socials[field] = value;
    else delete next.socials[field];
  }
  next.contactSources = profileComplete(defaults)
    ? contactFields.filter((f) => !overrides.includes(f))
    : undefined;
  next.profileVersion = profileComplete(defaults) ? (identity.version ?? 0) : undefined;
  return next;
}
