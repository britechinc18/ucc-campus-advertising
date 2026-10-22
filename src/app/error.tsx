'use client';
import { ErrorMessage } from '@/components/ui';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="container narrow">
      <h1>Let’s try that again.</h1>
      <ErrorMessage message="This page couldn’t be loaded. Please retry in a moment." />
      <button className="btn" style={{ marginTop: 20 }} onClick={reset}>
        Try again
      </button>
    </main>
  );
}
