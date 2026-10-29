'use client';
// Buyer storefront pieces: header with bag and wishlist, mobile menu, bag drawer, product card and quick view.
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Badge, Button, ButtonLink, Dialog, EmptyState, Icon, useToast } from '../ui';
import { Logo, ProductArt, Stars } from '../bits';
import { useStore } from '@/lib/store';
import { FREE_DELIVERY_OVER, useBag } from '@/lib/bag';
import { metaOf, SHOP_TAGLINE } from '@/lib/catalog';
import { rs } from '@/lib/format';
import type { Product } from '@/lib/types';

export const shopBase = (handle: string) => `/s/${handle}`;

export function ShopFrame({ handle, children }: { handle: string; children: React.ReactNode }) {
  const { db } = useStore(); const bag = useBag(); const path = usePathname() || ''; const router = useRouter(); const sp = useSearchParams();
  const base = shopBase(handle);
  const [menu, setMenu] = useState(sp.get('menu') === '1'); const [bagOpen, setBagOpen] = useState(sp.get('bag') === '1'); const [q, setQ] = useState('');
  useEffect(() => { setMenu(false); setBagOpen(false); }, [path]);
  useEffect(() => { if (!menu) return; document.body.style.overflow = 'hidden'; const k = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false); document.addEventListener('keydown', k); return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', k); }; }, [menu]);
  const links: [string, string, string][] = [['Shop', base, 'storefront'], ['Wishlist', `${base}/wishlist`, 'favorite'], ['My orders', '/buyer/orders', 'receipt_long']];
  const search = (e: React.FormEvent) => { e.preventDefault(); router.push(`${base}${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`); };

  return (
    <div className="shopwrap">
      {!db.shop.open ? <div className="announce" role="status">{db.shop.name} is not taking orders right now. You can still look around.</div> : <div className="announce">Free delivery on orders over {rs(FREE_DELIVERY_OVER)} · Ships from {db.shop.city}</div>}
      <header className="shopbar">
        <div className="wrap">
          <button className="ibtn burger flat" onClick={() => setMenu(true)} aria-label="Open menu" aria-expanded={menu}><Icon name="menu" /></button>
          <Link className="shopname" href={base}><span className="shop-av" aria-hidden="true">{db.shop.name[0]}</span><b>{db.shop.name}</b></Link>
          <nav className="links" aria-label="Shop">{links.map(([l, h]) => <Link key={l} href={h} className={path === h ? 'on' : ''}>{l}</Link>)}</nav>
          <div className="right">
            <form className="search" onSubmit={search} role="search"><Icon name="search" size="sm" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the shop" aria-label="Search the shop" /></form>
            <Link className="ibtn flat hide-narrow" href={`${base}/wishlist`} aria-label={`Wishlist, ${bag.wish.length} saved`} style={{ position: 'relative' }}><Icon name="favorite" size="sm" />{bag.wish.length > 0 && <span className="cartcount">{bag.wish.length}</span>}</Link>
            <button className="ibtn" onClick={() => setBagOpen(true)} aria-label={`Open bag, ${bag.count} items`}><Icon name="shopping_bag" size="sm" />{bag.count > 0 && <span className="cartcount">{bag.count}</span>}</button>
          </div>
        </div>
      </header>
      {menu && (
        <div className="sitemenu" role="dialog" aria-modal="true" aria-label="Shop menu">
          <div className="sitemenu-h"><span className="shopname"><span className="shop-av" aria-hidden="true">{db.shop.name[0]}</span><b>{db.shop.name}</b></span><button className="ibtn" onClick={() => setMenu(false)} aria-label="Close menu"><Icon name="close" /></button></div>
          <form className="search" onSubmit={(e) => { search(e); setMenu(false); }} role="search" style={{ margin: 'var(--s3) max(16px,env(safe-area-inset-left,0px)) 0' }}><Icon name="search" size="sm" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the shop" aria-label="Search the shop" /></form>
          <nav aria-label="Shop menu">{links.map(([l, h, i]) => <Link key={l} href={h} onClick={() => setMenu(false)}><Icon name={i} />{l}</Link>)}<Link href="/buyer/account" onClick={() => setMenu(false)}><Icon name="person" />My account</Link></nav>
          <div className="btns"><Button kind="primary" icon="shopping_bag" onClick={() => { setMenu(false); setBagOpen(true); }}>View my bag ({bag.count})</Button></div>
        </div>
      )}
      <BagDrawer open={bagOpen} onClose={() => setBagOpen(false)} base={base} />
      <main id="main" className="grow-main">{children}</main>
      <footer className="shopfoot">
        <div className="wrap"><div className="cols">
          <div><b className="t-ink" style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{db.shop.name}</b><p className="cap" style={{ maxWidth: '36ch', marginTop: 4 }}>{SHOP_TAGLINE}</p></div>
          <div><b className="label">Shop</b><Link href={base}>All products</Link><Link href={`${base}/wishlist`}>Wishlist</Link><Link href="/buyer/orders">Track my order</Link></div>
          <div><b className="label">Help</b><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/data-requests">My data</Link></div>
        </div><div className="powered"><span className="smark xs" aria-hidden="true">S</span>Shop powered by <Logo label="Stoora" /></div></div>
      </footer>
    </div>
  );
}

export function BagDrawer({ open, onClose, base }: { open: boolean; onClose: () => void; base: string }) {
  const bag = useBag();
  return (
    <Dialog open={open} onClose={onClose} title={`Your bag${bag.count ? ` (${bag.count})` : ''}`}
      footer={bag.count ? <><ButtonLink href={`${base}/bag`} kind="line">View bag</ButtonLink><ButtonLink href={`${base}/checkout`} kind="primary">Checkout · {rs(bag.total)}</ButtonLink></> : <Button onClick={onClose}>Keep shopping</Button>}>
      {bag.detailed.length === 0 ? <EmptyState icon="shopping_bag" title="Your bag is empty" text="Add something you like and it will wait for you here." /> : (
        <div className="stack tight">{bag.detailed.map(({ line, product, index }) => (
          <div className="sumline" key={index}><ProductArt product={product} /><span><span className="t-ink" style={{ fontWeight: 500, display: 'block' }}>{product.name}</span><span className="cap">{line.size ? `Size ${line.size} · ` : ''}{line.qty} × {rs(product.price)}</span></span><span className="money">{rs(product.price * line.qty)}</span></div>))}
          <div className="kv" style={{ marginTop: 'var(--s2)' }}><div className="r"><span>Subtotal</span><span>{rs(bag.subtotal)}</span></div><div className="r"><span>Delivery</span><span>{bag.delivery ? rs(bag.delivery) : 'Free'}</span></div></div></div>
      )}
    </Dialog>
  );
}

export function ProductCard({ p, base, onQuick }: { p: Product; base: string; onQuick?: (p: Product) => void }) {
  const bag = useBag(); const toast = useToast(); const m = metaOf(p);
  const wished = bag.wish.includes(p.id); const out = p.stock <= 0;
  return (
    <article className="pcard">
      <div className="imgwrap">
        <Link href={`${base}/p/${p.id}`} aria-label={p.name} className="imgwrap"><ProductArt product={p} />{out && <span className="soldout"><Badge tone="neutral" icon="inventory_2">Sold out</Badge></span>}</Link>
        {!out && (m.badge || p.stock <= 3) && <span className="tag"><Badge tone={p.stock <= 3 ? 'warn' : 'offer'} icon={p.stock <= 3 ? 'local_fire_department' : 'star'}>{p.stock <= 3 ? `Only ${p.stock} left` : m.badge}</Badge></span>}
        <button className="heart" aria-pressed={wished} aria-label={wished ? `Remove ${p.name} from wishlist` : `Save ${p.name} to wishlist`} onClick={() => { bag.toggleWish(p.id); toast(wished ? 'Removed from wishlist.' : 'Saved to wishlist.', { icon: 'favorite' }); }}><Icon name="favorite" size="sm" /></button>
        {onQuick && !out && <Button small className="quick" onClick={() => onQuick(p)}>Quick view</Button>}
      </div>
      <Link className="nm" href={`${base}/p/${p.id}`}>{p.name}</Link>
      <div className="pr"><span className="money">{rs(p.price)}</span>{p.comparePrice && <s>{rs(p.comparePrice)}</s>}</div>
      {m.reviews > 0 && <Stars value={m.rating} count={m.reviews} />}
    </article>
  );
}

export function QuickView({ p, base, onClose }: { p: Product | null; base: string; onClose: () => void }) {
  const bag = useBag(); const toast = useToast(); const [size, setSize] = useState<string>(''); const [err, setErr] = useState(false);
  useEffect(() => { setSize(''); setErr(false); }, [p?.id]);
  if (!p) return null; const m = metaOf(p);
  const add = () => { if (p.sizes.length && !size) { setErr(true); return; } bag.add(p.id, size || undefined); toast(`${p.name} added to your bag.`, { icon: 'shopping_bag' }); onClose(); };
  return (
    <Dialog open onClose={onClose} title={p.name} footer={<><ButtonLink href={`${base}/p/${p.id}`} kind="line" small>Full details</ButtonLink><Button kind="primary" icon="shopping_bag" onClick={add}>Add to bag</Button></>}>
      <div className="stack"><ProductArt product={p} big /><div className="row"><span className="price money" style={{ fontSize: 24 }}>{rs(p.price)}</span><Stars value={m.rating} count={m.reviews} /></div><p className="t-body">{m.blurb}</p>
        {p.sizes.length > 0 && <div className="field"><span className="flabel">Size</span><div className="sizes" role="group" aria-label="Size">{p.sizes.map((s) => <button key={s} type="button" aria-pressed={size === s} onClick={() => { setSize(s); setErr(false); }}>{s}</button>)}</div>{err && <span className="err" role="alert"><Icon name="error" size="xs" />Choose a size first.</span>}</div>}</div>
    </Dialog>
  );
}
