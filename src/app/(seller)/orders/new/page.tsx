'use client';
// Create an order by hand: who it is for, what they bought, and how they pay (the dashboard prototype's Create order screen).
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { BackRow, Chk, DAv, DI, Ms } from '@/components/dash/parts';
import { Button, Dialog, Skeleton, useToast } from '@/components/ui';
import { rs } from '@/lib/format';
import { useStore } from '@/lib/store';
import type { Source } from '@/lib/types';

const SOURCES: Source[] = ['WhatsApp', 'Instagram', 'In person', 'Phone call'];
type Line = { productId: string; qty: number; size?: string };

export default function CreateOrder() {
  const { db, ready, createOrder } = useStore();
  const router = useRouter();
  const toast = useToast();
  const [buyer, setBuyer] = useState({ name: '', phone: '', city: '', address: '' });
  const [source, setSource] = useState<Source>('WhatsApp');
  const [lines, setLines] = useState<Line[]>([]);
  const [shipping, setShipping] = useState('0');
  const [notes, setNotes] = useState('');
  const [picker, setPicker] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [find, setFind] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [tried, setTried] = useState(false);

  const subtotal = useMemo(() => lines.reduce((a, l) => a + (db.products.find((p) => p.id === l.productId)?.price ?? 0) * l.qty, 0), [lines, db.products]);
  if (!ready) return <div className="dpad" style={{ paddingTop: 20 }}><Skeleton rows={3} height={100} /></div>;

  const ship = Math.max(0, Math.floor(Number(shipping) || 0));
  const total = subtotal + ship;
  const available = db.products.filter((p) => p.status === 'Active' && p.stock > 0 && (!find.trim() || p.name.toLowerCase().includes(find.trim().toLowerCase())));
  const nameError = tried && !buyer.name.trim() ? 'Add who the order is for.' : '';

  const place = (pay: 'paid' | 'upi' | 'cod') => {
    setTried(true);
    if (!buyer.name.trim()) { document.getElementById('co-name')?.focus(); return; }
    if (!lines.length) { toast('Add at least one product first.', { icon: 'error' }); return; }
    const made = createOrder({ buyer: buyer.name.trim(), phone: buyer.phone.trim() || undefined, city: buyer.city.trim() || undefined, address: buyer.address.trim() || undefined, source, lines, shipping: ship, notes: notes.trim() || undefined, pay, createdBy: 'manual' });
    toast(pay === 'paid' ? `Order #${made.id} created and marked paid.` : pay === 'upi' ? `Order #${made.id} created. Send the buyer the UPI link.` : `Order #${made.id} created for cash on delivery.`, { icon: 'shopping_bag' });
    router.push(`/orders/${made.id}${pay === 'upi' ? '?dialog=msg' : ''}`);
  };
  const addPicked = () => {
    setLines((cur) => [...cur, ...picked.filter((id) => !cur.some((l) => l.productId === id)).map((productId) => ({ productId, qty: 1 }))]);
    setPicked([]); setPicker(false); setFind('');
  };
  const setQty = (i: number, d: number) => setLines((cur) => cur.map((l, n) => (n === i ? { ...l, qty: Math.min(10, Math.max(1, l.qty + d)) } : l)));
  const pastBuyer = (id: string) => { const c = db.customers.find((x) => x.id === id); if (c) { setBuyer({ name: c.name, phone: c.phone, city: c.city, address: '' }); setSource(c.source); } };

  return (
    <>
      <BackRow to="/orders" icon="orders" title="Orders">
        <Link className="btn line sm" href="/orders/new/ai"><DI n="spark" s={16} /> Fill from a chat message</Link>
      </BackRow>
      <div className="dpad">
        <h1 className="h1" style={{ margin: '0 0 16px' }}>Create order</h1>
        <div className="cols">
          <div>
            <div className="card">
              <div className="box-h"><span className="box-t">Items</span></div>
              <button className="search" type="button" style={{ width: '100%', marginBottom: lines.length ? 12 : 0 }} onClick={() => setPicker(true)}><DI n="search" s={16} /> Search products</button>
              {lines.map((l, i) => {
                const p = db.products.find((x) => x.id === l.productId);
                if (!p) return null;
                return (
                  <div className="row" key={l.productId} style={{ padding: '12px 0', borderTop: '1px solid var(--line-soft)', flexWrap: 'wrap' }}>
                    <div className="thumb" style={{ width: 40, height: 40 }}><Ms n={p.icon} /></div>
                    <div className="sp small"><b>{p.name}</b>{p.sizes.length ? (
                      <div style={{ marginTop: 4 }}><select className="input" style={{ height: 32, fontSize: 13, width: 'auto' }} aria-label={`Size for ${p.name}`} value={l.size ?? ''} onChange={(e) => setLines((cur) => cur.map((x, n) => (n === i ? { ...x, size: e.target.value || undefined } : x)))}><option value="">No size</option>{p.sizes.map((z) => <option key={z}>{z}</option>)}</select></div>
                    ) : null}</div>
                    <div className="dstep"><button type="button" aria-label="One less" onClick={() => setQty(i, -1)}>−</button><input value={l.qty} readOnly aria-label="Quantity" /><button type="button" aria-label="One more" onClick={() => setQty(i, 1)}>+</button></div>
                    <span className="small muted" style={{ width: 90, textAlign: 'right' }}>{rs(p.price)} × {l.qty}</span>
                    <span className="money small" style={{ width: 70, textAlign: 'right' }}>{rs(p.price * l.qty)}</span>
                    <button type="button" aria-label={`Remove ${p.name}`} onClick={() => setLines((cur) => cur.filter((_, n) => n !== i))}><DI n="x" s={16} /></button>
                  </div>
                );
              })}
              <button className="btn ink" type="button" style={{ marginTop: 12 }} onClick={() => setPicker(true)}><DI n="plus" s={16} /> Add products</button>
            </div>
            <div className="card">
              <div className="box-h"><span className="box-t">Payment</span></div>
              <div className="sum">
                <div className="r"><span>Subtotal</span><span>{rs(subtotal)}</span></div>
                <div className="r"><label htmlFor="co-ship">Delivery</label><span className="row" style={{ gap: 6 }}>₹<input id="co-ship" className="input" inputMode="numeric" style={{ width: 80, height: 32, padding: '0 10px', borderRadius: 10 }} value={shipping} onChange={(e) => setShipping(e.target.value.replace(/\D/g, ''))} /></span></div>
                <div className="r t"><span>Total</span><span>{rs(total)}</span></div>
              </div>
              {total ? (
                <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                  <button className="btn line" type="button" onClick={() => place('cod')}>Cash on delivery</button>
                  <button className="btn line" type="button" onClick={() => { setTried(true); if (!buyer.name.trim()) { document.getElementById('co-name')?.focus(); return; } setConfirm(true); }}>Mark as paid (cash or UPI)</button>
                  <button className="btn main" type="button" onClick={() => place('upi')}><DI n="wa" s={16} /> Create and send UPI link</button>
                </div>
              ) : <p className="muted small" style={{ margin: '12px 0 0' }}>Add items to see payment options.</p>}
            </div>
          </div>
          <div>
            <div className="card side-card">
              <div className="dsec">
                <div className="dsec-h">Buyer</div>
                <div className="row" style={{ marginBottom: 12 }}>{buyer.name ? <DAv name={buyer.name} /> : <div className="av" style={{ background: 'var(--ink-45)' }} aria-hidden="true">?</div>}<div className="sp small muted">{buyer.name ? 'Details below' : 'Who is this order for?'}</div></div>
                {db.customers.length ? (
                  <div className="field"><label htmlFor="co-past">Past buyer</label><select id="co-past" className="input" value="" onChange={(e) => pastBuyer(e.target.value)}><option value="">Pick someone you’ve sold to…</option>{db.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                ) : null}
                <div className="field"><label htmlFor="co-name">Name</label><input id="co-name" className={`input${nameError ? ' bad' : ''}`} value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} autoComplete="off" />{nameError ? <span className="err" role="alert">{nameError}</span> : null}</div>
                <div className="field"><label htmlFor="co-phone">Phone</label><input id="co-phone" className="input" inputMode="tel" value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} /></div>
                <div className="field"><label htmlFor="co-city">City</label><input id="co-city" className="input" value={buyer.city} onChange={(e) => setBuyer({ ...buyer, city: e.target.value })} /></div>
                <div className="field" style={{ marginBottom: 0 }}><label htmlFor="co-addr">Address</label><textarea id="co-addr" className="input" rows={2} value={buyer.address} onChange={(e) => setBuyer({ ...buyer, address: e.target.value })} /></div>
              </div>
              <div className="dsec"><div className="dsec-h">Came from</div><div className="chips wrap">{SOURCES.map((c) => <button key={c} className={`chip${source === c ? ' on' : ''}`} type="button" aria-pressed={source === c} onClick={() => setSource(c)}>{c}</button>)}</div></div>
              <div className="dsec"><div className="dsec-h">Notes</div><textarea className="input" rows={2} aria-label="Notes" placeholder="Only you see these" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={picker} onClose={() => setPicker(false)} title="Add items" footer={<><Button onClick={() => setPicker(false)}>Cancel</Button><Button kind="primary" disabled={!picked.length} onClick={addPicked}>Add{picked.length ? ` ${picked.length}` : ''}</Button></>}>
        <label className="search" style={{ marginBottom: 10 }}><DI n="search" s={18} /><span className="sr">Search products</span><input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Search products" autoFocus style={{ border: 0, background: 'none', outline: 'none', flex: 1 }} /></label>
        <div className="list">
          {available.map((p) => (
            <button className="li" type="button" key={p.id} onClick={() => setPicked((c) => (c.includes(p.id) ? c.filter((x) => x !== p.id) : [...c, p.id]))}>
              <Chk on={picked.includes(p.id) || lines.some((l) => l.productId === p.id)} label={`Pick ${p.name}`} />
              <div className="thumb" style={{ width: 40, height: 40 }}><Ms n={p.icon} /></div>
              <div className="sp"><b className="small">{p.name}</b><div className={`tiny ${p.stock <= 3 ? 'low' : 'muted'}`}>{p.stock} in stock</div></div>
              <span className="money small">{rs(p.price)}</span>
            </button>
          ))}
          {!available.length ? <p className="muted small">No products match. Only active products that are in stock can be added.</p> : null}
        </div>
      </Dialog>
      <Dialog open={confirm} onClose={() => setConfirm(false)} title="Mark as paid" footer={<><Button onClick={() => setConfirm(false)}>Cancel</Button><Button kind="primary" onClick={() => { setConfirm(false); place('paid'); }}>Create order</Button></>}>
        <p style={{ margin: 0 }}>Mark as paid only if you already got <b>{rs(total)}</b> by cash or UPI. This creates the order.</p>
      </Dialog>
    </>
  );
}
