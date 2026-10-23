import type { ContactField, ProfileDefaults, ProfileVisibility } from './seller-profile';
import type { SocialLinks } from './socials';
import { isFlyer, kindName } from './campus';
export interface AdvertContent {
  displayName?: string;
  contactSources?: ContactField[];
  profileVersion?: number;
  title: string;
  description: string;
  categoryId: string;
  kind: 'product' | 'service' | 'wanted' | 'event' | 'promotion' | 'announcement' | 'business_ad';
  details?: { startsAt?: string; endsAt?: string; externalUrl?: string; offer?: string };
  condition: 'new' | 'used' | 'not_applicable';
  priceMode: 'fixed' | 'negotiable' | 'free' | 'contact' | 'budget';
  pricePesewas: number | null;
  location: string;
  phone?: string;
  whatsapp?: string;
  socials?: SocialLinks;
  contactConsent: true;
  mediaIds: string[];
}
export interface Listing {
  category_name?: string;
  id: string;
  advertiser_id: string;
  seller: string;
  seller_kind: string;
  data: AdvertContent;
  expires_at: string;
  published_at: string;
  contacts?: { phone: string | null; whatsapp: string | null };
}
export interface Revision {
  id: string;
  status: string;
  data: AdvertContent;
  reason: string | null;
  created_at: string;
  purpose: string;
  submitted_at: string | null;
}
export interface OwnAdvert {
  id: string;
  state: string;
  approved_revision_id: string | null;
  privacy_hidden?: boolean;
  expires_at: string | null;
  revisions: Revision[];
  advertiser_name?: string;
  advertiser_id?: string;
}
export interface Category {
  id: string;
  name: string;
  slug: string;
  active?: boolean;
}
export interface BusinessProfile {
  defaultsEnabled?: boolean;
  version?: number;
  visibility?: ProfileVisibility;
  socials?: SocialLinks;
  categoryId?: string;
  name?: string;
  slug: string;
  description: string;
  location: string;
  logoMediaId?: string;
  phone?: string;
  whatsapp?: string;
  contactConsent?: true;
}
export interface Business {
  id: string;
  advertiser_id: string;
  slug: string;
  name: string;
  approved: BusinessProfile;
}
export interface SellerIdentity {
  id: string;
  name: string;
  kind: string;
  suspended: boolean;
  version?: number;
  approvedVersion?: number;
  defaults?: ProfileDefaults | null;
  approvedDefaults?: ProfileDefaults | null;
  deactivated?: boolean;
  reactivationPending?: boolean;
}
export interface Account {
  profiles: SellerIdentity[];
  role: string;
  profile: { id: string; name: string; kind: string; suspended: boolean } | null;
  settings: {
    max_active: number;
    daily_limit: number;
    duration_days: number;
    max_images: number;
    max_image_bytes: number;
    version: number;
  };
  activeCount: number;
  dailyUsed: number;
}
export function parseMoney(value: string): number | null {
  const v = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(v)) return null;
  const [whole, fraction = ''] = v.split('.');
  const n = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(n) && n <= 100000000 ? n : null;
}
export function priceText(
  d: Pick<AdvertContent, 'priceMode' | 'pricePesewas'> & Partial<Pick<AdvertContent, 'kind'>>,
) {
  if (d.kind && isFlyer(d.kind)) return kindName(d.kind) + ' · Campus 360';
  if (d.priceMode === 'free') return 'Free';
  if (d.priceMode === 'contact' || d.pricePesewas === null) return 'Contact for price';
  return `${d.priceMode === 'budget' ? 'Budget: ' : ''}GH₵${(d.pricePesewas / 100).toLocaleString('en-GH', { minimumFractionDigits: d.pricePesewas % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
}
export function effectiveState(a: OwnAdvert, now = Date.now()) {
  return a.state === 'published' && a.expires_at && Date.parse(a.expires_at) <= now
    ? 'expired'
    : a.state;
}
export function stateLabel(state: string, kind = 'product') {
  return (
    (
      {
        published: 'Live',
        pending: 'Pending approval',
        rejected: 'Changes requested',
        draft: 'Draft',
        expired: 'Expired',
        withdrawn: 'Withdrawn',
        suspended: 'Suspended',
        fulfilled:
          kind === 'wanted' ? 'Found' : kind === 'service' || isFlyer(kind) ? 'Completed' : 'Sold',
      } as Record<string, string>
    )[state] ?? state
  );
}
export function latestContent(a: OwnAdvert) {
  return a.revisions[0]?.data;
}
export function dateText(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat('en-GH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Africa/Accra',
      }).format(new Date(value))
    : '—';
}
export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}
export function safeReturn(value: string | undefined) {
  return value?.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    ? value
    : '/my-adverts';
}
