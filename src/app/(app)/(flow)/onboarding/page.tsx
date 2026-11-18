'use client';
// Store setup: five short steps, then publish. Nothing here is saved on a server in demo mode.
// API_TODO: POST /api/shop (step 1), POST /api/products (step 2), PATCH /api/shop/payments (step 3), PATCH /api/shop/order-taking (step 4).
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';
import { Button, ButtonLink, Card, Field, Icon, useToast } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { Logo, Stepper } from '@/components/bits';
import { useStore } from '@/lib/store';
import { cleanHandle, rs, toNum } from '@/lib/format';
import { useHandleCheck } from '@/lib/handle';
import { PHYSICAL } from '@/lib/shopstate';

const STEPS = ['Your shop', 'What you sell'];
const SELLS: [string, string, string, string][] = [
  [PHYSICAL, 'inventory_2', 'Physical products', 'Things you ship: clothes, food, jewellery, home goods. Your dashboard shows products, stock, orders, delivery and payments.'],
];
/** The steps shown while the shop is made, so nobody stares at a blank screen. */
const SETUP_LINES = ['Making your shop', 'Choosing how buyers pay and order', 'Getting your dashboard ready'];
// Payment, order-taking and look are no longer asked during onboarding; sellers set these up in Settings after publishing.
const DEFAULT_PAY = { upi: '', cod: true, online: true };
const DEFAULT_LOOK: 'Warm' | 'Indigo' | 'Plain' = 'Warm';
const DEFAULT_MINIMUM = '';

function Wizard() {
  const router = useRouter(); const toast = useToast(); const { createShop, mode, ready, needsShop, db } = useStore(); const auth = useAuth(); const [pubError, setPubError] = useState('');
  const params = useSearchParams();
  const start = Math.min(Math.max(Number(params.get('step') || 1) - 1, 0), 1);
  const [step, setStep] = useState(start); const [tried, setTried] = useState(false);
  const [shop, setS] = useState({ name: start > 0 ? 'Meera Studio' : params.get('name') ?? '', handle: start > 0 ? 'meera' : params.get('handle') ?? '', cat: PHYSICAL });
  const [owner, setOwner] = useState(() => {
    const name = (auth.user?.name ?? '').trim().split(/\s+/).filter(Boolean);
    return { username: start > 0 ? 'Meera' : name[0] ?? '', surname: start > 0 ? 'Iyer' : name.slice(1).join(' '), email: start > 0 ? 'meera.studio@example.in' : auth.user?.email ?? '', phone: start > 0 ? '9876543210' : (auth.user?.phone ?? '').replace(/\D/g, '').slice(-10) };
  });
  const [busy, setBusy] = useState(false);
  const [setupAt, setSetupAt] = useState(0);
  useEffect(() => { if (!busy) return; const t = setInterval(() => setSetupAt((n) => Math.min(n + 1, SETUP_LINES.length - 1)), 500); return () => clearInterval(t); }, [busy]);
  const handleState = useHandleCheck(shop.handle, shop.name);

  const ownerName = `${owner.username.trim()} ${owner.surname.trim()}`.trim();
  const phoneDigits = owner.phone.replace(/\D/g, '').slice(-10);
  const errs: Record<number, Record<string, string>> = {
    0: {
      ...(shop.name.trim() ? {} : { name: 'Add your shop’s name.' }),
      ...(shop.handle.length < 3 ? { handle: 'Use at least 3 letters or numbers.' } : handleState.status === 'taken' ? { handle: 'That link is taken. Pick another.' } : {}),
      ...(owner.username.trim() ? {} : { username: 'Enter your username.' }),
      ...(owner.surname.trim() ? {} : { surname: 'Enter your surname.' }),
      ...(owner.email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.email.trim()) ? {} : { email: 'Enter a valid email address.' }),
      ...(phoneDigits.length === 10 ? {} : { phone: 'Enter your 10-digit phone number.' }),
    },
    1: {},
  };
  const e = (k: string) => (tried ? errs[step]?.[k] : undefined);
  const next = () => { setTried(true); if (Object.keys(errs[step] ?? {}).length) return; setTried(false); setStep(step + 1); };
  const publish = async () => {
    setBusy(true); setPubError(''); setSetupAt(0);
    const shown = Date.now();
    const err = await createShop({ name: shop.name.trim(), handle: shop.handle, city: '', owner: ownerName, email: owner.email.trim(), phone: phoneDigits, category: shop.cat, cod: DEFAULT_PAY.cod, online: DEFAULT_PAY.online, open: true, look: DEFAULT_LOOK, upi: DEFAULT_PAY.upi, minimum: DEFAULT_MINIMUM });
    // let each line of the setting-up screen show for a moment, so it reads as steps and not a blank wait
    const wait = 1500 - (Date.now() - shown); if (!err && wait > 0) await new Promise((r) => setTimeout(r, wait));
    setBusy(false);
    if (err) { setPubError(err); return; } // every answer is still here, so Try again loses nothing
    setStep(5); toast('Your shop is live.', { icon: 'celebration' });
  };

  // S1: already signed in to a shop and arriving with a new shop name: ask, never drop the name silently
  const existing = mode === 'live' && ready && !needsShop && !!db.shop.id;
  if (existing && params.get('name') && !params.get('new') && step === 0) return (
    <div className="wizard"><div className="wiz-top"><Logo /></div>
      <Card className="wiz-card stack" aria-live="polite">
        <div><h1 className="h1">You already have {db.shop.name}</h1><p className="t-body">Open it, or make a new shop? Each Stoora login has one shop, so a new shop needs its own login.</p></div>
        <div className="btns"><ButtonLink href="/dashboard" kind="primary">Open {db.shop.name}</ButtonLink><Button onClick={async () => { await auth.signOut(); router.push(`/shop/start?shop=${encodeURIComponent(params.get('name') ?? '')}`); }}>Sign out and make “{params.get('name')}”</Button></div>
      </Card>
    </div>
  );

  // making the shop: show what is happening, step by step
  if (busy) return (
    <div className="wizard"><div className="payres" role="status" aria-live="polite">
      <span className="big-ok"><Icon name="storefront" size="lg" /></span><h1 className="h1">Setting up {shop.name || 'your shop'}</h1><p className="t-body">This takes a few seconds.</p>
      <Card className="stack tight">{SETUP_LINES.map((l, i) => <div key={l} className="row"><Icon name={i < setupAt ? 'check_circle' : i === setupAt ? 'pending' : 'radio_button_unchecked'} /><span className={i <= setupAt ? 't-ink' : 'cap'}>{l}</span></div>)}</Card>
    </div></div>
  );

  if (step === 5) return (
    <div className="wizard"><div className="payres"><span className="big-ok"><Icon name="celebration" size="lg" /></span><h1 className="h1">{shop.name || 'Your shop'} is live</h1><p className="t-body">Share this link anywhere buyers are. Until you add your first product, buyers see “Coming soon”. You can change anything later in Settings.</p>
      <Card className="stack"><div className="row"><span className="grow t-ink" style={{ fontWeight: 500, overflowWrap: 'anywhere' }}>stoora.in/{shop.handle || 'yourshop'}</span><Button small icon="content_copy" onClick={() => navigator.clipboard?.writeText(`https://stoora.in/${shop.handle}`).then(() => toast('Link copied.', { icon: 'content_copy' })).catch(() => toast(`Your link is stoora.in/${shop.handle}`, { icon: 'info' }))}>Copy</Button></div></Card>
      <div className="btns" style={{ justifyContent: 'center' }}><ButtonLink href={`/s/${shop.handle}`} icon="open_in_new">See my shop</ButtonLink><ButtonLink href="/products/new" kind="primary">Add my first product</ButtonLink><ButtonLink href="/dashboard" kind="quiet">Go to my dashboard</ButtonLink></div></div></div>
  );

  return (
    <div className="wizard">
      <div className="wiz-top"><Logo /><Link className="link" href="/dashboard">Skip for now</Link></div>
      <Stepper steps={STEPS} current={step} />
      <Card className="wiz-card" aria-live="polite">
        {step === 0 && <>
          <div><h1 className="h1">What’s your store name?</h1><p className="t-body">This is what buyers see at the top of your page.</p></div>
          <Field id="ob-name" label="Shop name" required error={e('name')}><input id="ob-name" className={`input ${e('name') ? 'bad' : ''}`} value={shop.name} onChange={(x) => setS({ ...shop, name: x.target.value, handle: shop.handle && shop.handle !== cleanHandle(shop.name) ? shop.handle : cleanHandle(x.target.value) })} placeholder="e.g. Meera Studio" autoFocus /></Field>
          <div className="grid2">
            <Field id="ob-username" label="Username" required error={e('username')}><input id="ob-username" className={`input ${e('username') ? 'bad' : ''}`} autoComplete="username" value={owner.username} onChange={(x) => setOwner({ ...owner, username: x.target.value })} /></Field>
            <Field id="ob-surname" label="Surname" required error={e('surname')}><input id="ob-surname" className={`input ${e('surname') ? 'bad' : ''}`} autoComplete="family-name" value={owner.surname} onChange={(x) => setOwner({ ...owner, surname: x.target.value })} /></Field>
          </div>
          <Field id="ob-handle" label="Link" required error={e('handle')} hint="Your public shop link."><div className={`affix ${e('handle') ? 'bad' : ''}`}><span aria-hidden="true">stoora.in/</span><input id="ob-handle" value={shop.handle} onChange={(x) => setS({ ...shop, handle: cleanHandle(x.target.value) })} aria-invalid={e('handle') ? true : undefined} /></div></Field>
          {!e('handle') && handleState.status === 'free' ? <p className="cap" role="status" style={{ margin: '-8px 0 0', color: 'var(--positive-deep, var(--positive))' }}><Icon name="check_circle" size="xs" /> stoora.in/{shop.handle} is free</p> : null}
          {handleState.status === 'taken' ? <p className="cap" role="alert" style={{ margin: '-8px 0 0', color: 'var(--negative-deep)' }}><Icon name="error" size="xs" /> stoora.in/{shop.handle} is taken{handleState.suggestion ? <>, try <button type="button" className="link" onClick={() => setS({ ...shop, handle: handleState.suggestion! })}>{handleState.suggestion}</button></> : '. Try another.'}</p> : null}
          <Field id="ob-email" label="Email ID" required error={e('email')}><input id="ob-email" type="email" className={`input ${e('email') ? 'bad' : ''}`} autoComplete="email" inputMode="email" autoCapitalize="none" value={owner.email} onChange={(x) => setOwner({ ...owner, email: x.target.value })} placeholder="you@example.com" /></Field>
          <Field id="ob-phone" label="Phone number" required error={e('phone')} hint="We may use this to reach you about your shop."><div className={`affix ${e('phone') ? 'bad' : ''}`}><span aria-hidden="true">+91</span><input id="ob-phone" type="tel" inputMode="numeric" autoComplete="tel-national" value={owner.phone} onChange={(x) => setOwner({ ...owner, phone: x.target.value.replace(/[^\d ]/g, '').slice(0, 11) })} placeholder="98765 43210" /></div></Field>
        </>}
        {step === 1 && <>
          <div><h1 className="h1">What do you sell?</h1><p className="t-body">Stoora is set up for physical products.</p></div>
          <div className="stack" role="radiogroup" aria-label="What you sell">{SELLS.map(([v, icon, name, text]) => (
            <button key={v} type="button" role="radio" aria-checked={shop.cat === v} className="cat" aria-pressed={shop.cat === v} style={{ textAlign: 'left', width: '100%', display: 'flex', gap: 12, alignItems: 'flex-start' }} onClick={() => setS({ ...shop, cat: v })}>
              <Icon name={icon} /><span><span className="t-ink" style={{ fontWeight: 600, display: 'block' }}>{name}</span><span className="cap">{text}</span></span>
            </button>))}</div>
        </>}
        {pubError && <div className="banner bad" role="alert"><Icon name="error" /><span>{pubError} Nothing you typed is lost.</span><Button small onClick={publish}>Try again</Button></div>}
        <div className="wiz-foot">
          {step > 0 ? <Button icon="arrow_back" onClick={() => { setTried(false); setStep(step - 1); }}>Back</Button> : <span />}
          {step < 1 ? <Button kind="primary" onClick={next}>Continue</Button> : mode === 'live' && auth.ready && !auth.user ? <Link className="btn primary" href="/login?next=%2Fonboarding%3Fstep%3D5">Sign in to publish</Link> : <Button kind="primary" icon="rocket_launch" busy={busy} busyLabel="Publishing…" onClick={publish}>Publish my shop</Button>}
        </div>
      </Card>
    </div>
  );
}
export default function Onboarding() { return <main id="main" style={{ minHeight: '100dvh', background: 'var(--surface)' }}><div className="wrap"><Suspense fallback={null}><Wizard /></Suspense></div></main>; }
