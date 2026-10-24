'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  autofillContacts,
  contactFields,
  type ContactDraft,
  type ContactField,
} from '@/lib/seller-profile';
import { isFlyer, kindName } from '@/lib/campus';
import { api, ApiError } from '@/lib/api';
import {
  parseMoney,
  priceText,
  type Account,
  type AdvertContent,
  type Category,
  type OwnAdvert,
  type SellerIdentity,
} from '@/lib/market';
import {
  socialPlatforms,
  socialLabels,
  socialExamples,
  socialProfile,
  type SocialLinks,
} from '@/lib/socials';
import { Uploads } from './uploads';
import { Icon } from './icon';
import { ErrorMessage, MediaImage, Dialog } from './ui';
interface DraftForm extends ContactDraft {
  startsAt: string;
  endsAt: string;
  externalUrl: string;
  offer: string;
  title: string;
  description: string;
  categoryId: string;
  kind: AdvertContent['kind'];
  condition: AdvertContent['condition'];
  priceMode: AdvertContent['priceMode'];
  price: string;
  location: string;
  phone: string;
  whatsapp: string;
  socials: SocialLinks;
  consent: boolean;
  mediaIds: string[];
}
function initialForm(advert?: OwnAdvert): DraftForm {
  const d = advert?.revisions[0]?.data;
  return {
    displayName: d?.displayName ?? advert?.advertiser_name ?? '',
    contactSources: d?.contactSources,
    profileVersion: d?.profileVersion,
    contactOverrides: advert ? contactFields.filter((f) => !d?.contactSources?.includes(f)) : [],
    startsAt: d?.details?.startsAt?.slice(0, 16) ?? '',
    endsAt: d?.details?.endsAt?.slice(0, 16) ?? '',
    externalUrl: d?.details?.externalUrl ?? '',
    offer: d?.details?.offer ?? '',
    title: d?.title ?? '',
    description: d?.description ?? '',
    categoryId: d?.categoryId ?? '',
    kind: d?.kind ?? 'product',
    condition: d?.condition ?? 'used',
    priceMode: d?.priceMode ?? 'fixed',
    price: d?.pricePesewas == null ? '' : String(d.pricePesewas / 100),
    location: d?.location ?? '',
    phone: d?.phone ?? '',
    whatsapp: d?.whatsapp ?? '',
    socials: d?.socials ?? {},
    consent: !!d?.contactConsent,
    mediaIds: d?.mediaIds ?? [],
  };
}
export function PostForm({
  account,
  categories,
  advert,
  userId,
  renew = false,
  advertiserId: initialAdvertiserId,
  postingProfiles,
  initialKind = 'product',
}: {
  account: Account;
  categories: Category[];
  advert?: OwnAdvert;
  userId: string;
  renew?: boolean;
  advertiserId?: string;
  postingProfiles?: SellerIdentity[];
  initialKind?: AdvertContent['kind'];
}) {
  const profiles = postingProfiles ?? account.profiles;
  const [advertiserId, setAdvertiserId] = useState(initialAdvertiserId);
  const identity = profiles.find((p) => p.id === advertiserId);
  const canChooseIdentity = !advert && profiles.some((p) => p.kind === 'business');
  const [confirmChange, setConfirmChange] = useState<{
    type: 'identity' | 'restore';
    id: string;
  } | null>(null);
  const assisted =
    !!advertiserId &&
    account.role === 'admin' &&
    !account.profiles.some((p) => p.id === advertiserId);
  const [form, setForm] = useState<DraftForm>(() => {
    const initial: DraftForm = advert
      ? initialForm(advert)
      : {
          ...initialForm(),
          kind: initialKind,
          priceMode: isFlyer(initialKind)
            ? 'contact'
            : initialKind === 'wanted'
              ? 'budget'
              : 'fixed',
          categoryId: isFlyer(initialKind)
            ? (categories.find((c) => c.slug === 'services')?.id ?? categories[0]?.id ?? '')
            : '',
        };
    return identity ? { ...initial, ...autofillContacts(initial, identity) } : initial;
  });
  const flyer = isFlyer(form.kind);
  const [step, setStep] = useState(1);
  const stepPanel = useRef<HTMLElement>(null);
  const previousStep = useRef(1);
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    const heading = stepPanel.current?.querySelector('h2');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus();
  }, [step]);
  const [identityLocked, setIdentityLocked] = useState(!!advert);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<{ path: string[]; message: string }[]>([]);
  const [savedMessage, setSavedMessage] = useState('');
  const [stored, setStored] = useState<DraftForm | null>(null);
  const router = useRouter();
  const saved = useRef<{
    advertId: string;
    revisionId: string;
    key: string;
    content: string;
  } | null>(null);
  const storageKey = `ucc-draft-v1:${userId}:${advert?.id ?? advertiserId ?? 'new'}`;
  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const value = sessionStorage.getItem(storageKey);
        if (value) {
          const draft = JSON.parse(value);
          if (draft && typeof draft.title === 'string' && Array.isArray(draft.mediaIds))
            setStored({
              ...initialForm(advert),
              ...draft,
              contactOverrides: draft.contactOverrides ?? [...contactFields],
            });
        }
      } catch {}
    });
  }, [storageKey, advert]);
  function update<K extends keyof DraftForm>(key: K, value: DraftForm[K]) {
    setForm((old) => {
      const field = contactFields.includes(key as ContactField) ? (key as ContactField) : undefined;
      const next = {
        ...old,
        [key]: value,
        ...(field
          ? {
              contactOverrides: [...new Set([...old.contactOverrides, field])],
              contactSources: old.contactSources?.filter((f) => f !== field),
            }
          : {}),
      };
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
    setSavedMessage('');
  }
  function updateSocial(field: (typeof socialPlatforms)[number], value: string) {
    setForm((old) => {
      const next = {
        ...old,
        socials: { ...old.socials, [field]: value },
        contactOverrides: [...new Set([...old.contactOverrides, field])],
        contactSources: old.contactSources?.filter((f) => f !== field),
      };
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  }
  function chooseIdentity(id: string) {
    const selected = profiles.find((p) => p.id === id);
    if (!selected) return;
    setForm((old) => {
      const next = { ...old, ...autofillContacts(old, selected), mediaIds: [] };
      try {
        sessionStorage.setItem(`ucc-draft-v1:${userId}:${id}`, JSON.stringify(next));
      } catch {}
      return next;
    });
    setAdvertiserId(id);
    saved.current = null;
    setStored(null);
    setSavedMessage('');
  }
  const fieldError = (name: string) =>
    fields
      .filter((f) => f.path[0] === name)
      .map((f) => (
        <p className="form-error" key={f.path.join('.') + f.message}>
          {f.message}
        </p>
      ));
  function content(): AdvertContent {
    return {
      ...(form.displayName.trim() ? { displayName: form.displayName.trim() } : {}),
      ...(form.contactSources
        ? { contactSources: form.contactSources, profileVersion: form.profileVersion }
        : {}),
      title: form.title.trim(),
      description: form.description.trim(),
      categoryId: form.categoryId,
      kind: form.kind,
      condition: form.kind === 'product' ? form.condition : 'not_applicable',
      priceMode: flyer ? 'contact' : form.kind === 'wanted' ? 'budget' : form.priceMode,
      pricePesewas: flyer
        ? null
        : form.priceMode === 'free'
          ? 0
          : form.priceMode === 'contact'
            ? null
            : parseMoney(form.price),
      location: form.location.trim(),
      ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      ...(form.whatsapp.trim() ? { whatsapp: form.whatsapp.trim() } : {}),
      socials: Object.fromEntries(
        socialPlatforms
          .filter((platform) => form.socials[platform]?.trim())
          .map((platform) => [platform, form.socials[platform]!.trim()]),
      ),
      contactConsent: true,
      mediaIds: form.mediaIds,
      ...(flyer
        ? {
            details: {
              ...(form.kind === 'event' && form.startsAt
                ? { startsAt: new Date(form.startsAt + 'Z').toISOString() }
                : {}),
              ...(form.endsAt ? { endsAt: new Date(form.endsAt + 'Z').toISOString() } : {}),
              ...(form.externalUrl.trim() ? { externalUrl: form.externalUrl.trim() } : {}),
              ...(form.kind === 'promotion' && form.offer.trim()
                ? { offer: form.offer.trim() }
                : {}),
            },
          }
        : {}),
    };
  }
  function advance(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setFields([]);
    if (step === 1) {
      if (form.kind === 'event' && form.startsAt && form.endsAt && form.endsAt <= form.startsAt) {
        setError('The end must be after the start.');
        return;
      }
      if (
        !flyer &&
        form.priceMode !== 'free' &&
        form.priceMode !== 'contact' &&
        parseMoney(form.price) === null
      ) {
        setError('Enter a valid price with up to two decimal places.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if ((form.kind === 'product' || flyer) && !form.mediaIds.length) {
        setError('Add at least one completed photo for an item advert.');
        return;
      }
      if (!form.phone.trim() && !form.whatsapp.trim()) {
        setError('Provide a phone or WhatsApp contact.');
        return;
      }
      for (const platform of socialPlatforms) {
        const value = form.socials[platform]?.trim();
        if (value && !socialProfile(platform, value)) {
          setError(`Enter a valid ${socialLabels[platform]} profile URL.`);
          return;
        }
      }
      setStep(3);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  async function save(submit: boolean) {
    if (busy || uploading) return;
    setBusy(true);
    setError('');
    setFields([]);
    setSavedMessage('');
    try {
      if (!form.consent) throw new Error('Consent is required to publish your contact details.');
      const data = content();
      const encoded = JSON.stringify(data);
      if (!saved.current || saved.current.content !== encoded) {
        const target = advert?.id ?? saved.current?.advertId;
        const result = target
          ? await api<{ advertId: string; revisionId: string }>(
              `me/adverts/${target}${renew ? '/renew' : ''}`,
              renew ? 'POST' : 'PATCH',
              data,
            )
          : await api<{ advertId: string; revisionId: string }>(
              assisted
                ? 'admin/adverts'
                : `me/adverts${advertiserId ? `?advertiserId=${advertiserId}` : ''}`,
              'POST',
              assisted ? { advertiserId, content: data } : data,
            );
        saved.current = { ...result, key: crypto.randomUUID(), content: encoded };
        setIdentityLocked(true);
      }
      if (submit) {
        const ref = saved.current;
        await api(
          `me/adverts/${ref.advertId}/submit`,
          'POST',
          { revisionId: ref.revisionId },
          ref.key,
        );
        try {
          sessionStorage.removeItem(storageKey);
        } catch {}
        router.push(assisted ? '/admin/submissions' : '/my-adverts?submitted=1');
        router.refresh();
      } else {
        setSavedMessage(
          'Draft saved. It is not public until you submit it and an administrator approves it.',
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save advert.');
      if (e instanceof ApiError) setFields(e.fields);
    } finally {
      setBusy(false);
    }
  }
  const common = (
    key:
      | 'displayName'
      | 'title'
      | 'description'
      | 'location'
      | 'phone'
      | 'whatsapp'
      | 'price'
      | 'startsAt'
      | 'endsAt'
      | 'externalUrl'
      | 'offer',
  ) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update(key, e.target.value),
  });
  return (
    <div className="post-layout">
      {confirmChange ? (
        <Dialog
          title={
            confirmChange.type === 'identity'
              ? 'Change seller identity?'
              : 'Restore Profile Defaults?'
          }
          onClose={() => setConfirmChange(null)}
        >
          <p>
            {confirmChange.type === 'identity'
              ? 'Photos belong to the current identity and will be cleared. Re-upload them for the selected profile. Your product details and customized contacts will remain.'
              : 'This replaces customized contact and location values with your selected profile’s current defaults. Product details and photos stay as they are.'}
          </p>
          <div className="form-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (confirmChange.type === 'identity') chooseIdentity(confirmChange.id);
                else if (identity)
                  setForm((old) => {
                    const next = { ...old, ...autofillContacts(old, identity, true) };
                    try {
                      sessionStorage.setItem(storageKey, JSON.stringify(next));
                    } catch {}
                    return next;
                  });
                setConfirmChange(null);
              }}
            >
              Confirm
            </button>
            <button type="button" className="btn secondary" onClick={() => setConfirmChange(null)}>
              Cancel
            </button>
          </div>
        </Dialog>
      ) : null}
      <div className="post-heading">
        <div>
          <h1>
            {renew
              ? 'Renew advert'
              : advert
                ? 'Edit advert'
                : assisted
                  ? 'Create assisted advert'
                  : 'Post an advert'}
          </h1>
          <p>
            {assisted
              ? 'Posting for the selected advertiser. Review and contact consent still apply.'
              : 'Make your next campus connection.'}
          </p>
        </div>
        <Link className="text-link" href={assisted ? '/admin/adverts' : '/my-adverts'}>
          Manage adverts <Icon name="arrow" />
        </Link>
      </div>
      {canChooseIdentity ? (
        <label className="form-group posting-identity">
          <span className="form-label">Public identity</span>
          <select
            className="field-input"
            value={advertiserId}
            disabled={busy || uploading || identityLocked}
            onChange={(e) => {
              const id = e.target.value;
              if (form.mediaIds.length) setConfirmChange({ type: 'identity', id });
              else chooseIdentity(id);
            }}
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id} disabled={p.suspended || p.deactivated}>
                {p.kind === 'business' ? 'Business' : 'Personal'} — {p.name}
              </option>
            ))}
          </select>
        </label>
      ) : advert || assisted ? (
        <p className="inline-notice">
          Posting as <strong>{identity?.name ?? account.profile?.name}</strong>
          {identityLocked ? ' · Identity fixed for this advert.' : ''}
        </p>
      ) : null}
      {stored ? (
        <div className="inline-notice">
          <div>
            <strong>Continue your unfinished advert?</strong>
            <p>
              Text and completed photos were kept in this browser session. Unfinished uploads must
              be selected again.
            </p>
            <div className="form-actions">
              <button
                className="btn small"
                type="button"
                onClick={() => {
                  setForm(stored);
                  setStored(null);
                }}
              >
                Restore draft
              </button>
              <button
                className="btn secondary small"
                type="button"
                onClick={() => {
                  sessionStorage.removeItem(storageKey);
                  setStored(null);
                }}
              >
                Discard local copy
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="steps">
        {['Details', flyer ? 'Artwork & contact' : 'Photos & contact', 'Review & submit'].map(
          (label, i) => (
            <div
              className={`step ${step === i + 1 ? 'current' : ''} ${step > i + 1 ? 'complete' : ''}`}
              aria-current={step === i + 1 ? 'step' : undefined}
              key={label}
            >
              <span>{step > i + 1 ? '✓' : i + 1}</span>
              {label}
            </div>
          ),
        )}
      </div>
      <div className="post-columns">
        <section className="panel form-panel" ref={stepPanel}>
          {error ? <ErrorMessage message={error} /> : null}
          {fields.length ? (
            <div role="alert">
              {fields.map((f) => (
                <p className="form-error" key={f.path.join('.') + f.message}>
                  {f.path.join('.')}: {f.message}
                </p>
              ))}
            </div>
          ) : null}
          {step === 1 ? (
            <form onSubmit={advance}>
              <h2>Tell us about your advert</h2>
              <p>Clear details help the right person find it.</p>
              <label className="form-group">
                <span className="form-label">What are you posting?</span>
                <select
                  className="field-input"
                  value={form.kind}
                  onChange={(e) => {
                    const kind = e.target.value as DraftForm['kind'];
                    update('kind', kind);
                    update(
                      'priceMode',
                      isFlyer(kind) ? 'contact' : kind === 'wanted' ? 'budget' : 'fixed',
                    );
                    if (isFlyer(kind))
                      update(
                        'categoryId',
                        categories.find((c) => c.slug === 'services')?.id ??
                          categories[0]?.id ??
                          '',
                      );
                  }}
                >
                  <option value="product">An item</option>
                  <option value="service">A service</option>
                  <option value="wanted">Wanted</option>
                  <option value="event">Event or program flyer</option>
                  <option value="promotion">Promotion or campaign</option>
                  <option value="announcement">Announcement</option>
                  <option value="business_ad">Business advertisement</option>
                </select>
              </label>
              <label className="form-group">
                <span className="form-label">Advert title</span>
                <input
                  required
                  minLength={5}
                  maxLength={120}
                  className="field-input"
                  {...common('title')}
                  placeholder="What are you offering or looking for?"
                />
                {fieldError('title')}
              </label>
              {!flyer ? (
                <>
                  {' '}
                  <label className="form-group">
                    <span className="form-label">Category</span>
                    <select
                      required
                      className="field-input"
                      value={form.categoryId}
                      onChange={(e) => update('categoryId', e.target.value)}
                    >
                      <option value="">Choose a category</option>
                      {categories.map((c) => (
                        <option value={c.id} key={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="field-inline">
                    <label className="form-group">
                      <span className="form-label">
                        {form.kind === 'wanted' ? 'Budget' : 'Price'} (GH₵)
                      </span>
                      <input
                        className="field-input"
                        inputMode="decimal"
                        disabled={['free', 'contact'].includes(form.priceMode)}
                        required={!['free', 'contact'].includes(form.priceMode)}
                        {...common('price')}
                      />
                    </label>
                    <label className="form-group">
                      <span className="form-label">Price type</span>
                      <select
                        className="field-input"
                        value={form.priceMode}
                        onChange={(e) =>
                          update('priceMode', e.target.value as DraftForm['priceMode'])
                        }
                      >
                        {form.kind === 'wanted' ? (
                          <option value="budget">Budget</option>
                        ) : (
                          <>
                            <option value="fixed">Fixed price</option>
                            <option value="negotiable">Negotiable</option>
                            <option value="free">Free</option>
                            <option value="contact">Contact for price</option>
                          </>
                        )}
                      </select>
                    </label>
                  </div>
                  {form.kind === 'product' ? (
                    <label className="form-group">
                      <span className="form-label">Condition</span>
                      <select
                        className="field-input"
                        value={form.condition}
                        onChange={(e) =>
                          update('condition', e.target.value as DraftForm['condition'])
                        }
                      >
                        <option value="used">Used</option>
                        <option value="new">New</option>
                      </select>
                    </label>
                  ) : null}
                </>
              ) : (
                <div className="flyer-fields">
                  <p className="inline-notice">
                    This advert appears in Campus 360 after approval. No product price is required.
                  </p>
                  {form.kind === 'event' ? (
                    <label className="form-group">
                      <span className="form-label">Event start (Ghana time)</span>
                      <input
                        type="datetime-local"
                        className="field-input"
                        required
                        {...common('startsAt')}
                      />
                    </label>
                  ) : null}
                  {form.kind === 'promotion' ? (
                    <label className="form-group">
                      <span className="form-label">Offer description</span>
                      <input
                        className="field-input"
                        minLength={5}
                        maxLength={500}
                        required
                        {...common('offer')}
                        placeholder="For example, 20% off printing this week"
                      />
                    </label>
                  ) : null}
                  <label className="form-group">
                    <span className="form-label">
                      {form.kind === 'event' ? 'Event end' : 'Valid until'} (Ghana time, optional)
                    </span>
                    <input type="datetime-local" className="field-input" {...common('endsAt')} />
                    <small>Otherwise the platform’s normal advert expiry applies.</small>
                  </label>
                  <label className="form-group">
                    <span className="form-label">
                      {form.kind === 'event' ? 'Registration link' : 'External link'} (optional)
                    </span>
                    <input
                      className="field-input"
                      type="url"
                      pattern="https://.*"
                      maxLength={1000}
                      placeholder="https://…"
                      {...common('externalUrl')}
                    />
                    <small>Use a full HTTPS link. Visitors will leave MedStash to open it.</small>
                  </label>
                </div>
              )}
              <label className="form-group">
                <span className="form-label">
                  Description <small>20–5,000 characters</small>
                </span>
                <textarea
                  required
                  minLength={20}
                  maxLength={5000}
                  className="field-input"
                  {...common('description')}
                  placeholder="Describe the condition, what is included and useful details."
                />
              </label>
              <label className="form-group">
                <span className="form-label">
                  {form.kind === 'event' ? 'Event venue' : 'Campus location'}
                </span>
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  className="field-input"
                  {...common('location')}
                  placeholder="For example, Amamoma"
                />
              </label>
              <div className="form-bottom">
                <Link className="btn secondary" href="/my-adverts">
                  Cancel
                </Link>
                <button className="btn">
                  Continue <Icon name="arrow" />
                </button>
              </div>
            </form>
          ) : step === 2 ? (
            <form onSubmit={advance}>
              <h2>Photos & contact</h2>
              <p>Use your own photos and contacts you have permission to share.</p>
              <div className="profile-defaults">
                <p>
                  {form.contactSources
                    ? 'Auto-filled from your saved profile. Changes here apply only to this advert.'
                    : 'Save your reusable contacts in your profile, or complete this advert’s contact fields below.'}
                </p>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn secondary small"
                    disabled={!identity || busy || uploading}
                    onClick={() =>
                      identity && setConfirmChange({ type: 'restore', id: identity.id })
                    }
                  >
                    Restore Profile Defaults
                  </button>
                  <Link
                    href={
                      assisted
                        ? `/admin/${identity?.kind === 'business' ? `businesses/${advertiserId}/profile` : `personal/${advertiserId}`}`
                        : identity?.kind === 'business'
                          ? '/my-business'
                          : '/my-personal-profile'
                    }
                    className="text-link"
                    target="_blank"
                  >
                    Manage saved profile →
                  </Link>
                </div>
              </div>
              <label className="form-group">
                <span className="form-label">Seller / Business Name</span>
                <input
                  className="field-input"
                  minLength={2}
                  maxLength={100}
                  {...common('displayName')}
                />
              </label>
              <Uploads
                ids={form.mediaIds}
                onChange={(ids) => update('mediaIds', ids)}
                max={account.settings.max_images}
                maxBytes={account.settings.max_image_bytes}
                advertiserId={advertiserId}
                onBusy={setUploading}
              />
              <label className="form-group">
                <span className="form-label">Phone number</span>
                <input
                  className="field-input"
                  type="tel"
                  maxLength={32}
                  autoComplete="tel"
                  {...common('phone')}
                  placeholder="024 123 4567"
                />
              </label>
              <label className="form-group">
                <span className="form-label">WhatsApp number</span>
                <input
                  className="field-input"
                  type="tel"
                  maxLength={32}
                  {...common('whatsapp')}
                  placeholder="024 123 4567"
                />
              </label>
              <fieldset className="social-fields">
                <legend>
                  Social profiles <span className="meta">(optional)</span>
                </legend>
                <p className="meta">Add the profiles you want buyers to see on this advert.</p>
                {socialPlatforms.map((platform) => (
                  <label className="form-group" key={platform}>
                    <span className="form-label">{socialLabels[platform]} profile URL</span>
                    <input
                      className="field-input"
                      type="url"
                      maxLength={300}
                      placeholder={socialExamples[platform]}
                      value={form.socials[platform] ?? ''}
                      onChange={(e) => updateSocial(platform, e.target.value)}
                    />
                  </label>
                ))}
              </fieldset>
              <label className="check" style={{ marginTop: 24, alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  required
                  checked={form.consent}
                  onChange={(e) => update('consent', e.target.checked)}
                />
                <span>
                  I consent to publish these contact details on my advert so buyers can reach me.
                </span>
              </label>
              <div className="form-bottom">
                <button type="button" className="btn secondary" onClick={() => setStep(1)}>
                  Back
                </button>
                <button className="btn" disabled={uploading}>
                  Review advert <Icon name="arrow" />
                </button>
              </div>
            </form>
          ) : (
            <>
              <h2>Looking good?</h2>
              <p>Check your advert before sending it for review.</p>
              <div className="review-preview">
                <div className="review-preview-photo">
                  <MediaImage id={form.mediaIds[0]} alt={form.title} />
                </div>
                <h3>{form.title}</h3>
                <p className="price">{priceText(content())}</p>
                <p className="muted">{form.location}</p>
                <p className="review-description">{form.description}</p>
              </div>
              {[
                [
                  'Category',
                  flyer
                    ? `Campus 360 · ${kindName(form.kind)}`
                    : categories.find((c) => c.id === form.categoryId)?.name,
                ],
                ['Type', form.kind],
                ['Photos', String(form.mediaIds.length)],
                ...(flyer
                  ? [
                      ['Starts (Ghana time)', form.startsAt || 'Not applicable'],
                      ['Ends / valid until (Ghana time)', form.endsAt || 'Normal advert expiry'],
                      ['Offer', form.offer || 'Not applicable'],
                      ['External link', form.externalUrl || 'None'],
                    ]
                  : []),
                ['Advertiser', form.displayName || identity?.name || 'Selected identity'],
                ['Phone', form.phone || 'Not published'],
                ['WhatsApp', form.whatsapp || 'Not published'],
                ...socialPlatforms
                  .filter((platform) => form.socials[platform]?.trim())
                  .map((platform) => [
                    socialLabels[platform],
                    `@${socialProfile(platform, form.socials[platform]!)?.username ?? ''}`,
                  ]),
              ].map(([k, v]) => (
                <div className="summary-line" key={k}>
                  <span>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
              <div className="inline-notice">
                <Icon name="clock" />
                <div>
                  <strong>Reviewed before it goes live</strong>Approved adverts run for{' '}
                  {account.settings.duration_days} days. Edits keep the original expiry.
                </div>
              </div>
              {savedMessage ? (
                <p className="form-success" role="status">
                  {savedMessage}
                </p>
              ) : null}
              <div className="form-bottom">
                <button className="btn secondary" disabled={busy} onClick={() => setStep(2)}>
                  Back
                </button>
                <button
                  className="btn"
                  disabled={busy || uploading}
                  onClick={() => void save(true)}
                >
                  {busy ? 'Saving…' : 'Submit for approval'}
                </button>
              </div>
              <button
                className="btn quiet"
                disabled={busy || uploading}
                onClick={() => void save(false)}
              >
                Save as draft
              </button>
            </>
          )}
        </section>
        <aside className="posting-guide">
          <h3>A good advert goes further.</h3>
          <p>Use a clear title, honest description and bright photos of your actual item.</p>
          <p>
            Keep contact details in the contact fields. Never include sensitive personal
            information.
          </p>
          <div className="allowance">
            <p className="eyebrow">POSTING ALLOWANCE</p>
            {account.role === 'admin' ? (
              <p>
                Administrator posting: no daily or active-advert limit, including assisted adverts.
                Content review and photo checks still apply.
              </p>
            ) : (
              <>
                <p>
                  <strong>
                    {account.activeCount} of {account.settings.max_active}
                  </strong>
                  <small>active slots reserved</small>
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
                  <br />
                  Edits and corrections do not use another daily slot.
                </p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
