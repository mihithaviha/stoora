'use client';
// Settings › Order-taking: when buyers can order, how much, how fast and where you deliver.
// Saved on the shop (shops.is_open, shops.accepts_cod, shops.order_settings). The database enforces the minimum and the daily limit at checkout.
import React, { useEffect, useState } from 'react';
import { Button, Card, Chips, Field, Icon, Skeleton, Switch, useToast } from './ui';
import { useStore } from '@/lib/store';

const KEY = 'stoora.ordertaking.v1';
interface Extra { minimum: string; daily: string; prep: string; area: 'India' | 'City' | 'States'; closedNote: string; reopen: string }
const DEFAULT: Extra = { minimum: '', daily: '', prep: '2', area: 'India', closedNote: 'We are taking a short break and will be back soon. Thank you for your patience.', reopen: 'manual' };

export function OrderTaking() {
  const { db, ready, setShop, mode } = useStore(); const toast = useToast();
  const [open, setOpen] = useState(true); const [cod, setCod] = useState(true); const [x, setX] = useState<Extra>(DEFAULT);
  const [saved, setSaved] = useState<{ open: boolean; cod: boolean; x: Extra } | null>(null);
  const [tried, setTried] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!ready) return;
    let ex = DEFAULT; if (mode === 'live') ex = { ...DEFAULT, ...(db.shop.orderSettings as Partial<Extra>) }; else try { ex = { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* ignore */ }
    setOpen(db.shop.open); setCod(db.shop.cod); setX(ex); setSaved({ open: db.shop.open, cod: db.shop.cod, x: ex });
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ready || !saved) return <Skeleton rows={3} height={110} />;

  const num = (s: string) => Number(s.replace(/\D/g, ''));
  const err: Record<string, string> = {};
  if (x.minimum && num(x.minimum) > 100000) err.minimum = 'That is more than ₹1,00,000. Is it right?';
  if (x.daily && (num(x.daily) < 1 || num(x.daily) > 1000)) err.daily = 'Use a number from 1 to 1000, or leave it empty.';
  if (!x.prep || num(x.prep) > 30) err.prep = 'Use 0 to 30 days.';
  const e = (k: string) => (tried ? err[k] : undefined);
  const dirty = JSON.stringify({ open, cod, x }) !== JSON.stringify(saved);
  const save = () => {
    setTried(true); if (Object.keys(err).length) return; setBusy(true);
    setTimeout(() => { if (mode === 'live') setShop({ open, cod, orderSettings: x as unknown as Record<string, string> }); else { setShop({ open, cod }); try { localStorage.setItem(KEY, JSON.stringify(x)); } catch { /* ignore */ } } setSaved({ open, cod, x }); setBusy(false); toast('Order-taking settings saved.'); }, 350);
  };
  const row = (t: string, s: string, v: boolean, on: (b: boolean) => void) => <div className="toggle-row"><span className="grow"><span className="t-ink" style={{ fontWeight: 500, display: 'block' }}>{t}</span><span className="cap">{s}</span></span><Switch checked={v} onChange={on} label={t} /></div>;

  return (
    <form className="form2" noValidate onSubmit={(ev) => { ev.preventDefault(); save(); }}>
      <div>
        <Card title="Taking orders" icon="shopping_bag">
          {row('Shop is open for orders', open ? 'Buyers can order right now.' : 'Buyers can look but not order.', open, setOpen)}
          {!open && <div className="stack" style={{ marginTop: 'var(--s2)' }}>
            <div className="banner warn"><Icon name="pause_circle" /><span>Your shop is paused. Buyers see the message below instead of the order button.</span></div>
            <Field id="ot-note" label="Message to buyers" hint="Shown on your shop page."><textarea id="ot-note" className="input" rows={2} value={x.closedNote} onChange={(ev) => setX({ ...x, closedNote: ev.target.value })} /></Field>
            <Field id="ot-re" label="Open again"><select id="ot-re" className="input" value={x.reopen} onChange={(ev) => setX({ ...x, reopen: ev.target.value })}><option value="manual">When I turn it back on</option><option value="tomorrow">Tomorrow at 9 am</option><option value="week">In 7 days</option></select></Field>
          </div>}
        </Card>
        <Card title="Limits" icon="tune" className="stack">
          <div className="grid2">
            <Field id="ot-min" label="Smallest order" optional error={e('minimum')} hint="Leave empty for no minimum."><div className={`affix ${e('minimum') ? 'bad' : ''}`}><span aria-hidden="true">₹</span><input id="ot-min" inputMode="numeric" value={x.minimum} onChange={(ev) => setX({ ...x, minimum: ev.target.value })} /></div></Field>
            <Field id="ot-day" label="Most orders in a day" optional error={e('daily')} hint="Stops new orders once reached."><input id="ot-day" className={`input ${e('daily') ? 'bad' : ''}`} inputMode="numeric" value={x.daily} onChange={(ev) => setX({ ...x, daily: ev.target.value })} /></Field>
          </div>
          <Field id="ot-prep" label="Time to get an order ready" required error={e('prep')} hint="Shown to buyers as the dispatch time."><div className={`affix ${e('prep') ? 'bad' : ''}`}><input id="ot-prep" inputMode="numeric" value={x.prep} onChange={(ev) => setX({ ...x, prep: ev.target.value })} style={{ paddingLeft: 0 }} /><span style={{ paddingRight: 18 }}>days</span></div></Field>
        </Card>
        <Card title="Where you deliver" icon="local_shipping" className="stack tight">
          <Chips label="Delivery area" value={x.area} onChange={(v) => setX({ ...x, area: v })} options={[{ value: 'India', label: 'All of India', icon: 'public' }, { value: 'City', label: `Only ${db.shop.city}`, icon: 'location_city' }, { value: 'States', label: 'Selected states', icon: 'map' }]} />
          <p className="cap">Buyers outside your area see a message at checkout instead of paying for an order you can’t send.</p>
        </Card>
        <Card title="How buyers pay" icon="payments">
          {row('Cash on delivery', 'The buyer pays when the parcel arrives.', cod, setCod)}
          <p className="cap" style={{ marginTop: 'var(--s2)' }}>Online payment settings are in <a className="link" href="/settings/payments">Payments</a>.</p>
        </Card>
      </div>
      <div><Card className="stack tight" style={{ position: 'sticky', top: 84 }}><Button kind="primary" full type="submit" busy={busy} busyLabel="Saving…" disabled={!dirty}>{dirty ? 'Save changes' : 'Saved'}</Button>{dirty && <Button kind="quiet" full type="button" onClick={() => { setOpen(saved.open); setCod(saved.cod); setX(saved.x); setTried(false); }}>Discard changes</Button>}<p className="cap">What buyers see: {open ? 'an order button' : 'your pause message'}, {x.prep || 0} {x.prep === '1' ? 'day' : 'days'} to get ready, {cod ? 'cash on delivery available' : 'online payment only'}.</p></Card></div>
    </form>
  );
}
