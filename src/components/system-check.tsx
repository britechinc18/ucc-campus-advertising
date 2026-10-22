'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatUsage, type SystemReport, type UsageSection } from '@/lib/monitoring';
import { ErrorMessage, Loading } from './ui';
import { BudgetReference } from './budget-reference';
function UsageBlock({ title, section }: { title: string; section: UsageSection }) {
  return (
    <section className="panel usage-block">
      <div className="section-head">
        <h2>{title}</h2>
        <span className={`badge ${section.state === 'ready' ? '' : 'usage-state-unavailable'}`}>
          {section.state === 'ready'
            ? 'Connected'
            : section.state === 'not_connected'
              ? 'Not connected'
              : 'Unavailable'}
        </span>
      </div>
      <p className="helper">{section.message}</p>
      <dl className="usage-metrics">
        {section.metrics.map((m, i) => {
          const percent =
            m.value !== null && m.limit && m.limit > 0 ? (m.value / m.limit) * 100 : null;
          return (
            <div key={`${m.label}:${i}`}>
              <dt>{m.label}</dt>
              <dd>
                {formatUsage(m.value, m.unit)}
                {m.limit ? <small> of {formatUsage(m.limit, m.unit)}</small> : null}
              </dd>
              {percent !== null ? (
                <>
                  <progress
                    max={100}
                    value={Math.min(100, percent)}
                    aria-label={`${m.label} quota used`}
                  />
                  <p className={percent >= 80 ? 'usage-warning' : 'helper'}>
                    {percent.toFixed(1)}% of configured quota
                    {percent >= 80 ? ' — approaching or above the ceiling' : ''}
                  </p>
                </>
              ) : null}
              {m.note ? <p className="helper">{m.note}</p> : null}
            </div>
          );
        })}
      </dl>
    </section>
  );
}
export function SystemCheck() {
  const [report, setReport] = useState<SystemReport | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      setReport(await api<SystemReport>('admin/system'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not check the system.');
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>System check</h1>
          <p>Database, image storage and hosting usage in one place.</p>
        </div>
        <button className="btn secondary" disabled={busy} onClick={() => void load()}>
          {busy ? 'Checking…' : 'Refresh status'}
        </button>
      </div>
      {error ? <ErrorMessage message={error} /> : null}
      {busy && !report ? <Loading label="Checking system usage…" /> : null}
      {report ? (
        <>
          <p className="meta" role="status">
            Checked {new Date(report.checkedAt).toLocaleString('en-GH')}. Results are cached for up
            to five minutes to reduce monitoring costs.
          </p>
          <div className="system-grid">
            <UsageBlock title="Database" section={report.database} />
            <UsageBlock title="Image storage" section={report.images} />
            <UsageBlock title="Neon project usage" section={report.neon} />
            <UsageBlock title="Vercel hosting usage" section={report.vercel} />
          </div>
          <BudgetReference />
          <section className="panel admin-block system-information">
            <h2>Understand your usage</h2>
            <p>
              Uploaded photos are stored in the configured Neon object bucket. Vercel hosts the
              website and serves requests; image requests can also consume Vercel transfer and
              function usage. These are separate measurements.
            </p>
            <p>
              Database size and tracked image size are not invoice totals. Unknown allowances are
              shown as unavailable, never as unlimited or zero. This page does not change your plan
              or buy additional capacity.
            </p>
            <p className="meta">
              Runtime: {report.runtime.environment}
              {report.runtime.commit ? ` · Commit ${report.runtime.commit}` : ''}
            </p>
          </section>
          {report.neon.state !== 'ready' || report.vercel.state !== 'ready' ? (
            <section className="panel admin-block system-information">
              <h2>Connect provider usage</h2>
              <p>
                Live database and storage checks use the existing application connection. Provider
                transfer, compute and billing figures require separate server-side API access.
              </p>
              <p>
                Configure <code>NEON_MONITORING_API_KEY</code> and{' '}
                <code>VERCEL_MONITORING_TOKEN</code> in Vercel’s environment settings with access to
                this project and billing usage. Never paste credentials into this page or a public
                advert. Some metrics require provider plan support. The scoped Observability API
                currently requires Observability Plus on Pro/Enterprise; a monitoring token does not
                unlock it on Hobby.
              </p>
              <p>
                The allowance table uses verified official plan documentation. These project
                counters do not establish remaining shared balances or team-wide credits; provider
                usage can lag by minutes or hours.
              </p>
            </section>
          ) : null}
        </>
      ) : null}
    </>
  );
}
