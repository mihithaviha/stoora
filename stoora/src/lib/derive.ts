// Derived values shared by screens, the assistant and server routes (no React here).
import type { Db, Order } from './types';

/* ---------- derived values used by several screens ---------- */
export const orderFilters = {
  All: (_o: Order) => true,
  'To ship': (o: Order) => !o.shipped && (o.paid || o.method === 'cod'),
  Unpaid: (o: Order) => !o.paid && o.method !== 'cash',
  Done: (o: Order) => o.shipped && o.paid,
} as const;
export type OrderFilter = keyof typeof orderFilters;

export function moneyWaiting(db: Db) {
  return [
    ...db.orders.filter((o) => !o.paid && o.method === 'upi').map((o) => ({ who: o.buyer, ref: '#' + o.id, amount: o.total, since: o.createdAt })),
    ...db.bookings.filter((b) => !b.paid).map((b) => ({ who: b.buyer, ref: b.id, amount: db.services.find((s) => s.id === b.serviceId)?.price ?? 0, since: 'booked for ' + b.when })),
  ];
}
