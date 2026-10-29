/**
 * Razorpay: payment orders, refunds, linked accounts (Route), and signature checks.
 * Keys come from `.env` (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET).
 * The secret never leaves the server.
 *
 * Official API reference: https://razorpay.com/docs/api/
 */
'use strict';

const crypto = require('node:crypto');
const { config } = require('../config');

const API = 'https://api.razorpay.com';
const isConfigured = () => Boolean(config.razorpay.keyId && config.razorpay.keySecret);

const hmacHex = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');

/** Compare two strings without leaking timing information. */
function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

/** One authenticated call to Razorpay. Throws an Error with Razorpay's own message when it refuses. */
async function request(method, path, body) {
  const credentials = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
  const response = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${credentials}` },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data.error && data.error.description) || `Razorpay replied ${response.status}`);
  return data;
}

/**
 * Create a Razorpay order for `amountRupees`.
 * When Razorpay Route is on and the seller has an activated linked account (acc_...),
 * the money is transferred straight to that account.
 */
function createOrder({ amountRupees, receipt, notes, linkedAccountId }) {
  const amount = Math.round(amountRupees * 100);
  const body = { amount, currency: 'INR', receipt, notes };
  if (config.razorpay.route && /^acc_[A-Za-z0-9]+$/.test(linkedAccountId || '')) {
    body.transfers = [{ account: linkedAccountId, amount, currency: 'INR', notes }];
  }
  return request('POST', '/v1/orders', body);
}

/** Refund a captured payment. Leave `amountRupees` empty to refund all of it. */
function refundPayment(paymentId, amountRupees, notes) {
  const body = { notes };
  if (amountRupees) body.amount = Math.round(amountRupees * 100);
  return request('POST', `/v1/payments/${encodeURIComponent(paymentId)}/refund`, body);
}

/** Look up a Route linked account. Its `status` is one of created, needs_clarification, under_review, activated, suspended, rejected. */
function getLinkedAccount(accountId) {
  return request('GET', `/v2/accounts/${encodeURIComponent(accountId)}`);
}

/** Every payment attempt on one Razorpay order (used to confirm a payment whose webhook is late). */
function getOrderPayments(orderId) {
  return request('GET', `/v1/orders/${encodeURIComponent(orderId)}/payments`);
}

/** The browser sends these three values after a payment; this checks they are genuine. */
function isPaymentSignatureValid(orderId, paymentId, signature) {
  return safeEqual(hmacHex(config.razorpay.keySecret, `${orderId}|${paymentId}`), signature);
}

/** Razorpay signs every webhook body; this checks that signature. */
function isWebhookSignatureValid(rawBody, signature) {
  if (!config.razorpay.webhookSecret) return false;
  return safeEqual(hmacHex(config.razorpay.webhookSecret, rawBody), signature);
}

module.exports = {
  isConfigured,
  createOrder,
  refundPayment,
  getLinkedAccount,
  getOrderPayments,
  isPaymentSignatureValid,
  isWebhookSignatureValid,
  hmacHex,
  safeEqual,
};
