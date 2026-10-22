// Local browser fixtures only. Never run against shared/hosted application data.
import { Pool } from 'pg';
import { randomUUID, randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const url = process.env.TEST_DATABASE_URL;
if (
  !url ||
  !new URL(url).pathname.endsWith('_test') ||
  !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)
)
  throw new Error('A local disposable TEST_DATABASE_URL ending _test is required');
const pool = new Pool({ connectionString: url });
try {
  await pool.query(
    'TRUNCATE users,advertisers,adverts,advert_revisions,advertiser_daily_usage,idempotency_keys,audit_events,reports,media_assets,revision_media,business_profiles,featured_adverts,daily_advert_metrics,rate_limit_buckets CASCADE',
  );
  const owner = randomUUID(),
    admin = randomUUID(),
    stranger = randomUUID(),
    seller = randomUUID(),
    businessSeller = randomUUID();
  const ownerToken = randomBytes(24).toString('hex'),
    adminToken = randomBytes(24).toString('hex'),
    strangerToken = randomBytes(24).toString('hex');
  await pool.query(
    "insert into users(id,name,email,email_verified,role) values($1,'Browser Test Student','browser-student@test.invalid',now(),'advertiser'),($2,'Browser Test Admin','browser-admin@test.invalid',now(),'admin'),($3,'Browser Test Visitor','browser-visitor@test.invalid',now(),'advertiser')",
    [owner, admin, stranger],
  );
  for (const [user, token] of [
    [owner, ownerToken],
    [admin, adminToken],
    [stranger, strangerToken],
  ])
    await pool.query(
      "insert into sessions(session_token,user_id,expires) values($1,$2,now()+interval '1 day')",
      [token, user],
    );
  await pool.query(
    "insert into advertisers(id,user_id,name,kind,consent_at,created_by) values($1,$2,'Browser Test Student','student',now(),$2),($3,null,'Browser Test Campus Services','business',now(),$4)",
    [seller, owner, businessSeller, admin],
  );
  const category = (
    await pool.query('select id from categories where active order by name limit 1')
  ).rows[0].id;
  let publicId = '';
  for (const [title, price, sellerId] of [
    ['Browser test tutoring service', 7500, seller],
    ['Browser test printing service', 2500, businessSeller],
    ['Browser test study support', 12000, seller],
  ] as const) {
    const advertId = randomUUID(),
      revisionId = randomUUID();
    const data = {
      title,
      description: 'Local browser fixture only. A useful service for students around campus.',
      categoryId: category,
      kind: 'service',
      condition: 'not_applicable',
      priceMode: 'fixed',
      pricePesewas: price,
      location: 'UCC campus',
      phone: '+233241234567',
      whatsapp: '+233241234567',
      contactConsent: true,
      mediaIds: [],
    };
    await pool.query(
      "insert into adverts(id,advertiser_id,created_by,state,published_at,expires_at) values($1,$2,$3,'published',now(),now()+interval '30 days')",
      [advertId, sellerId, owner],
    );
    await pool.query(
      "insert into advert_revisions(id,advert_id,category_id,data,fingerprint,status,submitted_at,reviewed_at) values($1,$2,$3,$4,$5,'approved',now(),now())",
      [revisionId, advertId, category, data, randomUUID()],
    );
    await pool.query('update adverts set approved_revision_id=$1 where id=$2', [
      revisionId,
      advertId,
    ]);
    publicId ||= advertId;
  }
  const bp = {
    slug: 'browser-test-services',
    description:
      'Local browser fixture only. Practical campus services for testing the approved directory.',
    location: 'UCC campus',
    phone: '+233241234567',
    contactConsent: true,
  };
  await pool.query(
    "insert into business_profiles(advertiser_id,slug,approved,state) values($1,$2,$3,'approved')",
    [businessSeller, bp.slug, bp],
  );
  const out = process.env.BROWSER_FIXTURE_FILE ?? '/tmp/ucc-browser-fixtures.json';
  writeFileSync(
    out,
    JSON.stringify({
      owner,
      admin,
      stranger,
      ownerToken,
      adminToken,
      strangerToken,
      seller,
      businessSeller,
      category,
      publicId,
    }),
    { mode: 0o600 },
  );
  console.log('Local browser fixtures created; session tokens written privately.');
} finally {
  await pool.end();
}
