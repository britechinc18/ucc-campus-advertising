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
import { listAdverts, advertDetail, home } from '../src/server/discovery';
import {
  updateSettings,
  setAdvertiserSuspension,
  createAssistedProfile,
  claimAdvertiser,
} from '../src/server/admin';
import { saveBusiness, moderateBusiness, listBusinesses } from '../src/server/businesses';
import { signUpload, completeUpload, readMedia, type ObjectStorage } from '../src/server/storage';
import { maintenance } from '../src/server/maintenance';
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
    await pool.query('update platform_settings set max_active=5,daily_limit=3,duration_days=30');
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
    await expect(updateSettings(admin, { ...settings, autoPublish: true })).rejects.toBeDefined();
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
  it('moderates business edits without leaking pending content', async () => {
    await pool.query("update advertisers set kind='business' where user_id=$1", [owner]);
    const input = {
      slug: 'campus-business',
      description: 'Approved campus business description.',
      location: 'UCC',
    };
    const b = await saveBusiness(owner, input);
    expect(await listBusinesses()).toEqual([]);
    await moderateBusiness(admin, b.id, { decision: 'approve', reason: 'Reviewed business' });
    await saveBusiness(owner, { ...input, description: 'Unreviewed private business content.' });
    const visible = (await listBusinesses()) as { approved: { description: string } }[];
    expect(visible[0].approved.description).toBe(input.description);
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
    await expect(readMedia(undefined, mediaId, objects)).rejects.toMatchObject({ status: 404 });
    await moderateBusiness(admin, b.id, {
      decision: 'approve',
      reason: 'Profile and contacts reviewed',
    });
    expect((await readMedia(undefined, mediaId, objects)).toString()).toBe('logo-bytes');
    await expect(saveBusiness(owner, profile)).rejects.toBeDefined();
    await moderateBusiness(admin, b.id, {
      decision: 'suspend',
      reason: 'Profile suspended for investigation',
    });
    await expect(readMedia(undefined, mediaId, objects)).rejects.toMatchObject({ status: 404 });
  });
});
