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
