/**
 * Numbers for the Analytics page. Each function reads ONE seller's records (the signed-in owner, fixed
 * when the request starts) and returns plain numbers.
 */
'use strict';

const { listRecords } = require('../db');

const DAY = 24 * 60 * 60 * 1000;
const sum = (items, pick) => items.reduce((total, item) => total + pick(item), 0);
const clampDays = (value) => Math.min(90, Math.max(1, Math.floor(Number(value)) || 7));
const percentChange = (now, before) => (before ? Math.round(((now - before) / before) * 100) : null);

/** Midnight at the start of today, in the server's time zone. */
function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Orders and sales between two moments. Only paid, not refunded orders count as sales. */
function periodTotals(ownerId, from, to) {
  const orders = listRecords(ownerId, 'orders').filter((order) => order.ts && order.ts >= from && order.ts < to);
  const sales = orders.filter((order) => order.paid && !order.refunded);
  return { orders: orders.length, paidOrders: sales.length, sales: sum(sales, (order) => order.total) };
}

/** Sales for the last `days` days, the days before that for comparison, and a bar for each day. */
function salesSummary(ownerId, days) {
  const length = clampDays(days);
  const end = startOfToday() + DAY;
  const start = end - length * DAY;
  const now = periodTotals(ownerId, start, end);
  const before = periodTotals(ownerId, start - length * DAY, start);

  const paid = listRecords(ownerId, 'orders').filter((order) => order.ts && order.paid && !order.refunded);

  // One bar per day, or per week for ranges over 30 days.
  const bucket = length > 30 ? 7 : 1;
  const bars = [];
  for (let index = Math.floor(length / bucket) - 1; index >= 0; index--) {
    const bucketStart = end - (index + 1) * bucket * DAY;
    bars.push({
      label: new Date(bucketStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      value: sum(
        paid.filter((order) => order.ts >= bucketStart && order.ts < bucketStart + bucket * DAY),
        (order) => order.total,
      ),
    });
  }
  return {
    days: length,
    sales: now.sales,
    orders: now.orders,
    paidOrders: now.paidOrders,
    averageOrder: now.paidOrders ? Math.round(now.sales / now.paidOrders) : 0,
    previous: { sales: before.sales, orders: before.orders },
    salesChangePercent: percentChange(now.sales, before.sales),
    ordersChangePercent: percentChange(now.orders, before.orders),
    bars,
  };
}

function topProducts(ownerId, days) {
  const length = clampDays(days);
  const since = startOfToday() + DAY - length * DAY;
  const catalogue = [...listRecords(ownerId, 'products'), ...listRecords(ownerId, 'services')];
  const rows = {};
  for (const order of listRecords(ownerId, 'orders')) {
    if (!order.ts || order.ts < since || !order.paid) continue;
    for (const [id, quantity] of order.items || []) {
      const item = catalogue.find((entry) => entry.id === id);
      if (!item) continue;
      const row = (rows[id] = rows[id] || { name: item.name, sold: 0, earned: 0 });
      row.sold += quantity;
      row.earned += item.price * quantity;
    }
  }
  return {
    days: length,
    products: Object.values(rows)
      .sort((a, b) => b.earned - a.earned)
      .slice(0, 5),
  };
}

function ratings(ownerId) {
  const reviews = listRecords(ownerId, 'reviews');
  const catalogue = [...listRecords(ownerId, 'products'), ...listRecords(ownerId, 'services')];
  const byItem = {};
  for (const review of reviews) {
    const row = (byItem[review.productId] = byItem[review.productId] || { total: 0, count: 0 });
    row.total += review.rating;
    row.count += 1;
  }
  return {
    reviewCount: reviews.length,
    items: Object.entries(byItem)
      .map(([id, row]) => ({
        name: (catalogue.find((item) => item.id === id) || {}).name,
        average: Math.round((row.total / row.count) * 10) / 10,
        reviews: row.count,
      }))
      .filter((row) => row.name),
  };
}

module.exports = { salesSummary, topProducts, ratings, periodTotals };
