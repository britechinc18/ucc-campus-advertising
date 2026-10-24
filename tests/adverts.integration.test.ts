import { patchProfileField } from '../src/server/profile-fields';
import {
  personalProfile,
  savePersonalProfile,
  moderatePersonalProfile,
  businessLifecycle,
  reviewReactivation,
} from '../src/server/profiles';
import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from 'vitest';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import {
  createProfile,
  createAdvert,
  saveAdvert,
  submitAdvert,
  moderate,
  transition,
} from '../src/server/adverts';
import { db } from '../src/server/db';
vi.mock('server-only', () => ({}));
vi.mock('../src/server/auth', () => ({ auth: vi.fn() }));
import { auth } from '../src/server/auth';
import { dispatch } from '../src/server/http';
import { listAdverts, advertDetail, home, publicSeller } from '../src/server/discovery';
import {
  updateSettings,
  setAdvertiserSuspension,
  createAssistedProfile,
  claimAdvertiser,
  findClaimants,
} from '../src/server/admin';
import { saveBusiness, moderateBusiness, listBusinesses } from '../src/server/businesses';
import { signUpload, completeUpload, readMedia, type ObjectStorage } from '../src/server/storage';
import { maintenance } from '../src/server/maintenance';
import { notificationFeed } from '../src/server/notifications';
import { readiness } from '../src/server/readiness';
import { accountContext, ownedAdverts, adminView } from '../src/server/frontend';
import sharp from 'sharp';
const url = process.env.TEST_DATABASE_URL;
// Only an explicitly designated test database may be reset.
const suite = url ? describe : describe.skip;
suite('PostgreSQL advert lifecycle and concurrent quotas', () => {
  let pool: Pool;
  let owner: string;
  let admin: string;
  let stranger: string;
  let categoryId: string;
  const content = (title = 'Campus tutoring offer') => ({
    title,
    description: 'Medical science tutoring available near campus.',
    categoryId,
    kind: 'service',
    condition: 'not_applicable',
    priceMode: 'fixed',
    pricePesewas: 5000,
    location: 'UCC campus',
    phone: '0241234567',
    contactConsent: true,
    mediaIds: [],
  });
  async function draft(title?: string) {
    return createAdvert(owner, content(title));
  }
  async function submit(title?: string) {
    const d = await draft(title);
    await submitAdvert(owner, d.advertId, d.revisionId, randomUUID());
    return d;
  }
  beforeAll(async () => {
    if (!url || !new URL(url).pathname.endsWith('_test'))
      throw new Error('TEST_DATABASE_URL database name must end in _test');
    process.env.DATABASE_URL = url;
    pool = new Pool({ connectionString: url });
  });
  beforeEach(async () => {
    await pool.query(
      'TRUNCATE users,advertisers,adverts,advert_revisions,advertiser_daily_usage,idempotency_keys,audit_events,reports,media_assets,revision_media,business_profiles,featured_adverts,daily_advert_metrics,rate_limit_buckets CASCADE',
    );
    await pool.query(
      'update platform_settings set auto_publish=false,posting_limits_enabled=true,max_active=5,daily_limit=3,duration_days=30',
    );
    vi.mocked(auth).mockReset();
    process.env.APP_ORIGIN = 'https://campus.test';
    process.env.AUTH_SECRET = 'synthetic-test-key-with-more-than-32-characters';
    process.env.AUTH_GOOGLE_ID = 'test-only-client';
    process.env.AUTH_GOOGLE_SECRET = 'test-only-client-secret';
    delete process.env.CRON_SECRET;
    process.env.ABUSE_HASH_SECRET = 'test-abuse-key-with-more-than-32-characters';
    process.env.MAINTENANCE_SECRET = 'test-maintenance-with-more-than-32-characters';
    owner = randomUUID();
    admin = randomUUID();
    stranger = randomUUID();
    await pool.query(
      "insert into users(id,role,email) values($1,'advertiser','owner@test.invalid'),($2,'admin','admin@test.invalid'),($3,'advertiser','other@test.invalid')",
      [owner, admin, stranger],
    );
    await createProfile(owner, { name: 'Campus Seller', kind: 'student', consent: true });
    categoryId = (await pool.query('select id from categories limit 1')).rows[0].id;
  });
  afterAll(async () => {
    await pool.end();
    await db().$client.end();
  });
  it('saves complete seller setup atomically and refuses overwrites or invalid contacts', async () => {
    const setup = {
      phone: '0241234567',
      whatsapp: '0543982307',
      location: 'UCC campus',
      bio: 'Campus books',
      contactConsent: true,
    };
    await expect(
      createProfile(stranger, {
        name: 'New Seller',
        kind: 'student',
        consent: true,
        setup: { ...setup, phone: 'bad' },
      }),
    ).rejects.toThrow();
    expect((await accountContext(stranger)).profiles).toHaveLength(0);
    const saved = await createProfile(stranger, {
      name: 'New Seller',
      kind: 'student',
      consent: true,
      setup,
    });
    const context = await accountContext(stranger);
    expect(context.profiles[0].id).toBe(saved.id);
    expect(context.profiles[0].defaults).toMatchObject({
      name: 'New Seller',
      phone: '+233241234567',
      whatsapp: '+233543982307',
      location: 'UCC campus',
      contactConsent: true,
    });
    await expect(
      createProfile(stranger, {
        name: 'Overwrite',
        kind: 'student',
        consent: true,
        setup,
        setupVersion: context.profiles[0].version,
      }),
    ).rejects.toThrow();
    expect((await accountContext(stranger)).profiles[0].name).toBe('New Seller');
    const business = await createProfile(stranger, {
      name: 'Campus Business',
      kind: 'business',
      consent: true,
      setup,
    });
    const both = await accountContext(stranger, business.id);
    expect(both.profiles).toHaveLength(2);
    expect(both.profile?.id).toBe(business.id);
    expect(
      (
        await pool.query('select state,approved from business_profiles where advertiser_id=$1', [
          business.id,
        ])
      ).rows[0],
    ).toMatchObject({
      state: 'approved',
      approved: { name: 'Campus Business', description: 'Campus books' },
    });
  });

  it('restricts seller activity to its owner and keeps public notifications anonymous', async () => {
    const approved = await submit('Private seller approval update');
    await moderate(admin, approved.revisionId, 'approve', 'Reviewed');
    const rejected = await submit('Private seller rejected advert');
    await moderate(admin, rejected.revisionId, 'reject', 'Improve the description');
    await pool.query("update adverts set expires_at=now()-interval '1 hour' where id=$1", [
      approved.advertId,
    ]);
    const mine = await notificationFeed(owner);
    expect(mine.audience).toBe('seller');
    expect(mine.items.map((i) => i.title)).toEqual(
      expect.arrayContaining(['Advert approved', 'Changes requested', 'Advert expired']),
    );
    expect(mine.items.every((i) => i.href.startsWith('/my-adverts/'))).toBe(true);
    expect(await notificationFeed()).toEqual({ audience: 'public', items: [] });
    expect(await notificationFeed(stranger)).toEqual({ audience: 'public', items: [] });
    vi.mocked(auth).mockResolvedValue(null as never);
    const publicResponse = await dispatch(
      new Request('https://campus.test/api/v1/notifications?userId=' + owner),
      ['notifications'],
    );
    expect(publicResponse.headers.get('cache-control')).toBe('private, no-store');
    expect(await publicResponse.json()).toEqual({ audience: 'public', items: [] });
    await pool.query('update users set suspended=true where id=$1', [owner]);
    await expect(notificationFeed(owner)).rejects.toThrow('Account suspended');
  });
  it('keeps submissions private until approval and starts 30 days on approval', async () => {
    const d = await submit();
    expect(
      (await pool.query('select state from adverts where id=$1', [d.advertId])).rows[0].state,
    ).toBe('pending');
    await moderate(admin, d.revisionId, 'approve', 'Reviewed and acceptable');
    const a = (
      await pool.query(
        'select *,extract(epoch from expires_at-published_at)/86400 as duration from adverts where id=$1',
        [d.advertId],
      )
    ).rows[0];
    expect(a.state).toBe('published');
    expect(Number(a.duration)).toBe(30);
  });
  it('exempts admin own and assisted submissions while retaining normal advertiser limits', async () => {
    await createProfile(admin, { name: 'Admin Seller', kind: 'student', consent: true });
    await pool.query('update platform_settings set max_active=1,daily_limit=1');
    for (let index = 0; index < 6; index++) {
      const own = await createAdvert(admin, content(`Administrator campus service ${index}`));
      const key = randomUUID();
      await submitAdvert(admin, own.advertId, own.revisionId, key);
      await submitAdvert(admin, own.advertId, own.revisionId, key);
      await moderate(admin, own.revisionId, 'approve', 'Reviewed admin submission');
    }
    expect(
      (await pool.query('select count(*)::int as n from advertiser_daily_usage')).rows[0].n,
    ).toBe(0);
    const profile = (await pool.query('select id from advertisers where user_id=$1', [owner]))
      .rows[0].id;
    for (let index = 0; index < 3; index++) {
      const assisted = await createAdvert(
        admin,
        content(`Assisted campus service ${index}`),
        profile,
      );
      await submitAdvert(admin, assisted.advertId, assisted.revisionId, randomUUID());
      await moderate(admin, assisted.revisionId, 'approve', 'Reviewed assisted content');
    }
    const regular = await draft('Regular owner still limited');
    await expect(
      submitAdvert(owner, regular.advertId, regular.revisionId, randomUUID()),
    ).rejects.toMatchObject({ code: 'ACTIVE_LIMIT' });
    const context = await accountContext(admin);
    expect(context.postingLimitExempt).toBe(true);
    expect((await accountContext(owner)).postingLimitExempt).toBe(false);
    expect(
      (
        await pool.query(
          "select count(*)::int n from audit_events where action='advert_submitted' and detail->>'postingLimitExempt'='true'",
        )
      ).rows[0].n,
    ).toBe(9);
  });
  it('protects system usage and checks seller switching independently of presentation cookies', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    expect(
      (await dispatch(new Request('https://campus.test/api/v1/admin/system'), ['admin', 'system']))
        .status,
    ).toBe(401);
    vi.mocked(auth).mockResolvedValue({ user: { id: owner } } as never);
    expect(
      (await dispatch(new Request('https://campus.test/api/v1/admin/system'), ['admin', 'system']))
        .status,
    ).toBe(403);
    const switchMode = (mode: string, origin = 'https://campus.test') =>
      dispatch(
        new Request('https://campus.test/api/v1/me/mode', {
          method: 'POST',
          headers: { origin, 'content-type': 'application/json' },
          body: JSON.stringify({ mode }),
        }),
        ['me', 'mode'],
      );
    expect((await switchMode('admin')).status).toBe(422);
    expect((await switchMode('seller', 'https://attacker.test')).status).toBe(403);
    const response = await switchMode('buyer');
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain(`${owner}:buyer`);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    vi.mocked(auth).mockResolvedValue({ user: { id: stranger } } as never);
    expect((await switchMode('seller')).status).toBe(403);
  });
  it('enforces daily limit under concurrent independent connections', async () => {
    const ds = await Promise.all(
      Array.from({ length: 5 }, (_, i) => draft(`Different tutoring ${i}`)),
    );
    const results = await Promise.allSettled(
      ds.map((d) => submitAdvert(owner, d.advertId, d.revisionId, randomUUID())),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3);
    expect((await pool.query('select count from advertiser_daily_usage')).rows[0].count).toBe(3);
  });
  it('reserves pending slots and rejects sixth concurrent submission', async () => {
    await pool.query('update platform_settings set daily_limit=100');
    const ds = await Promise.all(Array.from({ length: 7 }, (_, i) => draft(`Unique service ${i}`)));
    const results = await Promise.allSettled(
      ds.map((d) => submitAdvert(owner, d.advertId, d.revisionId, randomUUID())),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(5);
  });
  it('replays idempotent requests once and rejects key reuse', async () => {
    const d = await draft();
    const key = randomUUID();
    const result = await Promise.all([
      submitAdvert(owner, d.advertId, d.revisionId, key),
      submitAdvert(owner, d.advertId, d.revisionId, key),
    ]);
    expect(result[0]).toEqual(result[1]);
    expect((await pool.query('select count from advertiser_daily_usage')).rows[0].count).toBe(1);
    const other = await draft('Another different service');
    await expect(submitAdvert(owner, other.advertId, other.revisionId, key)).rejects.toMatchObject({
      code: 'IDEMPOTENCY_CONFLICT',
    });
  });
  it('blocks cross-owner edits and non-admin moderation', async () => {
    const d = await submit();
    await expect(saveAdvert(stranger, d.advertId, content())).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(moderate(owner, d.revisionId, 'approve', 'Not authorized')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('keeps the approved revision and expiry during edit review', async () => {
    const d = await submit();
    await moderate(admin, d.revisionId, 'approve', 'Reviewed');
    const before = (await pool.query('select * from adverts where id=$1', [d.advertId])).rows[0];
    const edited = await saveAdvert(owner, d.advertId, content('Updated campus tutoring'));
    await submitAdvert(owner, d.advertId, edited.revisionId, randomUUID());
    expect(
      (await pool.query('select approved_revision_id from adverts where id=$1', [d.advertId]))
        .rows[0].approved_revision_id,
    ).toBe(d.revisionId);
    await moderate(admin, edited.revisionId, 'approve', 'Reviewed edit');
    const after = (await pool.query('select * from adverts where id=$1', [d.advertId])).rows[0];
    expect(after.expires_at).toEqual(before.expires_at);
    expect(after.approved_revision_id).toBe(edited.revisionId);
  });
  it('does not republish an expired advert by approving a stale edit', async () => {
    const d = await submit();
    await moderate(admin, d.revisionId, 'approve', 'Reviewed');
    const edit = await saveAdvert(owner, d.advertId, content('New tutoring wording'));
    await submitAdvert(owner, d.advertId, edit.revisionId, randomUUID());
    await pool.query("update adverts set expires_at=now()-interval '1 second' where id=$1", [
      d.advertId,
    ]);
    await expect(moderate(admin, edit.revisionId, 'approve', 'Too late')).rejects.toMatchObject({
      code: 'EXPIRED',
    });
  });
  it('rejects exact duplicates without consuming quota', async () => {
    await submit();
    const duplicate = await draft();
    await expect(
      submitAdvert(owner, duplicate.advertId, duplicate.revisionId, randomUUID()),
    ).rejects.toMatchObject({ code: 'DUPLICATE' });
    expect((await pool.query('select count from advertiser_daily_usage')).rows[0].count).toBe(1);
  });
  it('allows rejected corrections without charging the daily count again', async () => {
    const d = await submit();
    await moderate(admin, d.revisionId, 'reject', 'Add more detail');
    const edit = await saveAdvert(owner, d.advertId, content('Corrected tutoring wording'));
    await submitAdvert(owner, d.advertId, edit.revisionId, randomUUID());
    expect((await pool.query('select count from advertiser_daily_usage')).rows[0].count).toBe(1);
  });
  it('does not refund daily usage on withdrawal', async () => {
    const d = await submit();
    await transition(owner, d.advertId, 'withdrawn');
    expect((await pool.query('select count from advertiser_daily_usage')).rows[0].count).toBe(1);
    expect(
      (await pool.query('select status from advert_revisions where id=$1', [d.revisionId])).rows[0]
        .status,
    ).toBe('cancelled');
  });
  it('rechecks a lowered capacity limit at approval', async () => {
    const d = await submit();
    await submit('Different campus service');
    await pool.query('update platform_settings set max_active=1');
    await expect(moderate(admin, d.revisionId, 'approve', 'Reviewed')).rejects.toMatchObject({
      code: 'ACTIVE_LIMIT',
    });
  });
  it('blocks suspended users and sellers', async () => {
    const d = await draft();
    await pool.query('update users set suspended=true where id=$1', [owner]);
    await expect(submitAdvert(owner, d.advertId, d.revisionId, randomUUID())).rejects.toMatchObject(
      { code: 'SUSPENDED' },
    );
  });

  it('publishes social profiles only through approved adverts and hides inactive sellers', async () => {
    const pending = await createAdvert(owner, {
      ...content(),
      socials: { tiktok: 'https://www.tiktok.com/@campus_seller' },
    });
    await submitAdvert(owner, pending.advertId, pending.revisionId, randomUUID());
    const sellerId = (await pool.query('select id from advertisers where user_id=$1', [owner]))
      .rows[0].id;
    await expect(publicSeller(sellerId)).rejects.toMatchObject({ status: 404 });
    await moderate(admin, pending.revisionId, 'approve', 'Reviewed public social contact');
    expect((await advertDetail(pending.advertId)).data.socials?.tiktok).toBe(
      'https://www.tiktok.com/@campus_seller',
    );
    const profile = await publicSeller(sellerId);
    expect(profile.items.map((item) => item.advertiser_id)).toEqual([sellerId]);
    expect(profile.seller.name).toBe('Campus Seller');
    const edit = await saveAdvert(owner, pending.advertId, {
      ...content(),
      socials: { tiktok: 'https://www.tiktok.com/@pending_change' },
    });
    expect(edit.revisionId).toBeTruthy();
    expect((await advertDetail(pending.advertId)).data.socials?.tiktok).toBe(
      'https://www.tiktok.com/@campus_seller',
    );
    await pool.query('update advertisers set suspended=true where id=$1', [sellerId]);
    await expect(publicSeller(sellerId)).rejects.toMatchObject({ status: 404 });
  });
  it('filters all public discovery views and direct links by approval and expiry', async () => {
    const pending = await submit();
    await expect(advertDetail(pending.advertId)).rejects.toMatchObject({ status: 404 });
    expect((await listAdverts({})).items).toHaveLength(0);
    await moderate(admin, pending.revisionId, 'approve', 'Reviewed');
    expect((await listAdverts({ q: 'tutoring', max: 9999 })).items).toHaveLength(1);
    expect((await home()).deals.items).toHaveLength(1);
    await pool.query('update adverts set expires_at=now() where id=$1', [pending.advertId]);
    await expect(advertDetail(pending.advertId)).rejects.toMatchObject({ status: 404 });
    expect((await home()).fresh.items).toHaveLength(0);
  });
  it('paginates equal prices without repeats and handles null prices', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const d = await submit(`Tutoring option ${i}`);
      await moderate(admin, d.revisionId, 'approve', 'Reviewed');
      ids.push(d.advertId);
    }
    const first = await listAdverts({ sort: 'price_asc', limit: 1 });
    const second = await listAdverts({ sort: 'price_asc', limit: 1, cursor: first.nextCursor });
    expect(first.items[0].id).not.toBe(second.items[0].id);
    const third = await listAdverts({ sort: 'price_asc', limit: 1, cursor: second.nextCursor });
    expect(new Set([first.items[0].id, second.items[0].id, third.items[0].id])).toEqual(
      new Set(ids),
    );
    expect(third.nextCursor).toBeNull();
  });
  it('hides suspended advertisers and protects settings version and trust toggle', async () => {
    const d = await submit();
    await moderate(admin, d.revisionId, 'approve', 'Reviewed');
    await setAdvertiserSuspension(
      admin,
      (await pool.query('select id from advertisers where user_id=$1', [owner])).rows[0].id,
      { suspended: true, reason: 'Investigating report' },
    );
    expect((await listAdverts({})).items).toHaveLength(0);
    const version = (await pool.query('select version from platform_settings')).rows[0].version;
    const settings = {
      maxActive: 5,
      dailyLimit: 3,
      durationDays: 30,
      maxImages: 5,
      maxImageBytes: 5242880,
      autoPublish: false,
      expectedVersion: version,
      reason: 'Keep launch policy',
    };
    await expect(updateSettings(owner, settings)).rejects.toMatchObject({ status: 403 });
    await updateSettings(admin, settings);
    await expect(updateSettings(admin, settings)).rejects.toMatchObject({ code: 'STALE_SETTINGS' });
    await updateSettings(admin, {
      ...settings,
      expectedVersion: version + 1,
      autoPublish: true,
      postingLimitsEnabled: false,
    });
  });
  it('publishes immediately without quotas or duplicate gates and preserves edit expiry', async () => {
    await pool.query(
      'update platform_settings set auto_publish=true,posting_limits_enabled=false,max_active=1,daily_limit=1',
    );
    const first = await draft();
    const key = randomUUID();
    const result = await submitAdvert(owner, first.advertId, first.revisionId, key);
    expect(result).toMatchObject({ status: 'published' });
    expect(await submitAdvert(owner, first.advertId, first.revisionId, key)).toEqual(result);
    const expiry = (
      await pool.query('select expires_at from adverts where id=$1', [first.advertId])
    ).rows[0].expires_at;
    const duplicate = await draft();
    await expect(
      submitAdvert(owner, duplicate.advertId, duplicate.revisionId, randomUUID()),
    ).resolves.toMatchObject({ status: 'published' });
    const edit = await saveAdvert(owner, first.advertId, content('Updated campus tutoring'));
    await submitAdvert(owner, first.advertId, edit.revisionId, randomUUID());
    expect(
      (await pool.query('select expires_at from adverts where id=$1', [first.advertId])).rows[0]
        .expires_at,
    ).toEqual(expiry);
    expect((await listAdverts({})).items).toHaveLength(2);
    expect(
      (await pool.query('select count(*)::int as n from advertiser_daily_usage')).rows[0].n,
    ).toBe(0);
    await expect(
      submitAdvert(stranger, first.advertId, edit.revisionId, randomUUID()),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('requires approval for assisted posts and audits verified claiming', async () => {
    const p = await createAssistedProfile(admin, {
      name: 'Assisted Seller',
      kind: 'student',
      consent: true,
    });
    const d = await createAdvert(admin, content('Assisted campus service'), p.id);
    await submitAdvert(admin, d.advertId, d.revisionId, randomUUID());
    expect((await listAdverts({})).items).toHaveLength(0);
    await moderate(admin, d.revisionId, 'approve', 'Reviewed assisted advert');
    await expect(
      claimAdvertiser(admin, p.id, {
        userId: stranger,
        contactVerified: true,
        consent: true,
        evidenceReference: 'manual verification reference',
      }),
    ).rejects.toMatchObject({ code: 'UNVERIFIED_CLAIMANT' });
    await pool.query('update users set email_verified=now() where id=$1', [stranger]);
    await claimAdvertiser(admin, p.id, {
      userId: stranger,
      contactVerified: true,
      consent: true,
      evidenceReference: 'manual verification reference',
    });
    expect(
      (
        await pool.query(
          "select count(*)::int n from audit_events where action='assisted_profile_claimed'",
        )
      ).rows[0].n,
    ).toBe(1);
  });
  it('publishes business edits immediately without an approval step', async () => {
    await pool.query("update advertisers set kind='business' where user_id=$1", [owner]);
    const input = {
      slug: 'campus-business',
      description: 'Approved campus business description.',
      location: 'UCC',
    };
    await saveBusiness(owner, input);
    expect(await listBusinesses()).toHaveLength(1);
    await saveBusiness(owner, { ...input, description: 'Unreviewed private business content.' });
    const visible = (await listBusinesses()) as { approved: { description: string } }[];
    expect(visible[0].approved.description).toBe('Unreviewed private business content.');
  });
  it('finalizes private images, prevents cross-owner reads, and gates public media', async () => {
    const png = await sharp({ create: { width: 100, height: 100, channels: 3, background: 'red' } })
      .png()
      .toBuffer();
    const data = new Map<string, Buffer>();
    const objects: ObjectStorage = {
      sign: async (key) => `https://storage.invalid/${key}`,
      read: async (key, max) => {
        const b = data.get(key)!;
        expect(b.length).toBeLessThanOrEqual(max);
        return b;
      },
      write: async (key, b) => {
        data.set(key, b);
      },
      remove: async (key) => {
        data.delete(key);
      },
    };
    const asset = await signUpload(owner, { contentType: 'image/png', bytes: png.length }, objects);
    const key = (
      await pool.query('select object_key from media_assets where id=$1', [asset.mediaId])
    ).rows[0].object_key;
    data.set(key, png);
    await completeUpload(owner, asset.mediaId, objects);
    await expect(readMedia(undefined, asset.mediaId, objects)).rejects.toMatchObject({
      status: 404,
    });
    await expect(readMedia(stranger, asset.mediaId, objects)).rejects.toMatchObject({
      status: 403,
    });
    const d = await createAdvert(owner, {
      ...content(),
      kind: 'product',
      condition: 'used',
      mediaIds: [asset.mediaId],
    });
    await submitAdvert(owner, d.advertId, d.revisionId, randomUUID());
    await moderate(admin, d.revisionId, 'approve', 'Reviewed image');
    expect((await readMedia(undefined, asset.mediaId, objects)).length).toBeGreaterThan(0);
    await transition(owner, d.advertId, 'withdrawn');
    await expect(readMedia(undefined, asset.mediaId, objects)).rejects.toMatchObject({
      status: 404,
    });
  });
  it('rejects unauthenticated/foreign-origin HTTP writes and redacts errors', async () => {
    const req = (method: string, origin = 'https://campus.test', body?: unknown) =>
      new Request('https://campus.test/api/v1/me/profile', {
        method,
        headers: { origin, 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    expect((await dispatch(req('POST', 'https://evil.test', {}), ['me', 'profile'])).status).toBe(
      403,
    );
    expect((await dispatch(req('POST', undefined, {}), ['me', 'profile'])).status).toBe(401);
    vi.mocked(auth).mockResolvedValue({ user: { id: owner }, expires: '2099-01-01' } as never);
    expect((await dispatch(req('GET'), ['admin', 'settings'])).status).toBe(403);
    expect(
      (await dispatch(req('POST', undefined, { invalid: true }), ['me', 'adverts'])).status,
    ).toBe(422);
    const read = await dispatch(req('GET'), ['adverts']);
    expect(read.status).toBe(200);
    expect(read.headers.get('cache-control')).toContain('no-store');
  });
  it('deduplicates reports and bounds anonymous rate buckets', async () => {
    const d = await submit();
    await moderate(admin, d.revisionId, 'approve', 'Reviewed');
    const request = () =>
      new Request(`https://campus.test/api/v1/adverts/${d.advertId}/reports`, {
        method: 'POST',
        headers: { origin: 'https://campus.test', 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'spam' }),
      });
    for (let i = 0; i < 5; i++)
      expect((await dispatch(request(), ['adverts', d.advertId, 'reports'])).status).toBe(202);
    expect((await pool.query('select count(*)::int n from reports')).rows[0].n).toBe(1);
    expect((await dispatch(request(), ['adverts', d.advertId, 'reports'])).status).toBe(429);
  });
  it('authenticates maintenance and expires listings independently of the scheduler', async () => {
    const d = await submit();
    await moderate(admin, d.revisionId, 'approve', 'Reviewed');
    await pool.query("update adverts set expires_at=now()-interval '1 second' where id=$1", [
      d.advertId,
    ]);
    expect((await listAdverts({})).items).toHaveLength(0);
    const denied = await dispatch(
      new Request('https://campus.test/api/v1/internal/maintenance', { method: 'POST' }),
      ['internal', 'maintenance'],
    );
    expect(denied.status).toBe(401);
    expect((await maintenance()).expired).toBe(1);
  });

  it('approves a revision only once during concurrent moderation', async () => {
    const d = await submit();
    const results = await Promise.allSettled([
      moderate(admin, d.revisionId, 'approve', 'Reviewed first'),
      moderate(admin, d.revisionId, 'approve', 'Reviewed second'),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      (await pool.query("select count(*)::int n from audit_events where action='advert_approve'"))
        .rows[0].n,
    ).toBe(1);
  });
  it('renews expired adverts through another counted moderated submission', async () => {
    const d = await submit();
    await moderate(admin, d.revisionId, 'approve', 'Reviewed');
    await pool.query("update adverts set expires_at=now()-interval '1 day' where id=$1", [
      d.advertId,
    ]);
    const renewal = await saveAdvert(
      owner,
      d.advertId,
      content('Renewed tutoring availability'),
      true,
    );
    await submitAdvert(owner, d.advertId, renewal.revisionId, randomUUID());
    expect((await listAdverts({})).items).toHaveLength(0);
    await moderate(admin, renewal.revisionId, 'approve', 'Renewal reviewed');
    expect((await listAdverts({})).items).toHaveLength(1);
    expect((await pool.query('select count from advertiser_daily_usage')).rows[0].count).toBe(2);
  });
  it('charges the current Ghana date independently of exhausted prior-day usage', async () => {
    await pool.query(
      "insert into advertiser_daily_usage(advertiser_id,day,count) select id,to_char((now() at time zone 'Africa/Accra')-interval '1 day','YYYY-MM-DD'),3 from advertisers where user_id=$1",
      [owner],
    );
    await submit();
    const today = (
      await pool.query(
        "select count from advertiser_daily_usage where day=to_char(now() at time zone 'Africa/Accra','YYYY-MM-DD')",
      )
    ).rows[0];
    expect(today.count).toBe(1);
  });
  it('preserves microsecond cursors and sorts unknown prices last', async () => {
    await pool.query('update platform_settings set daily_limit=100');
    for (let i = 0; i < 4; i++) {
      const d = await createAdvert(owner, {
        ...content(`Pagination service ${i}`),
        priceMode: i === 3 ? 'contact' : 'fixed',
        pricePesewas: i === 3 ? null : 5000,
      });
      await submitAdvert(owner, d.advertId, d.revisionId, randomUUID());
      await moderate(admin, d.revisionId, 'approve', 'Reviewed pagination');
    }
    await pool.query("update adverts set published_at='2026-10-01T00:00:00.123456Z'");
    for (const sort of ['fresh', 'price_asc', 'price_desc', 'trending']) {
      const seen: string[] = [];
      let cursor: string | undefined;
      for (let i = 0; i < 4; i++) {
        const page = await listAdverts({ sort, limit: 1, ...(cursor ? { cursor } : {}) });
        expect(page.items).toHaveLength(1);
        seen.push(page.items[0].id);
        cursor = page.nextCursor ?? undefined;
        if (sort.startsWith('price_') && i === 3) expect(page.items[0].price).toBeNull();
      }
      expect(new Set(seen).size).toBe(4);
      expect(cursor).toBeUndefined();
    }
  });
  it('protects approved revision ownership in the database', async () => {
    const first = await draft('First tutoring advert');
    const second = await draft('Second tutoring advert');
    await expect(
      pool.query('update adverts set approved_revision_id=$1 where id=$2', [
        first.revisionId,
        second.advertId,
      ]),
    ).rejects.toMatchObject({ code: '23503' });
  });
  it('returns safe conflicts for duplicate categories and rejects large request bodies', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: admin }, expires: '2099-01-01' } as never);
    const slug = (await pool.query('select slug from categories limit 1')).rows[0].slug;
    const request = new Request('https://campus.test/api/v1/admin/categories', {
      method: 'POST',
      headers: { origin: 'https://campus.test', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Existing category', slug, active: true }),
    });
    const response = await dispatch(request, ['admin', 'categories']);
    expect(response.status).toBe(409);
    const result = await response.text();
    expect(result).not.toContain('INSERT');
    expect(result).not.toContain('duplicate key');
    const large = new Request('https://campus.test/api/v1/me/adverts', {
      method: 'POST',
      headers: { origin: 'https://campus.test', 'content-type': 'application/json' },
      body: JSON.stringify({ description: 'x'.repeat(33000) }),
    });
    expect((await dispatch(large, ['me', 'adverts'])).status).toBe(413);
  });
  it('allows public browsing without consulting a session', async () => {
    vi.mocked(auth).mockRejectedValue(new Error('Session should not be requested'));
    const response = await dispatch(new Request('https://campus.test/api/v1/adverts'), ['adverts']);
    expect(response.status).toBe(200);
    expect(auth).not.toHaveBeenCalled();
  });

  it('exposes safe database readiness and a clear unavailable sign-in response', async () => {
    const ready = await readiness();
    expect(ready.status).toBe(200);
    expect(ready.body.databaseReady).toBe(true);
    delete process.env.AUTH_GOOGLE_SECRET;
    const health = await dispatch(new Request('https://campus.test/api/v1/health'), ['health']);
    expect(health.status).toBe(200);
    const text = await health.text();
    expect(JSON.parse(text).authenticationConfigured).toBe(false);
    expect(text).not.toContain(process.env.AUTH_SECRET!);
    expect(text).not.toContain(process.env.DATABASE_URL!);
    const disabled = await dispatch(new Request('https://campus.test/api/v1/me/adverts'), [
      'me',
      'adverts',
    ]);
    expect(disabled.status).toBe(503);
    expect((await disabled.json()).code).toBe('AUTH_UNAVAILABLE');
  });
  it('accepts authenticated Vercel scheduled GETs with the CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'synthetic-vercel-cron-key-at-least-32-characters';
    const denied = await dispatch(
      new Request('https://campus.test/api/v1/internal/maintenance', {
        headers: { authorization: `Bearer ${process.env.MAINTENANCE_SECRET}` },
      }),
      ['internal', 'maintenance'],
    );
    expect(denied.status).toBe(401);
    const allowed = await dispatch(
      new Request('https://campus.test/api/v1/internal/maintenance', {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      }),
      ['internal', 'maintenance'],
    );
    expect(allowed.status).toBe(200);
  });
  it('protects additive admin reads and isolates owner advert details', async () => {
    const d = await draft();
    vi.mocked(auth).mockResolvedValue({ user: { id: owner } } as never);
    for (const route of [
      'admin/overview',
      'admin/categories',
      'admin/adverts',
      `admin/adverts/${d.advertId}`,
      `admin/submissions/${d.revisionId}`,
      `admin/advertisers/${stranger}`,
    ]) {
      const response = await dispatch(
        new Request(`https://campus.test/api/v1/${route}`),
        route.split('/'),
      );
      expect(response.status).toBe(403);
    }
    await expect(ownedAdverts(stranger, 0, d.advertId)).rejects.toMatchObject({ status: 404 });
    expect(((await ownedAdverts(owner, 0, d.advertId)) as { id: string }).id).toBe(d.advertId);
  });
  it('returns real allowances, pending edit counts and actual overview metrics', async () => {
    const d = await submit();
    await moderate(admin, d.revisionId, 'approve', 'Approved for campus');
    const edit = await saveAdvert(owner, d.advertId, content('Updated tutoring availability'));
    await submitAdvert(owner, d.advertId, edit.revisionId, randomUUID());
    const context = await accountContext(owner);
    expect(context.activeCount).toBe(1);
    expect(context.dailyUsed).toBe(1);
    expect(context.role).toBe('advertiser');
    const page = (await ownedAdverts(owner, 0, undefined, 'pending')) as {
      pendingCount: number;
      items: unknown[];
    };
    expect(page.pendingCount).toBe(1);
    expect(page.items).toHaveLength(1);
    const overview = (await adminView(admin, 'overview')) as {
      counts: { live: number; pending: number; reports: number };
    };
    expect(overview.counts).toMatchObject({ live: 1, pending: 1, reports: 0 });
  });
  it('paginates owner adverts without changing the legacy list endpoint', async () => {
    for (let i = 0; i < 22; i++) await draft(`Tutor service number ${i}`);
    const first = (await ownedAdverts(owner)) as { items: { id: string }[]; nextOffset: number };
    const second = (await ownedAdverts(owner, first.nextOffset)) as {
      items: { id: string }[];
      nextOffset: null;
    };
    expect(first.items).toHaveLength(20);
    expect(second.items).toHaveLength(2);
    expect(second.nextOffset).toBeNull();
    expect(new Set([...first.items, ...second.items].map((x) => x.id)).size).toBe(22);
    vi.mocked(auth).mockResolvedValue({ user: { id: owner } } as never);
    const legacy = await dispatch(new Request('https://campus.test/api/v1/me/adverts'), [
      'me',
      'adverts',
    ]);
    expect(Array.isArray(await legacy.json())).toBe(true);
  });
  it('moderates business contacts and protects attached logos from cleanup', async () => {
    const p = (await createAssistedProfile(admin, {
      name: 'Campus business',
      kind: 'business',
      consent: true,
    })) as { id: string };
    const mediaId = randomUUID();
    await pool.query(
      "insert into media_assets(id,advertiser_id,object_key,state,bytes,created_at) values($1,$2,$3,'ready',10,now()-interval '2 days')",
      [mediaId, p.id, `derived/${mediaId}.webp`],
    );
    const objects: ObjectStorage = {
      sign: async () => '',
      read: async () => Buffer.from('logo-bytes'),
      write: async () => {},
      remove: async () => {},
    };
    const profile = {
      slug: 'campus-business',
      description: 'A useful business profile for campus students.',
      location: 'UCC campus',
      logoMediaId: mediaId,
      phone: '0241234567',
      contactConsent: true,
    };
    await expect(
      saveBusiness(admin, { ...profile, contactConsent: undefined }, p.id),
    ).rejects.toBeDefined();
    const b = await saveBusiness(admin, profile, p.id);
    expect((await maintenance(objects)).cleaned).toBe(0);
    expect((await readMedia(undefined, mediaId, objects)).toString()).toBe('logo-bytes');
    await expect(saveBusiness(owner, profile)).rejects.toBeDefined();
    await moderateBusiness(admin, b.id, {
      decision: 'suspend',
      reason: 'Profile suspended for investigation',
    });
    await expect(readMedia(undefined, mediaId, objects)).rejects.toMatchObject({ status: 404 });
  });
  it.each(['event', 'promotion', 'announcement', 'business_ad'] as const)(
    'moderates %s flyers with real media validation and separates Campus from Market',
    async (kind) => {
      const objectsMap = new Map<string, Buffer>();
      const objects: ObjectStorage = {
        sign: async (key) => key,
        read: async (key) => objectsMap.get(key)!,
        write: async (key, bytes) => {
          objectsMap.set(key, bytes);
        },
        remove: async (key) => {
          objectsMap.delete(key);
        },
      };
      const raw = await sharp({
        create: { width: 300, height: 500, channels: 3, background: '#19674f' },
      })
        .png()
        .toBuffer();
      const upload = await signUpload(
        owner,
        { contentType: 'image/png', bytes: raw.length },
        objects,
      );
      objectsMap.set(upload.uploadUrl, raw);
      await completeUpload(owner, upload.mediaId, objects);
      const data = {
        ...content(`Campus ${kind} flyer`),
        kind,
        priceMode: 'contact',
        pricePesewas: null,
        mediaIds: [upload.mediaId],
        details: {
          startsAt: new Date(Date.now() + 86400000).toISOString(),
          endsAt: new Date(Date.now() + 172800000).toISOString(),
          offer: 'Half price campus printing',
          externalUrl: 'https://example.org/register',
        },
      };
      const a = await createAdvert(owner, data);
      await submitAdvert(owner, a.advertId, a.revisionId, randomUUID());
      expect((await listAdverts({ surface: 'campus' })).items).toHaveLength(0);
      await expect(
        moderate(owner, a.revisionId, 'approve', 'Cannot self-moderate as advertiser'),
      ).rejects.toMatchObject({ status: 403 });
      await moderate(admin, a.revisionId, 'approve', 'Reviewed current flyer and external link');
      expect((await listAdverts({})).items).toHaveLength(0);
      expect((await listAdverts({ surface: 'campus', kind })).items.map((x) => x.id)).toEqual([
        a.advertId,
      ]);
      expect((await advertDetail(a.advertId)).data.details?.externalUrl).toBe(
        'https://example.org/register',
      );
      const dimensions = await sharp(
        await readMedia(undefined, upload.mediaId, objects),
      ).metadata();
      expect(dimensions.width! / dimensions.height!).toBeCloseTo(0.6);
      const bookmarks = await dispatch(
        new Request(`https://campus.test/api/v1/saved?ids=${a.advertId},${randomUUID()}`),
        ['saved'],
      );
      const saved = await bookmarks.json();
      expect(saved.items).toHaveLength(1);
      expect(saved.unavailable).toHaveLength(1);
      await expect(saveAdvert(stranger, a.advertId, data)).rejects.toBeDefined();
      await pool.query(
        "update advert_revisions set data=jsonb_set(data,'{details,endsAt}',to_jsonb('2000-01-01T00:00:00Z'::text)) where id=$1",
        [a.revisionId],
      );
      const expiredSaved = await dispatch(
        new Request(`https://campus.test/api/v1/saved?ids=${a.advertId}`),
        ['saved'],
      );
      expect((await expiredSaved.json()).unavailable).toEqual([a.advertId]);
      await expect(advertDetail(a.advertId)).rejects.toMatchObject({ status: 404 });
      await expect(readMedia(undefined, upload.mediaId, objects)).rejects.toMatchObject({
        status: 404,
      });
    },
  );
  it('seller activation is repeatable and concurrency-safe without replacing identity', async () => {
    const results = await Promise.all([
      createProfile(stranger, { name: 'New campus seller', kind: 'student', consent: true }),
      createProfile(stranger, { name: 'New campus seller', kind: 'student', consent: true }),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(
      await createProfile(stranger, { name: 'Changed request', kind: 'business', consent: true }),
    ).not.toEqual(results[0]);
    expect(
      (await pool.query('select count(*)::int as n from advertisers where user_id=$1', [stranger]))
        .rows[0].n,
    ).toBe(2);
  });
  it('requires explicit identity and enforces shared concurrent quotas across both profiles', async () => {
    const personal = (await accountContext(owner)).profile!;
    const business = (await createProfile(owner, {
      name: 'Campus Wardrobe',
      kind: 'business',
      consent: true,
    })) as { id: string };
    expect((await accountContext(owner)).profiles).toHaveLength(2);
    await expect(createAdvert(owner, content())).rejects.toMatchObject({
      code: 'IDENTITY_REQUIRED',
    });
    const drafts = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        createAdvert(owner, content(`Identity service ${i}`), i % 2 ? business.id : personal.id),
      ),
    );
    const submitted = await Promise.allSettled(
      drafts.map((d) => submitAdvert(owner, d.advertId, d.revisionId, randomUUID())),
    );
    expect(submitted.filter((r) => r.status === 'fulfilled')).toHaveLength(3);
    expect(submitted.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect((await accountContext(owner)).dailyUsed).toBe(3);
    expect((await accountContext(owner)).activeCount).toBe(3);
    await pool.query('update platform_settings set daily_limit=20,max_active=3');
    const remaining = drafts[submitted.findIndex((r) => r.status === 'rejected')];
    await expect(
      submitAdvert(owner, remaining.advertId, remaining.revisionId, randomUUID()),
    ).rejects.toMatchObject({ code: 'ACTIVE_LIMIT' });
    await expect(createAdvert(stranger, content(), business.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(
      (
        (await ownedAdverts(owner, 0, undefined, undefined, business.id)) as {
          items: { advertiser_id: string }[];
        }
      ).items.every((a: unknown) => (a as { advertiser_id: string }).advertiser_id === business.id),
    ).toBe(true);
  });
  it('keeps media bound to the selected identity and moderates business names', async () => {
    const business = (await createProfile(owner, {
      name: 'Original Brand',
      kind: 'business',
      consent: true,
    })) as { id: string };
    const personal = (await accountContext(owner)).profiles.find((p) => p.kind === 'student')!;
    const mid = randomUUID();
    await pool.query(
      "insert into media_assets(id,advertiser_id,object_key,state,bytes) values($1,$2,$3,'ready',10)",
      [mid, personal.id, `derived/${mid}.webp`],
    );
    await expect(
      createAdvert(owner, { ...content(), mediaIds: [mid] }, business.id),
    ).rejects.toMatchObject({ code: 'INVALID_MEDIA' });
    await saveBusiness(owner, {
      name: 'Approved Brand',
      slug: 'brand-profile',
      description: 'Campus wardrobe business with useful clothing.',
      location: 'UCC',
    });
    await saveBusiness(owner, {
      name: 'Pending secret brand',
      slug: 'brand-profile',
      description: 'Unapproved business description for review.',
      location: 'UCC',
    });
    expect(((await listBusinesses()) as { name: string }[])[0].name).toBe('Pending secret brand');
    expect(await listBusinesses(undefined, 'Pending secret')).toHaveLength(1);
    expect((await listBusinesses(undefined, 'Approved Brand')) as unknown[]).toHaveLength(0);
  });
  it('hands an assisted business to a verified personal seller without changing its records', async () => {
    await pool.query('update users set email_verified=now() where id=$1', [owner]);
    const business = await createAssistedProfile(admin, {
      name: 'Assisted Wardrobe',
      kind: 'business',
      consent: true,
    });
    const b = await saveBusiness(
      admin,
      {
        name: 'Assisted Wardrobe',
        slug: 'assisted-wardrobe',
        description: 'Student wardrobe business managed with permission.',
        location: 'UCC',
        whatsapp: '0543982307',
        contactConsent: true,
      },
      business.id,
    );
    const ad = await createAdvert(admin, content('Assisted styling consultation'), business.id);
    await submitAdvert(admin, ad.advertId, ad.revisionId, randomUUID());
    await moderate(admin, ad.revisionId, 'approve', 'Reviewed assisted service');
    const users = (await findClaimants(admin, business.id, 'owner@test')) as {
      id: string;
      conflict: boolean;
    }[];
    expect(users).toEqual([expect.objectContaining({ id: owner, conflict: false })]);
    await expect(findClaimants(owner, business.id, 'owner@test')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    const claim = {
      userId: owner,
      contactVerified: true,
      consent: true,
      evidenceReference: 'Recorded permission reference',
    };
    expect(await claimAdvertiser(admin, business.id, claim)).toEqual({ id: business.id });
    expect(await claimAdvertiser(admin, business.id, claim)).toEqual({ id: business.id });
    expect((await accountContext(owner)).profiles).toHaveLength(2);
    expect((await advertDetail(ad.advertId)).advertiser_id).toBe(business.id);
    expect(((await listBusinesses('assisted-wardrobe')) as { id: string }).id).toBe(b.id);
    await saveAdvert(owner, ad.advertId, content('Owner now manages this service'));
    expect(
      (
        await pool.query(
          "select count(*)::int n from audit_events where action='assisted_profile_claimed'",
        )
      ).rows[0].n,
    ).toBe(1);
  });
  it('rejects handover to a conflicting identity and keeps evidence out of public data', async () => {
    await savePersonalProfile(owner, {
      version: 0,
      submit: false,
      profile: { bio: 'A deliberately customized personal profile.' },
    });
    await pool.query('update users set email_verified=now() where id=$1', [owner]);
    const source = await createAssistedProfile(admin, {
      name: 'Another Student',
      kind: 'student',
      consent: true,
    });
    const options = (await findClaimants(admin, source.id, 'owner@test')) as {
      conflict: boolean;
    }[];
    expect(options[0].conflict).toBe(true);
    await expect(
      claimAdvertiser(admin, source.id, {
        userId: owner,
        contactVerified: true,
        consent: true,
        evidenceReference: 'Private verification reference',
      }),
    ).rejects.toMatchObject({ code: 'PROFILE_EXISTS' });
    expect(
      (await pool.query('select user_id from advertisers where id=$1', [source.id])).rows[0]
        .user_id,
    ).toBeNull();
    const ad = await createAdvert(admin, content('Admin managed student offer'), source.id);
    await submitAdvert(admin, ad.advertId, ad.revisionId, randomUUID());
    await moderate(admin, ad.revisionId, 'approve', 'Reviewed for publication');
    expect(JSON.stringify(await advertDetail(ad.advertId))).not.toContain('verification');
  });
  it('requires explicit verified replacement of an unused automatic personal profile', async () => {
    await pool.query('update users set email_verified=now() where id=$1', [stranger]);
    const placeholder = (await createProfile(stranger, {
      name: 'Automatic Student',
      kind: 'student',
      consent: true,
    })) as { id: string };
    const source = await createAssistedProfile(admin, {
      name: 'Assisted Student',
      kind: 'student',
      consent: true,
    });
    const ad = await createAdvert(admin, content('Assisted handover service'), source.id);
    const options = (await findClaimants(admin, source.id, 'other@test')) as {
      conflict: boolean;
      replaceable: boolean;
    }[];
    expect(options[0]).toMatchObject({ conflict: false, replaceable: true });
    const claim = {
      userId: stranger,
      contactVerified: true,
      consent: true,
      evidenceReference: 'Checked contact and consent',
    };
    await expect(claimAdvertiser(admin, source.id, claim)).rejects.toMatchObject({
      code: 'PROFILE_EXISTS',
    });
    await claimAdvertiser(admin, source.id, { ...claim, replaceUnusedPersonal: true });
    expect((await accountContext(stranger)).profiles.map((p) => p.id)).toEqual([source.id]);
    expect(
      (await pool.query('select closed_at from advertisers where id=$1', [placeholder.id])).rows[0]
        .closed_at,
    ).not.toBeNull();
    expect(
      (await pool.query('select advertiser_id from adverts where id=$1', [ad.advertId])).rows[0]
        .advertiser_id,
    ).toBe(source.id);
    await expect(claimAdvertiser(admin, placeholder.id, claim)).rejects.toMatchObject({
      status: 404,
    });
  });
  it('never replaces an automatic personal profile that has advert activity', async () => {
    await pool.query('update users set email_verified=now() where id=$1', [stranger]);
    const placeholder = (await createProfile(stranger, {
      name: 'Active Student',
      kind: 'student',
      consent: true,
    })) as { id: string };
    await createAdvert(stranger, content('Student private draft service'), placeholder.id);
    const source = await createAssistedProfile(admin, {
      name: 'Assisted Student',
      kind: 'student',
      consent: true,
    });
    await expect(
      claimAdvertiser(admin, source.id, {
        userId: stranger,
        contactVerified: true,
        consent: true,
        evidenceReference: 'Checked contact and consent',
        replaceUnusedPersonal: true,
      }),
    ).rejects.toMatchObject({ code: 'PROFILE_EXISTS' });
  });
  const defaults = (name = 'Campus Seller') => ({
    name,
    phone: '0241234567',
    whatsapp: '0543982307',
    location: 'UCC campus',
    bio: 'Student selling personal items.',
    contactConsent: true,
    visibility: { phone: true, whatsapp: true },
  });
  it('saves personal changes immediately with optimistic versions and ownership checks', async () => {
    const profile = await personalProfile(owner);
    await savePersonalProfile(owner, {
      version: 0,
      submit: false,
      profile: { name: 'Private draft' },
    });
    expect((await personalProfile(owner)).state).toBe('incomplete');
    await expect(
      savePersonalProfile(owner, { version: 0, profile: defaults() }),
    ).rejects.toMatchObject({ code: 'PROFILE_CHANGED' });
    await expect(
      savePersonalProfile(owner, { version: 1, profile: { name: 'Missing contact' } }),
    ).rejects.toMatchObject({ code: 'PROFILE_INCOMPLETE' });
    await savePersonalProfile(owner, { version: 1, profile: defaults('Approved personal name') });
    await expect(
      moderatePersonalProfile(stranger, profile.id, {
        version: 2,
        decision: 'approve',
        reason: 'Unauthorized review',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      moderatePersonalProfile(admin, profile.id, {
        version: 1,
        decision: 'approve',
        reason: 'Stale review',
      }),
    ).rejects.toMatchObject({ code: 'PROFILE_CHANGED' });
    expect((await personalProfile(owner)).approved?.name).toBe('Approved personal name');
    await expect(personalProfile(stranger, profile.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('resolves approved linked defaults, preserves overrides and applies privacy immediately', async () => {
    const profile = await personalProfile(owner);
    await savePersonalProfile(owner, { version: 0, profile: defaults() });
    const linked = {
      ...content('Profile-linked campus service'),
      displayName: 'Campus Seller',
      phone: '+233241234567',
      whatsapp: '+233543982307',
      contactSources: ['displayName', 'phone', 'whatsapp', 'location'],
      profileVersion: 1,
    };
    const a = await createAdvert(owner, linked, profile.id);
    await submitAdvert(owner, a.advertId, a.revisionId, randomUUID());
    await moderate(admin, a.revisionId, 'approve', 'Reviewed submitted contact snapshot', 1);
    const override = await createAdvert(
      owner,
      {
        ...linked,
        title: 'Customized contact service',
        phone: '+233201234567',
        contactSources: ['whatsapp', 'location'],
      },
      profile.id,
    );
    await submitAdvert(owner, override.advertId, override.revisionId, randomUUID());
    await moderate(admin, override.revisionId, 'approve', 'Reviewed override contact', 1);
    await savePersonalProfile(owner, {
      version: 1,
      profile: { ...defaults(), location: 'Cape Coast central' },
    });
    expect((await advertDetail(a.advertId)).data.location).toBe('Cape Coast central');
    expect((await advertDetail(a.advertId)).data.location).toBe('Cape Coast central');
    expect((await advertDetail(override.advertId)).data.phone).toBe('+233201234567');
    expect((await listAdverts({ location: 'Cape Coast central' })).items).toHaveLength(2);
    const expiry = (await advertDetail(a.advertId)).expires_at;
    await savePersonalProfile(owner, {
      version: 2,
      profile: { ...defaults(), visibility: { phone: false, whatsapp: false } },
    });
    expect((await advertDetail(a.advertId)).contacts.phone).toBe('tel:+233241234567');
    expect((await personalProfile(owner)).approved?.visibility).toMatchObject({
      phone: true,
      whatsapp: true,
    });
    await savePersonalProfile(owner, { version: 3, profile: defaults() });
    const edit = await saveAdvert(owner, a.advertId, { ...linked, profileVersion: 4 });
    await submitAdvert(owner, a.advertId, edit.revisionId, randomUUID());
    await expect(
      moderate(admin, edit.revisionId, 'approve', 'Old contact review', 3),
    ).rejects.toMatchObject({ code: 'PROFILE_CHANGED' });
    await moderate(admin, edit.revisionId, 'approve', 'Explicitly restored advert', 4);
    expect((await advertDetail(a.advertId)).expires_at).toEqual(expiry);
  });
  it('saves optional social visibility immediately without hiding required contacts', async () => {
    const profile = await personalProfile(owner);
    await savePersonalProfile(owner, {
      version: 0,
      profile: {
        ...defaults(),
        socials: { instagram: 'https://www.instagram.com/campus_seller' },
        visibility: { instagram: false, photo: false, phone: false, whatsapp: false },
      },
    });
    const saved = await personalProfile(owner);
    expect(saved.state).toBe('approved');
    expect(saved.approvedVersion).toBe(saved.version);
    expect(saved.approved?.visibility).toMatchObject({
      instagram: false,
      photo: false,
      phone: true,
      whatsapp: true,
    });
    await expect(
      savePersonalProfile(
        stranger,
        { version: saved.version, profile: defaults('Intruder') },
        profile.id,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect((await personalProfile(owner)).approved?.name).toBe('Campus Seller');
    await savePersonalProfile(owner, {
      version: 1,
      profile: {
        ...defaults(),
        socials: { instagram: 'https://www.instagram.com/campus_seller' },
        visibility: { instagram: true, photo: true },
      },
    });
    expect((await personalProfile(owner)).approved?.visibility?.instagram).toBe(true);
  });
  it('keeps optional Facebook links private on business profiles until made visible', async () => {
    await createProfile(owner, { name: 'Campus Books', kind: 'business', consent: true });
    const input = {
      name: 'Campus Books',
      slug: 'campus-books',
      description: 'Medical textbooks for students around campus.',
      location: 'UCC campus',
      socials: { facebook: 'https://www.facebook.com/campusbooks' },
      visibility: { facebook: false },
    };
    await saveBusiness(owner, input);
    const hidden = (await listBusinesses('campus-books')) as {
      approved: { socials?: { facebook?: string } };
    };
    expect(hidden.approved.socials?.facebook).toBeUndefined();
    await saveBusiness(owner, { ...input, visibility: { facebook: true } });
    const visible = (await listBusinesses('campus-books')) as {
      approved: { socials?: { facebook?: string } };
    };
    expect(visible.approved.socials?.facebook).toBe('https://www.facebook.com/campusbooks');
  });
  it('saves a single profile field without requiring a full form and rejects stale or unauthorized writes', async () => {
    const p = await personalProfile(owner);
    const first = await patchProfileField(owner, {
      kind: 'student',
      version: 0,
      field: 'whatsapp',
      value: '024 123 4567',
      contactConsent: true,
    });
    expect(first.data.whatsapp).toBe('+233241234567');
    expect(first.complete).toBe(false);
    expect((await personalProfile(owner)).draft?.whatsapp).toBe('+233241234567');
    await expect(
      patchProfileField(owner, {
        kind: 'student',
        version: 0,
        field: 'name',
        value: 'Stale change',
      }),
    ).rejects.toMatchObject({ code: 'PROFILE_CHANGED' });
    await expect(
      patchProfileField(
        stranger,
        { kind: 'student', version: 1, field: 'name', value: 'Intruder' },
        p.id,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      patchProfileField(owner, { kind: 'student', version: 1, field: 'phone', value: 'invalid' }),
    ).rejects.toBeDefined();
    expect((await personalProfile(owner)).version).toBe(1);
    await patchProfileField(owner, {
      kind: 'student',
      version: 1,
      field: 'phone',
      value: '0543982307',
    });
    const complete = await patchProfileField(owner, {
      kind: 'student',
      version: 2,
      field: 'location',
      value: 'Science Market',
    });
    expect(complete.complete).toBe(true);
    expect((await personalProfile(owner)).approved?.location).toBe('Science Market');
    await patchProfileField(owner, {
      kind: 'student',
      version: 3,
      field: 'social.instagram',
      value: 'https://www.instagram.com/campus_seller',
    });
    await patchProfileField(owner, {
      kind: 'student',
      version: 4,
      field: 'visible.instagram',
      value: false,
    });
    expect((await personalProfile(owner)).approved?.visibility?.instagram).toBe(false);
    await patchProfileField(owner, {
      kind: 'student',
      version: 5,
      field: 'social.instagram',
      value: '',
    });
    expect((await personalProfile(owner)).approved?.socials?.instagram).toBeUndefined();
  });
  it('persists unfinished business fields independently and publishes once complete', async () => {
    const business = (await createProfile(owner, {
      name: 'Campus Books',
      kind: 'business',
      consent: true,
    })) as { id: string };
    const changes = [
      ['slug', 'focused-campus-books'],
      ['description', 'Medical textbooks and stationery for students.'],
      ['location', 'Science Market'],
      ['whatsapp', '0241234567'],
      ['phone', '0543982307'],
    ];
    for (let version = 0; version < changes.length; version++) {
      const [field, value] = changes[version];
      await patchProfileField(owner, {
        kind: 'business',
        version,
        field,
        value,
        contactConsent: true,
      });
      if (version < 4)
        await expect(listBusinesses('focused-campus-books')).rejects.toMatchObject({ status: 404 });
    }
    expect(
      ((await listBusinesses('focused-campus-books')) as { approved: { phone: string } }).approved
        .phone,
    ).toBe('+233543982307');
    const mid = randomUUID();
    const personal = await personalProfile(owner);
    await pool.query(
      "insert into media_assets(id,advertiser_id,object_key,state,bytes) values($1,$2,$3,'ready',10)",
      [mid, personal.id, `derived/${mid}.webp`],
    );
    await expect(
      patchProfileField(owner, { kind: 'business', version: 5, field: 'logoMediaId', value: mid }),
    ).rejects.toMatchObject({ code: 'INVALID_MEDIA' });
    expect((await accountContext(owner)).profiles.find((p) => p.id === business.id)?.version).toBe(
      5,
    );
  });
  it('preserves the advertiser name while editing a legacy business without a stored name', async () => {
    await createProfile(owner, { name: 'Old Campus Shop', kind: 'business', consent: true });
    await saveBusiness(owner, {
      slug: 'old-campus-shop',
      description: 'Existing business description for campus students.',
      location: 'UCC campus',
      phone: '0241234567',
      contactConsent: true,
    });
    await patchProfileField(owner, {
      kind: 'business',
      version: 1,
      field: 'description',
      value: 'Updated legacy business description for campus students.',
    });
    await patchProfileField(owner, {
      kind: 'business',
      version: 2,
      field: 'whatsapp',
      value: '0241234567',
    });
    const visible = (await listBusinesses('old-campus-shop')) as {
      approved: { name: string; description: string };
    };
    expect(visible.approved.name).toBe('Old Campus Shop');
    expect(visible.approved.description).toBe(
      'Updated legacy business description for campus students.',
    );
  });
  it('retains a business logo saved before the rest of the profile is complete', async () => {
    const p = (await createProfile(owner, {
      name: 'New Campus Business',
      kind: 'business',
      consent: true,
    })) as { id: string };
    const mid = randomUUID();
    await pool.query(
      "insert into media_assets(id,advertiser_id,object_key,state,bytes,created_at) values($1,$2,$3,'ready',10,now()-interval '2 days')",
      [mid, p.id, `derived/${mid}.webp`],
    );
    await patchProfileField(owner, {
      kind: 'business',
      version: 0,
      field: 'logoMediaId',
      value: mid,
    });
    const objects: ObjectStorage = {
      sign: async () => '',
      read: async () => Buffer.from('logo-bytes'),
      write: async () => {},
      remove: async () => {},
    };
    expect((await maintenance(objects)).cleaned).toBe(0);
    expect((await readMedia(owner, mid, objects)).toString()).toBe('logo-bytes');
  });
  it('keeps legacy snapshots independent from profile updates', async () => {
    const ad = await submit('Legacy contact stays unchanged');
    await moderate(admin, ad.revisionId, 'approve', 'Reviewed legacy advert');
    await savePersonalProfile(owner, {
      version: 0,
      profile: { ...defaults('New default name'), visibility: { phone: false, whatsapp: false } },
    });
    const visible = await advertDetail(ad.advertId);
    expect(visible.data.phone).toBe('+233241234567');
    expect(visible.seller).toBe('Campus Seller');
  });
  it('deactivates and closes businesses safely, retaining history and permitting one replacement', async () => {
    const p = (await createProfile(owner, {
      name: 'Old Brand',
      kind: 'business',
      consent: true,
    })) as { id: string };
    await saveBusiness(owner, {
      name: 'Old Brand',
      slug: 'old-brand',
      description: 'A campus business with an approved storefront.',
      location: 'UCC',
    });
    const ad = await createAdvert(owner, content('Business-owned campus service'), p.id);
    await submitAdvert(owner, ad.advertId, ad.revisionId, randomUUID());
    await moderate(admin, ad.revisionId, 'approve', 'Reviewed business advert');
    const expiry = (await advertDetail(ad.advertId)).expires_at;
    await businessLifecycle(owner, { action: 'deactivate', confirm: true });
    await expect(advertDetail(ad.advertId)).rejects.toMatchObject({ status: 404 });
    await expect(listBusinesses('old-brand')).rejects.toMatchObject({ status: 404 });
    await businessLifecycle(owner, { action: 'reactivate', confirm: true });
    await expect(
      reviewReactivation(stranger, p.id, { decision: 'approve', reason: 'Invalid administrator' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await reviewReactivation(admin, p.id, {
      decision: 'approve',
      reason: 'Reviewed business reactivation',
    });
    expect((await advertDetail(ad.advertId)).expires_at).toEqual(expiry);
    await businessLifecycle(owner, { action: 'close', confirm: true, name: 'Old Brand' });
    await expect(listBusinesses('old-brand')).rejects.toMatchObject({ status: 404 });
    const replacement = (await createProfile(owner, {
      name: 'Replacement Brand',
      kind: 'business',
      consent: true,
    })) as { id: string };
    expect(replacement.id).not.toBe(p.id);
    expect((await accountContext(owner)).profiles).toHaveLength(2);
    expect((await accountContext(owner)).dailyUsed).toBe(1);
    expect(
      (await pool.query('select count(*)::int n from adverts where advertiser_id=$1', [p.id]))
        .rows[0].n,
    ).toBe(1);
  });
});
