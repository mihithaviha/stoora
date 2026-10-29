'use client';
// Products and services: the headline numbers, then one table (the dashboard prototype's Products screen).
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Art } from '@/components/dash/Art';
import { Chk, DI, DSeg, DateChip, MStrip, Ms, TopRow } from '@/components/dash/parts';
import { Skeleton, useToast } from '@/components/ui';
import { downloadCsv } from '@/lib/csv';
import { rs } from '@/lib/format';
import { useStore } from '@/lib/store';

export default function ProductsPage() {
  const { db, ready } = useStore();
  const router = useRouter();
  const toast = useToast();
  const isS = useSearchParams().get('tab') === 'services';
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string[]>([]);

  const products = useMemo(() => db.products.filter((p) => !q.trim() || `${p.name} ${p.category} ${p.color ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())), [db.products, q]);
  const services = useMemo(() => db.services.filter((s) => !q.trim() || `${s.name} ${s.type}`.toLowerCase().includes(q.trim().toLowerCase())), [db.services, q]);
  if (!ready) return <div className="dpad" style={{ paddingTop: 20 }}><Skeleton rows={4} height={70} /></div>;

  const live = db.products.filter((p) => p.status === 'Active');
  const low = live.filter((p) => p.stock > 0 && p.stock <= 3).length;
  const out = live.filter((p) => p.stock === 0).length;
  const sold = db.products.reduce((a, p) => a + p.soldLast30Days, 0);
  const views = db.products.reduce((a, p) => a + (p.viewsYesterday ?? 0), 0);
  const earned = db.bookings.filter((b) => b.paid).reduce((a, b) => a + (db.services.find((s) => s.id === b.serviceId)?.price ?? 0), 0);
  const seg = <DSeg label="Products or services" value={isS ? 'services' : 'products'} onChange={(v) => { router.replace(v === 'services' ? '/products?tab=services' : '/products', { scroll: false }); setPicked([]); }} options={[{ value: 'products', label: 'Products' }, { value: 'services', label: 'Services' }]} />;
  const ids = isS ? services.map((s) => s.id) : products.map((p) => p.id);
  const allOn = ids.length > 0 && ids.every((i) => picked.includes(i));
  const toggle = (id: string, on: boolean) => setPicked((p) => (on ? [...p, id] : p.filter((x) => x !== id)));

  const exportCsv = () => {
    if (isS) downloadCsv('services.csv', [['Service', 'Type', 'Price', 'Next slot'], ...db.services.map((s) => [s.name, s.type, s.price, s.next])]);
    else downloadCsv('products.csv', [['Product', 'Status', 'Stock', 'Price', 'Category', 'Sold in 30 days'], ...db.products.map((p) => [p.name, p.status, p.stock, p.price, p.category, p.soldLast30Days])]);
    toast(`${isS ? 'Services' : 'Products'} downloaded.`, { icon: 'download' });
  };

  return (
    <>
      <TopRow icon="tag" title={isS ? 'Services' : 'Products'}>
        {!isS ? <Link className="btn line sm" href="/products/import">Import</Link> : null}
        <button className="btn line sm" type="button" onClick={exportCsv}>Export</button>
        <Link className="btn ink sm" href={isS ? '/products/service/new' : '/products/new'}>{isS ? 'Add service' : 'Add product'}</Link>
      </TopRow>
      <div className="dpad">
        {isS
          ? <MStrip lead={<DateChip label="This week" />} items={[['Services', String(db.services.length)], ['Classes', String(db.services.filter((s) => s.type === 'Class').length)], ['Bookings', String(db.bookings.length)], ['Earned', rs(earned)]]} />
          : <MStrip lead={<DateChip label="This week" />} items={[['Sold', `${sold} items`], ['Low on stock', <span key="l" className={low ? 'low' : ''}>{low} {low === 1 ? 'item' : 'items'}</span>], ['Out of stock', <span key="o" className={out ? 'low' : ''}>{out} {out === 1 ? 'item' : 'items'}</span>], ['Views', views.toLocaleString('en-IN')]]} />}
        <div className="box tbox">
          <div className="tbar">
            {seg}<span className="sp" />
            <label className="search"><DI n="search" s={16} /><span className="sr">Search {isS ? 'services' : 'products'}</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${isS ? 'services' : 'products'}`} style={{ border: 0, background: 'none', outline: 'none', flex: 1, minWidth: 0, fontSize: 14 }} /></label>
          </div>
          {isS ? (
            <table className="tbl">
              <thead><tr><th className="ck"><Chk on={allOn} onChange={(on) => setPicked(on ? ids : [])} label="Select all services" /></th><th>Service</th><th>Type</th><th className="r">Price</th><th>Next slot</th></tr></thead>
              <tbody>
                {services.map((s) => (
                  <tr className="rw" key={s.id} onClick={() => router.push(`/products/service/${s.id}`)}>
                    <td className="ck"><Chk on={picked.includes(s.id)} onChange={(v) => toggle(s.id, v)} label={`Select ${s.name}`} /></td>
                    <td><span className="row" style={{ gap: 10 }}><span className="thumb xs"><Ms n={s.icon} /></span><b>{s.name}</b></span></td>
                    <td><span className="tag neutral">{s.type}</span></td><td className="r money">{rs(s.price)}</td><td className="muted">{s.next || '—'}</td>
                  </tr>
                ))}
                {!services.length && <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 28 }}><Art k="product" height={90} /><div style={{ marginTop: 8 }}>{q ? `No services match “${q}”.` : 'No services yet. Add a class, a 1-on-1 session or a download.'}</div></td></tr>}
              </tbody>
            </table>
          ) : (
            <table className="tbl">
              <thead><tr><th className="ck"><Chk on={allOn} onChange={(on) => setPicked(on ? ids : [])} label="Select all products" /></th><th>Product</th><th>Status</th><th>Stock</th><th className="r">Price</th><th>Category</th><th className="r">Sold (30 days)</th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr className="rw" key={p.id} onClick={() => router.push(`/products/${p.id}`)}>
                    <td className="ck"><Chk on={picked.includes(p.id)} onChange={(v) => toggle(p.id, v)} label={`Select ${p.name}`} /></td>
                    <td><span className="row" style={{ gap: 10 }}><span className="thumb xs">{p.photos?.[0] ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : <Ms n={p.icon} />}</span><b>{p.name}</b></span></td>
                    <td>{p.status === 'Active' ? <span className="tag ok">Active</span> : <span className="tag neutral">Draft</span>}</td>
                    <td className={p.stock <= 3 ? 'low' : ''}>{p.stock === 0 ? 'Sold out' : `${p.stock} in stock`}</td>
                    <td className="r money">{rs(p.price)}</td><td className="muted">{p.category}</td><td className="r muted">{p.soldLast30Days}</td>
                  </tr>
                ))}
                {!products.length && <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 28 }}><Art k="product" height={90} /><div style={{ marginTop: 8 }}>{q ? `No products match “${q}”.` : 'No products yet. Add your first one to start selling.'}</div></td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
