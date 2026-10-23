import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { randomUUID, createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { Agent } from 'node:https';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from './db';
import { actor, advertiser, limits, one, query, visible } from './store';
import { id } from './validation';
import { ensure } from './errors';
import { imageObjectCache } from './media-delivery';
export interface ObjectStorage {
  sign(key: string, type: string, bytes: number): Promise<string>;
  read(key: string, maxBytes: number): Promise<Buffer>;
  write(key: string, data: Buffer): Promise<void>;
  remove(key: string): Promise<void>;
}
function storageClient() {
  const names = ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const;
  ensure(
    names.every((k) => process.env[k]),
    503,
    'STORAGE_UNAVAILABLE',
    'Image storage is not configured',
  );
  const Bucket = process.env.S3_BUCKET!;
  const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    // Neon and other S3-compatible services require path-style requests.
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    // Honor managed-environment proxies without changing normal Vercel networking.
    requestHandler: process.env.HTTPS_PROXY
      ? { httpsAgent: new Agent({ proxyEnv: process.env }) }
      : undefined,
    region: process.env.S3_REGION ?? 'auto',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
  return { s3, Bucket };
}
export function storage(): ObjectStorage {
  const { s3, Bucket } = storageClient();
  return {
    sign: (Key, ContentType, ContentLength) =>
      getSignedUrl(s3, new PutObjectCommand({ Bucket, Key, ContentType, ContentLength }), {
        expiresIn: 300,
      }),
    async read(Key, maxBytes) {
      const load = async () => {
        const object = await s3.send(new GetObjectCommand({ Bucket, Key }));
        ensure(object.Body, 422, 'INVALID_IMAGE', 'Empty image');
        if ((object.ContentLength ?? 0) > maxBytes) {
          if (object.Body instanceof Readable) object.Body.destroy();
          ensure(false, 422, 'IMAGE_TOO_LARGE', 'Image too large');
        }
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of object.Body as AsyncIterable<Uint8Array>) {
          size += chunk.length;
          if (size > maxBytes) {
            if (object.Body instanceof Readable) object.Body.destroy();
            ensure(false, 422, 'IMAGE_TOO_LARGE', 'Image too large');
          }
          chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
      };
      return Key.startsWith('derived/')
        ? imageObjectCache.read(`${process.env.S3_ENDPOINT}:${Bucket}:${Key}`, load)
        : load();
    },
    async write(Key, Body) {
      imageObjectCache.delete(`${process.env.S3_ENDPOINT}:${Bucket}:${Key}`);
      await s3.send(
        new PutObjectCommand({
          Bucket,
          Key,
          Body,
          ContentType: 'image/webp',
          CacheControl: 'private, no-store',
        }),
      );
    },
    async remove(Key) {
      await s3.send(new DeleteObjectCommand({ Bucket, Key }));
    },
  };
}
export async function normalizeImage(raw: Buffer) {
  ensure(raw.length <= 5242880, 422, 'IMAGE_TOO_LARGE', 'Image too large');
  const signature = raw.subarray(0, 12);
  const jpeg = signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
  const png = signature.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp =
    signature.subarray(0, 4).toString() === 'RIFF' &&
    signature.subarray(8, 12).toString() === 'WEBP';
  ensure(jpeg || png || webp, 422, 'INVALID_IMAGE', 'Only JPEG, PNG and WebP images are accepted');
  try {
    const image = sharp(raw, { limitInputPixels: 20000000, animated: false, failOn: 'warning' });
    const metadata = await image.metadata();
    ensure(
      metadata.width &&
        metadata.height &&
        metadata.width >= 64 &&
        metadata.height >= 64 &&
        (metadata.pages ?? 1) === 1,
      422,
      'INVALID_IMAGE',
      'Use a still image at least 64 pixels wide and tall',
    );
    // Re-encoding removes EXIF/GPS metadata and any untrusted input container data.
    return await image
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 86, effort: 4, smartSubsample: true })
      .toBuffer();
  } catch (error) {
    if (error instanceof Error && error.name === 'Error' && 'status' in error) throw error;
    ensure(false, 422, 'INVALID_IMAGE', 'Image could not be processed');
  }
}
export async function signUpload(
  userId: string,
  input: unknown,
  objects: ObjectStorage = storage(),
) {
  const data = z
    .object({
      contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
      bytes: z.number().int().positive().max(5242880),
      advertiserId: id.optional(),
    })
    .strict()
    .parse(input);
  const asset = await db().transaction(async (tx) => {
    const user = await actor(tx, userId);
    const p = await advertiser(tx, user, data.advertiserId);
    const settings = await limits(tx);
    ensure(
      data.bytes <= settings.max_image_bytes,
      422,
      'IMAGE_TOO_LARGE',
      'Image exceeds current size limit',
    );
    const count = await one<{ n: number }>(
      tx,
      sql`select count(*)::int as n from media_assets where advertiser_id=${p.id} and state in ('staged','ready') and created_at>now()-interval '1 day'`,
    );
    ensure(
      user.role === 'admin' || count.n < 30,
      429,
      'UPLOAD_LIMIT',
      'Daily upload limit reached',
    );
    const assetId = randomUUID();
    const key = `staged/${p.id}/${assetId}`;
    await tx.execute(
      sql`insert into media_assets(id,advertiser_id,object_key,bytes) values(${assetId},${p.id},${key},${data.bytes})`,
    );
    return { id: assetId, key };
  });
  return {
    mediaId: asset.id,
    uploadUrl: await objects.sign(asset.key, data.contentType, data.bytes),
    expiresIn: 300,
  };
}
export async function completeUpload(
  userId: string,
  mediaId: string,
  objects: ObjectStorage = storage(),
) {
  id.parse(mediaId);
  // Lock advertiser while finalizing; only this owner's records may become ready.
  const output = await db().transaction(async (tx) => {
    const user = await actor(tx, userId);
    const lookup = await one<{ advertiser_id: string }>(
      tx,
      sql`select advertiser_id from media_assets where id=${mediaId}`,
    );
    await advertiser(tx, user, lookup.advertiser_id);
    const settings = await limits(tx);
    const asset = await one<{ object_key: string; state: string; bytes: number }>(
      tx,
      sql`select * from media_assets where id=${mediaId} for update`,
    );
    if (asset.state === 'ready') return { mediaId, state: 'ready' };
    ensure(asset.state === 'staged', 409, 'STATE_CONFLICT', 'Upload unavailable');
    const raw = await objects.read(asset.object_key, settings.max_image_bytes);
    ensure(
      raw.length === asset.bytes,
      422,
      'IMAGE_SIZE_MISMATCH',
      'Uploaded image size does not match request',
    );
    const normalized = await normalizeImage(raw);
    ensure(
      normalized.length <= settings.max_image_bytes,
      422,
      'IMAGE_TOO_LARGE',
      'Processed image exceeds current size limit',
    );
    const key = `derived/${mediaId}.webp`;
    await objects.write(key, normalized);
    await tx.execute(
      sql`update media_assets set object_key=${key},state='ready',bytes=${normalized.length},checksum=${createHash('sha256').update(normalized).digest('hex')} where id=${mediaId}`,
    );
    return { mediaId, state: 'ready' };
  });
  // A still-valid signed URL can recreate a staged object; maintenance deletes leftovers.
  try {
    const staged = await query<{ advertiser_id: string }>(
      db(),
      sql`select advertiser_id from media_assets where id=${mediaId}`,
    );
    await objects.remove(`staged/${staged[0].advertiser_id}/${mediaId}`);
  } catch {
    /* Bounded cleanup retries in maintenance. */
  }
  return output;
}
export async function readMedia(
  userId: string | undefined,
  mediaId: string,
  objects: ObjectStorage = storage(),
) {
  id.parse(mediaId);
  const publicAsset = await query<{ object_key: string }>(
    db(),
    sql`select m.object_key from media_assets m join revision_media rm on rm.media_id=m.id join advert_revisions r on r.id=rm.revision_id join adverts a on a.approved_revision_id=r.id join advertisers p on p.id=a.advertiser_id left join users u on u.id=p.user_id where m.id=${mediaId} and m.state='ready' and ${visible} limit 1`,
  );
  if (publicAsset[0]) return objects.read(publicAsset[0].object_key, 5242880);
  const logo = await query<{ object_key: string }>(
    db(),
    sql`select m.object_key from media_assets m join business_profiles b on b.approved->>'logoMediaId'=m.id::text join advertisers p on p.id=b.advertiser_id left join users u on u.id=p.user_id where m.id=${mediaId} and m.state='ready' and b.state<>'suspended' and p.closed_at is null and p.deactivated_at is null and not p.suspended and (u.id is null or not u.suspended) limit 1`,
  );
  if (logo[0]) return objects.read(logo[0].object_key, 5242880);
  const photo = await query<{ object_key: string }>(
    db(),
    sql`select m.object_key from media_assets m join advertisers p on p.approved_defaults->>'photoMediaId'=m.id::text left join users u on u.id=p.user_id where m.id=${mediaId} and m.state='ready' and p.closed_at is null and not p.suspended and (u.id is null or not u.suspended) and p.privacy->>'photo' is distinct from 'false' and exists(select 1 from adverts a join advert_revisions r on a.approved_revision_id=r.id where a.advertiser_id=p.id and ${visible}) limit 1`,
  );
  if (photo[0]) return objects.read(photo[0].object_key, 5242880);
  ensure(userId, 404, 'NOT_FOUND', 'Image not found');
  const key = await db().transaction(async (tx) => {
    const user = await actor(tx, userId);
    const asset = await one<{ advertiser_id: string; object_key: string; state: string }>(
      tx,
      sql`select * from media_assets where id=${mediaId}`,
    );
    await advertiser(tx, user, asset.advertiser_id);
    ensure(asset.state === 'ready', 404, 'NOT_FOUND', 'Image not found');
    return asset.object_key;
  });
  return objects.read(key, 5242880);
}

// Bounded read-only inventory includes staging/derived objects and cleanup leftovers.
export async function imageStorageUsage() {
  const { s3, Bucket } = storageClient();
  const signal = AbortSignal.timeout(8000);
  let bytes = 0,
    objects = 0,
    token: string | undefined;
  for (let page = 0; page < 10; page++) {
    const result = await s3.send(
      new ListObjectsV2Command({ Bucket, MaxKeys: 1000, ContinuationToken: token }),
      { abortSignal: signal },
    );
    for (const object of result.Contents ?? []) {
      bytes += object.Size ?? 0;
      objects++;
    }
    if (!result.IsTruncated) return { bytes, objects, complete: true };
    token = result.NextContinuationToken;
    if (!token) break;
  }
  return { bytes, objects, complete: false };
}
