'use client';
// Product details: every shop uses the Standard storefront's product page (gallery, options, sticky buy bar, delivery check, more from the shop).
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui';
import { StateScreen } from '@/components/bits';
import { shopBase } from '@/components/shop/ShopChrome';
import { StdProduct } from '@/components/storefront/StdProduct';
import { useStore } from '@/lib/store';

export default function ProductPage() {
  const { handle, id } = useParams<{ handle: string; id: string }>();
  const { db, ready } = useStore();
  const base = shopBase(handle);
  const p = db.products.find((x) => x.id === id && x.status === 'Active');
  if (!ready) return <div className="wrap" style={{ padding: 'var(--s4) 16px' }}><Skeleton rows={1} height={420} /></div>;
  if (!p) return <StateScreen kind="notfound" title="That product isn’t here" text="It may have been removed or sold out for good." actions={<Link className="btn primary" href={base}>Back to the shop</Link>} />;
  return <StdProduct product={p} base={base} />;
}
