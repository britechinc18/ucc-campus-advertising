'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Dialog, ErrorMessage } from './ui';
export function BusinessLifecycle({
  name,
  deactivated,
  reactivationPending,
}: {
  name: string;
  deactivated: boolean;
  reactivationPending: boolean;
}) {
  const [action, setAction] = useState<'deactivate' | 'reactivate' | 'close' | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const router = useRouter();
  return (
    <section className="panel profile-review">
      <h2>Business availability</h2>
      <p>
        {reactivationPending
          ? 'Reactivation is awaiting administrator review.'
          : deactivated
            ? 'Your storefront and associated adverts are hidden.'
            : 'Your approved storefront and eligible adverts can appear publicly.'}
      </p>
      <div className="form-actions">
        <button
          className="btn secondary"
          disabled={reactivationPending}
          onClick={() => {
            setError('');
            setAction(deactivated ? 'reactivate' : 'deactivate');
          }}
        >
          {deactivated ? 'Request reactivation' : 'Deactivate business'}
        </button>
        <button
          className="btn quiet"
          onClick={() => {
            setError('');
            setAction('close');
          }}
        >
          Close business
        </button>
      </div>
      {action ? (
        <Dialog
          title={
            action === 'close'
              ? 'Close this business'
              : action === 'deactivate'
                ? 'Deactivate business'
                : 'Request reactivation'
          }
          onClose={() => !busy && setAction(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                await api('me/business/lifecycle', 'POST', {
                  action,
                  confirm: true,
                  ...(action === 'close'
                    ? { name: new FormData(e.currentTarget).get('name') }
                    : {}),
                });
                setAction(null);
                if (action === 'close') router.push('/my-medstash');
                router.refresh();
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : 'Could not update business availability.',
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>
              {action === 'close'
                ? 'Closing withdraws active adverts and cancels unfinished submissions. Your personal profile and account remain. Historic records and the old URL are retained; you may create one replacement business.'
                : action === 'deactivate'
                  ? 'Hide your storefront and associated adverts. Expiry dates and shared posting usage do not reset.'
                  : 'An administrator will review reactivation. Only approved, unexpired content can return; privacy-held adverts need their own review.'}
            </p>
            {action === 'close' ? (
              <label className="form-group">
                <span className="form-label">Type {name} to confirm</span>
                <input className="field-input" name="name" required autoComplete="off" />
              </label>
            ) : null}
            <label className="check">
              <input type="checkbox" required />
              <span>I understand and confirm this action.</span>
            </label>
            {error ? <ErrorMessage message={error} /> : null}
            <button className="btn" disabled={busy}>
              Confirm
            </button>
          </form>
        </Dialog>
      ) : null}
    </section>
  );
}
