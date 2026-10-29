'use client';
import { useEffect } from 'react';
import { ButtonLink } from '@/components/ui';
import { RetryButton, StateScreen } from '@/components/bits';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main id="main" style={{ minHeight: '100dvh', background: 'var(--surface)' }}>
      <StateScreen kind="error" title="Something went wrong" text="That’s on us, not you. Nothing was lost. Try again, and if it keeps happening, tell us." actions={<><RetryButton onClick={reset} /><ButtonLink href="/">Go to the home page</ButtonLink></>} />
      {error.digest && <p className="cap" style={{ textAlign: 'center' }}>Reference: {error.digest}</p>}
    </main>
  );
}
