'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { ErrorMessage, Loading } from './ui';
type Claimant = {
  id: string;
  name: string | null;
  email: string;
  conflict: boolean;
  replaceable: boolean;
};
export function AdminHandover({
  advertiserId,
  onComplete,
}: {
  advertiserId: string;
  onComplete: () => void;
}) {
  const [users, setUsers] = useState<Claimant[]>([]);
  const [selected, setSelected] = useState('');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  return (
    <details className="panel admin-block handover-panel">
      <summary>Assign verified owner</summary>
      <p>
        Verify ownership and consent directly before handing over management. Advert IDs, images and
        business URLs stay unchanged.
      </p>
      <form
        className="admin-search"
        onSubmit={async (e) => {
          e.preventDefault();
          const q = String(new FormData(e.currentTarget).get('q') ?? '').trim();
          setLoading(true);
          setError('');
          setSelected('');
          setSearched(false);
          try {
            setUsers(
              await api<Claimant[]>(
                `admin/advertisers/${advertiserId}/claimants?q=${encodeURIComponent(q)}`,
              ),
            );
            setSearched(true);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not find accounts.');
          } finally {
            setLoading(false);
          }
        }}
      >
        <label className="form-group">
          <span className="form-label">Find verified account by name or email</span>
          <input
            className="field-input"
            name="q"
            minLength={2}
            maxLength={100}
            required
            type="search"
          />
        </label>
        <button className="btn secondary" disabled={loading || busy}>
          Find account
        </button>
      </form>
      {loading ? <Loading label="Finding verified accounts…" /> : null}
      {searched && !users.length ? (
        <p>No matching verified accounts. Ask the owner to sign in first.</p>
      ) : null}
      {users.length ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            setError('');
            try {
              await api(`admin/advertisers/${advertiserId}/claim`, 'POST', {
                userId: selected,
                evidenceReference: f.get('evidence'),
                contactVerified: f.get('ownership') === 'on',
                consent: f.get('consent') === 'on',
                replaceUnusedPersonal: f.get('replaceUnused') === 'on',
              });
              setDone(true);
              onComplete();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not assign this owner.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy || done}>
            <legend>Verified account</legend>
            {users.map((u) => (
              <label className="check" key={u.id}>
                <input
                  type="radio"
                  name="owner"
                  value={u.id}
                  checked={selected === u.id}
                  onChange={() => setSelected(u.id)}
                  disabled={u.conflict}
                  required
                />
                <span>
                  {u.name ?? 'Account'} · {u.email}
                  {u.conflict ? ' — already has this identity type' : ''}
                </span>
              </label>
            ))}
            {users.find((u) => u.id === selected)?.replaceable ? (
              <label className="check" key={selected}>
                <input type="checkbox" name="replaceUnused" required />
                <span>
                  Replace this account’s unused automatic personal profile. Existing assisted
                  adverts and their history will stay with the assigned profile.
                </span>
              </label>
            ) : null}
            <label className="form-group">
              <span className="form-label">Private verification evidence reference</span>
              <input
                className="field-input"
                name="evidence"
                minLength={5}
                maxLength={200}
                required
              />
              <span className="helper">
                Record a reference to your verification, not passwords or identity documents.
              </span>
            </label>
            <label className="check">
              <input type="checkbox" name="ownership" required />
              <span>I verified that this account belongs to the advertiser.</span>
            </label>
            <label className="check">
              <input type="checkbox" name="consent" required />
              <span>The advertiser consented to this handover.</span>
            </label>
            <button className="btn" disabled={!selected || busy || done}>
              {busy ? 'Assigning…' : 'Confirm handover'}
            </button>
          </fieldset>
        </form>
      ) : null}
      {error ? <ErrorMessage message={error} /> : null}
      {done ? <p role="status">Management handed over to the verified owner.</p> : null}
    </details>
  );
}
