export interface UsageMetric {
  label: string;
  value: number | null;
  unit: string;
  limit?: number | null;
  note?: string;
}
export interface UsageSection {
  state: 'ready' | 'not_connected' | 'unavailable';
  message: string;
  metrics: UsageMetric[];
}
export interface SystemReport {
  checkedAt: string;
  database: UsageSection;
  images: UsageSection;
  neon: UsageSection;
  vercel: UsageSection;
  runtime: { environment: string; commit: string | null };
}
export function formatUsage(value: number | null, unit: string) {
  if (value === null) return 'Unavailable';
  if (unit === 'bytes') {
    const scale = value > 0 ? Math.min(4, Math.floor(Math.log(value) / Math.log(1024))) : 0;
    return `${(value / 1024 ** scale).toLocaleString('en-GH', { maximumFractionDigits: 2 })} ${['B', 'KiB', 'MiB', 'GiB', 'TiB'][scale]}`;
  }
  return `${value.toLocaleString('en-GH', { maximumFractionDigits: 2 })} ${unit}`.trim();
}
