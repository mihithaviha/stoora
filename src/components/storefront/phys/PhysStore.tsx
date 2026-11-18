'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { StoreCtx } from '../Templates';
import { Select } from '@/components/Select';
import { layoutOf, type StdSection, type StoreItem } from '@/lib/storefront/shared';
import { PI } from './PI';
import { physVars, useDev } from './theme';
import '../../../styles/phys-store.css';

/* ---------- small helpers ---------- */

const rupees = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const offPct = (price: number, was?: number) => (was && was > price ? Math.round((1 - price / was) * 100) : 0);
const initial = (name?: string) => (name || '?').trim()[0]?.toUpperCase() || '?';
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const isDark = (hex: string) => { const n = parseInt(hex.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 140; };
const soldOut = (item: StoreItem) => item.stock != null && item.stock <= 0;
const optionsOf = (item: StoreItem) => [...new Set(String(item.sizes || '').split(',').map((part) => part.trim()).filter(Boolean))];
const colsOf = (n: number, mob: boolean, tab: boolean, mobN = 2) => (mob ? Math.min(n, mobN) : tab ? Math.min(n, 3) : n);

export type Cat = { name: string; count: number; image: string; art?: StoreItem['art'] };
export const catsOf = (products: StoreItem[]): Cat[] => {
  const groups: Record<string, Cat> = {};
  for (const item of products) if (item.cat) { const g = (groups[item.cat] = groups[item.cat] || { name: item.cat, count: 0, image: '', art: item.art }); g.count += 1; if (!g.image && item.img) g.image = item.img; }
  return Object.values(groups);
};

/** A picture that fills its box, or (when there is none yet) the product's colour with its first letter. */
function Pic({ src, art, letter, alt = '', pos, eager = false }: { src?: string; art?: StoreItem['art']; letter?: string; alt?: string; pos?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...(eager ? { fetchPriority: 'high' as const } : { loading: 'lazy' as const })} decoding="async" style={pos ? { objectPosition: pos } : undefined} onError={() => setFailed(true)} />;
  }
  const bg = art?.hex || 'var(--sf)';
  return <span aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: bg, color: art?.hex ? (isDark(art.hex) ? '#fff' : '#1E1B1D') : 'var(--pr)', fontFamily: 'var(--hf)', fontWeight: 700, fontSize: 'clamp(34px, 22%, 84px)' }}>{letter || ''}</span>;
}
const Fill = ({ children }: { children: ReactNode }) => <div className="fill">{children}</div>;

function Stars({ v, size = 14 }: { v: number; size?: number }) {
  return <span style={{ display: 'inline-flex', gap: 1, color: '#E0A526' }}>{[1, 2, 3, 4, 5].map((i) => <PI key={i} n="star" s={size} w={1.3} fill={v >= i - 0.25 ? 'currentColor' : 'none'} />)}</span>;
}
function Price({ p, m, size = 17 }: { p: number; m?: number; size?: number }) {
  const o = offPct(p, m);
  return <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}><b style={{ fontSize: size, fontWeight: 700 }}>{rupees(p)}</b>{o > 0 && m ? <><s className="muted" style={{ fontSize: size - 3 }}>{rupees(m)}</s><span style={{ color: '#2E7D4F', fontWeight: 700, fontSize: size - 4 }}>{o}% off</span></> : null}</div>;
}

/** The place a section sits in: its colour, its up and down space, and a centred column 1240 wide. */
function Frame({ id, pt = 56, pb = 56, bg, color, maxW = 1240, children }: { id?: string; pt?: number; pb?: number; bg?: string; color?: string; maxW?: number | 'full'; children: ReactNode }) {
  const { mob, tab } = useDev();
  const k = mob ? 0.55 : tab ? 0.8 : 1;
  const px = mob ? 18 : tab ? 28 : 40;
  return (
    <section id={id} style={{ background: bg, color, paddingTop: Math.round(pt * k), paddingBottom: Math.round(pb * k), position: 'relative' }}>
      <div className="pf-in" style={{ maxWidth: maxW === 'full' ? 'none' : maxW, padding: maxW === 'full' ? 0 : `0 ${px}px`, position: 'relative' }}>{children}</div>
    </section>
  );
}

function SecHead({ kicker, title, sub, right, center }: { kicker?: string; title: string; sub?: string; right?: ReactNode; center?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: center ? 'center' : 'space-between', gap: 20, marginBottom: 32, flexWrap: 'wrap', textAlign: center ? 'center' : undefined }}>
      <div style={{ maxWidth: 680 }}>
        {kicker ? <div className="pf-kick" style={{ marginBottom: 10 }}>{kicker}</div> : null}
        <h2 className="pf-h2" style={{ display: 'block' }}>{title}</h2>
        {sub ? <p className="muted" style={{ marginTop: 12, fontSize: 16, display: 'block' }}>{sub}</p> : null}
      </div>
      {right}
    </div>
  );
}

/** Slides sideways with an arrow either side underneath. */
function Scroller({ children, gap = 18 }: { children: ReactNode; gap?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const f = () => setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
    f();
    el.addEventListener('scroll', f, { passive: true });
    window.addEventListener('resize', f);
    return () => { el.removeEventListener('scroll', f); window.removeEventListener('resize', f); };
  }, [children]);
  return (
    <div style={{ position: 'relative' }}>
      <div ref={ref} className="pf-scroll" style={{ gap }} tabIndex={0}>{children}</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
        <button type="button" className="pf-arrow" aria-label="Scroll left" disabled={edge.start} onClick={() => ref.current?.scrollBy({ left: -ref.current.clientWidth * 0.8, behavior: 'smooth' })}><PI n="left" s={18} /></button>
        <button type="button" className="pf-arrow" aria-label="Scroll right" disabled={edge.end} onClick={() => ref.current?.scrollBy({ left: ref.current.clientWidth * 0.8, behavior: 'smooth' })}><PI n="right" s={18} /></button>
      </div>
    </div>
  );
}

/** A product card: picture with a badge, heart and quick view; then name, rating, price and Add to cart. */
function ProductCard({ item, ctx, list = false, i = 0 }: { item: StoreItem; ctx: StoreCtx; list?: boolean; i?: number }) {
  const { actions, base, wish } = ctx;
  const [added, setAdded] = useState(false);
  const out = soldOut(item);
  const sized = optionsOf(item).length > 0;
  const off = offPct(item.price, item.was);
  const low = !out && item.stock != null && item.stock <= 3;
  const best = (ctx.data.bestsellerIds || []).includes(item.id);
  const rating = ctx.data.ratings?.[item.id];
  const wished = Boolean(wish?.includes(item.id));
  const href = base && !ctx.preview ? `${base}/p/${item.id}` : '';
  const label = out ? 'Sold out' : low ? `Only ${item.stock} left` : off > 0 ? `${off}% OFF` : best ? 'BESTSELLER' : '';
  const add = () => {
    if (sized) { actions?.view?.(item.id); return; }
    actions?.add?.(item.id, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };
  const img = (
    <div className="im" style={{ aspectRatio: '4/5', width: list ? 200 : undefined, flex: list ? 'none' : undefined }}>
      {href ? <Link href={href} aria-label={item.name} style={{ position: 'absolute', inset: 0, zIndex: 1 }} /> : null}
      <Fill><Pic src={item.img} art={item.art} letter={initial(item.name)} alt={item.name} pos={item.crop?.pos} /></Fill>
      {label ? <span className={`pf-badge${out ? ' dark' : off > 0 ? '' : ' alt'}`}>{label}</span> : null}
      {wish ? <button type="button" className={`pf-heart${wished ? ' on' : ''}`} aria-pressed={wished} aria-label={`${wished ? 'Remove' : 'Save'} ${item.name} ${wished ? 'from' : 'to'} your saved items`} style={{ zIndex: 2 }} onClick={() => actions?.wish?.(item.id)}><PI n="heart" s={17} fill={wished ? 'currentColor' : 'none'} /></button> : null}
      {!list && !out && actions?.view ? <div className="ov" style={{ zIndex: 2 }}><button type="button" className="pf-btn out" style={{ width: '100%', padding: 9, fontSize: 13, background: 'rgba(255,255,255,.96)' }} onClick={() => actions.view?.(item.id)}><PI n="eye" s={15} />Quick view</button></div> : null}
    </div>
  );
  const info = (
    <div style={{ padding: list ? '0' : '14px 2px 0', display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
      {item.cat ? <div className="muted" style={{ fontSize: 12, letterSpacing: '.04em' }}>{item.cat}</div> : null}
      <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' }}>{href ? <Link href={href}>{item.name}</Link> : item.name}</div>
      {rating ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}><Stars v={rating.average} size={13} /><span className="muted">{rating.average.toFixed(1)} ({rating.count})</span></div> : null}
      <Price p={item.price} m={item.was} />
      {list && item.desc ? <p className="muted" style={{ fontSize: 14, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.desc}</p> : null}
      {list && sized ? <p className="muted" style={{ fontSize: 14 }}>Available in {optionsOf(item).join(', ')}.</p> : null}
      {!out && !ctx.paused ? (
        <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', gap: 8 }}>
          <button type="button" className="pf-btn out" style={{ flex: list ? '0 0 auto' : 1, padding: '10px 14px', fontSize: 13.5 }} onClick={add}><PI n={added ? 'check' : 'bag'} s={15} />{added ? 'Added' : sized ? 'Choose size' : 'Add to cart'}</button>
          {list && actions?.view ? <button type="button" className="pf-btn out" style={{ padding: '10px 14px', fontSize: 13.5 }} onClick={() => actions.view?.(item.id)}><PI n="eye" s={15} />Quick view</button> : null}
        </div>
      ) : null}
    </div>
  );
  return <div className="pf-card pf-fade" style={{ ...(list ? { display: 'flex', gap: 20, alignItems: 'stretch' } : { display: 'flex', flexDirection: 'column', height: '100%' }), animationDelay: `${Math.min(i, 8) * 40}ms` }}>{img}{info}</div>;
}

/* ---------- announcement, header, footer ---------- */

function Announcement({ lines }: { lines: string[] }) {
  const { mob, tab } = useDev();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!mob || lines.length < 2) return;
    const t = window.setInterval(() => setI((x) => (x + 1) % lines.length), 3500);
    return () => window.clearInterval(t);
  }, [mob, lines.length]);
  if (!lines.length) return null;
  const show = mob ? [lines[i % lines.length]] : lines;
  return (
    <div role="status" style={{ background: 'var(--pr)', color: '#fff', padding: '9px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: tab ? 20 : 36, fontSize: 13, fontWeight: 500, padding: '0 16px', flexWrap: 'wrap', textAlign: 'center' }}>
        {show.map((m, j) => <Fragment key={m}>{j > 0 ? <span style={{ opacity: 0.4 }}>•</span> : null}<span>{m}</span></Fragment>)}
      </div>
    </div>
  );
}

/** The shop's header: search, account, saved items and bag; then All categories and the links. */
export function PhysHeader({ ctx, nav, home = '#sx-top' }: { ctx: StoreCtx; nav: [string, string][]; whatsapp?: string; home?: string }) {
  const { config, data, base, actions } = ctx;
  const { mob, tab } = useDev();
  const router = useRouter();
  const path = usePathname();
  const onHome = Boolean(ctx.preview || !base || path === base);
  const name = config.brand.name || data.shop.name;
  const [mega, setMega] = useState(false);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState('');
  const [sug, setSug] = useState(false);
  const [acct, setAcct] = useState(false);
  const cats = useMemo(() => catsOf(data.products), [data.products]);
  const px = mob ? 16 : tab ? 28 : 40;
  const term = q.trim().toLowerCase();
  const matches = term ? data.products.filter((p) => `${p.name} ${p.cat || ''} ${p.tags || ''}`.toLowerCase().includes(term)).slice(0, 5) : [];
  const count = ctx.cartCount ?? 0;
  const go = (e: React.MouseEvent) => { if (ctx.preview) e.preventDefault(); };
  useEffect(() => {
    if (!mega && !acct) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMega(false); setAcct(false); } };
    const away = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest?.('[data-pf-menu]')) { setMega(false); setAcct(false); } };
    document.addEventListener('keydown', key);
    document.addEventListener('mousedown', away);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('mousedown', away); };
  }, [mega, acct]);
  const search = (e: React.FormEvent) => {
    e.preventDefault();
    setSug(false);
    setMenu(false);
    if (onHome) { window.dispatchEvent(new CustomEvent('sx-search', { detail: q.trim() })); document.getElementById('sx-products')?.scrollIntoView({ behavior: 'smooth' }); }
    else if (base) router.push(`${base}?q=${encodeURIComponent(q.trim())}#sx-products`);
  };
  const openCat = (e: React.MouseEvent, catName: string) => {
    setMega(false);
    setMenu(false);
    if (onHome) { e.preventDefault(); pickCategory(catName); }
  };
  const catHref = (catName: string) => `${base || ''}#sx-cat-${encodeURIComponent(catName)}`;
  const Ico = ({ n, cnt, label, onClick, href }: { n: string; cnt?: number; label: string; onClick?: () => void; href?: string }) => {
    const inner = <><PI n={n} s={21} />{cnt ? <span style={{ position: 'absolute', top: 3, right: 2, minWidth: 17, height: 17, borderRadius: 9, background: 'var(--pr)', color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'grid', placeItems: 'center', padding: '0 4px' }}>{cnt}</span> : null}</>;
    return href ? <Link href={href} aria-label={label} className="pf-ico">{inner}</Link> : <button type="button" aria-label={label} onClick={onClick} className="pf-ico">{inner}</button>;
  };
  const searchBox = (
    <div style={{ position: 'relative', flex: 1, maxWidth: mob ? 'none' : 620 }} data-pf-menu>
      <form onSubmit={search} role="search" className="pf-search" style={{ display: 'flex', alignItems: 'center', borderRadius: 30, overflow: 'hidden', gap: 2 }}>
        <span className="pf-search-ico" aria-hidden="true" style={{ width: 30, height: 30, margin: '0 0 0 6px', borderRadius: '50%', display: 'grid', placeItems: 'center', flex: 'none' }}><PI n="search" s={16} w={2.2} /></span>
        <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setSug(true); }} onBlur={() => window.setTimeout(() => setSug(false), 160)} onFocus={() => setSug(true)} onKeyDown={(e) => e.key === 'Escape' && setSug(false)} placeholder="Search this shop" aria-label="Search this shop" autoComplete="off" style={{ flex: 1, border: 0, background: 'transparent', padding: '12px 8px', outline: 0, minWidth: 0, fontSize: 14.5 }} />
        <button type="submit" className="pf-btn" style={{ border: 0, borderRadius: 26, margin: 3, padding: '0 22px', alignSelf: 'stretch', fontSize: 14 }}>Search</button>
      </form>
      {sug && matches.length > 0 ? (
        <ul aria-label="Suggestions" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--bg)', border: '1px solid color-mix(in srgb,var(--tx) 12%,transparent)', borderRadius: 14, boxShadow: '0 18px 40px rgba(0,0,0,.16)', zIndex: 95, overflow: 'hidden' }}>
          {matches.map((m) => (
            <li key={m.id}>
              <Link className="pf-sug" href={base && !ctx.preview ? `${base}/p/${m.id}` : '#'} onClick={(e) => { if (ctx.preview) e.preventDefault(); setSug(false); }} style={{ padding: '11px 16px', fontSize: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
                <PI n="search" s={14} />{m.name}<span className="muted" style={{ marginLeft: 'auto', fontSize: 12.5 }}>{rupees(m.price)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
  const delivery = ctx.extras?.delivery;
  return (
    <>
      <Announcement lines={ctx.extras?.announce || []} />
      <header id="sx-top" data-pf-menu style={{ position: 'sticky', top: 0, zIndex: 60, background: 'var(--bg)', borderBottom: '1px solid color-mix(in srgb,var(--tx) 10%,transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: mob ? 8 : 28, padding: `${mob ? 12 : 16}px ${px}px`, maxWidth: 1400, margin: '0 auto' }}>
          {mob ? <button type="button" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu(!menu)} style={{ border: 0, background: 'transparent', padding: 6 }}><PI n={menu ? 'x' : 'menu'} s={22} /></button> : null}
          <a href={home} onClick={go} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {config.brand.logo
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={config.brand.logo} alt="" style={{ width: (mob ? 22 : 28) + 6, height: (mob ? 22 : 28) + 6, borderRadius: '50%', objectFit: 'contain', background: '#fff' }} />
              : <span aria-hidden="true" style={{ width: (mob ? 22 : 28) + 6, height: (mob ? 22 : 28) + 6, borderRadius: '50%', background: 'var(--pr)', color: '#fff', display: 'grid', placeItems: 'center', fontFamily: 'var(--hf)', fontSize: (mob ? 22 : 28) * 0.8, fontWeight: 700 }}>{initial(name)}</span>}
            <b style={{ fontFamily: 'var(--hf)', fontWeight: 700, fontSize: mob ? 22 : 28, letterSpacing: '-.01em', whiteSpace: 'nowrap' }}>{name}</b>
          </a>
          {!mob ? <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>{searchBox}</div> : null}
          <div style={{ display: 'flex', marginLeft: mob ? 'auto' : 0, gap: 2, position: 'relative' }}>
            <Ico n="user" label="Account" onClick={() => setAcct(!acct)} />
            {ctx.wish && base ? <Ico n="heart" label={`Saved items, ${ctx.wish.length}`} cnt={ctx.wish.length} href={`${base}/wishlist`} /> : null}
            <Ico n="bag" label={`Open your bag, ${count} ${count === 1 ? 'item' : 'items'}`} cnt={count} onClick={() => actions?.cart?.()} />
            {acct ? (
              <div role="menu" style={{ position: 'absolute', right: 0, top: '100%', marginTop: 6, background: 'var(--bg)', border: '1px solid color-mix(in srgb,var(--tx) 12%,transparent)', borderRadius: 14, boxShadow: '0 18px 40px rgba(0,0,0,.16)', zIndex: 95, width: 210, padding: 8 }}>
                {[['My wishlist', base ? `${base}/wishlist` : '#'], ['Track an order', '/buyer/orders']].map(([l, h]) => <Link key={l} role="menuitem" href={ctx.preview ? '#' : h} className="pf-sug" onClick={(e) => { if (ctx.preview) e.preventDefault(); setAcct(false); }} style={{ display: 'block', padding: '10px 12px', fontSize: 14, borderRadius: 8 }}>{l}</Link>)}
                <button type="button" role="menuitem" className="pf-sug" onClick={() => { setAcct(false); actions?.cart?.(); }} style={{ display: 'block', width: '100%', textAlign: 'left', border: 0, background: 'transparent', padding: '10px 12px', fontSize: 14, borderRadius: 8 }}>My cart</button>
              </div>
            ) : null}
          </div>
        </div>
        {mob ? <div style={{ padding: '0 16px 12px' }}>{searchBox}</div> : null}
        {!mob ? (
          <div className="pf-nav" style={{ display: 'flex', alignItems: 'center', gap: 30, padding: `0 ${px}px`, maxWidth: 1400, margin: '0 auto', borderTop: '1px solid color-mix(in srgb,var(--tx) 8%,transparent)' }}>
            {cats.length ? <button type="button" aria-expanded={mega} aria-haspopup="true" onClick={() => setMega(!mega)} style={{ border: 0, background: 'transparent', fontWeight: 700, fontSize: 14, padding: '12px 0', display: 'flex', gap: 8, alignItems: 'center', color: mega ? 'var(--pr)' : 'inherit' }}><PI n="menu" s={17} />All categories<PI n="down" s={14} /></button> : null}
            {nav.map(([label, href]) => <a key={href} href={href} onMouseEnter={() => setMega(false)} onClick={go}>{label}</a>)}
            {delivery ? <span className="muted" style={{ marginLeft: 'auto', fontSize: 13, display: tab ? 'none' : 'flex', gap: 6, alignItems: 'center' }}><PI n="truck" s={15} />{delivery}</span> : null}
          </div>
        ) : null}
        {mega && !mob && cats.length ? (
          <div className="pf-mega" role="menu" aria-label="Categories">
            <div style={{ maxWidth: 1400, margin: '0 auto', padding: `0 ${px}px`, display: 'grid', gridTemplateColumns: `repeat(${Math.min(5, Math.max(cats.length, 1))},1fr)`, gap: '8px 32px' }}>
              {cats.map((c) => (
                <div key={c.name}>
                  <h4>{c.name}</h4>
                  <a role="menuitem" href={catHref(c.name)} onClick={(e) => openCat(e, c.name)} style={{ color: 'var(--pr)', fontWeight: 600 }}>Shop {c.name}</a>
                  <span className="muted" style={{ fontSize: 12.5 }}>{plural(c.count, 'piece')}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {mob && menu ? (
          <div style={{ borderTop: '1px solid color-mix(in srgb,var(--tx) 10%,transparent)', padding: '8px 16px 16px', maxHeight: 360, overflow: 'auto' }}>
            {nav.map(([label, href]) => <a key={href} href={href} onClick={(e) => { go(e); setMenu(false); }} style={{ display: 'block', padding: '11px 0', fontWeight: 600, borderBottom: '1px solid color-mix(in srgb,var(--tx) 8%,transparent)' }}>{label}</a>)}
            {cats.length ? <div className="pf-kick" style={{ padding: '14px 0 6px' }}>Categories</div> : null}
            {cats.map((c) => <a key={c.name} href={catHref(c.name)} onClick={(e) => openCat(e, c.name)} style={{ display: 'block', padding: '8px 0' }}>{c.name}</a>)}
          </div>
        ) : null}
      </header>
    </>
  );
}

/** Ask the shop's product list to show a category (the same address hash the category tiles use). */
export function pickCategory(name: string) {
  const hash = name ? `#sx-cat-${encodeURIComponent(name)}` : '#sx-products';
  window.history.replaceState(null, '', hash);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  document.getElementById('sx-products')?.scrollIntoView({ behavior: 'smooth' });
}

/** The shop's footer: about, links, categories, contact and the ways to pay. */
export function PhysFooter({ ctx, nav, rows }: { ctx: StoreCtx; nav: [string, string][]; rows: { whatsapp: string; instagram: string } }) {
  const { config, data, base, extras = {} } = ctx;
  const { mob, tab } = useDev();
  const name = config.brand.name || data.shop.name;
  const tag = config.brand.tagline || config.footer.note;
  const cats = catsOf(data.products).slice(0, 6);
  const c = config.contact;
  const dim: CSSProperties = { color: 'color-mix(in srgb,currentColor 62%,transparent)' };
  const px = mob ? 18 : tab ? 28 : 40;
  const colsN = 3;
  const pay = [extras.payments?.upi || extras.payments?.online ? 'UPI' : '', extras.payments?.online ? 'Cards' : '', extras.cod ? 'COD' : ''].filter(Boolean);
  const h4: CSSProperties = { fontFamily: 'var(--bf)', fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 14 };
  return (
    <footer style={{ background: '#16121A', color: '#E9E4EC', paddingTop: Math.round(56 * (mob ? 0.55 : tab ? 0.8 : 1)), paddingBottom: 28 }}>
      <div className="pf-in" style={{ maxWidth: 1240, padding: `0 ${px}px` }}>
        <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : tab ? '1fr 1fr' : `1.5fr repeat(${colsN},1fr) 1.3fr`, gap: mob ? 28 : 40, paddingBottom: 40, borderBottom: '1px solid rgba(255,255,255,.14)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontFamily: 'var(--hf)', fontWeight: 700, fontSize: 28 }}>{name}</div>
            {tag ? <p style={{ ...dim, fontSize: 14.5, maxWidth: 340 }}>{tag}</p> : null}
            <div style={{ display: 'flex', gap: 10 }}>
              {rows.instagram ? <a aria-label="Instagram" title="Instagram" href={`https://instagram.com/${rows.instagram}`} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,.28)', display: 'grid', placeItems: 'center' }}><PI n="instagram" s={16} /></a> : null}
              {rows.whatsapp ? <a aria-label="WhatsApp" title="WhatsApp" href={`https://wa.me/91${rows.whatsapp}`} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,.28)', display: 'grid', placeItems: 'center' }}><PI n="whatsapp" s={16} /></a> : null}
            </div>
          </div>
          <div><h4 style={h4}>Shop</h4><div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>{nav.map(([label, href]) => <a key={href} href={href} onClick={(e) => ctx.preview && e.preventDefault()} style={{ ...dim, fontSize: 14.5 }}>{label}</a>)}{!nav.length ? <a href="#sx-top" style={{ ...dim, fontSize: 14.5 }}>Home</a> : null}</div></div>
          <div><h4 style={h4}>Categories</h4><div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {cats.map((k) => <a key={k.name} href={`${base || ''}#sx-cat-${encodeURIComponent(k.name)}`} style={{ ...dim, fontSize: 14.5 }} onClick={(e) => { if (ctx.preview) { e.preventDefault(); return; } if (!base || window.location.pathname === base) { e.preventDefault(); pickCategory(k.name); } }}>{k.name}</a>)}
            {!cats.length ? <a href="#sx-products" style={{ ...dim, fontSize: 14.5 }}>All products</a> : null}</div></div>
          <div><h4 style={h4}>Help</h4><div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <button type="button" onClick={() => ctx.actions?.track?.()} style={{ ...dim, fontSize: 14.5, border: 0, background: 'none', padding: 0, textAlign: 'left' }}>Where is my order?</button>
            <Link href="/privacy" style={{ ...dim, fontSize: 14.5 }}>Privacy</Link><Link href="/terms" style={{ ...dim, fontSize: 14.5 }}>Terms</Link></div></div>
          <div><h4 style={h4}>Contact</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, ...dim, fontSize: 14.5 }}>
              {c.address || data.shop.city ? <div style={{ display: 'flex', gap: 10 }}><PI n="mapPin" s={16} style={{ marginTop: 3 }} /><span style={{ whiteSpace: 'pre-line' }}>{c.address || data.shop.city}</span></div> : null}
              {rows.whatsapp || c.phone ? <div style={{ display: 'flex', gap: 10 }}><PI n="phoneC" s={16} style={{ marginTop: 3 }} /><span>{c.phone || rows.whatsapp}</span></div> : null}
              {c.email && c.show?.email === true ? <div style={{ display: 'flex', gap: 10 }}><PI n="mail" s={16} style={{ marginTop: 3 }} /><span>{c.email}</span></div> : null}
              {c.hours ? <div style={{ display: 'flex', gap: 10 }}><PI n="clock" s={16} style={{ marginTop: 3 }} /><span>{c.hours}</span></div> : null}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingTop: 22, fontSize: 13, ...dim }}>
          <span>© {new Date().getFullYear()} {name}{data.shop.city ? `, ${data.shop.city}` : ''}. {config.footer.note && tag !== config.footer.note ? config.footer.note : ''} Built on stoora.in</span>
          <div style={{ display: 'flex', gap: 8 }}>{pay.map((p) => <span key={p} style={{ border: '1px solid rgba(255,255,255,.22)', borderRadius: 6, padding: '3px 9px', fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em' }}>{p}</span>)}</div>
        </div>
      </div>
    </footer>
  );
}

/* ---------- hero ---------- */

type Slide = { key: string; eyebrow: string; title: ReactNode; sub: string; cta: ReactNode; cta2?: ReactNode; img?: string; art?: StoreItem['art']; pos?: string };

function Hero({ ctx, ctaTarget, whatsapp }: { ctx: StoreCtx; ctaTarget: string; whatsapp: string }) {
  const { config, data, base } = ctx;
  const { mob, tab } = useDev();
  const name = config.brand.name || data.shop.name;
  // the hero only shows photos the seller has chosen: the carousel photos (or the one Main photo on older designs), then products starred Featured in the editor
  const heroPhotos = config.hero.images?.length ? config.hero.images : config.hero.image ? [config.hero.image] : [];
  const spotlight = config.featuredIds.map((id) => data.products.find((p) => p.id === id)).filter(Boolean).filter((p) => p!.img || p!.art).slice(0, 3) as StoreItem[];
  const title = config.hero.title || config.brand.tagline || name;
  const sub = config.hero.subtitle || (config.hero.title ? config.brand.tagline : '') || '';
  const eyebrow = (config.brand.tagline && config.hero.title ? config.brand.tagline : data.shop.city) || 'Welcome';
  const cta = <a className="pf-btn" href={`#${ctaTarget}`} onClick={(e) => { if (ctx.preview) e.preventDefault(); }}>{config.hero.cta || 'Shop now'}</a>;
  const cta2 = whatsapp ? <a className="pf-btn out" href={`https://wa.me/91${whatsapp}`} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a> : undefined;
  const slides: Slide[] = [
    ...(heroPhotos.length ? heroPhotos : ['']).map((img, i) => ({ key: `shop${i}`, eyebrow, title: <>{title}</>, sub, img, pos: config.hero.focus, cta, cta2 })),
    ...spotlight.map((p) => ({
      key: p.id, eyebrow: p.cat || 'In the shop', title: <>{p.name}</>, sub: `${rupees(p.price)}${p.desc ? '. ' + p.desc.slice(0, 120) : ''}`, img: p.img, art: p.art, pos: p.crop?.pos,
      cta: base && !ctx.preview ? <Link className="pf-btn" href={`${base}/p/${p.id}`}>See it</Link> : <span className="pf-btn">See it</span>,
    })),
  ].slice(0, 6);
  const [cur, setCur] = useState(0);
  const [hold, setHold] = useState(false);
  const many = slides.length > 1;
  useEffect(() => {
    if (!many || hold || ctx.preview || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)) return;
    const t = window.setInterval(() => setCur((x) => (x + 1) % slides.length), 5500);
    return () => window.clearInterval(t);
  }, [many, hold, slides.length, ctx.preview]);
  const idx = Math.min(cur, slides.length - 1);
  const goTo = (i: number) => setCur((i + slides.length) % slides.length);
  const sl = slides[idx];
  const photo = Boolean(sl.img);
  const tinted = !photo && idx > 0 && Boolean(sl.art?.hex);
  const right = idx % 2 === 1;
  const px = mob ? 20 : tab ? 40 : 72;
  const light = photo || (tinted && isDark(sl.art!.hex));
  const text = (
    <div key={sl.key} className="pf-fade" style={{ position: 'relative', zIndex: 2, width: mob ? '100%' : tab ? '58%' : '50%', paddingTop: mob ? 28 : 0, paddingBottom: mob ? 56 : 0, paddingLeft: mob ? px : right ? 0 : px, paddingRight: mob ? px : right ? px : 0, marginLeft: right && !mob ? 'auto' : 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: mob ? 14 : 20, minHeight: mob ? 0 : '100%', color: light && !mob ? '#fff' : 'var(--tx)', alignItems: 'flex-start' }}>
      <div className="pf-kick" style={light && !mob ? { color: '#fff', opacity: 0.85 } : undefined}>{sl.eyebrow}</div>
      <h1 className="pf-h1" style={{ display: 'block', overflowWrap: 'anywhere' }}>{sl.title}</h1>
      {sl.sub ? <p style={{ fontSize: mob ? 15.5 : 18, maxWidth: 480, opacity: 0.85, display: 'block' }}>{sl.sub}</p> : null}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
        {styledCta(sl.cta, mob ? 'md' : 'lg', light && !mob)}
        {sl.cta2 ? styledCta(sl.cta2, mob ? 'md' : 'lg', light && !mob, true) : null}
      </div>
    </div>
  );
  const artH = mob ? 270 : 540;
  return (
    <section aria-roledescription="carousel" aria-label="Featured" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} onFocusCapture={() => setHold(true)} onBlurCapture={() => setHold(false)}
      style={{ position: 'relative', overflow: 'hidden', display: mob ? 'block' : 'flex', alignItems: 'stretch', minHeight: mob ? 0 : 540, background: 'var(--sf)' }}>
      <div style={mob ? { height: sl.img || tinted ? artH : 0, position: 'relative' } : { position: 'absolute', inset: 0 }}>
        {sl.img || tinted ? <Fill><Pic src={sl.img} art={sl.art} letter="" pos={sl.pos} eager /></Fill> : null}
        {photo && !mob ? <div style={{ position: 'absolute', inset: 0, background: right ? 'linear-gradient(270deg,rgba(10,8,12,.66),rgba(10,8,12,.05) 70%)' : 'linear-gradient(90deg,rgba(10,8,12,.66),rgba(10,8,12,.05) 70%)' }} /> : null}
      </div>
      {text}
      {many && !mob ? (
        <>
          <button type="button" className="pf-arrow" aria-label="Previous slide" onClick={() => goTo(idx - 1)} style={{ position: 'absolute', left: 18, top: '50%', marginTop: -20, zIndex: 5 }}><PI n="left" s={18} /></button>
          <button type="button" className="pf-arrow" aria-label="Next slide" onClick={() => goTo(idx + 1)} style={{ position: 'absolute', right: 18, top: '50%', marginTop: -20, zIndex: 5 }}><PI n="right" s={18} /></button>
        </>
      ) : null}
      {many ? (
        <div role="group" aria-label="Choose a slide" style={{ position: 'absolute', bottom: mob ? 18 : 22, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8, zIndex: 5 }}>
          {slides.map((x, i) => <button type="button" key={x.key} aria-label={`Slide ${i + 1}`} aria-current={i === idx} onClick={() => goTo(i)} style={{ width: i === idx ? 28 : 9, height: 9, borderRadius: 9, border: 0, background: i === idx ? 'var(--pr)' : 'rgba(0,0,0,.28)', transition: '.25s', padding: 0 }} />)}
        </div>
      ) : null}
      {many && mob ? (
        <div style={{ position: 'absolute', top: artH - 56, right: 14, display: 'flex', gap: 8, zIndex: 5 }}>
          <button type="button" className="pf-arrow" aria-label="Previous slide" onClick={() => goTo(idx - 1)} style={{ width: 36, height: 36 }}><PI n="left" s={16} /></button>
          <button type="button" className="pf-arrow" aria-label="Next slide" onClick={() => goTo(idx + 1)} style={{ width: 36, height: 36 }}><PI n="right" s={16} /></button>
        </div>
      ) : null}
    </section>
  );
}

/** Give a hero button the design's size (and a white outline on a photo). */
function styledCta(node: ReactNode, size: 'md' | 'lg', onPhoto: boolean, secondary = false): ReactNode {
  if (!React.isValidElement(node)) return node;
  const el = node as React.ReactElement<{ style?: CSSProperties }>;
  const style: CSSProperties = { padding: size === 'lg' ? '17px 36px' : '13px 26px', fontSize: size === 'lg' ? 16 : 15, ...(el.props.style || {}) };
  if (onPhoto && secondary) { style.color = '#fff'; style.borderColor = '#fff'; }
  if (onPhoto && !secondary) { style.background = '#fff'; style.color = '#1b1b1b'; style.borderColor = '#fff'; }
  return React.cloneElement(el, { style });
}

/* ---------- sections ---------- */

function Categories({ cats }: { cats: Cat[] }) {
  const { mob, tab } = useDev();
  const list = cats.slice(0, 6);
  const cols = mob ? 2 : tab ? 4 : Math.max(Math.min(list.length, 6), 4);
  return (
    <Frame id="sx-cats" pt={72} pb={56}>
      <SecHead kicker="Browse" title="Shop by category" sub="Pick a category to see what is inside." right={<a className="pf-btn ghost" href="#sx-products" onClick={(e) => { e.preventDefault(); pickCategory(''); }} style={{ fontSize: 15 }}>View all<PI n="arrow" s={15} /></a>} />
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(cols, 1)},minmax(0,1fr))`, gap: mob ? 14 : 24 }}>
        {list.map((c) => (
          <a key={c.name} className="pf-cat" href={`#sx-cat-${encodeURIComponent(c.name)}`} onClick={(e) => { e.preventDefault(); pickCategory(c.name); }}>
            <div className="im" style={{ aspectRatio: '4/5', borderRadius: 'calc(var(--rd) + 6px)' }}><Fill><Pic src={c.image} art={c.art} letter={initial(c.name)} /></Fill></div>
            <div style={{ marginTop: 12, fontWeight: 700, fontSize: mob ? 14 : 16, fontFamily: 'var(--hf)' }}>{c.name}</div>
            <div className="muted" style={{ fontSize: 12.5 }}>{plural(c.count, 'piece')}</div>
          </a>
        ))}
      </div>
    </Frame>
  );
}

function Shelf({ id, kicker, title, sub, ctx, items }: { id: string; kicker: string; title: string; sub?: string; ctx: StoreCtx; items: StoreItem[] }) {
  const { mob, tab } = useDev();
  if (!items.length) return null;
  const c = colsOf(4, mob, tab);
  const gap = 22;
  return (
    <Frame id={id} pt={56} pb={56}>
      <SecHead kicker={kicker} title={title} sub={sub} />
      <Scroller gap={gap}>{items.map((p, i) => <div key={p.id} style={{ flex: `0 0 calc((100% - ${gap * (c - 1)}px)/${c})`, minWidth: 0 }}><ProductCard item={p} ctx={ctx} i={i} /></div>)}</Scroller>
    </Frame>
  );
}

function Promo({ ctx }: { ctx: StoreCtx }) {
  const { mob } = useDev();
  const p = ctx.config.promo;
  if (!p?.title) return null;
  const go = () => document.getElementById('sx-products')?.scrollIntoView({ behavior: 'smooth' });
  const image = <div style={{ minHeight: mob ? 240 : 380, position: 'relative', background: 'var(--sf)' }}><Fill><Pic src={p.image} letter={initial(ctx.config.brand.name || ctx.data.shop.name)} /></Fill></div>;
  const panel = (
    <div style={{ background: 'var(--pr)', color: '#fff', padding: mob ? '34px 24px' : '48px 56px', display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center', alignItems: 'flex-start' }}>
      <div className="pf-kick" style={{ filter: 'brightness(1.3)' }}>Offer</div>
      <h2 className="pf-h2" style={{ display: 'block' }}>{p.title}</h2>
      {p.sub ? <p style={{ opacity: 0.82, fontSize: 16, maxWidth: 440 }}>{p.sub}</p> : null}
      <button type="button" className="pf-btn" style={{ background: '#fff', color: '#1b1b1b', borderColor: '#fff', padding: '17px 36px', fontSize: 16 }} onClick={() => { if (!ctx.preview) go(); }}>{p.cta || 'Shop now'}</button>
    </div>
  );
  return (
    <Frame id="sx-promo" pt={24} pb={56}>
      <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', borderRadius: 'calc(var(--rd) + 8px)', overflow: 'hidden' }}>{p.image ? <>{image}{panel}</> : <div style={{ gridColumn: '1 / -1' }}>{panel}</div>}</div>
    </Frame>
  );
}

type Sort = 'pop' | 'low' | 'high' | 'new' | 'az';
const SORTS: [Sort, string][] = [['pop', 'Popularity'], ['new', 'Newest'], ['low', 'Price: low to high'], ['high', 'Price: high to low'], ['az', 'Name A to Z']];

/** A labelled group of filter controls. Defined at module scope, not inside Listing, so its identity stays stable across
 * renders — otherwise React would remount its inputs (and drop focus mid-type) on every keystroke in the fields inside it. */
const FG = ({ t, children }: { t: string; children: ReactNode }) => <div style={{ borderBottom: '1px solid color-mix(in srgb,var(--tx) 10%,transparent)', padding: '16px 0' }}><div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{t}</div>{children}</div>;

/** All the shop's products, with search, categories, filters, sorting and a grid or list view. */
function Listing({ ctx, cats }: { ctx: StoreCtx; cats: Cat[] }) {
  const { config, data } = ctx;
  const { mob, tab } = useDev();
  const top = useMemo(() => Math.max(100, Math.ceil(Math.max(0, ...data.products.map((p) => p.price)) / 100) * 100), [data.products]);
  const sizes = useMemo(() => [...new Set(data.products.flatMap(optionsOf))], [data.products]);
  const [cat, setCat] = useState('');
  const [term, setTerm] = useState('');
  const [sort, setSort] = useState<Sort>('pop');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [cap, setCap] = useState<number | null>(null); // committed, debounced: drives the expensive filter/sort below
  const [dragCap, setDragCap] = useState<number | null>(null); // the slider's own value while dragging, so it tracks the pointer smoothly
  const dragTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [floor, setFloor] = useState(0); // committed lowest price, set from the From/To boxes
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [size, setSize] = useState<string[]>([]);
  const [stock, setStock] = useState(false);
  const [fo, setFo] = useState(false);
  const max = Math.min(cap ?? top, top);
  const sliderMax = Math.min(dragCap ?? cap ?? top, top);
  // the grid re-filters on every tick of the slider if we commit straight away, which is what makes dragging feel sticky
  const drag = (v: number) => { setDragCap(v); clearTimeout(dragTimer.current); dragTimer.current = setTimeout(() => { setCap(v); setDragCap(null); }, 120); };
  useEffect(() => () => clearTimeout(dragTimer.current), []);
  // the From/To boxes only filter once Search is pressed, not on every keystroke
  const searchRange = () => {
    let from = Math.max(0, Math.min(top, fromText.trim() ? Number(fromText) || 0 : 0));
    let to = Math.max(0, Math.min(top, toText.trim() ? Number(toText) || top : top));
    if (from > to) [from, to] = [to, from];
    setFloor(from); setCap(to); setDragCap(null);
  };
  const list = useMemo(() => {
    const first = new Set(config.featuredIds);
    const best = new Set(data.bestsellerIds || []);
    const rank = (p: StoreItem) => (first.has(p.id) ? 0 : best.has(p.id) ? 1 : 2);
    const t = term.trim().toLowerCase();
    const idx = new Map(data.products.map((p, i) => [p.id, i]));
    const out = data.products.filter((p) => (!cat || p.cat === cat) && (!t || `${p.name} ${p.cat || ''} ${p.tags || ''}`.toLowerCase().includes(t))
      && p.price >= floor && p.price <= max && (!size.length || optionsOf(p).some((z) => size.includes(z))) && (!stock || !soldOut(p)));
    const by: Record<Sort, (a: StoreItem, b: StoreItem) => number> = {
      pop: (a, b) => rank(a) - rank(b) || (idx.get(a.id)! - idx.get(b.id)!),
      new: (a, b) => idx.get(b.id)! - idx.get(a.id)!,
      low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price,
      az: (a, b) => a.name.localeCompare(b.name),
    };
    return [...out].sort(by[sort]);
  }, [data.products, data.bestsellerIds, config.featuredIds, cat, term, sort, floor, max, size, stock]);
  const filtered = Boolean(cat || term.trim() || floor > 0 || max < top || size.length || stock);
  const clear = () => { setCat(''); setTerm(''); setCap(null); setDragCap(null); setFloor(0); setFromText(''); setToText(''); setSize([]); setStock(false); };
  useEffect(() => {
    const read = () => { const m = /^#sx-cat-(.+)$/.exec(window.location.hash); if (m) setCat(decodeURIComponent(m[1])); else if (window.location.hash === '#sx-products') setCat(''); };
    read();
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setTerm(q);
    const onSearch = (e: Event) => { setTerm(String((e as CustomEvent).detail ?? '')); setCat(''); };
    window.addEventListener('hashchange', read);
    window.addEventListener('sx-search', onSearch);
    return () => { window.removeEventListener('hashchange', read); window.removeEventListener('sx-search', onSearch); };
  }, []);
  const toggleSize = (z: string) => setSize((cur) => (cur.includes(z) ? cur.filter((x) => x !== z) : [...cur, z]));
  const filters = (
    <div className="pf-filters">
      <FG t="Price range"><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 6 }}><span>{rupees(floor)}</span><b>Up to {rupees(sliderMax)}</b></div>
        <input type="range" min={Math.min(100, top)} max={top} step={Math.max(10, Math.round(top / 50 / 10) * 10)} value={sliderMax} onChange={(e) => drag(Number(e.target.value))} aria-label="Highest price" style={{ width: '100%', accentColor: 'var(--pr)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          {([['From', fromText, setFromText], ['To', toText, setToText]] as const).map(([ph, v, set]) => (
            <div key={ph} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, border: '1.5px solid color-mix(in srgb,var(--tx) 16%,transparent)', borderRadius: 10, background: 'var(--sf)', overflow: 'hidden' }}>
              <span aria-hidden="true" style={{ padding: '0 4px 0 10px', color: 'color-mix(in srgb,var(--tx) 55%,transparent)' }}>₹</span>
              <input type="number" min={0} max={top} step={1} inputMode="numeric" value={v} onChange={(e) => set(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchRange()} aria-label={`${ph} price`} placeholder={ph} style={{ border: 0, outline: 0, background: 'transparent', width: '100%', minWidth: 0, padding: '9px 8px 9px 0', fontSize: 14.5, color: 'var(--tx)' }} />
            </div>
          ))}
        </div>
        <button type="button" className="pf-btn" style={{ width: '100%', padding: 9, fontSize: 13.5, marginTop: 8 }} onClick={searchRange}><PI n="search" s={15} />Search</button></FG>
      {sizes.length ? <FG t="Size"><div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{sizes.map((z) => <button type="button" key={z} className={`pf-chip${size.includes(z) ? ' on' : ''}`} aria-pressed={size.includes(z)} style={{ padding: '5px 12px', fontSize: 13 }} onClick={() => toggleSize(z)}>{z}</button>)}</div></FG> : null}
      <FG t="Availability">
        <label style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '4px 0', cursor: 'pointer', fontSize: 14 }}>
          <input type="checkbox" checked={stock} onChange={(e) => setStock(e.target.checked)} style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} />
          <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${stock ? 'var(--pr)' : 'color-mix(in srgb,var(--tx) 30%,transparent)'}`, background: stock ? 'var(--pr)' : 'transparent', color: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}>{stock ? <PI n="check" s={12} w={3} /> : null}</span>In stock only
        </label>
      </FG>
      <button type="button" className="pf-btn out" disabled={!filtered} style={{ marginTop: 14, width: '100%', padding: 10, fontSize: 14 }} onClick={clear}>Clear filters</button>
    </div>
  );
  const cols = mob ? 2 : tab ? 2 : 3;
  const chipsRow = (items: string[], on: string, set: (v: string) => void) => (
    <div role="group" aria-label="Filter by category" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 20 }}>
      {items.map((n) => <button type="button" key={n || 'all'} className={`pf-chip${on === n ? ' on' : ''}`} aria-pressed={on === n} onClick={() => set(n)}>{n || 'All'}</button>)}
    </div>
  );
  return (
    <Frame id="sx-products" pt={56} pb={56}>
      <SecHead kicker="Shop" title={cat || (cats.length ? 'Shop the collection' : 'Our products')} sub={`${plural(list.length, 'piece')}${filtered ? ' match' : ' in the shop'}`} />
      {data.products.length ? (
        <>
          {cats.length ? chipsRow(['', ...cats.map((c) => c.name)], cat, setCat) : null}
          <div style={{ display: 'grid', gridTemplateColumns: !mob ? '240px 1fr' : '1fr', gap: 36, alignItems: 'start' }}>
            {!mob ? <aside aria-label="Filters" style={{ borderTop: '1px solid color-mix(in srgb,var(--tx) 10%,transparent)' }}>{filters}</aside> : null}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                {mob ? <button type="button" className="pf-chip" aria-expanded={fo} onClick={() => setFo(!fo)}><PI n="filter" s={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />Filters{filtered ? ' (on)' : ''}</button> : null}
                <label className="pf-searchbox" style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid color-mix(in srgb,var(--tx) 20%,transparent)', borderRadius: 'var(--rd)', padding: '0 12px', flex: '1 1 180px', maxWidth: 360, minHeight: 42 }}>
                  <PI n="search" s={16} /><span className="pf-sr">Search products</span>
                  <input type="search" placeholder="Search this shop" value={term} onChange={(e) => setTerm(e.target.value)} autoComplete="off" style={{ border: 0, outline: 0, background: 'transparent', flex: 1, minWidth: 0, padding: '8px 0' }} />
                </label>
                <span style={{ flex: 1 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>Sort by
                  <Select id="sx-sort" size="sm" value={sort} onChange={(v) => setSort(v as Sort)} options={SORTS.map(([v, l]) => ({ value: v, label: l }))} aria-label="Sort by" />
                </div>
                <div role="group" aria-label="View" style={{ display: 'flex', gap: 4 }}>
                  {([['grid', 'grid', 'Grid view'], ['list', 'list', 'List view']] as const).map(([v, ic, l]) => (
                    <button type="button" key={v} aria-label={l} aria-pressed={view === v} onClick={() => setView(v)} style={{ width: 38, height: 38, borderRadius: 'var(--rd)', border: '1px solid color-mix(in srgb,var(--tx) 18%,transparent)', background: view === v ? 'var(--pr)' : 'transparent', color: view === v ? '#fff' : 'inherit', display: 'grid', placeItems: 'center' }}><PI n={ic} s={17} /></button>
                  ))}
                </div>
              </div>
              {mob && fo ? <div style={{ border: '1px solid color-mix(in srgb,var(--tx) 12%,transparent)', borderRadius: 14, padding: '0 16px 16px', marginBottom: 20 }}>{filters}</div> : null}
              {!list.length
                ? <div className="empty" role="status" style={{ padding: 40 }}>No products match these filters.<div><button type="button" className="pf-btn" style={{ marginTop: 14, padding: '10px 20px' }} onClick={clear}>Show all products</button></div></div>
                : view === 'list'
                  ? <div data-view="list" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>{list.map((p, i) => <ProductCard key={p.id} item={p} ctx={ctx} list i={i} />)}</div>
                  : <div data-view="grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`, gap: 24 }}>{list.map((p, i) => <ProductCard key={p.id} item={p} ctx={ctx} i={i} />)}</div>}
            </div>
          </div>
        </>
      ) : (
        <div className="empty"><h3 style={{ fontSize: 28, marginBottom: 6 }}>Coming soon</h3><p>{ctx.preview && !ctx.sample ? 'You have no products showing yet. Add one in your dashboard and it appears here.' : 'New products will appear here soon.'}</p></div>
      )}
    </Frame>
  );
}

function Testimonials({ ctx }: { ctx: StoreCtx }) {
  const { mob, tab } = useDev();
  const list = (ctx.data.reviews || []).slice(0, 4);
  const summary = ctx.data.reviewSummary?.count ? ctx.data.reviewSummary : { count: list.length, average: list.reduce((a, r) => a + r.rating, 0) / Math.max(1, list.length) };
  const cols = mob ? 1 : tab ? Math.min(list.length, 2) : Math.min(list.length || 1, 4);
  return (
    <Frame id="sx-reviews" pt={72} pb={72} bg="var(--sf)">
      <SecHead center kicker="Reviews" title={`Loved by ${plural(summary.count, 'buyer')}`} />
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(cols, 1)},minmax(0,1fr))`, gap: 20 }}>
        {list.map((t, i) => (
          <div key={i} style={{ background: 'var(--bg)', borderRadius: 'calc(var(--rd) + 6px)', padding: 26, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
            <Stars v={t.rating || 5} size={16} />
            <p style={{ fontSize: 16, lineHeight: 1.6 }}>{t.comment}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto' }}>
              <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--pr)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>{t.who.split(' ').map((x) => x[0]).join('').slice(0, 2)}</span>
              <b>{t.who}</b>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function Features({ items }: { items: { icon: string; title: string; sub: string }[] }) {
  const { mob, tab } = useDev();
  if (!items.length) return null;
  return (
    <Frame id="sx-feat" pt={40} pb={40} bg="var(--sf)">
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${mob ? 1 : tab ? 2 : Math.min(4, items.length)},minmax(0,1fr))`, gap: mob ? 18 : 28 }}>
        {items.map((f) => (
          <div key={f.title} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg)', color: 'var(--pr)', display: 'grid', placeItems: 'center', flex: 'none', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}><PI n={f.icon} s={22} /></div>
            <div><b style={{ display: 'block', fontSize: 16 }}>{f.title}</b><span className="muted" style={{ fontSize: 14, display: 'block', marginTop: 2 }}>{f.sub}</span></div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function Story({ ctx, text }: { ctx: StoreCtx; text: string }) {
  const { mob } = useDev();
  const { config, data } = ctx;
  const title = config.story.text ? config.story.title : config.about.title;
  const image = config.about.image || '';
  return (
    <Frame id="sx-story" pt={72} pb={72}>
      <div style={{ display: 'grid', gridTemplateColumns: image && !mob ? '1fr 1fr' : '1fr', gap: mob ? 24 : 56, alignItems: 'center' }}>
        {image ? <div className="im" style={{ aspectRatio: '5/4', borderRadius: 'calc(var(--rd) + 6px)', position: 'relative', overflow: 'hidden', background: 'var(--sf)' }}><Fill><Pic src={image} alt={title} /></Fill></div> : null}
        <div style={{ maxWidth: image ? undefined : 760 }}>
          <div className="pf-kick" style={{ marginBottom: 10 }}>Our story</div>
          <h2 className="pf-h2">{title}</h2>
          {text.split(/\n{2,}/).filter(Boolean).map((p, i) => <p key={i} className="muted" style={{ marginTop: 14, fontSize: 16.5, lineHeight: 1.7 }}>{p}</p>)}
          {data.shop.city ? <p style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}><PI n="mapPin" s={16} />{data.shop.city}</p> : null}
        </div>
      </div>
    </Frame>
  );
}

function Faq({ ctx }: { ctx: StoreCtx }) {
  const [open, setOpen] = useState(0);
  const { mob } = useDev();
  return (
    <Frame id="sx-faq" pt={72} pb={72} maxW={960}>
      <SecHead kicker="Questions" title="Before you order" sub="Anything else, just ask the seller." />
      <div style={{ display: 'block' }}>
        {ctx.config.faqs.map((f, i) => (
          <div key={i} className={`pf-acc${open === i ? ' open' : ''}`}>
            <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>{f.q}<PI n="down" s={18} className="chev" /></button>
            {open === i ? <p className="muted" style={{ padding: '0 2px 18px', fontSize: mob ? 15 : 16, lineHeight: 1.7, maxWidth: 720 }}>{f.a}</p> : null}
          </div>
        ))}
      </div>
    </Frame>
  );
}

function Contact({ ctx, rows }: { ctx: StoreCtx; rows: { whatsapp: string; phone: string; email: string; instagram: string } }) {
  const { mob } = useDev();
  const c = ctx.config.contact;
  const name = ctx.config.brand.name || ctx.data.shop.name;
  const btn: CSSProperties = { padding: '15px 28px', fontSize: 15 };
  return (
    <Frame id="sx-contact" pt={64} pb={64} bg="var(--pr)" color="#fff">
      <div style={{ display: 'grid', gridTemplateColumns: mob || !(c.address || c.hours) ? '1fr' : '1fr 1fr', gap: mob ? 28 : 56, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 className="pf-h2">Questions? Ask {name}.</h2>
          <p style={{ opacity: 0.82, fontSize: 16, maxWidth: 520 }}>Sizes, colours, delivery or a custom order: we reply quickly.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            {rows.whatsapp ? <a className="pf-btn" style={{ ...btn, background: '#fff', color: '#1b1b1b', borderColor: '#fff' }} href={`https://wa.me/91${rows.whatsapp}`} target="_blank" rel="noopener noreferrer"><PI n="whatsapp" s={18} />Chat on WhatsApp</a> : null}
            {rows.phone ? <a className="pf-btn out" style={{ ...btn, color: '#fff', borderColor: '#fff' }} href={`tel:+91${rows.phone}`}><PI n="phoneC" s={17} />Call {rows.phone}</a> : null}
            {rows.email ? <a className="pf-btn out" style={{ ...btn, color: '#fff', borderColor: '#fff' }} href={`mailto:${rows.email}`}><PI n="mail" s={17} />{rows.email}</a> : null}
            {rows.instagram ? <a className="pf-btn out" style={{ ...btn, color: '#fff', borderColor: '#fff' }} href={`https://instagram.com/${rows.instagram}`} target="_blank" rel="noopener noreferrer"><PI n="instagram" s={17} />Instagram</a> : null}
          </div>
        </div>
        {c.address || c.hours ? (
          <div style={{ display: 'grid', gap: 20, padding: mob ? 24 : 32, borderRadius: 'calc(var(--rd) + 6px)', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.16)', height: '100%' }}>
            {c.address ? <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}><PI n="mapPin" s={20} style={{ flexShrink: 0, marginTop: 2, filter: 'brightness(1.4)' }} /><div><div className="pf-kick" style={{ filter: 'brightness(1.4)' }}>Visit</div><p style={{ whiteSpace: 'pre-line', marginTop: 4, fontSize: 16 }}>{c.address}</p></div></div> : null}
            {c.address && c.hours ? <div style={{ height: 1, background: 'rgba(255,255,255,.16)' }} /> : null}
            {c.hours ? <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}><PI n="clock" s={20} style={{ flexShrink: 0, marginTop: 2, filter: 'brightness(1.4)' }} /><div><div className="pf-kick" style={{ filter: 'brightness(1.4)' }}>Open</div><p style={{ marginTop: 4, fontSize: 16 }}>{c.hours}</p></div></div> : null}
          </div>
        ) : null}
      </div>
    </Frame>
  );
}

/* ---------- the page ---------- */

/**
 * The storefront of a shop that sells physical products. Every line comes from the seller's own details and products;
 * a section with nothing to show is left out. The same component draws the live shop, the editor preview and the admin views.
 */
export function PhysHome({ ctx, children }: { ctx: StoreCtx; children?: ReactNode }) {
  const { config, data, extras = {} } = ctx;
  const { mob, tab } = useDev();
  const layout = layoutOf(config, true);
  const cats = useMemo(() => catsOf(data.products), [data.products]);
  const c = config.contact;
  const show = c.show ?? {};
  const rows = {
    whatsapp: c.whatsapp && show.whatsapp !== false ? c.whatsapp : '',
    phone: c.phone && show.phone !== false ? c.phone : '',
    email: c.email && show.email === true ? c.email : '',
    instagram: config.social.instagram,
  };
  const features: { icon: string; title: string; sub: string }[] = [];
  if (extras.delivery) features.push({ icon: 'truck', title: extras.delivery, sub: data.shop.city ? `Ships from ${data.shop.city}` : 'Packed with care' });
  if (extras.payments?.online || extras.payments?.upi) features.push({ icon: 'shield', title: extras.payments.online ? 'UPI, cards and netbanking' : 'Pay by UPI', sub: 'Safe and quick' });
  if (extras.cod) features.push({ icon: 'rotate', title: 'Cash on delivery', sub: 'Pay when it arrives' });
  if (rows.whatsapp) features.push({ icon: 'whatsapp', title: 'Ask on WhatsApp', sub: 'Chat with the seller' });
  const story = config.story.text || config.about.text;
  const reviews = data.reviews || [];
  const available: Record<StdSection, boolean> = {
    feat: features.length > 0, cats: cats.length >= 2, best: (data.bestsellerIds || []).some((id) => data.products.some((p) => p.id === id)), fresh: data.products.length >= 5,
    promo: Boolean(config.promo?.title), products: true, services: false, story: Boolean(story), reviews: reviews.length > 0, faq: config.faqs.length > 0,
    cta: Boolean(rows.whatsapp || rows.phone || rows.email || rows.instagram || c.address || c.hours),
  };
  const shown = layout.order.filter((id) => !layout.hidden.includes(id) && available[id]);
  const navFor: Partial<Record<StdSection, [string, string]>> = {
    best: ['Bestsellers', '#sx-best'], fresh: ['New in', '#sx-fresh'], products: ['Shop', '#sx-products'], story: ['Our story', '#sx-story'], reviews: ['Reviews', '#sx-reviews'], faq: ['Help', '#sx-faq'], cta: ['Contact', '#sx-contact'],
  };
  const nav = shown.map((id) => navFor[id]).filter(Boolean) as [string, string][];
  const ctaTarget = shown.includes('products') ? 'sx-products' : 'sx-top';
  const body: Record<StdSection, ReactNode> = {
    feat: <Features key="feat" items={features} />,
    cats: <Categories key="cats" cats={cats} />,
    best: <Shelf key="best" id="sx-best" kicker="Most loved" title="Bestsellers" sub="What buyers keep coming back for." ctx={ctx} items={(data.bestsellerIds || []).map((id) => data.products.find((p) => p.id === id)).filter(Boolean) as StoreItem[]} />,
    fresh: <Shelf key="fresh" id="sx-fresh" kicker="Just in" title="New arrivals" ctx={ctx} items={[...data.products].reverse().slice(0, 8)} />,
    promo: <Promo key="promo" ctx={ctx} />,
    products: <Listing key="products" ctx={ctx} cats={cats} />,
    services: null,
    story: <Story key="story" ctx={ctx} text={story} />,
    reviews: <Testimonials key="reviews" ctx={ctx} />,
    faq: <Faq key="faq" ctx={ctx} />,
    cta: <Contact key="cta" ctx={ctx} rows={rows} />,
  };
  const frame: CSSProperties = { ...physVars(config), ...(ctx.preview ? { minHeight: '100vh' } : {}) };
  return (
    <div className="pf" data-dev={mob ? 'mobile' : tab ? 'tablet' : 'desktop'} style={frame}>
      <PhysHeader ctx={ctx} nav={nav} />
      <main>
        <Hero ctx={ctx} ctaTarget={ctaTarget} whatsapp={rows.whatsapp} />
        {shown.map((id) => body[id])}
      </main>
      <PhysFooter ctx={ctx} nav={nav} rows={{ whatsapp: rows.whatsapp, instagram: rows.instagram }} />
      {children}
    </div>
  );
}
