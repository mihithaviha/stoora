'use client';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { Avatar, ButtonLink, Card, EmptyState, Icon, PageHeader, PayBadge, Skeleton, SourceTag } from '@/components/ui';
import { rs } from '@/lib/format';

export default function CustomerPage({ params }: { params: { id: string } }) {
  const { db, ready } = useStore();
  if (!ready) return <Skeleton rows={3} height={100} />;
  const c = db.customers.find((x) => x.id === params.id);
  if (!c) return <Card><EmptyState icon="person_off" title="We couldn’t find that customer" text="They may have been removed." action={<ButtonLink href="/customers" small>Back to customers</ButtonLink>} /></Card>;
  const orders = db.orders.filter((o) => o.buyer === c.name); const chat = db.chats.find((x) => x.buyer === c.name);
  return (
    <>
      <PageHeader title={<span className="row" style={{ gap: 'var(--s3)' }}><Avatar name={c.name} size={56} />{c.name}</span>} lede={<span className="row" style={{ gap: 'var(--s1)', flexWrap: 'wrap' }}>{c.city} · first came from <SourceTag source={c.source} /></span>}
        actions={chat && <ButtonLink href={`/chats?c=${chat.id}`} kind="primary" icon="forum">Open chat</ButtonLink>} />
      <div className="detail">
        <div>
          <Card><div className="tiles four">
            <div className="tile"><span className="k">Orders</span><span className="v big">{c.orders}</span></div>
            <div className="tile"><span className="k">Spent</span><span className="v big">{rs(c.spent)}</span></div>
            <div className="tile"><span className="k">Average order</span><span className="v big">{rs(c.orders ? c.spent / c.orders : 0)}</span></div>
            <div className="tile"><span className="k">Last order</span><span className="v big" style={{ fontSize: 22, lineHeight: 1.3 }}>{c.lastOrder}</span></div>
          </div></Card>
          <Card title="Orders in this list" icon="receipt_long">{orders.length ? <div className="rows">{orders.map((o) => (
            <Link key={o.id} className="li" href={`/orders/${o.id}`} style={{ background: 'var(--inner)' }}><span className="grow"><span className="t">#{o.id}</span><span className="s">{o.createdAt}</span></span><PayBadge o={o} /><span className="money">{rs(o.total)}</span></Link>))}</div>
            : <p className="t-body">No orders from {c.name.split(' ')[0]} in the current list. Older orders are counted in the totals above.</p>}</Card>
        </div>
        <div>
          <Card title="Contact" icon="call">
            <div className="row"><span className="grow t-ink num">{c.phone}</span></div>
            <p className="cap" style={{ marginTop: 'var(--s1)' }}>Number partly hidden in this sample. In your real shop it shows in full, to you only.</p>
          </Card>
          <Card title="Notes" icon="sticky_note_2"><p className="t-body">Customer notes aren’t built yet.</p></Card>
        </div>
      </div>
      <p className="cap"><Link className="link" href="/customers"><Icon name="arrow_back" size="xs" />All customers</Link></p>
    </>
  );
}
