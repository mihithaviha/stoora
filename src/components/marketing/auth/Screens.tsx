'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { EXPIRED, useAuth } from '@/lib/auth';
import { queryOf, type Query } from '@/lib/query';
import { safeNext } from '@/lib/supabase/config';
import { Ic } from '../bits';
import { cleanHandle } from '../landing/LandingContext';
import { AuthShell } from './AuthShell';
import { FormField, GoogleMark, OtpBoxes, useCountdown } from './parts';

const ERRORS: Record<string, string> = {
  not_configured: 'Sign-in is not set up on this site yet.',
  missing_code: 'Google did not finish signing you in. Please try again.',
  access_denied: 'You cancelled the sign-in. You can try again any time.',
};

const submitStyle = { height: 50 };

/** The two ways in: Google, or a 6-digit code sent to a WhatsApp number. Used by Log in and by Open a shop. */
function useSignIn(params: ReturnType<typeof queryOf>, next: string, existingOnly = false, startFlow = false, shop = '') {
  const router = useRouter();
  const auth = useAuth();
  const [phone, setPhone] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState<'' | 'google' | 'code'>('');
  const [error, setError] = useState(() => { const code = params.get('error'); return code ? ERRORS[code] ?? code : ''; });
  /** Log in only: the number has no account yet, so we ask whether this is their first time before making anything. */
  const [unknown, setUnknown] = useState('');
  const digits = phone.replace(/\D/g, '');
  const phoneError = tried && digits.length !== 10 ? 'Enter your 10-digit mobile number.' : undefined;

  // already signed in: go straight on
  useEffect(() => { if (auth.ready && auth.user && auth.mode === 'live') router.replace(next); }, [auth.ready, auth.user, auth.mode, next, router]);

  const google = async (target = next, opts?: { sample?: boolean }) => {
    setError(''); setBusy('google');
    const failed = await auth.signInWithGoogle('seller', target, { ...opts, back: startFlow ? `/shop/start${shop ? `?shop=${encodeURIComponent(shop)}` : ''}` : undefined });
    if (failed) { setError(failed); setBusy(''); }
  };
  const code = async (target = next) => {
    setTried(true); setError('');
    if (digits.length !== 10) return;
    setBusy('code');
    if (existingOnly) {
      // log in never makes an account by accident: an unknown number is asked about first
      const r = await auth.requestLoginCode(digits, false);
      if (r.unknown) { setUnknown(digits); setBusy(''); return; }
      if (!r.ok) { setError(r.error ?? 'We could not send the code. Try again.'); setBusy(''); return; }
    } else if (startFlow) {
      // Start for Free: is this number already used? If it is, they log in (the code is already on its way). If not, a new account is made.
      const known = await auth.requestLoginCode(digits, false);
      if (!known.unknown) {
        if (!known.ok) { setError(known.error ?? 'We could not send the code. Try again.'); setBusy(''); return; }
        router.push(`/login/verify?phone=${digits}&existing=1&next=${encodeURIComponent('/dashboard')}`); return;
      }
      const failed = await auth.sendCode(digits);
      if (failed) { setError(failed); setBusy(''); return; }
      router.push(`/login/verify?phone=${digits}&flow=start&next=${encodeURIComponent(target)}`);
      return;
    } else {
      const failed = await auth.sendCode(digits);
      if (failed) { setError(failed); setBusy(''); return; }
    }
    router.push(`/login/verify?phone=${digits}&next=${encodeURIComponent(target)}`);
  };
  /** "Yes, I'm new": send the code and make the account, then ask for the store name. */
  const startNew = async () => {
    setError(''); setBusy('code');
    const failed = await auth.sendCode(unknown);
    if (failed) { setError(failed); setBusy(''); return; }
    router.push(`/login/verify?phone=${unknown}&next=${encodeURIComponent('/onboarding')}`);
  };
  /** "No, I used Google before": sign in with Google once; the dashboard then asks to prove this number, which joins the two. */
  const usedGoogle = async () => {
    setError(''); setBusy('google');
    const failed = await auth.signInWithGoogle('seller', `/dashboard?phone=${unknown}`);
    if (failed) { setError(failed); setBusy(''); }
  };
  return { auth, phone, setPhone, phoneError, busy, error, setError, google, code, unknown, setUnknown, startNew, usedGoogle };
}

function Banners({ demo, error }: { demo: boolean; error: string }) {
  return (
    <>
      {demo && <div className="banner info"><Ic n="science" /><span><b>Demo mode.</b> No account is needed: Google signs you in as the sample shop, and the code is <b className="num">123456</b>.</span></div>}
      {error && <div className="banner bad" role="alert"><Ic n="error" /><span>{error}</span></div>}
    </>
  );
}

function PhoneField({ id, value, onChange, error, hint = 'We send a 6-digit code to this number. No password is needed.' }: { id: string; value: string; onChange: (v: string) => void; error?: string; hint?: string }) {
  return (
    <FormField id={id} label="WhatsApp mobile number" hint={hint} error={error}>
      <div className="phone-row">
        {/* the country code has its own box; Stoora is India-only for now, so it shows +91 and cannot be changed */}
        <span className="cc-box" role="img" aria-label="Country code plus 91, India">+91</span>
        <div className={`affix${error ? ' bad' : ''}`}>
          <input id={id} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" value={value} aria-invalid={error ? true : undefined} onChange={(e) => onChange(e.target.value.replace(/[^\d ]/g, '').slice(0, 11))} />
        </div>
      </div>
    </FormField>
  );
}

export function LoginScreen({ q }: { q: Query }) {
  const params = queryOf(q);
  const next = safeNext(params.get('next'), '/dashboard');
  const { auth, phone, setPhone, phoneError, busy, error, google, code, unknown, setUnknown, startNew, usedGoogle } = useSignIn(params, next, true);
  if (unknown) return (
    <AuthShell>
      <button className="link" type="button" style={{ justifySelf: 'start' }} onClick={() => setUnknown('')}><Ic n="arrow_back" c="xs" />Change number</button>
      <div className="stack tight">
        <span className="eyebrow">New number</span>
        <h1>Is this your first time on Stoora?</h1>
        <p className="t-body">We don’t know +91 {unknown.slice(0, 2)}••• ••{unknown.slice(-3)} yet.</p>
      </div>
      <Banners demo={auth.mode === 'demo'} error={error} />
      <button className="btn primary full" type="button" style={submitStyle} disabled={busy !== ''} onClick={startNew}>{busy === 'code' ? 'Sending code…' : 'Yes, I’m new. Open a shop'}</button>
      <button className="gbtn" type="button" disabled={busy !== ''} onClick={usedGoogle}><GoogleMark />{busy === 'google' ? 'Opening Google…' : 'No, I used Google before'}</button>
      <p className="auth-note"><Ic n="info" /><span>If you signed up with Google, sign in with it once. We then ask you to confirm this number with a code, and from then on both open the same shop.</span></p>
    </AuthShell>
  );
  return (
    <AuthShell>
      <div className="stack tight">
        <span className="eyebrow">Log in</span>
        <h1>Welcome back.</h1>
        <p className="t-body">{params.get('next') ? 'Log in to continue to your dashboard.' : 'See today’s orders and money.'}</p>
      </div>
      <Banners demo={auth.mode === 'demo'} error={error} />
      <button className="gbtn" type="button" onClick={() => google()} disabled={busy !== ''}><GoogleMark />{busy === 'google' ? 'Opening Google…' : 'Continue with Google'}</button>
      <div className="or">or with a WhatsApp code</div>
      <form className="stack" noValidate onSubmit={(e: FormEvent) => { e.preventDefault(); code(); }}>
        <PhoneField id="li-phone" value={phone} onChange={setPhone} error={phoneError} />
        <button className="btn primary full" type="submit" style={submitStyle} disabled={busy !== ''}>{busy === 'code' ? 'Sending code…' : 'Get WhatsApp code'}</button>
      </form>
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
  // Nothing is asked up front but the way in. The store name and link come right after the code (or Google), in the shop setup.
  const target = `/onboarding${shop ? `?handle=${encodeURIComponent(shop)}` : ''}`;
  const { auth, phone, setPhone, phoneError, busy, error, google, code } = useSignIn(params, target, false, true, shop);
  return (
    <AuthShell handle={shop}>
      <div className="stack tight">
        <span className="eyebrow">Start for Free</span>
        <h1>Start selling from one link.</h1>
        <p className="t-body">Sign up with your WhatsApp number or with Google. No password, and no email-only sign-up.</p>
      </div>
      <Banners demo={auth.mode === 'demo'} error={error} />
      <form className="stack" noValidate onSubmit={(e: FormEvent) => { e.preventDefault(); code(target); }}>
        <PhoneField id="su-phone" value={phone} onChange={setPhone} error={phoneError} hint="We send a 6-digit code to this number." />
        <button className="btn primary full" type="submit" style={submitStyle} disabled={busy !== ''}>{busy === 'code' ? 'Sending code…' : 'Get WhatsApp code'}</button>
      </form>
      <div className="or">or</div>
      <button className="gbtn" type="button" disabled={busy !== ''} onClick={() => google(target)}><GoogleMark />{busy === 'google' ? 'Opening Google…' : 'Continue with Google'}</button>
      <p className="cap" style={{ textAlign: 'center' }}>By continuing you agree to the <Link href="/terms" className="link" style={{ display: 'inline' }} target="_blank" rel="noopener">terms</Link> and the <Link href="/privacy" className="link" style={{ display: 'inline' }} target="_blank" rel="noopener">privacy policy</Link>.</p>
      <p className="t-body" style={{ textAlign: 'center' }}>Already have a shop? <Link href="/login" className="link">Log in</Link></p>
    </AuthShell>
  );
}

export function VerifyScreen({ q }: { q: Query }) {
  const router = useRouter();
  const params = queryOf(q);
  const auth = useAuth();
  const phone = (params.get('phone') || '').replace(/\D/g, '').slice(-10);
  const next = safeNext(params.get('next'), '/dashboard');
  const existing = params.get('existing') === '1';
  const isStart = params.get('flow') === 'start';
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState('');
  const [tries, setTries] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [note, setNote] = useState('');
  const { left, again } = useCountdown(30);
  const masked = phone ? `+91 ${phone.slice(0, 2)}••• ••${phone.slice(-3)}` : 'your number';
  const locked = tries >= 5;

  const verify = async (value = code) => {
    if (value.length < 6 || busy || locked) return;
    setBusy(true);
    const failed = await auth.verifyCode(phone, value, 'seller');
    setBusy(false);
    if (failed === EXPIRED) { // an old code is replaced by a new one on the spot, and it does not count as a wrong try
      const resent = await auth.sendCode(phone); again();
      setCode(''); setWrong(''); setNote(resent ? resent : EXPIRED); return;
    }
    if (failed) { setWrong(failed); setTries((n) => n + 1); setCode(''); return; }
    setDone(true);
    setTimeout(() => router.push(next), 700);
  };
  useEffect(() => { if (code.length === 6 && !wrong) verify(code); }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  if (done) {
    return (
      <AuthShell>
        <div className="auth-done"><span className="big-ok"><Ic n="check" /></span><h1>You’re in</h1><p className="t-body">Taking you to your dashboard…</p></div>
      </AuthShell>
    );
  }
  if (locked) {
    return (
      <AuthShell>
        <div className="auth-done">
          <span className="big-ok" style={{ background: 'var(--negative-tint)', color: 'var(--negative-deep)' }}><Ic n="lock" /></span>
          <h1>Too many tries</h1>
          <p className="t-body">For your safety we paused this sign-in for 10 minutes. You can try again after that, or continue with Google.</p>
          <Link className="btn line" href="/login">Back to log in</Link>
        </div>
      </AuthShell>
    );
  }
  return (
    <AuthShell>
      <Link className="link" href={isStart || existing ? '/shop/start' : '/login'} style={{ justifySelf: 'start' }}><Ic n="arrow_back" c="xs" />Change number</Link>
      <div className="stack tight">
        <span className="eyebrow">Check WhatsApp</span>
        <h1>Enter the 6-digit code</h1>
        <p className="t-body">We sent a code to <b className="t-ink">{masked}</b>. It works for 10 minutes.</p>
      </div>
      {existing && <div className="banner info" role="status"><Ic n="info" /><span>This number already has a Stoora account. Enter the code to log in.</span></div>}
      <form className="stack" onSubmit={(e: FormEvent) => { e.preventDefault(); verify(); }}>
        <OtpBoxes value={code} onChange={(v) => { setCode(v); setWrong(''); }} error={!!wrong} />
        {wrong && <p className="err" role="alert"><Ic n="error" c="xs" />{wrong} {5 - tries} {5 - tries === 1 ? 'try' : 'tries'} left.</p>}
        <button className="btn primary full" type="submit" style={submitStyle} disabled={code.length < 6 || busy}>{busy ? 'Checking…' : 'Verify and continue'}</button>
      </form>
      <p className="t-body" style={{ textAlign: 'center' }}>
        {left > 0
          ? <>Send a new code in <b className="num t-ink">0:{String(left).padStart(2, '0')}</b></>
          : <button className="link" type="button" onClick={async () => { const failed = await auth.sendCode(phone); again(); setCode(''); setWrong(''); setNote(failed ?? 'A new code is on its way.'); }}>Send a new code</button>}
      </p>
      {note && <p className="cap" style={{ textAlign: 'center' }} role="status">{note}</p>}
      <p className="cap" style={{ textAlign: 'center' }}>Code not coming? <button className="link" type="button" onClick={() => auth.signInWithGoogle('seller', next, { back: isStart ? '/shop/start' : undefined })}>Use Google instead</button></p>
      {auth.mode === 'demo' && <div className="banner info"><Ic n="science" /><span><b>Demo:</b> no message is sent. Use code <b className="num">123456</b>.</span></div>}
    </AuthShell>
  );
}

export function ForgotScreen() {
  return (
    <AuthShell>
      <div className="stack tight">
        <span className="eyebrow">Password</span>
        <h1>There is no password to reset.</h1>
        <p className="t-body">Stoora signs you in with Google, or with a 6-digit code sent to your WhatsApp. Nothing to remember, and nothing to forget.</p>
      </div>
      <Link className="btn primary full" href="/login" style={submitStyle}>Go to log in</Link>
      <p className="t-body" style={{ textAlign: 'center' }}><Link href="/login" className="link"><Ic n="arrow_back" c="sm" />Back to log in</Link></p>
    </AuthShell>
  );
}
