import type { Order } from './types';

/** What a buyer sees for an order: a label, a badge colour and an icon. */
export const statusOf = (o: Order): [string, 'ok' | 'warn' | 'neutral', string] =>
  o.shipped ? (o.tracking && /^(Today|Yesterday|Just now|2[4-9] Oct)/.test(o.createdAt) ? ['On the way', 'warn', 'local_shipping'] : ['Delivered', 'ok', 'check_circle'])
    : o.paid || o.method === 'cod' ? ['Being packed', 'warn', 'inventory_2'] : ['Waiting for payment', 'neutral', 'schedule'];
