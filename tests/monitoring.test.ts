import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { parseNeonUsage, parseVercelUsage } from '../src/server/monitoring';
import { formatUsage } from '../src/lib/monitoring';
describe('provider usage accuracy and isolation', () => {
  it('distinguishes zero, unknown and technical quota from billing storage', () => {
    const rows = parseNeonUsage({
      project: {
        id: 'summer-snow-64005723',
        data_transfer_bytes: 0,
        compute_time_seconds: 12,
        synthetic_storage_size: 0,
        consumption_period_start: '2026-10-01',
        consumption_period_end: '2026-11-01',
        settings: { quota: { data_transfer_bytes: 0 } },
      },
    });
    expect(rows[0].value).toBe(0);
    expect(rows[0].limit).toBeNull();
    expect(rows[2].value).toBeNull();
    expect(rows.some((r) => r.label.includes('storage size'))).toBe(false);
    expect(formatUsage(null, 'bytes')).toBe('Unavailable');
    expect(formatUsage(0, 'bytes')).toBe('0 B');
    expect(() => parseNeonUsage({ project: { id: 'unrelated-project' } })).toThrow();
  });
  it('filters team billing to this project and never turns null usage into zero', () => {
    const row = {
      BilledCost: '1.25',
      BillingCurrency: 'USD',
      ChargeCategory: 'Usage',
      ConsumedQuantity: '2',
      ConsumedUnit: 'GB',
      ServiceName: 'Fast Data Transfer',
      Tags: { ProjectId: 'prj_blRh2DqpaBlRwoo544VNzOFsdDnQ' },
    };
    const data = [
      row,
      { ...row, BilledCost: 999, Tags: { ProjectId: 'unrelated' } },
      { ...row, ConsumedQuantity: null, ConsumedUnit: null, BilledCost: 0, ServiceName: 'Credit' },
    ];
    const metrics = parseVercelUsage(data.map((r) => JSON.stringify(r)).join('\n'));
    expect(metrics[0].value).toBe(1.25);
    expect(metrics[1].value).toBe(2);
    expect(metrics).toHaveLength(2);
    expect(parseVercelUsage(JSON.stringify({ ...row, Tags: {} }))).toEqual([]);
    expect(() => parseVercelUsage('not json')).toThrow();
  });
});
