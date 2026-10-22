// Explicitly opted-in provider check. Never print credentials or presigned URLs.
import {
  S3Client,
  HeadBucketCommand,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Agent } from 'node:https';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
const endpoint = process.env.S3_ENDPOINT,
  bucket = process.env.S3_BUCKET,
  branch = process.env.STORAGE_PROBE_BRANCH;
if (
  !endpoint ||
  !bucket ||
  !branch ||
  process.env.STORAGE_PROBE_CONFIRM !== 'isolated-test-bucket' ||
  !new URL(endpoint).hostname.startsWith(branch + '.storage.')
)
  throw new Error('Explicit isolated branch/bucket confirmation required');
const origins = (process.env.STORAGE_CORS_ORIGINS ?? 'http://localhost:3000').split(',');
const client = new S3Client({
  endpoint,
  region: process.env.S3_REGION,
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  requestHandler: new NodeHttpHandler({ httpsAgent: new Agent({ proxyEnv: process.env }) }),
});
const checks: string[] = [];
const check = (ok: boolean, name: string) => {
  if (!ok) throw new Error(name);
  checks.push(name);
};
try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
  checks.push('Scoped credential can access the isolated private bucket');
  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: origins,
            AllowedMethods: ['PUT'],
            AllowedHeaders: ['content-type'],
            MaxAgeSeconds: 300,
          },
        ],
      },
    }),
  );
  const cors = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
  check(
    cors.CORSRules?.[0].AllowedOrigins?.join(',') === origins.join(','),
    'Exact-origin CORS configuration round-trips',
  );
  const bytes = await sharp({
    create: { width: 128, height: 128, channels: 3, background: '#126e61' },
  })
    .jpeg()
    .toBuffer();
  const key = `integration-probe/${randomUUID()}.jpg`;
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: 'image/jpeg',
      ContentLength: bytes.length,
    }),
    { expiresIn: 300 },
  );
  const uploaded = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: new Uint8Array(bytes),
  });
  check(uploaded.ok, 'Real presigned PUT succeeds with the advertised content length');
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const read = await object.Body?.transformToByteArray();
  check(
    !!read && Buffer.from(read).equals(bytes),
    'Authenticated read returns exactly the uploaded bytes',
  );
  const privateRead = await fetch(`${endpoint}/${bucket}/${key}`);
  check(privateRead.status === 403 || privateRead.status === 404, 'Unsigned object read is denied');
  const list = await fetch(`${endpoint}/${bucket}?list-type=2`);
  check(list.status === 403 || list.status === 404, 'Anonymous bucket listing is denied');
  const allowed = await fetch(`${endpoint}/${bucket}/${key}`, {
    method: 'OPTIONS',
    headers: {
      Origin: origins[0],
      'Access-Control-Request-Method': 'PUT',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  check(
    allowed.ok && allowed.headers.get('access-control-allow-origin') === origins[0],
    'Allowed-origin browser preflight succeeds',
  );
  const denied = await fetch(`${endpoint}/${bucket}/${key}`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://unrelated.invalid',
      'Access-Control-Request-Method': 'PUT',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  check(
    denied.headers.get('access-control-allow-origin') !== 'https://unrelated.invalid',
    'Unrelated origins receive no upload CORS permission',
  );
  console.log(
    JSON.stringify({
      passed: checks.length,
      checks,
      testObjectPrefix: 'integration-probe/',
      retainedInIsolatedBranch: true,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      passed: checks,
      errorType: error instanceof Error ? error.name : 'Unknown',
      failedCheck:
        error instanceof Error
          ? error.message.replace(/https?:\/\/\S+/g, '[redacted URL]')
          : 'Unknown',
    }),
  );
  process.exitCode = 1;
} finally {
  client.destroy();
}
