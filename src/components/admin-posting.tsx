'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ErrorMessage, Loading } from './ui';
type Advertiser = { id: string; name: string; kind: string; suspended: boolean };
export function AdminPosting() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Advertiser[]>([]);
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api<Advertiser[]>(`admin/advertisers?q=${encodeURIComponent(query)}&offset=${offset}`)
      .then((rows) => {
        if (active) {
          setProfiles(rows);
          setSelected('');
        }
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Could not load advertisers.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query, offset, version]);
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>Post for someone</h1>
          <p>
            Use their advertiser name and public contact details. They do not need a MedStash
            account.
          </p>
        </div>
        <Link className="btn secondary" href="/post">
          Post in my own name
        </Link>
      </div>
      <p className="inline-notice">
        Admin submissions have no daily or active-advert limit. All adverts still follow the review
        process.
      </p>
      {error ? <ErrorMessage message={error} /> : null}
      <div className="admin-post-grid">
        <section className="panel">
          <h2>Existing advertiser</h2>
          <p>Find the person or business you are posting for.</p>
          <form
            className="admin-search"
            onSubmit={(e) => {
              e.preventDefault();
              setLoading(true);
              setError('');
              setOffset(0);
              setQuery(String(new FormData(e.currentTarget).get('q') ?? '').trim());
              setVersion((n) => n + 1);
            }}
          >
            <input
              className="field-input"
              name="q"
              aria-label="Find advertiser by name"
              maxLength={100}
            />
            <button className="btn secondary">Find</button>
          </form>
          {loading ? (
            <Loading label="Loading advertisers…" />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (selected) router.push(`/post?advertiserId=${selected}`);
              }}
            >
              <label className="form-group">
                <span className="form-label">Advertiser</span>
                <select
                  className="field-input"
                  required
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  <option value="">Choose an advertiser</option>
                  {profiles
                    .filter((p) => !p.suspended)
                    .map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name} · {p.kind}
                      </option>
                    ))}
                </select>
              </label>
              {!profiles.length ? <p>No advertisers matched. Create one below.</p> : null}
              <button className="btn" disabled={!selected}>
                Continue to advert
              </button>
              {profiles.find((p) => p.id === selected)?.kind === 'business' ? (
                <Link className="btn secondary" href={`/admin/businesses/${selected}/profile`}>
                  Manage business profile
                </Link>
              ) : null}
            </form>
          )}
          <div className="form-actions">
            <button
              className="btn quiet"
              disabled={loading || offset === 0}
              onClick={() => {
                setLoading(true);
                setOffset((n) => Math.max(0, n - 50));
              }}
            >
              Previous
            </button>
            <button
              className="btn quiet"
              disabled={loading || profiles.length < 50}
              onClick={() => {
                setLoading(true);
                setOffset((n) => n + 50);
              }}
            >
              Next
            </button>
          </div>
        </section>
        <section className="panel">
          <h2>New advertiser</h2>
          <p>Create an assisted profile, then add their advert and contact details.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              const data = new FormData(e.currentTarget);
              try {
                const p = await api<{ id: string }>('admin/advertisers', 'POST', {
                  name: data.get('name'),
                  kind: data.get('kind'),
                  consent: true,
                });
                router.push(
                  data.get('kind') === 'business'
                    ? `/admin/businesses/${p.id}/profile`
                    : `/post?advertiserId=${p.id}`,
                );
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not create advertiser.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="form-group">
              <span className="form-label">Public advertiser name</span>
              <input
                className="field-input"
                name="name"
                minLength={2}
                maxLength={100}
                required
                autoComplete="organization"
              />
            </label>
            <label className="form-group">
              <span className="form-label">Advertiser type</span>
              <select className="field-input" name="kind">
                <option value="student">Student</option>
                <option value="business">Business</option>
              </select>
            </label>
            <label className="check">
              <input type="checkbox" required />
              <span>
                I have their permission to create this profile and publish their advert and contact
                details.
              </span>
            </label>
            <button className="btn" disabled={busy}>
              {busy ? 'Creating…' : 'Create advertiser & continue'}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
