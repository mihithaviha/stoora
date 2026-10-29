'use client';
import { useParams } from 'next/navigation';
import { ButtonLink, EmptyState, Skeleton } from '@/components/ui';
import { ProductCard, shopBase } from '@/components/shop/ShopChrome';
import { useBag } from '@/lib/bag';
import { useStore } from '@/lib/store';
import { plural } from '@/lib/format';

export default function Wishlist() {
  const { handle } = useParams<{ handle: string }>(); const base = shopBase(handle); const bag = useBag(); const { db } = useStore();
  const items = db.products.filter((p) => bag.wish.includes(p.id) && p.status === 'Active');
  return (
    <div className="wrap" style={{ paddingBottom: 'var(--s6)' }}>
      <div style={{ padding: 'var(--s3) 0 var(--s3)' }}><h1 className="h1">Wishlist</h1><p className="t-body">{bag.ready ? (items.length ? `${plural(items.length, 'item')} you saved.` : 'Things you save show up here.') : ' '}</p></div>
      {!bag.ready ? <Skeleton rows={2} height={200} /> : items.length === 0
        ? <EmptyState icon="favorite" title="Nothing saved yet" text="Tap the heart on anything you like and it will wait for you here." action={<ButtonLink href={base} kind="primary">Browse the shop</ButtonLink>} />
        : <div className="pgrid2">{items.map((p) => <ProductCard key={p.id} p={p} base={base} />)}</div>}
    </div>
  );
}
