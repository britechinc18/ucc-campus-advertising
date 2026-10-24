import {
  pgTable,
  text,
  uuid,
  integer,
  boolean,
  timestamp,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { AdapterAccountType } from 'next-auth/adapters';
const time = (name: string) => timestamp(name, { withTimezone: true });
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name'),
    email: text('email').unique(),
    emailVerified: time('email_verified'),
    image: text('image'),
    role: text('role').notNull().default('advertiser'),
    suspended: boolean('suspended').notNull().default(false),
  },
  (t) => [check('user_role', sql`${t.role} in ('advertiser','admin')`)],
);
export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);
export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: time('expires').notNull(),
});
export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: time('expires').notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);
export const advertisers = pgTable(
  'advertisers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id),
    name: text('name').notNull(),
    kind: text('kind').notNull(),
    closedAt: time('closed_at'),
    deactivatedAt: time('deactivated_at'),
    reactivationPending: boolean('reactivation_pending').notNull().default(false),
    automaticPersonal: boolean('automatic_personal').notNull().default(false),
    draftDefaults: jsonb('draft_defaults').$type<Record<string, unknown>>(),
    approvedDefaults: jsonb('approved_defaults').$type<Record<string, unknown>>(),
    defaultsVersion: integer('defaults_version').notNull().default(0),
    approvedDefaultsVersion: integer('approved_defaults_version').notNull().default(0),
    profileState: text('profile_state').notNull().default('incomplete'),
    profileReason: text('profile_reason'),
    privacy: jsonb('privacy').notNull().default({}).$type<Record<string, boolean>>(),
    suspended: boolean('suspended').notNull().default(false),
    trusted: boolean('trusted').notNull().default(false),
    consentAt: time('consent_at').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: time('created_at').defaultNow().notNull(),
  },
  (t) => [
    check('advertiser_kind', sql`${t.kind} in ('student','business')`),
    uniqueIndex('advertisers_user_kind_unique')
      .on(t.userId, t.kind)
      .where(sql`${t.closedAt} is null`),
  ],
);
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  active: boolean('active').notNull().default(true),
});
export const settings = pgTable(
  'platform_settings',
  {
    id: integer('id').primaryKey().default(1),
    maxActive: integer('max_active').notNull().default(5),
    dailyLimit: integer('daily_limit').notNull().default(3),
    durationDays: integer('duration_days').notNull().default(30),
    maxImages: integer('max_images').notNull().default(5),
    maxImageBytes: integer('max_image_bytes').notNull().default(5242880),
    autoPublish: boolean('auto_publish').notNull().default(true),
    postingLimitsEnabled: boolean('posting_limits_enabled').notNull().default(false),
    version: integer('version').notNull().default(1),
  },
  (t) => [
    check('singleton', sql`${t.id}=1`),
    check(
      'settings_bounds',
      sql`${t.maxActive} between 1 and 100 and ${t.dailyLimit} between 1 and 100 and ${t.durationDays} between 1 and 365 and ${t.maxImages} between 1 and 5 and ${t.maxImageBytes} between 1 and 5242880`,
    ),
  ],
);
export const adverts = pgTable(
  'adverts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    advertiserId: uuid('advertiser_id')
      .notNull()
      .references(() => advertisers.id),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    privacyHidden: boolean('privacy_hidden').notNull().default(false),
    state: text('state').notNull().default('draft'),
    approvedRevisionId: uuid('approved_revision_id'),
    publishedAt: time('published_at'),
    expiresAt: time('expires_at'),
    createdAt: time('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('advertiser_state').on(t.advertiserId, t.state),
    index('public_expiry').on(t.state, t.expiresAt, t.publishedAt),
    check(
      'advert_state',
      sql`${t.state} in ('draft','pending','published','rejected','withdrawn','fulfilled','expired','suspended')`,
    ),
  ],
);
export const revisions = pgTable(
  'advert_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    advertId: uuid('advert_id')
      .notNull()
      .references(() => adverts.id),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    status: text('status').notNull().default('draft'),
    purpose: text('purpose').notNull().default('new'),
    data: jsonb('data').notNull().$type<Record<string, unknown>>(),
    fingerprint: text('fingerprint').notNull(),
    quotaCharged: boolean('quota_charged').notNull().default(false),
    submittedAt: time('submitted_at'),
    reviewedAt: time('reviewed_at'),
    reason: text('reason'),
    createdAt: time('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('moderation_queue').on(t.status, t.submittedAt),
    index('duplicate_fingerprint').on(t.fingerprint),
    uniqueIndex('one_open_revision')
      .on(t.advertId)
      .where(sql`${t.status} in ('draft','pending')`),
    check(
      'revision_state',
      sql`${t.status} in ('draft','pending','approved','rejected','cancelled')`,
    ),
    check('revision_purpose', sql`${t.purpose} in ('new','edit','renew')`),
  ],
);
export const dailyUsage = pgTable(
  'advertiser_daily_usage',
  {
    advertiserId: uuid('advertiser_id')
      .notNull()
      .references(() => advertisers.id),
    day: text('day').notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.advertiserId, t.day] }),
    check('usage_positive', sql`${t.count}>=0`),
  ],
);
export const idempotency = pgTable(
  'idempotency_keys',
  {
    advertiserId: uuid('advertiser_id')
      .notNull()
      .references(() => advertisers.id),
    key: uuid('key').notNull(),
    requestHash: text('request_hash').notNull(),
    response: jsonb('response').notNull(),
    createdAt: time('created_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.advertiserId, t.key] })],
);
export const audit = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => users.id),
  action: text('action').notNull(),
  targetId: uuid('target_id'),
  detail: jsonb('detail').notNull().default({}),
  createdAt: time('created_at').notNull().defaultNow(),
});
export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    advertId: uuid('advert_id')
      .notNull()
      .references(() => adverts.id),
    reason: text('reason').notNull(),
    detail: text('detail'),
    reporterHash: text('reporter_hash').notNull(),
    day: text('day').notNull(),
    status: text('status').notNull().default('open'),
    resolution: text('resolution'),
    createdAt: time('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('report_dedup').on(t.advertId, t.reporterHash, t.day),
    check('report_state', sql`${t.status} in ('open','resolved','dismissed')`),
  ],
);
export const rateBuckets = pgTable('rate_limit_buckets', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expiresAt: time('expires_at').notNull(),
});
export const media = pgTable(
  'media_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    advertiserId: uuid('advertiser_id')
      .notNull()
      .references(() => advertisers.id),
    key: text('object_key').notNull().unique(),
    state: text('state').notNull().default('staged'),
    bytes: integer('bytes'),
    checksum: text('checksum'),
    createdAt: time('created_at').notNull().defaultNow(),
  },
  (t) => [check('media_state', sql`${t.state} in ('staged','ready','deleting','deleted')`)],
);
export const revisionMedia = pgTable(
  'revision_media',
  {
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => revisions.id),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id),
    position: integer('position').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.revisionId, t.mediaId] }),
    uniqueIndex('media_position').on(t.revisionId, t.position),
  ],
);
export const businesses = pgTable(
  'business_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    advertiserId: uuid('advertiser_id')
      .notNull()
      .unique()
      .references(() => advertisers.id),
    slug: text('slug').notNull().unique(),
    approved: jsonb('approved').$type<Record<string, unknown>>(),
    pending: jsonb('pending').$type<Record<string, unknown>>(),
    state: text('state').notNull().default('pending'),
    reason: text('reason'),
  },
  (t) => [
    check('business_state', sql`${t.state} in ('pending','approved','rejected','suspended')`),
  ],
);
export const features = pgTable(
  'featured_adverts',
  {
    advertId: uuid('advert_id')
      .primaryKey()
      .references(() => adverts.id),
    position: integer('position').notNull().default(0),
    startsAt: time('starts_at').notNull(),
    endsAt: time('ends_at').notNull(),
  },
  (t) => [check('feature_window', sql`${t.endsAt}>${t.startsAt}`)],
);
export const metrics = pgTable(
  'daily_advert_metrics',
  {
    advertId: uuid('advert_id')
      .notNull()
      .references(() => adverts.id),
    day: text('day').notNull(),
    views: integer('views').notNull().default(0),
    contacts: integer('contacts').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.advertId, t.day] })],
);
