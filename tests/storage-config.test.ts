import { afterEach, describe, it, expect, vi } from 'vitest';
import { storage } from '../src/server/storage';
afterEach(() => vi.unstubAllEnvs());
describe('S3-compatible browser upload signing', () => {
  it('uses path-style addressing and avoids a checksum for an absent signing body', async () => {
    for (const [k, v] of Object.entries({
      S3_ENDPOINT: 'https://test-branch.storage.example.invalid',
      S3_REGION: 'eu-central-1',
      S3_BUCKET: 'private-images',
      S3_ACCESS_KEY_ID: 'synthetic-storage-key',
      S3_SECRET_ACCESS_KEY: 'synthetic-storage-secret',
    }))
      vi.stubEnv(k, v);
    const signed = new URL(await storage().sign('staged/test/photo', 'image/jpeg', 400));
    expect(signed.hostname).toBe('test-branch.storage.example.invalid');
    expect(signed.pathname).toBe('/private-images/staged/test/photo');
    expect(signed.searchParams.has('x-amz-checksum-crc32')).toBe(false);
    expect(signed.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(signed.searchParams.get('X-Amz-SignedHeaders')).toContain('content-length');
  });
});
