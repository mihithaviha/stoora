/**
 * Rules shared by every storefront template, whichever design a seller picks:
 * which payment options a shop may offer, and how product options (sizes) are read.
 *
 * Online payment needs three things at once: Razorpay is set up on this server, the seller can actually
 * be paid (an activated Route linked account, or the operator has explicitly chosen to collect for
 * sellers), and the seller has switched it on. Nothing here ever "activates" a seller by itself.
 */
'use strict';

const { sql } = require('./db');
const { config } = require('./config');
const razorpay = require('./services/razorpay');

const cfgOf = (owner) => JSON.parse(owner.settings).cfg || {};

/** Words shown to the seller for each payment-setup state. */
const SETUP_TEXT = {
  not_configured: [
    'Not configured',
    'Online payments are not set up on this Stoora server yet. Orders can still be taken with payment arranged separately.',
  ],
  setup_required: [
    'Setup required',
    'Link your Razorpay account to receive online payments straight into your own bank account.',
  ],
  pending: [
    'Pending verification',
    'Razorpay is still checking your account. Online payments switch on once it is activated.',
  ],
  active: ['Active', 'Buyers can pay online. The money is paid to your own Razorpay account.'],
  unavailable: [
    'Temporarily unavailable',
    'Razorpay has paused or declined this account, so online payments are off. Check your Razorpay dashboard.',
  ],
};

/** Where this seller stands for online payments. Only real facts change it. */
function paymentSetup(owner) {
  const cfg = cfgOf(owner);
  const configured = razorpay.isConfigured();
  const link = sql.payoutAccount.get(owner.id);
  let state;
  let detail = '';
  if (!configured) state = 'not_configured';
  else if (config.razorpay.route) {
    if (!link) state = 'setup_required';
    else if (link.status === 'activated') state = 'active';
    else if (['created', 'needs_clarification', 'under_review'].includes(link.status)) {
      state = 'pending';
      if (link.status === 'needs_clarification')
        detail = 'Razorpay needs more details from you. Open your Razorpay dashboard to finish.';
    } else state = 'unavailable';
  } else if (config.razorpay.platformCollects) {
    state = 'active';
    detail =
      'Buyers can pay online. This server collects the payments for sellers, so the Stoora operator passes the money on to you.';
  } else {
    state = 'setup_required';
    detail =
      'Razorpay Route is not switched on for this server, so a payment would go to the platform account, not yours. The Stoora operator needs to enable Route first.';
  }

  const [label, text] = SETUP_TEXT[state];
  return {
    state,
    label,
    detail: detail || text,
    mode: config.razorpay.keyId.startsWith('rzp_live') ? 'live' : config.razorpay.keyId ? 'test' : null,
    route: config.razorpay.route,
    paidTo: config.razorpay.route
      ? 'your linked Razorpay account'
      : config.razorpay.platformCollects
        ? 'the platform account'
        : null,
    account: link ? { id: link.razorpay_account_id, status: link.status, checkedAt: link.checked_at } : null,
    webhook: Boolean(config.razorpay.webhookSecret),
    online: cfg.onlinePayments === true,
    manual: cfg.manualPayments !== false,
    manualInstructions: String(cfg.manualInstructions || ''),
    canEnableOnline: state === 'active',
  };
}

/** The payment choices a buyer is really offered at this shop. */
function acceptedPayments(owner) {
  const setup = paymentSetup(owner);
  const cfg = cfgOf(owner);
  return {
    online: setup.state === 'active' && setup.online,
    manual: setup.manual,
    instructions: setup.manualInstructions,
    upi: /^[\w.\-]{2,}@[a-z]{2,}$/i.test(cfg.upi || '') ? cfg.upi : null,
  };
}

/** The options a product comes in (its sizes), as a clean list. */
function variantsOf(product) {
  const seen = new Set();
  for (const part of String(product.sizes || '').split(',')) {
    const value = part.trim().slice(0, 30);
    if (value) seen.add(value);
  }
  return [...seen].slice(0, 20);
}

module.exports = { paymentSetup, acceptedPayments, variantsOf };
