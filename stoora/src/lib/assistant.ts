// Assistant helpers shared by the client panel and the /api/assistant route.
import type { ActionKey, AssistantAnswer, ChartKey, Db } from './types';
import { moneyWaiting, orderFilters } from './derive';
import { plural, rs } from './format';

export const SUGGESTIONS = [
  'How is my shop performing today?',
  'What orders need attention?',
  'How much money am I waiting to receive?',
  'Which products are selling best?',
  'Which customers need a reply?',
  'What should I do first today?',
];

export const CHART_KEYS: ChartKey[] = ['sales_7d', 'orders_7d', 'best_sellers', 'product_views', 'money_status', 'order_status', 'order_sources'];
export const ACTIONS: Record<ActionKey, { label: string; href: string }> = {
  open_orders_to_ship: { label: 'Open orders to ship', href: '/orders?filter=To%20ship' },
  open_unpaid: { label: 'See unpaid orders', href: '/orders?filter=Unpaid' },
  review_messages: { label: 'Review messages', href: '/chats' },
  open_money: { label: 'Open Money', href: '/money' },
  open_products: { label: 'Open products', href: '/products' },
  create_order: { label: 'Create an order', href: '/orders/new' },
  open_analytics: { label: 'Open analytics', href: '/analytics' },
  open_bookings: { label: 'Open bookings', href: '/orders?tab=bookings' },
};

/** The ONLY data the AI sees: this seller's shop. In production, build this on the server from the
 *  signed-in seller's records instead of trusting what the browser sends. */
export function shopSnapshot(db: Db) {
  const w = moneyWaiting(db);
  return {
    shop: db.shop.name, owner: db.shop.owner,
    sales: { today: db.stats.salesToday, yesterday: db.stats.salesYesterday, ordersYesterday: db.stats.ordersYesterday, last7Days: db.stats.salesByDay },
    visits: { today: db.stats.visitsToday, yesterday: db.stats.visitsYesterday },
    money: { receivedToday: db.stats.receivedToday, waitingTotal: w.reduce((a, x) => a + x.amount, 0), waiting: w, nextPayout: db.stats.payout },
    orders: db.orders.map((o) => ({ id: '#' + o.id, buyer: o.buyer, total: o.total, paid: o.paid, method: o.method, shipped: o.shipped, from: o.source, when: o.createdAt })),
    products: db.products.map((p) => ({ name: p.name, price: p.price, stock: p.stock, status: p.status, soldLast30Days: p.soldLast30Days, viewsYesterday: p.viewsYesterday ?? null })),
    chats: db.chats.map((c) => ({ buyer: c.buyer, from: c.source, group: { ready: 'ready to buy', upset: 'upset', look: 'just looking' }[c.mood], unread: c.unread, lastMessage: c.last })),
    bookings: db.bookings.map((b) => ({ buyer: b.buyer, when: b.when, paid: b.paid, status: b.status })),
    orderSourcesPercent: db.stats.sourcesPercent,
    notAvailable: ['profit or costs', 'delivery status from couriers', 'visits per product before yesterday'],
  };
}

export function assistantRules(owner: string, shop: string) {
  return `You are Stoora, the shop assistant inside the Stoora seller dashboard. You are talking to ${owner}, who runs ${shop}, a small business in India. Many sellers have never used business software.
Write plain, warm English a 15-year-old understands. Short sentences. No jargon: say "people who visited and bought", not "conversion rate". No emoji. No exclamation marks. Rupees with Indian grouping, like ₹1,499.
Use ONLY numbers and names in SHOP DATA. Never invent figures. If the data does not cover the question, say so and name what is missing. You cannot send, post or change anything; you may only suggest one action button.
Reply with ONLY one JSON object:
{"answer":"1-2 sentences","facts":["up to 4 short facts with real numbers"],"chart":one of ${JSON.stringify(CHART_KEYS)} or null,"chartNote":"one plain sentence" or null,"next":"one next step" or null,"action":one of ${JSON.stringify(Object.keys(ACTIONS))} or null}`;
}

export function cleanAnswer(r: unknown, mode: 'ai' | 'demo'): AssistantAnswer {
  const o = (r ?? {}) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const answer = s(o.answer); if (!answer) throw new Error('bad_answer');
  return {
    answer, mode,
    facts: Array.isArray(o.facts) ? o.facts.map(s).filter((x): x is string => !!x).slice(0, 4) : [],
    chart: CHART_KEYS.includes(o.chart as ChartKey) ? (o.chart as ChartKey) : null,
    chartNote: s(o.chartNote), next: s(o.next),
    action: (o.action as string) in ACTIONS ? (o.action as ActionKey) : null,
  };
}

/** Demo answers worked out from the shop's numbers (no AI). Shown with a "demo" label. */
export function demoAnswer(q: string, db: Db): AssistantAnswer {
  const t = q.toLowerCase(); const w = moneyWaiting(db); const wt = w.reduce((a, x) => a + x.amount, 0);
  const toShip = db.orders.filter(orderFilters['To ship']).length; const unpaid = db.orders.filter(orderFilters.Unpaid).length;
  const unread = db.chats.filter((c) => c.unread); const ready = unread.filter((c) => c.mood === 'ready');
  const base = { mode: 'demo' as const };
  if (/money|waiting|pay|owe|receive/.test(t)) return { ...base, answer: `${plural(w.length, 'buyer')} still owe you ${rs(wt)}.`, facts: w.map((x) => `${x.who} owes ${rs(x.amount)} (${x.ref})`), chart: 'money_status', chartNote: `You received ${rs(db.stats.receivedToday)} today. ${rs(wt)} is still to come.`, next: 'Send each of them a polite UPI reminder.', action: 'open_money' };
  if (/product|selling|best|stock/.test(t)) { const top = [...db.products].sort((a, b) => b.soldLast30Days - a.soldLast30Days); return { ...base, answer: `${top[0].name} sells best: ${top[0].soldLast30Days} in the last 30 days.`, facts: top.slice(0, 3).map((p) => `${p.name}: ${p.soldLast30Days} sold, ${p.stock === 0 ? 'sold out' : p.stock + ' left'}`), chart: 'best_sellers', chartNote: 'Units sold in the last 30 days.', next: db.products.some((p) => p.stock > 0 && p.stock <= 3) ? 'The indigo kurta set has only 3 left. Think about restocking it.' : null, action: 'open_products' }; }
  if (/repl|customer|message|chat/.test(t)) return { ...base, answer: `${plural(unread.length, 'buyer is', 'buyers are')} waiting for a reply.`, facts: unread.map((c) => `${c.buyer} on ${c.source}: “${c.last}”`), chart: null, chartNote: null, next: ready.length ? `Start with ${ready[0].buyer} — they are ready to buy.` : null, action: 'review_messages' };
  if (/order|attention|ship/.test(t)) return { ...base, answer: `${plural(toShip, 'order')} to ship and ${plural(unpaid, 'order')} not paid yet.`, facts: db.orders.slice(0, 4).map((o) => `#${o.id} · ${o.buyer} · ${rs(o.total)} · ${o.paid ? 'paid' : 'not paid'}${o.shipped ? ' · shipped' : ''}`), chart: 'order_status', chartNote: 'Where your orders stand right now.', next: 'Pack the paid order first.', action: 'open_orders_to_ship' };
  if (/first|focus|do/.test(t)) return { ...base, answer: `Reply to ${plural(ready.length, 'buyer')} ready to buy, then ship the paid order.`, facts: [`${plural(ready.length, 'buyer is', 'buyers are')} ready to buy`, `${plural(toShip, 'paid order')} to ship`, `${rs(wt)} still to be paid`], chart: null, chartNote: null, next: 'Open your chats and send the drafted replies after checking them.', action: 'review_messages' };
  return { ...base, answer: `Today you have made ${rs(db.stats.salesToday)} so far — already more than all of yesterday (${rs(db.stats.salesYesterday)}).`, facts: [`${db.stats.visitsToday} visits today, ${db.stats.visitsYesterday} yesterday`, `${plural(toShip, 'order')} to ship`, `${rs(wt)} still to be paid`], chart: 'sales_7d', chartNote: (() => { const d = db.stats.salesByDay.slice(0, -1); const b = d.reduce((x, y) => (y.sales > x.sales ? y : x), d[0]); return b ? `${b.day} was your best full day (${rs(b.sales)}).` : null; })(), next: null, action: 'open_analytics' };
}
