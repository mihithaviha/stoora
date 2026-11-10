'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { StoreCtx } from './Templates';
import { AwningSvg, I, cx, rupees } from './sx';
import { layoutOf, type StdSection, type StoreItem } from '@/lib/storefront/shared';
import '../../styles/standard-store.css';

/* ---------- small helpers ---------- */

const isService = (item: StoreItem) => Boolean(item.type);
const soldOut = (item: StoreItem) => !isService(item) && item.stock != null && item.stock <= 0;
const optionsOf = (item: StoreItem) => [...new Set(String(item.sizes || '').split(',').map((part) => part.trim()).filter(Boolean))];
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const initial = (name?: string) => (name || '?').trim()[0]?.toUpperCase() || '?';
const isDark = (hex: string) => { const n = parseInt(hex.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 140; };

/** The last one or two words of a headline get the Stoora gradient. */
export function Headline({ text }: { text: string }) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const k = Math.min(2, Math.max(1, words.length - 1));
  const head = words.slice(0, words.length - k).join(' ');
  return <>{head ? head + ' ' : ''}<em className={cx('g')}>{words.slice(words.length - k).join(' ')}</em></>;
}

/** A photo that falls back to a soft block with a letter if it is missing or cannot load. */
function Photo({ src, alt = '', pos, className = '', letter, art, eager = false }: { src?: string; alt?: string; pos?: string; className?: string; letter?: string; art?: StoreItem['art']; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    if (art) return <span className={cx('ph-fill')} aria-hidden="true" style={{ background: art.hex, color: isDark(art.hex) ? '#fff' : '#171C3C' }}><span className="ms" style={{ fontSize: 'clamp(36px,30%,72px)', width: '1em' }}>{art.icon}</span></span>;
    return letter ? <span className={cx('ph-fill')} aria-hidden="true">{letter}</span> : null;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={className} src={src} alt={alt} {...(eager ? { fetchPriority: 'high' as const } : { loading: 'lazy' as const })} decoding="async" style={pos ? { objectPosition: pos } : undefined} onError={() => setFailed(true)} />
  );
}

/** Which section ids the page has, so the header links only to what is there. */
function useSections(ctx: StoreCtx) {
  const { config, data, extras = {} } = ctx;
  const layout = layoutOf(config);
  const hasProducts = data.products.length > 0;
  const hasServices = data.services.length > 0;
  const story = config.story.text || config.about.text;
  const c = config.contact;
  const show = c.show ?? {};
  const contactRows = {
    whatsapp: c.whatsapp && show.whatsapp !== false ? c.whatsapp : '',
    phone: c.phone && show.phone !== false ? c.phone : '',
    email: c.email && show.email === true ? c.email : '',
    instagram: config.social.instagram,
  };
  const cats = useMemo(() => {
    const groups: Record<string, { name: string; count: number; image: string }> = {};
    for (const item of data.products) if (item.cat) { const g = (groups[item.cat] = groups[item.cat] || { name: item.cat, count: 0, image: '' }); g.count += 1; if (!g.image && item.img) g.image = item.img; }
    return Object.values(groups);
  }, [data.products]);
  const features: { icon: string; title: string; sub: string }[] = [];
  if (extras.delivery) features.push({ icon: 'local_shipping', title: extras.delivery, sub: data.shop.city ? `Ships from ${data.shop.city}` : 'Packed with care' });
  if (extras.payments?.online || extras.payments?.upi) features.push({ icon: 'payments', title: extras.payments.online ? 'UPI, cards and netbanking' : 'Pay by UPI', sub: 'Safe and quick' });
  if (extras.cod) features.push({ icon: 'undo', title: 'Cash on delivery', sub: 'Pay when it arrives' });
  if (contactRows.whatsapp) features.push({ icon: 'chat', title: 'Ask on WhatsApp', sub: 'Chat with the seller' });
  const reviews = data.reviews || [];
  const available: Record<StdSection, boolean> = {
    feat: features.length > 0,
    cats: cats.some((x) => x.image) && hasProducts,
    products: true,
    services: hasServices,
    story: Boolean(story),
    reviews: reviews.length > 0,
    faq: config.faqs.length > 0,
    cta: Boolean(contactRows.whatsapp || contactRows.phone || contactRows.email || contactRows.instagram || c.address || c.hours),
  };
  const shown = layout.order.filter((id) => !layout.hidden.includes(id) && available[id]);
  return { layout, shown, features, cats, contactRows, story, hasProducts, hasServices, reviews };
}

/* ---------- header, footer ---------- */

/** The shop's header: announcement bar, logo, links, bag. `nav` entries are [label, link]; `home` is where the logo goes. */
export function StdHeader({ ctx, nav, whatsapp, home = '#sx-top' }: { ctx: StoreCtx; nav: [string, string][]; whatsapp: string; home?: string }) {
  const { config, data, base, actions } = ctx;
  const name = config.brand.name || data.shop.name;
  const [menu, setMenu] = useState(false);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const f = () => setStuck(window.scrollY > 8);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  const count = ctx.cartCount ?? 0;
  const mark = config.brand.logo
    ? <span className={cx('av')}><Photo src={config.brand.logo} className="" eager /></span>
    : <span className={cx('av mono')} aria-hidden="true">{initial(name)}</span>;
  const go = (e: React.MouseEvent) => { if (ctx.preview) e.preventDefault(); };
  return (
    <>
      {ctx.extras?.announce?.length ? (
        <div className={cx('ann')} role="status"><div className={cx('track')}>
          {ctx.extras.announce.map((a) => <span key={a}><I n="auto_awesome" />{a}</span>)}
          <span className={cx('dup')} aria-hidden="true">{ctx.extras.announce.map((a) => <span key={a}><I n="auto_awesome" />{a}</span>)}</span>
        </div></div>
      ) : null}
      <header className={`${cx('hdr')}${stuck ? ' ' + cx('stuck') : ''}`} id="sx-top">
        <div className={cx('wrap')}>
          <a className={cx('logo')} href={home} onClick={go}>{mark}<b>{name}</b></a>
          <nav className={cx('nav')} aria-label="Shop">{nav.map(([label, href]) => <a key={href} href={href} onClick={go}>{label}</a>)}</nav>
          <div className={cx('acts')}>
            {whatsapp ? <a className={cx('btn btn-ghost btn-sm wa')} href={`https://wa.me/91${whatsapp}`} target="_blank" rel="noopener noreferrer"><I n="chat" c="s" />Chat with us</a> : null}
            {ctx.wish && base ? <Link className={cx('ibtn hide-s')} href={`${base}/wishlist`} aria-label={`Saved items, ${ctx.wish.length}`}><I n="favorite" /></Link> : null}
            <button className={cx('ibtn')} type="button" aria-label={`Open your bag, ${count} ${count === 1 ? 'item' : 'items'}`} onClick={() => actions?.cart?.()}>
              <I n="shopping_bag" /><span className={`${cx('cartn')}${count > 0 ? ' ' + cx('on') : ''}`}>{count}</span>
            </button>
            <button className={cx('ibtn mnav')} type="button" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu(!menu)}><I n={menu ? 'close' : 'menu'} /></button>
          </div>
        </div>
      </header>
      {menu ? <div className={cx('mm')}>{nav.map(([label, href]) => <a key={href} href={href} onClick={(e) => { go(e); setMenu(false); }}>{label}<I n="arrow_forward" c="s" /></a>)}</div> : null}
    </>
  );
}

/** The shop's footer. */
export function StdFooter({ ctx, nav, rows }: { ctx: StoreCtx; nav: [string, string][]; rows: { whatsapp: string; instagram: string } }) {
  const { config, data, extras = {} } = ctx;
  const name = config.brand.name || data.shop.name;
  const tag = config.brand.tagline || config.footer.note;
  return (
    <footer className={cx('foot')}><div className={cx('wrap')}>
      <div className={cx('cols')}>
        <div>
          <div className={cx('logo')} style={{ margin: '0 0 16px' }}><span className={cx('av mono')} aria-hidden="true">{initial(name)}</span><b>{name}</b></div>
          {tag ? <p style={{ margin: 0, maxWidth: '34ch', fontSize: 15 }}>{tag}</p> : null}
          <div className={cx('chips')} style={{ marginTop: 16 }}>
            {(extras.payments?.upi || extras.payments?.online) ? <span className={cx('pay')}><I n="qr_code_2" c="s" />UPI</span> : null}
            {extras.payments?.online ? <span className={cx('pay')}><I n="credit_card" c="s" />Cards</span> : null}
            {extras.cod ? <span className={cx('pay')}><I n="payments" c="s" />COD</span> : null}
          </div>
          {config.footer.note && tag !== config.footer.note ? <p style={{ margin: '16px 0 0', fontSize: 13 }}>{config.footer.note}</p> : null}
        </div>
        <div><h4>Shop</h4>{nav.map(([label, href]) => <a key={href} href={href} onClick={(e) => ctx.preview && e.preventDefault()}>{label}</a>)}{!nav.length ? <a href="#sx-top">Home</a> : null}</div>
        <div><h4>Help</h4>
          <button type="button" className={cx('linkbtn')} onClick={() => ctx.actions?.track?.()}>Where is my order?</button>
          <Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div>
        <div><h4>Follow</h4>
          {rows.instagram ? <a href={`https://instagram.com/${rows.instagram}`} target="_blank" rel="noopener noreferrer">Instagram</a> : null}
          {rows.whatsapp ? <a href={`https://wa.me/91${rows.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp</a> : null}
          {!rows.instagram && !rows.whatsapp ? <a href="#sx-top">Back to top</a> : null}</div>
      </div>
      <div className={cx('base')}><span>© {new Date().getFullYear()} {name}{data.shop.city ? `, ${data.shop.city}` : ''}</span><span className={cx('row')} style={{ gap: 6 }}>Built on <span className={cx('wm')} style={{ fontSize: 16 }}>stoora<em>.in</em></span></span></div>
    </div></footer>
  );
}

/* ---------- sections ---------- */

function SectionHead({ eyebrow, title, sub, right }: { eyebrow: string; title: string; sub?: string; right?: ReactNode }) {
  return <div className={cx('shead')}><div><span className={cx('eyebrow')}>{eyebrow}</span><h2 className={cx('h-sec')}>{title}</h2>{sub ? <p className={cx('lead')} style={{ fontSize: 16, marginTop: 10 }}>{sub}</p> : null}</div>{right}</div>;
}

function ProductCard({ item, ctx, i }: { item: StoreItem; ctx: StoreCtx; i: number }) {
  const { actions, base } = ctx;
  const [added, setAdded] = useState(false);
  const out = soldOut(item);
  const sized = optionsOf(item).length > 0;
  const off = item.was && item.was > item.price ? Math.round((1 - item.price / item.was) * 100) : 0;
  const best = (ctx.data.bestsellerIds || []).includes(item.id);
  const low = !out && item.stock != null && item.stock <= 3;
  const tag = out ? 'Sold out' : low ? `Only ${item.stock} left` : best ? 'Bestseller' : off ? `${off}% off` : '';
  const wished = ctx.wish?.includes(item.id);
  const href = base && !ctx.preview ? `${base}/p/${item.id}` : '';
  const quickAdd = () => {
    if (sized) { actions?.view?.(item.id); return; }
    actions?.add?.(item.id, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };
  return (
    <article className={cx('pc')} style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
      <div className={cx('m')}>
        {href ? <Link className={cx('lk')} href={href} aria-label={item.name} /> : null}
        <Photo src={item.img} alt={item.name} pos={item.crop?.pos} letter={initial(item.name)} art={item.art} />
        {tag ? <span className={`${cx('bd tag')} ${cx(out ? '' : low ? 'hot' : best ? 'ok' : 'hot')}`} style={{ background: '#fff' }}>{tag}</span> : null}
        {ctx.wish ? <button className={cx('wl')} type="button" aria-pressed={Boolean(wished)} aria-label={`${wished ? 'Remove' : 'Save'} ${item.name} ${wished ? 'from' : 'to'} your saved items`} onClick={() => actions?.wish?.(item.id)}><I n="favorite" c="s" /></button> : null}
        {!out && !ctx.paused ? <button className={`${cx('qa')}${added ? ' ' + cx('done') : ''}`} type="button" onClick={quickAdd}><I n={added ? 'check' : 'add'} c="s" /><span className={cx('t')}>{added ? 'Added' : sized ? 'Choose size' : 'Quick add'}</span></button> : null}
      </div>
      <div>
        <div className={cx('pr')}>{href ? <Link className={cx('nm')} href={href}>{item.name}</Link> : <span className={cx('nm')}>{item.name}</span>}</div>
        {item.cat ? <div className={cx('sub')}>{item.cat}</div> : null}
      </div>
      <div className={cx('pr')}>
        <span><span className={cx('num')}>{rupees(item.price)}</span>{off ? <s aria-label={`was ${rupees(item.was!)}`}>{rupees(item.was!)}</s> : null}</span>
        {ctx.data.ratings?.[item.id] ? <span className={cx('rt')}><I n="star" />{ctx.data.ratings[item.id].average.toFixed(1)}</span> : null}
      </div>
    </article>
  );
}

function Products({ ctx, cats }: { ctx: StoreCtx; cats: { name: string }[] }) {
  const { config, data } = ctx;
  const [cat, setCat] = useState('');
  const [term, setTerm] = useState('');
  const list = useMemo(() => {
    const first = new Set(config.featuredIds);
    const all = [...data.products.filter((p) => first.has(p.id)), ...data.products.filter((p) => !first.has(p.id))];
    const t = term.trim().toLowerCase();
    return all.filter((p) => (!cat || p.cat === cat) && (!t || `${p.name} ${p.cat || ''} ${p.tags || ''}`.toLowerCase().includes(t)));
  }, [data.products, config.featuredIds, cat, term]);
  // tiles in the categories section pick a filter through the address hash
  useEffect(() => {
    const read = () => { const m = /^#sx-cat-(.+)$/.exec(window.location.hash); if (m) setCat(decodeURIComponent(m[1])); };
    read();
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setTerm(q);
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  return (
    <section className={cx('sec')} id="sx-products"><div className={cx('wrap')}>
      <SectionHead eyebrow="Shop" title={cats.length ? 'Shop the collection' : 'Our products'} sub={data.products.length ? `${plural(data.products.length, 'piece')} in the shop` : undefined} />
      {data.products.length ? (
        <>
          {data.products.length > 4 ? (
            <label className={cx('psearch')}><I n="search" /><span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Search products</span><input type="search" placeholder="Search this shop" value={term} onChange={(e) => setTerm(e.target.value)} autoComplete="off" /></label>
          ) : null}
          {cats.length > 0 ? (
            <div className={cx('filters')} role="group" aria-label="Filter by category">
              {['', ...cats.map((c) => c.name)].map((name) => <button key={name || 'all'} className={cx('chip')} type="button" aria-pressed={cat === name} onClick={() => setCat(name)}>{name || 'All'}</button>)}
            </div>
          ) : null}
          {list.length ? <div className={cx('pgrid')} style={{ marginTop: 26 }}>{list.map((item, i) => <ProductCard key={item.id} item={item} ctx={ctx} i={i} />)}</div>
            : <div className={cx('empty')} role="status"><h3>Nothing matches that</h3><p style={{ margin: 0 }}>Try a different word, or look at everything in the shop.</p><button className={cx('btn btn-ink')} type="button" onClick={() => { setTerm(''); setCat(''); }}>Show all products</button></div>}
        </>
      ) : (
        <div className={cx('empty')}><h3>Coming soon</h3><p style={{ margin: 0, maxWidth: '34ch' }}>{ctx.preview && !ctx.sample ? 'You have no products showing yet. Add one in your dashboard and it appears here.' : 'New products will appear here soon.'}</p></div>
      )}
    </div></section>
  );
}

function Services({ ctx }: { ctx: StoreCtx }) {
  const { data } = ctx;
  return (
    <section className={cx('sec sec-grey')} id="sx-services"><div className={cx('wrap')}>
      <SectionHead eyebrow="Book" title="Classes and sessions" sub="Choose one and message the seller to confirm a time" />
      <div className={`${cx('progs')}${data.services.length === 2 ? ' ' + cx('two') : ''}`}>
        {data.services.map((s) => (
          <article className={cx('prog')} key={s.id}><div className={cx('b')}>
            <div className={cx('meta')}>{s.type ? <span><I n="play_circle" c="s" />{s.type}</span> : null}{s.duration ? <span><I n="schedule" c="s" />{s.duration}</span> : null}</div>
            <h3>{s.name}</h3>
            {s.next || s.where ? <p>{[s.next, s.where].filter(Boolean).join(' · ')}</p> : null}
            <div className={cx('ft')}><span><span className={cx('num')} style={{ fontSize: 26 }}>{rupees(s.price)}</span></span>
              {!ctx.paused ? <button className={cx('btn btn-ink btn-sm')} type="button" onClick={() => ctx.actions?.book?.(s.id)}>Book</button> : null}</div>
          </div></article>
        ))}
      </div>
    </div></section>
  );
}

function Story({ ctx, text }: { ctx: StoreCtx; text: string }) {
  const { config, data } = ctx;
  const title = config.story.text ? config.story.title : config.about.title;
  const paras = text.split(/\n{2,}/).filter(Boolean);
  const stats: [string, string][] = [];
  if (data.products.length) stats.push([String(data.products.length), data.products.length === 1 ? 'Product' : 'Products']);
  if (data.reviewSummary?.count) stats.push([data.reviewSummary.average.toFixed(1), 'Average rating']);
  if (data.shop.city) stats.push([data.shop.city, 'Based in']);
  const image = config.about.image || '';
  return (
    <section className={cx('sec sec-ink')} id="sx-story"><div className={cx('wrap')}>
      <div className={`${cx('story')}${image ? '' : ' ' + cx('solo')}`}>
        {image ? <div className={cx('ph')}><Photo src={image} alt={title} />{data.shop.city ? <span className={cx('tag')}><I n="location_on" c="s" />{data.shop.city}</span> : null}</div> : null}
        <div>
          <span className={cx('eyebrow')}>Our story</span><h2 className={cx('h-sec')}>{title}</h2>
          {paras.map((p, i) => <p key={i}>{p}</p>)}
          {stats.length ? <div className={cx('stats')}>{stats.slice(0, 3).map(([v, l]) => <div key={l}><b>{v}</b><span>{l}</span></div>)}</div> : null}
        </div>
      </div>
    </div></section>
  );
}

function Reviews({ ctx }: { ctx: StoreCtx }) {
  const list = ctx.data.reviews || [];
  const summary = ctx.data.reviewSummary?.count ? ctx.data.reviewSummary : { count: list.length, average: list.reduce((a, r) => a + r.rating, 0) / Math.max(1, list.length) };
  const bars = [5, 4, 3, 2, 1].map((n) => [n, Math.round((list.filter((r) => Math.round(r.rating) === n).length / Math.max(1, list.length)) * 100)] as const);
  const stars = (n: number) => <span className={cx('stars')}>{Array.from({ length: Math.round(n) }, (_, i) => <I key={i} n="star" />)}</span>;
  return (
    <section className={cx('sec')} id="sx-reviews"><div className={cx('wrap')}>
      <SectionHead eyebrow="Reviews" title={`Loved by ${plural(summary.count, 'buyer')}`} sub="What people who bought here say" />
      <div className={cx('revs')}>
        <div className={cx('sumc')}>
          <div className={cx('row')} style={{ alignItems: 'flex-end', gap: 12 }}><span className={cx('big')}>{summary.average.toFixed(1)}</span><div style={{ paddingBottom: 8 }}>{stars(summary.average)}<div className={cx('t-cap')}>{plural(summary.count, 'review')}</div></div></div>
          <div className={cx('bars')}>{bars.map(([n, pct]) => <div key={n}><span>{n}</span><div className={cx('bar')}><i style={{ width: `${pct}%` }} /></div><span>{pct}%</span></div>)}</div>
        </div>
        {list.slice(0, 3).map((r, i) => (
          <div className={cx('rev')} key={i}>{stars(r.rating)}<p>{r.comment}</p>
            <div className={cx('by')}><span className={cx('av2')}>{r.who.split(' ').map((x) => x[0]).join('').slice(0, 2)}</span><div><b>{r.who}</b></div></div></div>
        ))}
      </div>
    </div></section>
  );
}

function Faq({ ctx }: { ctx: StoreCtx }) {
  const [open, setOpen] = useState(0);
  return (
    <section className={cx('sec')} id="sx-faq"><div className={cx('wrap')}><div className={cx('faqwrap')}>
      <div><span className={cx('eyebrow')}>Help</span><h2 className={cx('h-sec')}>Before you order</h2><p className={cx('lead')} style={{ fontSize: 16 }}>Anything else, just ask the seller.</p></div>
      <div className={cx('faq')}>
        {ctx.config.faqs.map((f, i) => (
          <div className={cx('q')} key={i} data-open={open === i}>
            <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>{f.q}<I n="add" /></button>
            <div className={cx('a')}><div><p>{f.a}</p></div></div>
          </div>
        ))}
      </div>
    </div></div></section>
  );
}

function GetInTouch({ ctx, rows }: { ctx: StoreCtx; rows: { whatsapp: string; phone: string; email: string; instagram: string } }) {
  const c = ctx.config.contact;
  const name = ctx.config.brand.name || ctx.data.shop.name;
  return (
    <section className={cx('sec')} id="sx-contact" style={{ paddingTop: 0 }}><div className={cx('wrap')}><div className={cx('ctab')}>
      <div>
        <span className={cx('eyebrow')}>Questions</span><h2 className={cx('h-sec')}>Sawaal? <em className={cx('g')}>Jawaab.</em></h2>
        <p className={cx('lead')} style={{ fontSize: 16 }}>Ask {name} about sizes, colours or delivery.</p>
        <div className={cx('cta')} style={{ display: 'flex', gap: 10, marginTop: 26, flexWrap: 'wrap' }}>
          {rows.whatsapp ? <a className={cx('btn btn-go')} href={`https://wa.me/91${rows.whatsapp}`} target="_blank" rel="noopener noreferrer"><I n="chat" c="s" />Chat on WhatsApp</a> : null}
          {rows.phone ? <a className={cx('btn btn-ghost')} href={`tel:+91${rows.phone}`}><I n="call" c="s" />Call {rows.phone}</a> : null}
          {rows.email ? <a className={cx('btn btn-ghost')} href={`mailto:${rows.email}`}>{rows.email}</a> : null}
          {rows.instagram ? <a className={cx('btn btn-ghost')} href={`https://instagram.com/${rows.instagram}`} target="_blank" rel="noopener noreferrer">Instagram</a> : null}
        </div>
      </div>
      {c.address || c.hours ? (
        <div className={cx('visit')}>
          {c.address ? <div><span className={cx('t-cap')}>Visit</span><p>{c.address}</p></div> : null}
          {c.hours ? <div><span className={cx('t-cap')}>Open</span><p>{c.hours}</p></div> : null}
        </div>
      ) : null}
    </div></div></section>
  );
}

function Features({ items }: { items: { icon: string; title: string; sub: string }[] }) {
  return <section className={cx('feat')} id="sx-feat"><div className={cx('wrap')}>{items.map((f) => <div className={cx('it')} key={f.title}><span className={cx('ic')}><I n={f.icon} /></span><div><b>{f.title}</b><small>{f.sub}</small></div></div>)}</div></section>;
}

function Categories({ cats }: { cats: { name: string; image: string; count: number }[] }) {
  return (
    <section className={cx('sec')} id="sx-cats"><div className={cx('wrap')}>
      <SectionHead eyebrow="Browse" title="Shop by category" right={<a className={cx('btn btn-ghost btn-sm')} href="#sx-products">View all<I n="arrow_forward" c="s" /></a>} />
      <div className={cx('tiles')}>
        {cats.filter((c) => c.image).slice(0, 4).map((c) => (
          <a className={cx('tile')} key={c.name} href={`#sx-cat-${encodeURIComponent(c.name)}`} onClick={(e) => { e.preventDefault(); window.history.replaceState(null, '', `#sx-cat-${encodeURIComponent(c.name)}`); window.dispatchEvent(new HashChangeEvent('hashchange')); document.getElementById('sx-products')?.scrollIntoView({ behavior: 'smooth' }); }}>
            <Photo src={c.image} alt="" /><div className={cx('lb')}><b>{c.name}</b><span><I n="arrow_forward" c="s" /></span></div>
          </a>
        ))}
      </div>
    </div></section>
  );
}

/* ---------- the shopfront hero ---------- */

function Hero({ ctx, hasProducts, ctaTarget, whatsapp }: { ctx: StoreCtx; hasProducts: boolean; ctaTarget: string; whatsapp: string }) {
  const { config, data } = ctx;
  const layout = layoutOf(config);
  const name = config.brand.name || data.shop.name;
  const first = data.products.find((p) => p.img);
  const image = config.hero.image || first?.img || '';
  const title = config.hero.title || (config.brand.tagline ? config.brand.tagline : name);
  const lead = config.hero.subtitle || (config.hero.title ? config.brand.tagline : '') || '';
  const awn = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(520);
  useEffect(() => {
    const el = awn.current;
    if (!el) return;
    const draw = () => { const w = Math.round(el.clientWidth); if (w) setWidth(w); };
    draw();
    if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', draw); return () => window.removeEventListener('resize', draw); }
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const board = data.shop.city || config.brand.tagline || '';
  const reviewed = data.reviewSummary && data.reviewSummary.count > 0 ? data.reviewSummary : null;
  const floatItem = first;
  return (
    <section className={cx('hero')}><div className={`${cx('wrap')} ${cx('grid')}`}>
      <div className={cx('sf')}>
        <div className={cx('sf-board')}><b>{name}</b>{board ? <span>{board}</span> : null}</div>
        <div className={cx('sf-awn')} ref={awn}><AwningSvg width={width} colors={layout.awning} /></div>
        <div className={cx('sf-win')}><Photo src={image} alt="" pos={config.hero.focus} letter={initial(name)} eager /></div>
        {floatItem ? <div className={`${cx('float')} ${cx('show')}`} style={{ left: -26, bottom: 42 }}><Photo src={floatItem.img} alt="" art={floatItem.art} /><div><b>{floatItem.name}</b><small>{rupees(floatItem.price)}</small></div></div> : null}
        {reviewed ? <div className={`${cx('float b show')}`} style={{ right: -18, top: 150 }}><I n="star" c="l" /><div><b>{reviewed.average.toFixed(1)} rating</b><small>{plural(reviewed.count, 'review')}</small></div></div> : null}
      </div>
      <div className={cx('copy')}>
        {data.shop.city || config.brand.tagline ? <span className={cx('eyebrow')}>{config.brand.tagline && config.hero.title ? config.brand.tagline : data.shop.city}</span> : null}
        <h1 className={cx('h-hero')}><Headline text={title} /></h1>
        {lead ? <p className={cx('lead')}>{lead}</p> : null}
        <div className={cx('cta')}>
          <a className={cx('btn btn-go')} href={`#${ctaTarget}`} onClick={(e) => ctx.preview && e.preventDefault()}>{config.hero.cta || 'Shop now'}<I n="arrow_forward" c="s" /></a>
          {whatsapp ? <a className={cx('btn btn-ghost')} href={`https://wa.me/91${whatsapp}`} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a> : null}
        </div>
        {hasProducts || reviewed ? (
          <div className={cx('proof')}><p>{reviewed ? <><b>{reviewed.average.toFixed(1)}</b> from {plural(reviewed.count, 'review')}<br /></> : null}{hasProducts ? <>{plural(data.products.length, 'piece')} in the shop</> : null}</p></div>
        ) : null}
      </div>
    </div></section>
  );
}

/* ---------- the page ---------- */

/**
 * The Standard storefront: a painted shopfront, the sections a small shop needs, and nothing invented.
 * Every line comes from the seller's own details; a section with nothing to show is left out.
 * The same component draws the live shop, the editor preview and the labelled sample.
 */
export function StandardStore({ ctx, children }: { ctx: StoreCtx; children?: ReactNode }) {
  const s = useSections(ctx);
  const navFor: Record<StdSection, [string, string]> = {
    feat: ['Highlights', '#sx-feat'], cats: ['Categories', '#sx-cats'], products: ['Shop', '#sx-products'], services: ['Sessions', '#sx-services'],
    story: ['Our story', '#sx-story'], reviews: ['Reviews', '#sx-reviews'], faq: ['Help', '#sx-faq'], cta: ['Contact', '#sx-contact'],
  };
  const nav = s.shown.filter((id) => id !== 'feat').map((id) => navFor[id]);
  const wa = s.contactRows.whatsapp;
  const productsShown = s.shown.includes('products');
  const ctaTarget = productsShown ? 'sx-products' : s.shown.includes('services') ? 'sx-services' : 'sx-top';
  const body: Record<StdSection, ReactNode> = {
    feat: <Features key="feat" items={s.features} />,
    cats: <Categories key="cats" cats={s.cats} />,
    products: <Products key="products" ctx={ctx} cats={s.cats} />,
    services: <Services key="services" ctx={ctx} />,
    story: <Story key="story" ctx={ctx} text={s.story} />,
    reviews: <Reviews key="reviews" ctx={ctx} />,
    faq: <Faq key="faq" ctx={ctx} />,
    cta: <GetInTouch key="cta" ctx={ctx} rows={s.contactRows} />,
  };
  const frame: CSSProperties = ctx.preview ? { minHeight: '100vh' } : {};
  return (
    <div className="sx" style={frame}>
      <StdHeader ctx={ctx} nav={nav} whatsapp={wa} />
      <main>
        <Hero ctx={ctx} hasProducts={s.hasProducts} ctaTarget={ctaTarget} whatsapp={wa} />
        {s.shown.map((id) => body[id])}
      </main>
      <StdFooter ctx={ctx} nav={nav} rows={{ whatsapp: wa, instagram: s.contactRows.instagram }} />
      {children}
    </div>
  );
}
