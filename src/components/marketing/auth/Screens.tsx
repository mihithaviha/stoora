'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
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
function useSignIn(next: string) {
  const router = useRouter();
  const params = useSearchParams();
  const auth = useAuth();
  const [phone, setPhone] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState<'' | 'google' | 'code'>('');
  const [error, setError] = useState(() => { const code = params.get('error'); return code ? ERRORS[code] ?? code : ''; });
  const digits = phone.replace(/\D/g, '');
  const phoneError = tried && digits.length !== 10 ? 'Enter your 10-digit mobile number.' : undefined;

  // already signed in: go straight on
  useEffect(() => { if (auth.ready && auth.user && auth.mode === 'live') router.replace(next); }, [auth.ready, auth.user, auth.mode, next, router]);

  const google = async (target = next) => {
    setError(''); setBusy('google');
    const failed = await auth.signInWithGoogle('seller', target);
    if (failed) { setError(failed); setBusy(''); }
  };
  const code = async (target = next) => {
    setTried(true); setError('');
    if (digits.length !== 10) return;
    setBusy('code');
    const failed = await auth.sendCode(digits);
    if (failed) { setError(failed); setBusy(''); return; }
    router.push(`/login/verify?phone=${digits}&next=${encodeURIComponent(target)}`);
  };
  return { auth, phone, setPhone, phoneError, busy, error, setError, google, code };
}

function Banners({ demo, error }: { demo: boolean; error: string }) {
  return (
    <>
      {demo && <div className="banner info"><Ic n="science" /><span><b>Demo mode.</b> No account is needed: Google signs you in as the sample shop, and the code is <b className="num">123456</b>.</span></div>}
      {error && <div className="banner bad" role="alert"><Ic n="error" /><span>{error}</span></div>}
    </>
  );
}

function PhoneField({ id, value, onChange, error }: { id: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <FormField id={id} label="WhatsApp mobile number" hint="We send a 6-digit code to this number. No password is needed." error={error}>
      <div className={`affix${error ? ' bad' : ''}`}>
        <span aria-hidden="true">+91</span>
        <input id={id} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" value={value} aria-invalid={error ? true : undefined} onChange={(e) => onChange(e.target.value.replace(/[^\d ]/g, '').slice(0, 11))} />
      </div>
    </FormField>
  );
}

export function LoginScreen() {
  const params = useSearchParams();
  const next = safeNext(params.get('next'), '/dashboard');
  const { auth, phone, setPhone, phoneError, busy, error, google, code } = useSignIn(next);
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
          <button className="btn line sm" type="button" style={{ justifySelf: 'start' }} onClick={() => google('/dashboard')}>Use the sample shop</button>
        </div>
      )}
      <p className="t-body" style={{ textAlign: 'center' }}>New to Stoora? <Link href="/signup" className="link">Open a shop</Link></p>
      <p className="cap" style={{ textAlign: 'center' }}>Buying something? <Link href="/buyer/login" className="link">Buyer sign-in</Link></p>
    </AuthShell>
  );
}

export function SignupScreen() {
  const params = useSearchParams();
  const [name, setName] = useState('');
  const [typedHandle, setTypedHandle] = useState(() => cleanHandle(params.get('shop') ?? '').replace(/-/g, ''));
  const [touched, setTouched] = useState(Boolean(params.get('shop')));
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; handle?: string; terms?: string }>({});
  const handle = cleanHandle(typedHandle);
  const target = `/onboarding?name=${encodeURIComponent(name.trim())}&handle=${encodeURIComponent(handle)}`;
  const { auth, phone, setPhone, phoneError, busy, error, google, code } = useSignIn(target);

  const shopName = (value: string) => {
    setName(value);
    if (!touched) setTypedHandle(cleanHandle(value).replace(/-/g, ''));
  };
  /** Both ways in need a shop name, a link and the terms first. */
  const valid = () => {
    const next = {
      name: name.trim() ? undefined : 'Add your shop’s name.',
      handle: handle.length >= 3 ? undefined : 'Use at least 3 letters or numbers.',
      terms: terms ? undefined : 'Agree to the terms and the privacy policy to open a shop.',
    };
    setErrors(next);
    return !next.name && !next.handle && !next.terms;
  };

  return (
    <AuthShell handle={handle}>
      <div className="stack tight">
        <span className="eyebrow">Open a shop</span>
        <h1>Start selling from one link.</h1>
        <p className="t-body">A shop name and a link. Everything else can wait.</p>
      </div>
      <Banners demo={auth.mode === 'demo'} error={error} />
      <div className="stack">
        <FormField id="su-shop" label="Shop name" error={errors.name}>
          <input className={`input${errors.name ? ' bad' : ''}`} id="su-shop" autoComplete="organization" placeholder="Meera Studio" value={name} onChange={(e) => shopName(e.target.value)} aria-invalid={errors.name ? true : undefined} />
        </FormField>
        <FormField id="su-handle" label="Shop link" hint="Letters, numbers and dashes." error={errors.handle}>
          <div className={`affix${errors.handle ? ' bad' : ''}`}>
            <span>stoora.in/</span>
            <input id="su-handle" autoCapitalize="none" spellCheck={false} maxLength={30} placeholder="meerastudio" value={typedHandle} aria-invalid={errors.handle ? true : undefined}
              onChange={(e) => { setTouched(true); setTypedHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }} />
          </div>
        </FormField>
        <div className="field">
          <label className="check" htmlFor="su-terms" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <input type="checkbox" id="su-terms" style={{ marginTop: 3 }} checked={terms} onChange={(e) => setTerms(e.target.checked)} />
            <span>I agree to the <Link href="/terms" className="link" target="_blank" rel="noopener">terms</Link> and the <Link href="/privacy" className="link" target="_blank" rel="noopener">privacy policy</Link>.</span>
          </label>
          {errors.terms ? <span className="err" role="alert"><Ic n="error" c="xs" />{errors.terms}</span> : null}
        </div>
      </div>
      <button className="gbtn" type="button" disabled={busy !== ''} onClick={() => { if (valid()) google(target); }}><GoogleMark />{busy === 'google' ? 'Opening Google…' : 'Continue with Google'}</button>
      <div className="or">or with a WhatsApp code</div>
      <form className="stack" noValidate onSubmit={(e: FormEvent) => { e.preventDefault(); if (valid()) code(target); }}>
        <PhoneField id="su-phone" value={phone} onChange={setPhone} error={phoneError} />
        <button className="btn primary full" type="submit" style={submitStyle} disabled={busy !== ''}>{busy === 'code' ? 'Sending code…' : 'Create my shop'}</button>
      </form>
      <p className="auth-note"><Ic n="info" /><span>There is no password to remember. Stoora signs you in with Google or a code sent to your WhatsApp.</span></p>
      <p className="t-body" style={{ textAlign: 'center' }}>Already have a shop? <Link href="/login" className="link">Log in</Link></p>
    </AuthShell>
  );
}

export function VerifyScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const auth = useAuth();
  const phone = (params.get('phone') || '').replace(/\D/g, '').slice(-10);
  const next = safeNext(params.get('next'), '/dashboard');
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
      <Link className="link" href="/login" style={{ justifySelf: 'start' }}><Ic n="arrow_back" c="xs" />Change number</Link>
      <div className="stack tight">
        <span className="eyebrow">Check WhatsApp</span>
        <h1>Enter the 6-digit code</h1>
        <p className="t-body">We sent a code to <b className="t-ink">{masked}</b>. It works for 10 minutes.</p>
      </div>
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
