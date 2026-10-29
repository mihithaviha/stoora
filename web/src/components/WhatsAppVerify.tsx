'use client';
// Verify the WhatsApp number buyers use to contact the shop. A 6-digit code goes to that number; the seller types it back.
// This only proves the number is theirs: Stoora never reads WhatsApp chats.
//   live mode: the code is sent by Supabase phone verification (needs the Twilio setup in supabase/README.md), then
//              confirm_shop_whatsapp() marks the shop's number as verified in the database.
//   demo mode: no message is sent; the code is 123456.
import React, { useEffect, useState } from 'react';
import { Badge, Button, Field, Icon, Switch, useToast } from './ui';
import { OtpInput, useCountdown } from './bits';
import { useStore } from '@/lib/store';
import { getSupabase } from '@/lib/supabase/client';
import { toE164 } from '@/lib/auth';

const KEY = 'stoora.wa.v1';
interface WaState { number: string; verified: boolean; showButton: boolean }
const EMPTY: WaState = { number: '', verified: false, showButton: true };

/** The shop's WhatsApp number, whether it is verified, and whether the shop page shows the button. */
export function useWhatsApp(): [WaState, (s: Partial<WaState>) => void] {
  const { mode, db, setShop } = useStore();
  const [local, setLocal] = useState<WaState>(EMPTY);
  useEffect(() => { if (mode === 'demo') try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v) setLocal({ ...EMPTY, ...v }); } catch { /* ignore */ } }, [mode]);
  if (mode === 'live') {
    const s = db.shop;
    return [{ number: (s.whatsappNumber ?? '').replace(/\D/g, '').slice(-10), verified: !!s.whatsappVerified, showButton: s.showWhatsapp ?? true }, (p) => setShop({ ...(p.number !== undefined ? { whatsappNumber: '+91' + p.number } : {}), ...(p.showButton !== undefined ? { showWhatsapp: p.showButton } : {}) })];
  }
  return [local, (p) => setLocal((cur) => { const n = { ...cur, ...p }; try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* ignore */ } return n; })];
}

export function WhatsAppVerify({ preview }: { preview?: 'sent' | 'wrong' | 'verified' }) {
  const { mode, db, reload } = useStore(); const [wa, setWa] = useWhatsApp(); const toast = useToast();
  const sb = getSupabase();
  const [stage, setStage] = useState<'enter' | 'code'>(preview === 'sent' || preview === 'wrong' ? 'code' : 'enter');
  const [num, setNum] = useState(preview ? '98765 43210' : ''); const [code, setCode] = useState(preview === 'wrong' ? '000000' : '');
  const [wrong, setWrong] = useState(preview === 'wrong' ? 'That code isn’t right. Check the latest message and try again.' : ''); const [busy, setBusy] = useState(false); const [tried, setTried] = useState(false); const [sendErr, setSendErr] = useState('');
  const { left, again } = useCountdown(30);
  useEffect(() => { if (wa.number && !preview) setNum(wa.number); }, [wa.number, preview]);
  const verified = preview === 'verified' || (wa.verified && stage === 'enter');
  const digits = num.replace(/\D/g, '');
  const numErr = tried && digits.length !== 10 ? 'Enter a 10-digit WhatsApp number.' : undefined;

  const send = async () => {
    setTried(true); setSendErr(''); if (digits.length !== 10) return; setBusy(true);
    if (mode === 'live' && sb) {
      const { error } = await sb.auth.updateUser({ phone: toE164(digits) });
      if (error) { setBusy(false); setSendErr(error.message); return; }
      setWa({ number: digits });
    } else await new Promise((r) => setTimeout(r, 500));
    setBusy(false); setStage('code'); setCode(''); setWrong(''); again(); toast('Code sent. Check WhatsApp.', { icon: 'chat' });
  };
  const verify = async () => {
    if (code.length < 6) return; setBusy(true);
    if (mode === 'live' && sb) {
      const { error } = await sb.auth.verifyOtp({ phone: toE164(digits), token: code, type: 'phone_change' });
      const confirm = error ? { error } : await sb.rpc('confirm_shop_whatsapp', { p_shop: db.shop.id });
      setBusy(false);
      if (confirm.error) { setWrong(confirm.error.message); return; }
      await reload(); setStage('enter'); toast('WhatsApp number verified.', { icon: 'verified' });
      return;
    }
    await new Promise((r) => setTimeout(r, 500)); setBusy(false);
    if (code === '123456') { setWa({ number: digits, verified: true }); setStage('enter'); toast('WhatsApp number verified.', { icon: 'verified' }); } else setWrong('That code isn’t right. Check the latest message and try again.');
  };

  if (verified) return (
    <div className="stack">
      <div className="row" style={{ flexWrap: 'wrap' }}><span className="verified"><Icon name="verified" />Verified</span><span className="t-ink num" style={{ fontWeight: 500 }}>+91 {preview ? '98765 43210' : wa.number.replace(/(\d{5})(\d{5})/, '$1 $2')}</span><span className="grow" /><Button small kind="quiet" icon="edit" onClick={() => { setStage('enter'); setWa({ number: '' }); }}>Change number</Button></div>
      <div className="toggle-row"><span className="grow"><span className="t-ink" style={{ fontWeight: 500, display: 'block' }}>Show “Chat on WhatsApp” on my shop page</span><span className="cap">Buyers tap it to message this number. Chats stay in WhatsApp.</span></span><Switch checked={wa.showButton} onChange={(v) => setWa({ showButton: v })} label="Show Chat on WhatsApp on my shop page" /></div>
    </div>
  );
  if (stage === 'code') return (
    <div className="stack">
      <div className="row" style={{ flexWrap: 'wrap' }}><Badge tone="warn" icon="schedule">Waiting for code</Badge><span className="cap">We sent a code on WhatsApp to +91 {num}</span><span className="grow" /><Button small kind="quiet" onClick={() => setStage('enter')}>Change</Button></div>
      <OtpInput value={code} onChange={(v) => { setCode(v); setWrong(''); }} error={!!wrong} label="WhatsApp code" />
      {wrong && <p role="alert" style={{ color: 'var(--negative-deep)', display: 'flex', gap: 4, alignItems: 'center', fontSize: 14 }}><Icon name="error" size="xs" />{wrong}</p>}
      <div className="row" style={{ flexWrap: 'wrap' }}><Button kind="ink" busy={busy} busyLabel="Checking…" disabled={code.length < 6} onClick={verify}>Verify number</Button>{left > 0 ? <span className="cap">Send again in 0:{String(left).padStart(2, '0')}</span> : <Button kind="quiet" small onClick={send}>Send a new code</Button>}</div>
      {mode === 'demo' && <p className="cap"><Icon name="science" size="xs" /> Demo: no message is sent. Use code <b className="num">123456</b>.</p>}
    </div>
  );
  return (
    <div className="stack">
      <div className="row"><Badge tone="neutral" icon="phone_iphone">Not verified</Badge><span className="cap">Buyers will not see a WhatsApp button until you verify.</span></div>
      <Field id="wa-num" label="WhatsApp number" required hint="The number you answer buyers on." error={numErr}><div className={`affix ${numErr ? 'bad' : ''}`}><span aria-hidden="true">+91</span><input id="wa-num" type="tel" inputMode="numeric" value={num} placeholder="98765 43210" onChange={(e) => setNum(e.target.value.replace(/[^\d ]/g, '').slice(0, 11))} /></div></Field>
      {sendErr && <div className="banner bad" role="alert"><Icon name="error" /><span>{sendErr}</span></div>}
      <div><Button kind="ink" icon="chat" busy={busy} busyLabel="Sending…" onClick={send}>Send code on WhatsApp</Button></div>
      <p className="cap">Verifying only proves the number is yours. Stoora never reads your WhatsApp chats.</p>
    </div>
  );
}
