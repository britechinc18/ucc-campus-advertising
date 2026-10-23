'use client';
import { useState } from 'react';
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
}: {
  page: OwnerPage;
  account: Account;
  offset: number;
  state: string;
  submitted: boolean;
  identity?: string;
}) {
  const count = (s: string) => page.counts.find((c) => c.state === s)?.count ?? 0;
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">YOUR CAMPUS CORNER</p>
          <h1>My adverts</h1>
          <p>Your items, services and Campus 360 adverts, all in one place.</p>
        </div>
      </div>
      <nav className="tabs" aria-label="Selling identity">
        <Link href="/my-adverts" aria-current={!identity ? 'page' : undefined}>
          All identities
        </Link>
        {account.profiles.map((p) => (
          <Link
            key={p.id}
            href={`/my-adverts?identity=${p.id}`}
            aria-current={identity === p.id ? 'page' : undefined}
          >
            {p.name} · {p.kind === 'business' ? 'Business' : 'Personal'}
          </Link>
        ))}
      </nav>
      <p className="helper">
        {!account.profiles.some((p) => p.kind === 'student') ? (
          <Link href="/onboarding?kind=student&next=/my-adverts">Add personal identity →</Link>
        ) : null}{' '}
        {!account.profiles.some((p) => p.kind === 'business') ? (
          <Link href="/onboarding?kind=business&next=/my-business">Add a business →</Link>
        ) : (
          <Link href="/my-business">Manage business →</Link>
        )}
      </p>
      {submitted ? (
        <p className="form-success" role="status">
          Your advert was submitted for approval. It will appear publicly after review.
        </p>
      ) : null}
      {(
        identity
          ? account.profiles.find((p) => p.id === identity)?.suspended
          : account.profiles.every((p) => p.suspended)
      ) ? (
        <ErrorMessage message="This advertiser profile is suspended. Contact an administrator before posting." />
      ) : null}
      <section className="seller-launch" aria-label="Create an advert">
        <div>
          <p className="eyebrow">WHAT WILL YOU SHARE?</p>
          <h2>Create something for campus.</h2>
          <p>Choose a format. Every submission is reviewed before it goes live.</p>
        </div>
        <div className="seller-formats">
          {(
            [
              ['product', 'bag', 'Sell an item'],
              ['wanted', 'search', 'Find something'],
              ['service', 'tools', 'Offer a service'],
              ['event', 'calendar', 'Share an event'],
              ['promotion', 'tag', 'Run a promotion'],
              ['announcement', 'megaphone', 'Post a notice'],
              ['business_ad', 'store', 'Advertise a business'],
            ] as const
          ).map(([kind, icon, label]) => (
            <Link
              key={kind}
              href={`/post?kind=${kind}${identity ? `&advertiserId=${identity}` : ''}`}
            >
              <Icon name={icon} />
              <span>{label}</span>
              <Icon name="chevron" />
            </Link>
          ))}
        </div>
      </section>
      <div className="stats">
        {[
          ['Live adverts', count('published')],
          ['Pending review', page.pendingCount],
          ['Drafts', count('draft')],
          ['Fulfilled', count('fulfilled')],
        ].map(([label, value]) => (
          <div className="stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section>
          <nav className="tabs" aria-label="Advert status">
            {[
              ['', 'All'],
              ['published', 'Live'],
              ['pending', 'Pending'],
              ['draft', 'Drafts'],
              ['rejected', 'Rejected'],
              ['fulfilled', 'Fulfilled'],
              ['expired', 'Expired'],
              ['withdrawn', 'Withdrawn'],
              ['suspended', 'Suspended'],
            ].map(([key, label]) => (
              <Link
                className={state === key ? 'active' : ''}
                key={key}
                href={`/my-adverts?${new URLSearchParams({ ...(key ? { state: key } : {}), ...(identity ? { identity } : {}) })}`}
                aria-current={state === key ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
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
                    <p className="meta">{a.advertiser_name}</p>
                    {d ? <p className="price">{priceText(d)}</p> : null}
                    <p>
                      {a.revisions[0]?.status === 'rejected'
                        ? a.revisions[0].reason
                        : status === 'published'
                          ? `Expires ${dateText(a.expires_at)}`
                          : `Updated ${dateText(a.revisions[0]?.created_at)}`}
                    </p>
                  </div>
                  <div className="row-status">
                    <span
                      className={`badge ${pending ? 'pending' : status === 'rejected' ? 'rejected' : ''}`}
                    >
                      {pending && status === 'published'
                        ? 'Live · edit pending'
                        : stateLabel(status, d?.kind)}
                    </span>
                  </div>
                  <Link className="btn secondary small" href={`/my-adverts/${a.id}`}>
                    Manage <Icon name="chevron" />
                  </Link>
                </article>
              );
            })
          ) : (
            <EmptyState
              title="No adverts here yet."
              message="Create an item, service, wanted advert or Campus 360 flyer. Approved adverts are visible to everyone."
              action={false}
            />
          )}
          <div className="form-actions">
            {offset > 0 ? (
              <Link
                className="btn secondary"
                href={`/my-adverts?offset=${Math.max(0, offset - 20)}${state ? `&state=${state}` : ''}${identity ? `&identity=${identity}` : ''}`}
              >
                Previous
              </Link>
            ) : null}
            {page.nextOffset !== null ? (
              <Link
                className="btn secondary"
                href={`/my-adverts?offset=${page.nextOffset}${state ? `&state=${state}` : ''}${identity ? `&identity=${identity}` : ''}`}
              >
                Next adverts
              </Link>
            ) : null}
          </div>
        </section>
        <aside className="dashboard-aside">
          <div className="panel">
            <h3>Your posting allowance</h3>
            {account.role === 'admin' ? (
              <p>
                No daily or active-advert limit for administrator submissions, including adverts
                posted for others. Content review and image checks still apply.
              </p>
            ) : (
              <>
                <p>
                  <strong>
                    {account.activeCount} of {account.settings.max_active}
                  </strong>{' '}
                  active slots reserved
                </p>
                <div className="progress">
                  <span
                    style={{
                      width: `${Math.min(100, (account.activeCount / account.settings.max_active) * 100)}%`,
                    }}
                  />
                </div>
                <p>
                  {Math.max(0, account.settings.daily_limit - account.dailyUsed)} new submissions
                  left today.
                </p>
                <p style={{ marginTop: 16 }}>
                  Personal and business adverts share this allowance. Pending adverts reserve a
                  slot. Editing an existing advert does not use another daily submission.
                </p>
              </>
            )}
            {account.profiles.some((p) => p.kind === 'business') ? (
              <Link className="text-link" href="/my-business">
                Manage business profile →
              </Link>
            ) : null}
          </div>
        </aside>
      </div>
    </>
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
          <p className="eyebrow">{stateLabel(status, d?.kind)}</p>
          <h1>{d?.title ?? 'Your advert'}</h1>
          {d ? (
            <p>
              {priceText(d)} · {d.location}
            </p>
          ) : null}
        </div>
      </div>
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
        {!pending && status !== 'suspended' ? (
          <Link className="btn" href={`/post?edit=${advert.id}${inactive ? '&renew=1' : ''}`}>
            {inactive ? 'Prepare renewal' : 'Edit advert'}
          </Link>
        ) : null}
        {status === 'published' ? (
          <>
            <Link className="btn secondary" href={`/adverts/${advert.id}`}>
              View live advert
            </Link>
            <button className="btn secondary" onClick={() => setState('fulfill')}>
              Mark as {fulfilled}
            </button>
          </>
        ) : null}
        {!['withdrawn', 'fulfilled', 'suspended'].includes(status) || pending ? (
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
