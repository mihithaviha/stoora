// Numbers for Home, Money and Analytics, worked out from a real shop's orders (live mode). No React here.
import type { Order, Stats } from './types';

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const label = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short' });

export function deriveStats(orders: Order[]): Stats {
  const today = startOfDay(new Date());
  const at = (o: Order) => (o.createdIso ? new Date(o.createdIso).getTime() : today);
  const inRange = (o: Order, from: number, to: number) => at(o) >= from && at(o) < to;
  const sum = (list: Order[]) => list.reduce((a, o) => a + o.total, 0);
  const refunded = (from: number) => orders.flatMap((o) => o.refunds ?? []).filter((r) => (r.createdIso ? new Date(r.createdIso).getTime() : 0) >= from).reduce((a, r) => a + r.amount, 0);
  const paid = orders.filter((o) => o.paid);

  const salesByDay = Array.from({ length: 7 }, (_, i) => {
    const from = today - (6 - i) * DAY; const list = orders.filter((o) => inRange(o, from, from + DAY));
    return { day: i === 6 ? 'Today' : label(new Date(from)), sales: sum(list), orders: list.length, visits: 0 };
  });
  const salesByWeek = Array.from({ length: 5 }, (_, i) => {
    const from = today - (4 - i) * 7 * DAY; const list = orders.filter((o) => inRange(o, from, from + 7 * DAY));
    return { week: new Date(from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), sales: sum(list), orders: list.length };
  });
  const recent = orders.filter((o) => at(o) >= today - 30 * DAY);
  const sourcesPercent: Record<string, number> = {};
  recent.forEach((o) => { sourcesPercent[o.source] = (sourcesPercent[o.source] ?? 0) + 1; });
  Object.keys(sourcesPercent).forEach((k) => { sourcesPercent[k] = Math.round((sourcesPercent[k] / Math.max(1, recent.length)) * 100); });

  return {
    salesToday: sum(orders.filter((o) => at(o) >= today)), salesYesterday: sum(orders.filter((o) => inRange(o, today - DAY, today))),
    ordersYesterday: orders.filter((o) => inRange(o, today - DAY, today)).length,
    visitsToday: 0, visitsYesterday: 0,
    receivedToday: sum(paid.filter((o) => at(o) >= today)), receivedWeek: sum(paid.filter((o) => at(o) >= today - 6 * DAY)), receivedMonth: sum(paid.filter((o) => at(o) >= today - 29 * DAY)),
    refundsWeek: refunded(today - 6 * DAY), refundsMonth: refunded(today - 29 * DAY),
    salesByDay, salesByWeek, sourcesPercent,
    payout: { amount: 0, date: '—', to: 'No bank account linked yet' }, pastPayouts: [],
  };
}

/** "Today, 10:42 am", "Yesterday, 6:15 pm", "22 Oct, 11:30 am" */
export function labelOf(iso: string): string {
  const d = new Date(iso); const now = new Date();
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?([ap])m/i, (_, l) => ' ' + l.toLowerCase() + 'm');
  if (startOfDay(d) === startOfDay(now)) return `Today, ${time}`;
  if (startOfDay(d) === startOfDay(now) - DAY) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`;
}
