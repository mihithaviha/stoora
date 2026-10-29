'use client';
// Analytics: how the shop did, in plain numbers (the dashboard prototype's Analytics screen).
import Link from 'next/link';
import { useState } from 'react';
import { useDash } from '@/components/dash/DashShell';
import { DI, TopRow } from '@/components/dash/parts';
import { Skeleton } from '@/components/ui';
import { rs } from '@/lib/format';
import { useStore } from '@/lib/store';

export default function AnalyticsPage() {
  const { db, ready } = useStore();
  const { openAsk } = useDash();
  const [range, setRange] = useState<'7' | '30'>('7');
  if (!ready) return <div className="dpad" style={{ paddingTop: 20 }}><Skeleton rows={4} height={110} /></div>;

  const d = db.stats.salesByDay;
  const w = db.stats.salesByWeek;
  const labels = range === '7' ? d.map((x) => x.day) : w.map((x) => x.week);
  const sales = range === '7' ? d.map((x) => x.sales) : w.map((x) => x.sales);
  const total = sales.reduce((a, x) => a + x, 0);
  const orders = range === '7' ? d.reduce((a, x) => a + x.orders, 0) : w.reduce((a, x) => a + x.orders, 0);
  const visits = d.reduce((a, x) => a + x.visits, 0);
  const returning = db.customers.length ? Math.round((db.customers.filter((c) => c.orders > 1).length / db.customers.length) * 100) : 0;
  const prev = w.length >= 2 ? w[w.length - 2].sales : 0;
  const change = prev && range === '7' ? Math.round(((total - prev) / prev) * 100) : null;
  const channels = Object.entries(db.stats.sourcesPercent).sort((a, b) => b[1] - a[1]);
  const best = [...db.products].sort((a, b) => b.soldLast30Days - a.soldLast30Days)[0];
  const max = Math.max(...sales, 1);

  return (
    <>
      <TopRow icon="chart" title="Analytics"><Link className="btn line sm" href="/money">Money</Link></TopRow>
      <div className="dpad">
        <div className="aibox" style={{ marginBottom: 12 }}>
          <div className="who"><DI n="spark" s={14} /> In short</div>
          <p style={{ margin: '6px 0 0' }}>
            {total
              ? <>Sales {change != null ? <>are <b>{change >= 0 ? 'up' : 'down'} {Math.abs(change)}%</b> from last week</> : <>were <b>{rs(total)}</b></>}.{channels[0] ? <> Most orders came from {channels[0][0]}.</> : null}{best && best.soldLast30Days ? <> {best.name} is selling fastest.</> : null}</>
              : 'There are no sales in this period yet. Share your shop link to get your first orders.'}
          </p>
        </div>
        <div className="box ctl"><div className="chips">
          <button className={`chip${range === '7' ? ' on' : ''}`} type="button" aria-pressed={range === '7'} onClick={() => setRange('7')}><DI n="cal" s={15} /> Last 7 days</button>
          <button className={`chip${range === '30' ? ' on' : ''}`} type="button" aria-pressed={range === '30'} onClick={() => setRange('30')}>Last 5 weeks</button>
        </div></div>
        <div className="kpis k6">
          {[['Sales', rs(total)], ['Orders', String(orders)], ['Bookings', String(db.bookings.length)], ['Visits', range === '7' ? visits.toLocaleString('en-IN') : '—'], ['Returning buyers', `${returning}%`], ['Conversion', range === '7' && visits ? `${((orders / visits) * 100).toFixed(1)}%` : '—']].map(([k, v]) => <div className="kpi" key={k}><div className="k">{k}</div><div className="v">{v}</div></div>)}
        </div>
        <div className="grid2" style={{ marginTop: 16 }}>
          <div className="card">
            <b style={{ textDecoration: 'underline dotted' }}>Sales over time</b>
            <div className="h2" style={{ margin: '4px 0 10px' }}>{rs(total)}</div>
            <div className="bars" style={{ height: 140 }} role="img" aria-label={`Sales: ${labels.map((l, i) => `${l} ${rs(sales[i])}`).join(', ')}`}>
              {sales.map((v, i) => <i key={labels[i] + i} title={`${labels[i]}: ${rs(v)}`} style={{ height: `${Math.max(4, (v / max) * 100)}%`, opacity: i === sales.length - 1 ? 1 : undefined }} />)}
            </div>
            <div className="row tiny muted" style={{ justifyContent: 'space-between', marginTop: 6 }}>{labels.map((l, i) => <span key={l + i}>{l}</span>)}</div>
          </div>
          <div className="card">
            <b style={{ textDecoration: 'underline dotted' }}>Sales by channel</b>
            {channels.length ? channels.map(([name, pct]) => (
              <div className="row small" key={name} style={{ marginTop: 14 }}>
                <span style={{ width: 84 }}>{name}</span>
                <div className="sp" style={{ height: 10, background: 'var(--muted)', borderRadius: 5 }}><div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)', borderRadius: 5 }} /></div>
                <b style={{ width: 40, textAlign: 'right' }}>{pct}%</b>
              </div>
            )) : <p className="small muted" style={{ marginTop: 12 }}>Channels appear once there are orders.</p>}
          </div>
        </div>
        {db.products.length ? (
          <div className="card" style={{ marginTop: 16 }}>
            <b style={{ textDecoration: 'underline dotted' }}>Best sellers</b> <span className="cap">· units, last 30 days</span>
            {[...db.products].sort((a, b) => b.soldLast30Days - a.soldLast30Days).slice(0, 5).map((p) => {
              const top = Math.max(...db.products.map((x) => x.soldLast30Days), 1);
              return <div className="row small" key={p.id} style={{ marginTop: 14 }}><Link href={`/products/${p.id}`} style={{ width: 220, color: 'inherit' }}>{p.name}</Link><div className="sp" style={{ height: 10, background: 'var(--muted)', borderRadius: 5 }}><div style={{ width: `${(p.soldLast30Days / top) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: 5 }} /></div><b style={{ width: 40, textAlign: 'right' }}>{p.soldLast30Days}</b></div>;
            })}
          </div>
        ) : null}
      </div>
    </>
  );
}
