'use client';
// App frame: dark sidebar (desktop), breadcrumb bar, phone top bar + floating bottom bar + menu drawer,
// search (Ctrl K), alerts and the assistant panel.
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { NAV, crumbsFor, isOn } from '@/lib/nav';
import { rs } from '@/lib/format';
import { AssistantPanel, useAssistant } from './Assistant';
import { Dialog, Icon, SearchBox } from './ui';

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() || '/';
  const sp = useSearchParams();
  const src = sp.get('src');
  const { db } = useStore();
  const a = useAssistant();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [alerts, setAlerts] = useState(false);

  // Close overlays on navigation.
  useEffect(() => { setMenu(false); setSearch(false); setAlerts(false); }, [path, src]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(true); } };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, []);
  useEffect(() => { if (!menu) return; const k = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false); document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [menu]);

  if (path === '/login') return <>{children}</>;

  const { trail, title } = crumbsFor(path, (s, i, parts) => {
    if (parts[0] === 'orders' && i === 1 && /^\d+$/.test(s)) return '#' + s;
    if (parts[0] === 'products' && i === 1) return s === 'new' ? 'New product' : db.products.find((p) => p.id === s)?.name;
    if (parts[0] === 'customers' && i === 1) return db.customers.find((c) => c.id === s)?.name;
    return undefined;
  });
  const back = trail.length ? trail[trail.length - 1] : null;
  const unreadAlerts = db.alerts.length;
  const unreadChats = db.chats.some((c) => c.unread);
  const tab = (href: string, icon: string, label: string, dot?: boolean) => {
    const on = href === '/' ? path === '/' : path.startsWith(href);
    return <Link href={href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}><Icon name={icon} /><span>{label}</span>{dot && <i className="bd" aria-label="new" />}</Link>;
  };
  const onAssistantPage = path === '/assistant';

  return (
    <>
      <div className="app">
        <aside className="side" aria-label="Main menu">
          <div className="side-in">
            <Link className="brand" href="/" aria-label="stoora.in home"><span className="appicon" aria-hidden="true">S</span><span className="wordmark">stoora<i>.in</i></span></Link>
            <button className="sbtn-search" onClick={() => setSearch(true)} title="Search"><Icon name="search" size="sm" /><span className="txt">Search</span><kbd>Ctrl K</kbd></button>
            {NAV.map(([g, items]) => (
              <React.Fragment key={g}>
                <div className="ngroup">{g}</div>
                {items.map((n) => {
                  const on = isOn(n, path, src); const c = n.count?.(db) ?? 0;
                  return (
                    <React.Fragment key={n.href}>
                      <Link className={`nav ${on ? 'on' : ''}`} href={n.href} aria-current={on ? 'page' : undefined} title={`${n.label} — ${n.desc}`}>
                        <Icon name={n.icon} /><span className="lbl">{n.label}</span>{c > 0 && <span className={`cnt ${n.hot ? 'hot' : ''}`} aria-label={`${c} new`}>{c}</span>}
                      </Link>
                      {on && n.sub?.map((s) => <Link key={s.href} className={`nav sub ${path.startsWith(s.href) ? 'on' : ''}`} href={s.href}>{s.label}</Link>)}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            ))}
            <div className="side-foot">
              <button className="shopbtn" onClick={() => setAlerts(true)} title="Alerts"><span className="shop-av" aria-hidden="true">{db.shop.name[0]?.toUpperCase()}</span><span className="txt grow"><b>{db.shop.name}</b><small>stoora.in/{db.shop.handle}</small></span><Icon name="notifications" size="sm" className="txt" /></button>
            </div>
          </div>
        </aside>

        <main className="main" id="main">
          <header className="top page" style={{ paddingBottom: 'var(--s2)' }}>
            {back
              ? <><Link className="ibtn" href={back[1]} aria-label={`Back to ${back[0]}`}><Icon name="arrow_back" /></Link><div className="ttl"><span className="t-body">{back[0]}</span></div></>
              : <div className="ttl"><span className="shop-av" aria-hidden="true">{db.shop.name[0]?.toUpperCase()}</span><span>{db.shop.name}</span></div>}
            <div className="acts">
              <button className="ibtn" onClick={() => setSearch(true)} aria-label="Search"><Icon name="search" size="sm" /></button>
              <button className="ibtn" onClick={() => setAlerts(true)} aria-label={`Alerts, ${unreadAlerts} new`}><Icon name="notifications" size="sm" />{unreadAlerts > 0 && <span className="dotn">{unreadAlerts}</span>}</button>
            </div>
          </header>
          <header className="dbar">
            <nav className="crumb" aria-label="Breadcrumb">{trail.map(([l, h]) => <React.Fragment key={h}><Link href={h}>{l}</Link><Icon name="chevron_right" size="xs" className="t-cap" /></React.Fragment>)}<b>{title}</b></nav>
            {!onAssistantPage && <button className="dask" onClick={() => a.open()} aria-label="Ask Stoora"><span className="smark xs" aria-hidden="true">S</span>Ask Stoora anything<kbd>Ctrl J</kbd></button>}
            <button className="ibtn flat" onClick={() => setAlerts(true)} aria-label={`Alerts, ${unreadAlerts} new`}><Icon name="notifications" size="sm" />{unreadAlerts > 0 && <span className="dotn">{unreadAlerts}</span>}</button>
          </header>
          <div className="page" key={path}>{children}</div>
        </main>
        <AssistantPanel onPage={onAssistantPage} />
      </div>

      <nav className={`bbar ${path.startsWith('/orders/new') ? 'hide' : ''}`} aria-label="Quick menu">
        <button className="round" onClick={() => setMenu(true)} aria-label="Open menu"><Icon name="menu" /></button>
        <div className="pill" role="navigation" aria-label="Main">{tab('/', 'home', 'Home')}{tab('/orders', 'inbox', 'Orders')}{tab('/products', 'sell', 'Products')}{tab('/chats', 'forum', 'Chats', unreadChats)}</div>
        <button className="round" onClick={() => a.open()} aria-label="Ask Stoora"><span className="smark" aria-hidden="true">S</span></button>
      </nav>

      {menu && (
        <div className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
          <nav className="panel" aria-label="Main">
            <div className="brand" style={{ paddingLeft: 'var(--s2)' }}><span className="appicon" aria-hidden="true">S</span><span className="wordmark" style={{ color: 'var(--on-ink)' }}>stoora<i>.in</i></span></div>
            <button className="sbtn-search" onClick={() => { setMenu(false); setSearch(true); }} style={{ margin: 'var(--s1) 0 var(--s2)' }}><Icon name="search" size="sm" />Search everything</button>
            {NAV.map(([g, items]) => (
              <React.Fragment key={g}>
                <div className="ngroup">{g}</div>
                {items.map((n) => <Link key={n.href} className={`nav dnav ${isOn(n, path, src) ? 'on' : ''}`} href={n.href} onClick={() => setMenu(false)}><Icon name={n.icon} /><span className="grow"><span>{n.label}</span><small>{n.desc}</small></span></Link>)}
              </React.Fragment>
            ))}
            <div className="foot"><button className="btn" onClick={() => setMenu(false)} style={{ padding: '0 var(--s3)' }}><Icon name="close" />Close</button></div>
          </nav>
          <div className="peek" onClick={() => setMenu(false)} aria-hidden="true" />
        </div>
      )}

      <SearchDialog open={search} onClose={() => setSearch(false)} />
      <Dialog open={alerts} onClose={() => setAlerts(false)} title="Alerts" footer={<Link className="btn line full" href="/notifications" onClick={() => setAlerts(false)}>See all notifications</Link>}>
        <div className="rows">
          {db.alerts.map((al) => (
            <Link key={al.id} className="li" href={al.href} onClick={() => setAlerts(false)} style={{ background: 'var(--inner)' }}>
              <span className="thumb sm"><Icon name={al.icon} size="sm" /></span>
              <span className="grow"><span className="t">{al.title}</span><span className="s">{al.detail}</span></span><span className="cap">{al.when}</span>
            </Link>
          ))}
        </div>
      </Dialog>
    </>
  );
}

/** Ctrl K search across pages, orders, products and customers in this shop. */
function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db } = useStore(); const router = useRouter();
  const [q, setQ] = useState('');
  useEffect(() => { if (!open) setQ(''); }, [open]);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    const pages = NAV.flatMap(([, items]) => items).map((n) => ({ href: n.href, icon: n.icon, t: n.label, s: n.desc, kind: 'Page' }));
    const all = [
      ...pages,
      { href: '/orders/new', icon: 'add', t: 'Create order', s: 'Add an order yourself or with AI', kind: 'Action' },
      ...db.orders.map((o) => ({ href: `/orders/${o.id}`, icon: 'receipt_long', t: `Order #${o.id} · ${o.buyer}`, s: `${rs(o.total)} · ${o.paid ? 'Paid' : 'Not paid'}${o.shipped ? ' · Shipped' : ''}`, kind: 'Order' })),
      ...db.products.map((p) => ({ href: `/products/${p.id}`, icon: p.icon, t: p.name, s: `${rs(p.price)} · ${p.stock === 0 ? 'Sold out' : p.stock + ' in stock'}`, kind: 'Product' })),
      ...db.customers.map((c) => ({ href: `/customers/${c.id}`, icon: 'person', t: c.name, s: `${c.city} · ${c.orders} orders`, kind: 'Customer' })),
    ];
    if (!t) return all.slice(0, 8);
    return all.filter((r) => (r.t + ' ' + r.s + ' ' + r.kind).toLowerCase().includes(t)).slice(0, 12);
  }, [q, db]);
  return (
    <Dialog open={open} onClose={onClose} title="Search">
      <form onSubmit={(e) => { e.preventDefault(); if (results[0]) { router.push(results[0].href); onClose(); } }}>
        <SearchBox id="global-q" value={q} onChange={setQ} placeholder="Search orders, products, customers, pages" />
      </form>
      <div className="rows" style={{ marginTop: 'var(--s2)' }} aria-live="polite">
        {results.length ? results.map((r) => (
          <Link key={r.kind + r.href} className="li" href={r.href} onClick={onClose}>
            <span className="thumb sm"><Icon name={r.icon} size="sm" /></span>
            <span className="grow"><span className="t">{r.t}</span><span className="s">{r.s}</span></span><span className="cap">{r.kind}</span>
          </Link>
        )) : <p className="t-body" style={{ padding: 'var(--s3) 0' }}>Nothing matches “{q}”. Try a buyer’s name, an order number or a product.</p>}
      </div>
    </Dialog>
  );
}
