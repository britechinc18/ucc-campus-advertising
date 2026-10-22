// Explicit operator command. Credentials stay in environment variables, never output.
import {
  S3Client,
  HeadBucketCommand,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Agent } from 'node:https';
const endpoint = process.env.S3_ENDPOINT ?? '',
  branch = process.env.STORAGE_CONFIGURE_BRANCH,
  bucket = process.env.S3_BUCKET;
const origins = (process.env.STORAGE_CORS_ORIGINS ?? '').split(',').filter(Boolean);
if (
  !branch ||
  !bucket ||
  !new URL(endpoint).hostname.startsWith(branch + '.storage.') ||
  !origins.length ||
  origins.some((origin) => {
    try {
      const u = new URL(origin);
      return u.origin !== origin || u.protocol !== 'https:' || origin.includes('*');
    } catch {
      return true;
    }
  })
)
  throw new Error('Explicit branch, bucket and exact HTTPS origins required');
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
try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
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
  const read = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
  if (JSON.stringify(read.CORSRules?.[0].AllowedOrigins) !== JSON.stringify(origins))
    throw new Error('CORS verification failed');
  console.log(
    JSON.stringify({
      configured: true,
      allowedOrigins: origins,
      allowedMethods: ['PUT'],
      bucketRemainsPrivate: true,
    }),
  );
} finally {
  client.destroy();
}
