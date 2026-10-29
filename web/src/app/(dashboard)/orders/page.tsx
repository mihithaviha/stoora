'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useStore, orderFilters, type OrderFilter } from '@/lib/store';
import { Avatar, Badge, ButtonLink, Card, Chips, DemoBar, EmptyState, PageHeader, PayBadge, SearchBox, Segmented, ShipBadge, Skeleton, SourceTag, useToast, Button } from '@/components/ui';
import { MessageDialog } from '@/components/MessageDialog';
import { plural, rs } from '@/lib/format';
import type { Order } from '@/lib/types';

const items = (o: Order) => o.lines.reduce((a, l) => a + l.qty, 0);

export default function OrdersPage() { const searchParams = Object.fromEntries(useSearchParams()) as { tab?: string; filter?: string; q?: string };
  const { db, ready } = useStore();
  const router = useRouter();
  const tab = searchParams.tab === 'bookings' ? 'bookings' : 'orders';
  const filter = (Object.keys(orderFilters) as OrderFilter[]).includes(searchParams.filter as OrderFilter) ? (searchParams.filter as OrderFilter) : 'All';
  const [q, setQ] = useState(searchParams.q ?? '');
  const setParam = (k: string, v: string | null) => { const p = new URLSearchParams(searchParams as Record<string, string>); if (v) p.set(k, v); else p.delete(k); router.replace('/orders' + (p.toString() ? '?' + p : ''), { scroll: false }); };

  const t = q.trim().toLowerCase();
  const list = db.orders.filter(orderFilters[filter]).filter((o) => !t || `${o.buyer} #${o.id} ${o.id} ${o.source} ${o.city ?? ''}`.toLowerCase().includes(t));

  return (
    <>
      <DemoBar />
      <PageHeader title="Orders" lede="From your shop link, phone calls and in person — all in one list." actions={<ButtonLink href="/orders/new" kind="primary" icon="add">Create order</ButtonLink>} />
      <div className="stack">
        <Card className="stack tight">
          <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--s2)' }}>
            <Segmented label="Orders or bookings" value={tab} onChange={(v) => setParam('tab', v === 'orders' ? null : v)} options={[{ value: 'orders', label: 'Orders', count: db.orders.length }, { value: 'bookings', label: 'Bookings', count: db.bookings.length }]} />
            {tab === 'orders' && <div style={{ flex: '1 1 220px' }}><SearchBox id="order-q" value={q} onChange={setQ} placeholder="Search by name, order number or city" /></div>}
          </div>
          {tab === 'orders' && <Chips label="Show" value={filter} onChange={(f) => setParam('filter', f === 'All' ? null : f)} options={(Object.keys(orderFilters) as OrderFilter[]).map((f) => ({ value: f, label: f, count: db.orders.filter(orderFilters[f]).length }))} />}
        </Card>
        {!ready ? <Skeleton rows={4} /> : tab === 'bookings' ? <Bookings /> : list.length === 0 ? (
          <Card>{t ? <EmptyState icon="search_off" title={`No orders match “${q}”`} text="Try a buyer’s first name, or an order number like 1012." action={<Button small onClick={() => setQ('')}>Clear search</Button>} />
            : filter === 'To ship' ? <EmptyState icon="done" title="Nothing to ship" text="Every ready order has left. New ones will show up here." />
            : <EmptyState icon="inbox" title="No orders here yet" text="When a buyer orders from your shop link, it lands in this list." action={<ButtonLink href="/orders/new" small>Add an order yourself</ButtonLink>} />}</Card>
        ) : (
          <>
            <div className="tbl-wrap only-wide">
              <table className="tbl">
                <thead><tr><th>Order</th><th>Date</th><th>Buyer</th><th>Came from</th><th className="r">Total</th><th>Payment</th><th>Shipping</th><th>Items</th></tr></thead>
                <tbody>{list.map((o) => (
                  <tr key={o.id} tabIndex={0} onClick={() => router.push(`/orders/${o.id}`)} onKeyDown={(e) => e.key === 'Enter' && router.push(`/orders/${o.id}`)} style={{ cursor: 'pointer' }}>
                    <td><b>#{o.id}</b>{o.createdBy === 'ai' && <span className="cap"> · AI draft approved</span>}</td><td>{o.createdAt}</td><td>{o.buyer}</td><td><SourceTag source={o.source} /></td>
                    <td className="r"><b className="num">{rs(o.total)}</b></td><td><PayBadge o={o} /></td><td><ShipBadge o={o} /></td><td>{plural(items(o), 'item')}</td>
                  </tr>))}</tbody>
              </table>
            </div>
            <div className="rows only-narrow">{list.map((o) => (
              <Link key={o.id} className="li" href={`/orders/${o.id}`} style={{ alignItems: 'flex-start' }}>
                <span className="grow"><span className="t">#{o.id} · {o.buyer}</span><span className="s">{o.createdAt} · {plural(items(o), 'item')}</span><span className="row" style={{ marginTop: 'var(--s1)', flexWrap: 'wrap', gap: 'var(--s1)' }}><PayBadge o={o} /><ShipBadge o={o} /></span></span>
                <span className="end"><span className="money">{rs(o.total)}</span><SourceTag source={o.source} /></span>
              </Link>))}</div>
          </>
        )}
      </div>
    </>
  );
}

function Bookings() {
  const { db, markBookingPaid } = useStore(); const toast = useToast();
  const [remind, setRemind] = useState<null | { who: string; text: string }>(null);
  const svc = (id: string) => db.services.find((s) => s.id === id);
  if (!db.bookings.length) return <Card><EmptyState icon="event" title="No bookings yet" text="When someone books a class or session, it shows up here." /></Card>;
  return (
    <>
      <div className="rows">{db.bookings.map((b) => (
        <div key={b.id} className="li" style={{ flexWrap: 'wrap' }}>
          <Avatar name={b.buyer} />
          <span className="grow" style={{ minWidth: 160 }}><span className="t">{svc(b.serviceId)?.name}</span><span className="s">{b.when} · {b.buyer} · {b.id}</span></span>
          <span className="row" style={{ gap: 'var(--s1)', flexWrap: 'wrap' }}>
            <span className="money">{rs(svc(b.serviceId)?.price ?? 0)}</span>
            {b.paid ? <Badge tone="ok" icon="check_circle">Paid</Badge> : <Badge tone="warn" icon="schedule">Unpaid</Badge>}
            {b.status === 'Done' ? <Badge tone="neutral" icon="done_all">Done</Badge> : <Badge tone="offer" icon="event_upcoming">Upcoming</Badge>}
            {!b.paid && <><Button small onClick={() => setRemind({ who: b.buyer, text: `Hi ${b.buyer.split(' ')[0]}, a reminder to pay ${rs(svc(b.serviceId)?.price ?? 0)} by UPI for your ${svc(b.serviceId)?.name} on ${b.when}. Thank you.` })}>Remind</Button>
              <Button small kind="ink" onClick={() => { markBookingPaid(b.id); toast(`Booking ${b.id} marked as paid. You confirmed the money arrived.`); }}>Mark as paid</Button></>}
          </span>
        </div>))}</div>
      <p className="cap">Mark a booking as paid only after you see the money in your UPI app or bank.</p>
      {remind && <MessageDialog open onClose={() => setRemind(null)} title="Payment reminder" to={remind.who} text={remind.text} />}
    </>
  );
}
