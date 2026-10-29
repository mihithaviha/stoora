'use client';
// Admin frame: same look as the seller app (dark rail/sidebar, white work panel), with its own menu.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Badge, Icon } from '../ui';
import { Logo, StateScreen } from '../bits';
import { useAuth } from '@/lib/auth';
import { ButtonLink } from '../ui';

const NAV: [string, string, string][] = [['/admin', 'dashboard', 'Overview'], ['/admin/enquiries', 'mail', 'Enquiries']];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() || ''; const [menu, setMenu] = useState(false); const auth = useAuth();
  useEffect(() => setMenu(false), [path]);
  const on = (h: string) => (h === '/admin' ? path === '/admin' : path.startsWith(h));
  if (auth.mode === 'live' && auth.ready && auth.role !== 'admin') return <main id="main" style={{ minHeight: '100dvh', background: 'var(--surface)' }}><StateScreen kind="signedout" title="Admins only" text="This area is for the Stoora team. If you should have access, ask an admin to switch your account on (see supabase/README.md)." actions={<ButtonLink href="/dashboard" kind="primary">Go to my dashboard</ButtonLink>} /></main>;
  const title = path.startsWith('/admin/enquiries') ? 'Enquiries' : 'Overview';
  return (
    <>
      <div className="app">
        <aside className="side" aria-label="Admin menu"><div className="side-in">
          <div className="brand"><span className="appicon" aria-hidden="true">S</span><span className="wordmark">stoora<i>.in</i></span></div>
          <div className="ngroup">Admin</div>
          {NAV.map(([h, i, l]) => <Link key={h} className={`nav ${on(h) ? 'on' : ''}`} href={h} aria-current={on(h) ? 'page' : undefined} title={l}><Icon name={i} /><span className="lbl">{l}</span></Link>)}
          <div className="side-foot"><Link className="nav" href="/dashboard" title="Seller view"><Icon name="storefront" /><span className="lbl">Seller view</span></Link><Link className="nav" href="/" title="Back to site"><Icon name="arrow_back" /><span className="lbl">Back to site</span></Link></div>
        </div></aside>
        <main className="main" id="main">
          <header className="top page" style={{ paddingBottom: 'var(--s2)' }}><div className="ttl"><span className="shop-av" aria-hidden="true">S</span><span>Admin · {title}</span></div><div className="acts"><Badge tone="warn" icon="admin_panel_settings">Admin only</Badge></div></header>
          <header className="dbar"><nav className="crumb" aria-label="Breadcrumb"><Link href="/admin">Admin</Link>{title !== 'Overview' && <><Icon name="chevron_right" size="xs" className="t-cap" /><b>{title}</b></>}{title === 'Overview' && <><Icon name="chevron_right" size="xs" className="t-cap" /><b>Overview</b></>}</nav><Badge tone="warn" icon="admin_panel_settings">Admin only</Badge></header>
          <div className="page" key={path}>{children}</div>
        </main>
      </div>
      <nav className="bbar" aria-label="Quick menu">
        <button className="round" onClick={() => setMenu(true)} aria-label="Open menu"><Icon name="menu" /></button>
        <div className="pill" role="navigation" aria-label="Admin">{NAV.map(([h, i, l]) => <Link key={h} href={h} className={on(h) ? 'on' : ''} aria-current={on(h) ? 'page' : undefined}><Icon name={i} /><span>{l}</span></Link>)}</div>
      </nav>
      {menu && (
        <div className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
          <nav className="panel" aria-label="Admin"><div className="brand" style={{ paddingLeft: 'var(--s2)' }}><span className="appicon" aria-hidden="true">S</span><span className="wordmark" style={{ color: 'var(--on-ink)' }}>stoora<i>.in</i></span></div>
            {NAV.map(([h, i, l]) => <Link key={h} className={`nav dnav ${on(h) ? 'on' : ''}`} href={h}><Icon name={i} /><span className="grow"><span>{l}</span></span></Link>)}
            <Link className="nav dnav" href="/dashboard"><Icon name="storefront" /><span className="grow"><span>Seller view</span></span></Link>
            <div className="foot"><button className="btn" onClick={() => setMenu(false)} style={{ padding: '0 var(--s3)' }}><Icon name="close" />Close</button></div></nav>
          <div className="peek" onClick={() => setMenu(false)} aria-hidden="true" />
        </div>
      )}
    </>
  );
}
