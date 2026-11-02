'use client';
// Settings: four pages, all real. Shop details (with Pause my shop), Getting paid, Delivery and WhatsApp.
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, use } from 'react';
import { useStore } from '@/lib/store';
import { Button, ButtonLink, Card, Chips, EmptyState, Field, Skeleton, Switch, useToast } from '@/components/ui';
import { SettingsShell } from '@/components/dash/SettingsShell';
import { LEGACY_SETTINGS, SETTINGS, slug } from '@/lib/settings';
import { cleanHandle, rs } from '@/lib/format';
import { deliveryRule, DEFAULT_FREE_OVER } from '@/lib/delivery';
import { WhatsAppVerify } from '@/components/WhatsAppVerify';

export default function SettingSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = use(params);
  const router = useRouter();
  const moved = LEGACY_SETTINGS[section];
  useEffect(() => { if (moved) router.replace(`/settings/${moved}`); }, [moved, router]);
  const s = SETTINGS.find(([n]) => slug(n) === section);
  if (moved) return <SettingsShell title="Settings"><Skeleton rows={3} /></SettingsShell>;
  if (!s) {
    return (
      <SettingsShell title="Settings">
        <Card><EmptyState icon="search_off" title="That setting doesn’t exist" text="Pick one from the list." action={<ButtonLink href="/settings" small>All settings</ButtonLink>} /></Card>
      </SettingsShell>
    );
  }
  const [name, , desc] = s;
  return (
    <SettingsShell current={name} title={name}>
      <p className="muted" style={{ margin: '0 0 16px' }}>{desc}</p>
      {name === 'Shop details' ? <ShopDetails /> : name === 'Getting paid' ? <GettingPaid /> : name === 'Delivery' ? <Delivery /> : <WaPanel />}
    </SettingsShell>
  );
}

const CLOSED_NOTE = 'We are taking a short break and will be back soon. Thank you for your patience.';
const SaveCard = ({ dirty, busy, onDiscard, note }: { dirty: boolean; busy: boolean; onDiscard: () => void; note: string }) => (
  <div><Card className="stack tight"><Button kind="primary" full type="submit" busy={busy} busyLabel="Saving…" disabled={!dirty}>{dirty ? 'Save changes' : 'Saved'}</Button>{dirty && <Button kind="quiet" full type="button" onClick={onDiscard}>Discard changes</Button>}<p className="cap">{note}</p></Card></div>
);

/* ---------- Shop details: name, link, contact, and the Pause my shop switch ---------- */
function ShopDetails() {
  const { db, ready, setShop } = useStore(); const toast = useToast();
  const [f, setF] = useState(db.shop); const [note, setNote] = useState(db.shop.orderSettings?.closedNote ?? CLOSED_NOTE);
  const [tried, setTried] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => { if (ready) { setF(db.shop); setNote(db.shop.orderSettings?.closedNote ?? CLOSED_NOTE); } }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ready) return <Skeleton rows={3} />;
  const err: Record<string, string> = {};
  if (!f.name.trim()) err.name = 'Add your shop’s name.';
  if (f.handle.length < 3) err.handle = 'Use at least 3 letters or numbers.';
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) err.email = 'That email doesn’t look right.';
  if (f.phone && f.phone.replace(/\D/g, '').length < 10) err.phone = 'A phone number has at least 10 digits.';
  const e = (k: string) => (tried ? err[k] : undefined);
  const paused = !f.open;
  const dirty = JSON.stringify(f) !== JSON.stringify(db.shop) || note !== (db.shop.orderSettings?.closedNote ?? CLOSED_NOTE);
  const discard = () => { setF(db.shop); setNote(db.shop.orderSettings?.closedNote ?? CLOSED_NOTE); setTried(false); };
  return (
    <form className="form2" noValidate onSubmit={(ev) => { ev.preventDefault(); setTried(true); if (Object.keys(err).length) return; setBusy(true); setTimeout(() => { setShop({ ...f, name: f.name.trim(), orderSettings: { ...(db.shop.orderSettings ?? {}), closedNote: note } }); setBusy(false); toast(paused ? 'Saved. Your shop is paused.' : 'Saved. Your shop is open.'); }, 300); }}>
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
        <Card title="Pause my shop" icon="pause_circle">
          <div className="toggle-row"><span className="grow"><span className="t-ink" style={{ fontWeight: 500, display: 'block' }}>Pause my shop</span><span className="cap" id="pause-words">{paused ? 'Shop is paused. Buyers can look but can’t order.' : 'Shop is open. Buyers can order.'}</span></span><Switch checked={paused} onChange={(v) => setF({ ...f, open: !v })} label="Pause my shop" /></div>
          {paused && <div className="stack" style={{ marginTop: 'var(--s2)' }}>
            <Field id="g-note" label="Message to buyers" hint="Shown on your shop page while it is paused."><textarea id="g-note" className="input" rows={2} value={note} onChange={(x) => setNote(x.target.value)} /></Field>
          </div>}
        </Card>
      </div>
      <SaveCard dirty={dirty} busy={busy} onDiscard={discard} note="Saved on your shop. Buyers see the change straight away." />
    </form>
  );
}

/* ---------- Getting paid: UPI and cash on delivery ---------- */
function GettingPaid() {
  const { db, ready, setShop } = useStore(); const toast = useToast();
  const start = { online: db.shop.online !== false, cod: db.shop.cod, upi: db.shop.upi ?? '' };
  const [f, setF] = useState(start); const [saved, setSaved] = useState(start); const [tried, setTried] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => { if (ready) { const s = { online: db.shop.online !== false, cod: db.shop.cod, upi: db.shop.upi ?? '' }; setF(s); setSaved(s); } }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ready) return <Skeleton rows={3} />;
  const err: Record<string, string> = {};
  if (f.online && !f.upi.trim()) err.upi = 'Add your UPI ID so buyers can pay you.';
  else if (f.upi.trim() && !/^[\w.-]{2,}@[a-z]{2,}$/i.test(f.upi.trim())) err.upi = 'A UPI ID looks like name@bank.';
  if (!f.online && !f.cod) err.any = 'Turn on at least one way to get paid.';
  const e = (k: string) => (tried ? err[k] : undefined);
  const dirty = JSON.stringify(f) !== JSON.stringify(saved);
  const row = (t: string, s: string, v: boolean, on: (b: boolean) => void) => <div className="toggle-row"><span className="grow"><span className="t-ink" style={{ fontWeight: 500, display: 'block' }}>{t}</span><span className="cap">{s}</span></span><Switch checked={v} onChange={on} label={t} /></div>;
  return (
    <form className="form2" noValidate onSubmit={(ev) => { ev.preventDefault(); setTried(true); if (Object.keys(err).length) return; setBusy(true); setTimeout(() => { setShop({ online: f.online, cod: f.cod, upi: f.upi.trim() }); setSaved(f); setBusy(false); toast('Saved. Buyers see these ways to pay.'); }, 300); }}>
      <div>
        <Card title="How buyers pay" icon="payments" className="stack">
          {row('UPI', 'Buyers pay you straight to your UPI ID.', f.online, (v) => setF({ ...f, online: v }))}
          {f.online && <Field id="gp-upi" label="Your UPI ID" required error={e('upi')} hint="For example meera@okhdfc."><input id="gp-upi" className={`input ${e('upi') ? 'bad' : ''}`} autoCapitalize="none" spellCheck={false} value={f.upi} onChange={(x) => setF({ ...f, upi: x.target.value })} /></Field>}
          {row('Cash on delivery', 'The buyer pays when the parcel arrives.', f.cod, (v) => setF({ ...f, cod: v }))}
          {e('any') ? <span className="err" role="alert">{e('any')}</span> : null}
        </Card>
      </div>
      <SaveCard dirty={dirty} busy={busy} onDiscard={() => { setF(saved); setTried(false); }} note="Your UPI ID is private. Buyers only see that you accept UPI." />
    </form>
  );
}

/* ---------- Delivery: one rule for the bag, checkout, manual orders and the saved order ---------- */
interface Del { fee: string; freeOver: string; minimum: string; daily: string; prep: string; area: 'India' | 'City' | 'States' }
const delStart = (o: Record<string, string> | undefined): Del => ({ fee: String(deliveryRule({ orderSettings: o }).fee), freeOver: o && 'freeOver' in o ? o.freeOver : String(DEFAULT_FREE_OVER), minimum: o?.minimum ?? '', daily: o?.daily ?? '', prep: o?.prep || '2', area: (o?.area as Del['area']) || 'India' });
function Delivery() {
  const { db, ready, setShop } = useStore(); const toast = useToast();
  const [f, setF] = useState<Del>(() => delStart(db.shop.orderSettings)); const [saved, setSaved] = useState<Del>(() => delStart(db.shop.orderSettings));
  const [tried, setTried] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => { if (ready) { const d = delStart(db.shop.orderSettings); setF(d); setSaved(d); } }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ready) return <Skeleton rows={3} />;
  const num = (s: string) => Number(s.replace(/\D/g, ''));
  const err: Record<string, string> = {};
  if (f.fee === '') err.fee = 'Add a delivery charge. Use 0 for free delivery.';
  else if (num(f.fee) > 5000) err.fee = 'That is more than ₹5,000. Is it right?';
  if (f.minimum && num(f.minimum) > 100000) err.minimum = 'That is more than ₹1,00,000. Is it right?';
  if (f.daily && (num(f.daily) < 1 || num(f.daily) > 1000)) err.daily = 'Use a number from 1 to 1000, or leave it empty.';
  if (!f.prep || num(f.prep) > 30) err.prep = 'Use 0 to 30 days.';
  const e = (k: string) => (tried ? err[k] : undefined);
  const dirty = JSON.stringify(f) !== JSON.stringify(saved);
  const fee = num(f.fee || '0'); const free = num(f.freeOver || '0');
  const summary = fee === 0 ? 'Delivery is free on every order.' : free > 0 ? `Buyers pay ${rs(fee)} for delivery. It is free on orders of ${rs(free)} or more.` : `Buyers pay ${rs(fee)} for delivery on every order.`;
  const money = (id: string, k: 'fee' | 'freeOver' | 'minimum') => <div className={`affix ${e(k) ? 'bad' : ''}`}><span aria-hidden="true">₹</span><input id={id} inputMode="numeric" value={f[k]} onChange={(x) => setF({ ...f, [k]: x.target.value.replace(/\D/g, '') })} /></div>;
  return (
    <form className="form2" noValidate onSubmit={(ev) => { ev.preventDefault(); setTried(true); if (Object.keys(err).length) return; setBusy(true); setTimeout(() => { setShop({ orderSettings: { ...(db.shop.orderSettings ?? {}), ...f } }); setSaved(f); setBusy(false); toast('Saved. Delivery is updated everywhere.'); }, 300); }}>
      <div>
        <Card title="Delivery charge" icon="local_shipping" className="stack">
          <div className="grid2">
            <Field id="dl-fee" label="Delivery charge" required error={e('fee')} hint="Use 0 for free delivery.">{money('dl-fee', 'fee')}</Field>
            <Field id="dl-free" label="Free delivery over" optional hint="Leave empty to always charge.">{money('dl-free', 'freeOver')}</Field>
          </div>
          <p className="cap" role="status">{summary} Buyers see this in their bag and at checkout.</p>
        </Card>
        <Card title="Limits" icon="tune" className="stack">
          <div className="grid2">
            <Field id="dl-min" label="Smallest order" optional error={e('minimum')} hint="Leave empty for no minimum.">{money('dl-min', 'minimum')}</Field>
            <Field id="dl-day" label="Most orders in a day" optional error={e('daily')} hint="Stops new orders once reached."><input id="dl-day" className={`input ${e('daily') ? 'bad' : ''}`} inputMode="numeric" value={f.daily} onChange={(x) => setF({ ...f, daily: x.target.value })} /></Field>
          </div>
          <Field id="dl-prep" label="Time to get an order ready" required error={e('prep')} hint="Shown to buyers as the dispatch time."><div className={`affix ${e('prep') ? 'bad' : ''}`}><input id="dl-prep" inputMode="numeric" value={f.prep} onChange={(x) => setF({ ...f, prep: x.target.value })} /><span aria-hidden="true">days</span></div></Field>
        </Card>
        <Card title="Where you deliver" icon="public" className="stack tight">
          <Chips label="Delivery area" value={f.area} onChange={(v) => setF({ ...f, area: v })} options={[{ value: 'India', label: 'All of India', icon: 'public' }, { value: 'City', label: `Only ${db.shop.city || 'my city'}`, icon: 'location_city' }, { value: 'States', label: 'Selected states', icon: 'map' }]} />
          <p className="cap">Buyers outside your area see a message at checkout instead of paying for an order you can’t send.</p>
        </Card>
      </div>
      <SaveCard dirty={dirty} busy={busy} onDiscard={() => { setF(saved); setTried(false); }} note="One rule, used in the bag, at checkout, on orders you create and on every saved order." />
    </form>
  );
}

function WaPanel() {
  const preview = useSearchParams().get('state') as 'sent' | 'wrong' | 'verified' | null;
  return (
    <div className="form2">
      <div>
        <Card title="WhatsApp number for buyers" icon="verified"><WhatsAppVerify preview={preview ?? undefined} /></Card>
      </div>
      <div><Card title="Why verify?" icon="help" className="stack tight"><ul className="notes" style={{ margin: 0, paddingLeft: 18 }}><li>Buyers know the number on your shop page is really yours.</li><li>The “Chat on WhatsApp” button opens a normal WhatsApp chat on their phone.</li><li>Stoora never reads or stores your chats.</li></ul></Card></div>
    </div>
  );
}
