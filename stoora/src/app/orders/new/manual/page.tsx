'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { Button, Chips, Field, Icon, PageHeader, useToast } from '@/components/ui';
import { ProductPicker } from '@/components/ProductPicker';
import { rs, toNum } from '@/lib/format';
import type { Source } from '@/lib/types';

const SOURCES: Source[] = ['WhatsApp', 'Instagram', 'Phone call', 'In person', 'Other'];
const SRC_ICON: Record<string, string> = { WhatsApp: 'chat', Instagram: 'photo_camera', 'Phone call': 'call', 'In person': 'storefront', Other: 'more_horiz' };
const PAY = [
  ['paid', 'Paid already', 'Only if you’ve seen the money in your UPI app, bank or hand.'],
  ['upi', 'Not paid yet (UPI)', 'You can send a payment reminder from the order page.'],
  ['cod', 'Cash on delivery', 'Collect the money when the parcel reaches the buyer.'],
] as const;
type Line = { productId: string; qty: number; size: string };

export default function ManualOrder() {
  const { db, product, createOrder } = useStore(); const router = useRouter(); const toast = useToast();
  const [buyer, setBuyer] = useState(''); const [phone, setPhone] = useState(''); const [source, setSource] = useState<Source>('WhatsApp');
  const [lines, setLines] = useState<Line[]>([]); const [pay, setPay] = useState<'paid' | 'upi' | 'cod'>('upi');
  const [ship, setShip] = useState(''); const [city, setCity] = useState(''); const [address, setAddress] = useState(''); const [notes, setNotes] = useState('');
  const [picker, setPicker] = useState(false); const [busy, setBusy] = useState(false); const [tried, setTried] = useState(false);
  const dirty = !!(buyer || phone || lines.length || notes || address);
  useEffect(() => { if (!dirty || busy) return; const f = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; }; window.addEventListener('beforeunload', f); return () => window.removeEventListener('beforeunload', f); }, [dirty, busy]);

  const errors: Record<string, string> = {};
  if (!buyer.trim()) errors.buyer = 'Add the buyer’s name.';
  if (phone.trim() && phone.replace(/\D/g, '').length < 10) errors.phone = 'A phone number has at least 10 digits.';
  if (!lines.length) errors.items = 'Add at least one product.';
  lines.forEach((l, i) => { const p = product(l.productId); if (p?.sizes.length && !l.size) errors['size' + i] = 'Pick a size.'; if (p && l.qty > p.stock) errors['qty' + i] = `Only ${p.stock} in stock.`; });
  if (ship && !/^\d+$/.test(ship.trim())) errors.ship = 'Use numbers only, like 80.';
  const e = (k: string) => (tried ? errors[k] : undefined);
  const subtotal = lines.reduce((a, l) => a + (product(l.productId)?.price ?? 0) * l.qty, 0);

  const add = (id: string) => setLines((ls) => ls.some((l) => l.productId === id) ? ls.map((l) => l.productId === id ? { ...l, qty: Math.min(l.qty + 1, product(id)?.stock ?? 1) } : l) : [...ls, { productId: id, qty: 1, size: '' }]);
  const submit = (ev: React.FormEvent) => {
    ev.preventDefault(); setTried(true);
    if (Object.keys(errors).length) { toast('Fill in the highlighted fields.', { icon: 'error' }); setTimeout(() => (document.querySelector('.input.bad, [aria-invalid="true"]') as HTMLElement | null)?.focus(), 30); return; }
    setBusy(true);
    // Demo adapter: in production this is POST /api/orders. Stock goes down there, once.
    setTimeout(() => {
      const o = createOrder({ buyer: buyer.trim(), phone: phone.trim() || undefined, city: city.trim() || undefined, address: address.trim() || undefined, source, lines: lines.map((l) => ({ productId: l.productId, qty: l.qty, size: l.size || undefined })), shipping: toNum(ship), notes: notes.trim() || undefined, pay, createdBy: 'manual' });
      toast(`Order #${o.id} created.`); router.push(`/orders/${o.id}`);
    }, 350);
  };

  return (
    <>
      <PageHeader title="Add order yourself" lede="Three short steps. Fields marked required must be filled." />
      <form className="form2" onSubmit={submit} noValidate>
        <div>
          <section className="card stack">
            <h2 className="ct"><span className="stepno">1</span>Buyer</h2>
            <div className="grid2">
              <Field id="co-who" label="Buyer’s name" required error={e('buyer')}><input id="co-who" className={`input ${e('buyer') ? 'bad' : ''}`} aria-invalid={!!e('buyer')} autoComplete="off" value={buyer} onChange={(x) => setBuyer(x.target.value)} placeholder="Priya Sharma" /></Field>
              <Field id="co-ph" label="WhatsApp number" optional hint="Used to message the buyer about this order." error={e('phone')}><input id="co-ph" className={`input ${e('phone') ? 'bad' : ''}`} type="tel" inputMode="tel" value={phone} onChange={(x) => setPhone(x.target.value)} placeholder="+91 98480 21234" /></Field>
            </div>
            <div className="field"><span className="flabel">Where did this order come from? <span className="req">Required</span></span>
              <Chips label="Where the order came from" value={source} onChange={setSource} options={SOURCES.map((s) => ({ value: s, label: s, icon: SRC_ICON[s] }))} /></div>
          </section>

          <section className="card">
            <div className="card-h"><h2 className="ct"><span className="stepno">2</span>Products <span className="req">Required</span></h2><Button type="button" small icon="add" onClick={() => setPicker(true)}>Add products</Button></div>
            {lines.length ? <div className="rows">{lines.map((l, n) => { const p = product(l.productId)!; return (
              <div key={l.productId} className="li co-line" style={{ background: 'var(--inner)', flexWrap: 'wrap' }}>
                <span className="thumb sm"><Icon name={p.icon} size="sm" /></span>
                <span className="grow" style={{ minWidth: 140 }}><span className="t">{p.name}</span><span className="s num">{rs(p.price)} each · {p.stock} in stock</span></span>
                {p.sizes.length > 0 && <><label className="sr" htmlFor={`co-sz-${n}`}>Size for {p.name}</label>
                  <select id={`co-sz-${n}`} className={`input sel-sm ${e('size' + n) ? 'bad' : ''}`} value={l.size} onChange={(x) => setLines((ls) => ls.map((y, i) => i === n ? { ...y, size: x.target.value } : y))}><option value="">Size…</option>{p.sizes.map((s) => <option key={s}>{s}</option>)}</select></>}
                <span className="step" role="group" aria-label={`Quantity of ${p.name}`}>
                  <button type="button" aria-label={l.qty > 1 ? 'One less' : 'Remove'} onClick={() => setLines((ls) => l.qty > 1 ? ls.map((y, i) => i === n ? { ...y, qty: y.qty - 1 } : y) : ls.filter((_, i) => i !== n))}><Icon name={l.qty > 1 ? 'remove' : 'delete'} size="xs" /></button>
                  <output className="num">{l.qty}</output>
                  <button type="button" aria-label="One more" disabled={l.qty >= p.stock} onClick={() => setLines((ls) => ls.map((y, i) => i === n ? { ...y, qty: y.qty + 1 } : y))}><Icon name="add" size="xs" /></button>
                </span>
                <span className="money">{rs(p.price * l.qty)}</span>
                {(e('size' + n) || e('qty' + n)) && <span className="err" style={{ width: '100%' }}><Icon name="error" size="xs" />{e('size' + n) ?? e('qty' + n)}</span>}
              </div>); })}</div>
              : <div className="inner" style={{ textAlign: 'center', padding: 'var(--s4) var(--s3)' }}><p className="t-soft">No products yet.</p><p className="cap">Add what the buyer wants. Stock goes down when you create the order.</p>{e('items') && <p className="err" style={{ justifyContent: 'center', marginTop: 'var(--s1)' }}><Icon name="error" size="xs" />{e('items')}</p>}</div>}
          </section>

          <section className="card stack">
            <h2 className="ct" id="co-pay-l"><span className="stepno">3</span>Payment and delivery</h2>
            <div className="stack tight" role="radiogroup" aria-labelledby="co-pay-l">{PAY.map(([k, l, s]) => (
              <button key={k} type="button" role="radio" aria-checked={pay === k} className={`trow radio ${pay === k ? 'on' : ''}`} onClick={() => setPay(k)}><span className="rdot" aria-hidden="true">{pay === k && <Icon name="check" size="xs" />}</span><span className="grow"><span className="t">{l}</span><span className="s">{s}</span></span></button>))}</div>
            <div className="grid2">
              <Field id="co-city" label="City" optional><input id="co-city" className="input" value={city} onChange={(x) => setCity(x.target.value)} placeholder="Pune" /></Field>
              <Field id="co-ship" label="Delivery charge" optional hint="Leave empty for free delivery." error={e('ship')}><div className="affix"><span aria-hidden="true">₹</span><input id="co-ship" inputMode="numeric" value={ship} onChange={(x) => setShip(x.target.value)} placeholder="0" /></div></Field>
            </div>
            <Field id="co-addr" label="Full address" optional><textarea id="co-addr" className="input" rows={2} value={address} onChange={(x) => setAddress(x.target.value)} /></Field>
            <Field id="co-notes" label="Notes" optional><input id="co-notes" className="input" value={notes} onChange={(x) => setNotes(x.target.value)} placeholder="Gift wrap, deliver after 6 pm" /></Field>
          </section>
        </div>
        <div>
          <section className="card stack" style={{ position: 'sticky', top: 80 }}>
            <h2 className="ct">Summary</h2>
            <div className="kv">
              {lines.length ? lines.map((l) => { const p = product(l.productId)!; return <div className="r" key={l.productId}><span>{p.name}{l.size ? ' · ' + l.size : ''} × {l.qty}</span><span>{rs(p.price * l.qty)}</span></div>; }) : <div className="r"><span>No products yet</span><span>₹0</span></div>}
              <div className="r"><span>Delivery</span><span>{toNum(ship) ? rs(toNum(ship)) : 'Free'}</span></div>
              <div className="r t"><span>Total</span><span>{rs(subtotal + toNum(ship))}</span></div>
            </div>
            <Button kind="primary" full type="submit" busy={busy} busyLabel="Creating…">Create order</Button>
            <Link className="btn quiet full" href="/orders/new">Back</Link>
            <p className="cap">Shop: {db.shop.name}</p>
          </section>
        </div>
      </form>
      <ProductPicker open={picker} onClose={() => setPicker(false)} onPick={add} taken={lines.map((l) => l.productId)} />
    </>
  );
}
