'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Avatar, Badge, Button, ButtonLink, Card, ConfirmDialog, Dialog, EmptyState, Field, Icon, PageHeader, PayBadge, ShipBadge, Skeleton, SourceTag, useToast } from '@/components/ui';
import { MessageDialog } from '@/components/MessageDialog';
import { RefundDialog } from '@/components/RefundDialog';
import { plural, rs } from '@/lib/format';

const COURIERS = ['Delhivery', 'India Post', 'Blue Dart', 'DTDC', 'Shiprocket', 'Hand delivered'];

export default function OrderPage({ params }: { params: { id: string } }) {
  const { db, ready, updateOrder, refundOrder, product } = useStore(); const toast = useToast();
  const first = useSearchParams().get('dialog');
  const [dlg, setDlg] = useState<null | 'paid' | 'ship' | 'edit' | 'msg' | 'refund'>(first === 'refund' ? 'refund' : null);
  const [ship, setShip] = useState({ courier: 'Delhivery', tracking: '' });
  const [edit, setEdit] = useState({ address: '', city: '', notes: '' });
  const [err, setErr] = useState('');
  if (!ready) return <Skeleton rows={4} height={100} />;
  const o = db.orders.find((x) => String(x.id) === params.id);
  if (!o) return <Card><EmptyState icon="search_off" title="We couldn’t find that order" text={`There is no order #${params.id} in this shop.`} action={<ButtonLink href="/orders" small>Back to orders</ButtonLink>} /></Card>;

  const n = o.lines.reduce((a, l) => a + l.qty, 0);
  const sub = o.lines.reduce((a, l) => a + l.price * l.qty, 0);
  const cust = db.customers.find((c) => c.name === o.buyer);
  const refunded = (o.refunds ?? []).reduce((a, r) => a + r.amount, 0);
  const ev: [string, string][] = [[o.createdBy === 'ai' ? 'Order added from an AI draft you approved' : o.createdBy === 'manual' ? 'Order added by you' : 'Order placed by buyer', `${o.createdAt} · from ${o.source}`]];
  if (o.paid) ev.push([o.method === 'cash' ? 'Marked paid in cash' : 'Marked as paid', rs(o.total)]);
  (o.refunds ?? []).forEach((r) => ev.push([`Refunded ${rs(r.amount)}`, `${r.reason} · ${r.when}`]));
  if (o.shipped) ev.push([o.courier && o.courier !== 'Hand delivered' ? `Shipped with ${o.courier}` : 'Handed over', o.tracking ? `Tracking ${o.tracking}` : 'No tracking number']);

  const primary = !o.paid && o.method !== 'cod'
    ? <Button kind="primary" icon="check_circle" onClick={() => setDlg('paid')}>Mark as paid</Button>
    : !o.shipped ? <Button kind="primary" icon="local_shipping" onClick={() => setDlg('ship')}>Ship order</Button> : null;

  return (
    <>
      <PageHeader title={`Order #${o.id}`}
        lede={<span className="row" style={{ flexWrap: 'wrap', gap: 'var(--s1)' }}><PayBadge o={o} /><ShipBadge o={o} /><SourceTag source={o.source} /><span className="cap">{o.createdAt}</span></span>}
        actions={<><Button icon={o.paid ? 'forum' : 'send'} onClick={() => setDlg('msg')}>{o.paid ? 'Message buyer' : 'Payment reminder'}</Button>{o.paid && o.method !== 'cash' && refunded < o.total && <Button icon="undo" onClick={() => setDlg('refund')}>Refund</Button>}{primary}</>} />
      <div className="detail">
        <div>
          <Card title={plural(n, 'item')} icon="shopping_bag">
            <div className="rows">{o.lines.map((l, i) => { const p = product(l.productId); return (
              <div key={i} className="li" style={{ background: 'var(--inner)' }}>
                <span className="thumb"><Icon name={p?.icon ?? 'inventory_2'} /></span>
                <span className="grow"><span className="t">{p?.name ?? 'Product removed'}</span><span className="s num">{l.size ? `Size ${l.size} · ` : ''}{l.qty} × {rs(l.price)}</span></span>
                <span className="money">{rs(l.qty * l.price)}</span>
              </div>); })}</div>
            <div className="kv" style={{ marginTop: 'var(--s3)' }}>
              <div className="r"><span>Subtotal</span><span>{rs(sub)}</span></div>
              <div className="r"><span>Shipping</span><span>{o.shipping ? rs(o.shipping) : 'Free'}</span></div>
              <div className="r t"><span>Total</span><span>{rs(o.total)}</span></div>
              {refunded > 0 && <div className="r"><span>Refunded</span><span>− {rs(refunded)}</span></div>}
              <div className="r"><span>{o.paid ? (o.method === 'cash' ? 'Paid in cash' : 'Paid') : o.method === 'cod' ? 'Collect on delivery' : 'Buyer still owes'}</span><span>{rs(o.total)}</span></div>
            </div>
          </Card>
          <Card title="What happened" icon="history">
            <div className="tl">{[...ev].reverse().map((e, i) => <div key={i} className={`ev ${i === 0 ? 'now' : ''}`}><i /><div><b>{e[0]}</b><span className="cap">{e[1]}</span></div></div>)}</div>
          </Card>
        </div>
        <div>
          <Card title="Buyer" icon="person" aside={cust && <Link className="link cap" href={`/customers/${cust.id}`}>View<Icon name="chevron_right" size="xs" /></Link>}>
            <div className="row"><Avatar name={o.buyer} /><div className="grow"><div className="t-ink" style={{ fontWeight: 500 }}>{o.buyer}</div><div className="cap">{o.phone || 'No phone saved'}{o.city ? ' · ' + o.city : ''}</div></div></div>
            {cust && <p className="cap" style={{ marginTop: 'var(--s2)' }}>{plural(cust.orders, 'order')} · {rs(cust.spent)} spent with you</p>}
          </Card>
          <Card title="Delivery" icon="local_shipping" aside={<Button kind="quiet" small icon="edit" onClick={() => { setEdit({ address: o.address ?? '', city: o.city ?? '', notes: o.notes ?? '' }); setDlg('edit'); }}>Edit</Button>}>
            {o.shipped ? <p className="t-soft">{o.courier ?? 'Handed over'}{o.tracking ? <> · <span className="num">{o.tracking}</span></> : ''}</p>
              : <p className="t-soft">Not shipped yet. {o.paid ? 'Paid, so it is ready to go.' : o.method === 'cod' ? 'Cash on delivery: collect the money at the door.' : 'Waiting for payment.'}</p>}
            <p className="cap" style={{ marginTop: 'var(--s1)' }}>{o.address ? o.address + ', ' : ''}{o.city || 'No address saved'}</p>
            {o.notes && <div className="banner" style={{ marginTop: 'var(--s2)' }}><Icon name="sticky_note_2" /><span>{o.notes}</span></div>}
          </Card>
        </div>
      </div>

      <RefundDialog open={dlg === 'refund'} onClose={() => setDlg(null)} order={o} alreadyRefunded={refunded} onRefund={(r) => { refundOrder(o.id, r); toast(`Refund of ${rs(r.amount)} started for ${o.buyer}.`, { icon: 'undo' }); }} />

      <ConfirmDialog open={dlg === 'paid'} onClose={() => setDlg(null)} title="Mark this order as paid?" yes="Yes, I received it"
        body={`Only do this if you can see ${rs(o.total)} from ${o.buyer} in your UPI app or bank. Stoora can’t check payments for you yet.`}
        onYes={() => { updateOrder(o.id, { paid: true }); toast(`Order #${o.id} marked as paid.`, { undo: () => updateOrder(o.id, { paid: false }) }); }} />

      <Dialog open={dlg === 'ship'} onClose={() => { setDlg(null); setErr(''); }} title={`Ship order #${o.id}`} footer={<><Button onClick={() => setDlg(null)}>Cancel</Button><Button kind="ink" icon="local_shipping" onClick={() => {
        if (ship.courier !== 'Hand delivered' && ship.tracking.trim() && !/^[A-Za-z0-9-]{6,}$/.test(ship.tracking.trim())) { setErr('A tracking number has at least 6 letters or numbers.'); return; }
        updateOrder(o.id, { shipped: true, courier: ship.courier, tracking: ship.tracking.trim() || undefined }); setDlg(null); setErr('');
        toast(`Order #${o.id} marked as shipped.`, { icon: 'local_shipping', undo: () => updateOrder(o.id, { shipped: false, courier: undefined, tracking: undefined }) });
      }}>Mark as shipped</Button></>}>
        <div className="stack">
          <Field id="ship-c" label="Courier" required><select id="ship-c" className="input" value={ship.courier} onChange={(e) => setShip({ ...ship, courier: e.target.value })}>{COURIERS.map((c) => <option key={c}>{c}</option>)}</select></Field>
          {ship.courier !== 'Hand delivered' && <Field id="ship-t" label="Tracking number" optional hint="From the courier’s receipt. You can add it later." error={err}><input id="ship-t" className={`input ${err ? 'bad' : ''}`} value={ship.tracking} onChange={(e) => { setShip({ ...ship, tracking: e.target.value }); setErr(''); }} placeholder="DL4482190" /></Field>}
          <p className="cap">Courier booking isn’t connected yet. Book the pickup with your courier, then record it here.</p>
        </div>
      </Dialog>

      <Dialog open={dlg === 'edit'} onClose={() => setDlg(null)} title="Delivery details" footer={<><Button onClick={() => setDlg(null)}>Cancel</Button><Button kind="ink" onClick={() => { updateOrder(o.id, { address: edit.address.trim() || undefined, city: edit.city.trim() || undefined, notes: edit.notes.trim() || undefined }); setDlg(null); toast('Delivery details saved.'); }}>Save</Button></>}>
        <div className="stack">
          <Field id="ed-a" label="Address" optional><textarea id="ed-a" className="input" rows={2} value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></Field>
          <Field id="ed-c" label="City" optional><input id="ed-c" className="input" value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /></Field>
          <Field id="ed-n" label="Notes" optional hint="Only you see these."><textarea id="ed-n" className="input" rows={2} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
        </div>
      </Dialog>

      {dlg === 'msg' && <MessageDialog open onClose={() => setDlg(null)} title={o.paid ? 'Message buyer' : 'Payment reminder'} to={o.buyer} phone={o.phone} channel={o.source === 'Instagram' ? 'Instagram' : 'WhatsApp'}
        text={o.paid ? `Hi ${o.buyer.split(' ')[0]}, thank you for your order #${o.id} from ${db.shop.name}. ${o.shipped ? `It has been shipped${o.tracking ? ` (tracking ${o.tracking})` : ''}.` : 'We are packing it now.'}` : `Hi ${o.buyer.split(' ')[0]}, a gentle reminder about your ${db.shop.name} order #${o.id} for ${rs(o.total)}. You can pay by UPI whenever it suits you. Thank you.`} />}
      {o.createdBy === 'ai' && <p className="cap" style={{ marginTop: 'var(--s3)' }}><Badge tone="offer" icon="auto_awesome">From AI draft</Badge> You checked and approved this draft before it was added.</p>}
    </>
  );
}
