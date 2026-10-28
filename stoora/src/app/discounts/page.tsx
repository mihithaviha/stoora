'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Badge, Button, Card, DemoBar, Dialog, EmptyState, Field, Icon, PageHeader, Segmented, Switch, useToast } from '@/components/ui';

export default function DiscountsPage() {
  const { db, saveOffer, toggleOffer } = useStore(); const toast = useToast();
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
    setTried(true); if (Object.keys(err).length) return;
    const ends = f.ends ? 'Ends ' + new Date(f.ends).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No end date';
    saveOffer({ code: f.code, what: f.kind === 'percent' ? `${v}% off everything` : `₹${v.toLocaleString('en-IN')} off`, used: 0, ends, on: true });
    toast(`${f.code} created and switched on.`); setOpen(false); setF({ code: '', kind: 'percent', value: '', ends: '' }); setTried(false);
  };
  return (
    <>
      <DemoBar />
      <PageHeader title="Discounts" lede="Codes buyers type at checkout, or you share in chats." actions={<Button kind="primary" icon="add" onClick={() => setOpen(true)}>Create offer</Button>} />
      {db.offers.length ? <div className="rows">{db.offers.map((o) => (
        <div key={o.code} className="li" style={{ flexWrap: 'wrap' }}>
          <span className="thumb"><Icon name="local_offer" /></span>
          <span className="grow" style={{ minWidth: 160 }}><span className="t">{o.code}</span><span className="s">{o.what} · used {o.used} times · {o.ends}</span></span>
          {o.on ? <Badge tone="ok" icon="check_circle">On</Badge> : <Badge tone="neutral" icon="pause_circle">Off</Badge>}
          <Switch checked={o.on} onChange={() => { toggleOffer(o.code); toast(`${o.code} is now ${o.on ? 'off' : 'on'}.`, { undo: () => toggleOffer(o.code) }); }} label={`${o.code} on or off`} />
        </div>))}</div>
        : <Card><EmptyState icon="redeem" title="No offers yet" text="A small offer to past buyers is a cheap way to get a repeat order." action={<Button kind="primary" small onClick={() => setOpen(true)}>Create offer</Button>} /></Card>}
      <p className="cap" style={{ marginTop: 'var(--s3)' }}>“Used” counts come from checkout. In this demo they are sample numbers.</p>
      <Dialog open={open} onClose={() => setOpen(false)} title="Create offer" footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button kind="ink" onClick={create}>Create offer</Button></>}>
        <div className="stack">
          <Field id="of-code" label="Code" required hint="Buyers type this at checkout." error={e('code')}><input id="of-code" className={`input ${e('code') ? 'bad' : ''}`} value={f.code} onChange={(x) => setF({ ...f, code: x.target.value.toUpperCase().replace(/\s/g, '') })} placeholder="DIWALI10" /></Field>
          <div className="field"><span className="flabel">Discount type</span><Segmented label="Discount type" value={f.kind} onChange={(k) => setF({ ...f, kind: k })} options={[{ value: 'percent', label: 'Percent off' }, { value: 'amount', label: 'Rupees off' }]} /></div>
          <Field id="of-val" label={f.kind === 'percent' ? 'Percent off' : 'Amount off'} required error={e('value')}><div className={`affix ${e('value') ? 'bad' : ''}`}><span aria-hidden="true">{f.kind === 'percent' ? '%' : '₹'}</span><input id="of-val" inputMode="numeric" value={f.value} onChange={(x) => setF({ ...f, value: x.target.value.replace(/\D/g, '') })} placeholder={f.kind === 'percent' ? '10' : '100'} /></div></Field>
          <Field id="of-end" label="Ends on" optional><input id="of-end" className="input" type="date" value={f.ends} onChange={(x) => setF({ ...f, ends: x.target.value })} /></Field>
        </div>
      </Dialog>
    </>
  );
}
