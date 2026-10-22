import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';
import { MediaByteCache, mediaResponse } from '../src/server/media-delivery';
describe('bounded immutable image delivery', () => {
  it('reuses warm object bytes and bounds storage with eviction and expiry', async () => {
    const cache = new MediaByteCache(10, 100);
    const loader = vi.fn(async () => Buffer.alloc(6));
    await cache.read('a', loader);
    await cache.read('a', loader);
    expect(loader).toHaveBeenCalledTimes(1);
    await cache.read('b', loader);
    await cache.read('a', loader);
    expect(loader).toHaveBeenCalledTimes(3);
    const short = new MediaByteCache(20, -1);
    await short.read('a', loader);
    await short.read('a', loader);
    expect(loader).toHaveBeenCalledTimes(5);
    const large = new MediaByteCache(2);
    await large.read('a', loader);
    await large.read('a', loader);
    expect(loader).toHaveBeenCalledTimes(7);
  });
  it('serves small proportional WebP variants and revalidates privately', async () => {
    const source = await sharp({
      create: { width: 1200, height: 1600, channels: 3, background: '#163d32' },
    })
      .webp({ quality: 80 })
      .toBuffer();
    const response = await mediaResponse(source, 360, null);
    const result = Buffer.from(await response.arrayBuffer());
    const info = await sharp(result).metadata();
    expect(info.width).toBe(360);
    expect(info.height).toBe(480);
    expect(info.format).toBe('webp');
    expect(result.length).toBeLessThan(source.length);
    expect(response.headers.get('cache-control')).toBe('private, no-cache');
    expect((await mediaResponse(source, 360, response.headers.get('etag'))).status).toBe(304);
    expect((await mediaResponse(source, 720, response.headers.get('etag'))).status).toBe(200);
    expect(Buffer.from(await (await mediaResponse(source, undefined, null)).arrayBuffer())).toEqual(
      source,
    );
  });
});
