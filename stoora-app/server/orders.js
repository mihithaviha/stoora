/**
 * Changes the server makes to orders (buyer checkout, Razorpay confirmations, fulfilment, expiry).
 * Orders are stored as JSON rows; the dashboard reads them the same way.
 *
 * Two statuses are kept apart on purpose:
 *   payStatus  awaiting_payment (online, not yet paid) | failed | pending (pay separately) | paid | refunded
 *   fulfil     placed | confirmed | processing | shipped | delivered | cancelled
 * `paid`, `shipped` and `refunded` stay as simple flags, because the dashboard and reports already use them.
 */
'use strict';

const { db, listRecords, saveRecord } = require('./db');
const { config } = require('./config');

/** "Today, 4:15 pm", "Yesterday, ..." or "23 Oct, ..." */
function dateLabel(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = date
    .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\s?([ap])m/i, (_, letter) => ` ${letter.toLowerCase()}m`);
  if (date.toDateString() === now.toDateString()) return `Today, ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`;
}

const nextOrderId = (ownerId) =>
  listRecords(ownerId, 'orders').reduce((max, order) => Math.max(max, Number(order.id) || 0), 1000) + 1;

const FULFILMENT = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

/** The fulfilment status of any order, including older ones that only have the paid and shipped flags. */
function fulfilOf(order) {
  if (FULFILMENT.includes(order.fulfil)) return order.fulfil;
  if (order.shipped) return 'shipped';
  return order.paid || order.payMode === 'manual' ? 'confirmed' : 'placed';
}

/** The payment status of any order, including older ones. */
function payStatusOf(order) {
  if (order.refunded) return 'refunded';
  if (order.paid) return 'paid';
  return order.payStatus || 'pending';
}

/** Save an order that changed. Returns the order, or null if it does not exist. */
function updateOrder(ownerId, orderId, change) {
  const orders = listRecords(ownerId, 'orders');
  const order = orders.find((item) => String(item.id) === String(orderId));
  if (!order) return null;
  change(order);
  saveRecord(ownerId, 'orders', order, orders.indexOf(order));
  return order;
}

/* ---------- stock ---------- */

/** Put an order's stock back on the shelf, once. Services and products without tracked stock are left alone. */
function releaseStock(ownerId, order) {
  if (order.stockReleased) return;
  const products = listRecords(ownerId, 'products');
  for (const [productId, quantity] of order.items || []) {
    const product = products.find((item) => item.id === productId);
    if (product && product.stock != null) {
      product.stock += quantity;
      saveRecord(ownerId, 'products', product, products.indexOf(product));
    }
  }
  order.stockReleased = true;
}

/** Take stock again for an order that was released and is now paid after all. Returns true when there was enough. */
function retakeStock(ownerId, order) {
  const products = listRecords(ownerId, 'products');
  let enough = true;
  for (const [productId, quantity] of order.items || []) {
    const product = products.find((item) => item.id === productId);
    if (product && product.stock != null) {
      if (product.stock < quantity) enough = false;
      product.stock = Math.max(0, product.stock - quantity);
      saveRecord(ownerId, 'products', product, products.indexOf(product));
    }
  }
  order.stockReleased = false;
  return enough;
}

/* ---------- payment changes ---------- */

/** Mark an order paid. Safe to call twice (Razorpay may confirm both by browser and webhook). */
function markOrderPaid(ownerId, orderId, method, paymentId) {
  return updateOrder(ownerId, orderId, (order) => {
    if (order.paid) return;
    order.paid = true;
    order.payStatus = 'paid';
    order.payMethod = method;
    if (paymentId) order.paymentId = paymentId;
    order.notes = [...(order.notes || []), `Paid online by ${method}${paymentId ? ` · ${paymentId}` : ''}`];
    if (order.fulfil === 'cancelled' && order.expired) {
      // The payment arrived after the hold ran out: the buyer paid, so the order is back on.
      order.fulfil = 'placed';
      order.expired = false;
      if (!retakeStock(ownerId, order))
        order.notes.push('Paid after the hold expired and stock ran short. Please check it.');
    }
    if (!order.fulfil || order.fulfil === 'placed') order.fulfil = 'confirmed';
  });
}

/** A payment attempt failed. The order stays open so the buyer can try again. */
function markPaymentFailed(ownerId, orderId, reason) {
  return updateOrder(ownerId, orderId, (order) => {
    if (order.paid) return;
    order.payStatus = 'failed';
    order.payFailure = reason || 'Payment failed';
  });
}

function markOrderRefunded(ownerId, orderId, amount) {
  return updateOrder(ownerId, orderId, (order) => {
    order.refunded = true;
    order.payStatus = 'refunded';
    order.refundAmount = amount;
  });
}

/* ---------- fulfilment ---------- */

/**
 * Cancel an order and put its stock back. `expired` is for an online order nobody paid in time:
 * it can come back to life if the payment turns up late.
 */
function cancelOrder(ownerId, orderId, { expired = false } = {}) {
  return updateOrder(ownerId, orderId, (order) => {
    if (order.fulfil === 'cancelled') return;
    order.fulfil = 'cancelled';
    order.shipped = false;
    order.expired = expired;
    releaseStock(ownerId, order);
    order.notes = [...(order.notes || []), expired ? 'Cancelled: payment was not made in time' : 'Cancelled'];
  });
}

/** Move an order to a new fulfilment status. A cancelled order stays cancelled. Returns the order or throws a message. */
function setFulfilment(ownerId, orderId, next) {
  if (!FULFILMENT.includes(next)) throw new Error('That is not an order status');
  let problem = '';
  const order = updateOrder(ownerId, orderId, (item) => {
    const current = fulfilOf(item);
    if (current === next) return;
    if (current === 'cancelled') {
      problem = 'A cancelled order cannot be reopened. Ask the buyer to place a new order.';
      return;
    }
    if (next === 'cancelled') {
      item.fulfil = 'cancelled';
      item.shipped = false;
      item.expired = false;
      releaseStock(ownerId, item);
      item.notes = [...(item.notes || []), 'Cancelled'];
      return;
    }
    item.fulfil = next;
    item.shipped = next === 'shipped' || next === 'delivered';
  });
  if (problem) throw new Error(problem);
  return order;
}

/**
 * Online-payment orders that nobody paid within the hold time are cancelled and their stock is released,
 * so abandoned checkouts cannot lock up a shop's stock. Runs on a timer and before each checkout.
 */
function expireAbandonedOrders(now = Date.now()) {
  const cutoff = now - config.razorpay.holdMinutes * 60 * 1000;
  const rows = db
    .prepare(`SELECT user_id, data FROM records WHERE kind = 'orders' AND data LIKE '%"payStatus":"awaiting_payment"%'`)
    .all();
  let cancelled = 0;
  for (const row of rows) {
    const order = JSON.parse(row.data);
    if (order.payStatus === 'awaiting_payment' && !order.paid && order.fulfil !== 'cancelled' && order.ts < cutoff) {
      cancelOrder(row.user_id, order.id, { expired: true });
      cancelled += 1;
    }
  }
  return cancelled;
}

module.exports = {
  FULFILMENT,
  dateLabel,
  nextOrderId,
  fulfilOf,
  payStatusOf,
  updateOrder,
  releaseStock,
  markOrderPaid,
  markPaymentFailed,
  markOrderRefunded,
  cancelOrder,
  setFulfilment,
  expireAbandonedOrders,
};
