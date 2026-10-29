import Link from 'next/link';
import { Wordmark } from './bits';
import { TalkToUs } from './TalkToUs';

const columns: { title: string; links: [string, string][] }[] = [
  { title: 'Product', links: [['How it works', '/how-it-works'], ['Example storefront', '/s/meera'], ['Seller dashboard', '/dashboard'], ['Bring your catalogue', '/signup']] },
  { title: 'Sell', links: [['Sell crafts and products', '/signup'], ['Sell courses and classes', '/signup'], ['Sell mentoring and services', '/signup'], ['Create my store', '/signup']] },
  { title: 'Company', links: [['Log in', '/login'], ['Privacy', '/privacy'], ['Terms', '/terms'], ['hello@stoora.in', 'mailto:hello@stoora.in']] },
];

export function SiteFooter() {
  return (
    <footer className="sfoot">
      <div className="sf-card">
        <div className="sf-g">
          <div className="sf-brand">
            <Link className="wordmark sf-logo" href="/" aria-label="Stoora.in home">stoora<i>.in</i></Link>
            <p>Work for yourself. A complete online business for India’s creators, coaches and micro-sellers.</p>
            <Link className="sf-cta" href="/signup">
              Create my store{' '}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
            <span className="sf-soon">iOS &amp; Android apps — coming soon</span>
          </div>
          {columns.map((column) => (
            <div className="sf-col" key={column.title}>
              <h4>{column.title}</h4>
              <ul>
                {column.links.map(([label, href]) => (
                  <li key={label}>{href.startsWith('mailto:') ? <a href={href}>{label}</a> : <Link href={href}>{label}</Link>}</li>
                ))}
                {column.title === 'Company' && <li><TalkToUs /></li>}
              </ul>
            </div>
          ))}
        </div>
        <div className="sf-bt">© 2026 Stoora.in · Made in India</div>
      </div>
    </footer>
  );
}

export { Wordmark };
