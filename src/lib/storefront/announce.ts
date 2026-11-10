import { deliveryLine } from '../delivery';
import type { Db } from '../types';

/** The facts a shop can say about itself at the top of its page. Every line is true for this shop. */
export function shopAnnounce(db: Pick<Db, 'shop'>, rule: { fee: number; freeOver: number }): string[] {
  const lines = [deliveryLine(rule)];
  if (db.shop.city) lines.push(`Ships from ${db.shop.city}`);
  lines.push(db.shop.online !== false ? 'UPI, cards and netbanking' : 'Pay by UPI');
  if (db.shop.cod) lines.push('Cash on delivery available');
  return lines;
}
