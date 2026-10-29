'use client';
// Storefront home: shop banner, search, category filter, sort and the product grid, with quick view.
import { useParams, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Chips, EmptyState, Icon, Segmented, Skeleton, Button, Badge } from '@/components/ui';
import { ProductCard, QuickView, shopBase } from '@/components/shop/ShopChrome';
import { Stars } from '@/components/bits';
import { useStore } from '@/lib/store';
import { SHOP_TAGLINE } from '@/lib/catalog';
import { plural } from '@/lib/format';
import type { Product } from '@/lib/types';
import { ShopStore } from '@/components/storefront/ShopStore';

type Sort = 'popular' | 'low' | 'high';

export default function Storefront() {
  const { handle } = useParams<{ handle: string }>(); const sp = useSearchParams(); const { db, ready } = useStore(); const base = shopBase(handle);
  const [cat, setCat] = useState('All'); const [sort, setSort] = useState<Sort>('popular'); const [quick, setQuick] = useState<Product | null>(null);
  const q = (sp.get('q') ?? '').trim().toLowerCase();
  const quickId = sp.get('quick');
  const live = db.products.filter((p) => p.status === 'Active');
  const cats = ['All', ...Array.from(new Set(live.map((p) => p.category)))];
  const list = useMemo(() => {
    const l = live.filter((p) => (cat === 'All' || p.category === cat) && (!q || `${p.name} ${p.category} ${p.color ?? ''}`.toLowerCase().includes(q)));
    return sort === 'low' ? [...l].sort((a, b) => a.price - b.price) : sort === 'high' ? [...l].sort((a, b) => b.price - a.price) : [...l].sort((a, b) => b.soldLast30Days - a.soldLast30Days);
  }, [live, cat, sort, q]);
  const shownQuick = quick ?? (quickId ? live.find((p) => p.id === quickId) ?? null : null);

  if (ready && db.shop.storefront) return <ShopStore base={base} />;
  return (
    <>
      <section className="shop-hero"><div className="wrap">
        <span className="eyebrow">{db.shop.city} · Made by hand</span>
        <h1>{db.shop.name}</h1><p className="lede">{SHOP_TAGLINE}</p>
        <div className="row"><Stars value={4.8} count={77} /><Badge tone="ok" icon="local_shipping">Ships in 2 days</Badge><Badge tone="neutral" icon="undo">7-day returns</Badge></div>
      </div></section>
      <div className="wrap">
        <div className="shop-tools">
          <div className="grow"><Chips label="Category" value={cat} onChange={setCat} options={cats.map((c) => ({ value: c, label: c }))} /></div>
          <Segmented label="Sort by" value={sort} onChange={setSort} options={[{ value: 'popular', label: 'Popular' }, { value: 'low', label: 'Price ↑' }, { value: 'high', label: 'Price ↓' }]} />
        </div>
        {q && <p className="t-body" style={{ marginBottom: 'var(--s2)' }}>{plural(list.length, 'result')} for “{sp.get('q')}”</p>}
        {!ready ? <div className="pgrid2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skel" style={{ aspectRatio: '4/5' }} />)}</div>
          : list.length === 0 ? <EmptyState icon="search_off" title="Nothing matches that" text="Try a different word, or look at everything in the shop." action={<Button small onClick={() => setCat('All')}>Show all products</Button>} />
          : <div className="pgrid2" style={{ paddingBottom: 'var(--s6)' }}>{list.map((p) => <ProductCard key={p.id} p={p} base={base} onQuick={setQuick} />)}</div>}
        {db.services.length > 0 && !q && cat === 'All' && (
          <section style={{ paddingBottom: 'var(--s6)' }}><h2 className="h2" style={{ marginBottom: 'var(--s3)' }}>Classes and sessions</h2>
            <div className="rows">{db.services.map((s) => <div className="li" key={s.id}><span className="thumb"><Icon name={s.icon} /></span><span className="grow"><span className="t">{s.name}</span><span className="s">{s.next}</span></span><span className="money">₹{s.price.toLocaleString('en-IN')}</span></div>)}</div></section>
        )}
      </div>
      <QuickView p={shownQuick} base={base} onClose={() => setQuick(null)} />
    </>
  );
}
