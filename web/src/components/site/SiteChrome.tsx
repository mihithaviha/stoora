'use client';
// Public site frame: sticky header with a full-screen mobile menu, and the footer.
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { ButtonLink, Icon } from '../ui';
import { Logo } from '../bits';

const LINKS: [string, string][] = [['Features', '/#features'], ['How it works', '/#how'], ['Pricing', '/#pricing'], ['FAQ', '/#faq'], ['Demo', '/demo']];

export function SiteHeader() {
  const path = usePathname() || '/';
  const [open, setOpen] = useState(useSearchParams().get('menu') === '1');
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return; document.body.style.overflow = 'hidden';
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false); document.addEventListener('keydown', k);
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', k); };
  }, [open]);
  return (
    <>
      <header className="sitebar">
        <div className="wrap">
          <Logo />
          <nav className="links" aria-label="Main">{LINKS.map(([l, h]) => <Link key={l} href={h} className={h === path ? 'on' : ''}>{l}</Link>)}</nav>
          <div className="right">
            <ButtonLink href="/login" kind="quiet" small><span className="hide-m">Log in</span></ButtonLink>
            <ButtonLink href="/onboarding" kind="primary" small>Start free</ButtonLink>
            <button className="ibtn burger" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}><Icon name="menu" /></button>
          </div>
        </div>
      </header>
      {open && (
        <div className="sitemenu" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="sitemenu-h"><Logo /><button className="ibtn" onClick={() => setOpen(false)} aria-label="Close menu"><Icon name="close" /></button></div>
          <nav aria-label="Menu">{LINKS.map(([l, h]) => <Link key={l} href={h} onClick={() => setOpen(false)}>{l}<Icon name="arrow_forward" size="sm" className="t-cap" /></Link>)}
            <Link href="/login" onClick={() => setOpen(false)}>Seller log in<Icon name="arrow_forward" size="sm" className="t-cap" /></Link>
            <Link href="/buyer/login" onClick={() => setOpen(false)}>Buyer log in<Icon name="arrow_forward" size="sm" className="t-cap" /></Link></nav>
          <div className="btns"><ButtonLink href="/onboarding" kind="primary" full>Start your shop free</ButtonLink></div>
        </div>
      )}
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="sitefoot">
      <div className="wrap">
        <div className="cols">
          <div><Logo light /><p style={{ marginTop: 'var(--s2)', maxWidth: '34ch' }}>A shop page, an order book and UPI payments for small sellers in India.</p></div>
          <div><h3>Product</h3><Link href="/#features">Features</Link><Link href="/#pricing">Pricing</Link><Link href="/demo">Demo</Link><Link href="/onboarding">Open a shop</Link></div>
          <div><h3>Log in</h3><Link href="/login">Seller log in</Link><Link href="/buyer/login">Buyer log in</Link><Link href="/s/meera">Sample shop</Link></div>
          <div><h3>Legal</h3><Link href="/privacy">Privacy policy</Link><Link href="/terms">Terms of use</Link><Link href="/seller-consent">Seller consent</Link><Link href="/data-requests">Data requests</Link></div>
        </div>
        <div className="legalrow"><span>© 2026 Stoora. Made in India.</span><span>Sample data is used in all demo pages.</span></div>
      </div>
    </footer>
  );
}
