'use client';
// Data requests: a buyer or seller asks to see, correct, export or delete their data, or to withdraw consent.
import { useState } from 'react';
import { Button, ButtonLink, Card, Field, Icon, useToast } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase/client';
import { sendDataRequest } from '@/lib/supabase/data';

const KINDS: [string, string, string][] = [
  ['access', 'See my data', 'A copy of what Stoora holds about me.'],
  ['correct', 'Correct my data', 'Fix something that is wrong.'],
  ['delete', 'Delete my data', 'Erase my account and personal details.'],
  ['consent', 'Withdraw consent', 'Stop offers and optional messages.'],
];

export default function DataRequests() {
  const toast = useToast(); const auth = useAuth();
  const [kind, setKind] = useState('access');
  const [f, setF] = useState({ name: '', contact: '', details: '' });
  const [tried, setTried] = useState(false); const [busy, setBusy] = useState(false); const [ref, setRef] = useState('');
  const err: Record<string, string> = {};
  if (!f.name.trim()) err.name = 'Tell us your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.contact) && f.contact.replace(/\D/g, '').length < 10) err.contact = 'Add the email or phone number on your account.';
  const e = (k: string) => (tried ? err[k] : undefined);
  const submit = async () => {
    setTried(true); if (Object.keys(err).length) return; setBusy(true);
    try { const sb = getSupabase(); setRef(sb ? await sendDataRequest(sb, { kind, name: f.name.trim(), contact: f.contact.trim(), details: f.details.trim() || undefined }, auth.user?.id) : 'DR-' + String(Date.now()).slice(-6)); }
    catch (e) { toast(`Couldn’t send: ${(e as Error).message}`, { icon: 'error' }); }
    finally { setBusy(false); }
  };

  if (ref) return (
    <div className="wrap narrow"><div className="payres"><span className="big-ok"><Icon name="check" size="lg" /></span><h1 className="h1">Request received</h1><p className="t-body">Your reference is <b className="num t-ink">{ref}</b>. We will confirm your identity first, then reply within 30 days.</p>
      <Card><ol className="tour"><li>We check it is really you (a code is sent to {f.contact}).</li><li>We collect, correct or delete the data you asked about.</li><li>We tell you what we did, and keep only what the law requires.</li></ol></Card>
      <div className="btns"><ButtonLink href="/" kind="primary">Back to home</ButtonLink></div></div></div>
  );
  return (
    <div className="wrap narrow" style={{ padding: 'var(--s5) 16px var(--s6)', display: 'grid', gap: 'var(--s3)' }}>
      <span className="eyebrow">Your data, your choice</span>
      <h1 className="display" style={{ fontSize: 'clamp(30px,5vw,44px)' }}>Data requests</h1>
      <p className="lede">Buyers and sellers can ask Stoora about their personal data. It is free and we answer within 30 days.</p>
      <Card className="stack" title="What would you like to do?">
        <div className="payopts" role="radiogroup" aria-label="Type of request">{KINDS.map(([k, t, d]) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} className={`trow radio ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}><span className="rdot">{kind === k && <Icon name="check" size="xs" />}</span><span className="grow"><span className="t">{t}</span><span className="s">{d}</span></span></button>))}</div>
        {kind === 'delete' && <div className="banner warn"><Icon name="warning" /><span>Deleting your data closes your account. Records we must keep for tax or payment rules are kept, and removed afterwards.</span></div>}
      </Card>
      <Card className="stack" title="About you">
        <Field id="dr-name" label="Your name" required error={e('name')}><input id="dr-name" className={`input ${e('name') ? 'bad' : ''}`} value={f.name} onChange={(x) => setF({ ...f, name: x.target.value })} autoComplete="name" /></Field>
        <Field id="dr-contact" label="Email or phone on your account" required error={e('contact')} hint="We send a code here to check it is you."><input id="dr-contact" className={`input ${e('contact') ? 'bad' : ''}`} value={f.contact} onChange={(x) => setF({ ...f, contact: x.target.value })} /></Field>
        <Field id="dr-details" label="Anything we should know?" optional><textarea id="dr-details" className="input" rows={3} value={f.details} onChange={(x) => setF({ ...f, details: x.target.value })} /></Field>
        <div className="btns"><Button kind="primary" busy={busy} busyLabel="Sending…" onClick={submit}>Send request</Button></div>
      </Card>
    </div>
  );
}
