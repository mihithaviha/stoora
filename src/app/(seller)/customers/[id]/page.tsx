'use client';
// One customer: what they have spent, their orders and how to reach them (the dashboard prototype's Customer page).
import Link from 'next/link';
import { use } from 'react';
import { BackRow, DAv, DI, PayTag, ShipTag, SrcTag } from '@/components/dash/parts';
import { EmptyState, Skeleton, useToast } from '@/components/ui';
import { rs } from '@/lib/format';
import { useStore } from '@/lib/store';

export default function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { db, ready } = useStore();
  const toast = useToast();
  if (!ready) return <div className="dpad" style={{ paddingTop: 20 }}><Skeleton rows={3} height={100} /></div>;
  const c = db.customers.find((x) => x.id === id);
  if (!c) {
    return (
      <>
        <BackRow to="/customers" icon="user" title="Customers" />
        <div className="dpad"><div className="card"><EmptyState icon="person_off" title="We couldn’t find that customer" text="They may have been removed." action={<Link className="btn line sm" href="/customers">Back to customers</Link>} /></div></div>
      </>
    );
  }
  const orders = db.orders.filter((o) => o.buyer === c.name);
  const last = orders[0];

  const address = orders.find((o) => o.address)?.address;

  return (
    <>
      <BackRow to="/customers" icon="user" title="Customers" />
      <div className="dpad">
        <div className="box head">
          <div className="row">
            <DAv name={c.name} />
            <div className="sp"><h1 className="h1">{c.name}</h1><div className="small muted">{c.phone} · last order {c.lastOrder}</div></div>
            <div className="tile static" style={{ minWidth: 150 }}><div className="k">Amount spent</div><div className="v">{rs(c.spent)}</div></div>
            <div className="tile static" style={{ minWidth: 110 }}><div className="k">Orders</div><div className="v">{c.orders}</div></div>
          </div>
        </div>
        <div className="cols">
          <div>
            <div className="card">
              <div className="box-h"><span className="box-t">Last order</span><Link className="btn ink sm" href="/orders/new">Create order</Link></div>
              {last ? (
                <>
                  <Link className="row" style={{ width: '100%', textAlign: 'left' }} href={`/orders/${last.id}`}><b className="sp">#{last.id}</b><PayTag o={last} /><ShipTag shipped={last.shipped} /></Link>
                  <div className="small muted" style={{ marginTop: 6 }}>{last.createdAt} · {last.lines.length} {last.lines.length === 1 ? 'item' : 'items'} · {rs(last.total)}</div>
                </>
              ) : <p className="small muted" style={{ margin: 0 }}>No orders from {c.name.split(' ')[0]} in the current list. Older orders are counted in the totals above.</p>}
            </div>
            <div className="card">
              <div className="box-h"><span className="box-t">Timeline</span></div>
              <div className="timeline">
                {orders.length ? orders.map((o) => <div className="tev" key={o.id}><i /><div>Placed order <Link className="link" href={`/orders/${o.id}`}>#{o.id}</Link> on {o.source}.<div className="tiny muted">{o.createdAt}</div></div></div>) : <div className="small muted">Nothing yet.</div>}
                <div className="tev"><i /><div>First came from {c.source}.<div className="tiny muted">{c.city}</div></div></div>
              </div>
            </div>
          </div>
          <div>
            <div className="card side-card">
              <div className="dsec">
                <div className="dsec-h">Contact</div>
                <div className="row small"><DI n="phone" s={16} /><span className="sp">{c.phone}</span><button type="button" aria-label="Copy phone number" onClick={() => navigator.clipboard?.writeText(c.phone).then(() => toast('Phone number copied.')).catch(() => toast('Press Ctrl+C to copy.', { icon: 'error' }))}><DI n="copy" s={16} /></button></div>

                <p className="tiny muted" style={{ margin: '10px 0 0' }}>Number partly hidden in this sample. In your real shop it shows in full, to you only.</p>
              </div>
              <div className="dsec"><div className="dsec-h">Address</div><div className="small">{address ? `${address}` : c.city}</div></div>
              <div className="dsec"><div className="dsec-h">Came from</div><SrcTag s={c.source} /></div>
              <div className="dsec"><div className="dsec-h">Tags</div><span className="mini">{c.orders > 1 ? 'Repeat buyer' : 'New buyer'}</span></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
