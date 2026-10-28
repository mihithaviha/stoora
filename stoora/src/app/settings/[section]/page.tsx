'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { Button, ButtonLink, Card, EmptyState, Field, Icon, PageHeader, Skeleton, Switch, useToast } from '@/components/ui';
import { SETTINGS, slug } from '@/lib/settings';
import { cleanHandle } from '@/lib/format';

export default function SettingSection({ params }: { params: { section: string } }) {
  const s = SETTINGS.find(([n]) => slug(n) === params.section);
  if (!s) return <Card><EmptyState icon="search_off" title="That setting doesn’t exist" text="Pick one from the list." action={<ButtonLink href="/settings" small>All settings</ButtonLink>} /></Card>;
  const [name, icon, desc] = s;
  return (
    <>
      <PageHeader title={name} lede={desc} />
      {name === 'General' ? <General /> : name === 'Notifications' ? <NotifySettings /> : name === 'Sales channels' ? <Channels /> : (
        <Card><EmptyState icon={icon} title={`${name} isn’t built yet`} text="This part of Stoora is planned but not in this version. Nothing here is saved." action={<ButtonLink href="/settings" small>Back to settings</ButtonLink>} /></Card>
      )}
    </>
  );
}

function General() {
  const { db, ready, setShop } = useStore(); const toast = useToast();
  const [f, setF] = useState(db.shop); const [tried, setTried] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => { if (ready) setF(db.shop); }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ready) return <Skeleton rows={3} />;
  const err: Record<string, string> = {};
  if (!f.name.trim()) err.name = 'Add your shop’s name.';
  if (f.handle.length < 3) err.handle = 'Use at least 3 letters or numbers.';
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) err.email = 'That email doesn’t look right.';
  if (f.phone && f.phone.replace(/\D/g, '').length < 10) err.phone = 'A phone number has at least 10 digits.';
  const e = (k: string) => (tried ? err[k] : undefined);
  const dirty = JSON.stringify(f) !== JSON.stringify(db.shop);
  return (
    <form className="form2" noValidate onSubmit={(ev) => { ev.preventDefault(); setTried(true); if (Object.keys(err).length) return; setBusy(true); setTimeout(() => { setShop({ ...f, name: f.name.trim() }); setBusy(false); toast('Shop details saved.'); }, 300); }}>
      <div>
        <Card className="stack" title="Shop">
          <Field id="g-name" label="Shop name" required error={e('name')}><input id="g-name" className={`input ${e('name') ? 'bad' : ''}`} value={f.name} onChange={(x) => setF({ ...f, name: x.target.value })} /></Field>
          <Field id="g-owner" label="Your name" optional hint="Stoora greets you with this."><input id="g-owner" className="input" value={f.owner} onChange={(x) => setF({ ...f, owner: x.target.value })} /></Field>
          <Field id="g-handle" label="Shop link" required error={e('handle')} hint={`Buyers visit stoora.in/${f.handle || '…'}`}><div className={`affix ${e('handle') ? 'bad' : ''}`}><span aria-hidden="true">stoora.in/</span><input id="g-handle" value={f.handle} onChange={(x) => setF({ ...f, handle: cleanHandle(x.target.value) })} /></div></Field>
        </Card>
        <Card className="stack" title="Contact">
          <div className="grid2">
            <Field id="g-email" label="Email" optional error={e('email')}><input id="g-email" type="email" className={`input ${e('email') ? 'bad' : ''}`} value={f.email} onChange={(x) => setF({ ...f, email: x.target.value })} /></Field>
            <Field id="g-phone" label="Phone" optional error={e('phone')}><input id="g-phone" type="tel" className={`input ${e('phone') ? 'bad' : ''}`} value={f.phone} onChange={(x) => setF({ ...f, phone: x.target.value })} /></Field>
          </div>
          <Field id="g-city" label="City" optional><input id="g-city" className="input" value={f.city} onChange={(x) => setF({ ...f, city: x.target.value })} /></Field>
        </Card>
      </div>
      <div><Card className="stack tight"><Button kind="primary" full type="submit" busy={busy} busyLabel="Saving…" disabled={!dirty}>{dirty ? 'Save changes' : 'Saved'}</Button>{dirty && <Button kind="quiet" full type="button" onClick={() => { setF(db.shop); setTried(false); }}>Discard changes</Button>}<p className="cap">Saved in this browser only while the Stoora API isn’t connected.</p></Card></div>
    </form>
  );
}

const NOTIFY_KEY = 'stoora.notify.v1';
const NOTIFY = [['orders', 'New orders', 'When a buyer orders'], ['payments', 'Payments', 'When an order is marked paid'], ['stock', 'Low stock', 'When a product has 3 or fewer left'], ['chats', 'Buyer messages', 'When a buyer is ready to buy'], ['brief', 'Morning summary', 'A short shop update at 7:30 am']] as const;
function NotifySettings() {
  const toast = useToast(); const [on, setOn] = useState<Record<string, boolean>>({ orders: true, payments: true, stock: true, chats: true, brief: false });
  useEffect(() => { try { const s = localStorage.getItem(NOTIFY_KEY); if (s) setOn(JSON.parse(s)); } catch { /* ignore */ } }, []);
  const set = (k: string, v: boolean) => { const n = { ...on, [k]: v }; setOn(n); try { localStorage.setItem(NOTIFY_KEY, JSON.stringify(n)); } catch { /* ignore */ } toast('Saved.'); };
  return (
    <Card title="Alerts in Stoora">
      {NOTIFY.map(([k, l, s]) => <div key={k} className="toggle-row"><span className="grow"><span className="t-ink" style={{ fontWeight: 500, display: 'block' }}>{l}</span><span className="cap">{s}</span></span><Switch checked={!!on[k]} onChange={(v) => set(k, v)} label={l} /></div>)}
      <p className="cap" style={{ marginTop: 'var(--s2)' }}>Push, email and WhatsApp alerts aren’t connected yet. These choices apply to the alerts inside Stoora.</p>
    </Card>
  );
}
function Channels() {
  const { db } = useStore();
  return (
    <div className="rows">
      <div className="li"><span className="thumb"><Icon name="link" /></span><span className="grow"><span className="t">Shop link</span><span className="s">stoora.in/{db.shop.handle}</span></span><Link className="btn line sm" href="/storefront">Open</Link></div>
      <div className="li"><span className="thumb"><Icon name="chat" /></span><span className="grow"><span className="t">WhatsApp</span><span className="s">Not connected</span></span><Link className="btn line sm" href="/whatsapp">Open</Link></div>
      <div className="li"><span className="thumb"><Icon name="photo_camera" /></span><span className="grow"><span className="t">Instagram</span><span className="s">Not connected</span></span><Link className="btn line sm" href="/instagram">Open</Link></div>
    </div>
  );
}
