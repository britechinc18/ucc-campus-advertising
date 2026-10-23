import 'server-only';
import type { Metadata } from 'next';
export function sharingMetadata(
  title: string,
  description: string,
  path: string,
  imageId?: string,
): Metadata {
  const origin = process.env.APP_ORIGIN!;
  const url = new URL(path, origin).href;
  const images = imageId
    ? [{ url: new URL(`/api/v1/media/${imageId}?width=720`, origin).href, alt: title }]
    : [];
  const summary = description.replace(/\s+/g, ' ').trim().slice(0, 180);
  return {
    title,
    description: summary,
    alternates: { canonical: url },
    openGraph: { type: 'website', siteName: 'MedStash', title, description: summary, url, images },
    twitter: {
      card: imageId ? 'summary_large_image' : 'summary',
      title,
      description: summary,
      images: images.map((i) => i.url),
    },
  };
}
