'use client';
// "Talk to us" enquiry form. Enquiries show up in the admin inbox (/admin/enquiries).
import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Dialog, Field, Icon, useToast } from '../ui';
import { TOPICS, saveSent } from '@/lib/enquiries';
import { getSupabase } from '@/lib/supabase/client';
import { sendEnquiry } from '@/lib/supabase/data';

export function EnquiryButton({ label = 'Talk to us', kind = 'line' as 'line' | 'primary' | 'ink' }) {
  const [open, setOpen] = useState(useSearchParams().get('dialog') === 'enquiry');
  const [f, setF] = useState({ name: '', contact: '', topic: TOPICS[0], message: '' });
  const [tried, setTried] = useState(false); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  const toast = useToast();
  const err: Record<string, string> = {};
  if (!f.name.trim()) err.name = 'Tell us your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.contact) && f.contact.replace(/\D/g, '').length < 10) err.contact = 'Add an email or a 10-digit phone number.';
  if (f.message.trim().length < 10) err.message = 'Write a line or two so we can help.';
  const e = (k: string) => (tried ? err[k] : undefined);
  const close = () => { setOpen(false); setTimeout(() => { setDone(false); setTried(false); }, 250); };
  const send = async () => {
    setTried(true); if (Object.keys(err).length) return; setBusy(true);
    try {
      const sb = getSupabase();
      if (sb) await sendEnquiry(sb, { name: f.name.trim(), contact: f.contact.trim(), topic: f.topic, message: f.message.trim() });
      else { await new Promise((r) => setTimeout(r, 400)); saveSent({ id: 'n' + Date.now(), ...f, when: 'Just now', status: 'New', from: 'Landing page' }); }
      setDone(true); toast('Enquiry sent.');
    } catch (e) { toast(`Couldn’t send: ${(e as Error).message}`, { icon: 'error' }); }
    finally { setBusy(false); }
  };
  return (
    <>
      <Button kind={kind} icon="mail" onClick={() => setOpen(true)}>{label}</Button>
      <Dialog open={open} onClose={close} title={done ? 'Thank you' : 'Talk to us'} footer={done ? <Button kind="ink" onClick={close}>Close</Button> : <><Button onClick={close}>Cancel</Button><Button kind="primary" busy={busy} busyLabel="Sending…" onClick={send}>Send enquiry</Button></>}>
        {done ? (
          <div className="stack" style={{ justifyItems: 'center', textAlign: 'center', padding: 'var(--s3) 0' }}>
            <span className="big-ok"><Icon name="check" size="lg" /></span><h3 className="h2">We have your message</h3>
            <p className="t-body">Someone from Stoora will reply on {f.contact || 'the contact you gave'} within one working day.</p>
          </div>
        ) : (
          <form className="stack" noValidate onSubmit={(ev) => { ev.preventDefault(); send(); }}>
            <Field id="en-name" label="Your name" required error={e('name')}><input id="en-name" className={`input ${e('name') ? 'bad' : ''}`} value={f.name} onChange={(x) => setF({ ...f, name: x.target.value })} autoComplete="name" /></Field>
            <Field id="en-contact" label="Email or phone" required error={e('contact')} hint="We reply here."><input id="en-contact" className={`input ${e('contact') ? 'bad' : ''}`} value={f.contact} onChange={(x) => setF({ ...f, contact: x.target.value })} autoComplete="email" /></Field>
            <Field id="en-topic" label="What is this about?"><select id="en-topic" className="input" value={f.topic} onChange={(x) => setF({ ...f, topic: x.target.value })}>{TOPICS.map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field id="en-msg" label="Message" required error={e('message')}><textarea id="en-msg" className={`input ${e('message') ? 'bad' : ''}`} rows={4} value={f.message} onChange={(x) => setF({ ...f, message: x.target.value })} /></Field>
            <p className="cap">By sending this you agree that Stoora may use your details only to reply. See the <a href="/privacy">privacy policy</a>.</p>
          </form>
        )}
      </Dialog>
    </>
  );
}
