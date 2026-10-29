/**
 * Payments: starting a payment for an order, confirming it (browser proof and Razorpay webhook),
 * refunds, the payments list, and each seller's payout account (Razorpay Route).
 *
 * Rules that hold everywhere in this file:
 *  - The amount always comes from the stored order, never from the browser.
 *  - An order becomes "paid" only after a verified signature or a signed webhook.
 *  - Every query is limited to the signed-in seller's own rows.
 */
'use strict';

const { sql, listRecords } = require('../db');
const { HttpError, isRateLimited } = require('../http');
const { cleanText } = require('../auth');
const { config, integrationStatus } = require('../config');
const orders = require('../orders');
const { markOrderRefunded, markPaymentFailed } = orders;
const { paymentSetup } = require('../commerce');
const razorpay = require('../services/razorpay');
const email = require('../services/email');
const premium = require('../premium');

const ROUTE_STATUSES = ['created', 'needs_clarification', 'under_review', 'activated', 'suspended', 'rejected'];

/** The linked account that may receive this seller's money, or null. Only an activated account counts. */
function activeLinkedAccount(ownerId) {
  const row = sql.payoutAccount.get(ownerId);
  return row && row.status === 'activated' ? row.razorpay_account_id : null;
}

/**
 * Create (or reuse) the Razorpay payment for an order and return what the browser needs to open it.
 * The amount is the order's stored total. A retry reuses the open Razorpay order for the same amount.
 */
async function startOnlinePayment(owner, order) {
  const existing = sql.paymentForOrder.get(owner.id, String(order.id));
  if (existing && existing.status === 'created' && existing.amount === order.total * 100) {
    return { keyId: config.razorpay.keyId, orderId: existing.rzp_order_id, amount: existing.amount, currency: 'INR' };
  }
  const created = await razorpay.createOrder({
    amountRupees: order.total,
    receipt: `stoora_${order.id}_${Date.now().toString(36)}`,
    notes: { shop: owner.handle, order: String(order.id) },
    linkedAccountId: activeLinkedAccount(owner.id),
  });
  sql.insertPayment.run(owner.id, String(order.id), created.id, order.total * 100, 'created', Date.now());
  return { keyId: config.razorpay.keyId, orderId: created.id, amount: order.total * 100, currency: 'INR' };
}

/**
 * The one place an online payment becomes "paid". Safe to call many times for the same payment
 * (browser proof, webhook and a status check may all arrive): the seller is told once.
 */
function confirmOnlinePayment(ownerId, orderId, method, paymentId, paymentRowId) {
  const before = orders.updateOrder(ownerId, orderId, () => {});
  if (!before) return null;
  const wasPaid = Boolean(before.paid);
  if (paymentRowId)
    sql.updatePaymentDetails.run('paid', paymentId || null, method || null, null, null, Date.now(), paymentRowId);
  const order = orders.markOrderPaid(ownerId, orderId, method || 'Razorpay', paymentId);
  if (!wasPaid && order && order.paid) {
    const owner = sql.userById.get(ownerId);
    if (owner && (JSON.parse(owner.settings).cfg || {}).notifyEmail !== false)
      email.sendNewOrder(owner, order, order.total);
  }
  return order;
}

/* ---------- applying Razorpay's webhook events ---------- */

function applyWebhookEvent(event) {
  const entity = (name) => event.payload && event.payload[name] && event.payload[name].entity;
  const payment = entity('payment');
  const order = entity('order');
  const refund = entity('refund');

  // Razorpay tells us when a seller's linked account is activated, suspended or rejected.
  const account = entity('account');
  if (account && account.id && String(event.event).startsWith('account.')) {
    const link = sql.payoutAccountOwner.get(account.id);
    if (link && ROUTE_STATUSES.includes(account.status))
      sql.savePayoutAccount.run(link.user_id, account.id, account.status, Date.now());
    return;
  }

  // SQLite refuses undefined, so every field is turned into a value or null first.
  const fields = {
    id: null,
    method: null,
    contact: null,
    ...(payment ? { id: payment.id ?? null, method: payment.method ?? null, contact: payment.contact ?? null } : {}),
  };
  const razorpayOrderId = (payment && payment.order_id) || (order && order.id);
  const row = razorpayOrderId
    ? sql.paymentByRzpOrder.get(razorpayOrderId)
    : refund && sql.paymentByRzpPayment.get(refund.payment_id);
  if (!row) {
    // A template purchase is not a buyer's order: it has its own records.
    if (['payment.captured', 'order.paid'].includes(event.event))
      premium.confirmFromWebhook(razorpayOrderId, payment && payment.id);
    return;
  }
  const now = Date.now();

  switch (event.event) {
    case 'payment.captured':
    case 'order.paid':
      sql.updatePaymentDetails.run('paid', fields.id, fields.method, null, fields.contact, now, row.id);
      confirmOnlinePayment(row.user_id, row.order_id, fields.method || 'Razorpay', fields.id);
      break;
    case 'payment.failed':
      // A failed attempt never overrides a payment that already succeeded.
      if (row.status !== 'paid') {
        const reason =
          payment && payment.error_description ? String(payment.error_description).slice(0, 200) : 'Payment failed';
        sql.updatePaymentDetails.run('failed', fields.id, fields.method, reason, fields.contact, now, row.id);
        markPaymentFailed(row.user_id, row.order_id, reason);
      }
      break;
    case 'refund.processed':
      if (refund) {
        const total = row.refunded_amount + (row.refund_id === refund.id ? 0 : refund.amount || 0);
        const amount = Math.max(row.refunded_amount, total);
        sql.recordRefund.run(amount >= row.amount ? 'refunded' : 'paid', refund.id, amount, now, row.id);
        markOrderRefunded(row.user_id, row.order_id, Math.round(amount / 100));
      }
      break;
    default:
  }
}

/** A payments row as the dashboard shows it, joined with its order. */
function describePayment(row, ordersById) {
  const order = ordersById.get(String(row.order_id));
  return {
    id: row.id,
    orderId: row.order_id,
    buyer: order ? order.who : '',
    phone: order ? order.phone || '' : '',
    razorpayOrderId: row.rzp_order_id,
    razorpayPaymentId: row.rzp_payment_id,
    amount: row.amount / 100,
    refunded: row.refunded_amount / 100,
    status: row.status, // created, paid, failed, refunded
    method: row.method || '',
    failureReason: row.failure_reason || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

module.exports = function registerPaymentRoutes(router) {
  /* ---- Razorpay calls this after each payment event; the body is signed with the webhook secret ---- */
  router.add('POST', '/api/webhooks/razorpay', { raw: true }, ({ req, raw }) => {
    if (!config.razorpay.webhookSecret) throw new HttpError(503, 'The webhook secret is not set on the server');
    if (!razorpay.isWebhookSignatureValid(raw, req.headers['x-razorpay-signature'] || '')) {
      throw new HttpError(400, 'Bad signature');
    }

    let event;
    try {
      event = JSON.parse(raw.toString('utf8'));
    } catch (_) {
      throw new HttpError(400, 'Bad JSON');
    }

    // Razorpay may deliver the same event twice; each one is handled once.
    const eventId = req.headers['x-razorpay-event-id'] || razorpay.hmacHex('event', raw.toString('utf8'));
    if (sql.webhookSeen.get(eventId)) return { ok: true, duplicate: true };
    sql.webhookRemember.run(eventId, Date.now());

    applyWebhookEvent(event);
    return { ok: true };
  });

  /* ---- start a payment for an order the seller already created (a payment link for the buyer, or "pay now") ---- */
  router.add('POST', '/api/orders/:id/payment', { auth: true, ownerOnly: true }, async ({ owner, params }) => {
    if (owner.demo) throw new HttpError(403, 'The sample shop is read-only');
    if (!razorpay.isConfigured()) throw new HttpError(503, 'Online payments are not set up on this server yet');
    if (paymentSetup(owner).state !== 'active')
      throw new HttpError(409, 'Your online payments are not active yet. Finish the payment setup in Settings first.');
    if (isRateLimited(`pay:${owner.id}`, 30, 10 * 60 * 1000))
      throw new HttpError(429, 'Too many tries. Wait a few minutes.');

    const order = listRecords(owner.id, 'orders').find((item) => String(item.id) === params.id);
    if (!order) throw new HttpError(404, 'Order not found');
    if (order.paid) throw new HttpError(409, 'This order is already paid');
    if (!(order.total >= 1)) throw new HttpError(400, 'This order has no amount to pay');

    try {
      return await startOnlinePayment(owner, order);
    } catch (error) {
      throw new HttpError(502, `The payment could not start: ${error.message}`);
    }
  });

  /* ---- after paying, the browser sends proof; we check it before calling the order paid ---- */
  router.add('POST', '/api/public/razorpay/verify', {}, ({ body }) => {
    if (!razorpay.isConfigured()) throw new HttpError(503, 'Razorpay is not set up on this server');
    const orderId = cleanText(body.razorpay_order_id, 60);
    const paymentId = cleanText(body.razorpay_payment_id, 60);
    const signature = cleanText(body.razorpay_signature, 200);
    if (!orderId || !paymentId || !signature) throw new HttpError(400, 'Missing fields');
    if (!razorpay.isPaymentSignatureValid(orderId, paymentId, signature)) {
      throw new HttpError(400, 'Payment could not be verified');
    }

    const row = sql.paymentByRzpOrder.get(orderId);
    if (!row) throw new HttpError(404, 'Unknown payment');
    confirmOnlinePayment(row.user_id, row.order_id, 'Razorpay', paymentId, row.id);
    return { ok: true, orderId: row.order_id };
  });

  /* ---- refund an online payment (Razorpay moves the money back to the buyer) ---- */
  router.add('POST', '/api/orders/:id/refund', { auth: true, ownerOnly: true }, async ({ owner, params, body }) => {
    if (owner.demo) throw new HttpError(403, 'The sample shop is read-only');
    if (!razorpay.isConfigured()) throw new HttpError(503, 'Online payments are not set up on this server yet');

    const payment = sql.paymentForOrder.get(owner.id, params.id);
    if (!payment || !payment.rzp_payment_id || !['paid', 'refunded'].includes(payment.status)) {
      throw new HttpError(400, 'Only orders paid online through Razorpay can be refunded here');
    }
    const remaining = (payment.amount - payment.refunded_amount) / 100;
    const amount = body.amount == null || body.amount === '' ? remaining : Number(body.amount);
    if (!(amount >= 1 && amount <= remaining)) throw new HttpError(400, `Enter an amount from ₹1 to ₹${remaining}`);

    let refund;
    try {
      refund = await razorpay.refundPayment(payment.rzp_payment_id, amount, {
        reason: cleanText(body.reason, 100),
        order: params.id,
      });
    } catch (error) {
      throw new HttpError(502, `Razorpay did not accept the refund: ${error.message}`);
    }
    const refundedPaise = payment.refunded_amount + Math.round(amount * 100);
    sql.recordRefund.run(
      refundedPaise >= payment.amount ? 'refunded' : 'paid',
      refund.id,
      refundedPaise,
      Date.now(),
      payment.id,
    );
    markOrderRefunded(owner.id, params.id, refundedPaise / 100);
    return { ok: true, refundId: refund.id, refunded: refundedPaise / 100 };
  });

  /* ---- the Payments page: every online payment for this seller, with filters ---- */
  router.add('GET', '/api/payments', { auth: true, ownerOnly: true }, ({ owner, url }) => {
    const status = url.searchParams.get('status') || '';
    const query = (url.searchParams.get('q') || '').trim().toLowerCase();
    const from = Number(url.searchParams.get('from')) || 0;
    const to = Number(url.searchParams.get('to')) || Infinity;

    const orders = new Map(listRecords(owner.id, 'orders').map((order) => [String(order.id), order]));
    const all = sql.paymentsForUser.all(owner.id).map((row) => describePayment(row, orders));
    const rows = all.filter((row) => {
      if (status && row.status !== status) return false;
      if (row.createdAt < from || row.createdAt > to) return false;
      return (
        !query ||
        [row.orderId, row.buyer, row.phone, row.razorpayPaymentId, row.razorpayOrderId, row.method].some((value) =>
          String(value || '')
            .toLowerCase()
            .includes(query),
        )
      );
    });

    const total = (list, pick) => list.reduce((sum, row) => sum + pick(row), 0);
    return {
      payments: rows,
      totals: {
        received: total(
          all.filter((row) => row.status === 'paid' || row.status === 'refunded'),
          (row) => row.amount - row.refunded,
        ),
        pending: total(
          all.filter((row) => row.status === 'created'),
          (row) => row.amount,
        ),
        failed: all.filter((row) => row.status === 'failed').length,
        refunded: total(all, (row) => row.refunded),
      },
    };
  });

  /* ---- what is switched on, and the latest online payments (Settings > Payments and Apps) ---- */
  router.add('GET', '/api/integrations', { auth: true }, ({ owner }) => ({
    ...integrationStatus(),
    payments: sql.recentPayments.all(owner.id),
  }));

  /* ---- Settings > Payments: where this seller stands, and the seller's choices ---- */
  router.add('GET', '/api/payments/setup', { auth: true, ownerOnly: true }, ({ owner }) => paymentSetup(owner));

  router.add('PUT', '/api/payments/setup', { auth: true, ownerOnly: true }, ({ owner, body }) => {
    if (owner.demo) throw new HttpError(403, 'The sample shop is read-only');
    const setup = paymentSetup(owner);
    const online = body.online === undefined ? setup.online : body.online === true;
    const manual = body.manual === undefined ? setup.manual : body.manual === true;
    if (online && !setup.canEnableOnline)
      throw new HttpError(
        409,
        `Online payments cannot be switched on yet: ${setup.label.toLowerCase()}. ${setup.detail}`,
      );
    if (!online && !manual) throw new HttpError(400, 'Keep at least one way for buyers to order and pay');
    const settings = JSON.parse(owner.settings);
    settings.cfg = {
      ...(settings.cfg || {}),
      onlinePayments: online,
      manualPayments: manual,
      manualInstructions:
        body.manualInstructions === undefined ? setup.manualInstructions : cleanText(body.manualInstructions, 400),
    };
    sql.setSettings.run(JSON.stringify(settings), owner.id);
    return paymentSetup({ ...owner, settings: JSON.stringify(settings) });
  });

  /* ---- fulfilment: the seller moves an order along (placed, confirmed, processing, shipped, delivered, cancelled) ---- */
  router.add('POST', '/api/orders/:id/status', { auth: true }, ({ user, owner, params, body }) => {
    if (owner.demo) throw new HttpError(403, 'The sample shop is read-only');
    if (!['owner', 'packing'].includes(user.role)) throw new HttpError(403, 'You cannot change orders');
    try {
      const order = orders.setFulfilment(owner.id, params.id, String(body.status || ''));
      if (!order) throw new HttpError(404, 'Order not found');
      return { ok: true, order };
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(409, error.message);
    }
  });

  /* ---- payout account (Razorpay Route) ---- */
  router.add('GET', '/api/payouts', { auth: true, ownerOnly: true }, ({ owner }) => {
    const row = sql.payoutAccount.get(owner.id);
    return {
      routeEnabled: integrationStatus().razorpay.route,
      account: row ? { id: row.razorpay_account_id, status: row.status, checkedAt: row.checked_at } : null,
    };
  });

  /**
   * The seller gives the id of their Razorpay linked account (acc_...), created in your Razorpay
   * Route dashboard. We ask Razorpay for its status and only use it for transfers once it is "activated".
   */
  router.add('POST', '/api/payouts/link', { auth: true, ownerOnly: true }, async ({ owner, body }) => {
    if (owner.demo) throw new HttpError(403, 'The sample shop is read-only');
    if (!integrationStatus().razorpay.route)
      throw new HttpError(503, 'Razorpay Route is not switched on for this server (RAZORPAY_ROUTE=1)');
    const accountId = cleanText(body.accountId, 40);
    if (!/^acc_[A-Za-z0-9]{8,}$/.test(accountId))
      throw new HttpError(400, 'A linked account id looks like acc_XXXXXXXXXXXXXX');

    const taken = sql.payoutAccountOwner.get(accountId);
    if (taken && taken.user_id !== owner.id) throw new HttpError(409, 'That account is already linked to another shop');

    let account;
    try {
      account = await razorpay.getLinkedAccount(accountId);
    } catch (error) {
      throw new HttpError(400, `Razorpay could not find that account: ${error.message}`);
    }
    const status = ROUTE_STATUSES.includes(account.status) ? account.status : 'created';
    sql.savePayoutAccount.run(owner.id, accountId, status, Date.now());
    return { account: { id: accountId, status, checkedAt: Date.now() } };
  });

  router.add('POST', '/api/payouts/refresh', { auth: true, ownerOnly: true }, async ({ owner }) => {
    const row = sql.payoutAccount.get(owner.id);
    if (!row) throw new HttpError(400, 'Link your Razorpay account first');
    let account;
    try {
      account = await razorpay.getLinkedAccount(row.razorpay_account_id);
    } catch (error) {
      throw new HttpError(502, `Razorpay could not be reached: ${error.message}`);
    }
    const status = ROUTE_STATUSES.includes(account.status) ? account.status : row.status;
    sql.savePayoutAccount.run(owner.id, row.razorpay_account_id, status, Date.now());
    return paymentSetup(sql.userById.get(owner.id));
  });

  router.add('DELETE', '/api/payouts/link', { auth: true, ownerOnly: true }, ({ owner }) => {
    if (owner.demo) throw new HttpError(403, 'The sample shop is read-only');
    sql.deletePayoutAccount.run(owner.id);
    return { ok: true };
  });
};

module.exports.activeLinkedAccount = activeLinkedAccount;
module.exports.startOnlinePayment = startOnlinePayment;
module.exports.confirmOnlinePayment = confirmOnlinePayment;
