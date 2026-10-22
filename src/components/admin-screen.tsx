'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  priceText,
  dateText,
  stateLabel,
  type AdvertContent,
  type Revision,
  type BusinessProfile,
} from '@/lib/market';
import { Dialog, ErrorMessage, Loading, EmptyState, MediaImage } from './ui';
import { Icon } from './icon';
interface Row {
  id: string;
  [key: string]: unknown;
  data?: AdvertContent;
  revisions?: Revision[];
  reason?: string;
  state?: string;
  status?: string;
  advert_id?: string;
  advertiser_id?: string;
  advertiser_name?: string;
  name?: string;
  slug?: string;
  pending?: BusinessProfile;
  approved?: BusinessProfile;
  created_at?: string;
  submitted_at?: string;
  action?: string;
  detail?: unknown;
  possible_duplicate?: boolean;
}
interface Field {
  key: string;
  label: string;
  type?: string;
  value?: string;
  required?: boolean;
  readOnly?: boolean;
  options?: { value: string; label: string }[];
  help?: string;
  min?: number;
  max?: number;
}
interface Action {
  title: string;
  path: string;
  method?: string;
  fields: Field[];
  description?: string;
  build?: (f: FormData) => unknown;
  after?: string;
}
const text = (value: unknown) => (value === null || value === undefined ? '' : String(value));
const labels: Record<string, string> = {
  overview: 'Campus at a glance',
  submissions: 'Pending queue',
  adverts: 'All adverts',
  reports: 'Reports',
  advertisers: 'Advertisers',
  businesses: 'Business profiles',
  categories: 'Categories',
  settings: 'Publishing settings',
  audit: 'Audit trail',
};
const reason: Field = {
  key: 'reason',
  label: 'Reason for the audit trail',
  type: 'textarea',
  required: true,
};
function FormField({ field: f }: { field: Field }) {
  return (
    <label className="form-group">
      <span className="form-label">{f.label}</span>
      {f.type === 'textarea' ? (
        <textarea
          className="field-input"
          name={f.key}
          required={f.required}
          minLength={f.required ? 3 : undefined}
          maxLength={f.key === 'description' ? 2000 : 1000}
          defaultValue={f.value}
        />
      ) : f.options ? (
        <select
          className="field-input"
          name={f.key}
          required={f.required}
          defaultValue={f.value ?? f.options[0]?.value}
        >
          {f.options.map((o) => (
            <option value={o.value} key={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="field-input"
          name={f.key}
          type={f.type ?? 'text'}
          defaultValue={f.value}
          required={f.required}
          readOnly={f.readOnly}
          min={f.min}
          max={f.max}
          step={f.type === 'number' ? 1 : undefined}
          maxLength={f.key === 'userId' || f.key === 'advertiserId' ? 36 : 200}
        />
      )}{' '}
      {f.help ? <span className="helper">{f.help}</span> : null}
    </label>
  );
}
function ActionForm({
  action,
  onClose,
  onDone,
}: {
  action: Action;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  return (
    <Dialog title={action.title} onClose={() => !busy && onClose()}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          setError('');
          try {
            const result = await api<Record<string, unknown>>(
              action.path,
              action.method ?? 'POST',
              action.build ? action.build(f) : Object.fromEntries(f),
            );
            if (action.path === 'admin/advertisers') {
              setSuccess(`Advertiser created. ID: ${result.id}`);
              onDone();
            } else {
              onDone();
              onClose();
              if (action.after) location.assign(action.after);
            }
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save this action.');
          } finally {
            setBusy(false);
          }
        }}
      >
        {action.description ? <p className="admin-description">{action.description}</p> : null}
        {action.fields.map((f) => (
          <FormField field={f} key={f.key} />
        ))}
        {error ? <ErrorMessage message={error} /> : null}
        {success ? (
          <p className="form-success" role="status">
            {success}
          </p>
        ) : null}
        <div className="form-actions">
          <button type="button" className="btn secondary" disabled={busy} onClick={onClose}>
            Close
          </button>
          <button className="btn" disabled={busy || !!success}>
            {busy ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
function useAdmin(path: string) {
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        setBusy(true);
        setError('');
      }
    });
    api<unknown>(path)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Could not load this page.');
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [path, version]);
  return { data, error, busy, reload };
}
export function AdminScreen({ resource, target }: { resource: string; target?: string }) {
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [reportStatus, setReportStatus] = useState('open');
  const [action, setAction] = useState<Action | null>(null);
  const endpoint = `admin/${resource}${target ? `/${target}` : ''}${target ? '' : `?offset=${offset}${['adverts', 'advertisers'].includes(resource) ? `&q=${encodeURIComponent(search)}` : ''}${resource === 'businesses' ? '&all=1' : ''}${resource === 'reports' ? `&status=${reportStatus}` : ''}`}`;
  const { data, error, busy, reload } = useAdmin(endpoint);
  const rows = Array.isArray(data) ? (data as Row[]) : [];
  const detail = data && !Array.isArray(data) ? (data as Row) : null;
  const moderation = (row: Row, decision: 'approve' | 'reject') =>
    setAction({
      title: decision === 'approve' ? 'Approve and publish advert' : 'Reject submission',
      path: `admin/submissions/${row.id}/${decision}`,
      fields: [reason],
      description:
        decision === 'approve'
          ? 'Approve only after reviewing all content and photos. New adverts publish for the configured duration; edits retain the existing expiry.'
          : 'Give the advertiser a specific, useful reason. An existing approved advert stays live when an edit is rejected.',
      after: '/admin/submissions',
    });
  const businessAction = (row: Row, decision: string) =>
    setAction({
      title: `${decision[0].toUpperCase() + decision.slice(1)} business profile`,
      path: `admin/businesses/${row.id}`,
      fields: [reason],
      build: (f) => ({ decision, reason: f.get('reason') }),
    });
  const suspendAdvert = (row: Row) =>
    setAction({
      title: 'Suspend advert',
      path: `admin/adverts/${row.id}/suspend`,
      description:
        'The advert will leave public browsing and any pending revisions will be cancelled.',
      fields: [reason],
    });
  const feature = (row: Row) =>
    setAction({
      title: row.endFeature ? 'End featured placement' : 'Schedule featured advert',
      path: `admin/adverts/${row.id}/feature`,
      description:
        'Only approved, unexpired and otherwise eligible adverts appear publicly during the scheduled window.',
      fields: row.endFeature
        ? []
        : [
            {
              key: 'position',
              label: 'Position',
              type: 'number',
              value: '0',
              min: 0,
              max: 100,
              required: true,
            },
            {
              key: 'startsAt',
              label: 'Starts (your local time)',
              type: 'datetime-local',
              required: true,
            },
            {
              key: 'endsAt',
              label: 'Ends (your local time)',
              type: 'datetime-local',
              required: true,
            },
          ],
      build: (f) =>
        row.endFeature
          ? {
              position: 0,
              startsAt: new Date(Date.now() - 1000).toISOString(),
              endsAt: new Date().toISOString(),
            }
          : {
              position: Number(f.get('position')),
              startsAt: new Date(text(f.get('startsAt'))).toISOString(),
              endsAt: new Date(text(f.get('endsAt'))).toISOString(),
            },
    });
  const category = (row?: Row) =>
    setAction({
      title: row ? 'Edit category' : 'Create category',
      path: 'admin/categories',
      fields: [
        { key: 'name', label: 'Name', value: text(row?.name), required: true },
        {
          key: 'slug',
          label: 'URL slug',
          value: text(row?.slug),
          readOnly: !!row,
          required: true,
          help: 'Lowercase letters, numbers and hyphens. Existing slugs cannot change.',
        },
        {
          key: 'active',
          label: 'Availability',
          value: row?.active === false ? 'false' : 'true',
          options: [
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' },
          ],
        },
      ],
      build: (f) => ({
        ...Object.fromEntries(f),
        ...(row ? { id: row.id } : {}),
        active: f.get('active') === 'true',
      }),
    });
  const createProfile = () =>
    setAction({
      title: 'Create assisted advertiser',
      path: 'admin/advertisers',
      description: 'Record consent only after obtaining it from this person or business.',
      fields: [
        { key: 'name', label: 'Advertiser name', required: true },
        {
          key: 'kind',
          label: 'Advertiser type',
          options: [
            { value: 'student', label: 'Student' },
            { value: 'business', label: 'Business' },
          ],
        },
        {
          key: 'consent',
          label: 'Consent confirmed?',
          required: true,
          options: [
            { value: '', label: 'Choose after obtaining consent' },
            { value: 'yes', label: 'Yes, consent obtained' },
          ],
        },
      ],
      build: (f) => ({
        name: f.get('name'),
        kind: f.get('kind'),
        consent: f.get('consent') === 'yes',
      }),
    });
  const createBusiness = () =>
    setAction({
      title: 'Create assisted business profile',
      path: 'admin/businesses',
      description: 'Select an existing business advertiser. The profile still requires review.',
      fields: [
        { key: 'advertiserId', label: 'Business advertiser UUID', required: true },
        { key: 'slug', label: 'Business URL slug', required: true },
        {
          key: 'description',
          label: 'Business description (20+ characters)',
          type: 'textarea',
          required: true,
        },
        { key: 'location', label: 'Campus location', required: true },
      ],
      build: (f) => ({
        advertiserId: f.get('advertiserId'),
        profile: {
          slug: f.get('slug'),
          description: f.get('description'),
          location: f.get('location'),
        },
      }),
    });
  const title = target
    ? resource === 'submissions'
      ? 'Review advert'
      : resource === 'advertisers'
        ? 'Advertiser details'
        : 'Manage advert'
    : labels[resource];
  return (
    <>
      {target ? (
        <div className="breadcrumbs">
          <Link className="text-link" href={`/admin/${resource}`}>
            <Icon name="back" />
            Back to {labels[resource]?.toLowerCase()}
          </Link>
        </div>
      ) : null}
      <div className="page-head">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>{title}</h1>
          <p>
            {resource === 'overview'
              ? 'Keep the marketplace useful, fair and safe.'
              : resource === 'submissions'
                ? 'Review the full content before making a decision.'
                : 'Use the controls below to manage the marketplace.'}
          </p>
        </div>
        {!target && resource === 'advertisers' ? (
          <button className="btn" onClick={createProfile}>
            <Icon name="plus" />
            Create advertiser
          </button>
        ) : !target && resource === 'categories' ? (
          <button className="btn" onClick={() => category()}>
            <Icon name="plus" />
            Add category
          </button>
        ) : !target && resource === 'businesses' ? (
          <button className="btn" onClick={createBusiness}>
            <Icon name="plus" />
            Create profile
          </button>
        ) : !target && ['overview', 'adverts'].includes(resource) ? (
          <Link className="btn" href="/admin/advertisers">
            Create assisted advert →
          </Link>
        ) : null}
      </div>
      {!target && ['adverts', 'advertisers'].includes(resource) ? (
        <form
          className="admin-search"
          onSubmit={(e) => {
            e.preventDefault();
            setOffset(0);
            setSearch(text(new FormData(e.currentTarget).get('q')));
          }}
        >
          <input
            className="field-input"
            name="q"
            aria-label="Search adverts by approved title, advertiser or state"
            placeholder="Search title, advertiser or state"
            maxLength={100}
          />
          <button className="btn secondary">Search</button>
        </form>
      ) : null}
      {!target && resource === 'reports' ? (
        <label className="admin-toolbar">
          Report status
          <select
            className="field-input"
            value={reportStatus}
            onChange={(e) => {
              setOffset(0);
              setReportStatus(e.target.value);
            }}
          >
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </label>
      ) : null}
      {error ? (
        <>
          <ErrorMessage message={error} />
          <button className="btn secondary" onClick={reload} style={{ marginTop: 16 }}>
            Retry
          </button>
        </>
      ) : busy ? (
        <Loading label="Loading administration…" />
      ) : resource === 'overview' && detail ? (
        <Overview data={detail} />
      ) : resource === 'settings' && detail ? (
        <Settings data={detail} onSaved={reload} />
      ) : target && detail ? (
        resource === 'submissions' ? (
          <Submission row={detail} onDecision={moderation} />
        ) : resource === 'advertisers' ? (
          <AdvertiserDetails row={detail} onAction={setAction} />
        ) : (
          <AdminAdvert row={detail} onSuspend={suspendAdvert} onFeature={feature} />
        )
      ) : (
        <>
          <div className="admin-toolbar">
            <p className="resource-count">
              {rows.length} {resource === 'submissions' ? 'pending submissions' : 'records'} on this
              page
            </p>
            <button className="btn secondary small" onClick={reload}>
              Refresh
            </button>
          </div>
          {rows.length ? (
            <div className="panel data-list">
              {rows.map((row) => (
                <article className="data-row" key={row.id}>
                  {row.data?.mediaIds?.[0] ? (
                    <div className="data-thumb">
                      <MediaImage id={row.data.mediaIds[0]} alt={row.data.title} />
                    </div>
                  ) : null}
                  <div className="data-row-content">
                    {resource === 'submissions' ? (
                      <>
                        <h3>{row.data?.title ?? 'Advert submission'}</h3>
                        <p>
                          {row.advertiser_name} ·{' '}
                          {row.purpose === 'edit'
                            ? 'Edit'
                            : row.purpose === 'renew'
                              ? 'Renewal'
                              : 'New advert'}{' '}
                          · {dateText(row.submitted_at)}
                        </p>
                        {row.possible_duplicate ? (
                          <span className="badge pending">
                            Possible duplicate — review carefully
                          </span>
                        ) : null}
                      </>
                    ) : resource === 'adverts' ? (
                      <>
                        <h3>{row.data?.title ?? 'Advert'}</h3>
                        <p>
                          {row.advertiser_name} · {stateLabel(row.state ?? '')} ·{' '}
                          {dateText(text(row.expires_at))}
                        </p>
                        {row.data ? <p>{priceText(row.data)}</p> : null}
                      </>
                    ) : resource === 'advertisers' ? (
                      <>
                        <h3>{row.name}</h3>
                        <p>
                          {text(row.kind)} · {row.suspended ? 'Suspended' : 'Active'} ·{' '}
                          {row.user_id ? 'Claimed account' : 'Unclaimed profile'}
                        </p>
                        <p>ID: {row.id}</p>
                      </>
                    ) : resource === 'reports' ? (
                      <>
                        <h3>
                          {text(row.reason)} · {text(row.status)}
                        </h3>
                        <p>{text(row.detail) || 'No additional details supplied.'}</p>
                        {row.resolution ? <p>Resolution: {text(row.resolution)}</p> : null}
                        <Link className="text-link" href={`/admin/adverts/${row.advert_id}`}>
                          Review advert evidence →
                        </Link>
                      </>
                    ) : resource === 'categories' ? (
                      <>
                        <h3>{row.name}</h3>
                        <p>
                          /{row.slug} · {row.active ? 'Active' : 'Inactive'}
                        </p>
                      </>
                    ) : resource === 'businesses' ? (
                      <>
                        <h3>{row.advertiser_name ?? row.slug}</h3>
                        <p>
                          /{row.slug} · {row.state}
                        </p>
                        <p>{row.pending?.description ?? row.approved?.description}</p>
                        <p>{row.pending?.location ?? row.approved?.location}</p>
                        {(row.pending?.logoMediaId ?? row.approved?.logoMediaId) ? (
                          <div className="data-thumb">
                            <MediaImage
                              id={row.pending?.logoMediaId ?? row.approved?.logoMediaId}
                              alt="Business logo"
                            />
                          </div>
                        ) : null}
                        {row.pending?.phone || row.pending?.whatsapp ? (
                          <p>
                            Contacts: {row.pending.phone} {row.pending.whatsapp} · Consent:{' '}
                            {row.pending.contactConsent ? 'Given' : 'Not given'}
                          </p>
                        ) : null}
                        {row.reason ? <p>Review: {row.reason}</p> : null}
                      </>
                    ) : (
                      <>
                        <h3>{text(row.action).replace(/_/g, ' ')}</h3>
                        <p>
                          {dateText(row.created_at)} · Target {text(row.target_id) || '—'}
                        </p>
                        <details>
                          <summary className="text-link">Audit details</summary>
                          <pre className="audit-json">{JSON.stringify(row.detail, null, 2)}</pre>
                        </details>
                      </>
                    )}
                  </div>
                  <div className="action-links">
                    {resource === 'submissions' ? (
                      <Link className="btn secondary small" href={`/admin/submissions/${row.id}`}>
                        Review
                      </Link>
                    ) : resource === 'adverts' ? (
                      <Link className="btn secondary small" href={`/admin/adverts/${row.id}`}>
                        Manage
                      </Link>
                    ) : resource === 'advertisers' ? (
                      <>
                        <Link className="btn secondary small" href={`/admin/advertisers/${row.id}`}>
                          Details
                        </Link>
                        <Link className="btn secondary small" href={`/post?advertiserId=${row.id}`}>
                          Post for advertiser
                        </Link>
                      </>
                    ) : resource === 'reports' && row.status === 'open' ? (
                      <>
                        <button
                          className="btn secondary small"
                          onClick={() =>
                            setAction({
                              title: 'Resolve report',
                              path: `admin/reports/${row.id}`,
                              method: 'PATCH',
                              fields: [{ ...reason, key: 'resolution', label: 'Resolution' }],
                              build: (f) => ({
                                status: 'resolved',
                                resolution: f.get('resolution'),
                              }),
                            })
                          }
                        >
                          Resolve
                        </button>
                        <button
                          className="btn secondary small"
                          onClick={() =>
                            setAction({
                              title: 'Dismiss report',
                              path: `admin/reports/${row.id}`,
                              method: 'PATCH',
                              fields: [
                                { ...reason, key: 'resolution', label: 'Reason for dismissal' },
                              ],
                              build: (f) => ({
                                status: 'dismissed',
                                resolution: f.get('resolution'),
                              }),
                            })
                          }
                        >
                          Dismiss
                        </button>
                      </>
                    ) : resource === 'categories' ? (
                      <button className="btn secondary small" onClick={() => category(row)}>
                        Edit
                      </button>
                    ) : resource === 'businesses' ? (
                      <>
                        {row.pending ? (
                          <>
                            <button
                              className="btn secondary small"
                              onClick={() => businessAction(row, 'approve')}
                            >
                              Approve
                            </button>
                            <button
                              className="btn secondary small"
                              onClick={() => businessAction(row, 'reject')}
                            >
                              Reject
                            </button>
                          </>
                        ) : null}
                        {row.approved ? (
                          <button
                            className="btn secondary small"
                            onClick={() => businessAction(row, 'suspend')}
                          >
                            Suspend
                          </button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="All clear here."
              message="No records match this view. New activity will appear as the marketplace grows."
              action={false}
            />
          )}{' '}
          {!['categories'].includes(resource) ? (
            <div className="form-actions">
              <button
                className="btn secondary"
                disabled={offset === 0}
                onClick={() => setOffset((v) => Math.max(0, v - 50))}
              >
                Previous
              </button>
              <button
                className="btn secondary"
                disabled={rows.length < 50}
                onClick={() => setOffset((v) => v + 50)}
              >
                Next page
              </button>
            </div>
          ) : null}
        </>
      )}
      {action ? (
        <ActionForm
          key={action.title + action.path}
          action={action}
          onClose={() => setAction(null)}
          onDone={reload}
        />
      ) : null}
    </>
  );
}
function Overview({ data }: { data: Row }) {
  const counts = data.counts as Record<string, number>;
  const recent = data.recent as Row[];
  return (
    <>
      <div className="stats">
        {[
          ['Live adverts', 'live'],
          ['Pending review', 'pending'],
          ['Open reports', 'reports'],
          ['New advertisers this week', 'new_advertisers'],
        ].map(([label, key]) => (
          <div className="stat" key={key}>
            <span>{label}</span>
            <strong>{counts[key] ?? 0}</strong>
          </div>
        ))}
      </div>
      <div className="admin-bottom">
        <section className="panel">
          <h2>Ready for review</h2>
          <p className="admin-description" style={{ marginTop: 12 }}>
            Review submissions and reports to keep the marketplace useful.
          </p>
          <div className="form-actions">
            <Link className="btn" href="/admin/submissions">
              Pending queue →
            </Link>
            <Link className="btn secondary" href="/admin/reports">
              Open reports →
            </Link>
          </div>
        </section>
        <section className="panel">
          <h2>Recent activity</h2>
          {recent.length ? (
            recent.map((r) => (
              <div className="activity" key={r.id}>
                <span className="activity-dot" />
                <div>
                  {text(r.action).replace(/_/g, ' ')}
                  <p>{dateText(r.created_at)}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="helper">No recorded activity yet.</p>
          )}
        </section>
      </div>
    </>
  );
}
function Submission({
  row,
  onDecision,
}: {
  row: Row;
  onDecision: (row: Row, d: 'approve' | 'reject') => void;
}) {
  const d = row.data;
  if (!d) return <ErrorMessage message="This submission has no content." />;
  return (
    <div className="review-layout">
      <article className="panel review-advert">
        <div className="admin-review-photos">
          {d.mediaIds.map((id) => (
            <a
              key={id}
              href={`/api/v1/media/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open full submitted photograph"
            >
              <MediaImage id={id} alt={d.title} />
            </a>
          ))}
        </div>
        {row.possible_duplicate ? (
          <div className="inline-notice">
            Possible matching content from another advertiser. Review this advisory flag before
            deciding.
          </div>
        ) : null}
        <p className="eyebrow">
          {text(row.purpose)} · {row.status}
        </p>
        <h2>{d.title}</h2>
        <p className="price">{priceText(d)}</p>
        <div className="attributes">
          <span className="chip">{d.kind}</span>
          <span className="chip">{d.condition}</span>
          <span className="chip">{d.location}</span>
        </div>
        <div className="description">
          <h2>Description</h2>
          <p className="admin-description">{d.description}</p>
        </div>
        <div className="summary-line">
          <span>Phone</span>
          <strong>{d.phone ?? 'Not supplied'}</strong>
        </div>
        <div className="summary-line">
          <span>WhatsApp</span>
          <strong>{d.whatsapp ?? 'Not supplied'}</strong>
        </div>
        <div className="summary-line">
          <span>Contact consent</span>
          <strong>{d.contactConsent ? 'Given' : 'Missing'}</strong>
        </div>
      </article>
      <aside className="panel review-decision">
        <h2>Moderation decision</h2>
        <p>Review all photos and the complete content before approving.</p>
        <div className="seller">
          <div>
            <h3>{row.advertiser_name}</h3>
            <p>{text(row.advertiser_kind)} advertiser</p>
          </div>
        </div>
        <Link className="text-link" href={`/admin/advertisers/${row.advertiser_id}`}>
          Advertiser history →
        </Link>
        <Link className="text-link" href={`/admin/adverts/${row.advert_id}`}>
          Full advert history →
        </Link>
        {row.status === 'pending' ? (
          <>
            <button className="btn" onClick={() => onDecision(row, 'approve')}>
              Approve advert
            </button>
            <button className="btn danger" onClick={() => onDecision(row, 'reject')}>
              Reject with a reason
            </button>
          </>
        ) : (
          <p className="inline-notice">This revision is already {row.status}.</p>
        )}
        <p className="helper" style={{ marginTop: 16 }}>
          Decisions require a reason and are recorded in the audit trail.
        </p>
      </aside>
    </div>
  );
}
function AdminAdvert({
  row,
  onSuspend,
  onFeature,
}: {
  row: Row;
  onSuspend: (r: Row) => void;
  onFeature: (r: Row) => void;
}) {
  const revisions = row.revisions ?? [];
  const d = revisions[0]?.data;
  return (
    <>
      <div className="form-actions">
        <span className="badge">{stateLabel(row.state ?? '')}</span>
        <Link
          href={`/post?edit=${row.id}${row.state !== 'published' && row.approved_revision_id ? '&renew=1' : ''}`}
          className="btn secondary"
        >
          Edit / prepare advert
        </Link>
        <button className="btn secondary" onClick={() => onFeature(row)}>
          Schedule feature
        </button>
        <button className="btn secondary" onClick={() => onFeature({ ...row, endFeature: true })}>
          End feature now
        </button>
        {row.state !== 'suspended' ? (
          <button className="btn danger" onClick={() => onSuspend(row)}>
            Suspend advert
          </button>
        ) : null}
        <Link className="text-link" href={`/admin/advertisers/${row.advertiser_id}`}>
          Advertiser details →
        </Link>
      </div>
      {d ? (
        <article className="panel review-advert admin-block">
          <h2>{d.title}</h2>
          <p className="price">{priceText(d)}</p>
          <div className="admin-review-photos" style={{ marginTop: 20 }}>
            {d.mediaIds.map((id) => (
              <MediaImage key={id} id={id} alt={d.title} />
            ))}
          </div>
          <p className="admin-description">{d.description}</p>
          <p className="helper">
            {d.location} · {d.phone} {d.whatsapp}
          </p>
        </article>
      ) : null}
      <section className="admin-block">
        <h2>Revision history</h2>
        {revisions.map((r) => (
          <details className="revision-row" key={r.id}>
            <summary>
              {r.data.title} · {r.purpose} · {r.status} · {dateText(r.created_at)}
            </summary>
            <p>{r.reason ?? 'No decision reason yet.'}</p>
            <p className="admin-description">{r.data.description}</p>
            {r.status === 'pending' ? (
              <Link className="text-link" href={`/admin/submissions/${r.id}`}>
                Review this submission →
              </Link>
            ) : null}
          </details>
        ))}
      </section>
    </>
  );
}
function AdvertiserDetails({ row, onAction }: { row: Row; onAction: (a: Action) => void }) {
  const p = row.profile as Row;
  const history = row.history as Row[];
  const adverts = row.adverts as Row[];
  return (
    <>
      <section className="panel form-panel">
        <h2>{p.name}</h2>
        <p className="muted">
          {text(p.kind)} · {p.suspended ? 'Suspended' : 'Active'} ·{' '}
          {p.user_id ? 'Claimed' : 'Unclaimed'}
        </p>
        <p className="helper">Advertiser ID: {p.id}</p>
        <div className="form-actions">
          <Link className="btn" href={`/post?advertiserId=${p.id}`}>
            Post for this advertiser
          </Link>
          <button
            className="btn secondary"
            onClick={() =>
              onAction({
                title: p.suspended ? 'Restore advertiser' : 'Suspend advertiser',
                path: `admin/advertisers/${p.id}`,
                method: 'PATCH',
                fields: [reason],
                description: p.suspended
                  ? 'Restores advertiser eligibility. Suspended adverts are not automatically restored.'
                  : 'This hides the advertiser’s public listings and blocks posting.',
                build: (f) => ({ suspended: !p.suspended, reason: f.get('reason') }),
              })
            }
          >
            {p.suspended ? 'Restore advertiser' : 'Suspend advertiser'}
          </button>
          {!p.user_id ? (
            <button
              className="btn secondary"
              onClick={() =>
                onAction({
                  title: 'Assign verified account',
                  path: `admin/advertisers/${p.id}/claim`,
                  description:
                    'Manually verify contact ownership and consent before claiming. Use an existing verified account UUID. This cannot merge profiles.',
                  fields: [
                    { key: 'userId', label: 'Verified account UUID', required: true },
                    {
                      key: 'evidenceReference',
                      label: 'Manual verification evidence reference',
                      required: true,
                    },
                    {
                      key: 'confirm',
                      label: 'Ownership and consent verified?',
                      required: true,
                      options: [
                        { value: '', label: 'Choose after completing verification' },
                        { value: 'yes', label: 'Yes, both verified' },
                      ],
                    },
                  ],
                  build: (f) => ({
                    userId: f.get('userId'),
                    evidenceReference: f.get('evidenceReference'),
                    contactVerified: f.get('confirm') === 'yes',
                    consent: f.get('confirm') === 'yes',
                  }),
                })
              }
            >
              Assign verified account
            </button>
          ) : null}
        </div>
      </section>
      <section className="admin-block">
        <h2>Recent adverts</h2>
        <div className="panel data-list">
          {adverts.map((a) => (
            <div className="data-row" key={a.id}>
              <div>
                <h3>{a.data?.title ?? 'Unpublished advert'}</h3>
                <p>{stateLabel(a.state ?? '')}</p>
              </div>
              <Link className="text-link" href={`/admin/adverts/${a.id}`}>
                Manage →
              </Link>
            </div>
          ))}
        </div>
      </section>
      <section className="admin-block">
        <h2>Moderation history</h2>
        {history.length ? (
          history.map((h) => (
            <div className="revision-row" key={h.id}>
              <strong>{h.status}</strong>
              <p>
                {h.reason} · {dateText(text(h.reviewed_at))}
              </p>
            </div>
          ))
        ) : (
          <p className="muted">No previous review decisions.</p>
        )}
      </section>
    </>
  );
}
function Settings({ data, onSaved }: { data: Row; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fields: [string, string, number, number][] = [
    ['max_active', 'Maximum active adverts', 1, 100],
    ['daily_limit', 'New submissions per day', 1, 100],
    ['duration_days', 'Advert duration (days)', 1, 365],
    ['max_images', 'Photos per advert', 1, 5],
    ['max_image_bytes', 'Maximum image size (bytes)', 1, 5242880],
  ];
  return (
    <form
      className="panel form-panel admin-settings"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        setError('');
        try {
          await api('admin/settings', 'PATCH', {
            expectedVersion: Number(data.version),
            maxActive: Number(f.get('max_active')),
            dailyLimit: Number(f.get('daily_limit')),
            durationDays: Number(f.get('duration_days')),
            maxImages: Number(f.get('max_images')),
            maxImageBytes: Number(f.get('max_image_bytes')),
            autoPublish: false,
            reason: f.get('reason'),
          });
          setSuccess(true);
          onSaved();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Settings could not be saved.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Posting limits</h2>
      <p className="helper">
        All adverts require review. Automatic publishing is currently disabled.
      </p>
      {fields.map(([key, label, min, max]) => (
        <label className="form-group" key={key}>
          <span className="form-label">{label}</span>
          <input
            className="field-input"
            type="number"
            name={key}
            required
            min={min}
            max={max}
            step={1}
            defaultValue={text(data[key])}
          />
        </label>
      ))}
      <FormField field={reason} />
      {error ? <ErrorMessage message={error} /> : null}
      {success ? (
        <p className="form-success" role="status">
          Settings saved.
        </p>
      ) : null}
      <div className="form-actions">
        <button className="btn" disabled={busy}>
          {busy ? 'Saving…' : 'Save settings'}
        </button>
        <button type="button" className="btn secondary" onClick={onSaved} disabled={busy}>
          Reload latest values
        </button>
      </div>
      <p className="helper">
        Version {text(data.version)}. If another administrator saves first, reload and review their
        values before saving.
      </p>
    </form>
  );
}
