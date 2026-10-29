/**
 * Premium storefront templates: pricing, buying, and who may use them.
 *
 * Anyone can PREVIEW a premium template. Only a seller with an entitlement can APPLY one, and the
 * server checks that on every save and publish: knowing a template's name is not enough.
 *
 * An entitlement is created only after Razorpay's payment signature is verified (or a signed
 * Razorpay webhook says the payment was captured), or when the operator grants access (`PREMIUM_GRANT_EMAILS`).
 * Template purchases are kept in their own tables, apart from buyers' orders and payments.
 *
 * Pricing is configuration, never code: set PREMIUM_PRICE_INR and PREMIUM_PURCHASES_ENABLED=1 in `.env`.
 * Until both are set, nothing can be charged and no price is shown.
 */
'use strict';

const shared = require('../public/js/storefront/shared');
const { config } = require('./config');
const { sql } = require('./db');
const { HttpError } = require('./http');
const razorpay = require('./services/razorpay');

const CURRENCY = 'INR';

/** What the operator has configured. `canCharge` is true only when every part is in place. */
function pricing() {
  const amount = config.premium.priceInr;
  const configured = amount >= 1;
  const razorpayReady = razorpay.isConfigured();
  return {
    configured,
    enabled: config.premium.enabled,
    razorpayReady,
    canCharge: configured && config.premium.enabled && razorpayReady,
    amount: configured ? amount : null, // never a made-up number
    currency: CURRENCY,
    terms: config.premium.terms,
  };
}

const isGrantedByOperator = (user) => config.premium.grantEmails.includes(String(user.email).toLowerCase());

/** True when this seller may apply the template. Free templates are open to everyone. */
function hasAccess(ownerId, ownerEmail, templateId) {
  if (!shared.isPremium(templateId)) return true;
  if (isGrantedByOperator({ email: ownerEmail })) return true;
  return Boolean(sql.entitlement.get(ownerId, templateId));
}

/** Throw unless the seller may use the template. */
function requireAccess(owner, templateId) {
  if (!hasAccess(owner.id, owner.email, templateId)) {
    throw new HttpError(403, 'This is a premium template. Unlock it first, then you can use it.');
  }
}

/** Every premium template with its access state for this seller. */
function catalogue(owner) {
  return shared.TEMPLATES.filter((template) => template.premium).map((template) => ({
    id: template.id,
    owned: hasAccess(owner.id, owner.email, template.id),
  }));
}

function grant(userId, templateId, source, paymentRef, amount) {
  sql.grantEntitlement.run(userId, templateId, source, paymentRef || null, amount || 0, CURRENCY, Date.now());
}

/**
 * Start buying a template. The server decides the price and creates the Razorpay order.
 * Retrying after a cancelled payment reuses the open order for the same template and amount.
 */
async function startPurchase(owner, templateId) {
  if (!shared.isPremium(templateId)) throw new HttpError(400, 'That template is free');
  if (hasAccess(owner.id, owner.email, templateId)) throw new HttpError(409, 'You already have this template');
  const price = pricing();
  if (!price.configured) throw new HttpError(503, 'Premium pricing has not been set up yet');
  if (!price.enabled) throw new HttpError(503, 'Premium purchases are not switched on yet');
  if (!price.razorpayReady) throw new HttpError(503, 'Online payments are not set up on this server yet');

  const paise = price.amount * 100;
  const open = sql.openPurchase.get(owner.id, templateId);
  if (open && open.amount === paise) {
    return { keyId: config.razorpay.keyId, orderId: open.rzp_order_id, amount: paise, currency: CURRENCY };
  }

  let created;
  try {
    created = await razorpay.createOrder({
      amountRupees: price.amount,
      receipt: `tpl_${Date.now().toString(36)}`,
      notes: { type: 'template', template: templateId, user: owner.id },
    });
  } catch (error) {
    throw new HttpError(502, `The payment could not start: ${error.message}`);
  }
  sql.insertPurchase.run(owner.id, templateId, paise, CURRENCY, 'created', created.id, Date.now());
  return { keyId: config.razorpay.keyId, orderId: created.id, amount: paise, currency: CURRENCY };
}

/** Mark a purchase paid and give the seller access. Safe to run twice. */
function completePurchase(purchase, paymentId) {
  if (purchase.status !== 'paid') sql.markPurchasePaid.run(paymentId || null, Date.now(), purchase.id);
  grant(purchase.user_id, purchase.template_id, 'purchase', paymentId || purchase.rzp_order_id, purchase.amount / 100);
}

/** The browser's proof of payment. Access is granted only if the signature is genuine and the purchase is this seller's. */
function confirmFromBrowser(owner, { orderId, paymentId, signature }) {
  if (!razorpay.isConfigured()) throw new HttpError(503, 'Online payments are not set up on this server yet');
  if (!orderId || !paymentId || !signature) throw new HttpError(400, 'Missing payment details');
  const purchase = sql.purchaseByRzpOrder.get(orderId);
  if (!purchase || purchase.user_id !== owner.id) throw new HttpError(404, 'We could not find that purchase');
  if (!razorpay.isPaymentSignatureValid(orderId, paymentId, signature))
    throw new HttpError(400, 'The payment could not be verified');
  completePurchase(purchase, paymentId);
  return { templateId: purchase.template_id };
}

/** A signed Razorpay webhook for a template order. Returns true when the order was a template purchase. */
function confirmFromWebhook(razorpayOrderId, paymentId) {
  const purchase = razorpayOrderId && sql.purchaseByRzpOrder.get(razorpayOrderId);
  if (!purchase) return false;
  completePurchase(purchase, paymentId);
  return true;
}

module.exports = {
  pricing,
  hasAccess,
  requireAccess,
  catalogue,
  startPurchase,
  confirmFromBrowser,
  confirmFromWebhook,
  grant,
};
