'use client';
import { Fragment, useMemo, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { templateById, themeVariables, type StoreConfig, type StoreData, type StoreItem, type TemplateId } from '@/lib/storefront/shared';

/** What a shop page can plug in. A preview passes none of these, so its buttons do nothing. */
export interface StoreActions {
  add?: (id: string, delta: number) => void;
  view?: (id: string) => void;
  book?: (id: string) => void;
  wish?: (id: string) => void;
  track?: () => void;
}

export interface StoreExtras {
  payments?: { online?: boolean; upi?: boolean };
  policies?: { refund?: string; shipping?: string; privacy?: string; terms?: string };
  gstin?: string;
  pricesIncludeGst?: boolean;
}

export interface StoreCtx {
  config: StoreConfig;
  data: StoreData;
  cart?: Record<string, number>;
  extras?: StoreExtras;
  /** An editor or gallery preview (not the live shop). */
  preview?: boolean;
  /** The content is the labelled sample, not the seller's own. */
  sample?: boolean;
  /** Saved items of the person looking, when the shop supports them (previews have no hearts). */
  wish?: string[] | null;
  actions?: StoreActions;
}

type Ui = { term: string; category: string; setCategory: (c: string) => void };
type P = { ctx: StoreCtx & { template: TemplateId }; ui: Ui };

/* ---------- small helpers ---------- */

const rupees = (n: number) => '₹' + Number(n).toLocaleString('en-IN');
const stars = (rating: number) => '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
const initial = (name?: string) => (name || '?').trim()[0]?.toUpperCase() || '?';
const isService = (item: StoreItem) => Boolean(item.type);
const soldOut = (item: StoreItem) => !isService(item) && item.stock != null && item.stock <= 0;
/** The sizes a product comes in (a comma list the seller types in Products). */
const optionsOf = (item: StoreItem) => [...new Set(String(item.sizes || '').split(',').map((part) => part.trim()).filter(Boolean))];
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

function Paragraphs({ text }: { text: string }) {
  return <>{String(text || '').split(/\n{2,}/).map((p, i) => <p key={i}>{p.split('\n').map((line, j, all) => <span key={j}>{line}{j < all.length - 1 ? <br /> : null}</span>)}</p>)}</>;
}

/** An image. `focus` is the point that stays in view when it is cropped (for example a face). If it fails to load, a letter stands in. */
function Img({ src, alt = '', eager = false, focus = '', zoom = 1, fallback = true }: { src: string; alt?: string; eager?: boolean; focus?: string; zoom?: number; fallback?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return fallback ? <span className="sf-initial" aria-hidden="true">·</span> : null;
  const style: CSSProperties = {};
  if (focus) style.objectPosition = focus;
  if (zoom > 1) { style.transform = `scale(${zoom})`; style.transformOrigin = focus || '50% 50%'; }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...(eager ? { fetchPriority: 'high' as const } : { loading: 'lazy' as const })} decoding="async" style={Object.keys(style).length ? style : undefined} onError={() => setFailed(true)} />
  );
}

function Heart({ item, ctx }: { item: StoreItem; ctx: P['ctx'] }) {
  if (!ctx.wish || isService(item)) return null;
  const on = ctx.wish.includes(item.id);
  return (
    <button className={`sf-heart${on ? ' on' : ''}`} type="button" aria-pressed={on} aria-label={`${on ? 'Remove' : 'Save'} ${item.name} ${on ? 'from' : 'to'} your saved items`} onClick={() => ctx.actions?.wish?.(item.id)}>
      {on ? '♥' : '♡'}
    </button>
  );
}

/** A product or service photo, or a designed placeholder with its first letter. */
function Photo({ item, ctx, className = '' }: { item: StoreItem; ctx: P['ctx']; className?: string }) {
  const open = isService(item) ? undefined : () => ctx.actions?.view?.(item.id);
  return (
    <div className={`sf-photo ${className}`.trim()} onClick={open} style={open && ctx.actions?.view ? { cursor: 'pointer' } : undefined}>
      {item.img ? <Img src={item.img} alt={item.name} focus={item.crop?.pos} zoom={item.crop?.zoom} /> : <span className="sf-initial" aria-hidden="true">{initial(item.name)}</span>}
      <Heart item={item} ctx={ctx} />
    </div>
  );
}

function Availability({ item }: { item: StoreItem }) {
  if (isService(item)) return null;
  if (soldOut(item)) return <span className="sf-stock out">Sold out</span>;
  if (item.stock != null && item.stock <= 3) return <span className="sf-stock low">Only {item.stock} left</span>;
  return <span className="sf-stock in">In stock</span>;
}

function RatingLine({ item, ctx }: { item: StoreItem; ctx: P['ctx'] }) {
  const rating = ctx.data.ratings?.[item.id];
  if (!rating) return null;
  return <span className="sf-stars" title={`${rating.average.toFixed(1)} out of 5`}>{stars(rating.average)} <small>({rating.count})</small></span>;
}

/** The Add / quantity control (products) or Book button (services). The shop page decides what the buttons do. */
function Action({ item, ctx }: { item: StoreItem; ctx: P['ctx'] }) {
  const a = ctx.actions;
  if (isService(item)) return <button className="sf-btn" type="button" onClick={() => a?.book?.(item.id)}>{ctx.config.hero.cta && ctx.template === 'services' ? ctx.config.hero.cta : 'Book now'}</button>;
  if (soldOut(item)) return null;
  // A product with sizes needs a choice first, so its button opens the product page.
  if (optionsOf(item).length) return <button className="sf-btn" type="button" onClick={() => a?.view?.(item.id)}>Choose size</button>;
  const quantity = ctx.cart?.[item.id] || 0;
  return quantity ? (
    <div className="sf-step" role="group" aria-label={`Quantity of ${item.name}`}>
      <button type="button" aria-label="One less" onClick={() => a?.add?.(item.id, -1)}>−</button><span>{quantity}</span><button type="button" aria-label="One more" onClick={() => a?.add?.(item.id, 1)}>+</button>
    </div>
  ) : <button className="sf-btn" type="button" onClick={() => a?.add?.(item.id, 1)}>Add to bag</button>;
}

/** Does this card pass the search box and the category filter? */
const matches = (item: StoreItem, ui: Ui) => (!ui.category || (item.cat || '') === ui.category) && (!ui.term || `${item.name} ${item.tags || ''}`.toLowerCase().includes(ui.term));

function Card({ item, ctx, ui, variant = '', filterable = false }: { item: StoreItem; ctx: P['ctx']; ui: Ui; variant?: string; filterable?: boolean }) {
  const detail = isService(item) ? [item.type, item.duration, item.where].filter(Boolean).join(' · ') : item.cat;
  return (
    <article className={`sf-card ${variant}`.trim()} hidden={filterable ? !matches(item, ui) : undefined}>
      <Photo item={item} ctx={ctx} />
      <div className="sf-card-body">
        <h3>{isService(item) ? item.name : <a className="sf-viewlink" href={`#product-${item.id}`} onClick={(e: MouseEvent) => { e.preventDefault(); ctx.actions?.view?.(item.id); }}>{item.name}</a>}</h3>
        {detail ? <p className="sf-sub">{detail}</p> : null}
        {variant === 'describe' && item.desc ? <p className="sf-desc">{item.desc.slice(0, 120)}</p> : null}
        <RatingLine item={item} ctx={ctx} />
        <p className="sf-price">{isService(item) ? 'From ' : ''}{rupees(item.price)}</p>
        <Availability item={item} />
        <Action item={item} ctx={ctx} />
      </div>
    </article>
  );
}

function Grid({ items, ctx, ui, variant = '', className = '', filterable = false }: { items: StoreItem[]; ctx: P['ctx']; ui: Ui; variant?: string; className?: string; filterable?: boolean }) {
  return <div className={`sf-grid ${className}`.trim()}>{items.map((item) => <Card key={item.id} item={item} ctx={ctx} ui={ui} variant={variant} filterable={filterable} />)}</div>;
}

/* ---------- pieces shared by the templates ---------- */

const brandName = (ctx: P['ctx']) => ctx.config.brand.name || ctx.data.shop.name;

function LogoOrName({ ctx }: P) {
  const { config, data } = ctx;
  return config.brand.logo
    ? <span className="sf-logo"><Img src={config.brand.logo} alt={config.brand.name || data.shop.name} eager fallback={false} /></span>
    : <span className="sf-wordmark">{config.brand.name || data.shop.name}</span>;
}

function collectionsOf(data: StoreData) {
  const groups: Record<string, StoreItem[]> = {};
  for (const item of data.products) if (item.cat) (groups[item.cat] = groups[item.cat] || []).push(item);
  return Object.entries(groups).map(([name, items]) => ({ name, count: items.length, image: items.find((i) => i.img)?.img || '' }));
}
const byIds = (ids: string[], items: StoreItem[]) => ids.map((id) => items.find((item) => item.id === id)).filter(Boolean) as StoreItem[];
const featuredOf = (ctx: P['ctx']) => byIds(ctx.config.featuredIds, ctx.data.products);
const bestsellersOf = (ctx: P['ctx']) => byIds(ctx.data.bestsellerIds || [], ctx.data.products).slice(0, 4);
const newestOf = (ctx: P['ctx']) => ctx.data.products.slice(0, 4);

function Reviews({ ctx, heading = 'What customers say' }: { ctx: P['ctx']; heading?: string }) {
  const list = ctx.data.reviews || [];
  if (!ctx.config.sections.reviews || !list.length) return null;
  return (
    <section className="sf-section" id="sf-reviews"><div className="sf-wrap"><h2 className="sf-h2">{heading}</h2>
      <div className="sf-reviews">{list.map((r, i) => <blockquote className="sf-review" key={i}><span className="sf-stars">{stars(r.rating)}</span><p>{r.comment}</p><footer>{r.who}</footer></blockquote>)}</div></div></section>
  );
}

function About({ ctx, split = true }: { ctx: P['ctx']; split?: boolean }) {
  const block = ctx.config.about;
  if (!ctx.config.sections.about || (!block.text && !block.image)) return null;
  return (
    <section className="sf-section" id="sf-about"><div className={`sf-wrap ${split && block.image ? 'sf-split' : ''}`.trim()}>
      {block.image ? <div className="sf-about-photo"><Img src={block.image} alt={block.title} /></div> : null}
      <div className="sf-about-text"><h2 className="sf-h2">{block.title}</h2><Paragraphs text={block.text} /></div></div></section>
  );
}

function Faqs({ ctx }: { ctx: P['ctx'] }) {
  if (!ctx.config.sections.faqs || !ctx.config.faqs.length) return null;
  return (
    <section className="sf-section" id="sf-faq"><div className="sf-wrap sf-narrow"><h2 className="sf-h2">Questions and answers</h2>
      {ctx.config.faqs.map((f, i) => <details className="sf-faq" key={i}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div></section>
  );
}

function Contact({ ctx }: { ctx: P['ctx'] }) {
  const c = ctx.config.contact;
  const instagram = ctx.config.social.instagram;
  const rows: ReactNode[] = [];
  if (c.whatsapp) rows.push(<a key="w" className="sf-btn" href={`https://wa.me/91${c.whatsapp}`} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>);
  if (c.phone) rows.push(<a key="p" className="sf-btn ghost" href={`tel:+91${c.phone}`}>Call {c.phone}</a>);
  if (c.email) rows.push(<a key="e" className="sf-btn ghost" href={`mailto:${c.email}`}>{c.email}</a>);
  if (instagram) rows.push(<a key="i" className="sf-btn ghost" href={`https://instagram.com/${instagram}`} target="_blank" rel="noopener noreferrer">Instagram</a>);
  if (!ctx.config.sections.contact || (!rows.length && !c.address && !c.hours)) return null;
  return (
    <section className="sf-section" id="sf-contact"><div className="sf-wrap sf-narrow sf-center"><h2 className="sf-h2">Get in touch</h2>
      {c.address ? <div className="sf-sub"><Paragraphs text={c.address} /></div> : null}{c.hours ? <p className="sf-sub">{c.hours}</p> : null}
      <div className="sf-actions">{rows}</div></div></section>
  );
}

function Footer({ ctx }: { ctx: P['ctx'] }) {
  const { extras = {}, config, data } = ctx;
  const policies = ([['Refund policy', extras.policies?.refund], ['Shipping policy', extras.policies?.shipping], ['Privacy policy', extras.policies?.privacy], ['Terms', extras.policies?.terms]] as [string, string | undefined][]).filter(([, text]) => text);
  const facts = [extras.gstin ? `GSTIN ${extras.gstin}` : '', extras.pricesIncludeGst ? 'Prices include GST.' : ''].filter(Boolean);
  return (
    <footer className="sf-footer"><div className="sf-wrap">
      <div className="sf-foot-top"><strong className="sf-wordmark">{config.brand.name || data.shop.name}</strong>{config.footer.note ? <p className="sf-sub">{config.footer.note}</p> : null}{facts.length ? <p className="sf-sub">{facts.join(' ')}</p> : null}</div>
      {policies.length ? <div className="sf-policies">{policies.map(([title, text]) => <details key={title}><summary>{title}</summary><p>{text}</p></details>)}</div> : null}
      <p className="sf-foot-bottom"><button className="sf-link" id="track" type="button" onClick={() => ctx.actions?.track?.()}>Where is my order?</button> · Powered by <a href="/">Stoora</a></p></div></footer>
  );
}

/** An empty shelf. Sellers see how to fill it (in the editor preview); buyers just see that it is coming. */
function EmptyShelf({ ctx }: { ctx: P['ctx'] }) {
  const services = ctx.template === 'services' || ctx.template === 'signaturestudio';
  const what = services ? 'services' : 'products';
  return (
    <div className="sf-empty"><h3>Coming soon</h3><p className="sf-sub">{ctx.preview && !ctx.sample ? `You have no ${what} showing yet. Add ${services ? 'a service' : 'a product'} in your dashboard and it appears here.` : `New ${what} will appear here soon.`}</p></div>
  );
}

const heroBackground = (config: StoreConfig): CSSProperties | undefined =>
  config.hero.image ? { backgroundImage: `url('${config.hero.image}')`, backgroundPosition: config.hero.focus || '50% 50%' } : undefined;
const heroTitle = (ctx: P['ctx']) => ctx.config.hero.title || ctx.config.brand.name || ctx.data.shop.name;
const heroText = (ctx: P['ctx']) => ctx.config.hero.subtitle || ctx.config.brand.tagline || '';

function Tile({ t, ui, caption = false }: { t: ReturnType<typeof collectionsOf>[number]; ui: Ui; caption?: boolean }) {
  return (
    <a className="sf-tile" href="#sf-shop" onClick={() => ui.setCategory(t.name)}>
      {caption ? <span className="sf-tile-img">{t.image ? <Img src={t.image} alt={t.name} /> : <span className="sf-tile-fill" />}</span> : (t.image ? <Img src={t.image} alt={t.name} /> : <span className="sf-tile-fill" />)}
      <span className="sf-tile-label">{t.name}<small>{plural(t.count, 'piece')}</small></span>
    </a>
  );
}

/* ---------- 1. BOUTIQUE: editorial and premium ---------- */

function Boutique({ ctx, ui }: P) {
  const { config, data } = ctx;
  const shown = config.sections;
  const picks = featuredOf(ctx);
  const tiles = collectionsOf(data);
  return (
    <>
      <header className="sf-top sf-top-center"><div className="sf-wrap"><LogoOrName ctx={ctx} ui={ui} />
        <nav className="sf-nav" aria-label="Store"><a href="#sf-shop">Shop</a>{shown.collections && tiles.length ? <a href="#sf-collections">Collections</a> : null}{shown.about && (config.about.text || config.about.image) ? <a href="#sf-about">About</a> : null}<a href="#sf-contact">Contact</a></nav></div></header>
      <section className={`sf-hero sf-hero-full ${config.hero.image ? 'has-image' : ''}`.trim()} style={heroBackground(config)}><div className="sf-hero-shade" />
        <div className="sf-wrap sf-hero-copy"><p className="sf-eyebrow">{data.shop.city || 'New season'}</p><h1>{heroTitle(ctx)}</h1><p className="sf-lede">{heroText(ctx)}</p><a className="sf-btn big" href="#sf-shop">{config.hero.cta}</a></div></section>
      {shown.collections && tiles.length ? <section className="sf-section" id="sf-collections"><div className="sf-wrap"><h2 className="sf-h2">Collections</h2><div className="sf-tiles">{tiles.slice(0, 3).map((t) => <Tile key={t.name} t={t} ui={ui} />)}</div></div></section> : null}
      {shown.featured && picks.length ? <section className="sf-section"><div className="sf-wrap"><h2 className="sf-h2">Featured</h2><Grid items={picks} ctx={ctx} ui={ui} variant="tall" /></div></section> : null}
      {shown.newArrivals && data.products.length > 1 ? <section className="sf-section sf-tint"><div className="sf-wrap"><h2 className="sf-h2">New arrivals</h2><div className="sf-row">{newestOf(ctx).map((i) => <Card key={i.id} item={i} ctx={ctx} ui={ui} variant="tall" />)}</div></div></section> : null}
      {shown.bestsellers && bestsellersOf(ctx).length ? <section className="sf-section"><div className="sf-wrap"><h2 className="sf-h2">Bestsellers</h2><Grid items={bestsellersOf(ctx)} ctx={ctx} ui={ui} variant="tall" /></div></section> : null}
      <section className="sf-section" id="sf-shop"><div className="sf-wrap"><h2 className="sf-h2">The collection</h2>{data.products.length ? <Grid items={data.products} ctx={ctx} ui={ui} variant="tall" className="sf-grid-3" filterable /> : <EmptyShelf ctx={ctx} />}</div></section>
      <About ctx={ctx} /><Reviews ctx={ctx} /><Faqs ctx={ctx} /><Contact ctx={ctx} /><Footer ctx={ctx} />
    </>
  );
}

/* ---------- 2. MINIMAL: the catalogue comes first ---------- */

function Minimal({ ctx, ui, onTerm }: P & { onTerm: (v: string) => void }) {
  const { config, data } = ctx;
  const tiles = collectionsOf(data);
  const picks = featuredOf(ctx);
  const visible = data.products.filter((item) => matches(item, ui)).length;
  return (
    <>
      <header className="sf-top sf-top-bar"><div className="sf-wrap sf-bar"><LogoOrName ctx={ctx} ui={ui} />
        <label className="sf-search"><span className="sf-sr">Search products</span><input type="search" placeholder="Search products" autoComplete="off" onChange={(e) => onTerm(e.target.value.trim().toLowerCase())} /></label>
        <a className="sf-link" href="#sf-contact">Contact</a></div>
        {tiles.length ? <div className="sf-wrap sf-chips" role="group" aria-label="Categories"><button type="button" className={`sf-chip${ui.category === '' ? ' on' : ''}`} onClick={() => ui.setCategory('')}>All</button>{tiles.map((t) => <button type="button" key={t.name} className={`sf-chip${ui.category === t.name ? ' on' : ''}`} onClick={() => ui.setCategory(t.name)}>{t.name}</button>)}</div> : null}</header>
      <section className="sf-hero sf-hero-compact"><div className="sf-wrap sf-split"><div className="sf-hero-copy"><h1>{heroTitle(ctx)}</h1><p className="sf-lede">{heroText(ctx)}</p><a className="sf-btn" href="#sf-shop">{config.hero.cta}</a></div>{config.hero.image ? <div className="sf-hero-photo"><Img src={config.hero.image} eager focus={config.hero.focus} /></div> : null}</div></section>
      {config.sections.featured && picks.length ? <section className="sf-section"><div className="sf-wrap"><h2 className="sf-h2">Featured</h2><Grid items={picks} ctx={ctx} ui={ui} variant="square" className="sf-grid-4" /></div></section> : null}
      <section className="sf-section" id="sf-shop"><div className="sf-wrap"><h2 className="sf-h2">All products <small>{visible}</small></h2>{data.products.length ? <Grid items={data.products} ctx={ctx} ui={ui} variant="square" className="sf-grid-4" filterable /> : <EmptyShelf ctx={ctx} />}<p className="sf-sub sf-none" hidden={visible > 0 || !data.products.length}>Nothing matches. Try another word or category.</p></div></section>
      <About ctx={ctx} /><Reviews ctx={ctx} /><Faqs ctx={ctx} /><Contact ctx={ctx} /><Footer ctx={ctx} />
    </>
  );
}

/* ---------- 3. STUDIO: warm, personal, image-led ---------- */

function Studio({ ctx, ui }: P) {
  const { config, data } = ctx;
  const tiles = collectionsOf(data);
  return (
    <>
      <header className="sf-top sf-top-left"><div className="sf-wrap sf-bar"><LogoOrName ctx={ctx} ui={ui} /><nav className="sf-nav"><a href="#sf-gallery">Work</a>{config.story.text ? <a href="#sf-story">Story</a> : null}{config.process.length ? <a href="#sf-process">Process</a> : null}<a href="#sf-contact">Contact</a></nav></div></header>
      <section className="sf-hero sf-hero-studio"><div className="sf-wrap sf-split">
        <div className="sf-hero-copy"><p className="sf-eyebrow">{config.brand.tagline || data.shop.city || ''}</p><h1>{heroTitle(ctx)}</h1><p className="sf-lede">{heroText(ctx)}</p><a className="sf-btn big" href="#sf-gallery">{config.hero.cta}</a></div>
        <div className="sf-hero-frame">{config.hero.image ? <Img src={config.hero.image} eager focus={config.hero.focus} /> : <span className="sf-frame-fill">{initial(brandName(ctx))}</span>}</div></div></section>
      {config.story.text ? <section className="sf-section sf-tint" id="sf-story"><div className="sf-wrap sf-narrow"><h2 className="sf-h2">{config.story.title}</h2><div className="sf-story"><Paragraphs text={config.story.text} /></div></div></section> : null}
      <section className="sf-section" id="sf-gallery"><div className="sf-wrap"><h2 className="sf-h2">The work</h2>
        {config.sections.collections && tiles.length ? <div className="sf-chips">{tiles.map((t) => <span className="sf-chip" key={t.name}>{t.name}</span>)}</div> : null}
        {data.products.length ? <div className="sf-masonry">{data.products.map((i) => <Card key={i.id} item={i} ctx={ctx} ui={ui} variant="natural" />)}</div> : <EmptyShelf ctx={ctx} />}</div></section>
      {config.process.length ? <section className="sf-section sf-tint" id="sf-process"><div className="sf-wrap"><h2 className="sf-h2">How it is made</h2><ol className="sf-steps">{config.process.map((s, n) => <li key={n}><span className="sf-step-no">{n + 1}</span><h3>{s.title}</h3><p>{s.text}</p></li>)}</ol></div></section> : null}
      <About ctx={ctx} /><Reviews ctx={ctx} heading="Kind words" /><Faqs ctx={ctx} /><Contact ctx={ctx} /><Footer ctx={ctx} />
    </>
  );
}

/* ---------- 4. SERVICES: trust and clarity, no shop shelves ---------- */

function glanceOf(ctx: P['ctx'], withSessions: boolean): [string, string][] {
  const s = ctx.config.services;
  const rows: [string, string][] = [['Subjects', s.subjects.join(', ')], ['Levels', s.levels.join(', ')], ['Mode', s.modes.join(', ')]];
  if (withSessions) rows.push(['Sessions', s.sessions]);
  return rows.filter(([, value]) => value);
}

function ServicesTemplate({ ctx, ui }: P) {
  const { config, data } = ctx;
  const s = config.services;
  const glance = glanceOf(ctx, true);
  return (
    <>
      <header className="sf-top sf-top-bar"><div className="sf-wrap sf-bar"><LogoOrName ctx={ctx} ui={ui} /><nav className="sf-nav"><a href="#sf-services">Services</a>{config.about.text ? <a href="#sf-about">About</a> : null}{config.faqs.length ? <a href="#sf-faq">FAQ</a> : null}<a href="#sf-contact">Contact</a></nav></div></header>
      <section className="sf-hero sf-hero-services"><div className="sf-wrap sf-split">
        <div className="sf-hero-copy"><h1>{heroTitle(ctx)}</h1><p className="sf-lede">{heroText(ctx)}</p>
          <div className="sf-actions"><a className="sf-btn big" href="#sf-services">{config.hero.cta}</a>{config.contact.whatsapp ? <a className="sf-btn big ghost" href={`https://wa.me/91${config.contact.whatsapp}`} target="_blank" rel="noopener noreferrer">Ask on WhatsApp</a> : null}</div></div>
        {glance.length ? <aside className="sf-glance"><h2>At a glance</h2><dl>{glance.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl></aside> : config.hero.image ? <div className="sf-hero-photo"><Img src={config.hero.image} eager focus={config.hero.focus} /></div> : null}</div></section>
      <section className="sf-section" id="sf-services"><div className="sf-wrap"><h2 className="sf-h2">Services</h2>{data.services.length ? <Grid items={data.services} ctx={ctx} ui={ui} variant="service" className="sf-grid-3" /> : <EmptyShelf ctx={ctx} />}</div></section>
      {s.credentials.length ? <section className="sf-section sf-tint"><div className="sf-wrap sf-narrow"><h2 className="sf-h2">Credentials</h2><ul className="sf-checks">{s.credentials.map((c, i) => <li key={i}>{c}</li>)}</ul></div></section> : null}
      <About ctx={ctx} /><Reviews ctx={ctx} heading="What clients say" /><Faqs ctx={ctx} /><Contact ctx={ctx} /><Footer ctx={ctx} />
    </>
  );
}

/* ---------- 5. SIGNATURE: bold brand, editorial rhythm ---------- */

/** Facts about the shop that are true right now. Nothing here is invented. */
function trustItems(ctx: P['ctx']) {
  const { data, extras = {} } = ctx;
  const items: string[] = [];
  if (data.reviewSummary && data.reviewSummary.count) items.push(`${data.reviewSummary.average.toFixed(1)} ★ from ${plural(data.reviewSummary.count, 'review')}`);
  if (data.products.length) items.push(`${plural(data.products.length, 'piece')} in store`);
  if (data.shop.city) items.push(`Based in ${data.shop.city}`);
  if (extras.payments?.online) items.push('Pay by card, UPI or netbanking');
  else if (extras.payments?.upi) items.push('Pay by UPI');
  if (extras.policies?.refund) items.push('Refund policy on every order');
  return items;
}

function Signature({ ctx, ui }: P) {
  const { config, data } = ctx;
  const trust = trustItems(ctx);
  const highlights = (featuredOf(ctx).length ? featuredOf(ctx) : bestsellersOf(ctx).length ? bestsellersOf(ctx) : data.products).slice(0, 3);
  const tiles = collectionsOf(data);
  return (
    <>
      <header className="sf-top sf-top-bar sf-top-dark"><div className="sf-wrap sf-bar"><LogoOrName ctx={ctx} ui={ui} /><nav className="sf-nav"><a href="#sf-shop">Shop</a>{config.story.text ? <a href="#sf-story">Story</a> : null}<a href="#sf-contact">Contact</a></nav></div></header>
      <section className="sf-hero sf-hero-signature"><div className="sf-wrap sf-split">
        <div className="sf-hero-copy"><p className="sf-eyebrow">{config.brand.tagline || data.shop.city || ''}</p><h1 className="sf-giant">{heroTitle(ctx)}</h1><p className="sf-lede">{heroText(ctx)}</p><a className="sf-btn big" href="#sf-shop">{config.hero.cta}</a></div>
        <div className="sf-hero-photo tall">{config.hero.image ? <Img src={config.hero.image} eager focus={config.hero.focus} /> : <span className="sf-frame-fill">{initial(brandName(ctx))}</span>}</div></div></section>
      {trust.length ? <div className="sf-trust"><div className="sf-wrap">{trust.map((t) => <span key={t}>{t}</span>)}</div></div> : null}
      {highlights.length ? <section className="sf-section" id="sf-highlights"><div className="sf-wrap"><h2 className="sf-h2">Selected pieces</h2>{highlights.map((item, n) => (
        <article className={`sf-feature ${n % 2 ? 'flip' : ''}`.trim()} key={item.id}><Photo item={item} ctx={ctx} className="big" /><div className="sf-feature-copy"><p className="sf-eyebrow">{String(n + 1).padStart(2, '0')}</p><h3>{item.name}</h3>{item.desc ? <p>{item.desc}</p> : null}<p className="sf-price">{rupees(item.price)}</p><Availability item={item} /><Action item={item} ctx={ctx} /></div></article>))}</div></section> : null}
      {config.sections.collections && tiles.length ? <section className="sf-section sf-tint"><div className="sf-wrap"><h2 className="sf-h2">Collections</h2><ol className="sf-index">{tiles.map((t, n) => <li key={t.name}><a href="#sf-shop" onClick={() => ui.setCategory(t.name)}><span>{String(n + 1).padStart(2, '0')}</span>{t.name}<small>{t.count}</small></a></li>)}</ol></div></section> : null}
      {config.story.text ? <section className="sf-section sf-dark" id="sf-story"><div className="sf-wrap sf-narrow"><h2 className="sf-h2">{config.story.title}</h2><div className="sf-story"><Paragraphs text={config.story.text} /></div></div></section> : null}
      <section className="sf-section" id="sf-shop"><div className="sf-wrap"><h2 className="sf-h2">Everything</h2>{data.products.length ? <Grid items={data.products} ctx={ctx} ui={ui} variant="tall" className="sf-grid-3" filterable /> : <EmptyShelf ctx={ctx} />}</div></section>
      <About ctx={ctx} /><Reviews ctx={ctx} /><Faqs ctx={ctx} /><Contact ctx={ctx} /><Footer ctx={ctx} />
    </>
  );
}

/* ---------- PREMIUM 1. ATELIER LUXE: refined and editorial ---------- */

function Atelier({ ctx, ui }: P) {
  const { config, data } = ctx;
  const tiles = collectionsOf(data);
  const lookbook = (featuredOf(ctx).length ? featuredOf(ctx) : data.products).slice(0, 3);
  return (
    <>
      <header className="sf-top sf-top-atelier"><div className="sf-wrap">
        <nav className="sf-nav sf-nav-left" aria-label="Store"><a href="#sf-lookbook">Lookbook</a><a href="#sf-shop">Shop</a></nav><LogoOrName ctx={ctx} ui={ui} />
        <nav className="sf-nav sf-nav-right">{config.about.text ? <a href="#sf-about">Our house</a> : null}<a href="#sf-contact">Contact</a></nav></div></header>
      <section className="sf-hero sf-hero-atelier"><div className="sf-wrap sf-atelier-grid">
        <div className="sf-atelier-photo">{config.hero.image ? <Img src={config.hero.image} eager focus={config.hero.focus} /> : <span className="sf-frame-fill">{initial(brandName(ctx))}</span>}</div>
        <div className="sf-hero-copy"><p className="sf-eyebrow">{config.brand.tagline || data.shop.city || ''}</p><h1>{heroTitle(ctx)}</h1><p className="sf-lede">{heroText(ctx)}</p>
          <div className="sf-actions"><a className="sf-btn big" href="#sf-shop">{config.hero.cta}</a>{lookbook.length ? <a className="sf-btn big ghost" href="#sf-lookbook">View the lookbook</a> : null}</div></div></div></section>
      {lookbook.length ? <section className="sf-section" id="sf-lookbook"><div className="sf-wrap"><h2 className="sf-h2 sf-h2-center">The lookbook</h2>
        <div className="sf-lookbook">{lookbook.map((item, n) => <figure className={`sf-look n${n}`} key={item.id}><Photo item={item} ctx={ctx} /><figcaption><b>{item.name}</b><span>{rupees(item.price)}</span></figcaption></figure>)}</div></div></section> : null}
      {config.sections.collections && tiles.length ? <section className="sf-section sf-tint"><div className="sf-wrap"><h2 className="sf-h2 sf-h2-center">Shop by collection</h2><div className="sf-tiles sf-tiles-caption">{tiles.slice(0, 3).map((t) => <Tile key={t.name} t={t} ui={ui} caption />)}</div></div></section> : null}
      <section className="sf-section" id="sf-shop"><div className="sf-wrap"><h2 className="sf-h2 sf-h2-center">The collection</h2>{data.products.length ? <Grid items={data.products} ctx={ctx} ui={ui} variant="tall" className="sf-grid-4 sf-quiet" filterable /> : <EmptyShelf ctx={ctx} />}</div></section>
      {config.about.text ? <section className="sf-section sf-tint" id="sf-about"><div className="sf-wrap sf-narrow sf-center"><p className="sf-eyebrow">{config.about.title}</p><blockquote className="sf-pull">{config.about.text.split(/\n{2,}/)[0]}</blockquote></div></section> : null}
      <Reviews ctx={ctx} /><Faqs ctx={ctx} /><Contact ctx={ctx} /><Footer ctx={ctx} />
    </>
  );
}

/* ---------- PREMIUM 2. HERITAGE CRAFT: warm storytelling ---------- */

function Heritage({ ctx, ui }: P) {
  const { config, data } = ctx;
  const tiles = collectionsOf(data);
  return (
    <>
      <header className="sf-top sf-top-heritage"><div className="sf-wrap sf-bar"><LogoOrName ctx={ctx} ui={ui} /><nav className="sf-nav"><a href="#sf-shop">Shop</a>{config.story.text || config.about.text ? <a href="#sf-maker">The maker</a> : null}{config.process.length ? <a href="#sf-process">How it is made</a> : null}<a href="#sf-contact">Contact</a></nav></div><div className="sf-border-line" aria-hidden="true" /></header>
      <section className="sf-hero sf-hero-heritage"><div className="sf-wrap sf-split">
        <div className="sf-hero-copy"><p className="sf-eyebrow">{config.brand.tagline || (data.shop.city ? `Handmade in ${data.shop.city}` : 'Handmade')}</p><h1>{heroTitle(ctx)}</h1><p className="sf-lede">{heroText(ctx)}</p><a className="sf-btn big" href="#sf-shop">{config.hero.cta}</a></div>
        <div className="sf-arch">{config.hero.image ? <Img src={config.hero.image} eager focus={config.hero.focus} /> : <span className="sf-frame-fill">{initial(brandName(ctx))}</span>}</div></div></section>
      {config.story.text || config.about.text ? <section className="sf-section sf-tint" id="sf-maker"><div className="sf-wrap sf-split">
        {config.about.image ? <div className="sf-about-photo"><Img src={config.about.image} alt={config.about.title} focus="50% 40%" /></div> : null}
        <div className="sf-about-text"><p className="sf-eyebrow">From the maker</p><h2 className="sf-h2">{config.story.text ? config.story.title : config.about.title}</h2><div className="sf-story"><Paragraphs text={config.story.text || config.about.text} /></div><p className="sf-sign">{brandName(ctx)}</p></div></div></section> : null}
      {config.sections.collections && tiles.length ? <section className="sf-section"><div className="sf-wrap"><h2 className="sf-h2">Collections</h2><div className="sf-hlist">{tiles.map((t) => <a className="sf-hitem" href="#sf-shop" key={t.name} onClick={() => ui.setCategory(t.name)}><span className="sf-hitem-img">{t.image ? <Img src={t.image} alt={t.name} /> : null}</span><span><b>{t.name}</b><small>{plural(t.count, 'piece')}</small></span></a>)}</div></div></section> : null}
      <section className="sf-section" id="sf-shop"><div className="sf-wrap"><h2 className="sf-h2">The craft</h2>{data.products.length ? <Grid items={data.products} ctx={ctx} ui={ui} variant="describe" className="sf-grid-3" filterable /> : <EmptyShelf ctx={ctx} />}</div></section>
      {config.process.length ? <section className="sf-section sf-tint" id="sf-process"><div className="sf-wrap"><h2 className="sf-h2">How it is made</h2><ol className="sf-timeline">{config.process.map((s, n) => <li key={n}><span className="sf-step-no">{n + 1}</span><h3>{s.title}</h3><p>{s.text}</p></li>)}</ol></div></section> : null}
      <Reviews ctx={ctx} heading="Kind words" /><Faqs ctx={ctx} /><Contact ctx={ctx} /><Footer ctx={ctx} />
    </>
  );
}

/* ---------- PREMIUM 3. SIGNATURE STUDIO: a personal brand with a profile column ---------- */

function SignatureStudio({ ctx, ui }: P) {
  const { config, data } = ctx;
  const s = config.services;
  const glance = glanceOf(ctx, false);
  const c = config.contact;
  const hasAbout = config.sections.about && (config.about.text || config.about.image);
  return (
    <>
      <div className="sf-ss"><aside className="sf-ss-side"><div className="sf-ss-card">
        {config.hero.image ? <div className="sf-ss-photo"><Img src={config.hero.image} alt={brandName(ctx)} eager focus={config.hero.focus} /></div> : null}
        <p className="sf-eyebrow">{config.brand.tagline || data.shop.city || ''}</p><h1>{heroTitle(ctx)}</h1><p className="sf-sub">{heroText(ctx)}</p>
        {glance.length ? <dl className="sf-ss-glance">{glance.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl> : null}
        <div className="sf-actions"><a className="sf-btn" href="#sf-services">{config.hero.cta}</a>{c.whatsapp ? <a className="sf-btn ghost" href={`https://wa.me/91${c.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp</a> : null}</div>
        <nav className="sf-ss-nav"><a href="#sf-services">Services</a>{config.about.text ? <a href="#sf-about">About</a> : null}{s.credentials.length ? <a href="#sf-creds">Credentials</a> : null}{config.faqs.length ? <a href="#sf-faq">FAQ</a> : null}<a href="#sf-contact">Contact</a></nav></div></aside>
      <main className="sf-ss-main">
        <section className="sf-ss-block" id="sf-services"><h2 className="sf-h2">Work with me</h2>{data.services.length ? <div className="sf-rows">{data.services.map((item) => (
          <article className="sf-row-item" key={item.id}><div className="sf-row-copy"><h3>{item.name}</h3><p className="sf-sub">{[item.type, item.duration, item.where, item.next].filter(Boolean).join(' · ')}</p></div><div className="sf-row-price"><b>From {rupees(item.price)}</b><Action item={item} ctx={ctx} /></div></article>))}</div> : <EmptyShelf ctx={ctx} />}{s.sessions ? <p className="sf-sub" style={{ marginTop: 14 }}><b>Sessions:</b> {s.sessions}</p> : null}</section>
        {hasAbout ? <section className="sf-ss-block" id="sf-about"><h2 className="sf-h2">{config.about.title}</h2><Paragraphs text={config.about.text} /></section> : null}
        {s.credentials.length ? <section className="sf-ss-block" id="sf-creds"><h2 className="sf-h2">Credentials</h2><ul className="sf-checks">{s.credentials.map((x, i) => <li key={i}>{x}</li>)}</ul></section> : null}
        {(data.reviews || []).length && config.sections.reviews ? <section className="sf-ss-block"><h2 className="sf-h2">What clients say</h2><div className="sf-reviews">{(data.reviews || []).map((r, i) => <blockquote className="sf-review" key={i}><span className="sf-stars">{stars(r.rating)}</span><p>{r.comment}</p><footer>{r.who}</footer></blockquote>)}</div></section> : null}
        {config.sections.faqs && config.faqs.length ? <section className="sf-ss-block" id="sf-faq"><h2 className="sf-h2">Questions and answers</h2>{config.faqs.map((f, i) => <details className="sf-faq" key={i}><summary>{f.q}</summary><p>{f.a}</p></details>)}</section> : null}
        <Contact ctx={ctx} /></main></div><Footer ctx={ctx} />
    </>
  );
}

/* ---------- the renderer ---------- */

/**
 * One renderer is used everywhere: the public shop page, the editor's live preview and the gallery thumbnails.
 * So what a seller previews is exactly what buyers get. Styling lives in styles/storefront.css and reads the
 * --store-* variables set from the chosen theme.
 */
export function StoreFront({ templateId, ctx }: { templateId: string; ctx: StoreCtx }) {
  const template = templateById(templateId);
  const full = useMemo(() => ({ ...ctx, template: template.id, cart: ctx.cart || {} }), [ctx, template.id]);
  const [category, setCategory] = useState('');
  const [term, setTerm] = useState('');
  const ui: Ui = { term, category, setCategory };
  const vars = themeVariables(ctx.config.theme, ctx.config.accent) as CSSProperties;
  let body: ReactNode;
  switch (template.id) {
    case 'minimal': body = <Minimal ctx={full} ui={ui} onTerm={setTerm} />; break;
    case 'studio': body = <Studio ctx={full} ui={ui} />; break;
    case 'services': body = <ServicesTemplate ctx={full} ui={ui} />; break;
    case 'signature': body = <Signature ctx={full} ui={ui} />; break;
    case 'atelier': body = <Atelier ctx={full} ui={ui} />; break;
    case 'heritage': body = <Heritage ctx={full} ui={ui} />; break;
    case 'signaturestudio': body = <SignatureStudio ctx={full} ui={ui} />; break;
    default: body = <Boutique ctx={full} ui={ui} />;
  }
  return <div className={`sf sf-${template.id}`} style={vars} data-preview={ctx.preview ? '1' : undefined}>{body}</div>;
}
