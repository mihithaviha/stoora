'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { QuickView } from '../shop/ShopChrome';
import { useToast } from '../ui';
import { StoreFront, type StoreActions, type StoreCtx } from './Templates';
import { useBag } from '@/lib/bag';
import { useStore } from '@/lib/store';
import { publishedConfig, toStoreData } from '@/lib/storefront/map';
import type { Product } from '@/lib/types';

/** The live shop page drawn with the seller's chosen template. The bag, saved items and product pages are the shop's own. */
export function ShopStore({ base }: { base: string }) {
  const { db } = useStore();
  const bag = useBag();
  const toast = useToast();
  const router = useRouter();
  const [quick, setQuick] = useState<Product | null>(null);
  const config = publishedConfig(db);
  const data = useMemo(() => toStoreData(db), [db]);
  const cart = useMemo(() => {
    const totals: Record<string, number> = {};
    bag.lines.forEach((line) => { totals[line.productId] = (totals[line.productId] || 0) + line.qty; });
    return totals;
  }, [bag.lines]);

  if (!config) return null;

  const actions: StoreActions = {
    add: (id, delta) => {
      if (delta > 0) {
        const product = db.products.find((p) => p.id === id);
        bag.add(id);
        if (product) toast(`${product.name} added to your bag.`, { icon: 'shopping_bag' });
        return;
      }
      const index = bag.lines.findIndex((line) => line.productId === id && !line.size);
      if (index < 0) return;
      if (bag.lines[index].qty <= 1) bag.remove(index);
      else bag.setQty(index, bag.lines[index].qty - 1);
    },
    view: (id) => setQuick(db.products.find((p) => p.id === id) ?? null),
    wish: (id) => {
      const saved = bag.wish.includes(id);
      bag.toggleWish(id);
      toast(saved ? 'Removed from wishlist.' : 'Saved to wishlist.', { icon: 'favorite' });
    },
    book: (id) => {
      const service = db.services.find((s) => s.id === id);
      const number = config.contact.whatsapp;
      if (number) window.open(`https://wa.me/91${number}?text=${encodeURIComponent(`Hi, I would like to book ${service?.name ?? 'a session'}.`)}`, '_blank', 'noopener');
      else document.getElementById('sf-contact')?.scrollIntoView({ behavior: 'smooth' });
    },
    track: () => router.push('/buyer/orders'),
  };
  const ctx: StoreCtx = {
    config, data, cart, wish: bag.wish, actions,
    extras: { payments: { online: db.shop.online !== false, upi: true }, pricesIncludeGst: false },
  };
  return (
    <>
      <StoreFront templateId={config.template} ctx={ctx} />
      <QuickView p={quick} base={base} onClose={() => setQuick(null)} />
      <div className="sf-float" role="group" aria-label="Your saved items and bag">
        <a className="sf-float-pill" href={`${base}/wishlist`}>♡ Saved <b>{bag.wish.length}</b></a>
        <a className="sf-float-pill dark" href={`${base}/bag`}>Bag <b>{bag.count}</b></a>
      </div>
    </>
  );
}
