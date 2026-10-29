'use client';
// One order: what to ship, what is owed, what happened, and who it is for (the dashboard prototype's Order page).
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, use } from 'react';
import { BackRow, DAv, DI, DSwitch, Ms, PayTag, ShipTag, SrcTag, plural } from '@/components/dash/parts';
import { MessageDialog } from '@/components/MessageDialog';
import { RefundDialog } from '@/components/RefundDialog';
import { Badge, Button, ConfirmDialog, Dialog, EmptyState, Field, Skeleton, useToast } from '@/components/ui';
import { rs } from '@/lib/format';
import { useStore } from '@/lib/store';

const COURIERS = ['Delhivery', 'India Post', 'Blue Dart', 'DTDC', 'Shiprocket', 'Hand delivered'];

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { db, ready, updateOrder, refundOrder, product } = useStore();
  const toast = useToast();
  const first = useSearchParams().get('dialog');
  const [dlg, setDlg] = useState<null | 'paid' | 'edit' | 'msg' | 'refund'>(first === 'refund' ? 'refund' : null);
  const [shipping, setShipping] = useState(false);
  const [ship, setShip] = useState({ courier: 'Delhivery', tracking: '', tell: true });
  const [edit, setEdit] = useState({ address: '', city: '', notes: '' });
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  if (!ready) return <div className="dpad" style={{ paddingTop: 20 }}><Skeleton rows={4} height={100} /></div>;
  const index = db.orders.findIndex((x) => String(x.id) === id);
  const o = db.orders[index];
  if (!o) {
    return (
      <>
        <BackRow to="/orders" icon="orders" title="Orders" />
        <div className="dpad"><div className="card"><EmptyState icon="search_off" title="We couldn’t find that order" text={`There is no order #${id} in this shop.`} action={<Link className="btn line sm" href="/orders">Back to orders</Link>} /></div></div>
      </>
    );
  }

  const n = o.lines.reduce((a, l) => a + l.qty, 0);
  const sub = o.lines.reduce((a, l) => a + l.price * l.qty, 0);
  const cust = db.customers.find((c) => c.name === o.buyer);
  const refunded = (o.refunds ?? []).reduce((a, r) => a + r.amount, 0);
  const canRefund = o.paid && o.method !== 'cash' && refunded < o.total;
  const canShip = !o.shipped && (o.paid || o.method === 'cod');
  const prev = db.orders[index - 1];
  const nextOrder = db.orders[index + 1];
  const ev: [string, string][] = [[o.createdBy === 'ai' ? 'Order added from an AI draft you approved' : o.createdBy === 'manual' ? 'Order added by you' : 'Order placed by buyer', `${o.createdAt} · from ${o.source}`]];
  if (o.paid) ev.push([o.method === 'cash' ? 'Marked paid in cash' : 'Marked as paid', rs(o.total)]);
  (o.refunds ?? []).forEach((r) => ev.push([`Refunded ${rs(r.amount)}`, `${r.reason} · ${r.when}`]));
  if (o.shipped) ev.push([o.courier && o.courier !== 'Hand delivered' ? `Shipped with ${o.courier}` : 'Handed over', o.tracking ? `Tracking ${o.tracking}` : 'No tracking number']);

  const doShip = () => {
    if (ship.courier !== 'Hand delivered' && ship.tracking.trim() && !/^[A-Za-z0-9-]{6,}$/.test(ship.tracking.trim())) { setErr('A tracking number has at least 6 letters or numbers.'); return; }
    updateOrder(o.id, { shipped: true, courier: ship.courier, tracking: ship.tracking.trim() || undefined });
    setShipping(false); setErr('');
    toast(`Order #${o.id} marked as shipped.`, { icon: 'local_shipping', undo: () => updateOrder(o.id, { shipped: false, courier: undefined, tracking: undefined }) });
  };

  return (
    <>
      <BackRow to="/orders" icon="orders" title="Orders">
        {canRefund ? <button className="btn line sm" type="button" onClick={() => setDlg('refund')}>Refund</button> : null}
        <button className="btn line sm" type="button" onClick={() => { setEdit({ address: o.address ?? '', city: o.city ?? '', notes: o.notes ?? '' }); setDlg('edit'); }}>Edit</button>
        {prev ? <Link className="ibtn sm" href={`/orders/${prev.id}`} aria-label="Previous order"><DI n="back" s={16} /></Link> : <span className="ibtn sm" aria-hidden="true" style={{ opacity: .4 }}><DI n="back" s={16} /></span>}
        {nextOrder ? <Link className="ibtn sm" href={`/orders/${nextOrder.id}`} aria-label="Next order"><DI n="right" s={16} /></Link> : <span className="ibtn sm" aria-hidden="true" style={{ opacity: .4 }}><DI n="right" s={16} /></span>}
      </BackRow>
      <div className="dpad">
        <div className="box head">
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}><h1 className="h1">#{o.id}</h1><PayTag o={o} /> <ShipTag shipped={o.shipped} /></div>
          <div className="row" style={{ marginTop: 8 }}><span className="sp small muted">{o.createdAt} · from {o.source}</span><span className="money">{rs(o.total)}</span></div>
        </div>
        <div className="cols">
          <div>
            <div className="card">
              <div className="row">
                <span style={{ color: o.shipped ? 'var(--ink-45)' : '#b07a00' }}><DI n={o.shipped ? 'check' : 'truck'} /></span><b className="sp">{o.shipped ? 'Shipped' : 'To ship'}</b>
                {canShip && !shipping ? <button className="btn main sm" type="button" onClick={() => setShipping(true)}>Mark as shipped <DI n="down" s={14} /></button> : null}
                {!o.shipped && !canShip ? <span className="small muted">{o.method === 'cod' ? '' : 'Waiting for payment'}</span> : null}
              </div>
              <div style={{ marginTop: 10 }}>
                {o.lines.map((l, i) => {
                  const p = product(l.productId);
                  return (
                    <div className="row" key={i} style={{ padding: '10px 0', borderTop: '1px solid var(--line-soft)' }}>
                      <div className="thumb" style={{ width: 40, height: 40 }}><Ms n={p?.icon ?? 'inventory_2'} /></div>
                      <div className="sp small"><b>{p?.name ?? 'Product removed'}</b><div className="muted">{l.size ? `Size ${l.size} · ` : ''}{rs(l.price)} × {l.qty}</div></div>
                      <span className="money small">{rs(l.qty * l.price)}</span>
                    </div>
                  );
                })}
              </div>
              {shipping ? (
                <>
                  <div className="row" style={{ gap: 12, alignItems: 'flex-start', marginTop: 12 }}>
                    <div className="field sp"><label htmlFor="ship-c">Courier</label><select id="ship-c" className="input" value={ship.courier} onChange={(e) => setShip({ ...ship, courier: e.target.value })}>{COURIERS.map((c) => <option key={c}>{c}</option>)}</select></div>
                    {ship.courier !== 'Hand delivered' ? (
                      <div className="field sp"><label htmlFor="ship-t">Tracking number</label><input id="ship-t" className={`input${err ? ' bad' : ''}`} placeholder="e.g. DL4482190" value={ship.tracking} onChange={(e) => { setShip({ ...ship, tracking: e.target.value }); setErr(''); }} />{err ? <span className="err" role="alert">{err}</span> : null}</div>
                    ) : null}
                  </div>
                  <div className="row" style={{ marginBottom: 14 }}><span className="sp small"><b>Tell the buyer</b><br /><span className="muted">Opens a message with the tracking details to send yourself</span></span><DSwitch on={ship.tell} onChange={(v) => setShip({ ...ship, tell: v })} label="Tell the buyer" /></div>
                  <p className="cap" style={{ marginTop: 0 }}>Courier booking isn’t connected yet. Book the pickup with your courier, then record it here.</p>
                  <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}><button className="btn line" type="button" onClick={() => { setShipping(false); setErr(''); }}>Cancel</button><button className="btn main" type="button" onClick={doShip}>Mark as shipped</button></div>
                </>
              ) : null}
              {o.shipped && o.tracking ? <div className="small muted" style={{ marginTop: 10 }}>{o.courier} · <span className="num">{o.tracking}</span></div> : null}
            </div>

            <div className="card">
              <div className="row"><b className="sp">{o.paid ? 'Paid' : o.method === 'cod' ? 'Collect on delivery' : 'Payment due'}</b>
                {!o.paid && o.method !== 'cod' ? <><button className="btn line sm" type="button" onClick={() => setDlg('paid')}>Mark as paid</button><button className="btn ink sm" type="button" onClick={() => setDlg('msg')}>Send UPI link</button></> : null}
              </div>
              <div className="sum" style={{ marginTop: 10 }}>
                <div className="r"><span>Subtotal · {plural(n, 'item')}</span><span>{rs(sub)}</span></div>
                <div className="r"><span>Delivery</span><span>{o.shipping ? rs(o.shipping) : 'Free'}</span></div>
                <div className="r t"><span>Total</span><span>{rs(o.total)}</span></div>
                {refunded > 0 ? <div className="r"><span>Refunded</span><span>− {rs(refunded)}</span></div> : null}
                <div className="r muted"><span>{o.paid ? (o.method === 'cash' ? 'Paid in cash' : 'Paid') : o.method === 'cod' ? 'Cash on delivery' : 'Not paid yet'}</span><span>{o.paid ? rs(o.total) : '₹0'}</span></div>
              </div>
            </div>

            <div className="card">
              <div className="box-h"><span className="box-t">Timeline</span></div>
              <form onSubmit={(e) => { e.preventDefault(); const t = note.trim(); if (!t) return; updateOrder(o.id, { notes: o.notes ? `${o.notes}\n${t}` : t }); setNote(''); toast('Note added.'); }}>
                <label className="search" style={{ marginBottom: 14 }}><span className="sr">Add a note for your team</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for your team… (press Enter)" style={{ border: 0, background: 'none', outline: 'none', flex: 1, fontSize: 14 }} /></label>
              </form>
              <div className="timeline">
                {[...ev].reverse().map((e, i) => <div className="tev" key={i}><i /><div>{e[0]}<div className="tiny muted">{e[1]}</div></div></div>)}
              </div>
            </div>
          </div>

          <div>
            <div className="card side-card">
              <div className="dsec"><div className="dsec-h">Notes</div>{o.notes ? <span className="small" style={{ whiteSpace: 'pre-wrap' }}>{o.notes}</span> : <span className="small muted">No notes yet</span>}</div>
              <div className="dsec">
                <div className="dsec-h">Buyer</div>
                <div className="row"><DAv name={o.buyer} /><div className="sp">{cust ? <Link className="link" href={`/customers/${cust.id}`}>{o.buyer}</Link> : <b>{o.buyer}</b>}<div className="small muted">{o.phone || 'No phone saved'}{cust ? ` · ${plural(cust.orders, 'order')}` : ''}</div></div></div>
                <button className="btn grey sm" type="button" style={{ marginTop: 12 }} onClick={() => setDlg('msg')}><DI n="wa" s={16} /> {o.paid ? 'Message buyer' : 'Payment reminder'}</button>
              </div>
              <div className="dsec"><div className="dsec-h">Deliver to</div><div className="small">{o.address ? `${o.address}, ` : ''}{o.city || 'No address saved'}</div></div>
              <div className="dsec"><div className="dsec-h">Came from</div><SrcTag s={o.source} /></div>
              <div className="dsec"><div className="dsec-h">Tags</div>
                <div className="chips wrap">
                  {cust && cust.orders > 1 ? <span className="mini">Repeat buyer</span> : <span className="mini">New buyer</span>}
                  {o.method === 'cod' ? <span className="mini">Cash on delivery</span> : null}
                  {o.createdBy === 'ai' ? <Badge tone="offer" icon="auto_awesome">From AI draft</Badge> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RefundDialog open={dlg === 'refund'} onClose={() => setDlg(null)} order={o} alreadyRefunded={refunded} onRefund={(r) => { refundOrder(o.id, r); toast(`Refund of ${rs(r.amount)} started for ${o.buyer}.`, { icon: 'undo' }); }} />
      <ConfirmDialog open={dlg === 'paid'} onClose={() => setDlg(null)} title="Mark this order as paid?" yes="Yes, I received it"
        body={`Only do this if you can see ${rs(o.total)} from ${o.buyer} in your UPI app or bank. Stoora can’t check payments for you yet.`}
        onYes={() => { updateOrder(o.id, { paid: true }); toast(`Order #${o.id} marked as paid.`, { undo: () => updateOrder(o.id, { paid: false }) }); }} />
      <Dialog open={dlg === 'edit'} onClose={() => setDlg(null)} title="Delivery details" footer={<><Button onClick={() => setDlg(null)}>Cancel</Button><Button kind="ink" onClick={() => { updateOrder(o.id, { address: edit.address.trim() || undefined, city: edit.city.trim() || undefined, notes: edit.notes.trim() || undefined }); setDlg(null); toast('Delivery details saved.'); }}>Save</Button></>}>
        <div className="stack">
          <Field id="ed-a" label="Address" optional><textarea id="ed-a" className="input" rows={2} value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></Field>
          <Field id="ed-c" label="City" optional><input id="ed-c" className="input" value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /></Field>
          <Field id="ed-n" label="Notes" optional hint="Only you see these."><textarea id="ed-n" className="input" rows={2} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
        </div>
      </Dialog>
      {dlg === 'msg' && (
        <MessageDialog open onClose={() => setDlg(null)} title={o.paid ? 'Message buyer' : 'Payment reminder'} to={o.buyer} phone={o.phone} channel={o.source === 'Instagram' ? 'Instagram' : 'WhatsApp'}
          text={o.paid
            ? `Hi ${o.buyer.split(' ')[0]}, thank you for your order #${o.id} from ${db.shop.name}. ${o.shipped ? `It has been shipped${o.tracking ? ` (tracking ${o.tracking})` : ''}.` : 'We are packing it now.'}`
            : `Hi ${o.buyer.split(' ')[0]}, a gentle reminder about your ${db.shop.name} order #${o.id} for ${rs(o.total)}. You can pay by UPI and reply here once it’s done. Thank you!`} />
      )}
    </>
  );
}
