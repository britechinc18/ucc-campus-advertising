'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { isFlyer, kindName, safeExternalUrl } from '@/lib/campus';
import {
  effectiveState,
  stateLabel,
  priceText,
  dateText,
  type OwnAdvert,
  type Account,
} from '@/lib/market';
import { MediaImage, Dialog, ErrorMessage, EmptyState } from './ui';
import { Icon } from './icon';
export interface OwnerPage {
  items: OwnAdvert[];
  nextOffset: number | null;
  counts: { state: string; count: number }[];
  pendingCount: number;
}
export function OwnerDashboard({
  page,
  account,
  offset,
  state,
  submitted,
  identity = '',
  userId = '',
}: {
  page: OwnerPage;
  account: Account;
  offset: number;
  state: string;
  submitted: boolean;
  identity?: string;
  userId?: string;
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<{ key: string; title: string; href: string }[]>([]);
  const [closing, setClosing] = useState<OwnAdvert | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.resolve().then(() => {
      const prefix = `ucc-draft-v1:${userId}:`;
      const found: typeof drafts = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)!;
          if (!key.startsWith(prefix)) continue;
          const value = JSON.parse(localStorage.getItem(key)!);
          if (!value.title?.trim()) continue;
          const id = key.slice(prefix.length);
          const profile = account.profiles.some((p) => p.id === id);
          found.push({
            key,
            title: value.title,
            href: `/post?${profile ? 'advertiserId' : 'edit'}=${encodeURIComponent(id)}`,
          });
        }
      } catch {}
      setDrafts(found);
    });
  }, [userId, account.profiles]);
  const queryString = (status: string) =>
    `/my-adverts?${new URLSearchParams({ ...(status ? { state: status } : {}), ...(identity ? { identity } : {}) })}`;
  return (
    <div className="owner-dashboard-clean">
      <header className="page-head">
        <div>
          <h1>My Ads</h1>
        </div>
        <Link className="btn" href={`/post${identity ? `?advertiserId=${identity}` : ''}`}>
          <Icon name="plus" />
          Post an advert
        </Link>
      </header>
      {submitted ? (
        <p className="form-success" role="status">
          {account.settings.auto_publish
            ? 'Your advert is live.'
            : 'Your advert was submitted for approval.'}
        </p>
      ) : null}
      {account.profiles.some((p) => p.kind === 'business') ? (
        <nav className="owner-identity-filter" aria-label="Selling identity">
          <Link href="/my-adverts" aria-current={!identity ? 'page' : undefined}>
            All profiles
          </Link>
          {account.profiles.map((p) => (
            <Link
              key={p.id}
              href={`/my-adverts?identity=${p.id}`}
              aria-current={identity === p.id ? 'page' : undefined}
            >
              {p.kind === 'business' ? 'Business' : 'Personal'}
            </Link>
          ))}
        </nav>
      ) : null}
      {drafts.length && (!state || state === 'draft') ? (
        <section className="device-drafts" aria-label="Drafts on this device">
          <h2>Saved on this device</h2>
          {drafts.map((d) => (
            <div key={d.key}>
              <strong>{d.title}</strong>
              <Link
                className="text-link"
                href={`${d.href}${d.href.includes('?') ? '&' : '?'}resume=1`}
              >
                Continue draft <Icon name="arrow" />
              </Link>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  localStorage.removeItem(d.key);
                  setDrafts((old) => old.filter((x) => x.key !== d.key));
                }}
              >
                Discard
              </button>
            </div>
          ))}
        </section>
      ) : null}
      <nav className="tabs owner-status-tabs" aria-label="Advert status">
        {[
          ['', 'All'],
          ['published', 'Live'],
          ['draft', 'Drafts'],
          ...(page.pendingCount ? [['pending', 'Pending']] : []),
          ['closed', 'Closed'],
        ].map(([key, label]) => (
          <Link key={key} href={queryString(key)} aria-current={state === key ? 'page' : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      {error ? <ErrorMessage message={error} /> : null}
      <section className="owner-advert-list">
        {page.items.length ? (
          page.items.map((a) => {
            const d = a.revisions[0]?.data;
            const status = effectiveState(a);
            const pending = a.revisions.some((r) => r.status === 'pending');
            return (
              <article className="advert-row" key={a.id}>
                <div className={`row-photo ${d && isFlyer(d.kind) ? 'flyer-photo' : ''}`}>
                  <MediaImage id={d?.mediaIds[0]} alt={d?.title ?? 'Advert'} />
                </div>
                <div className="row-main">
                  <h3>{d?.title ?? 'Untitled advert'}</h3>
                  {d ? <p className="price">{priceText(d)}</p> : null}
                  <p className="meta">
                    {account.profiles.length > 1 ? `${a.advertiser_name} · ` : ''}
                    {status === 'published'
                      ? `Expires ${dateText(a.expires_at)}`
                      : `Updated ${dateText(a.revisions[0]?.created_at)}`}
                  </p>
                </div>
                <span className={`badge ${status === 'published' ? 'live' : ''}`}>
                  {a.privacy_hidden
                    ? 'Hidden: contact privacy'
                    : pending
                      ? 'Pending review'
                      : stateLabel(status, d?.kind)}
                </span>
                <div className="owner-row-actions">
                  {!pending &&
                  ['draft', 'published', 'rejected'].includes(status) &&
                  !a.profile_closed ? (
                    <Link className="btn secondary small" href={`/post?edit=${a.id}`}>
                      {status === 'draft' ? 'Continue draft' : 'Edit'}
                    </Link>
                  ) : null}
                  {status === 'published' && !a.profile_closed ? (
                    <button className="btn secondary small" onClick={() => setClosing(a)}>
                      Mark as{' '}
                      {d?.kind === 'product'
                        ? 'sold'
                        : d?.kind === 'wanted'
                          ? 'found'
                          : 'completed'}
                    </button>
                  ) : null}
                  <Link className="text-link" href={`/my-adverts/${a.id}`}>
                    Manage <Icon name="chevron" />
                  </Link>
                </div>
              </article>
            );
          })
        ) : (
          <EmptyState
            title="No adverts here yet."
            message="Your adverts will appear here."
            action={false}
          />
        )}
      </section>
      <div className="form-actions">
        {offset > 0 ? (
          <Link
            className="btn secondary"
            href={`${queryString(state)}&offset=${Math.max(0, offset - 20)}`}
          >
            Previous
          </Link>
        ) : null}
        {page.nextOffset !== null ? (
          <Link className="btn secondary" href={`${queryString(state)}&offset=${page.nextOffset}`}>
            Next adverts
          </Link>
        ) : null}
      </div>
      {closing ? (
        <Dialog title="Close this advert?" onClose={() => !busy && setClosing(null)}>
          <p>This will move the advert out of live listings.</p>
          <button
            className="btn"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api(`me/adverts/${closing.id}/fulfill`, 'POST');
                setClosing(null);
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not update advert.');
              } finally {
                setBusy(false);
              }
            }}
          >
            Confirm
          </button>
        </Dialog>
      ) : null}
    </div>
  );
}
export function OwnerDetail({ advert }: { advert: OwnAdvert }) {
  const [state, setState] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const d = advert.revisions[0]?.data;
  const status = effectiveState(advert);
  const pending = advert.revisions.some((r) => r.status === 'pending');
  const inactive = !!advert.approved_revision_id && status !== 'published';
  const fulfilled =
    d?.kind === 'wanted'
      ? 'found'
      : d && (d.kind === 'service' || isFlyer(d.kind))
        ? 'completed'
        : 'sold';
  async function act() {
    if (!state) return;
    setBusy(true);
    setError('');
    try {
      await api(`me/adverts/${advert.id}/${state}`, 'POST');
      setState(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update advert.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="breadcrumbs">
        <Link href="/my-adverts" className="text-link">
          <Icon name="back" />
          Back to My Adverts
        </Link>
      </div>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            {advert.profile_closed
              ? 'Closed business'
              : advert.profile_deactivated
                ? 'Business inactive'
                : advert.privacy_hidden
                  ? 'Hidden: contact privacy'
                  : stateLabel(status, d?.kind)}
          </p>
          <h1>{d?.title ?? 'Your advert'}</h1>
          {d ? (
            <p>
              {priceText(d)} · {d.location}
            </p>
          ) : null}
        </div>
      </div>
      {advert.privacy_hidden ? (
        <p className="inline-notice">
          This advert is hidden because its linked public contact was removed. Restore a visible
          contact in your profile or customize it here, then submit this advert for review. Its
          original expiry stays unchanged.
        </p>
      ) : null}
      {advert.profile_closed ? (
        <p className="inline-notice">
          This business is closed. This advert is retained as history and cannot be renewed under
          the closed identity.
        </p>
      ) : null}
      {advert.profile_deactivated && !advert.profile_closed ? (
        <p className="inline-notice">
          This business is inactive. Manage its availability from My Business before submitting
          adverts.
        </p>
      ) : null}
      {pending ? (
        <div className="inline-notice">
          <Icon name="clock" />
          <p>
            {status === 'published'
              ? 'Your current approved advert remains live while these changes are reviewed.'
              : 'Your advert is awaiting approval.'}{' '}
            Withdraw the submission or wait for review before editing.
          </p>
        </div>
      ) : null}
      {advert.revisions[0]?.status === 'rejected' ? (
        <ErrorMessage message={`Changes requested: ${advert.revisions[0].reason}`} />
      ) : null}
      <div className="form-actions">
        {!advert.profile_closed && !pending && status !== 'suspended' ? (
          <Link className="btn" href={`/post?edit=${advert.id}${inactive ? '&renew=1' : ''}`}>
            {advert.privacy_hidden
              ? 'Review & restore'
              : inactive
                ? 'Prepare renewal'
                : 'Edit advert'}
          </Link>
        ) : null}
        {!advert.profile_closed && status === 'published' ? (
          <>
            {!advert.privacy_hidden && !advert.profile_deactivated ? (
              <Link className="btn secondary" href={`/adverts/${advert.id}`}>
                View live advert
              </Link>
            ) : null}
            <button className="btn secondary" onClick={() => setState('fulfill')}>
              Mark as {fulfilled}
            </button>
          </>
        ) : null}
        {!advert.profile_closed &&
        (!['withdrawn', 'fulfilled', 'suspended'].includes(status) || pending) ? (
          <button className="btn secondary" onClick={() => setState('withdraw')}>
            {pending ? 'Withdraw submission' : 'Withdraw advert'}
          </button>
        ) : null}
      </div>
      {d ? (
        <section className="panel owner-content">
          <div className={`owner-photos ${isFlyer(d.kind) ? 'flyer-photos' : ''}`}>
            {d.mediaIds.map((id) => (
              <MediaImage key={id} id={id} alt={d.title} />
            ))}
          </div>
          <p className="eyebrow">
            {kindName(d.kind)} · {isFlyer(d.kind) ? 'Campus 360' : 'Market'}
          </p>
          <h2>Description</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{d.description}</p>
          {d.details ? (
            <dl className="seller-metadata">
              {d.details.startsAt ? (
                <div>
                  <dt>Starts (Ghana time)</dt>
                  <dd>
                    {new Intl.DateTimeFormat('en-GH', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'Africa/Accra',
                    }).format(new Date(d.details.startsAt))}
                  </dd>
                </div>
              ) : null}
              {d.details.endsAt ? (
                <div>
                  <dt>Valid until (Ghana time)</dt>
                  <dd>
                    {new Intl.DateTimeFormat('en-GH', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'Africa/Accra',
                    }).format(new Date(d.details.endsAt))}
                  </dd>
                </div>
              ) : null}
              {d.details.offer ? (
                <div>
                  <dt>Offer</dt>
                  <dd>{d.details.offer}</dd>
                </div>
              ) : null}
              {safeExternalUrl(d.details.externalUrl) ? (
                <div>
                  <dt>External link</dt>
                  <dd>
                    <a
                      href={safeExternalUrl(d.details.externalUrl)!}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {d.details.externalUrl}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          <div className="summary-line">
            <span>Phone</span>
            <strong>{d.phone ?? 'Not published'}</strong>
          </div>
          <div className="summary-line">
            <span>WhatsApp</span>
            <strong>{d.whatsapp ?? 'Not published'}</strong>
          </div>
          <div className="summary-line">
            <span>Expiry</span>
            <strong>{dateText(advert.expires_at)}</strong>
          </div>
        </section>
      ) : null}
      <section className="section">
        <h2>Revision history</h2>
        {advert.revisions.map((r) => (
          <div className="revision-row" key={r.id}>
            <strong>
              {r.purpose === 'edit' ? 'Edit' : r.purpose === 'renew' ? 'Renewal' : 'Advert'} ·{' '}
              {r.status}
            </strong>
            <p>
              {dateText(r.created_at)}
              {r.reason ? ` · ${r.reason}` : ''}
            </p>
          </div>
        ))}
      </section>
      {state ? (
        <Dialog
          title={state === 'fulfill' ? `Mark as ${fulfilled}?` : 'Withdraw this advert?'}
          onClose={() => !busy && setState(null)}
        >
          <p>
            {state === 'fulfill'
              ? 'This removes the advert from public browsing. You can prepare a renewal later.'
              : 'This removes the advert from browsing and cancels outstanding drafts or submissions. Daily submission usage is not refunded.'}
          </p>
          {error ? <ErrorMessage message={error} /> : null}
          <div className="form-actions">
            <button className="btn secondary" disabled={busy} onClick={() => setState(null)}>
              Cancel
            </button>
            <button className="btn" disabled={busy} onClick={() => void act()}>
              {busy ? 'Updating…' : 'Confirm'}
            </button>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
