// One delivery rule for the whole app. The seller sets it in Settings > Delivery (saved in shops.order_settings as "fee" and "freeOver").
// The database (place_order) uses the same two numbers and the same defaults, so the bag, checkout, manual orders and the saved order all agree.
import type { Shop } from './types';

export const DEFAULT_FEE = 60;
export const DEFAULT_FREE_OVER = 1500;

const num = (v: unknown, fallback: number) => { const s = String(v ?? '').replace(/\D/g, ''); return s === '' ? fallback : Number(s); };

/** What the seller chose (or the defaults). fee 0 means delivery is always free. freeOver 0 means there is no free-delivery limit. */
export function deliveryRule(shop: Pick<Shop, 'orderSettings'>): { fee: number; freeOver: number } {
  const o = shop.orderSettings ?? {};
  return { fee: num(o.fee, DEFAULT_FEE), freeOver: num(o.freeOver, DEFAULT_FREE_OVER) };
}

/** The delivery charge for a bag worth `subtotal` rupees. */
export function deliveryFor(subtotal: number, shop: Pick<Shop, 'orderSettings'>): number {
  if (subtotal <= 0) return 0;
  const { fee, freeOver } = deliveryRule(shop);
  return fee === 0 || (freeOver > 0 && subtotal >= freeOver) ? 0 : fee;
}

/** The delivery rule in words, for buyers. Same numbers everywhere (bag, checkout, product page). */
export function deliveryLine(rule: { fee: number; freeOver: number }): string {
  const rs = (n: number) => '₹' + n.toLocaleString('en-IN');
  return rule.fee === 0 ? 'Free delivery on every order' : rule.freeOver > 0 ? `Delivery ${rs(rule.fee)}, free on orders over ${rs(rule.freeOver)}` : `Delivery ${rs(rule.fee)}`;
}
