'use client';
// Admin overview: platform numbers, shops, work queues (identity checks, data requests) and system health.
// API_TODO: GET /api/admin/summary, /api/admin/shops, /api/admin/kyc, /api/admin/data-requests (admin role only).
import Link from 'next/link';
import { useState } from 'react';
import { Avatar, Badge, Button, Card, DemoBar, Icon, PageHeader, useToast } from '@/components/ui';
import { SAMPLE_ENQUIRIES } from '@/lib/enquiries';

const SHOPS: [string, string, string, 'ok' | 'warn' | 'bad', string, string][] = [
  ['Meera Studio', 'Jaipur', 'Active', 'ok', '₹1,28,460', '2 min ago'],
  ['Clay & Co', 'Pondicherry', 'Active', 'ok', '₹64,210', '1 hr ago'],
  ['Tara Bakes', 'Pune', 'Identity check', 'warn', '₹0', 'Today'],
  ['Zen Yoga Hall', 'Bengaluru', 'Active', 'ok', '₹38,900', '3 hr ago'],
  ['Loom & Thread', 'Surat', 'Paused', 'bad', '₹12,040', '9 days ago'],
  ['Kavya Jewels', 'Hyderabad', 'Active', 'ok', '₹91,330', 'Yesterday'],
];
const KYC: [string, string, string][] = [['Tara Bakes', 'PAN and bank account', 'Submitted 2 hr ago'], ['Noor Ceramics', 'GST certificate', 'Submitted yesterday'], ['Rohit Tutors', 'PAN and bank account', 'Submitted 2 days ago']];
const DATA: [string, string, string, number][] = [['DR-482113', 'Delete my data · buyer', 'Priya S.', 24], ['DR-482097', 'See my data · seller', 'Imran Q.', 18], ['DR-482042', 'Withdraw consent · buyer', 'Anita R.', 5]];

export default function AdminOverview() {
  const toast = useToast(); const [kyc, setKyc] = useState(KYC); const [data, setData] = useState(DATA);
  const newEnq = SAMPLE_ENQUIRIES.filter((e) => e.status === 'New').length;
  return (
    <>
      <DemoBar>Sample admin data: these numbers are made up to show the layout.</DemoBar>
      <PageHeader title="Overview" lede="What needs the Stoora team today." actions={<Link className="btn primary" href="/admin/enquiries"><Icon name="mail" />Open enquiries{newEnq ? ` (${newEnq})` : ''}</Link>} />
      <div className="stack">
        <div className="adm-kpis">{[['Active shops', '1,284', '+36 this week', 'up'], ['Orders today', '3,912', '+8% vs yesterday', 'up'], ['Payments received', '₹41.2 L', 'Last 7 days', ''], ['Open enquiries', String(newEnq + 1), `${newEnq} new`, '']].map(([k, v, d, t]) => (
          <div className="tile" key={k}><span className="k">{k}</span><span className="v big">{v}</span><span className={`d ${t}`}>{t === 'up' && <Icon name="trending_up" size="xs" />}{d}</span></div>))}</div>
        <div className="adm-grid">
          <div className="stack">
            <Card title="Shops" icon="storefront" aside={<span className="cap">Last 30 days</span>} flush>
              <div className="tbl-wrap" style={{ border: 0, borderRadius: 0, boxShadow: 'none' }}><table className="tbl"><thead><tr><th>Shop</th><th>City</th><th>Status</th><th className="r">Sales</th><th>Last order</th></tr></thead>
                <tbody>{SHOPS.map(([n, c, s, t, g, w]) => <tr key={n}><td><span className="row"><Avatar name={n} size={32} /><b>{n}</b></span></td><td>{c}</td><td><Badge tone={t} icon={t === 'ok' ? 'check_circle' : t === 'warn' ? 'schedule' : 'pause_circle'}>{s}</Badge></td><td className="r"><b className="num">{g}</b></td><td>{w}</td></tr>)}</tbody></table></div>
            </Card>
            <Card title="Identity and bank checks" icon="badge" aside={<span className="cap">{kyc.length} waiting</span>}>
              {kyc.length === 0 ? <p className="t-soft">Nothing waiting. Nice work.</p> : <div className="queue">{kyc.map(([n, d, w]) => (
                <div className="q-row" key={n}><Avatar name={n} /><span className="grow"><b>{n}</b><span className="cap">{d} · {w}</span></span>
                  <Button small kind="quiet" onClick={() => { setKyc(kyc.filter((x) => x[0] !== n)); toast(`${n} sent back for changes.`, { icon: 'undo' }); }}>Ask for changes</Button><Button small kind="ink" icon="check" onClick={() => { setKyc(kyc.filter((x) => x[0] !== n)); toast(`${n} approved.`, { icon: 'verified' }); }}>Approve</Button></div>))}</div>}
            </Card>
          </div>
          <div className="stack">
            <Card title="Data requests" icon="shield_person" aside={<span className="cap">30-day limit</span>}>
              {data.length === 0 ? <p className="t-soft">No open requests.</p> : <div className="queue">{data.map(([id, what, who, left]) => (
                <div className="q-row" key={id}><span className="grow"><b>{what}</b><span className="cap">{id} · {who}</span></span><Badge tone={left <= 7 ? 'bad' : 'neutral'} icon="schedule">{left} days left</Badge><Button small kind="quiet" onClick={() => { setData(data.filter((x) => x[0] !== id)); toast(`${id} marked as done.`, { icon: 'check_circle' }); }}>Done</Button></div>))}</div>}
            </Card>
            <Card title="System health" icon="monitor_heart"><div className="queue">{[['Payments provider', 'Receiving events', 'ok'], ['Webhook queue', '0 waiting', 'ok'], ['Email sending', 'Delayed: 4 min', 'warn'], ['Database backup', 'Last run 02:00', 'ok']].map(([n, s, t]) => <div className="q-row" key={n}><span className="grow"><b>{n}</b></span><span className="cap"><span className={`dot-s ${t}`} />{s}</span></div>)}</div></Card>
          </div>
        </div>
      </div>
    </>
  );
}
