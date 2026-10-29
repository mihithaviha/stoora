'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { DI } from './parts';
import { useToast } from '../ui';
import { useAuth } from '@/lib/auth';
import { Answer, SUGGESTIONS } from '@/lib/ask';
import { rs } from '@/lib/format';
import { orderFilters, useStore } from '@/lib/store';

interface Dash {
  /** Open the Ask Stoora side panel, optionally with a first question. */
  openAsk: (q?: string) => void;
  openSearch: () => void;
}
const Ctx = createContext<Dash>({ openAsk: () => {}, openSearch: () => {} });
export const useDash = () => useContext(Ctx);

type Overlay = null | 'search' | 'alerts' | 'menu';

/* ---------- a calm entrance for each new screen, with numbers that count up ---------- */
const ANIM = '.dhero,.card,.box,.li,.trow,.kpi,.tile,.mstrip,.idea,.dset-row,.setup,.tbox,.tbl tbody tr,.sec-t,.list-t,.h1,.banner';
function countUp(el: HTMLElement) {
  const text = el.textContent?.trim() ?? '';
  const m = text.match(/^(₹?)([\d,]+)(.*)$/);
  if (!m) return;
  const n = Number(m[2].replace(/,/g, ''));
  if (!(n >= 2)) return;
  const fmt = (v: number) => m[1] + Math.round(v).toLocaleString('en-IN') + m[3];
  const t0 = performance.now();
  const duration = n > 999 ? 900 : 700;
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / duration);
    el.textContent = fmt(n * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step); else el.textContent = text;
  };
  requestAnimationFrame(step);
}
function animateScreen(screen: HTMLElement) {
  screen.classList.remove('enter');
  void screen.offsetWidth;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let i = 0;
  screen.querySelectorAll<HTMLElement>(ANIM).forEach((el) => {
    const parent = el.parentElement?.closest(ANIM);
    if (parent && screen.contains(parent)) return;
    el.classList.add('anim');
    el.style.setProperty('--i', String(Math.min(i++, 12)));
  });
  screen.querySelectorAll('.bars').forEach((bars) => Array.from(bars.children).forEach((c, k) => (c as HTMLElement).style.setProperty('--b', String(k))));
  screen.querySelectorAll<HTMLElement>('.tile .v,.kpi .v,.mstrip .v').forEach(countUp);
  screen.classList.add('enter');
  window.setTimeout(() => screen.classList.remove('enter'), 1800);
}

/** Which row of the sidebar a page belongs to. */
function navKey(path: string) {
  const first = path.split('/')[1] || '';
  return ({ dashboard: 'home', orders: 'orders', bookings: 'orders', products: 'products', customers: 'customers', money: 'money', analytics: 'analytics', discounts: 'discounts', storefront: 'storefront', settings: 'settings' } as Record<string, string>)[first] ?? '';
}

export function DashShell({ children }: { children: ReactNode }) {
  const path = usePathname() || '/dashboard';
  const sp = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const auth = useAuth();
  const { db } = useStore();
  const tab = sp.get('tab');
  const screen = useRef<HTMLDivElement>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [asks, setAsks] = useState<string[] | null>(null);
  const [alertsSeen, setAlertsSeen] = useState(false);

  // pages that still lay themselves out with the app's older components need the dashboard's page padding
  const legacy = /^\/(account|notifications|storefront)(\/|$)|^\/orders\/new\/ai|^\/products\/import/.test(path);
  const key = navKey(path);
  const sub = (key === 'orders' && (tab === 'bookings' || path.startsWith('/bookings'))) ? 'bookings' : (key === 'products' && (tab === 'services' || path.startsWith('/products/service'))) ? 'services' : '';
  const settings = key === 'settings';

  const toShip = db.orders.filter(orderFilters['To ship']).length;
  const alertCount = alertsSeen ? 0 : db.alerts.length;

  // every new screen arrives from the top, with its entrance
  useLayoutEffect(() => {
    setOverlay(null); setNavOpen(false);
    const el = screen.current;
    if (!el) return;
    el.scrollTo(0, 0);
    animateScreen(el);
  }, [path, tab]);

  const openAsk = useCallback((q?: string) => { return; setOverlay(null); setAsks((list) => (q ? [...(list ?? []), q] : list ?? [])); }, []);
  const openSearch = useCallback(() => { setAsks(null); setOverlay('search'); setNavOpen(false); }, []);
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); }
      if (event.key === 'Escape') { setOverlay(null); setAsks(null); setNavOpen(false); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openSearch]);

  const ctx = useMemo<Dash>(() => ({ openAsk, openSearch }), [openAsk, openSearch]);
  const go = useCallback((href: string) => { setOverlay(null); router.push(href); }, [router]);

  const row = (href: string, id: string, icon: string, label: string, extra?: ReactNode) => (
    <Link className={`nrow${key === id && !sub ? ' on' : ''}`} href={href} title={label} aria-current={key === id && !sub ? 'page' : undefined}>
      <DI n={icon} s={18} /><span className="l">{label}</span>{extra}
    </Link>
  );
  const subRow = (href: string, id: string, label: string) => <Link className={`nsub${sub === id ? ' on' : ''}`} href={href}>{label}</Link>;
  const initial = (db.shop.name || 'S')[0].toUpperCase();

  return (
    <Ctx.Provider value={ctx}>
      <div className={`dapp${asks ? ' side-open' : ''}${settings ? ' set' : ''}${navOpen ? ' nav-open' : ''}`}>
        <nav className="dnav" id="nav" aria-label="Main">
          <div className="nhead"><Link href="/dashboard" aria-label="Stoora home"><div className="smark">S</div><span className="l brand">Stoora</span></Link></div>
          <button className="nsearch" type="button" onClick={openSearch} title="Search"><DI n="search" s={16} /><span className="l sp">Search</span><kbd className="l">Ctrl K</kbd></button>
          {row('/dashboard', 'home', 'home', 'Home')}
          {row('/orders', 'orders', 'orders', 'Orders', toShip ? <span className="dcnt">{toShip}</span> : null)}
          {key === 'orders' ? subRow('/orders?tab=bookings', 'bookings', 'Bookings') : null}
          {row('/products', 'products', 'tag', 'Products')}
          {key === 'products' ? subRow('/products?tab=services', 'services', 'Services') : null}

          {row('/customers', 'customers', 'user', 'Customers')}
          {row('/money', 'money', 'wallet', 'Money')}
          {row('/analytics', 'analytics', 'chart', 'Analytics')}
          {row('/discounts', 'discounts', 'percent', 'Discounts & offers')}
          <div className="ngrp">Sales channels ›</div>
          {row('/storefront', 'storefront', 'store', 'Storefront')}


          <div className="nfoot">
            {row('/settings', 'settings', 'gear', 'Settings')}
            <div className="nstore">
              <button className="nme" type="button" onClick={() => setOverlay(overlay === 'menu' ? null : 'menu')} title={db.shop.name} aria-haspopup="menu" aria-expanded={overlay === 'menu'}><span className="smark sq">{initial}</span><span className="l" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{db.shop.name}</span></button>
              <button className="nbell" type="button" onClick={() => setOverlay(overlay === 'alerts' ? null : 'alerts')} aria-label={`Alerts, ${alertCount} new`}><DI n="bell" s={18} />{alertCount ? <span className="dot">{alertCount}</span> : null}</button>
            </div>
          </div>
        </nav>
        <div className="dnav-scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />

        <main className="pane" id="main">
          <div className="mobbar">
            <button className="ibtn" type="button" aria-label="Open menu" aria-expanded={navOpen} onClick={() => setNavOpen(true)}><DI n="menu" s={18} /></button>
            <Link className="brand" href="/dashboard"><span className="smark sq">{initial}</span><span>{db.shop.name}</span></Link>
            <button className="ibtn" type="button" aria-label="Search" onClick={openSearch}><DI n="search" s={18} /></button>
            <button className="ibtn" type="button" aria-label={`Alerts, ${alertCount} new`} onClick={() => setOverlay('alerts')}><DI n="bell" s={18} />{alertCount ? <span className="dot">{alertCount}</span> : null}</button>
          </div>
          <div className="dscreen" id="screen" ref={screen}>{legacy ? <div className="dpad" style={{ paddingTop: 20 }}>{children}</div> : children}</div>
          {asks ? <AskPanel asks={asks} onAsk={(q) => setAsks((list) => [...(list ?? []), q])} onClose={() => setAsks(null)} go={go} copy={(text) => { navigator.clipboard?.writeText(text).then(() => toast('Copied.')).catch(() => toast('Press Ctrl+C to copy.', { icon: 'error' })); }} /> : null}
        </main>

        {overlay === 'alerts' && (
          <>
            <div className="dscrim" onClick={() => setOverlay(null)} style={{ background: 'rgba(23,28,60,.15)' }} />
            <div className="dpop alerts" role="dialog" aria-label="Alerts">
              <div className="row" style={{ padding: '14px 16px', borderBottom: '1px solid var(--line-soft)' }}><b className="sp">Alerts</b><button className="link small" type="button" onClick={() => { setAlertsSeen(true); setOverlay(null); }}>Mark all read</button></div>
              {db.alerts.map((a) => (
                <Link key={a.id} className="li" href={a.href} onClick={() => setOverlay(null)} style={{ padding: '12px 16px', borderRadius: 0, border: 0, boxShadow: 'none' }}>
                  <span className="unread" style={{ background: 'var(--primary)' }} /><div className="sp"><div className="tiny muted">{a.when}</div><b className="small">{a.title}</b><div className="small muted">{a.detail}</div></div>
                </Link>
              ))}
              <div style={{ padding: 12, textAlign: 'center' }} className="small muted">{db.alerts.length ? 'No more alerts' : 'Nothing new'} · <Link className="link" href="/notifications" onClick={() => setOverlay(null)}>All notifications</Link></div>
            </div>
          </>
        )}
        {overlay === 'menu' && (
          <>
            <div className="dscrim clear" onClick={() => setOverlay(null)} />
            <div className="dpop store" role="menu" aria-label="Shop menu">
              <div className="row" style={{ padding: '14px 16px', borderBottom: '1px solid var(--line-soft)' }}><div className="smark sq">{initial}</div><div className="sp"><b>{db.shop.name}</b><div className="tiny muted">stoora.in/{db.shop.handle}</div></div></div>
              <button className="mrow" type="button" role="menuitem" onClick={() => { setOverlay(null); toast('Switching between shops is coming soon.', { icon: 'info' }); }}><DI n="store" s={18} /> Switch shop</button>
              <Link className="mrow" href="/account" role="menuitem" onClick={() => setOverlay(null)}><DI n="user" s={18} /> Your profile</Link>
              <Link className="mrow" href="/settings" role="menuitem" onClick={() => setOverlay(null)}><DI n="gear" s={18} /> Settings</Link>
              <a className="mrow" href="mailto:hello@stoora.in" role="menuitem"><DI n="doc" s={18} /> Help</a>
              <button className="mrow" type="button" role="menuitem" onClick={async () => { setOverlay(null); await auth.signOut(); router.push('/signed-out'); }}><DI n="back" s={18} /> Log out</button>
            </div>
          </>
        )}
        {overlay === 'search' && <SearchPop onClose={() => setOverlay(null)} go={go} />}
      </div>
    </Ctx.Provider>
  );
}

/* ---------- the Ask Stoora side panel ---------- */
function AskPanel({ asks, onAsk, onClose, go, copy }: { asks: string[]; onAsk: (q: string) => void; onClose: () => void; go: (href: string) => void; copy: (t: string) => void }) {
  const { db } = useStore();
  const [v, setV] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const toast = useToast();
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [asks.length]);
  const send = () => { if (!v.trim()) return; onAsk(v.trim()); setV(''); };
  const list = asks.length ? asks : [];
  return (
    <aside className="dspanel" aria-label="Ask Stoora">
      <div className="sp-h">
        <div className="smark" style={{ width: 26, height: 26, fontSize: 14 }}>S</div><b className="sp">Ask Stoora</b>
        <button className="ibtn sm" type="button" aria-label="New chat" onClick={() => onAsk(SUGGESTIONS[0])}><DI n="plus" s={16} /></button>
        <button className="ibtn sm" type="button" aria-label="Close" onClick={onClose}><DI n="x" s={16} /></button>
      </div>
      <div className="sp-b">
        {list.length === 0 ? (
          <div className="stack tight"><p className="small muted">Ask about your orders, money or products. Answers come from your shop’s own numbers.</p><div className="sugg" style={{ flexWrap: 'wrap' }}>{SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => onAsk(s)}>{s}</button>)}</div></div>
        ) : list.map((q, i) => (
          <div key={i} style={{ marginBottom: 18 }}>
            <div className="bubble me" style={{ marginBottom: 12 }}>{q}</div>
            <div className="tiny" style={{ color: 'var(--ink-soft)', fontWeight: 700, letterSpacing: '.06em', display: 'flex', gap: 6, alignItems: 'center' }}><DI n="spark" s={14} /> STOORA</div>
            <Answer q={q} db={db} tools={{ go, copy }} />
            <div className="row tiny muted" style={{ marginTop: 10, gap: 14 }}>
              <button type="button" aria-label="Copy answer" onClick={() => copy(q)}><DI n="copy" s={16} /></button>
              <button type="button" aria-label="Good answer" onClick={() => toast('Thanks for the feedback.', { icon: 'thumb_up' })}><span className="ms">thumb_up</span></button>
              <button type="button" aria-label="Not helpful" onClick={() => toast('Thanks, we’ll use this to improve.', { icon: 'thumb_down' })}><span className="ms">thumb_down</span></button>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="sp-f"><div className="in"><input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} placeholder="Ask a follow-up…" aria-label="Ask Stoora" /><button className="ibtn dark sm" type="button" style={{ boxShadow: 'none' }} aria-label="Send" onClick={send}><DI n="send" s={16} /></button></div></div>
    </aside>
  );
}

/* ---------- search (Ctrl K) ---------- */
const KINDS = ['All', 'Orders', 'Bookings', 'Products', 'Services', 'Customers', 'Settings'] as const;
function SearchPop({ onClose, go }: { onClose: () => void; go: (href: string) => void }) {
  const { db } = useStore();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<(typeof KINDS)[number]>('All');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const results = useMemo(() => {
    const all: { href: string; kind: (typeof KINDS)[number]; icon: string; t: string; s: string; tags?: ReactNode }[] = [
      ...db.orders.map((o) => ({ href: `/orders/${o.id}`, kind: 'Orders' as const, icon: 'orders', t: `#${o.id} · ${o.buyer}`, s: `${rs(o.total)} · ${o.paid ? 'Paid' : 'Not paid'} · ${o.shipped ? 'Shipped' : 'To ship'}` })),
      ...db.bookings.map((b) => ({ href: `/bookings/${b.id}`, kind: 'Bookings' as const, icon: 'cal', t: `${b.id} · ${b.buyer}`, s: `${db.services.find((s) => s.id === b.serviceId)?.name ?? 'Booking'} · ${b.when}` })),
      ...db.products.map((p) => ({ href: `/products/${p.id}`, kind: 'Products' as const, icon: 'tag', t: p.name, s: `${rs(p.price)} · ${p.stock === 0 ? 'Sold out' : p.stock + ' in stock'}${p.status === 'Draft' ? ' · Draft' : ''}` })),
      ...db.services.map((s) => ({ href: `/products/service/${s.id}`, kind: 'Services' as const, icon: 'cal', t: s.name, s: `${s.type} · ${rs(s.price)}` })),
      ...db.customers.map((c) => ({ href: `/customers/${c.id}`, kind: 'Customers' as const, icon: 'user', t: c.name, s: `${c.city} · ${c.orders} orders` })),

      ...['General', 'Order-taking', 'WhatsApp verification', 'Payments', 'Shipping and delivery', 'Notifications'].map((n) => ({ href: `/settings/${n.toLowerCase().replace(/[^a-z]+/g, '-')}`, kind: 'Settings' as const, icon: 'gear', t: n, s: 'Settings' })),
      { href: '/orders/new', kind: 'Orders' as const, icon: 'plus', t: 'Create order', s: 'Add an order yourself' },
    ];
    const t = q.trim().toLowerCase();
    return all.filter((r) => (kind === 'All' || r.kind === kind) && (!t || `${r.t} ${r.s} ${r.kind}`.toLowerCase().includes(t))).slice(0, 8);
  }, [db, q, kind]);
  return (
    <>
      <div className="dscrim" onClick={onClose} style={{ background: 'rgba(23,28,60,.3)' }} />
      <div className="dspop" role="dialog" aria-label="Search">
        <div className="search"><DI n="search" s={18} /><input ref={input} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" placeholder="Search orders, products, customers…" onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) go(results[0].href); }} /><kbd>Esc</kbd></div>
        <div className="chips" style={{ padding: '12px 14px 10px' }}>{KINDS.map((k) => <button key={k} className={`chip${kind === k ? ' on' : ''}`} type="button" onClick={() => setKind(k)}>{k}</button>)}</div>
        <div className="list" style={{ padding: '0 14px 14px' }} aria-live="polite">
          {results.length ? results.map((r, i) => (
            <button key={r.kind + r.href} className="li" type="button" onClick={() => go(r.href)} style={i === 0 ? { background: 'var(--muted)' } : undefined}>
              <div className="thumb"><DI n={r.icon} s={18} /></div><div className="sp"><b>{r.t}</b><div className="small muted">{r.s}</div></div>
            </button>
          )) : <p className="muted small" style={{ padding: '10px 4px' }}>Nothing matches “{q}”. Try a buyer’s name, an order number or a product.</p>}
        </div>
      </div>
    </>
  );
}
