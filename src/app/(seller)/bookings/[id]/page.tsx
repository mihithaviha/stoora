'use client';
// One booking: the class or session, when it is, and whether it is paid (the dashboard prototype's Booking page).
import Link from 'next/link';
import { useState, use } from 'react';
import { BackRow, DAv, DI, Ms, PaidTag } from '@/components/dash/parts';
import { MessageDialog } from '@/components/MessageDialog';
import { ConfirmDialog, EmptyState, Skeleton, useToast } from '@/components/ui';
import { rs } from '@/lib/format';
import { useStore } from '@/lib/store';

export default function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { db, ready, markBookingPaid, completeBooking } = useStore();
  const toast = useToast();
  const [dlg, setDlg] = useState<null | 'paid' | 'remind' | 'link'>(null);
  if (!ready) return <div className="dpad" style={{ paddingTop: 20 }}><Skeleton rows={3} height={100} /></div>;
  const b = db.bookings.find((x) => x.id === id);
  if (!b) {
    return (
      <>
        <BackRow to="/orders?tab=bookings" icon="cal" title="Bookings" />
        <div className="dpad"><div className="card"><EmptyState icon="search_off" title="We couldn’t find that booking" text={`There is no booking ${id} in this shop.`} action={<Link className="btn line sm" href="/orders?tab=bookings">Back to bookings</Link>} /></div></div>
      </>
    );
  }
  const s = db.services.find((x) => x.id === b.serviceId);
  const price = s?.price ?? 0;
  const cust = db.customers.find((c) => c.name === b.buyer);
  const first = b.buyer.split(' ')[0];

  return (
    <>
      <BackRow to="/orders?tab=bookings" icon="cal" title="Bookings" />
      <div className="dpad">
        <div className="box head">
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}><h1 className="h1">{b.id}</h1><PaidTag paid={b.paid} /><span className="tag neutral">{b.status}</span></div>
          <div className="row" style={{ marginTop: 8 }}><span className="sp small muted">{b.when}</span><span className="money">{rs(price)}</span></div>
        </div>
        <div className="cols">
          <div>
            <div className="card">
              <div className="row"><div className="thumb"><Ms n={s?.icon ?? 'event'} /></div><div className="sp"><b>{s?.name ?? 'Service removed'}</b><div className="small muted">{s ? `${s.type}${s.minutes ? ` · ${s.minutes} min` : ''}` : ''}</div></div></div>
              <div className="hr" />
              <div className="row"><DI n="cal" /><b className="sp">{b.when}</b></div>
              {b.status === 'Upcoming' ? (
                <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                  <button className="btn grey" type="button" onClick={() => { completeBooking(b.id); toast('Booking marked as done.', { icon: 'check_circle' }); }}>Mark as done</button>
                  <button className="btn main" type="button" onClick={() => setDlg('remind')}><DI n="wa" s={16} /> Reminder message</button>
                </div>
              ) : null}
            </div>
            <div className="card">
              <div className="sum">
                <div className="r"><span>{s?.name ?? 'Booking'}</span><span>{rs(price)}</span></div>
                <div className="r t"><span>Total</span><span>{rs(price)}</span></div>
                <div className="r muted"><span>{b.paid ? 'Paid' : 'Not paid yet'}</span><span>{b.paid ? rs(price) : '₹0'}</span></div>
              </div>
              {!b.paid ? <div className="row" style={{ gap: 8, marginTop: 12 }}><button className="btn ink sm" type="button" onClick={() => setDlg('link')}>Send UPI link</button><button className="btn line sm" type="button" onClick={() => setDlg('paid')}>Mark as paid</button></div> : null}
            </div>
          </div>
          <div>
            <div className="card side-card">
              <div className="dsec"><div className="dsec-h">Buyer</div><div className="row"><DAv name={b.buyer} /><div className="sp">{cust ? <Link className="link" href={`/customers/${cust.id}`}>{b.buyer}</Link> : <b>{b.buyer}</b>}<div className="small muted">{cust ? `${cust.phone} · ${cust.orders} orders` : 'No phone saved'}</div></div></div></div>
              <div className="dsec"><div className="dsec-h">Where</div><div className="small">{s?.type === 'Digital' ? 'Sent to the buyer as a download.' : 'Online. Send the link before it starts.'}</div></div>
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog open={dlg === 'paid'} onClose={() => setDlg(null)} title="Mark this booking as paid?" yes="Yes, I received it" body={`Only do this if you can see ${rs(price)} from ${b.buyer} in your UPI app or bank.`}
        onYes={() => { markBookingPaid(b.id); toast(`${b.id} marked as paid.`); }} />
      {dlg === 'remind' && <MessageDialog open onClose={() => setDlg(null)} title="Reminder message" to={b.buyer} phone={cust?.phone} text={`Hi ${first}, a reminder about ${s?.name ?? 'your session'} on ${b.when}. See you there!`} />}
      {dlg === 'link' && <MessageDialog open onClose={() => setDlg(null)} title="Payment reminder" to={b.buyer} phone={cust?.phone} text={`Hi ${first}, a gentle reminder about ${s?.name ?? 'your booking'} (${b.when}) — ${rs(price)}. You can pay by UPI and reply here once it’s done. Thank you!`} />}
    </>
  );
}
