'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, ButtonLink, EmptyState, Icon, PayBadge, Skeleton } from '@/components/ui';
import { ProductArt, readBuyer } from '@/components/bits';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { plural, rs } from '@/lib/format';
import { statusOf } from '@/lib/buyer';

export default function BuyerOrders() {
  const { db, ready, mode } = useStore(); const [who, setWho] = useState('');
  const auth = useAuth();
  useEffect(() => { setWho(auth.mode === 'live' ? auth.user?.name || 'there' : readBuyer().name); }, [auth.mode, auth.user]);
  if (!ready || !who) return <Skeleton rows={3} height={100} />;
  const mine = mode === 'live' ? db.orders : db.orders.filter((o) => o.buyer === who); // live: the database only returns this buyer's own orders
  return (
    <div className="stack" style={{ paddingTop: 'var(--s3)' }}>
      <div><h1 className="h1">My orders</h1><p className="t-body">Hi {who.split(' ')[0]}. Here is everything you ordered.</p></div>
      {mine.length === 0 ? <EmptyState icon="receipt_long" title="No orders yet" text="When you order from a shop on Stoora, it shows up here so you can track it." action={<ButtonLink href="/s/meera" kind="primary">Browse the sample shop</ButtonLink>} /> : (
        <div className="rows">{mine.map((o) => { const [label, tone, icon] = statusOf(o); const first = db.products.find((p) => p.id === o.lines[0]?.productId); return (
          <Link key={o.id} className="li" href={`/buyer/orders/${o.id}`} style={{ alignItems: 'flex-start' }}>
            <span style={{ width: 56, flex: 'none' }}>{first ? <ProductArt product={first} /> : <span className="thumb"><Icon name="inventory_2" /></span>}</span>
            <span className="grow"><span className="t">Order #{o.id} · {plural(o.lines.reduce((a, l) => a + l.qty, 0), 'item')}</span><span className="s">{o.createdAt} · {o.shopName ?? db.shop.name}</span><span className="row" style={{ marginTop: 'var(--s1)', flexWrap: 'wrap', gap: 'var(--s1)' }}><Badge tone={tone} icon={icon}>{label}</Badge><PayBadge o={o} /></span></span>
            <span className="end"><span className="money">{rs(o.total)}</span><Icon name="chevron_right" size="sm" className="t-cap" /></span></Link>); })}</div>
      )}
    </div>
  );
}
