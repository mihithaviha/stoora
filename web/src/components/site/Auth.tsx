'use client';
// Sign in for sellers and buyers: Google first, or a 6-digit code sent to a WhatsApp number. No passwords.
// Live mode (Supabase keys set) uses real Google sign-in and real codes; demo mode signs in as the sample shop and accepts 123456.
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Button, Field, Icon } from '../ui';
import { Logo, OtpInput, useCountdown } from '../bits';
import { useAuth } from '@/lib/auth';
import { safeNext } from '@/lib/supabase/config';

export type RoleName = 'seller' | 'buyer';
const COPY = {
  seller: { eyebrow: 'Sign in to Stoora', title: ['Start with an account ', 'you already use.'], lede: 'Continue with Google or a WhatsApp code to open your shop or return to your dashboard.', base: '/login', next: '/dashboard', swap: ['Buying on Stoora?', 'Buyer sign-in', '/buyer/login'], art: ['Run your shop from your phone.', 'Orders, stock and payments, always one tap away.'] },
  buyer: { eyebrow: 'Buyer sign-in', title: ['See your orders, ', 'anywhere.'], lede: 'Continue with Google or a WhatsApp code to track parcels and check out faster.', base: '/buyer/login', next: '/buyer/orders', swap: ['Selling on Stoora?', 'Seller sign-in', '/login'], art: ['Your orders, all in one place.', 'Track every parcel and reorder in a tap.'] },
} as const;

export function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3.1-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
  );
}

export function AuthFrame({ role, children }: { role: RoleName; children: React.ReactNode }) {
  const c = COPY[role];
  return (
    <div className="authwrap">
      <main id="main" className="auth-main">
        <div className="auth-top"><Logo /><Link className="link" href="/"><Icon name="arrow_back" size="xs" />Back to the website</Link></div>
        <div className="auth-box">{children}</div>
        <p className="cap" style={{ textAlign: 'center' }}><Link className="link" href="/terms">Terms</Link> · <Link className="link" href="/privacy">Privacy</Link> · {c.swap[0]} <Link className="link" href={c.swap[2]}>{c.swap[1]}</Link></p>
      </main>
      <aside className="auth-art" aria-hidden="true"><span className="blob" style={{ width: 340, height: 340, right: -90, top: -90 }} /><span className="blob" style={{ width: 200, height: 200, left: 40, top: 180 }} /><h2>{c.art[0]}</h2><p>{c.art[1]}</p></aside>
    </div>
  );
}

const ERRORS: Record<string, string> = { not_configured: 'Sign-in is not set up on this site yet.', missing_code: 'Google did not finish signing you in. Please try again.', access_denied: 'You cancelled the sign-in. You can try again any time.' };

export function LoginForm({ role }: { role: RoleName }) {
  const c = COPY[role]; const router = useRouter(); const sp = useSearchParams(); const auth = useAuth();
  const next = safeNext(sp.get('next'), c.next);
  const [phone, setPhone] = useState(''); const [tried, setTried] = useState(false); const [busy, setBusy] = useState<'' | 'google' | 'code'>(''); const [error, setError] = useState(() => { const e = sp.get('error'); return e ? ERRORS[e] ?? e : ''; });
  const digits = phone.replace(/\D/g, '');
  const phoneErr = tried && digits.length !== 10 ? 'Enter your 10-digit mobile number.' : undefined;

  // already signed in: go straight on
  useEffect(() => { if (auth.ready && auth.user && auth.mode === 'live') router.replace(next); }, [auth.ready, auth.user, auth.mode, next, router]);

  const google = async () => { setError(''); setBusy('google'); const e = await auth.signInWithGoogle(role, next); if (e) { setError(e); setBusy(''); } };
  const code = async () => {
    setTried(true); setError(''); if (digits.length !== 10) return; setBusy('code');
    const e = await auth.sendCode(digits);
    if (e) { setError(e); setBusy(''); return; }
    router.push(`${c.base}/verify?phone=${digits}&next=${encodeURIComponent(next)}`);
  };
  return (
    <>
      <div className="stack tight"><span className="eyebrow">{c.eyebrow}</span><h1 className="h1" style={{ fontFamily: 'var(--font-logo)', fontWeight: 900, letterSpacing: '-.02em' }}>{c.title[0]}<em style={{ color: 'var(--primary)', fontStyle: 'italic' }}>{c.title[1]}</em></h1><p className="t-body">{c.lede}</p></div>
      {auth.mode === 'demo' && <div className="banner info"><Icon name="science" /><span><b>Demo mode.</b> No account is needed: Google signs you in as the sample shop, and the code is <b className="num">123456</b>.</span></div>}
      {error && <div className="banner bad" role="alert"><Icon name="error" /><span>{error}</span></div>}
      <Button full className="google-btn" onClick={google} busy={busy === 'google'} busyLabel="Opening Google…" disabled={busy === 'code'}><GoogleLogo />Continue with Google</Button>
      <div className="divider">OR SIGN IN WITH WHATSAPP</div>
      <form className="stack" noValidate onSubmit={(e) => { e.preventDefault(); code(); }}>
        <Field id="lg-phone" label="WhatsApp mobile number" required error={phoneErr} hint="We send a 6-digit code to this number. No password is needed.">
          <div className={`affix ${phoneErr ? 'bad' : ''}`}><span aria-hidden="true">+91</span><input id="lg-phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, '').slice(0, 11))} /></div>
        </Field>
        <Button kind="ink" full type="submit" icon="chat" busy={busy === 'code'} busyLabel="Sending code…" disabled={busy === 'google'}>Get WhatsApp code</Button>
      </form>
      <p className="cap" style={{ textAlign: 'center' }}>{role === 'seller' ? <>New to Stoora? Signing in creates your account. <Link className="link" href="/onboarding">See how setup works</Link></> : <>First time? Signing in creates your account. <Link className="link" href="/s/meera">Or just browse the sample shop</Link></>}</p>
    </>
  );
}

export function VerifyForm({ role }: { role: RoleName }) {
  const c = COPY[role]; const router = useRouter(); const sp = useSearchParams(); const auth = useAuth();
  const phone = (sp.get('phone') || '').replace(/\D/g, '').slice(-10);
  const next = safeNext(sp.get('next'), c.next);
  const previewWrong = sp.get('demo') === 'error';
  const [code, setCode] = useState(previewWrong ? '000000' : ''); const [wrong, setWrong] = useState(previewWrong ? 'That code isn’t right.' : ''); const [tries, setTries] = useState(previewWrong ? 1 : 0);
  const [busy, setBusy] = useState(false); const [ok, setOk] = useState(false); const [note, setNote] = useState('');
  const { left, again } = useCountdown(30);
  const masked = phone ? `+91 ${phone.slice(0, 2)}••• ••${phone.slice(-3)}` : 'your number';
  const locked = tries >= 5;

  const verify = async (value = code) => {
    if (value.length < 6 || busy || locked) return;
    setBusy(true);
    const e = await auth.verifyCode(phone, value, role);
    setBusy(false);
    if (e) { setWrong(e); setTries((t) => t + 1); setCode(''); return; }
    setOk(true); setTimeout(() => router.push(next), 700);
  };
  useEffect(() => { if (code.length === 6 && !wrong) verify(code); }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  if (ok) return <div className="state compact"><span className="big-ok"><Icon name="check" size="lg" /></span><h1 className="h2">You’re in</h1><p className="t-body">Taking you to your {role === 'seller' ? 'dashboard' : 'orders'}…</p></div>;
  if (locked) return (
    <div className="state compact"><span className="state-ic" style={{ background: 'var(--negative-tint)', color: 'var(--negative-deep)' }}><Icon name="lock" size="lg" /></span><h1 className="h2">Too many tries</h1><p className="t-body">For your safety we paused this sign-in for 10 minutes. You can try again after that, or continue with Google.</p><div className="btns" style={{ justifyContent: 'center' }}><Link className="btn line" href={c.base}>Back to sign-in</Link></div></div>
  );
  return (
    <>
      <Link className="link" href={c.base} style={{ justifySelf: 'start' }}><Icon name="arrow_back" size="xs" />Change number</Link>
      <div className="stack tight"><span className="eyebrow">Check WhatsApp</span><h1 className="h1">Enter the 6-digit code</h1><p className="t-body">We sent a code to <b className="t-ink">{masked}</b>. It works for 10 minutes.</p></div>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); verify(); }}>
        <OtpInput value={code} onChange={(v) => { setCode(v); setWrong(''); }} error={!!wrong} />
        {wrong && <p className="err field" role="alert" style={{ color: 'var(--negative-deep)', display: 'flex', gap: 4, alignItems: 'center', fontSize: 14 }}><Icon name="error" size="xs" />{wrong} {5 - tries} {5 - tries === 1 ? 'try' : 'tries'} left.</p>}
        <Button kind="primary" full type="submit" busy={busy} busyLabel="Checking…" disabled={code.length < 6}>Verify and continue</Button>
      </form>
      <p className="t-body" style={{ textAlign: 'center' }}>{left > 0 ? <>Send a new code in <b className="num t-ink">0:{String(left).padStart(2, '0')}</b></> : <button className="link" onClick={async () => { const e = await auth.sendCode(phone); again(); setCode(''); setWrong(''); setNote(e ?? 'A new code is on its way.'); }}>Send a new code</button>}</p>
      {note && <p className="cap" style={{ textAlign: 'center' }} role="status">{note}</p>}
      {auth.mode === 'demo' && <div className="banner info"><Icon name="science" /><span><b>Demo:</b> no message is sent. Use code <b className="num">123456</b>.</span></div>}
    </>
  );
}
