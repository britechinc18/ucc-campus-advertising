'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { ProfileDefaults } from '@/lib/seller-profile';
import { Dialog, ErrorMessage, Loading, MediaImage } from './ui';
import { SocialProfiles } from './social-profiles';
type Review = {
  id: string;
  name: string;
  version: number;
  pending: ProfileDefaults;
  approved: ProfileDefaults | null;
  linked_count: number;
};
export function AdminProfileReviews() {
  const [data, setData] = useState<{
      personal: Review[];
      reactivations: { id: string; name: string }[];
    } | null>(null),
    [error, setError] = useState(''),
    [action, setAction] = useState<{
      id: string;
      name: string;
      version?: number;
      decision: string;
      reactivation?: boolean;
    } | null>(null),
    [busy, setBusy] = useState(false);
  const load = useCallback(
    () =>
      api<{ personal: Review[]; reactivations: { id: string; name: string }[] }>('admin/profiles')
        .then(setData)
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>Profile reviews</h1>
          <p>Review public identity changes and linked defaults before they go live.</p>
        </div>
      </div>
      {error ? <ErrorMessage message={error} /> : null}
      {!data ? (
        <Loading label="Loading profile reviews…" />
      ) : (
        <>
          <section className="admin-block">
            <h2>Personal profiles</h2>
            {!data.personal.length ? (
              <p>No personal profiles awaiting review.</p>
            ) : (
              data.personal.map((p) => (
                <article className="panel profile-review" key={p.id}>
                  <h3>{p.pending.name ?? p.name}</h3>
                  <p>
                    {p.linked_count} live adverts may use linked defaults. Advert-specific overrides
                    stay unchanged.
                  </p>
                  <div className="profile-review-columns">
                    <section>
                      <h4>Currently approved</h4>
                      <p>{p.approved?.name ?? 'No approved personal profile'}</p>
                      <p>{p.approved?.location}</p>
                      <p>
                        {p.approved?.phone} {p.approved?.whatsapp}
                      </p>
                      <p>{p.approved?.bio}</p>
                    </section>
                    <section>
                      <h4>Submitted changes</h4>
                      {p.pending.photoMediaId ? (
                        <div className="business-logo">
                          <MediaImage
                            id={p.pending.photoMediaId}
                            alt="Submitted profile photograph"
                          />
                        </div>
                      ) : null}
                      <p>{p.pending.location}</p>
                      <p>
                        {p.pending.phone} {p.pending.whatsapp}
                      </p>
                      <p>{p.pending.bio}</p>
                      <SocialProfiles socials={p.pending.socials} />
                      <p className="helper">
                        Hidden fields:{' '}
                        {Object.entries(p.pending.visibility ?? {})
                          .filter(([, v]) => !v)
                          .map(([k]) => k)
                          .join(', ') || 'None'}
                      </p>
                    </section>
                  </div>
                  <div className="form-actions">
                    {['approve', 'reject'].map((decision) => (
                      <button
                        className="btn secondary"
                        key={decision}
                        onClick={() =>
                          setAction({
                            id: p.id,
                            name: p.pending.name ?? p.name,
                            version: p.version,
                            decision,
                          })
                        }
                      >
                        {decision === 'approve' ? 'Approve profile' : 'Request changes'}
                      </button>
                    ))}
                    <Link href={`/admin/advertisers/${p.id}`} className="text-link">
                      Advertiser details →
                    </Link>
                  </div>
                </article>
              ))
            )}
          </section>
          <section className="admin-block">
            <h2>Business reactivations</h2>
            {!data.reactivations.length ? (
              <p>No reactivation requests.</p>
            ) : (
              data.reactivations.map((p) => (
                <article className="panel profile-review" key={p.id}>
                  <h3>{p.name}</h3>
                  <p>
                    Approval restores eligible, unexpired adverts. It does not renew adverts or
                    clear privacy holds.
                  </p>
                  <div className="form-actions">
                    {['approve', 'reject'].map((decision) => (
                      <button
                        className="btn secondary"
                        key={decision}
                        onClick={() => setAction({ ...p, decision, reactivation: true })}
                      >
                        {decision === 'approve' ? 'Approve reactivation' : 'Reject reactivation'}
                      </button>
                    ))}
                    <Link href={`/admin/advertisers/${p.id}`} className="text-link">
                      Review advertiser →
                    </Link>
                  </div>
                </article>
              ))
            )}
          </section>
        </>
      )}
      {action ? (
        <Dialog
          title={`${action.decision === 'approve' ? 'Approve' : 'Request changes'}: ${action.name}`}
          onClose={() => !busy && setAction(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                await api(
                  `admin/${action.reactivation ? 'reactivations' : 'personal'}/${action.id}`,
                  'POST',
                  {
                    decision: action.decision,
                    ...(!action.reactivation ? { version: action.version } : {}),
                    reason: new FormData(e.currentTarget).get('reason'),
                  },
                );
                setAction(null);
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not review profile.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="form-group">
              <span className="form-label">Reason for decision</span>
              <textarea
                name="reason"
                className="field-input"
                minLength={3}
                maxLength={1000}
                required
              />
            </label>
            {error ? <ErrorMessage message={error} /> : null}
            <button className="btn" disabled={busy}>
              Confirm decision
            </button>
          </form>
        </Dialog>
      ) : null}
    </>
  );
}
