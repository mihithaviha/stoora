'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { QuickView } from '../shop/ShopChrome';
import { useToast } from '../ui';
import { StdCartDrawer } from './StdCart';
import { StoreFront, type StoreActions, type StoreCtx } from './Templates';
import { useBag } from '@/lib/bag';
import { deliveryLine } from '@/lib/delivery';
import { PAUSED_LINE } from '@/lib/shopstate';
import { useStore } from '@/lib/store';
import { shopAnnounce } from '@/lib/storefront/announce';
import { publishedConfig, toStoreData } from '@/lib/storefront/map';
import type { Product } from '@/lib/types';

/** The live shop page: the Standard storefront with the seller's own products, wired to the shop's own bag, saved items and product pages. */
export function ShopStore({ base }: { base: string }) {
  const { db } = useStore();
  const bag = useBag();
  const toast = useToast();
  const router = useRouter();
  const [quick, setQuick] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const config = publishedConfig(db);
  // /s/<shop>?bag=1 opens the bag; ?quick=<product> opens that product's quick view
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('bag') === '1') setCartOpen(true);
    const quickId = p.get('quick');
    if (quickId) setQuick(db.products.find((x) => x.id === quickId && x.status === 'Active') ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const data = useMemo(() => toStoreData(db), [db]);
  const cart = useMemo(() => {
    const totals: Record<string, number> = {};
    bag.lines.forEach((line) => { totals[line.productId] = (totals[line.productId] || 0) + line.qty; });
    return totals;
  }, [bag.lines]);

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
      else document.getElementById('sx-contact')?.scrollIntoView({ behavior: 'smooth' });
    },
    track: () => router.push('/buyer/orders'),
    cart: () => setCartOpen(true),
  };
  const ctx: StoreCtx = {
    config, data, cart, wish: bag.wish, actions, paused: !db.shop.open, base, cartCount: bag.count,
    extras: { payments: { online: db.shop.online !== false, upi: true }, pricesIncludeGst: false, announce: shopAnnounce(db, bag.rule), delivery: deliveryLine(bag.rule), cod: Boolean(db.shop.cod) },
  };
  return (
    <>
      {!db.shop.open ? <div className="announce" role="status">{PAUSED_LINE}</div> : null}
      <StoreFront templateId="standard" ctx={ctx} />
      <QuickView p={quick} base={base} onClose={() => setQuick(null)} />
      <StdCartDrawer open={cartOpen} onClose={() => setCartOpen(false)} base={base} />
    </>
  );
}
