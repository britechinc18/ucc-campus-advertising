'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { safeReturn, type SellerIdentity } from '@/lib/market';
import { ErrorMessage } from './ui';
import { Icon } from './icon';
import { SellerSetupProgress } from './seller-setup-progress';
export function Onboarding({
  name,
  next,
  kind,
  profiles = [],
}: {
  name: string;
  next: string;
  kind?: 'student' | 'business';
  profiles?: SellerIdentity[];
}) {
  const [selected, setSelected] = useState<'student' | 'business'>(kind ?? 'student');
  const [step, setStep] = useState(kind ? 3 : 2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [identityId, setIdentityId] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  const existing = profiles.find((p) => p.kind === selected);
  const defaults = existing?.defaults;
  function advance(value: number) {
    setError('');
    setStep(value);
    requestAnimationFrame(() => heading.current?.focus());
  }
  async function startPosting() {
    setBusy(true);
    setError('');
    try {
      await api('me/mode', 'POST', { mode: 'seller' });
      const destination = safeReturn(next);
      const url = new URL(destination, window.location.origin);
      if (url.pathname === '/post') url.searchParams.set('advertiserId', identityId);
      router.replace(url.pathname + url.search + url.hash);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not continue.');
      setBusy(false);
    }
  }
  return (
    <div className={`seller-setup-shell setup-step-${step}`}>
      <SellerSetupProgress step={step} />
      <h1 ref={heading} tabIndex={-1}>
        {step === 2
          ? 'How will you sell on MedStash?'
          : step === 3
            ? `Set up your ${selected === 'business' ? 'business' : 'personal'} profile.`
            : 'You’re ready to sell.'}
      </h1>
      {step === 4 ? (
        <p className="setup-description">
          Your profile is saved. Create your first advert whenever you’re ready.
        </p>
      ) : null}
      {step === 2 ? (
        <>
          <div className="setup-role-grid" role="group" aria-label="Profile type">
            {(['student', 'business'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={selected === value}
                className={`setup-role-card ${selected === value ? 'is-selected' : ''}`}
                onClick={() => setSelected(value)}
              >
                <span className="setup-role-art">
                  <Image
                    src={`/editorial/onboarding-${value === 'student' ? 'student' : 'business'}.webp`}
                    alt=""
                    fill
                    sizes="(max-width: 600px) 90vw, 440px"
                    priority
                  />
                  <span className="setup-role-symbol">
                    <Icon name={value === 'student' ? 'book' : 'store'} />
                  </span>
                  <span className="setup-role-selected" aria-hidden="true">
                    <Icon name="check" />
                  </span>
                </span>
                <span className="setup-role-content">
                  <span className="setup-role-kicker">
                    {value === 'student' ? 'PERSONAL PROFILE' : 'BUSINESS PROFILE'}
                  </span>
                  <strong>{value === 'student' ? 'I’m a student' : 'I’m a business owner'}</strong>
                  <span className="setup-role-description">
                    {value === 'student'
                      ? 'Give your pre-loved things their next chapter.'
                      : 'Make your business part of campus life.'}
                  </span>
                  <span className="setup-role-benefits">
                    <span>
                      <Icon name="check" />
                      {value === 'student'
                        ? 'Sell books, gadgets and more'
                        : 'Showcase products and services'}
                    </span>
                    <span>
                      <Icon name="check" />
                      {value === 'student'
                        ? 'Connect directly with buyers'
                        : 'Reach students on campus'}
                    </span>
                  </span>
                  <span className="setup-role-choice">
                    {selected === value ? 'Selected' : 'Choose this profile'}
                    <Icon name={selected === value ? 'check' : 'arrow'} />
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="setup-actions">
            <Link href="/explore" className="btn secondary">
              Back to browsing
            </Link>
            <button
              className="btn"
              onClick={() => {
                if (
                  existing &&
                  !existing.suspended &&
                  !existing.deactivated &&
                  defaults?.phone &&
                  defaults?.whatsapp &&
                  defaults?.location &&
                  defaults?.contactConsent
                ) {
                  setIdentityId(existing.id);
                  advance(4);
                } else advance(3);
              }}
            >
              Continue →
            </button>
          </div>
        </>
      ) : step === 3 ? (
        <div className="setup-profile-layout">
          <aside className="setup-profile-story" aria-label="Selected profile">
            <div className="setup-profile-story-copy">
              <span className="setup-profile-type">
                <Icon name={selected === 'business' ? 'store' : 'book'} />
                {selected === 'business' ? 'Business profile' : 'Personal profile'}
              </span>
              <h2>
                {selected === 'business'
                  ? 'Your business. Your campus.'
                  : 'Your own corner of campus.'}
              </h2>
            </div>
            <div className="setup-profile-story-art">
              <Image
                src={`/editorial/onboarding-${selected === 'business' ? 'business' : 'student'}.webp`}
                alt=""
                fill
                sizes="(max-width: 700px) 140px, 340px"
                priority
              />
            </div>
            <ol className="setup-profile-outline">
              <li>
                <span>01</span>Name & location
              </li>
              <li>
                <span>02</span>How buyers reach you
              </li>
              <li>
                <span>03</span>A short introduction
              </li>
            </ol>
          </aside>
          <form
            className="setup-profile-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              setBusy(true);
              setError('');
              try {
                const result = await api<{ id: string }>('me/profile', 'POST', {
                  name: form.get('name'),
                  kind: selected,
                  consent: true,
                  ...(existing ? { setupVersion: existing.version ?? 0 } : {}),
                  setup: {
                    name: form.get('name'),
                    phone: form.get('phone'),
                    whatsapp: form.get('whatsapp'),
                    location: form.get('location'),
                    bio: form.get('bio'),
                    contactConsent: form.get('contactConsent') === 'on',
                  },
                });
                setIdentityId(result.id);
                advance(4);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not save your profile.');
              } finally {
                setBusy(false);
              }
            }}
            onChange={(e) => {
              const target = e.target;
              if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement))
                return;
              if (target.name)
                setValues((previous) => ({
                  ...previous,
                  [`${selected}.${target.name}`]: target.value,
                }));
            }}
          >
            <div className="setup-form-heading">
              <span className="setup-form-symbol">
                <Icon name="edit" />
              </span>
              <h2>Make it yours</h2>
            </div>
            <div className="setup-fields">
              {[
                {
                  key: 'name',
                  label: selected === 'business' ? 'Business / advertiser name' : 'Advertiser name',
                  hint:
                    selected === 'business'
                      ? 'Use the business name buyers will recognise.'
                      : 'The public name buyers will see on your adverts.',
                  placeholder:
                    selected === 'business' ? 'e.g. Campus Essentials' : 'e.g. Bright Asare',
                  initial: defaults?.name ?? existing?.name ?? (selected === 'student' ? name : ''),
                  max: 100,
                },
                {
                  key: 'phone',
                  label: 'Phone number',
                  hint: 'A number buyers can call. Add a country code outside Ghana.',
                  placeholder: '024 123 4567',
                  initial: defaults?.phone,
                  max: 30,
                },
                {
                  key: 'whatsapp',
                  label: 'WhatsApp number',
                  hint: 'Use a number linked to WhatsApp so buyers can message you.',
                  placeholder: '+233 24 123 4567',
                  initial: defaults?.whatsapp,
                  max: 30,
                },
                {
                  key: 'location',
                  label: 'Location',
                  hint: 'Enter your campus, hall or nearby area—not your private address.',
                  placeholder: 'e.g. UCC, Valco Hall',
                  initial: defaults?.location,
                  max: 120,
                },
              ]
                .sort(
                  (a, b) =>
                    ['name', 'location', 'phone', 'whatsapp'].indexOf(a.key) -
                    ['name', 'location', 'phone', 'whatsapp'].indexOf(b.key),
                )
                .map((field) => (
                  <label className="form-group" key={`${selected}.${field.key}`}>
                    <span className="form-label">{field.label}</span>
                    <input
                      className="field-input"
                      name={field.key}
                      placeholder={field.placeholder}
                      aria-label={field.label}
                      aria-describedby={`setup-${field.key}-hint`}
                      defaultValue={values[`${selected}.${field.key}`] ?? field.initial ?? ''}
                      type={field.key === 'phone' || field.key === 'whatsapp' ? 'tel' : 'text'}
                      autoComplete={
                        field.key === 'name' ? 'name' : field.key === 'phone' ? 'tel' : 'off'
                      }
                      minLength={2}
                      maxLength={field.max}
                      required
                    />
                    <span className="meta" id={`setup-${field.key}-hint`}>
                      {field.hint}
                    </span>
                  </label>
                ))}
            </div>
            <label className="form-group setup-introduction">
              <span className="form-label">
                {selected === 'business' ? 'About your business' : 'About you'}{' '}
                <span className="meta">(optional)</span>
              </span>
              <textarea
                className="field-input"
                name="bio"
                rows={3}
                maxLength={500}
                aria-describedby="setup-bio-hint"
                defaultValue={values[`${selected}.bio`] ?? defaults?.bio ?? ''}
                placeholder={
                  selected === 'business'
                    ? 'e.g. Student-run tech accessories, right here on campus.'
                    : 'e.g. Medical student selling books and campus essentials.'
                }
              />
              <span className="meta" id="setup-bio-hint">
                {selected === 'business'
                  ? 'Tell buyers what you offer in one or two sentences.'
                  : 'Share a little about yourself or what you usually sell.'}
              </span>
            </label>
            <label className="check setup-consent">
              <input
                type="checkbox"
                name="contactConsent"
                required
                defaultChecked={defaults?.contactConsent}
              />
              <span>
                I have permission to share these contacts publicly and agree to the{' '}
                <Link href="/help#rules">platform rules</Link> and{' '}
                <Link href="/privacy">privacy policy</Link>.
              </span>
            </label>
            <p className="meta">Add a photo and socials later in My Profile.</p>
            {error ? <ErrorMessage message={error} /> : null}
            <div className="setup-actions">
              <button
                type="button"
                className="btn secondary"
                disabled={busy}
                onClick={() => advance(2)}
              >
                ← Back
              </button>
              <button className="btn" disabled={busy}>
                {busy ? 'Saving…' : 'Save and continue →'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="setup-ready">
            <span aria-hidden="true">✓</span>
            <strong>{selected === 'business' ? 'Business' : 'Personal'} profile ready</strong>
            <p>
              Your contact details will be available when you post. Adverts are reviewed before
              publication.
            </p>
          </div>
          {error ? <ErrorMessage message={error} /> : null}
          <div className="setup-actions">
            <Link href="/my-profile" className="btn secondary">
              View my profile
            </Link>
            <button className="btn" disabled={busy} onClick={startPosting}>
              {busy ? 'Opening…' : 'Start posting →'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
