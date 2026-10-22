import { createHash } from 'node:crypto';
import sharp from 'sharp';
// Ephemeral warm-instance caches; visibility/ownership must be checked before use.
export class MediaByteCache {
  private entries = new Map<string, { bytes: Buffer; until: number }>();
  private total = 0;
  constructor(
    private capacity = 8 * 1024 * 1024,
    private ttl = 300000,
  ) {}
  delete(key: string) {
    const entry = this.entries.get(key);
    if (entry) {
      this.total -= entry.bytes.length;
      this.entries.delete(key);
    }
  }
  async read(key: string, load: () => Promise<Buffer>) {
    const entry = this.entries.get(key);
    if (entry && entry.until > Date.now()) {
      this.entries.delete(key);
      this.entries.set(key, entry);
      return entry.bytes;
    }
    this.delete(key);
    const bytes = await load();
    if (bytes.length <= this.capacity) {
      while (
        (this.total + bytes.length > this.capacity || this.entries.size >= 128) &&
        this.entries.size
      )
        this.delete(this.entries.keys().next().value!);
      // Another concurrent load may have completed while this one awaited I/O.
      this.delete(key);
      this.entries.set(key, { bytes, until: Date.now() + this.ttl });
      this.total += bytes.length;
    }
    return bytes;
  }
}
export const imageObjectCache = new MediaByteCache();
const variants = new MediaByteCache(4 * 1024 * 1024);
export async function mediaResponse(
  source: Buffer,
  width: number | undefined,
  ifNoneMatch: string | null,
) {
  const hash = createHash('sha256').update(source).digest('hex');
  const etag = `"${hash}-${width ?? 'original'}"`;
  // Private browser caching always revalidates; never CDN-cache a visibility-gated response.
  const headers = {
    'Cache-Control': 'private, no-cache',
    'Content-Type': 'image/webp',
    ETag: etag,
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Cookie',
  };
  if (ifNoneMatch?.split(',').some((value) => value.trim() === etag))
    return new Response(null, { status: 304, headers });
  const bytes = width
    ? await variants.read(`${hash}:${width}`, () =>
        sharp(source)
          .resize({ width, withoutEnlargement: true, fit: 'inside' })
          .webp({ quality: 80 })
          .toBuffer(),
      )
    : source;
  return new Response(new Uint8Array(bytes), { headers });
}
