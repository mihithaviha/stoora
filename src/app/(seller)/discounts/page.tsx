'use client';
// Discounts and offers: codes buyers type at checkout (the dashboard prototype's Discounts screen).
import { useState } from 'react';
import { Art } from '@/components/dash/Art';
import { DI, DSwitch, TopRow } from '@/components/dash/parts';
import { Button, Dialog, Field, Segmented, useToast } from '@/components/ui';
import { useStore } from '@/lib/store';

const KINDS = [
  { id: 'percent', icon: 'tag', title: 'Money off products', text: '% off everything', ready: true },
  { id: 'amount', icon: 'cart', title: 'Money off the order', text: 'e.g. ₹200 off', ready: true },
  { id: 'bogo', icon: 'box', title: 'Buy X get Y', text: 'e.g. buy 2 kurtas, get a dupatta free', ready: false },
  { id: 'ship', icon: 'truck', title: 'Free delivery', text: 'On orders above an amount', ready: false },
] as const;

export default function DiscountsPage() {
  const { db, saveOffer, toggleOffer } = useStore();
  const toast = useToast();
  const [choose, setChoose] = useState(false);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ code: '', kind: 'percent' as 'percent' | 'amount', value: '', ends: '' });
  const [tried, setTried] = useState(false);

  const err: Record<string, string> = {};
  if (!/^[A-Z0-9]{3,15}$/.test(f.code)) err.code = 'Use 3–15 capital letters or numbers, like DIWALI10.';
  else if (db.offers.some((o) => o.code === f.code)) err.code = 'You already have an offer with this code.';
  const v = Number(f.value);
  if (!Number.isInteger(v) || v < 1 || (f.kind === 'percent' && v > 90)) err.value = f.kind === 'percent' ? 'Pick a percentage between 1 and 90.' : 'Add an amount in rupees.';
  const e = (k: string) => (tried ? err[k] : undefined);
  const create = () => {
    setTried(true);
    if (Object.keys(err).length) return;
    const ends = f.ends ? 'Ends ' + new Date(f.ends).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No end date';
    saveOffer({ code: f.code, what: f.kind === 'percent' ? `${v}% off everything` : `₹${v.toLocaleString('en-IN')} off`, used: 0, ends, on: true });
    toast(`${f.code} created and switched on.`);
    setOpen(false); setF({ code: '', kind: 'percent', value: '', ends: '' }); setTried(false);
  };
  const pick = (id: (typeof KINDS)[number]['id'], ready: boolean) => {
    if (!ready) { toast('That kind of offer is coming in a later version.', { icon: 'info' }); return; }
    setChoose(false); setF((x) => ({ ...x, kind: id as 'percent' | 'amount' })); setOpen(true);
  };

  return (
    <>
      <TopRow icon="percent" title="Discounts & offers"><button className="btn ink sm" type="button" onClick={() => setChoose(true)}>Create offer</button></TopRow>
      <div className="dpad">
        {db.offers.length ? (
          <div className="box tbox">
            <table className="tbl">
              <thead><tr><th>Code</th><th>Offer</th><th className="r">Used</th><th>Ends</th><th>Status</th><th /></tr></thead>
              <tbody>
                {db.offers.map((o) => (
                  <tr key={o.code}>
                    <td><b>{o.code}</b></td><td>{o.what}</td><td className="r">{o.used}</td><td className="muted">{o.ends}</td>
                    <td><span className={`tag ${o.on ? 'ok' : 'neutral'}`}>{o.on ? 'On' : 'Off'}</span></td>
                    <td className="r"><DSwitch on={o.on} label={`${o.code} on or off`} onChange={() => { toggleOffer(o.code); toast(`${o.code} is now ${o.on ? 'off' : 'on'}.`, { undo: () => toggleOffer(o.code) }); }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px', maxWidth: 640, margin: '20px auto 0' }}>
            <div><Art k="gift" height={120} /></div>
            <div className="h2" style={{ margin: '10px 0 6px' }}>Give buyers a reason to buy today</div>
            <p className="muted small" style={{ margin: '0 0 16px' }}>Coupon codes and festival offers that work on WhatsApp, Instagram and your shop link.</p>
            <button className="btn main" type="button" onClick={() => setChoose(true)}>Create offer</button>
          </div>
        )}
        <p className="cap" style={{ marginTop: 14, textAlign: 'center' }}>“Used” counts come from checkout. In this demo they are sample numbers.</p>
      </div>

      <Dialog open={choose} onClose={() => setChoose(false)} title="Choose an offer">
        <div className="card" style={{ padding: '4px 14px' }}>
          {KINDS.map((k) => (
            <button className="dset-row" type="button" key={k.id} onClick={() => pick(k.id, k.ready)}>
              <DI n={k.icon} /><span className="sp"><b>{k.title}</b><br /><span className="small muted">{k.text}{k.ready ? '' : ' · coming soon'}</span></span><DI n="right" s={18} />
            </button>
          ))}
        </div>
      </Dialog>
      <Dialog open={open} onClose={() => setOpen(false)} title="Create offer" footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button kind="ink" onClick={create}>Create offer</Button></>}>
        <div className="stack">
          <Field id="of-code" label="Code" required hint="Buyers type this at checkout." error={e('code')}><input id="of-code" className={`input${e('code') ? ' bad' : ''}`} value={f.code} onChange={(x) => setF({ ...f, code: x.target.value.toUpperCase().replace(/\s/g, '') })} placeholder="DIWALI10" /></Field>
          <div className="field"><span className="flabel">Discount type</span><Segmented label="Discount type" value={f.kind} onChange={(k) => setF({ ...f, kind: k })} options={[{ value: 'percent', label: 'Percent off' }, { value: 'amount', label: 'Rupees off' }]} /></div>
          <Field id="of-val" label={f.kind === 'percent' ? 'Percent off' : 'Amount off'} required error={e('value')}><div className={`affix${e('value') ? ' bad' : ''}`}><span aria-hidden="true">{f.kind === 'percent' ? '%' : '₹'}</span><input id="of-val" inputMode="numeric" value={f.value} onChange={(x) => setF({ ...f, value: x.target.value.replace(/\D/g, '') })} placeholder={f.kind === 'percent' ? '10' : '200'} /></div></Field>
          <Field id="of-end" label="Ends on" optional><input id="of-end" className="input" type="date" value={f.ends} onChange={(x) => setF({ ...f, ends: x.target.value })} /></Field>
        </div>
      </Dialog>
    </>
  );
}
