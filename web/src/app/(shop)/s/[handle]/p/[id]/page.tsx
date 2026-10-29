'use client';
// Product details: pictures, price, size, delivery check, details, reviews and more from the shop.
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, EmptyState, Icon, Skeleton, useToast } from '@/components/ui';
import { Accordion, ProductArt, Stars, StateScreen } from '@/components/bits';
import { ProductCard, shopBase } from '@/components/shop/ShopChrome';
import { useStore } from '@/lib/store';
import { useBag } from '@/lib/bag';
import { metaOf, REVIEWS } from '@/lib/catalog';
import { rs } from '@/lib/format';

export default function ProductPage() {
  const { handle, id } = useParams<{ handle: string; id: string }>(); const router = useRouter(); const { db, ready } = useStore(); const bag = useBag(); const toast = useToast(); const base = shopBase(handle);
  const [size, setSize] = useState(''); const [err, setErr] = useState(false); const [qty, setQty] = useState(1); const [view, setView] = useState(0); const [pin, setPin] = useState(''); const [pinMsg, setPinMsg] = useState('');
  const p = db.products.find((x) => x.id === id && x.status === 'Active');
  if (!ready) return <div className="wrap" style={{ padding: 'var(--s4) 16px' }}><Skeleton rows={1} height={420} /></div>;
  if (!p) return <StateScreen kind="notfound" title="That product isn’t here" text="It may have been removed or sold out for good." actions={<Link className="btn primary" href={base}>Back to the shop</Link>} />;
  const m = metaOf(p); const out = p.stock <= 0; const wished = bag.wish.includes(p.id);
  const more = db.products.filter((x) => x.status === 'Active' && x.id !== p.id).slice(0, 4);
  const add = (go?: boolean) => {
    if (p.sizes.length && !size) { setErr(true); document.getElementById('size-h')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    bag.add(p.id, size || undefined, qty); toast(`${p.name} added to your bag.`, { icon: 'shopping_bag' }); if (go) router.push(`${base}/checkout`);
  };
  const check = () => { if (!/^\d{6}$/.test(pin)) { setPinMsg('bad'); return; } setPinMsg(pin.startsWith('3') ? 'Delivers in 2 to 3 days.' : 'Delivers in 4 to 6 days.'); };

  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb"><Link href={base}>Shop</Link><Icon name="chevron_right" size="xs" /><span>{p.category}</span><Icon name="chevron_right" size="xs" /><b className="t-ink" style={{ fontWeight: 500 }}>{p.name}</b></nav>
      <div className="pdp">
        <div className="gallery">
          <ProductArt product={p} big />
          <div className="thumbs">{[0, 1, 2, 3].map((i) => <button key={i} aria-pressed={view === i} aria-label={`Picture ${i + 1}`} onClick={() => setView(i)}><ProductArt product={p} /></button>)}</div>
        </div>
        <div className="pinfo">
          <div className="stack tight"><div className="row" style={{ flexWrap: 'wrap' }}>{m.badge && <Badge tone="offer" icon="star">{m.badge}</Badge>}{!out && p.stock <= 3 && <Badge tone="warn" icon="local_fire_department">Only {p.stock} left</Badge>}{out && <Badge tone="neutral" icon="inventory_2">Sold out</Badge>}</div>
            <h1 className="h1">{p.name}</h1><Stars value={m.rating} count={m.reviews} /></div>
          <div className="price">{rs(p.price)}{p.comparePrice && <s className="cap" style={{ marginLeft: 8, fontSize: 18, fontWeight: 400 }}>{rs(p.comparePrice)}</s>}<span className="cap" style={{ display: 'block', fontSize: 13, fontWeight: 400 }}>Inclusive of taxes. Delivery calculated at checkout.</span></div>
          <p className="t-body">{m.blurb}</p>
          {p.sizes.length > 0 && <div className="field" id="size-h"><span className="flabel">Size</span><div className="sizes" role="group" aria-label="Size">{p.sizes.map((s) => <button key={s} type="button" aria-pressed={size === s} onClick={() => { setSize(s); setErr(false); }}>{s}</button>)}</div>{err && <span className="err" role="alert"><Icon name="error" size="xs" />Choose a size to continue.</span>}</div>}
          <div className="row"><span className="flabel">Quantity</span><div className="step" role="group" aria-label="Quantity"><button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="One less"><Icon name="remove" size="sm" /></button><output aria-live="polite">{qty}</output><button type="button" onClick={() => setQty(Math.min(Math.min(10, p.stock || 1), qty + 1))} aria-label="One more"><Icon name="add" size="sm" /></button></div></div>
          <div className="pdp-bar">
            <Button kind="primary" icon="shopping_bag" disabled={out || !db.shop.open} onClick={() => add()}>{out ? 'Sold out' : !db.shop.open ? 'Not taking orders' : 'Add to bag'}</Button>
            <button className="ibtn" style={{ width: 52, height: 52 }} aria-pressed={wished} aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'} onClick={() => { bag.toggleWish(p.id); toast(wished ? 'Removed from wishlist.' : 'Saved to wishlist.', { icon: 'favorite' }); }}><Icon name={wished ? 'favorite' : 'favorite'} className={wished ? 't-neg' : ''} /></button>
          </div>
          {!out && db.shop.open && <Button full onClick={() => add(true)}>Buy now</Button>}
          <div className="card stack tight"><b className="t-ink">Check delivery</b><div className="pincode"><div className={`affix ${pinMsg === 'bad' ? 'bad' : ''}`}><input inputMode="numeric" maxLength={6} placeholder="6-digit pincode" aria-label="Pincode" value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setPinMsg(''); }} style={{ paddingLeft: 0 }} /></div><Button onClick={check}>Check</Button></div>
            {pinMsg === 'bad' ? <span className="err" role="alert" style={{ color: 'var(--negative-deep)', fontSize: 14 }}>Enter a 6-digit pincode.</span> : pinMsg && <span className="verified"><Icon name="local_shipping" size="sm" />{pinMsg}</span>}</div>
          <div>
            <Accordion title="Details" open><ul style={{ margin: 0, paddingLeft: 18 }}>{(m.details.length ? m.details : [p.description || 'Made by hand.']).map((d) => <li key={d}>{d}</li>)}</ul></Accordion>
            <Accordion title="Delivery and returns"><p>Ships from {db.shop.city} within 2 days. Free delivery over ₹1,500. Returns accepted within 7 days if unused and in original packaging.</p></Accordion>
          </div>
        </div>
      </div>
      <section style={{ paddingBottom: 'var(--s5)' }}><h2 className="h2" style={{ marginBottom: 'var(--s3)' }}>What buyers say</h2>
        <div className="grid2">{REVIEWS.map((r) => <div className="review" key={r.who}><Stars value={r.stars} /><p className="t-soft">{r.text}</p><span className="cap">{r.who} · {r.city} · {r.when}</span></div>)}</div></section>
      {more.length > 0 && <section style={{ paddingBottom: 'var(--s6)' }}><h2 className="h2" style={{ marginBottom: 'var(--s3)' }}>More from {db.shop.name}</h2><div className="pgrid2">{more.map((x) => <ProductCard key={x.id} p={x} base={base} />)}</div></section>}
    </div>
  );
}
