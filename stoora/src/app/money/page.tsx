'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useStore, moneyWaiting } from '@/lib/store';
import { Avatar, Badge, Button, Card, DemoBar, EmptyState, Icon, PageHeader, Segmented, Skeleton, SplitBar } from '@/components/ui';
import { MessageDialog } from '@/components/MessageDialog';
import { plural, rs } from '@/lib/format';

type Range = 'today' | 'week' | 'month';
export default function MoneyPage() {
  const { db, ready } = useStore();
  const [range, setRange] = useState<Range>('week');
  const [remind, setRemind] = useState<null | { who: string; text: string }>(null);
  if (!ready) return <Skeleton rows={4} height={90} />;
  const s = db.stats;
  const received = { today: s.receivedToday, week: s.receivedWeek, month: s.receivedMonth }[range];
  const refunds = { today: 0, week: s.refundsWeek, month: s.refundsMonth }[range];
  const label = { today: 'Today', week: 'This week', month: 'This month' }[range];
  const waiting = moneyWaiting(db); const wt = waiting.reduce((a, x) => a + x.amount, 0);
  const got = db.orders.filter((o) => o.paid);
  return (
    <>
      <DemoBar />
      <PageHeader title="Money" lede="Payments in, money still to come, and payouts to your bank." actions={<Segmented label="Time range" value={range} onChange={setRange} options={[{ value: 'today', label: 'Today' }, { value: 'week', label: 'This week' }, { value: 'month', label: 'This month' }]} />} />
      <div className="stack">
        <Card><div className="tiles four">
          <div className="tile"><span className="k">Received</span><span className="v big">{rs(received)}</span><span className="d">{label}</span></div>
          <div className="tile"><span className="k">Still to be paid</span><span className="v big">{rs(wt)}</span><span className="d">{plural(waiting.length, 'payment')}</span></div>
          <div className="tile"><span className="k">Next payout</span><span className="v big">{rs(s.payout.amount)}</span><span className="d">{s.payout.date}</span></div>
          <div className="tile"><span className="k">Refunds</span><span className="v big">{rs(refunds)}</span><span className="d">{label}</span></div>
        </div>
        <div style={{ marginTop: 'var(--s3)' }}><SplitBar parts={[['Received ' + label.toLowerCase(), received, 'ok'], ['Still to be paid', wt, 'warn']]} /></div></Card>
        <div className="banner info"><Icon name="account_balance" /><span>Payout figures here are sample numbers. Real payouts will come from the payment provider once it is connected — Stoora doesn’t show a payment as received until the provider confirms it.</span></div>
        <div className="detail">
          <div>
            <Card title="Waiting for payment" icon="schedule" aside={<span className="cap">{rs(wt)}</span>}>
              {waiting.length ? <div className="rows">{waiting.map((p) => (
                <div key={p.ref} className="li" style={{ background: 'var(--inner)', flexWrap: 'wrap' }}><Avatar name={p.who} />
                  <span className="grow"><span className="t">{p.who}</span><span className="s">{p.ref.startsWith('#') ? <Link className="link" href={`/orders/${p.ref.slice(1)}`}>{p.ref}</Link> : p.ref} · {p.since}</span></span>
                  <span className="money">{rs(p.amount)}</span>
                  <Button kind="ink" small icon="send" onClick={() => setRemind({ who: p.who, text: `Hi ${p.who.split(' ')[0]}, a gentle reminder about ${rs(p.amount)} for ${p.ref} from ${db.shop.name}. You can pay by UPI whenever it suits you. Thank you.` })}>Remind</Button>
                </div>))}</div> : <EmptyState icon="savings" title="Nobody owes you money" text="Every order and booking is paid." />}
            </Card>
            <Card title="Payments marked as received" icon="check_circle">
              <div className="rows">{got.map((o) => (
                <Link key={o.id} href={`/orders/${o.id}`} className="li" style={{ background: 'var(--inner)' }}><Avatar name={o.buyer} />
                  <span className="grow"><span className="t">{o.buyer}</span><span className="s">#{o.id} · {o.method === 'cash' ? 'Cash' : 'UPI'} · {o.createdAt}</span></span>
                  <span className="end"><span className="money">{rs(o.total)}</span><Badge tone="ok" icon="check_circle">Marked paid</Badge></span></Link>))}</div>
            </Card>
          </div>
          <div>
            <Card title="Payouts to bank" icon="account_balance">
              <div className="rows">
                <div className="li" style={{ background: 'var(--inner)' }}><span className="grow"><span className="t">{s.payout.date}</span><span className="s">{s.payout.to}</span></span><span className="end"><span className="money">{rs(s.payout.amount)}</span><Badge tone="offer" icon="event_upcoming">Scheduled</Badge></span></div>
                {s.pastPayouts.map((p) => <div key={p.date} className="li" style={{ background: 'var(--inner)' }}><span className="grow"><span className="t">{p.date}</span><span className="s">{s.payout.to}</span></span><span className="end"><span className="money">{rs(p.amount)}</span><Badge tone="ok" icon="check_circle">In bank</Badge></span></div>)}
              </div>
              <Link className="link cap" href="/settings/payments" style={{ marginTop: 'var(--s2)', display: 'inline-flex' }}>Payment settings<Icon name="chevron_right" size="xs" /></Link>
            </Card>
          </div>
        </div>
      </div>
      {remind && <MessageDialog open onClose={() => setRemind(null)} title="Payment reminder" to={remind.who} text={remind.text} />}
    </>
  );
}
