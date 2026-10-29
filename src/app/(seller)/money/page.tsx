'use client';
// Money: what has come in, what is still owed and when the next payout is (the dashboard prototype's Money screen).
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DI, TopRow } from '@/components/dash/parts';
import { MessageDialog } from '@/components/MessageDialog';
import { Skeleton, useToast } from '@/components/ui';
import { downloadCsv } from '@/lib/csv';
import { rs } from '@/lib/format';
import { moneyWaiting, useStore } from '@/lib/store';

type Range = 'today' | 'week' | 'month';
const LABEL: Record<Range, string> = { today: 'Today', week: 'This week', month: 'This month' };

export default function MoneyPage() {
  const { db, ready } = useStore();
  const router = useRouter();
  const toast = useToast();
  const [range, setRange] = useState<Range>('today');
  const [q, setQ] = useState('');
  const [remind, setRemind] = useState<null | { who: string; text: string; phone?: string }>(null);
  if (!ready) return <div className="dpad" style={{ paddingTop: 20 }}><Skeleton rows={4} height={90} /></div>;

  const s = db.stats;
  const received = { today: s.receivedToday, week: s.receivedWeek, month: s.receivedMonth }[range];
  const refunds = { today: 0, week: s.refundsWeek, month: s.refundsMonth }[range];
  const waiting = moneyWaiting(db);
  const waitingTotal = waiting.reduce((a, w) => a + w.amount, 0);

  // every payment in one list: money received, then money still to come
  type Row = { who: string; ref: string; amount: number; method: string; when: string; ok: boolean; href: string; phone?: string };
  const rows: Row[] = [
    ...db.orders.filter((o) => o.paid).map((o) => ({ who: o.buyer, ref: `#${o.id}`, amount: o.total, method: o.method === 'cash' ? 'Cash' : 'UPI', when: o.createdAt, ok: true, href: `/orders/${o.id}`, phone: o.phone })),
    ...db.bookings.filter((b) => b.paid).map((b) => ({ who: b.buyer, ref: b.id, amount: db.services.find((x) => x.id === b.serviceId)?.price ?? 0, method: 'UPI', when: b.when, ok: true, href: `/bookings/${b.id}` })),
    ...db.orders.filter((o) => !o.paid && o.method === 'upi').map((o) => ({ who: o.buyer, ref: `#${o.id}`, amount: o.total, method: 'UPI link', when: o.createdAt, ok: false, href: `/orders/${o.id}`, phone: o.phone })),
    ...db.bookings.filter((b) => !b.paid).map((b) => ({ who: b.buyer, ref: b.id, amount: db.services.find((x) => x.id === b.serviceId)?.price ?? 0, method: 'UPI link', when: b.when, ok: false, href: `/bookings/${b.id}` })),
  ].filter((r) => !q.trim() || `${r.who} ${r.ref}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <TopRow icon="wallet" title="Money">
        <button className="btn line sm" type="button" onClick={() => { downloadCsv('payments.csv', [['Buyer', 'For', 'Method', 'When', 'Amount', 'Status'], ...rows.map((r) => [r.who, r.ref, r.method, r.when, r.amount, r.ok ? 'Received' : 'Pending'])]); toast('Payments downloaded.', { icon: 'download' }); }}>Export</button>
        <Link className="btn ink sm" href="/settings/payments">Payout settings</Link>
      </TopRow>
      <div className="dpad">
        <div className="box ctl"><div className="chips">{(Object.keys(LABEL) as Range[]).map((r) => <button key={r} className={`chip${range === r ? ' on' : ''}`} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>{r === 'today' ? <DI n="cal" s={15} /> : null} {LABEL[r]}</button>)}</div></div>
        <div className="kpis k4">
          <div className="kpi"><div className="k">Received</div><div className="v">{rs(received)}</div></div>
          <div className="kpi"><div className="k">Pending UPI</div><div className="v">{rs(waitingTotal)}</div></div>
          <div className="kpi"><div className="k">Next payout</div><div className="v">{rs(s.payout.amount)}</div></div>
          <div className="kpi"><div className="k">Refunds</div><div className="v">{rs(refunds)}</div></div>
        </div>
        <div className="banner info" style={{ marginTop: 12 }}>
          <DI n="bill" s={18} />
          <div>{s.payout.amount ? <>Next payout of <b>{rs(s.payout.amount)}</b> goes to {s.payout.to} on {s.payout.date}. These payout figures are sample numbers until a payment provider is connected.</> : 'No payouts yet. Stoora doesn’t show a payment as received until you confirm it on the order.'}</div>
        </div>
        <div className="box tbox" style={{ marginTop: 16 }}>
          <div className="tbar"><span className="box-t">Payments</span><span className="sp" /><label className="search"><DI n="search" s={16} /><span className="sr">Search payments</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search payments" style={{ border: 0, background: 'none', outline: 'none', flex: 1, minWidth: 0, fontSize: 14 }} /></label></div>
          <table className="tbl">
            <thead><tr><th>Buyer</th><th>For</th><th>Method</th><th>When</th><th className="r">Amount</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr className="rw" key={r.ref + r.who} onClick={() => router.push(r.href)}>
                  <td><b>{r.who}</b></td><td>{r.ref}</td><td className="muted">{r.method}</td><td className="muted">{r.when}</td><td className="r money">{rs(r.amount)}</td>
                  <td><span className={`tag ${r.ok ? 'ok' : 'warn'}`}>{r.ok ? 'Received' : 'Pending'}</span></td>
                  <td className="r">{!r.ok ? <button className="btn ink sm" type="button" onClick={(e) => { e.stopPropagation(); setRemind({ who: r.who, phone: r.phone, text: `Hi ${r.who.split(' ')[0]}, a gentle reminder about ${rs(r.amount)} for ${r.ref} from ${db.shop.name}. You can pay by UPI whenever it suits you. Thank you.` }); }}>Remind</button> : null}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 28 }}>No payments yet.</td></tr>}
            </tbody>
          </table>
        </div>
        {db.stats.pastPayouts.length ? (
          <div className="box" style={{ marginTop: 16 }}>
            <div className="box-h"><span className="box-t"><DI n="bill" s={16} /> Payouts to your bank</span></div>
            <div className="list">
              {s.payout.amount ? <div className="li"><div className="sp"><b>{s.payout.date}</b><div className="small muted">{s.payout.to}</div></div><span className="money">{rs(s.payout.amount)}</span><span className="tag warn">Scheduled</span></div> : null}
              {s.pastPayouts.map((p) => <div className="li" key={p.date}><div className="sp"><b>{p.date}</b><div className="small muted">{s.payout.to}</div></div><span className="money">{rs(p.amount)}</span><span className="tag ok">In bank</span></div>)}
            </div>
          </div>
        ) : null}
      </div>
      {remind && <MessageDialog open onClose={() => setRemind(null)} title="Payment reminder" to={remind.who} phone={remind.phone} text={remind.text} />}
    </>
  );
}
