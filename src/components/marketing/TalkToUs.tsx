'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Ic } from './bits';
import { TOPICS, saveSent } from '@/lib/enquiries';
import { getSupabase } from '@/lib/supabase/client';
import { sendEnquiry } from '@/lib/supabase/data';

/** "Talk to us": a short form in a dialog. Enquiries arrive in the admin inbox (/admin/enquiries). */
export function TalkToUs({ label = 'Talk to us' }: { label?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState({ name: '', contact: '', topic: TOPICS[0] as string, message: '' });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [failure, setFailure] = useState('');

  const problems: Record<string, string> = {};
  if (!form.name.trim()) problems.name = 'Tell us your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact) && form.contact.replace(/\D/g, '').length < 10) problems.contact = 'Add an email or a 10-digit phone number.';
  if (form.message.trim().length < 10) problems.message = 'Write a line or two so we can help.';
  const shown = (key: string) => (tried ? problems[key] : undefined);

  // an address like /?dialog=enquiry opens it
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('dialog') === 'enquiry') dialog.current?.showModal();
  }, []);

  const open = () => dialog.current?.showModal();
  const close = () => {
    dialog.current?.close();
    window.setTimeout(() => { setDone(false); setTried(false); setFailure(''); }, 250);
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    setFailure('');
    if (Object.keys(problems).length) return;
    setBusy(true);
    try {
      const supabase = getSupabase();
      if (supabase) await sendEnquiry(supabase, { name: form.name.trim(), contact: form.contact.trim(), topic: form.topic, message: form.message.trim() });
      else {
        await new Promise((resolve) => setTimeout(resolve, 400));
        saveSent({ id: 'n' + Date.now(), ...form, when: 'Just now', status: 'New', from: 'Landing page' });
      }
      setDone(true);
    } catch (error) {
      setFailure(`Couldn’t send: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const field = (id: string, key: keyof typeof form, label: string, control: 'input' | 'textarea' | 'select', hint?: string) => {
    const error = shown(key);
    const common = { id, value: form[key], 'aria-invalid': error ? true : undefined, onChange: (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value }) };
    return (
      <div className="field">
        <label htmlFor={id}>{label}</label>
        {control === 'textarea' ? <textarea className={`input${error ? ' bad' : ''}`} rows={4} {...common} />
          : control === 'select' ? <select className="input" {...common}>{TOPICS.map((t) => <option key={t}>{t}</option>)}</select>
          : <input className={`input${error ? ' bad' : ''}`} autoComplete={key === 'name' ? 'name' : 'email'} {...common} />}
        {hint && !error ? <span className="hint">{hint}</span> : null}
        {error ? <span className="err" role="alert"><Ic n="error" c="xs" />{error}</span> : null}
      </div>
    );
  };

  return (
    <>
      <button type="button" onClick={open}>{label}</button>
      <dialog ref={dialog} className="talk" aria-labelledby="talk-h" onClose={() => setTried(false)}>
        <div className="talk-in">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 id="talk-h" className="l-h3">{done ? 'Thank you' : 'Talk to us'}</h2>
            <button type="button" className="ibtn" aria-label="Close" onClick={close}><Ic n="close" /></button>
          </div>
          {done ? (
            <div className="stack" style={{ justifyItems: 'center', textAlign: 'center', padding: 'var(--s3) 0' }}>
              <span className="big-ok" style={{ width: 64, height: 64, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--positive-tint)', color: 'var(--positive-deep)' }}><Ic n="check" c="lg" /></span>
              <h3 className="l-h3">We have your message</h3>
              <p className="t-body">Someone from Stoora will reply on {form.contact || 'the contact you gave'} within one working day.</p>
              <button type="button" className="btn ink" onClick={close}>Close</button>
            </div>
          ) : (
            <form className="stack" noValidate onSubmit={send}>
              {field('en-name', 'name', 'Your name', 'input')}
              {field('en-contact', 'contact', 'Email or phone', 'input', 'We reply here.')}
              {field('en-topic', 'topic', 'What is this about?', 'select')}
              {field('en-msg', 'message', 'Message', 'textarea')}
              {failure && <div className="banner bad" role="alert"><Ic n="error" /><span>{failure}</span></div>}
              <p className="cap">By sending this you agree that Stoora may use your details only to reply. See the <a href="/privacy">privacy policy</a>.</p>
              <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--s2)' }}>
                <button type="button" className="btn line" onClick={close}>Cancel</button>
                <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Sending…' : 'Send enquiry'}</button>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
