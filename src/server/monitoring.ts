import 'server-only';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db } from './db';
import { actor, one } from './store';
import { imageStorageUsage } from './storage';
import type { UsageMetric, UsageSection, SystemReport } from '../lib/monitoring';
const neonProject = 'summer-snow-64005723';
const vercelProject = 'prj_blRh2DqpaBlRwoo544VNzOFsdDnQ';
const vercelTeam = 'team_aq3Rv1q9fHrazQLARIYa7ZPu';
const number = z.coerce.number().finite().nonnegative();
const optionalNumber = number.nullish();
const notConnected = (provider: string): UsageSection => ({
  state: 'not_connected',
  message: `${provider} usage API is not connected. Server-side monitoring credentials are required; missing figures are not zero.`,
  metrics: [],
});
const unavailable = (provider: string): UsageSection => ({
  state: 'unavailable',
  message: `${provider} usage is unavailable. Check API permissions, plan support and connectivity. No figures have been estimated.`,
  metrics: [],
});
async function providerText(url: string, token: string) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
    redirect: 'error',
  });
  if (!response.ok) throw Error('Provider request failed');
  const reader = response.body?.getReader();
  if (!reader) throw Error('Empty provider response');
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 2 * 1024 * 1024) {
      await reader.cancel();
      throw Error('Provider response too large');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}
export function parseNeonUsage(input: unknown): UsageMetric[] {
  const { project } = z
    .object({
      project: z.object({
        id: z.literal(neonProject),
        data_transfer_bytes: optionalNumber,
        compute_time_seconds: optionalNumber,
        consumption_period_start: z.string(),
        consumption_period_end: z.string(),
        settings: z
          .object({
            quota: z
              .object({ data_transfer_bytes: optionalNumber, logical_size_bytes: optionalNumber })
              .optional(),
          })
          .optional(),
        branch_logical_size_limit_bytes: optionalNumber,
      }),
    })
    .parse(input);
  const q = project.settings?.quota;
  return [
    {
      label: 'Project network transfer',
      value: project.data_transfer_bytes ?? null,
      unit: 'bytes',
      limit: q?.data_transfer_bytes || null,
      note: `All project branches; provider-reported, delayed operational counter. Period ${project.consumption_period_start.slice(0, 10)} – ${project.consumption_period_end.slice(0, 10)}; not an invoice.`,
    },
    {
      label: 'Project compute',
      value: project.compute_time_seconds ?? null,
      unit: 'CPU seconds',
      note: 'All project branches in the provider consumption period.',
    },
    {
      label: 'Branch logical storage ceiling',
      value: q?.logical_size_bytes || project.branch_logical_size_limit_bytes || null,
      unit: 'bytes',
      note: 'Configured technical ceiling, not a free-plan storage allowance. Does not measure object storage.',
    },
  ];
}
export function parseVercelUsage(source: string): UsageMetric[] {
  const schema = z.object({
    BilledCost: z.coerce.number().finite(),
    BillingCurrency: z.literal('USD'),
    ServiceName: z.string().max(200),
    ConsumedQuantity: optionalNumber,
    ConsumedUnit: z.string().max(100).nullable(),
    ChargeCategory: z.string(),
    Tags: z.record(z.string(), z.string()),
  });
  const rows = source
    .split('\n')
    .filter((s) => s.trim())
    .map((line) => schema.parse(JSON.parse(line)));
  // Never expose another project's billing data or unattributed team-wide purchases.
  const own = rows.filter((r) => r.Tags.ProjectId === vercelProject);
  const metrics = new Map<string, UsageMetric>();
  for (const row of own) {
    if (row.ChargeCategory !== 'Usage' || row.ConsumedQuantity == null || row.ConsumedUnit == null)
      continue;
    const key = `${row.ServiceName}:${row.ConsumedUnit}`;
    const m = metrics.get(key) ?? { label: row.ServiceName, value: 0, unit: row.ConsumedUnit };
    m.value! += row.ConsumedQuantity;
    metrics.set(key, m);
  }
  if (!own.length) return [];
  return [
    {
      label: 'Project billed charges',
      value: own.reduce((n, r) => n + r.BilledCost, 0),
      unit: 'USD',
      note: 'Project-attributed charges only. Excludes team-wide subscriptions, taxes and unallocated credits; not a final invoice.',
    },
    ...metrics.values(),
  ];
}
async function neonUsage(): Promise<UsageSection> {
  const token = process.env.NEON_MONITORING_API_KEY;
  if (!token) return notConnected('Neon');
  try {
    return {
      state: 'ready',
      message:
        'Read-only Neon project counters. Provider data may lag. Plan allowances are not inferred from technical quotas.',
      metrics: parseNeonUsage(
        JSON.parse(
          await providerText(`https://console.neon.tech/api/v2/projects/${neonProject}`, token),
        ),
      ),
    };
  } catch {
    return unavailable('Neon');
  }
}
async function vercelUsage(): Promise<UsageSection> {
  const token = process.env.VERCEL_MONITORING_TOKEN;
  if (!token) return notConnected('Vercel');
  const to = new Date();
  const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  const params = new URLSearchParams({
    teamId: vercelTeam,
    from: from.toISOString(),
    to: to.toISOString(),
  });
  try {
    const metrics = parseVercelUsage(
      await providerText(`https://api.vercel.com/v1/billing/charges?${params}`, token),
    );
    return {
      state: 'ready',
      message: `Calendar month to date (${from.toISOString().slice(0, 10)} – ${to.toISOString().slice(0, 10)}), MedStash project only. Billing data may lag. ${metrics.length ? '' : 'No project-attributed charge records returned; this does not establish zero usage.'}`,
      metrics,
    };
  } catch {
    return unavailable('Vercel');
  }
}
let cached: { until: number; report: SystemReport } | undefined;
let pending: Promise<SystemReport> | undefined;
async function collect(): Promise<SystemReport> {
  const start = performance.now();
  const stats = await one<{
    database_bytes: string;
    table_bytes: string;
    ready_bytes: string;
    ready_images: number;
    staged_images: number;
  }>(
    db(),
    sql`select pg_database_size(current_database())::text as database_bytes,(select coalesce(sum(pg_total_relation_size(relid)),0)::text from pg_stat_user_tables) as table_bytes,coalesce(sum(bytes) filter(where state='ready'),0)::text as ready_bytes,count(*) filter(where state='ready')::int as ready_images,count(*) filter(where state='staged')::int as staged_images from media_assets`,
  );
  const latency = Math.round(performance.now() - start);
  const [images, neon, vercel] = await Promise.all([
    imageStorageUsage()
      .then((s): UsageSection => ({
        state: 'ready',
        message: s.complete
          ? 'Read-only inventory of the configured image bucket, including staging and cleanup leftovers.'
          : 'Partial bucket inventory: capped at 10,000 objects; values are lower bounds.',
        metrics: [
          {
            label: s.complete ? 'Image bucket storage' : 'Image bucket storage (at least)',
            value: s.bytes,
            unit: 'bytes',
          },
          { label: 'Stored objects', value: s.objects, unit: 'objects' },
          { label: 'Ready image records', value: stats.ready_images, unit: 'images' },
          { label: 'Tracked ready image size', value: Number(stats.ready_bytes), unit: 'bytes' },
          { label: 'Pending upload records', value: stats.staged_images, unit: 'uploads' },
        ],
      }))
      .catch((): UsageSection => ({
        state: 'unavailable',
        message:
          'Bucket inventory unavailable; current credentials may not allow listing. Tracked images below exclude abandoned objects and are not a billing total.',
        metrics: [
          { label: 'Tracked ready image size', value: Number(stats.ready_bytes), unit: 'bytes' },
          { label: 'Ready image records', value: stats.ready_images, unit: 'images' },
        ],
      })),
    neonUsage(),
    vercelUsage(),
  ]);
  return {
    checkedAt: new Date().toISOString(),
    database: {
      state: 'ready',
      message:
        'Measured directly from the connected database. SQL storage is distinct from image storage and provider billable storage.',
      metrics: [
        { label: 'Connected database size', value: Number(stats.database_bytes), unit: 'bytes' },
        { label: 'Application tables & indexes', value: Number(stats.table_bytes), unit: 'bytes' },
        { label: 'Database check duration', value: latency, unit: 'ms' },
      ],
    },
    images,
    neon,
    vercel,
    runtime: {
      environment: process.env.VERCEL_ENV ?? 'local',
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? null,
    },
  };
}
export async function systemCheck(userId: string) {
  // Authorize on every request, including cache hits. No tokens/raw API payloads reach clients.
  await db().transaction((tx) => actor(tx, userId, true));
  if (cached && cached.until > Date.now()) return cached.report;
  pending ??= collect()
    .then((report) => {
      cached = { report, until: Date.now() + 300000 };
      return report;
    })
    .finally(() => {
      pending = undefined;
    });
  return pending;
}
