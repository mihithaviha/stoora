'use client';
// Add a verified WhatsApp number to the signed-in account.
//   <PhoneForm />  the two steps (number, then code), used in the shop setup wizard and in Account > WhatsApp number.
// A number that already belongs to another Stoora account is refused with a plain message. Codes are checked by the login service.
import { useEffect, useRef, useState } from 'react';
import { Button, Field, Icon, useToast } from '../ui';
import { OtpInput, useCountdown } from '../bits';
import { DEMO_TAKEN_PHONE, useAuth } from '@/lib/auth';

export function PhoneForm({ initial = '', onDone, submitLabel = 'Send code on WhatsApp' }: { initial?: string; onDone: (digits: string) => void; submitLabel?: string }) {
  const auth = useAuth(); const toast = useToast();
  const [stage, setStage] = useState<'enter' | 'code'>('enter');
  const [num, setNum] = useState(initial.replace(/\D/g, '').slice(-10)); const [code, setCode] = useState('');
  const [tried, setTried] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [wrong, setWrong] = useState('');
  const { left, again } = useCountdown(30);
  const digits = num.replace(/\D/g, '');
  const numErr = tried && digits.length !== 10 ? 'Enter a 10-digit mobile number.' : undefined;
  const sentTo = useRef('');

  const send = async () => {
    setTried(true); setError(''); if (digits.length !== 10) return; setBusy(true);
    const failed = await auth.addPhone(digits);
    setBusy(false);
    if (failed) { setError(failed); return; }
    sentTo.current = digits; setStage('code'); setCode(''); setWrong(''); again(); toast('Code sent. Check WhatsApp.', { icon: 'chat' });
  };
  const verify = async (value = code) => {
    if (value.length < 6 || busy) return; setBusy(true);
    const failed = await auth.confirmPhone(sentTo.current || digits, value);
    setBusy(false);
    if (failed) { setWrong(failed); setCode(''); return; }
    toast('WhatsApp number added.', { icon: 'verified' });
    onDone(sentTo.current || digits);
  };
  useEffect(() => { if (code.length === 6 && !wrong) verify(code); }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  if (stage === 'code') return (
    <div className="stack">
      <p className="t-body" style={{ margin: 0 }}>We sent a 6-digit code on WhatsApp to <b className="t-ink">+91 {sentTo.current.slice(0, 2)}••• ••{sentTo.current.slice(-3)}</b>. It works for 10 minutes.</p>
      <OtpInput value={code} onChange={(v) => { setCode(v); setWrong(''); }} error={!!wrong} label="WhatsApp code" />
      {wrong && <p role="alert" style={{ color: 'var(--negative-deep)', display: 'flex', gap: 4, alignItems: 'center', fontSize: 14, margin: 0 }}><Icon name="error" size="xs" />{wrong}</p>}
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <Button kind="primary" busy={busy} busyLabel="Checking…" disabled={code.length < 6} onClick={() => verify()}>Verify and continue</Button>
        {left > 0 ? <span className="cap">Send a new code in 0:{String(left).padStart(2, '0')}</span> : <button className="link" type="button" onClick={send}>Send a new code</button>}
        <button className="link" type="button" onClick={() => { setStage('enter'); setError(''); }}>Change number</button>
      </div>
      {auth.mode === 'demo' && <p className="cap"><Icon name="science" size="xs" /> Demo: no message is sent. Use code <b className="num">123456</b>.</p>}
    </div>
  );
  return (
    <form className="stack" noValidate onSubmit={(e) => { e.preventDefault(); send(); }}>
      <Field id="pg-num" label="WhatsApp mobile number" required error={numErr} hint="We send a 6-digit code to this number.">
        <div className={`affix ${numErr ? 'bad' : ''}`}><span aria-hidden="true">+91</span><input id="pg-num" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" value={num} aria-invalid={numErr ? true : undefined} onChange={(e) => setNum(e.target.value.replace(/[^\d ]/g, '').slice(0, 11))} /></div>
      </Field>
      {error && <div className="banner bad" role="alert"><Icon name="error" /><span>{error}</span></div>}
      <div><Button kind="primary" type="submit" icon="chat" busy={busy} busyLabel="Sending…">{submitLabel}</Button></div>
      {auth.mode === 'demo' && <p className="cap"><Icon name="science" size="xs" /> Demo: the number {DEMO_TAKEN_PHONE} pretends to belong to another account.</p>}
    </form>
  );
}

