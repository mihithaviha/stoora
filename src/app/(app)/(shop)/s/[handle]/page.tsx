'use client';
// Storefront home: every shop starts with the Standard storefront, filled from its own products (the seller can change it in Storefront).
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui';
import { shopBase } from '@/components/shop/ShopChrome';
import { ShopStore } from '@/components/storefront/ShopStore';
import { useStore } from '@/lib/store';

export default function Storefront() {
  const { handle } = useParams<{ handle: string }>();
  const { ready } = useStore();
  if (!ready) return <div className="wrap" style={{ padding: 'var(--s4) 16px' }}><Skeleton rows={3} height={140} /></div>;
  return <ShopStore base={shopBase(handle)} />;
}
