'use client';
// Sign in. The Stoora account service is not connected in this build, so this page never pretends a
// login succeeded. The only way in is the clearly labelled demo shop.
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Field, Icon } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [show, setShow] = useState(false);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [tried, setTried] = useState(false);
  const emailErr = tried && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Enter the email you signed up with.' : '';
  const pwErr = tried && !pw ? 'Enter your password.' : '';
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setTried(true); setErr('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !pw) return;
    setBusy(true);
    // No auth endpoint exists yet (API_TODO: POST /api/auth/login). Fail honestly.
    setTimeout(() => { setBusy(false); setErr('Sign-in isn’t connected yet, so we couldn’t check your details. Nothing was sent. You can look around the demo shop instead.'); }, 400);
  };
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 'var(--s3)', background: 'var(--surface)' }}>
      <div style={{ width: 'min(420px, 100%)' }} className="stack">
        <div className="brand" style={{ justifyContent: 'center' }}><span className="appicon" aria-hidden="true">S</span><span className="wordmark" style={{ color: 'var(--ink)' }}>stoora<i>.in</i></span></div>
        <section className="card stack">
          <div><h1 className="h2">Sign in to your shop</h1><p className="t-body">Welcome back.</p></div>
          {err && <div className="banner warn" role="alert"><Icon name="info" /><span>{err}</span></div>}
          <form className="stack" onSubmit={submit} noValidate>
            <Field id="li-email" label="Email" error={emailErr}><input id="li-email" className={`input ${emailErr ? 'bad' : ''}`} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field id="li-pw" label="Password" error={pwErr}><div className={`affix ${pwErr ? 'bad' : ''}`}><input id="li-pw" type={show ? 'text' : 'password'} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} /><button type="button" className="ibtn flat" style={{ width: 36, height: 36 }} onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}><Icon name={show ? 'visibility_off' : 'visibility'} size="sm" /></button></div></Field>
            <Button kind="primary" full type="submit" busy={busy} busyLabel="Checking…">Sign in</Button>
          </form>
        </section>
        <Button full icon="science" onClick={() => { try { localStorage.setItem('stoora.session', 'demo'); } catch { /* ignore */ } router.push('/'); }}>Open the demo shop</Button>
        <p className="cap" style={{ textAlign: 'center' }}>The demo uses a made-up shop. It is not your real business data.</p>
      </div>
    </main>
  );
}
