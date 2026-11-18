'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { queryOf, type Query } from '@/lib/query';
import { safeNext } from '@/lib/supabase/config';
import { Ic } from '../bits';
import { cleanHandle } from '../landing/LandingContext';
import { AuthShell } from './AuthShell';
import { GoogleMark } from './parts';

const ERRORS: Record<string, string> = {
  not_configured: 'Sign-in is not set up on this site yet.',
  missing_code: 'Google did not finish signing you in. Please try again.',
  access_denied: 'You cancelled the sign-in. You can try again any time.',
};

const submitStyle = { height: 50 };

/** The one way in: Google. Used by Log in and by Open a shop. */
function useSignIn(params: ReturnType<typeof queryOf>, next: string, startFlow = false, shop = '') {
  const router = useRouter();
  const auth = useAuth();
  const [busy, setBusy] = useState<'' | 'google'>('');
  const [error, setError] = useState(() => { const code = params.get('error'); return code ? ERRORS[code] ?? code : ''; });

  // already signed in: go straight on
  useEffect(() => { if (auth.ready && auth.user && auth.mode === 'live') router.replace(next); }, [auth.ready, auth.user, auth.mode, next, router]);

  const google = async (target = next, opts?: { sample?: boolean }) => {
    setError(''); setBusy('google');
    const failed = await auth.signInWithGoogle('seller', target, { ...opts, back: startFlow ? `/shop/start${shop ? `?shop=${encodeURIComponent(shop)}` : ''}` : undefined });
    if (failed) { setError(failed); setBusy(''); }
  };
  return { auth, busy, error, setError, google };
}

function Banners({ demo, error }: { demo: boolean; error: string }) {
  return (
    <>
      {demo && <div className="banner info"><Ic n="science" /><span><b>Demo mode.</b> No account is needed: Google signs you in as the sample shop.</span></div>}
      {error && <div className="banner bad" role="alert"><Ic n="error" /><span>{error}</span></div>}
    </>
  );
}

export function LoginScreen({ q }: { q: Query }) {
  const params = queryOf(q);
  const next = safeNext(params.get('next'), '/dashboard');
  const { auth, busy, error, google } = useSignIn(params, next);
  return (
    <AuthShell>
      <div className="stack tight">
        <span className="eyebrow">Log in</span>
        <h1>Welcome back.</h1>
        <p className="t-body">{params.get('next') ? 'Log in to continue to your dashboard.' : 'See today’s orders and money.'}</p>
      </div>
      <Banners demo={auth.mode === 'demo'} error={error} />
      <button className="gbtn" type="button" onClick={() => google()} disabled={busy !== ''}><GoogleMark />{busy === 'google' ? 'Opening Google…' : 'Continue with Google'}</button>
      {auth.mode === 'demo' && (
        <div className="inner stack tight" style={{ padding: 'var(--s3)' }}>
          <span className="t-ink" style={{ fontWeight: 500 }}>Want to look around first?</span>
          <p className="cap">Open the sample shop, Meera Studio. Nothing is saved and no account is needed.</p>
          <button className="btn line sm" type="button" style={{ justifySelf: 'start' }} onClick={() => google('/dashboard', { sample: true })}>Use the sample shop</button>
        </div>
      )}
      <p className="t-body" style={{ textAlign: 'center' }}>New to Stoora? <Link href="/shop/start" className="link">Start for Free</Link></p>
      <p className="cap" style={{ textAlign: 'center' }}>Buying something? <Link href="/buyer/login" className="link">Buyer sign-in</Link></p>
    </AuthShell>
  );
}

export function StartScreen({ q }: { q: Query }) {
  const params = queryOf(q);
  const shop = cleanHandle(params.get('shop') ?? '').replace(/-/g, '');
  // Nothing is asked up front but the way in. The store name and link come right after signing in, in the shop setup.
  const target = `/onboarding${shop ? `?handle=${encodeURIComponent(shop)}` : ''}`;
  const { auth, busy, error, google } = useSignIn(params, target, true, shop);
  return (
    <AuthShell handle={shop}>
      <div className="stack tight">
        <span className="eyebrow">Start for Free</span>
        <h1>Start selling from one link.</h1>
        <p className="t-body">Sign up with Google. No password, and no email-only sign-up.</p>
      </div>
      <Banners demo={auth.mode === 'demo'} error={error} />
      <button className="gbtn" type="button" disabled={busy !== ''} onClick={() => google(target)}><GoogleMark />{busy === 'google' ? 'Opening Google…' : 'Continue with Google'}</button>
      <p className="cap" style={{ textAlign: 'center' }}>By continuing you agree to the <Link href="/terms" className="link" style={{ display: 'inline' }} target="_blank" rel="noopener">terms</Link> and the <Link href="/privacy" className="link" style={{ display: 'inline' }} target="_blank" rel="noopener">privacy policy</Link>.</p>
      <p className="t-body" style={{ textAlign: 'center' }}>Already have a shop? <Link href="/login" className="link">Log in</Link></p>
    </AuthShell>
  );
}

export function ForgotScreen() {
  return (
    <AuthShell>
      <div className="stack tight">
        <span className="eyebrow">Password</span>
        <h1>There is no password to reset.</h1>
        <p className="t-body">Stoora signs sellers in with Google. Nothing to remember, and nothing to forget.</p>
      </div>
      <Link className="btn primary full" href="/login" style={submitStyle}>Go to log in</Link>
      <p className="t-body" style={{ textAlign: 'center' }}><Link href="/login" className="link"><Ic n="arrow_back" c="sm" />Back to log in</Link></p>
    </AuthShell>
  );
}
