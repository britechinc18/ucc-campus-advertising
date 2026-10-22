import 'server-only';
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { z, ZodError } from 'zod';
import { sql } from 'drizzle-orm';
import { auth } from './auth';
import { isAuthenticationConfigured } from './config';
import { notificationFeed } from './notifications';
import { readiness } from './readiness';
import { systemCheck } from './monitoring';
import { AppError, ensure } from './errors';
import {
  createProfile,
  createAdvert,
  saveAdvert,
  submitAdvert,
  moderate,
  transition,
  myAdverts,
} from './adverts';
import {
  adminRead,
  createAssistedProfile,
  updateSettings,
  setAdvertiserSuspension,
  resolveReport,
  categoryMutation,
  featureAdvert,
  claimAdvertiser,
} from './admin';
import { listAdverts, advertDetail, home, reportAdvert, recordEvent } from './discovery';
import { businessQueue, listBusinesses, moderateBusiness, saveBusiness } from './businesses';
import { signUpload, completeUpload, readMedia } from './storage';
import { maintenance } from './maintenance';
import { actor, one, query, rateLimit, limits } from './store';
import { accountContext, ownedAdverts, ownBusiness, adminView } from './frontend';
import { db } from './db';
import { id } from './validation';
async function body(request: Request) {
  ensure(
    request.headers.get('content-type')?.split(';')[0] === 'application/json',
    415,
    'CONTENT_TYPE',
    'Use application/json',
  );
  const reader = request.body?.getReader();
  ensure(reader, 422, 'EMPTY_BODY', 'JSON body required');
  let size = 0;
  const parts: Uint8Array[] = [];
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.length;
    if (size > 32768) {
      await reader.cancel();
      throw new AppError(413, 'BODY_TOO_LARGE', 'Request body exceeds 32KB');
    }
    parts.push(chunk.value);
  }
  try {
    return JSON.parse(Buffer.concat(parts).toString()) as unknown;
  } catch {
    throw new AppError(422, 'INVALID_JSON', 'Invalid JSON body');
  }
}
function anonymousKey(request: Request) {
  const secret = process.env.ABUSE_HASH_SECRET;
  ensure(secret && secret.length >= 32, 503, 'CONFIGURATION', 'Abuse controls are not configured');
  // Vercel overwrites this header; do not trust generic caller-controlled x-forwarded-for.
  const ip =
    process.env.VERCEL === '1'
      ? (request.headers.get('x-vercel-forwarded-for') ?? 'unknown')
      : 'local';
  return createHmac('sha256', secret).update(ip).digest('hex');
}
export function sameOrigin(request: Request) {
  const origin = process.env.APP_ORIGIN;
  ensure(origin, 503, 'CONFIGURATION', 'Application origin is not configured');
  ensure(
    request.headers.get('origin') === new URL(origin).origin,
    403,
    'ORIGIN',
    'Request origin is not allowed',
  );
}
function scheduler(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.MAINTENANCE_SECRET;
  ensure(secret && secret.length >= 32, 503, 'CONFIGURATION', 'Maintenance is not configured');
  const actual = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  ensure(
    actual.length === expected.length && timingSafeEqual(actual, expected),
    401,
    'UNAUTHORIZED',
    'Maintenance credentials required',
  );
}
function pageOffset(url: URL) {
  return z.coerce
    .number()
    .int()
    .min(0)
    .max(10000)
    .parse(url.searchParams.get('offset') ?? 0);
}
export async function dispatch(request: Request, path: string[]): Promise<Response> {
  const requestId = randomUUID();
  const headers = {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Request-ID': requestId,
  };
  try {
    const method = request.method;
    const url = new URL(request.url);
    const route = path.join('/');
    if (['GET', 'POST'].includes(method) && route === 'internal/maintenance') {
      scheduler(request);
      return Response.json(await maintenance(), { headers });
    }
    if (!['GET', 'HEAD'].includes(method)) sameOrigin(request);
    // Narrow allowlist for public reads: none consults authentication or needs an account.
    if (method === 'GET') {
      if (route === 'health') {
        const result = await readiness();
        return Response.json(result.body, { status: result.status, headers });
      }
      if (route === 'notifications') {
        const session = isAuthenticationConfigured() ? await auth() : null;
        return Response.json(await notificationFeed(session?.user?.id), { headers });
      }
      if (route === 'saved') {
        const ids = z
          .array(id)
          .max(40)
          .parse((url.searchParams.get('ids') ?? '').split(',').filter(Boolean));
        const unique = [...new Set(ids)];
        const items = await Promise.all(
          unique.map(async (value) => {
            try {
              return await advertDetail(value);
            } catch (error) {
              if (error instanceof AppError && error.status === 404) return null;
              throw error;
            }
          }),
        );
        return Response.json(
          { items: items.filter(Boolean), unavailable: unique.filter((_, i) => !items[i]) },
          { headers },
        );
      }
      if (route === 'adverts')
        return Response.json(await listAdverts(Object.fromEntries(url.searchParams)), { headers });
      if (route === 'home') return Response.json(await home(), { headers });
      if (route === 'categories')
        return Response.json(
          await query(db(), sql`select id,name,slug from categories where active order by name`),
          { headers },
        );
      if (route === 'businesses') return Response.json(await listBusinesses(), { headers });
      if (path[0] === 'businesses' && path.length === 2)
        return Response.json(await listBusinesses(path[1]), { headers });
      if (path[0] === 'adverts' && path.length === 2)
        return Response.json(await advertDetail(path[1]), { headers });
      if (path[0] === 'media' && path.length === 2) {
        // Public media needs no session; auth is resolved only if necessary by the media handler below.
        let bytes: Buffer;
        try {
          bytes = await readMedia(undefined, path[1]);
        } catch (error) {
          if (!(error instanceof AppError) || error.status !== 404) throw error;
          if (!isAuthenticationConfigured()) throw error;
          const session = await auth();
          bytes = await readMedia(session?.user?.id, path[1]);
        }
        return new Response(new Uint8Array(bytes), {
          headers: { ...headers, 'Content-Type': 'image/webp' },
        });
      }
    }
    if (
      method === 'POST' &&
      path[0] === 'adverts' &&
      path.length === 3 &&
      ['reports', 'events'].includes(path[2])
    ) {
      const key = anonymousKey(request);
      await rateLimit(`${path[2]}:${key}`, path[2] === 'reports' ? 5 : 120, 3600);
      if (path[2] === 'events') await rateLimit(`event:${path[1]}:${key}`, 3, 3600);
      return Response.json(
        path[2] === 'reports'
          ? await reportAdvert(path[1], key, await body(request))
          : await recordEvent(path[1], await body(request)),
        { headers, status: 202 },
      );
    }
    ensure(
      isAuthenticationConfigured(),
      503,
      'AUTH_UNAVAILABLE',
      'Sign-in is not configured for this backend preview',
    );
    const session = await auth();
    const userId = session?.user?.id;
    ensure(userId, 401, 'UNAUTHORIZED', 'Sign in to continue');
    // Fast rejection plus a second check under transaction in each domain service.
    const currentActor = await db().transaction((tx) => actor(tx, userId, path[0] === 'admin'));
    if (method !== 'GET' && currentActor.role !== 'admin')
      await rateLimit(`write:${userId}`, 60, 3600);
    if (method === 'POST' && route === 'me/mode') {
      const data = z
        .object({ mode: z.enum(['buyer', 'seller']) })
        .strict()
        .parse(await body(request));
      const context = await accountContext(userId);
      ensure(
        context.profile && !context.profile.suspended,
        403,
        'SELLER_REQUIRED',
        'Activate your seller profile first',
      );
      return Response.json(
        { mode: data.mode },
        {
          headers: {
            ...headers,
            'Set-Cookie': `medstash-mode=${userId}:${data.mode}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${new URL(process.env.APP_ORIGIN!).protocol === 'https:' ? '; Secure' : ''}`,
          },
        },
      );
    }
    if (method === 'GET' && route === 'admin/system')
      return Response.json(await systemCheck(userId), { headers });
    if (method === 'GET' && route === 'me/context')
      return Response.json(await accountContext(userId), { headers });
    if (method === 'GET' && route === 'me/business')
      return Response.json(await ownBusiness(userId), { headers });
    if (method === 'GET' && route === 'me/adverts')
      return Response.json(
        url.searchParams.has('offset')
          ? await ownedAdverts(
              userId,
              pageOffset(url),
              undefined,
              url.searchParams.get('state') ?? undefined,
            )
          : await myAdverts(userId),
        { headers },
      );
    if (method === 'GET' && path[0] === 'me' && path[1] === 'adverts' && path.length === 3)
      return Response.json(await ownedAdverts(userId, 0, path[2]), { headers });
    if (
      method === 'GET' &&
      path[0] === 'admin' &&
      ['overview', 'categories', 'adverts'].includes(path[1]) &&
      path.length <= 3
    )
      return Response.json(
        await adminView(
          userId,
          path[1],
          pageOffset(url),
          path[2],
          z
            .string()
            .max(100)
            .parse(url.searchParams.get('q') ?? ''),
        ),
        { headers },
      );
    if (
      method === 'GET' &&
      path[0] === 'admin' &&
      ['submissions', 'advertisers'].includes(path[1]) &&
      path.length === 3
    )
      return Response.json(await adminView(userId, path[1], 0, path[2]), { headers });
    if (method === 'GET' && route === 'me/profile')
      return Response.json(
        await db().transaction(async (tx) => {
          await actor(tx, userId);
          const profile = await one<{ id: string }>(
            tx,
            sql`select * from advertisers where user_id=${userId}`,
          );
          const settings = await limits(tx);
          const usage = await query(
            tx,
            sql`select count from advertiser_daily_usage where advertiser_id=${profile.id} and day=to_char(now() at time zone 'Africa/Accra','YYYY-MM-DD')`,
          );
          return { profile, settings, usage: usage[0] ?? { count: 0 } };
        }),
        { headers },
      );
    if (method === 'POST' && route === 'me/profile')
      return Response.json(await createProfile(userId, await body(request)), {
        headers,
        status: 201,
      });
    if (method === 'POST' && route === 'me/adverts')
      return Response.json(await createAdvert(userId, await body(request)), {
        headers,
        status: 201,
      });
    if (path[0] === 'me' && path[1] === 'adverts' && path.length >= 3) {
      id.parse(path[2]);
      if (method === 'PATCH' && path.length === 3)
        return Response.json(await saveAdvert(userId, path[2], await body(request)), { headers });
      if (method === 'POST' && path.length === 4) {
        if (path[3] === 'submit') {
          if (currentActor.role !== 'admin') await rateLimit(`submit:${userId}`, 20, 3600);
          const data = z
            .object({ revisionId: id })
            .strict()
            .parse(await body(request));
          return Response.json(
            await submitAdvert(
              userId,
              path[2],
              data.revisionId,
              id.parse(request.headers.get('idempotency-key')),
            ),
            { headers },
          );
        }
        if (path[3] === 'renew')
          return Response.json(await saveAdvert(userId, path[2], await body(request), true), {
            headers,
          });
        if (['withdraw', 'fulfill'].includes(path[3]))
          return Response.json(
            await transition(userId, path[2], path[3] === 'withdraw' ? 'withdrawn' : 'fulfilled'),
            { headers },
          );
      }
    }
    if (method === 'POST' && route === 'uploads/sign') {
      if (currentActor.role !== 'admin') await rateLimit(`upload:${userId}`, 30, 86400);
      return Response.json(await signUpload(userId, await body(request)), { headers });
    }
    if (method === 'POST' && route === 'uploads/complete') {
      const data = z
        .object({ mediaId: id })
        .strict()
        .parse(await body(request));
      return Response.json(await completeUpload(userId, data.mediaId), { headers });
    }
    if (method === 'POST' && route === 'me/business')
      return Response.json(await saveBusiness(userId, await body(request)), { headers });
    if (path[0] === 'admin') {
      if (method === 'GET' && path.length === 2) {
        if (path[1] === 'businesses')
          return Response.json(
            url.searchParams.get('all') === '1'
              ? await adminView(userId, 'businesses', pageOffset(url))
              : await businessQueue(userId),
            { headers },
          );
        const resource = z
          .enum(['submissions', 'reports', 'settings', 'advertisers', 'audit'])
          .parse(path[1]);
        return Response.json(
          await adminRead(
            userId,
            resource,
            pageOffset(url),
            url.searchParams.get('status') ?? 'open',
            z
              .string()
              .max(100)
              .parse(url.searchParams.get('q') ?? ''),
          ),
          { headers },
        );
      }
      if (method === 'POST' && route === 'admin/advertisers')
        return Response.json(await createAssistedProfile(userId, await body(request)), {
          headers,
          status: 201,
        });
      if (method === 'PATCH' && path[1] === 'advertisers' && path.length === 3)
        return Response.json(await setAdvertiserSuspension(userId, path[2], await body(request)), {
          headers,
        });
      if (method === 'PATCH' && route === 'admin/settings')
        return Response.json(await updateSettings(userId, await body(request)), { headers });
      if (
        method === 'POST' &&
        path[1] === 'advertisers' &&
        path.length === 4 &&
        path[3] === 'claim'
      )
        return Response.json(await claimAdvertiser(userId, path[2], await body(request)), {
          headers,
        });
      if (method === 'POST' && route === 'admin/businesses') {
        const data = z
          .object({ advertiserId: id, profile: z.unknown() })
          .strict()
          .parse(await body(request));
        return Response.json(await saveBusiness(userId, data.profile, data.advertiserId), {
          headers,
        });
      }
      if (method === 'POST' && route === 'admin/categories')
        return Response.json(await categoryMutation(userId, await body(request)), { headers });
      if (method === 'POST' && route === 'admin/adverts') {
        const data = z
          .object({ advertiserId: id, content: z.unknown() })
          .strict()
          .parse(await body(request));
        return Response.json(await createAdvert(userId, data.content, data.advertiserId), {
          headers,
          status: 201,
        });
      }
      if (method === 'POST' && path[1] === 'submissions' && path.length === 4) {
        const decision = z.enum(['approve', 'reject']).parse(path[3]);
        const data = z
          .object({ reason: z.string() })
          .strict()
          .parse(await body(request));
        return Response.json(await moderate(userId, path[2], decision, data.reason), { headers });
      }
      if (method === 'POST' && path[1] === 'adverts' && path.length === 4) {
        if (path[3] === 'feature')
          return Response.json(await featureAdvert(userId, path[2], await body(request)), {
            headers,
          });
        if (path[3] === 'suspend') {
          const data = z
            .object({ reason: z.string() })
            .strict()
            .parse(await body(request));
          return Response.json(await transition(userId, path[2], 'suspended', data.reason), {
            headers,
          });
        }
      }
      if (method === 'PATCH' && path[1] === 'reports' && path.length === 3)
        return Response.json(await resolveReport(userId, path[2], await body(request)), {
          headers,
        });
      if (method === 'POST' && path[1] === 'businesses' && path.length === 3)
        return Response.json(await moderateBusiness(userId, path[2], await body(request)), {
          headers,
        });
    }
    throw new AppError(404, 'NOT_FOUND', 'API route not found');
  } catch (error) {
    if (error instanceof ZodError)
      return Response.json(
        {
          code: 'VALIDATION',
          message: 'Check the submitted fields',
          fields: error.issues.map((i) => ({ path: i.path, message: i.message })),
          requestId,
        },
        { status: 422, headers },
      );
    if (error instanceof AppError)
      return Response.json(
        { code: error.code, message: error.message, requestId },
        {
          status: error.status,
          headers: { ...headers, ...(error.status === 429 ? { 'Retry-After': '3600' } : {}) },
        },
      );
    // Convert expected database conflicts without exposing constraint names or SQL.
    const cause = error instanceof Error && 'cause' in error ? error.cause : error;
    const sqlState =
      typeof cause === 'object' && cause !== null && 'code' in cause ? cause.code : null;
    if (
      sqlState === '23505' ||
      sqlState === '23503' ||
      sqlState === '40P01' ||
      sqlState === '40001'
    )
      return Response.json(
        {
          code: 'CONFLICT',
          message: 'Resource changed or already exists; reload and retry',
          requestId,
        },
        { status: 409, headers },
      );
    // Never return SQL, parameters, credentials or internal error messages.
    console.error(
      JSON.stringify({
        requestId,
        errorType: error instanceof Error ? error.name : 'UnknownError',
      }),
    );
    return Response.json(
      { code: 'INTERNAL', message: 'Request could not be completed', requestId },
      { status: 500, headers },
    );
  }
}
