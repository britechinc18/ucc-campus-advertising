'use client';
import Link from 'next/link';
import { SocialProfiles } from './social-profiles';
import { useState, useEffect } from 'react';
import { Dialog, MediaImage, SafeNote, ErrorMessage } from './ui';
import { Icon } from './icon';
import { SaveButton } from './bookmark-button';
import { isFlyer, kindName, safeExternalUrl } from '@/lib/campus';
import { rememberAdvert } from './recently-viewed';
import { api } from '@/lib/api';
import { priceText, initials, dateText, type Listing } from '@/lib/market';
export function AdvertDetail({ advert }: { advert: Listing }) {
  const [index, setIndex] = useState(0);
  const [modal, setModal] = useState<'gallery' | 'report' | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const d = advert.data;
  const flyer = isFlyer(d.kind);
  const safeExternal = safeExternalUrl(d.details?.externalUrl);
  useEffect(() => {
    rememberAdvert(advert.id);
    try {
      const key = `viewed:${advert.id}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
      void api(`adverts/${advert.id}/events`, 'POST', { type: 'view' }).catch(() => {});
    } catch {}
  }, [advert.id]);
  useEffect(() => {
    if (modal !== 'gallery') return;
    const navigate = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setIndex((i) => Math.min(d.mediaIds.length - 1, i + 1));
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    document.addEventListener('keydown', navigate);
    return () => document.removeEventListener('keydown', navigate);
  }, [modal, d.mediaIds.length]);
  async function share() {
    const url = `${location.origin}/adverts/${advert.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: d.title, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setNotice('Advert link copied.');
      } else setNotice(`Copy this link: ${url}`);
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError')) setNotice(`Copy this link: ${url}`);
    }
  }
  const contact = (type: 'phone' | 'whatsapp') => {
    const href = advert.contacts?.[type];
    return href ? (
      <a
        className={`btn ${type === 'phone' ? 'secondary' : ''}`}
        href={href}
        target={type === 'whatsapp' ? '_blank' : undefined}
        rel={type === 'whatsapp' ? 'noopener noreferrer' : undefined}
        onClick={() => {
          void api(`adverts/${advert.id}/events`, 'POST', { type: 'contact' }).catch(() => {});
        }}
      >
        <Icon name={type === 'phone' ? 'phone' : 'chat'} />
        {type === 'phone' ? 'Call' : 'WhatsApp'}
      </a>
    ) : null;
  };
  async function report(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      await api(`adverts/${advert.id}/reports`, 'POST', {
        reason: f.get('reason'),
        detail: f.get('detail'),
      });
      setModal(null);
      setNotice('Thank you. Your report has been sent to the moderation team.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send report.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className={`detail-grid public-detail ${flyer ? 'flyer-detail' : ''}`}>
        <div className="gallery">
          <SaveButton id={advert.id} title={d.title} />
          <button
            className="gallery-main gallery-trigger"
            onClick={() => d.mediaIds.length && setModal('gallery')}
            aria-label={d.mediaIds.length ? 'Enlarge advert photograph' : 'No photograph available'}
            disabled={!d.mediaIds.length}
          >
            <MediaImage
              key={d.mediaIds[index]}
              id={d.mediaIds[index]}
              alt={d.title}
              loading="eager"
            />
          </button>
          {d.mediaIds.length > 1 ? (
            <div className="gallery-thumbnails">
              {d.mediaIds.map((id, i) => (
                <button
                  key={id}
                  aria-label={`Photograph ${i + 1}`}
                  aria-pressed={index === i}
                  onClick={() => setIndex(i)}
                >
                  <MediaImage id={id} alt="" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <section className="detail-content">
          <p className="eyebrow">
            {flyer
              ? `CAMPUS 360 · ${kindName(d.kind)}`
              : d.kind === 'wanted'
                ? 'WANTED ON CAMPUS'
                : d.kind === 'service'
                  ? 'CAMPUS SERVICE'
                  : 'CAMPUS FIND'}
          </p>
          <h1>{d.title}</h1>
          {!flyer ? (
            <div className="price-line">
              <p className="price">{priceText(d)}</p>
              {d.priceMode === 'negotiable' ? <span className="meta">Negotiable</span> : null}
            </div>
          ) : (
            <div className="flyer-information">
              {d.details?.startsAt ? (
                <p>
                  <strong>When</strong>
                  {new Date(d.details.startsAt).toLocaleString('en-GH', {
                    timeZone: 'Africa/Accra',
                    dateStyle: 'long',
                    timeStyle: 'short',
                  })}{' '}
                  GMT
                </p>
              ) : null}
              {d.details?.endsAt ? (
                <p>
                  <strong>{d.kind === 'event' ? 'Until' : 'Valid until'}</strong>
                  {new Date(d.details.endsAt).toLocaleString('en-GH', {
                    timeZone: 'Africa/Accra',
                    dateStyle: 'long',
                    timeStyle: 'short',
                  })}{' '}
                  GMT
                </p>
              ) : null}
              {d.details?.offer ? (
                <p>
                  <strong>The offer</strong>
                  {d.details.offer}
                </p>
              ) : null}
              {safeExternal ? (
                <a
                  className="btn secondary"
                  href={safeExternal}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {d.kind === 'event' ? 'Registration / event link' : 'Visit advertiser’s link'}{' '}
                  <Icon name="arrow" />
                </a>
              ) : null}
            </div>
          )}
          <div className="attributes">
            {d.condition !== 'not_applicable' ? (
              <span className="chip">{d.condition === 'new' ? 'New' : 'Used'}</span>
            ) : null}
            <span className="chip">
              <Icon name="pin" />
              {d.location}
            </span>
          </div>
          <section className="description public-detail">
            <h2>
              About this{' '}
              {flyer
                ? 'campus update'
                : d.kind === 'service'
                  ? 'service'
                  : d.kind === 'wanted'
                    ? 'request'
                    : 'item'}
            </h2>
            <p>{d.description}</p>
          </section>
          <div className="detail-actions">
            <button className="btn quiet" onClick={share}>
              <Icon name="share" />
              Share
            </button>
            <button
              className="btn quiet"
              onClick={() => {
                setError('');
                setModal('report');
              }}
            >
              <Icon name="flag" />
              Report advert
            </button>
          </div>
          <Link
            className="seller seller-link"
            href={`/sellers/${advert.advertiser_id}`}
            aria-label={`View ${advert.seller}’s adverts`}
          >
            <div className="avatar">{initials(advert.seller)}</div>
            <div>
              <h3>{advert.seller}</h3>
              <p>{advert.seller_kind === 'business' ? 'Business' : 'Student'} advertiser · UCC</p>
            </div>
          </Link>
          <SocialProfiles socials={d.socials} />
          <div className="contact-buttons">
            {contact('whatsapp')}
            {contact('phone')}
          </div>
          <p className="gallery-caption">
            {d.mediaIds.length
              ? `${index + 1} of ${d.mediaIds.length} · Photos supplied by advertiser`
              : 'No photograph supplied'}
          </p>
          <p className="contact-note">Contact the advertiser directly. No checkout required.</p>
          <SafeNote />
          <p className="advert-dates">
            Posted {dateText(advert.published_at)} · Expires {dateText(advert.expires_at)}
          </p>
        </section>
      </div>
      {notice ? (
        <p className="inline-notice" role="status">
          {notice}
        </p>
      ) : null}
      <div className="contact-bar">
        {contact('whatsapp')}
        {contact('phone')}
      </div>
      {modal === 'gallery' ? (
        <Dialog
          title={`Photograph ${index + 1} of ${d.mediaIds.length}`}
          onClose={() => setModal(null)}
        >
          <div className="enlarged-image">
            <MediaImage key={d.mediaIds[index]} id={d.mediaIds[index]} alt={d.title} />
          </div>
          <div className="form-actions">
            <button
              className="btn secondary"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
            >
              Previous
            </button>
            <button
              className="btn secondary"
              disabled={index === d.mediaIds.length - 1}
              onClick={() => setIndex((i) => i + 1)}
            >
              Next
            </button>
          </div>
        </Dialog>
      ) : null}
      {modal === 'report' ? (
        <Dialog title="Report this advert" onClose={() => setModal(null)}>
          <form onSubmit={report}>
            <p className="muted">Tell the moderation team what seems wrong.</p>
            <label className="form-group">
              <span className="form-label">Reason</span>
              <select className="field-input" name="reason">
                <option value="spam">Spam</option>
                <option value="duplicate">Duplicate</option>
                <option value="fraud">Suspected fraud</option>
                <option value="prohibited">Prohibited item</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="form-group">
              <span className="form-label">Additional details (optional)</span>
              <textarea name="detail" maxLength={1000} className="field-input" />
            </label>
            {error ? <ErrorMessage message={error} /> : null}
            <button className="btn" disabled={busy}>
              {busy ? 'Sending…' : 'Send report'}
            </button>
          </form>
        </Dialog>
      ) : null}
    </>
  );
}
