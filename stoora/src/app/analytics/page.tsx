'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { BarChart, Card, DemoBar, HBars, LineChart, PageHeader, Segmented, Skeleton } from '@/components/ui';
import { useAssistant } from '@/components/Assistant';
import { rs } from '@/lib/format';

export default function AnalyticsPage() {
  const { db, ready } = useStore(); const a = useAssistant();
  const [range, setRange] = useState<'7' | '30'>('7');
  if (!ready) return <Skeleton rows={4} height={110} />;
  const d = db.stats.salesByDay; const w = db.stats.salesByWeek;
  const labels = range === '7' ? d.map((x) => x.day) : w.map((x) => x.week);
  const sales = range === '7' ? d.map((x) => x.sales) : w.map((x) => x.sales);
  const orders = range === '7' ? d.reduce((s, x) => s + x.orders, 0) : w.reduce((s, x) => s + x.orders, 0);
  const total = sales.reduce((s, x) => s + x, 0);
  const visits7 = d.reduce((s, x) => s + x.visits, 0);
  const top = [...db.products].sort((x, y) => y.soldLast30Days - x.soldLast30Days).slice(0, 5);
  return (
    <>
      <DemoBar />
      <PageHeader title="Analytics" lede="How your shop did. Sales are order totals, before payout fees." actions={<Segmented label="Time range" value={range} onChange={setRange} options={[{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 5 weeks' }]} />} />
      <div className="stack">
        <Card><div className="tiles four">
          <div className="tile"><span className="k">Sales</span><span className="v big">{rs(total)}</span><span className="d">{range === '7' ? 'Last 7 days' : 'Last 5 weeks'}</span></div>
          <div className="tile"><span className="k">Orders</span><span className="v big">{orders}</span><span className="d">Average {rs(orders ? total / orders : 0)}</span></div>
          <div className="tile"><span className="k">Visits</span><span className="v big">{range === '7' ? visits7 : '—'}</span><span className="d">{range === '7' ? 'Last 7 days' : 'Only tracked for 7 days'}</span></div>
          <div className="tile"><span className="k">Visits that bought</span><span className="v big">{range === '7' ? ((d.reduce((s, x) => s + x.orders, 0) / visits7) * 100).toFixed(1) + '%' : '—'}</span><span className="d">Orders ÷ visits</span></div>
        </div></Card>
        <Card title={`Sales by ${range === '7' ? 'day' : 'week'}`} aside={<span className="cap">The last bar is still going</span>}>
          {range === '7' ? <LineChart labels={labels} values={sales} label="Sales by day" /> : <BarChart labels={labels} values={sales} label="Sales by week" />}
        </Card>
        <div className="grid2">
          <Card title="Best sellers" aside={<span className="cap">Units, last 30 days</span>}><HBars rows={top.map((p) => [p.name, p.soldLast30Days])} /></Card>
          <Card title="Where orders came from" aside={<span className="cap">Share of orders, 30 days</span>}><HBars rows={Object.entries(db.stats.sourcesPercent)} fmt={(v) => v + '%'} /></Card>
        </div>
        <Card title="Orders per day" aside={<span className="cap">Last 7 days</span>}><BarChart labels={d.map((x) => x.day)} values={d.map((x) => x.orders)} label="Orders per day" money={false} /></Card>
        <div className="sugg2"><button onClick={() => a.open('Which products are selling best?')}>Ask Stoora: which products sell best?</button><button onClick={() => a.open('How is my shop performing today?')}>Ask Stoora: how am I doing today?</button></div>
      </div>
    </>
  );
}
