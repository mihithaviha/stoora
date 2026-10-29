'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useStore, orderFilters } from '@/lib/store';
import { Card, Chips, DemoBar, EmptyState, Icon, PageHeader } from '@/components/ui';
import { plural, rs } from '@/lib/format';

type Kind = 'All' | 'Orders' | 'Stock' | 'Money';
export default function NotificationsPage() {
  const { db } = useStore(); const [kind, setKind] = useState<Kind>('All');
  // Alerts from the shop plus ones worked out from the current data, so they stay true as you act.
  const items = [
    ...db.alerts.map((a) => ({ ...a, kind: (a.icon === 'inventory_2' ? 'Stock' : 'Orders') as Kind })),
    ...db.orders.filter((o) => !o.paid && o.method === 'upi').map((o) => ({ id: 'pay' + o.id, icon: 'currency_rupee', title: `${o.buyer} hasn’t paid order #${o.id}`, detail: `${rs(o.total)} · ${o.createdAt}`, when: 'Now', href: `/orders/${o.id}`, kind: 'Money' as Kind })),
    ...db.products.filter((p) => p.status === 'Active' && p.stock > 0 && p.stock <= 3).map((p) => ({ id: 'low' + p.id, icon: 'inventory', title: `${p.name}: only ${p.stock} left`, detail: 'Restock soon or turn on “keep selling”.', when: 'Now', href: `/products/${p.id}`, kind: 'Stock' as Kind })),
  ];
  const toShip = db.orders.filter(orderFilters['To ship']).length;
  if (toShip) items.push({ id: 'ship', icon: 'local_shipping', title: `${plural(toShip, 'order')} to ship`, detail: 'Paid and ready to pack.', when: 'Now', href: '/orders?filter=To%20ship', kind: 'Orders' });
  const list = items.filter((i) => kind === 'All' || i.kind === kind);
  return (
    <>
      <DemoBar />
      <PageHeader title="Notifications" lede="Things in your shop that may need you." actions={<Link className="btn line" href="/settings/notifications"><Icon name="tune" />Choose alerts</Link>} />
      <div className="stack">
        <Chips label="Show" value={kind} onChange={setKind} options={(['All', 'Orders', 'Money', 'Stock'] as Kind[]).map((k) => ({ value: k, label: k, count: items.filter((i) => k === 'All' || i.kind === k).length }))} />
        {list.length ? <div className="rows">{list.map((a) => (
          <Link key={a.id} className="li" href={a.href}><span className="thumb sm"><Icon name={a.icon} size="sm" /></span><span className="grow"><span className="t">{a.title}</span><span className="s">{a.detail}</span></span><span className="cap">{a.when}</span></Link>))}</div>
          : <Card><EmptyState icon="notifications_off" title="Nothing here" text="You’re all caught up." /></Card>}
      </div>
    </>
  );
}
