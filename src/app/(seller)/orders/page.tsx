'use client';
// Orders and bookings: the headline numbers, then one table with filters (the dashboard prototype's Orders screen).
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Art } from '@/components/dash/Art';
import { Chk, DI, DSeg, DateChip, MStrip, PayTag, PaidTag, ShipTag, SrcTag, TopRow } from '@/components/dash/parts';
import { Skeleton, useToast } from '@/components/ui';
import { downloadCsv } from '@/lib/csv';
import { rs } from '@/lib/format';
import { orderFilters, useStore, type OrderFilter } from '@/lib/store';

const FILTERS = Object.keys(orderFilters) as OrderFilter[];
const WHEN = ['Today', 'Upcoming', 'Past', 'Cancelled'] as const;

export default function OrdersPage() {
  const { db, ready } = useStore();
  const router = useRouter();
  const sp = useSearchParams();
  const toast = useToast();
  const tab = sp.get('tab') === 'bookings' ? 'bookings' : 'orders';
  const filter = (FILTERS.find((f) => f === sp.get('filter')) ?? 'All') as OrderFilter;
  const [q, setQ] = useState('');
  const [when, setWhen] = useState<(typeof WHEN)[number]>('Upcoming');
  const [picked, setPicked] = useState<string[]>([]);

  const orders = useMemo(() => {
    const t = q.trim().toLowerCase();
    return db.orders.filter(orderFilters[filter]).filter((o) => !t || `${o.buyer} #${o.id} ${o.source} ${o.city ?? ''}`.toLowerCase().includes(t));
  }, [db.orders, filter, q]);
  const bookings = useMemo(() => {
    const t = q.trim().toLowerCase();
    return db.bookings
      .filter((b) => (when === 'Today' ? b.day === 'Today' : when === 'Upcoming' ? b.status === 'Upcoming' : when === 'Past' ? b.status === 'Done' : false))
      .filter((b) => !t || `${b.buyer} ${b.id}`.toLowerCase().includes(t));
  }, [db.bookings, when, q]);

  if (!ready) return <div className="dpad" style={{ paddingTop: 20 }}><Skeleton rows={4} height={70} /></div>;

  const go = (next: { tab?: string; filter?: string }) => {
    const p = new URLSearchParams();
    if ((next.tab ?? tab) === 'bookings') p.set('tab', 'bookings');
    const f = next.filter ?? (next.tab ? 'All' : filter);
    if (f && f !== 'All') p.set('filter', f);
    router.replace(`/orders${p.toString() ? `?${p}` : ''}`, { scroll: false });
    setPicked([]);
  };
  const isB = tab === 'bookings';
  const itemsOf = (qty: number[]) => qty.reduce((a, b) => a + b, 0);
  const day = db.stats.salesByDay;
  const seg = <DSeg label="Orders or bookings" value={tab} onChange={(v) => go({ tab: v })} options={[{ value: 'orders', label: 'Orders' }, { value: 'bookings', label: 'Bookings' }]} />;

  const exportCsv = () => {
    if (isB) downloadCsv('bookings.csv', [['Booking', 'Service', 'When', 'Buyer', 'Paid', 'Status'], ...db.bookings.map((b) => [b.id, db.services.find((s) => s.id === b.serviceId)?.name, b.when, b.buyer, b.paid ? 'Yes' : 'No', b.status])]);
    else downloadCsv('orders.csv', [['Order', 'Date', 'Buyer', 'Came from', 'Total', 'Paid', 'Shipped', 'Items'], ...orders.map((o) => [o.id, o.createdAt, o.buyer, o.source, o.total, o.paid ? 'Yes' : 'No', o.shipped ? 'Yes' : 'No', itemsOf(o.lines.map((l) => l.qty))])]);
    toast(`${isB ? 'Bookings' : 'Orders'} downloaded.`, { icon: 'download' });
  };
  const allOn = isB ? bookings.length > 0 && bookings.every((b) => picked.includes(b.id)) : orders.length > 0 && orders.every((o) => picked.includes(String(o.id)));
  const toggleAll = (on: boolean) => setPicked(on ? (isB ? bookings.map((b) => b.id) : orders.map((o) => String(o.id))) : []);
  const toggle = (id: string, on: boolean) => setPicked((p) => (on ? [...p, id] : p.filter((x) => x !== id)));

  const bookingPrice = (id: string) => db.services.find((s) => s.id === id)?.price ?? 0;
  const strip = isB
    ? <MStrip lead={<DateChip label="This week" />} items={[['Bookings', String(db.bookings.length)], ['Upcoming', String(db.bookings.filter((b) => b.status === 'Upcoming').length)], ['Paid', rs(db.bookings.filter((b) => b.paid).reduce((a, b) => a + bookingPrice(b.serviceId), 0))], ['Not paid yet', rs(db.bookings.filter((b) => !b.paid).reduce((a, b) => a + bookingPrice(b.serviceId), 0))]]} />
    : <MStrip lead={<DateChip label="This week" />} items={[
        ['Orders', String(db.orders.length), day.map((d) => d.orders)],
        ['Items ordered', String(db.orders.reduce((a, o) => a + itemsOf(o.lines.map((l) => l.qty)), 0))],
        ['Sales', rs(db.orders.reduce((a, o) => a + o.total, 0)), day.map((d) => d.sales)],
        ['Orders shipped', String(db.orders.filter((o) => o.shipped).length)]]} />;

  return (
    <>
      <TopRow icon={isB ? 'cal' : 'orders'} title={isB ? 'Bookings' : 'Orders'}>
        <button className="btn line sm" type="button" onClick={exportCsv}>Export</button>
        {!isB ? <Link className="btn ink sm" href="/orders/new">Create order</Link> : null}
      </TopRow>
      <div className="dpad">
        {strip}
        <div className="box tbox">
          <div className="tbar">
            {seg}
            <div className="chips">
              {isB
                ? WHEN.map((c) => <button key={c} className={`chip${c === when ? ' on' : ''}`} type="button" onClick={() => setWhen(c)}>{c}</button>)
                : FILTERS.map((c) => <button key={c} className={`chip${c === filter ? ' on' : ''}`} type="button" aria-pressed={c === filter} onClick={() => go({ filter: c })}>{c}</button>)}
            </div>
            <span className="sp" />
            <label className="search"><DI n="search" s={16} /><span className="sr">Search {isB ? 'bookings' : 'orders'}</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${isB ? 'bookings' : 'orders'}`} style={{ border: 0, background: 'none', outline: 'none', flex: 1, minWidth: 0, fontSize: 14 }} /></label>
          </div>
          {isB ? (
            <table className="tbl">
              <thead><tr><th className="ck"><Chk on={allOn} onChange={toggleAll} label="Select all bookings" /></th><th>Booking</th><th>Service</th><th>When</th><th>Buyer</th><th>Type</th><th className="r">Price</th><th>Payment</th><th>Status</th></tr></thead>
              <tbody>
                {bookings.map((b) => {
                  const s = db.services.find((x) => x.id === b.serviceId);
                  return (
                    <tr className="rw" key={b.id} onClick={() => router.push(`/bookings/${b.id}`)}>
                      <td className="ck"><Chk on={picked.includes(b.id)} onChange={(v) => toggle(b.id, v)} label={`Select ${b.id}`} /></td>
                      <td><Link href={`/bookings/${b.id}`} onClick={(e) => e.stopPropagation()}><b>{b.id}</b></Link></td>
                      <td><span className="row" style={{ gap: 10 }}><span className="thumb xs"><span className="ms">{s?.icon ?? 'event'}</span></span>{s?.name ?? 'Service'}</span></td>
                      <td className="muted">{b.when}</td><td>{b.buyer}</td><td><span className="tag neutral">{s?.type ?? '—'}</span></td>
                      <td className="r money">{rs(s?.price ?? 0)}</td><td><PaidTag paid={b.paid} /></td><td className="muted">{b.status}</td>
                    </tr>
                  );
                })}
                {!bookings.length && <tr><td colSpan={9} className="muted" style={{ textAlign: 'center', padding: 28 }}><Art k="done" height={90} /><div style={{ marginTop: 8 }}>No bookings here.</div></td></tr>}
              </tbody>
            </table>
          ) : (
            <table className="tbl">
              <thead><tr><th className="ck"><Chk on={allOn} onChange={toggleAll} label="Select all orders" /></th><th>Order</th><th>Date</th><th>Buyer</th><th>Came from</th><th className="r">Total</th><th>Payment</th><th>Shipping</th><th>Items</th></tr></thead>
              <tbody>
                {orders.map((o) => {
                  const n = itemsOf(o.lines.map((l) => l.qty));
                  return (
                    <tr className="rw" key={o.id} onClick={() => router.push(`/orders/${o.id}`)}>
                      <td className="ck"><Chk on={picked.includes(String(o.id))} onChange={(v) => toggle(String(o.id), v)} label={`Select order ${o.id}`} /></td>
                      <td><Link href={`/orders/${o.id}`} onClick={(e) => e.stopPropagation()}><b>#{o.id}</b></Link></td>
                      <td className="muted">{o.createdAt}</td><td>{o.buyer}</td><td><SrcTag s={o.source} /></td>
                      <td className="r money">{rs(o.total)}</td><td><PayTag o={o} /></td><td><ShipTag shipped={o.shipped} /></td><td className="muted">{n} item{n > 1 ? 's' : ''}</td>
                    </tr>
                  );
                })}
                {!orders.length && <tr><td colSpan={9} className="muted" style={{ textAlign: 'center', padding: 28 }}><Art k="done" height={90} /><div style={{ marginTop: 8 }}>{q ? `No orders match “${q}”.` : 'Nothing here — all caught up.'}</div></td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
