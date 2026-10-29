'use client';
// Checkout: contact, delivery address, payment method and a summary. The payment itself is simulated in demo mode.
// API_TODO: POST /api/public/:shop/checkout then open the payment provider; the order is marked paid only when the provider confirms.
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button, ButtonLink, Card, EmptyState, Field, Icon, Skeleton } from '@/components/ui';
import { BUYER_KEY, ProductArt, StateScreen } from '@/components/bits';
import { shopBase } from '@/components/shop/ShopChrome';
import { useBag } from '@/lib/bag';
import { useStore } from '@/lib/store';
import { rs } from '@/lib/format';

type Pay = 'upi' | 'card' | 'cod';
const STATES = ['Rajasthan', 'Maharashtra', 'Karnataka', 'Delhi', 'Tamil Nadu', 'Gujarat', 'Uttar Pradesh', 'West Bengal', 'Kerala', 'Other'];

export default function Checkout() {
  const { handle } = useParams<{ handle: string }>(); const base = shopBase(handle); const router = useRouter(); const sp = useSearchParams();
  const bag = useBag(); const { db, mode, placeBuyerOrder, updateOrder } = useStore();
  const demo = sp.get('demo') === 'filled';
  const [f, setF] = useState({ name: demo ? 'Priya Sharma' : '', phone: demo ? '9876543210' : '', email: '', line: demo ? '12 Lake View Road, Indiranagar' : '', pin: demo ? '411001' : '', city: demo ? 'Pune' : '', state: 'Maharashtra', note: '' });
  const [pay, setPay] = useState<Pay>('upi'); const [tried, setTried] = useState(false); const [stage, setStage] = useState<'form' | 'paying'>('form');
  const [outcome, setOutcome] = useState<'success' | 'failed' | 'pending'>('success'); const [orderError, setOrderError] = useState('');

  if (!bag.ready) return <div className="wrap" style={{ padding: 'var(--s4) 16px' }}><Skeleton rows={3} height={120} /></div>;
  if (!bag.detailed.length && stage === 'form') return <div className="wrap"><EmptyState icon="shopping_bag" title="Nothing to check out" text="Your bag is empty. Add something first." action={<ButtonLink href={base} kind="primary">Back to the shop</ButtonLink>} /></div>;
  if (!db.shop.open) return <div className="wrap"><StateScreen kind="empty" compact title={`${db.shop.name} isn’t taking orders`} text="The shop is paused for now. Your bag is saved, so you can come back and order later." actions={<ButtonLink href={`${base}/bag`}>Back to my bag</ButtonLink>} /></div>;

  const err: Record<string, string> = {};
  if (f.name.trim().length < 2) err.name = 'Tell us your name.';
  if (f.phone.replace(/\D/g, '').length !== 10) err.phone = 'Enter a 10-digit mobile number.';
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) err.email = 'That email doesn’t look right.';
  if (f.line.trim().length < 6) err.line = 'Add your house number and street.';
  if (!/^\d{6}$/.test(f.pin)) err.pin = 'A pincode has 6 digits.';
  if (!f.city.trim()) err.city = 'Add your city.';
  const e = (k: string) => (tried ? err[k] : undefined);
  const set = (k: keyof typeof f) => (x: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: x.target.value });

  const place = async () => {
    setTried(true); if (Object.keys(err).length) { document.querySelector<HTMLElement>('.input.bad,.affix.bad input')?.focus(); return; }
    setStage('paying'); setOrderError('');
    const phone = '+91 ' + f.phone.replace(/\D/g, '');
    try {
      const [order] = await Promise.all([
        placeBuyerOrder({ handle, name: f.name.trim(), phone, city: f.city.trim(), address: `${f.line.trim()}, ${f.city.trim()}, ${f.state} ${f.pin}`, note: f.note.trim() || undefined, pay: pay === 'cod' ? 'cod' : pay, lines: bag.detailed.map((d) => ({ productId: d.product.id, qty: d.line.qty, size: d.line.size })), shipping: bag.delivery }),
        new Promise((r) => setTimeout(r, 1100)),
      ]);
      // Online payments: in demo mode the outcome comes from the selector. With a real database the order waits as unpaid
      // until the payment provider confirms it (not connected yet), so the buyer sees "pending".
      const result = pay === 'cod' ? 'success' : mode === 'demo' ? outcome : 'pending';
      if (mode === 'demo' && result === 'success' && pay !== 'cod') updateOrder(order.id, { paid: true });
      try { localStorage.setItem(BUYER_KEY, JSON.stringify({ name: f.name.trim(), phone })); } catch { /* ignore */ }
      if (result !== 'failed') bag.clear();
      router.push(`${base}/payment/${result}?order=${order.id}&method=${pay}`);
    } catch (e) { setOrderError((e as Error).message); setStage('form'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  };

  if (stage === 'paying') return <div className="wrap"><StateScreen kind="loading" title={pay === 'cod' ? 'Placing your order…' : 'Opening your payment…'} text="Please don’t close this page or press back." /></div>;

  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb"><Link href={`${base}/bag`}>Bag</Link><Icon name="chevron_right" size="xs" /><b className="t-ink" style={{ fontWeight: 500 }}>Checkout</b></nav>
      <h1 className="h1">Checkout</h1>
      {orderError && <div className="banner bad" role="alert" style={{ marginTop: 'var(--s2)' }}><Icon name="error" /><span>{orderError}</span></div>}
      <form className="co" noValidate onSubmit={(ev) => { ev.preventDefault(); place(); }}>
        <div className="stack">
          <Card className="stack" title="1. Contact" icon="person">
            <div className="grid2">
              <Field id="co-name" label="Full name" required error={e('name')}><input id="co-name" className={`input ${e('name') ? 'bad' : ''}`} value={f.name} onChange={set('name')} autoComplete="name" /></Field>
              <Field id="co-phone" label="Mobile number" required error={e('phone')} hint="For delivery updates."><div className={`affix ${e('phone') ? 'bad' : ''}`}><span aria-hidden="true">+91</span><input id="co-phone" type="tel" inputMode="numeric" value={f.phone} onChange={(x) => setF({ ...f, phone: x.target.value.replace(/\D/g, '').slice(0, 10) })} autoComplete="tel-national" /></div></Field>
            </div>
            <Field id="co-email" label="Email" optional error={e('email')} hint="For your receipt."><input id="co-email" type="email" className={`input ${e('email') ? 'bad' : ''}`} value={f.email} onChange={set('email')} autoComplete="email" /></Field>
          </Card>
          <Card className="stack" title="2. Delivery address" icon="local_shipping">
            <Field id="co-line" label="House number and street" required error={e('line')}><input id="co-line" className={`input ${e('line') ? 'bad' : ''}`} value={f.line} onChange={set('line')} autoComplete="street-address" /></Field>
            <div className="grid2">
              <Field id="co-pin" label="Pincode" required error={e('pin')}><input id="co-pin" className={`input ${e('pin') ? 'bad' : ''}`} inputMode="numeric" maxLength={6} value={f.pin} onChange={(x) => setF({ ...f, pin: x.target.value.replace(/\D/g, '') })} autoComplete="postal-code" /></Field>
              <Field id="co-city" label="City" required error={e('city')}><input id="co-city" className={`input ${e('city') ? 'bad' : ''}`} value={f.city} onChange={set('city')} autoComplete="address-level2" /></Field>
            </div>
            <Field id="co-state" label="State"><select id="co-state" className="input" value={f.state} onChange={set('state')}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field id="co-note" label="Note for the seller" optional><textarea id="co-note" className="input" rows={2} value={f.note} onChange={set('note')} placeholder="Gift wrap, landmark, best time to call…" /></Field>
          </Card>
          <Card className="stack tight" title="3. Payment" icon="payments">
            <div className="payopts" role="radiogroup" aria-label="Payment method">{([['upi', 'UPI', 'Pay with any UPI app', 'qr_code_2'], ['card', 'Card or netbanking', 'Secure online payment', 'credit_card'], ...(db.shop.cod ? [['cod', 'Cash on delivery', 'Pay when the parcel arrives', 'payments']] : [])] as [Pay, string, string, string][]).map(([k, t, d, i]) => (
              <button key={k} type="button" role="radio" aria-checked={pay === k} className={`trow radio ${pay === k ? 'on' : ''}`} onClick={() => setPay(k)}><span className="rdot">{pay === k && <Icon name="check" size="xs" />}</span><Icon name={i} /><span className="grow"><span className="t">{t}</span><span className="s">{d}</span></span></button>))}</div>
            {mode === 'demo' ? <div className="banner info"><Icon name="science" /><span><b>Demo:</b> no money moves. Choose what happens after you pay:{' '}
              <select className="input sel-sm" aria-label="Demo payment result" value={outcome} onChange={(x) => setOutcome(x.target.value as typeof outcome)}><option value="success">Payment succeeds</option><option value="failed">Payment fails</option><option value="pending">Payment is pending</option></select></span></div> : <div className="banner info"><Icon name="info" /><span>Online payments are confirmed by the seller’s payment provider. Until then your order shows as waiting for payment.</span></div>}
          </Card>
        </div>
        <Card className="sumbox" title="Your order">
          <div className="stack tight">{bag.detailed.map(({ line, product, index }) => (<div className="sumline" key={index}><ProductArt product={product} /><span><span className="t-ink" style={{ fontWeight: 500, display: 'block' }}>{product.name}</span><span className="cap">{line.size ? `Size ${line.size} · ` : ''}Qty {line.qty}</span></span><span className="money">{rs(product.price * line.qty)}</span></div>))}</div>
          <div className="kv"><div className="r"><span>Subtotal</span><span>{rs(bag.subtotal)}</span></div><div className="r"><span>Delivery</span><span>{bag.delivery ? rs(bag.delivery) : 'Free'}</span></div><div className="r t"><span>{pay === 'cod' ? 'To pay on delivery' : 'To pay now'}</span><span>{rs(bag.total)}</span></div></div>
          <Button kind="primary" full type="submit" icon={pay === 'cod' ? 'check' : 'lock'}>{pay === 'cod' ? 'Place order' : `Pay ${rs(bag.total)}`}</Button>
          <p className="cap"><Icon name="lock" size="xs" /> Payments are handled by our payment provider. Stoora never sees your card details. By ordering you agree to the <Link className="link" href="/terms">terms</Link>.</p>
        </Card>
      </form>
    </div>
  );
}
