'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
export function AccountModeSwitch({
  mode,
  destination,
  className,
}: {
  mode: 'buyer' | 'seller';
  destination?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  return (
    <>
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            await api('me/mode', 'POST', { mode });
            router.push(destination ?? (mode === 'seller' ? '/my-adverts' : '/'));
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not switch view.');
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Switching…' : mode === 'buyer' ? 'Switch to buyer' : 'Switch to seller'}
      </button>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
