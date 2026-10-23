'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { safeReturn } from '@/lib/market';
import { ErrorMessage } from './ui';
export function Onboarding({
  name,
  next,
  kind,
}: {
  name: string;
  next: string;
  kind?: 'student' | 'business';
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        setError('');
        try {
          await api('me/profile', 'POST', {
            name: f.get('name'),
            kind: kind ?? f.get('kind'),
            consent: true,
          });
          await api('me/mode', 'POST', { mode: 'seller' });
          router.replace(safeReturn(next));
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not create profile.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="form-group">
        <span className="form-label">Advertiser name</span>
        <input
          className="field-input"
          name="name"
          defaultValue={name}
          minLength={2}
          maxLength={100}
          required
          autoComplete="name"
        />
      </label>
      <label className="form-group">
        <span className="form-label">I’m advertising as</span>
        <select className="field-input" name="kind" value={kind} disabled={!!kind}>
          <option value="student">A student</option>
          <option value="business">A business</option>
        </select>
      </label>
      <label className="check" style={{ marginTop: 20, alignItems: 'flex-start' }}>
        <input type="checkbox" required />
        <span>
          I consent to create an advertiser profile and agree to publish only accurate adverts and
          contacts I have permission to share.
        </span>
      </label>
      {error ? <ErrorMessage message={error} /> : null}
      <button className="btn" disabled={busy}>
        {busy ? 'Activating…' : 'Activate seller tools'}
      </button>
      <p className="meta">
        One login can have a personal profile and one business. Posting limits are shared.
      </p>
    </form>
  );
}
