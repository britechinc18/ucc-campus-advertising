export const flyerKinds = ['event', 'promotion', 'announcement', 'business_ad'] as const;
export type FlyerKind = (typeof flyerKinds)[number];
export function isFlyer(kind: string): kind is FlyerKind {
  return (flyerKinds as readonly string[]).includes(kind);
}
export const campusCategories = [
  {
    slug: 'events',
    kind: 'event',
    name: 'Events',
    description: 'Programs, parties, seminars and campus activities.',
    icon: 'calendar',
    art: 'events',
  },
  {
    slug: 'promotions',
    kind: 'promotion',
    name: 'Promotions',
    description: 'Offers, discounts and campaigns worth knowing about.',
    icon: 'tag',
    art: 'promotions',
  },
  {
    slug: 'announcements',
    kind: 'announcement',
    name: 'Announcements',
    description: 'Opportunities, notices and community updates.',
    icon: 'megaphone',
    art: 'announcements',
  },
  {
    slug: 'businesses',
    kind: 'business_ad',
    name: 'Businesses',
    description: 'Meet the brands and people building on campus.',
    icon: 'store',
    art: 'businesses',
  },
] as const;
export function kindName(kind: string) {
  return (
    campusCategories.find((c) => c.kind === kind)?.name ??
    (kind === 'wanted' ? 'Wanted' : kind === 'service' ? 'Service' : 'Product')
  );
}

export function safeExternalUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password ? u.href : null;
  } catch {
    return null;
  }
}
