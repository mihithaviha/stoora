import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import '../styles/brand/main.css';
import '../styles/brand/features.css';
import '../styles/brand/touch.css';
import { Ic } from '@/components/marketing/bits';
import '../styles/fonts.css';
import { FontPreloads } from '@/components/FontPreloads';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { SiteNav } from '@/components/marketing/SiteNav';

/** Any address that does not exist. It is its own page because the public site and the seller app have separate layouts. */
export const metadata: Metadata = { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://stoora.in'), title: 'Page not found · Stoora.in', robots: { index: false } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#FFFFFF' };

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <head>
        <FontPreloads logo />
      </head>
      <body className="mode-public">
        <SiteNav solidAlways />
        <main id="main">
          <section className="sec" style={{ paddingTop: 'calc(var(--nav) + var(--s6))' }}>
            <div className="wrap stack" style={{ maxWidth: 640, justifyItems: 'start' }}>
              <span className="eyebrow">404</span>
              <h1 className="l-h2">We couldn’t find that page.</h1>
              <p className="lede">The link may be old or mistyped. Here are some places that will help.</p>
              <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--s2)' }}>
                <Link className="btn primary" href="/">Go to the home page<Ic n="arrow_forward" c="sm" /></Link>
                <Link className="btn line" href="/blogs">Read Blogs</Link>
                <Link className="btn line" href="/login">Log in</Link>
              </div>
            </div>
          </section>
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
