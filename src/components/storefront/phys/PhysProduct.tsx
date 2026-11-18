'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type CSSProperties } from 'react';
import { PI } from './PI';
import { physVars, useDev } from './theme';
import { useToast } from '../../ui';
import { useBag } from '@/lib/bag';
import { metaOf } from '@/lib/catalog';
import { deliveryLine } from '@/lib/delivery';
import { PAUSED_LINE } from '@/lib/shopstate';
import { useStore } from '@/lib/store';
import { publishedConfig } from '@/lib/storefront/map';
import type { Product } from '@/lib/types';
import '../../../styles/phys-store.css';

const rupees = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const isDark = (hex: string) => { const n = parseInt(hex.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 140; };

/** A product's own picture, or (until the seller adds one) its colour and first letter. */
function Pic({ p, src }: { p: Product; src?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
  }
  const hex = metaOf(p).hex;
  return <span role="img" aria-label={`${p.name} (picture)`} style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: hex, color: isDark(hex) ? '#fff' : '#1E1B1D', fontFamily: 'var(--hf)', fontWeight: 700, fontSize: 72 }}>{p.name[0]?.toUpperCase()}</span>;
}

function Stars({ v, size = 14 }: { v: number; size?: number }) {
  return <span style={{ display: 'inline-flex', gap: 1, color: '#E0A526' }}>{[1, 2, 3, 4, 5].map((i) => <PI key={i} n="star" s={size} w={1.3} fill={v >= i - 0.25 ? 'currentColor' : 'none'} />)}</span>;
}

const Qty = ({ v, set, max }: { v: number; set: (n: number) => void; max: number }) => (
  <div role="group" aria-label="Quantity" style={{ display: 'inline-flex', alignItems: 'center', border: '1.5px solid color-mix(in srgb,var(--tx) 18%,transparent)', borderRadius: 'var(--rd)', overflow: 'hidden' }}>
    <button type="button" aria-label="One less" onClick={() => set(Math.max(1, v - 1))} style={{ width: 38, height: 42, border: 0, background: 'transparent' }}><PI n="minus" s={15} /></button>
    <span aria-live="polite" style={{ width: 32, textAlign: 'center', fontWeight: 700 }}>{v}</span>
    <button type="button" aria-label="One more" onClick={() => set(Math.min(max, v + 1))} style={{ width: 38, height: 42, border: 0, background: 'transparent' }}><PI n="plus" s={15} /></button>
  </div>
);

/** The product page of a shop that sells physical products: gallery, options, delivery check, details, specifications and more from the shop. */
export function PhysProduct({ product: p, base }: { product: Product; base: string }) {
  const router = useRouter();
  const { db } = useStore();
  const bag = useBag();
  const toast = useToast();
  const { mob } = useDev();
  const config = publishedConfig(db);
  const m = metaOf(p);
  const [size, setSize] = useState('');
  const [err, setErr] = useState(false);
  const [qty, setQty] = useState(1);
  const [view, setView] = useState(0);
  const [tab, setTab] = useState<'desc' | 'specs'>('desc');
  const [pin, setPin] = useState('');
  const [eta, setEta] = useState('');
  const out = p.stock <= 0;
  const orderable = db.shop.open;
  const wished = bag.wish.includes(p.id);
  const pictures = p.photos && p.photos.length ? p.photos : [''];
  const soldSize = (z: string) => p.optionStock?.[z] !== undefined && p.optionStock[z] <= 0;
  const left = size && p.optionStock?.[size] !== undefined ? p.optionStock[size] : p.stock;
  const off = p.comparePrice && p.comparePrice > p.price ? Math.round((1 - p.price / p.comparePrice) * 100) : 0;
  const same = db.products.filter((x) => x.status === 'Active' && x.id !== p.id);
  const related = [...same.filter((x) => x.category === p.category), ...same.filter((x) => x.category !== p.category)].slice(0, 4);
  const details = m.details.length ? m.details : p.material ? [`Made of ${p.material.toLowerCase()}`] : [];
  const px = mob ? 18 : 40;
  const label = out ? 'Sold out' : p.stock <= 3 ? `Only ${p.stock} left` : m.badge || '';

  const add = (go?: boolean) => {
    if (p.sizes.length && !size) { setErr(true); document.getElementById('pf-size')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    bag.add(p.id, size || undefined, qty);
    toast(`${p.name} added to your bag.`, { icon: 'shopping_bag' });
    if (go) router.push(`${base}/checkout`);
  };
  const check = () => {
    if (!/^\d{6}$/.test(pin)) { setEta('bad'); return; }
    setEta(pin.startsWith('3') ? 'Delivers in 2 to 3 days.' : 'Delivers in 4 to 6 days.');
  };
  const rowDir = mob;
  const thumbs = pictures.length > 1 ? (
    <div style={{ display: 'flex', flexDirection: rowDir ? 'row' : 'column', gap: 10 }}>
      {pictures.map((src, i) => (
        <button type="button" key={i} aria-label={`View photo ${i + 1}`} aria-current={view === i} onClick={() => setView(i)} style={{ width: rowDir ? 'calc(25% - 8px)' : 72, aspectRatio: '4/5', borderRadius: 10, overflow: 'hidden', padding: 0, border: `2px solid ${view === i ? 'var(--pr)' : 'transparent'}`, position: 'relative', background: 'var(--sf)' }}><Pic p={p} src={src} /></button>
      ))}
    </div>
  ) : null;
  const main = (
    <div style={{ position: 'relative', aspectRatio: '4/5', borderRadius: 'calc(var(--rd) + 4px)', overflow: 'hidden', background: 'var(--sf)', flex: 1 }}>
      <Pic p={p} src={pictures[Math.min(view, pictures.length - 1)]} />
      {label ? <span className={`pf-badge${out ? ' dark' : off ? '' : ' alt'}`}>{label}</span> : null}
    </div>
  );
  const sticky: CSSProperties = mob ? {} : { position: 'sticky', top: 96 };
  const tabs: ['desc' | 'specs', string][] = [['desc', 'Description'], ['specs', 'Specifications']];
  const specs: [string, string][] = ([['Category', p.category === 'Other' ? '' : p.category], ['Material', p.material || ''], ['Colour', p.color || ''], ['Available sizes', p.sizes.join(', ')]] as [string, string][]).filter(([, v]) => v);
  const dl = deliveryLine(bag.rule);
  return (
    <div className="pf" data-dev={mob ? 'mobile' : 'desktop'} style={physVars(config)}>
      <div className="pf-in" style={{ maxWidth: 1240, padding: `28px ${px}px ${mob ? 110 : 72}px` }}>
        <nav aria-label="Breadcrumb" className="muted" style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <Link href={base}>{db.shop.name}</Link><PI n="right" s={12} />
          {p.category && p.category !== 'Other' ? <><Link href={`${base}#sx-cat-${encodeURIComponent(p.category)}`}>{p.category}</Link><PI n="right" s={12} /></> : null}
          <span aria-current="page" style={{ color: 'var(--tx)', fontWeight: 600 }}>{p.name}</span>
        </nav>
        <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1.05fr 1fr', gap: mob ? 24 : 56, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: rowDir ? 'column-reverse' : 'row', gap: 14, ...sticky }}>{thumbs}{main}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
            {p.category && p.category !== 'Other' ? <div className="muted" style={{ fontSize: 13, letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600 }}>{p.category}</div> : null}
            <h1 style={{ fontSize: mob ? 32 : 44, overflowWrap: 'anywhere' }}>{p.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, flexWrap: 'wrap' }}>
              {m.reviews > 0 ? <><Stars v={m.rating} size={17} /><b>{m.rating.toFixed(1)}</b><span className="muted">{m.reviews} reviews</span></> : null}
              <span style={{ color: out ? '#C0392B' : '#2E7D4F', fontWeight: 600 }}>{out ? 'Out of stock' : 'In stock'}</span>
            </div>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <b style={{ fontSize: 30, fontWeight: 700 }}>{rupees(p.price)}</b>
                {off ? <><s className="muted" style={{ fontSize: 27 * 0.6 }}>{rupees(p.comparePrice!)}</s><span style={{ color: '#2E7D4F', fontWeight: 700, fontSize: 16 }}>{off}% off</span></> : null}
              </div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>Inclusive of taxes. Delivery is worked out at checkout.</div>
            </div>
            {m.blurb || p.description ? <p className="muted" style={{ fontSize: 15.5, lineHeight: 1.7 }}>{m.blurb || p.description}</p> : null}

            {p.sizes.length > 0 ? (
              <div id="pf-size">
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Size{size ? <>: <span style={{ fontWeight: 500 }}>{size}</span></> : null}</div>
                <div role="group" aria-label="Size" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {p.sizes.map((z) => (
                    <button type="button" key={z} disabled={soldSize(z)} aria-pressed={size === z} title={soldSize(z) ? 'Sold out' : undefined} onClick={() => { setSize(z); setQty(1); setErr(false); }}
                      style={{ minWidth: 50, padding: '10px 14px', borderRadius: 'var(--rd)', border: `1.5px solid ${size === z ? 'var(--pr)' : 'color-mix(in srgb,var(--tx) 20%,transparent)'}`, background: size === z ? 'var(--pr)' : 'transparent', color: size === z ? '#fff' : 'inherit', fontWeight: 600, opacity: soldSize(z) ? 0.45 : 1, textDecoration: soldSize(z) ? 'line-through' : 'none' }}>{z}</button>
                  ))}
                </div>
                {err ? <span role="alert" style={{ color: '#C0392B', fontSize: 13.5, display: 'block', marginTop: 8 }}>Choose a size to continue.</span> : null}
              </div>
            ) : null}

            {orderable ? (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <Qty v={qty} set={setQty} max={Math.min(10, Math.max(1, left || 1))} />
                {/* on mobile the sticky bar at the bottom carries Add to cart and Buy now, so this row stays to Qty and wishlist only */}
                {!mob ? <button type="button" className="pf-btn" disabled={out} style={{ flex: 1, minWidth: 150, padding: '13px 22px', height: 46 }} onClick={() => add()}><PI n="bag" s={18} />{out ? 'Sold out' : 'Add to cart'}</button> : null}
                {!mob ? <button type="button" className="pf-btn out" disabled={out} style={{ flex: 1, minWidth: 130, padding: '13px 22px', height: 46 }} onClick={() => add(true)}>Buy now</button> : null}
                <button type="button" aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'} aria-pressed={wished} onClick={() => { bag.toggleWish(p.id); toast(wished ? 'Removed from wishlist.' : 'Saved to wishlist.', { icon: 'favorite' }); }} style={{ width: 46, height: 46, borderRadius: 'var(--rd)', border: '1.5px solid color-mix(in srgb,var(--tx) 20%,transparent)', background: 'transparent', display: 'grid', placeItems: 'center', color: wished ? '#D6336C' : 'inherit' }}><PI n="heart" s={19} fill={wished ? 'currentColor' : 'none'} /></button>
              </div>
            ) : <p className="muted" role="status">{PAUSED_LINE}</p>}

            <div style={{ display: 'flex', gap: 8 }}>
              <input className="pf-input" inputMode="numeric" maxLength={6} placeholder="Check delivery: 6-digit pincode" value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setEta(''); }} aria-label="Pincode" aria-invalid={eta === 'bad' || undefined} style={{ flex: 1 }} />
              <button type="button" className="pf-btn out" style={{ padding: '0 20px' }} onClick={check}>Check</button>
            </div>
            {eta ? <div role="status" style={{ color: eta === 'bad' ? '#C0392B' : '#2E7D4F', fontWeight: 600, fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>{eta === 'bad' ? 'Enter a 6 digit pincode.' : <><PI n="truck" s={17} />{eta}</>}</div> : null}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 4 }}>
              {([['truck', bag.rule.fee === 0 ? 'Free shipping' : bag.rule.freeOver > 0 ? `Free over ${rupees(bag.rule.freeOver)}` : `Delivery ${rupees(bag.rule.fee)}`, dl], ['rotate', db.shop.cod ? 'Cash on delivery' : 'Easy to reach', db.shop.cod ? 'Pay when it arrives' : 'Ask the seller'], ['shield', 'Secure checkout', db.shop.online !== false ? 'UPI and cards' : 'Pay by UPI']] as const).map(([ic, t, d]) => (
                <div key={t} style={{ background: 'var(--sf)', borderRadius: 'var(--rd)', padding: '12px 10px', textAlign: 'center', fontSize: 12.5 }}><PI n={ic} s={20} style={{ margin: '0 auto 6px', color: 'var(--pr)' }} /><b style={{ display: 'block' }}>{t}</b><span className="muted">{d}</span></div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 64 }}>
          <div role="tablist" aria-label="Product information" style={{ borderBottom: '1px solid color-mix(in srgb,var(--tx) 12%,transparent)', marginBottom: 26, display: 'flex', overflowX: 'auto' }}>
            {tabs.map(([k, l]) => <button type="button" role="tab" aria-selected={tab === k} key={k} className={`pf-tab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
          </div>
          {tab === 'desc' ? (
            <div style={{ maxWidth: 760, lineHeight: 1.8, fontSize: 16 }}>
              {m.blurb || p.description ? <p>{m.blurb || p.description}</p> : <p className="muted">The seller has not added a description yet.</p>}
              {details.length ? <ul style={{ marginTop: 14, paddingLeft: 20, listStyle: 'disc', display: 'grid', gap: 6 }}>{details.map((d) => <li key={d}>{d}</li>)}</ul> : null}
            </div>
          ) : (
            <table className="pf-table" style={{ width: '100%', maxWidth: 640, borderCollapse: 'collapse' }}><tbody>{specs.map(([a, b]) => <tr key={a}><td style={{ width: 180, fontWeight: 600 }}>{a}</td><td>{b}</td></tr>)}{!specs.length ? <tr><td className="muted">No specifications added yet.</td></tr> : null}</tbody></table>
          )}
        </div>

        {related.length ? (
          <div style={{ marginTop: 72 }}>
            <h2 className="pf-h2" style={{ marginBottom: 28 }}>You may also like</h2>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${mob ? 2 : 4},minmax(0,1fr))`, gap: 22 }}>
              {related.map((r) => (
                <div key={r.id} className="pf-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="im" style={{ aspectRatio: '4/5' }}><Link href={`${base}/p/${r.id}`} aria-label={r.name} style={{ position: 'absolute', inset: 0, zIndex: 1 }} /><div className="fill"><Pic p={r} src={r.photos?.[0]} /></div></div>
                  <div style={{ padding: '14px 2px 0', display: 'grid', gap: 6 }}>
                    <Link href={`${base}/p/${r.id}`} style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.35 }}>{r.name}</Link>
                    <b>{rupees(r.price)}</b>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {orderable && !out && mob ? (
        <div className="pf-bar">
          <b style={{ fontSize: 20, whiteSpace: 'nowrap' }}>{rupees(p.price)}</b>
          <button type="button" className="pf-btn out" style={{ flex: 1, padding: '12px 10px' }} onClick={() => add()}>Add to cart</button>
          <button type="button" className="pf-btn" style={{ flex: 1, padding: '12px 10px' }} onClick={() => add(true)}>Buy now</button>
        </div>
      ) : null}
    </div>
  );
}
