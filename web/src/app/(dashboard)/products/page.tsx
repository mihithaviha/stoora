'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Button, ButtonLink, Card, Chips, DemoBar, EmptyState, Icon, PageHeader, SearchBox, Skeleton } from '@/components/ui';
import { plural, rs } from '@/lib/format';
import type { Product } from '@/lib/types';
import { StatusBadge, StockText, Thumb } from '@/components/ProductBits';

type Show = 'All' | 'Live' | 'Draft' | 'Low stock' | 'Sold out';
const SHOW: Record<Show, (p: Product) => boolean> = { All: () => true, Live: (p) => p.status === 'Active', Draft: (p) => p.status === 'Draft', 'Low stock': (p) => p.stock > 0 && p.stock <= 3, 'Sold out': (p) => p.stock === 0 };

export default function ProductsPage() {
  const { db, ready } = useStore(); const router = useRouter();
  const [q, setQ] = useState(''); const [show, setShow] = useState<Show>('All'); const [cat, setCat] = useState('All');
  const cats = ['All', ...Array.from(new Set(db.products.map((p) => p.category)))];
  const t = q.trim().toLowerCase();
  const list = db.products.filter(SHOW[show]).filter((p) => cat === 'All' || p.category === cat).filter((p) => !t || `${p.name} ${p.color ?? ''} ${p.category}`.toLowerCase().includes(t));
  const live = db.products.filter((p) => p.status === 'Active').length; const out = db.products.filter((p) => p.stock === 0).length;

  return (
    <>
      <DemoBar />
      <PageHeader title="Products" lede={`${plural(live, 'product')} live on your shop.${out ? ` ${out} sold out.` : ''}`} actions={<ButtonLink href="/products/new" kind="primary" icon="add">Add product</ButtonLink>} />
      <div className="stack">
        <Card className="stack tight">
          <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--s2)' }}>
            <div style={{ flex: '1 1 220px' }}><SearchBox id="prod-q" value={q} onChange={setQ} placeholder="Search products" /></div>
            <label className="sr" htmlFor="prod-cat">Category</label>
            <select id="prod-cat" className="input sel-sm" value={cat} onChange={(e) => setCat(e.target.value)} style={{ width: 'auto' }}>{cats.map((c) => <option key={c} value={c}>{c === 'All' ? 'All categories' : c}</option>)}</select>
          </div>
          <Chips label="Show" value={show} onChange={setShow} options={(Object.keys(SHOW) as Show[]).map((s) => ({ value: s, label: s, count: db.products.filter(SHOW[s]).length }))} />
        </Card>
        {!ready ? <Skeleton rows={4} /> : !list.length ? (
          <Card>{t || show !== 'All' || cat !== 'All'
            ? <EmptyState icon="search_off" title="No products match" text="Check the spelling, or clear the filters." action={<Button small onClick={() => { setQ(''); setShow('All'); setCat('All'); }}>Clear filters</Button>} />
            : <EmptyState icon="sell" title="Add your first product" text="A photo, a name and a price is enough to start selling." action={<ButtonLink href="/products/new" kind="primary" small>Add product</ButtonLink>} />}</Card>
        ) : (
          <>
            <div className="tbl-wrap only-wide"><table className="tbl">
              <thead><tr><th>Product</th><th>Status</th><th>Stock</th><th className="r">Price</th><th className="r">Sold in 30 days</th></tr></thead>
              <tbody>{list.map((p) => (
                <tr key={p.id} tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => router.push(`/products/${p.id}`)} onKeyDown={(e) => e.key === 'Enter' && router.push(`/products/${p.id}`)}>
                  <td><span className="row"><Thumb p={p} sm /><span><b>{p.name}</b><span className="cap" style={{ display: 'block' }}>{p.category}{p.sizes.length ? ' · ' + p.sizes.join(', ') : ''}</span></span></span></td>
                  <td><StatusBadge p={p} /></td><td><StockText p={p} /></td><td className="r num"><b>{rs(p.price)}</b></td><td className="r num">{p.soldLast30Days}</td>
                </tr>))}</tbody>
            </table></div>
            <div className="rows only-narrow">{list.map((p) => (
              <Link key={p.id} className="li" href={`/products/${p.id}`}><Thumb p={p} />
                <span className="grow"><span className="t">{p.name}</span><span className="row" style={{ gap: 'var(--s1)', marginTop: 4, flexWrap: 'wrap' }}><StatusBadge p={p} /><StockText p={p} /></span></span>
                <span className="money">{rs(p.price)}</span></Link>))}</div>
          </>
        )}
      </div>
    </>
  );
}
