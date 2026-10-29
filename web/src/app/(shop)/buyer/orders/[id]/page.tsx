'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge, ButtonLink, Card, Icon, PayBadge, Skeleton, Button, useToast } from '@/components/ui';
import { ProductArt, StateScreen } from '@/components/bits';
import { useStore } from '@/lib/store';
import { plural, rs } from '@/lib/format';
import { statusOf } from '@/lib/buyer';

export default function BuyerOrder() {
  const { id } = useParams<{ id: string }>(); const { db, ready } = useStore(); const toast = useToast();
  if (!ready) return <Skeleton rows={3} height={110} />;
  const o = db.orders.find((x) => String(x.id) === id);
  if (!o) return <StateScreen kind="notfound" compact title="We couldn’t find that order" text={`There is no order #${id} on your account.`} actions={<ButtonLink href="/buyer/orders" kind="primary">Back to my orders</ButtonLink>} />;
  const [label, tone, icon] = statusOf(o);
  const paidDone = o.paid || o.method === 'cod';
  const steps: [string, string, 'done' | 'now' | '', string][] = [
    ['Order placed', o.createdAt, 'done', 'receipt_long'],
    [o.method === 'cod' ? 'Cash on delivery chosen' : 'Payment', o.paid ? 'Received' : o.method === 'cod' ? 'Pay when it arrives' : 'Waiting for payment', paidDone ? 'done' : 'now', 'payments'],
    ['Packed', paidDone ? (o.shipped ? 'Done' : 'The seller is packing it') : 'After payment', o.shipped ? 'done' : paidDone ? 'now' : '', 'inventory_2'],
    ['Shipped', o.shipped ? `${o.courier ?? 'Handed over'}${o.tracking ? ` · ${o.tracking}` : ''}` : 'Not yet', o.shipped ? (label === 'On the way' ? 'now' : 'done') : '', 'local_shipping'],
    ['Delivered', label === 'Delivered' ? 'Arrived' : 'Expected in 3 to 5 days after shipping', label === 'Delivered' ? 'done' : '', 'home'],
  ];
  return (
    <div className="stack" style={{ paddingTop: 'var(--s3)' }}>
      <Link className="link" href="/buyer/orders" style={{ justifySelf: 'start' }}><Icon name="arrow_back" size="xs" />My orders</Link>
      <div className="row" style={{ flexWrap: 'wrap' }}><h1 className="h1 grow">Order #{o.id}</h1><Badge tone={tone} icon={icon}>{label}</Badge></div>
      <div className="detail">
        <div>
          <Card title="Where is my order?" icon="route"><ol className="track">{steps.map(([t, s, st, i]) => <li key={t} className={st}><span className="dot"><Icon name={st === 'done' ? 'check' : i} /></span><span><b>{t}</b><span className="cap">{s}</span></span></li>)}</ol>
            {o.tracking && <div className="btns"><Button small icon="content_copy" onClick={() => toast('Tracking number copied.', { icon: 'content_copy' })}>Copy {o.tracking}</Button></div>}</Card>
          <Card title={plural(o.lines.reduce((a, l) => a + l.qty, 0), 'item')} icon="shopping_bag"><div className="stack tight">{o.lines.map((l, i) => { const p = db.products.find((x) => x.id === l.productId); return (
            <div className="sumline" key={i}>{p ? <ProductArt product={p} /> : <span className="thumb"><Icon name="inventory_2" /></span>}<span><span className="t-ink" style={{ fontWeight: 500, display: 'block' }}>{p?.name ?? 'Product removed'}</span><span className="cap">{l.size ? `Size ${l.size} · ` : ''}Qty {l.qty}</span></span><span className="money">{rs(l.price * l.qty)}</span></div>); })}</div></Card>
        </div>
        <div>
          <Card title="Payment" icon="payments"><div className="kv"><div className="r"><span>Subtotal</span><span>{rs(o.total - o.shipping)}</span></div><div className="r"><span>Delivery</span><span>{o.shipping ? rs(o.shipping) : 'Free'}</span></div><div className="r t"><span>Total</span><span>{rs(o.total)}</span></div></div><div style={{ marginTop: 'var(--s2)' }}><PayBadge o={o} /></div>
            {(o.refunds ?? []).map((r, i) => <div className="banner ok" key={i} style={{ marginTop: 'var(--s2)' }}><Icon name="undo" /><span>{rs(r.amount)} refunded. It can take 5 to 7 working days to reach you.</span></div>)}</Card>
          <Card title="Delivering to" icon="location_on"><p className="t-soft">{o.buyer}</p><p className="cap">{o.address ?? o.city ?? 'No address saved'}</p></Card>
          <Card title="Need help?" icon="help" className="stack tight"><p className="cap">Questions about this order go to {o.shopName ?? db.shop.name}. For a refund or return, see their policy on the shop page.</p><div className="btns"><ButtonLink href={`/s/${o.shopHandle ?? db.shop.handle ?? 'meera'}`} small>Visit the shop</ButtonLink><ButtonLink href="/data-requests" small kind="quiet">My data</ButtonLink></div></Card>
        </div>
      </div>
    </div>
  );
}
