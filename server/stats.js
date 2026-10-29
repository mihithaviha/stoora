/**
 * Numbers for Home, Money and Analytics, worked out from a shop's own records.
 */
'use strict';

const { sql, listRecords } = require('./db');

const DAY = 24 * 60 * 60 * 1000;
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const sum = (items, pick) => items.reduce((total, item) => total + pick(item), 0);

/** Average rating and count for each product that has reviews. */
function ratingsByProduct(reviews) {
  const table = {};
  for (const review of reviews) {
    const row = (table[review.productId] = table[review.productId] || { total: 0, count: 0 });
    row.total += review.rating;
    row.count += 1;
  }
  return Object.fromEntries(
    Object.entries(table).map(([id, row]) => [id, { average: row.total / row.count, count: row.count }]),
  );
}

/** Sales for each of the last 7 days (oldest first), for the bar chart. */
function weeklyBars(paidOrders) {
  const bars = [];
  for (let back = 6; back >= 0; back--) {
    const day = new Date(Date.now() - back * DAY);
    bars.push({
      day: day.toLocaleDateString('en-IN', { weekday: 'short' }),
      sales: sum(
        paidOrders.filter((order) => sameDay(order.ts, day)),
        (order) => order.total,
      ),
    });
  }
  return bars;
}

/** Products ranked by money earned, from what orders contain. */
function bestSellers(orders, catalogue) {
  const rows = {};
  for (const order of orders) {
    for (const [productId, quantity] of order.items || []) {
      const product = catalogue.find((item) => item.id === productId);
      if (!product) continue;
      const row = (rows[productId] = rows[productId] || {
        id: productId,
        name: product.name,
        emoji: product.emoji,
        sold: 0,
        rev: 0,
      });
      row.sold += quantity;
      row.rev += product.price * quantity;
    }
  }
  return Object.values(rows)
    .sort((a, b) => b.rev - a.rev)
    .slice(0, 5);
}

function computeStats(ownerId) {
  const orders = listRecords(ownerId, 'orders');
  const bookings = listRecords(ownerId, 'bookings');
  const customers = listRecords(ownerId, 'customers');
  const reviews = listRecords(ownerId, 'reviews');
  const catalogue = [...listRecords(ownerId, 'products'), ...listRecords(ownerId, 'services')];

  const datedOrders = orders.filter((order) => order.ts);
  const todaysOrders = datedOrders.filter((order) => sameDay(order.ts, Date.now()));
  const weeksOrders = datedOrders.filter((order) => order.ts >= Date.now() - 6 * DAY);
  const paidOrders = datedOrders.filter((order) => order.paid && !order.refunded);

  const paidBookings = bookings.filter((booking) => booking.paid);
  const bookingIncome = sum(
    paidBookings,
    (booking) => (catalogue.find((item) => item.id === booking.svc) || { price: 0 }).price,
  );

  const channels = {};
  for (const order of orders) channels[order.src || 'Other'] = (channels[order.src || 'Other'] || 0) + 1;

  const weekStart = new Date(Date.now() - 6 * DAY).toISOString().slice(0, 10);
  const visits = sql.visitsSince.all(ownerId, weekStart);
  const today = new Date().toISOString().slice(0, 10);

  return {
    todaySales: sum(
      todaysOrders.filter((order) => order.paid),
      (order) => order.total,
    ),
    todayOrders: todaysOrders.length,
    weekSales: sum(
      weeksOrders.filter((order) => order.paid),
      (order) => order.total,
    ),
    weekOrders: weeksOrders.length,
    received:
      sum(
        orders.filter((order) => order.paid && !order.refunded),
        (order) => order.total,
      ) + bookingIncome,
    pending: sum(
      orders.filter((order) => !order.paid && !order.cancelled),
      (order) => order.total,
    ),
    refunds: sum(
      orders.filter((order) => order.refunded),
      (order) => order.refundAmount || order.total,
    ),
    orders: orders.length,
    bookings: bookings.length,
    customers: customers.length,
    returning: customers.filter((customer) => customer.orders > 1).length,
    visitsToday: (visits.find((visit) => visit.day === today) || { n: 0 }).n,
    visitsWeek: sum(visits, (visit) => visit.n),
    bars: weeklyBars(paidOrders),
    channels,
    best: bestSellers(orders, catalogue),
    ratings: ratingsByProduct(reviews),
  };
}

module.exports = { computeStats, ratingsByProduct };
