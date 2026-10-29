'use client';
// Shows any screen inside a phone or laptop frame. Seller and buyer screens get a demo login first.
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui';
import { BUYER_KEY, Logo, SESSION_KEY } from '@/components/bits';

function Preview() {
  const sp = useSearchParams(); const path = sp.get('path') || '/'; const device = sp.get('device') === 'desktop' ? 'desktop' : 'mobile'; const as = sp.get('as');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      if (as === 'seller' || as === 'buyer') localStorage.setItem(SESSION_KEY, 'demo');
      if (as === 'buyer') localStorage.setItem(BUYER_KEY, JSON.stringify({ name: 'Priya Sharma', phone: '+91 98765 43210' }));
      if (as === 'bag') localStorage.setItem('stoora.bag.v1', JSON.stringify({ lines: [{ productId: 'p3', size: 'M', qty: 1 }, { productId: 'p1', size: 'L', qty: 1 }], wish: ['p2', 'p3'] }));
    } catch { /* ignore */ }
    setReady(true);
  }, [as]);
  const other = device === 'mobile' ? 'desktop' : 'mobile';
  const qs = (d: string) => `/design/preview?path=${encodeURIComponent(path)}&device=${d}${as ? `&as=${as}` : ''}`;
  return (
    <div className="site" style={{ background: 'var(--card)' }}>
      <header className="sitebar"><div className="wrap" style={{ maxWidth: 'none' }}><Logo /><span className="bdg neutral"><code>{path}</code></span><div className="right"><Link className="btn line sm" href="/design"><Icon name="grid_view" size="sm" />All screens</Link><Link className="btn line sm" href={qs(other)}><Icon name={other === 'mobile' ? 'smartphone' : 'laptop'} size="sm" />{other === 'mobile' ? 'Phone' : 'Laptop'}</Link><a className="btn ink sm" href={path} target="_blank" rel="noreferrer"><Icon name="open_in_new" size="sm" />Open</a></div></div></header>
      <main id="main" className="grow-main" style={{ display: 'grid', placeItems: 'start center', padding: 'var(--s4) var(--s2) var(--s5)' }}>
        {ready && (device === 'mobile'
          ? <div style={{ border: '10px solid var(--ink)', borderRadius: 44, overflow: 'hidden', width: 390 + 20, maxWidth: '100%', background: '#fff', boxShadow: 'var(--shadow-warm)' }}><iframe title={`Phone preview of ${path}`} src={path} style={{ width: '100%', height: 780, border: 0, display: 'block' }} /></div>
          : <div style={{ width: '100%', maxWidth: 1360, border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', background: '#fff', boxShadow: 'var(--shadow-warm)' }}><div style={{ height: 34, background: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px' }}>{[0, 1, 2].map((i) => <i key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--line)' }} />)}<span className="cap" style={{ marginLeft: 8 }}>stoora.in{path === '/' ? '' : path}</span></div><iframe title={`Laptop preview of ${path}`} src={path} style={{ width: '100%', height: 800, border: 0, display: 'block' }} /></div>)}
      </main>
    </div>
  );
}
export default function PreviewPage() { return <Suspense fallback={null}><Preview /></Suspense>; }
