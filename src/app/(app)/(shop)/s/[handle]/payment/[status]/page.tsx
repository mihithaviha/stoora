'use client';
// Payment result screens: success, failed and pending. Pending checks again until the provider confirms.
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, ButtonLink, Card, Icon } from '@/components/ui';
import { StateScreen } from '@/components/bits';
import { shopBase } from '@/components/shop/ShopChrome';
import { useStore } from '@/lib/store';
import { rs } from '@/lib/format';

export default function PaymentResult() {
  const { handle, status } = useParams<{ handle: string; status: string }>(); const sp = useSearchParams(); const { db, updateOrder, mode } = useStore(); const base = shopBase(handle);
  const id = Number(sp.get('order') || 1012); const method = sp.get('method') || 'upi';
  const order = db.orders.find((o) => o.id === id);
  const [pending, setPending] = useState(status === 'pending'); const [checks, setChecks] = useState(0);
  const kind = pending ? 'pending' : status === 'success' ? 'success' : status === 'pending' ? 'success' : status === 'failed' ? 'failed' : null;
  useEffect(() => { if (!pending || mode === 'live') return; // live: only the payment provider can confirm, so keep waiting
    const t = setTimeout(() => { if (checks >= 2) { if (order && mode === 'demo') updateOrder(order.id, { paid: true }); setPending(false); } else setChecks(checks + 1); }, 2200); return () => clearTimeout(t); }, [pending, checks]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!kind) return <div className="wrap"><StateScreen kind="notfound" title="That page doesn’t exist" text="Check the link, or go back to the shop." actions={<ButtonLink href={base} kind="primary">Back to the shop</ButtonLink>} /></div>;
  const copy = {
    success: { icon: 'check', t: method === 'cod' ? 'Order placed' : 'Payment received', d: method === 'cod' ? `Thank you. ${db.shop.name} will pack your order. Keep ${order ? rs(order.total) : 'the amount'} ready to pay when it arrives.` : `Thank you. ${db.shop.name} has your order and will pack it soon.` },
    failed: { icon: 'close', t: 'Payment didn’t go through', d: 'No money was taken. This can happen if the UPI app timed out or the bank said no. Your bag is still saved.' },
    pending: { icon: 'hourglass_top', t: 'We’re confirming your payment', d: 'This can take a minute. Please don’t pay again. We will update this page as soon as the bank confirms.' },
  }[kind];
  return (
    <div className="wrap"><div className={`payres ${kind === 'failed' ? 'fail' : kind === 'pending' ? 'wait' : ''}`} aria-live="polite">
      <span className="big-ok">{kind === 'pending' ? <span className="spin dark" style={{ width: 34, height: 34, borderWidth: 4 }} aria-hidden="true" /> : <Icon name={copy.icon} size="lg" />}</span>
      <h1 className="h1">{copy.t}</h1><p className="t-body">{copy.d}</p>
      {order && <Card className="stack tight"><div className="row"><b className="t-ink">Order #{order.id}</b><span className="grow" /><span className="money">{rs(order.total)}</span></div><span className="cap">{order.lines.reduce((a, l) => a + l.qty, 0)} items · {order.city}{kind === 'success' && order.paid ? ' · Paid' : kind === 'success' ? ' · Pay on delivery' : ''}</span>{kind === 'success' && <span className="cap">A receipt and tracking updates will be sent to {order.phone}.</span>}</Card>}
      <div className="btns" style={{ justifyContent: 'center' }}>
        {kind === 'success' && <><ButtonLink href={`/buyer/orders/${id}`} kind="primary" icon="local_shipping">Track my order</ButtonLink><ButtonLink href={base}>Keep shopping</ButtonLink></>}
        {kind === 'failed' && <><ButtonLink href={`${base}/checkout?demo=filled`} kind="primary" icon="refresh">Try again</ButtonLink><ButtonLink href={`${base}/bag`}>Back to my bag</ButtonLink></>}
        {kind === 'pending' && <><Button icon="refresh" onClick={() => setChecks(2)}>Check now</Button><ButtonLink href={`/buyer/orders/${id}`}>See my order</ButtonLink></>}
      </div>
      {kind === 'failed' && <p className="cap">Need help? <a className="link" href="/#faq">Read the questions buyers ask</a>.</p>}
    </div></div>
  );
}
