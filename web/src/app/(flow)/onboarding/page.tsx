'use client';
// Store setup: five short steps, then publish. Nothing here is saved on a server in demo mode.
// API_TODO: POST /api/shop (step 1), POST /api/products (step 2), PATCH /api/shop/payments (step 3), PATCH /api/shop/order-taking (step 4).
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useState } from 'react';
import { Button, ButtonLink, Card, Field, Icon, Switch, useToast } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { Logo, Stepper } from '@/components/bits';
import { WhatsAppVerify } from '@/components/WhatsAppVerify';
import { useStore } from '@/lib/store';
import { cleanHandle, rs, toNum } from '@/lib/format';

const STEPS = ['Your shop', 'First product', 'Get paid', 'Orders', 'Look'];
const CATS: [string, string][] = [['Clothing', 'checkroom'], ['Food and bakes', 'bakery_dining'], ['Jewellery', 'diamond'], ['Home and decor', 'chair'], ['Classes and coaching', 'self_improvement'], ['Something else', 'more_horiz']];
const LOOKS: [string, string, 'Warm' | 'Indigo' | 'Plain'][] = [['Warm', 'linear-gradient(135deg,#fbe0a8,#ef7f3d)', 'Warm'], ['Indigo', 'linear-gradient(135deg,#5f3ba8,#262a7a)', 'Indigo'], ['Plain', 'linear-gradient(135deg,#F7F7F7,#E0D6CA)', 'Plain']];

function Wizard() {
  const router = useRouter(); const toast = useToast(); const { createShop, mode } = useStore(); const auth = useAuth(); const [pubError, setPubError] = useState('');
  const start = Math.min(Math.max(Number(useSearchParams().get('step') || 1) - 1, 0), 5);
  const [step, setStep] = useState(start); const [tried, setTried] = useState(false);
  const [shop, setS] = useState({ name: start > 0 ? 'Meera Studio' : '', handle: start > 0 ? 'meera' : '', city: start > 0 ? 'Jaipur' : '', cat: 'Clothing' });
  const [prod, setP] = useState({ name: '', price: '', stock: '10' });
  const [pay, setPay] = useState({ upi: '', cod: true, online: true });
  const [look, setLook] = useState<'Warm' | 'Indigo' | 'Plain'>('Warm');
  const [orders, setOrders] = useState({ open: true, minimum: '', note: '' });
  const [busy, setBusy] = useState(false);

  const errs: Record<number, Record<string, string>> = {
    0: { ...(shop.name.trim() ? {} : { name: 'Add your shop’s name.' }), ...(shop.handle.length >= 3 ? {} : { handle: 'Use at least 3 letters or numbers.' }) },
    1: { ...(prod.name.trim() ? {} : { name: 'Give your product a name.' }), ...(toNum(prod.price) > 0 ? {} : { price: 'Add a price, like 499.' }) },
    2: pay.upi && !/^[\w.-]{2,}@[a-z]{2,}$/i.test(pay.upi) ? { upi: 'A UPI ID looks like name@bank.' } : {},
    3: {}, 4: {},
  };
  const e = (k: string) => (tried ? errs[step]?.[k] : undefined);
  const next = () => { setTried(true); if (Object.keys(errs[step] ?? {}).length) return; setTried(false); setStep(step + 1); };
  const publish = async () => {
    setBusy(true); setPubError('');
    const err = await createShop({ name: shop.name.trim(), handle: shop.handle, city: shop.city, category: shop.cat, cod: pay.cod, online: pay.online, open: orders.open, look, upi: pay.upi, minimum: orders.minimum, firstProduct: prod.name.trim() ? { name: prod.name.trim(), price: toNum(prod.price), stock: toNum(prod.stock) } : undefined });
    setBusy(false);
    if (err) { setPubError(err); return; }
    setStep(5); toast('Your shop is live.', { icon: 'celebration' });
  };

  if (step === 5) return (
    <div className="wizard"><div className="payres"><span className="big-ok"><Icon name="celebration" size="lg" /></span><h1 className="h1">{shop.name || 'Your shop'} is live</h1><p className="t-body">Share this link anywhere buyers are. You can change anything later in Settings.</p>
      <Card className="stack"><div className="row"><span className="grow t-ink" style={{ fontWeight: 500, overflowWrap: 'anywhere' }}>stoora.in/{shop.handle || 'yourshop'}</span><Button small icon="content_copy" onClick={() => toast('Link copied.', { icon: 'content_copy' })}>Copy</Button></div></Card>
      <div className="btns" style={{ justifyContent: 'center' }}><ButtonLink href="/s/meera" icon="open_in_new">See my shop</ButtonLink><ButtonLink href="/dashboard" kind="primary">Go to my dashboard</ButtonLink></div></div></div>
  );

  return (
    <div className="wizard">
      <div className="wiz-top"><Logo /><Link className="link" href="/dashboard">Skip for now</Link></div>
      <Stepper steps={STEPS} current={step} />
      <Card className="wiz-card" aria-live="polite">
        {step === 0 && <>
          <div><h1 className="h1">Tell us about your shop</h1><p className="t-body">This is what buyers see at the top of your page.</p></div>
          <Field id="ob-name" label="Shop name" required error={e('name')}><input id="ob-name" className={`input ${e('name') ? 'bad' : ''}`} value={shop.name} onChange={(x) => setS({ ...shop, name: x.target.value, handle: shop.handle && shop.handle !== cleanHandle(shop.name) ? shop.handle : cleanHandle(x.target.value) })} placeholder="e.g. Meera Studio" autoFocus /></Field>
          <Field id="ob-handle" label="Your shop link" required error={e('handle')} hint={`Buyers visit stoora.in/${shop.handle || 'yourshop'}`}><div className={`affix ${e('handle') ? 'bad' : ''}`}><span aria-hidden="true">stoora.in/</span><input id="ob-handle" value={shop.handle} onChange={(x) => setS({ ...shop, handle: cleanHandle(x.target.value) })} /></div></Field>
          <Field id="ob-city" label="City" optional><input id="ob-city" className="input" value={shop.city} onChange={(x) => setS({ ...shop, city: x.target.value })} /></Field>
          <div className="field"><span className="flabel">What do you sell?</span><div className="cats">{CATS.map(([c, i]) => <button key={c} type="button" className="cat" aria-pressed={shop.cat === c} onClick={() => setS({ ...shop, cat: c })}><Icon name={i} /><span className="t-ink" style={{ fontWeight: 500 }}>{c}</span></button>)}</div></div>
        </>}
        {step === 1 && <>
          <div><h1 className="h1">Add your first product</h1><p className="t-body">One is enough to start. You can add photos, sizes and more later, or <Link className="link" href="/products/import">import a spreadsheet</Link>.</p></div>
          <Field id="ob-pn" label="Product name" required error={e('name')}><input id="ob-pn" className={`input ${e('name') ? 'bad' : ''}`} value={prod.name} onChange={(x) => setP({ ...prod, name: x.target.value })} placeholder="e.g. Handblock cotton kurta" autoFocus /></Field>
          <div className="grid2"><Field id="ob-pp" label="Price" required error={e('price')}><div className={`affix ${e('price') ? 'bad' : ''}`}><span aria-hidden="true">₹</span><input id="ob-pp" inputMode="numeric" value={prod.price} onChange={(x) => setP({ ...prod, price: x.target.value })} placeholder="499" /></div></Field>
            <Field id="ob-ps" label="How many do you have?" optional><input id="ob-ps" className="input" inputMode="numeric" value={prod.stock} onChange={(x) => setP({ ...prod, stock: x.target.value })} /></Field></div>
          <div className="drop"><Icon name="add_photo_alternate" size="lg" /><b className="t-ink">Add a photo</b><span className="cap">JPG or PNG, up to 2.5 MB. Drag it here or tap to choose.</span><input type="file" accept="image/*" aria-label="Add a photo" /></div>
        </>}
        {step === 2 && <>
          <div><h1 className="h1">How will you get paid?</h1><p className="t-body">Turn on what suits you. You can change this any time.</p></div>
          <div className="toggle-row"><span className="grow"><span className="t-ink" style={{ fontWeight: 500, display: 'block' }}>Online payments</span><span className="cap">UPI, cards and netbanking. Needs a few bank details later.</span></span><Switch checked={pay.online} onChange={(v) => setPay({ ...pay, online: v })} label="Online payments" /></div>
          <div className="toggle-row"><span className="grow"><span className="t-ink" style={{ fontWeight: 500, display: 'block' }}>Cash on delivery</span><span className="cap">The buyer pays when the parcel arrives.</span></span><Switch checked={pay.cod} onChange={(v) => setPay({ ...pay, cod: v })} label="Cash on delivery" /></div>
          <Field id="ob-upi" label="Your UPI ID" optional error={e('upi')} hint="Buyers can pay you directly. You confirm each payment yourself."><input id="ob-upi" className={`input ${e('upi') ? 'bad' : ''}`} value={pay.upi} onChange={(x) => setPay({ ...pay, upi: x.target.value })} placeholder="yourname@okhdfc" autoCapitalize="none" /></Field>
        </>}
        {step === 3 && <>
          <div><h1 className="h1">How you take orders</h1><p className="t-body">Decide when buyers can order and how they can reach you.</p></div>
          <div className="toggle-row"><span className="grow"><span className="t-ink" style={{ fontWeight: 500, display: 'block' }}>Shop is open for orders</span><span className="cap">Turn off any time to pause new orders.</span></span><Switch checked={orders.open} onChange={(v) => setOrders({ ...orders, open: v })} label="Shop is open" /></div>
          <Field id="ob-min" label="Smallest order" optional hint="Leave empty for no minimum."><div className="affix"><span aria-hidden="true">₹</span><input id="ob-min" inputMode="numeric" value={orders.minimum} onChange={(x) => setOrders({ ...orders, minimum: x.target.value })} /></div></Field>
          <div className="hr" style={{ margin: 0 }} /><h2 className="ct">WhatsApp number</h2><WhatsAppVerify />
        </>}
        {step === 4 && <>
          <div><h1 className="h1">Pick a look</h1><p className="t-body">Three simple styles. Premium templates are optional extras you can try later.</p></div>
          <div className="looks" role="radiogroup" aria-label="Look">{LOOKS.map(([n, bg, v]) => <button key={n} type="button" className="look" role="radio" aria-checked={look === v} aria-pressed={look === v} onClick={() => setLook(v)}><i style={{ background: bg }} />{n}</button>)}</div>
          <Card className="stack tight" style={{ background: 'var(--inner)' }}><b className="t-ink">Ready to publish</b><p className="cap">{shop.name || 'Your shop'} · stoora.in/{shop.handle || 'yourshop'} · {prod.name ? `1 product (${prod.name}, ${rs(toNum(prod.price))})` : 'no products yet'} · {pay.online ? 'online payments' : 'no online payments'}{pay.cod ? ', cash on delivery' : ''}</p></Card>
        </>}
        {pubError && <div className="banner bad" role="alert"><Icon name="error" /><span>{pubError}</span></div>}
        <div className="wiz-foot">
          {step > 0 ? <Button icon="arrow_back" onClick={() => { setTried(false); setStep(step - 1); }}>Back</Button> : <span />}
          {step < 4 ? <Button kind="primary" onClick={next}>Continue</Button> : mode === 'live' && auth.ready && !auth.user ? <Link className="btn primary" href="/login?next=/onboarding?step=5">Sign in to publish</Link> : <Button kind="primary" icon="rocket_launch" busy={busy} busyLabel="Publishing…" onClick={publish}>Publish my shop</Button>}
        </div>
      </Card>
    </div>
  );
}
export default function Onboarding() { return <main id="main" style={{ minHeight: '100dvh', background: 'var(--surface)' }}><div className="wrap"><Suspense fallback={null}><Wizard /></Suspense></div></main>; }
