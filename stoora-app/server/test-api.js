/**
 * End-to-end API test. Run with `npm test`.
 * It starts the server on a temporary database, so it never touches data/stoora.db,
 * and it never calls Razorpay, Meta or Claude (their replies are simulated).
 */
'use strict';

const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');

// Settings for the test run. These are fake keys: they only let us check signatures.
process.env.DB_PATH = path.join(os.tmpdir(), `stoora-test-${Date.now()}.db`);
process.env.RAZORPAY_KEY_ID = 'rzp_test_dummy';
process.env.RAZORPAY_KEY_SECRET = 'test_secret_123';
process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test_456';
process.env.META_APP_SECRET = 'meta_secret_789';
process.env.META_VERIFY_TOKEN = 'verify_me';
process.env.WHATSAPP_TOKEN = 'wa_token';
process.env.PREMIUM_PRICE_INR = '499'; // a test price, never a real one
process.env.PREMIUM_PURCHASES_ENABLED = '1';
process.env.ANTHROPIC_API_KEY = ''; // no AI key: the data-based answers are used

const { server } = require('./index');
const appConfig = require('./config').config;
const { resetRateLimits } = require('./http');
// These tests act as an operator who has chosen to collect payments for sellers (the Route and linked-account
// rules have their own tests further down).
appConfig.razorpay.platformCollects = true;
const { db } = require('./db');
const { createEmailToken } = require('./auth');

const PORT = 3077;
const BASE = `http://localhost:${PORT}`;
let failures = 0;
let passes = 0;
let cookie = '';

function check(name, condition, detail = '') {
  if (condition) passes += 1;
  else failures += 1;
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}${condition ? '' : `  ${detail}`}`);
}

const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');

/** Call the API. Keeps the login cookie between calls. */
async function call(method, url, body, { headers = {}, raw } = {}) {
  const response = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: raw !== undefined ? raw : body ? JSON.stringify(body) : undefined,
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (_) {
    json = { text };
  }
  return { status: response.status, json };
}

/** Like `call`, but sets the Host header (fetch does not allow that). */
function callWithHost(url, host) {
  return new Promise((resolve) => {
    http.get({ host: 'localhost', port: PORT, path: url, headers: { host } }, (res) => {
      let text = '';
      res.on('data', (chunk) => (text += chunk));
      res.on('end', () => resolve({ status: res.statusCode, json: JSON.parse(text || '{}') }));
    });
  });
}

const rows = (sql, ...args) => db.prepare(sql).all(...args);

async function run() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  let r;

  /* ---------- accounts ---------- */
  r = await call('GET', '/api/me');
  check('me without login is refused', r.status === 401);

  r = await call('POST', '/api/auth/signup', {
    name: 'Asha Nair',
    shop: 'Asha Boutique',
    handle: 'ashaboutique',
    email: 'asha@example.com',
    password: 'short',
  });
  check('weak password is refused', r.status === 400);

  r = await call('POST', '/api/auth/signup', {
    name: 'Asha Nair',
    shop: 'Asha Boutique',
    handle: 'ashaboutique',
    email: 'asha@example.com',
    password: 'onlyletters',
    acceptTerms: true,
  });
  check('a password with no number is refused', r.status === 400 && /number/.test(r.json.error));

  r = await call('POST', '/api/auth/signup', {
    name: 'Asha Nair',
    shop: 'Asha Boutique',
    handle: 'ashaboutique',
    email: 'asha@example.com',
    password: 'Stoora#2026ok',
  });
  check('sign-up without accepting the terms is refused', r.status === 400 && /terms/i.test(r.json.error));

  const page = async (url, accept = 'text/html') => {
    const response = await fetch(BASE + url, { headers: { Accept: accept } });
    return { status: response.status, text: await response.text() };
  };
  let p = await page('/no-such-page');
  check('an unknown page address shows the Stoora not-found page', p.status === 404 && /could not find that page/.test(p.text));
  p = await page('/no-such-image.png', 'image/*');
  check('an unknown file is a plain 404', p.status === 404 && p.text === 'Not found');
  p = await page('/s/nobodyhasthis');
  check('an unknown shop address is a 404', p.status === 404);
  p = await page('/terms');
  check('the terms page is served', p.status === 200 && /Terms of use/.test(p.text));
  p = await page('/privacy');
  check('the privacy page is served', p.status === 200 && /Privacy policy/.test(p.text));

  r = await call('POST', '/api/auth/signup', {
    name: 'Asha Nair',
    shop: 'Asha Boutique',
    handle: 'ashaboutique',
    email: 'asha@example.com',
    password: 'Stoora#2026ok',
    acceptTerms: true,
  });
  check('sign-up works', r.status === 201 && r.json.user.onboarding === 'pending');
  check('without an email service the address counts as confirmed', r.json.user.emailVerified === true);

  r = await call('POST', '/api/auth/signup', {
    name: 'X Y',
    shop: 'S',
    handle: 'ashaboutique',
    email: 'other@example.com',
    password: 'Stoora#2026ok',
    acceptTerms: true,
  });
  check('a taken shop link is refused', r.status === 409);

  r = await call('PATCH', '/api/me', { category: 'retail', city: 'Pune', onboarding: 'done' });
  check('profile is saved', r.status === 200 && r.json.user.category === 'retail');
  r = await call('PATCH', '/api/me', { category: 'hacker' });
  check('an unknown business type is refused', r.status === 400);

  r = await call('GET', '/api/state');
  check(
    'a new account is empty',
    r.json.collections.orders.length === 0 && r.json.collections.products.length === 0 && r.json.stats.orders === 0,
  );

  /* ---------- password reset by email link ---------- */
  const owner = rows("SELECT id FROM users WHERE email = 'asha@example.com'")[0];
  const resetToken = createEmailToken(owner.id, 'reset', 1);
  r = await call('POST', '/api/auth/reset', { token: 'wrong', password: 'Another#Pass1' });
  check('a wrong reset link is refused', r.status === 400);
  r = await call('POST', '/api/auth/reset', { token: resetToken, password: 'Another#Pass1' });
  check('a right reset link changes the password', r.status === 200);
  cookie = '';
  r = await call('POST', '/api/auth/login', { email: 'asha@example.com', password: 'Stoora#2026ok' });
  check('the old password stops working', r.status === 401);
  r = await call('POST', '/api/auth/login', { email: 'asha@example.com', password: 'Another#Pass1', remember: true });
  check('the new password works', r.status === 200);

  /* ---------- shop data ---------- */
  r = await call('PUT', '/api/collections/products', {
    items: [{ id: 'p1', name: 'Cotton kurta', price: 1499, stock: 5, status: 'Active', emoji: 'x' }],
  });
  check('a product is saved', r.status === 200 && r.json.items.length === 1);
  r = await call('PUT', '/api/collections/hackers', { items: [] });
  check('an unknown collection is refused', r.status === 404);
  r = await call('PUT', '/api/collections/products', { items: [{ name: 'no id' }] });
  check('an entry without an id is refused', r.status === 400);

  /* ---------- settings: delivery, policies, accounts ---------- */
  r = await call('PUT', '/api/settings', {
    cfg: {
      whatsapp: '9876543210',
      upi: 'asha@okhdfc',
      shipFee: 60,
      freeShipAbove: 2000,
      requireAddress: true,
      policyRefund: 'Refunds within 7 days',
      waPhoneId: '1234567890',
      customDomain: 'shop.example.com',
      metaPixelId: '123456789',
    },
  });
  check('settings are saved', r.status === 200);

  /* ---------- the public shop page and checkout ---------- */
  cookie = '';
  r = await call('GET', '/api/public/ashaboutique');
  check(
    'the shop page shows the product, contact, policies and delivery rules',
    r.status === 200 &&
      r.json.products.length === 1 &&
      r.json.contact.whatsapp === '9876543210' &&
      r.json.policies.refund &&
      r.json.delivery.fee === 60 &&
      r.json.tracking.metaPixel === '123456789',
  );
  r = await callWithHost('/api/public/by-host', 'shop.example.com');
  check("a seller's own web address finds their shop", r.status === 200 && r.json.handle === 'ashaboutique');
  r = await callWithHost('/api/public/by-host', 'unknown.example.com');
  check('an unknown web address is a 404', r.status === 404);

  r = await call('POST', '/api/public/ashaboutique/checkout', {
    name: 'Buyer',
    phone: '123',
    items: [{ id: 'p1', qty: 1 }],
  });
  check('checkout checks the phone number', r.status === 400);
  r = await call('POST', '/api/public/ashaboutique/checkout', {
    name: 'Buyer',
    phone: '9876500000',
    items: [{ id: 'p1', qty: 1 }],
  });
  check('checkout needs a delivery address for products', r.status === 400);
  r = await call('POST', '/api/public/ashaboutique/checkout', {
    name: 'Buyer',
    phone: '9876500000',
    address: '12 Lake Road, Pune',
    items: [{ id: 'p1', qty: 9 }],
  });
  check('checkout refuses more than the stock', r.status === 400);

  // Razorpay's own API is not called in tests, so make an order and a payment row by hand.
  const shopOwner = rows("SELECT id FROM users WHERE handle = 'ashaboutique'")[0].id;
  const putOrder = (order) =>
    db
      .prepare('INSERT INTO records(user_id,kind,id,pos,data,updated_at) VALUES (?,?,?,?,?,?)')
      .run(shopOwner, 'orders', String(order.id), 0, JSON.stringify(order), Date.now());
  const readOrder = (id) =>
    JSON.parse(
      rows("SELECT data FROM records WHERE user_id = ? AND kind = 'orders' AND id = ?", shopOwner, String(id))[0].data,
    );
  putOrder({
    id: 1001,
    who: 'Buyer One',
    phone: '9876500000',
    items: [['p1', 1]],
    total: 1499,
    paid: false,
    shipped: false,
    src: 'Shop link',
    when: 'Today',
    ts: Date.now(),
  });
  db.prepare('INSERT INTO payments(user_id,order_id,rzp_order_id,amount,status,created_at) VALUES (?,?,?,?,?,?)').run(
    shopOwner,
    '1001',
    'order_TEST1',
    149900,
    'created',
    Date.now(),
  );

  /* ---------- Razorpay: browser proof and webhook ---------- */
  r = await call('POST', '/api/public/razorpay/verify', {
    razorpay_order_id: 'order_TEST1',
    razorpay_payment_id: 'pay_TESTPAYMENT01',
    razorpay_signature: 'wrong',
  });
  check('a wrong payment signature is refused', r.status === 400);
  r = await call('POST', '/api/public/razorpay/verify', {
    razorpay_order_id: 'order_TEST1',
    razorpay_payment_id: 'pay_TESTPAYMENT01',
    razorpay_signature: hmac('test_secret_123', 'order_TEST1|pay_TESTPAYMENT01'),
  });
  check('the right payment signature marks the order paid', r.status === 200 && readOrder(1001).paid === true);

  putOrder({
    id: 1002,
    who: 'B2',
    items: [],
    total: 500,
    paid: false,
    src: 'Shop link',
    when: 'Today',
    ts: Date.now(),
  });
  db.prepare('INSERT INTO payments(user_id,order_id,rzp_order_id,amount,status,created_at) VALUES (?,?,?,?,?,?)').run(
    shopOwner,
    '1002',
    'order_TEST2',
    50000,
    'created',
    Date.now(),
  );
  const event = JSON.stringify({
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'pay_WEBHOOK00001', order_id: 'order_TEST2', method: 'upi' } } },
  });
  r = await call('POST', '/api/webhooks/razorpay', null, { raw: event, headers: { 'x-razorpay-signature': 'bad' } });
  check('a webhook with a bad signature is refused', r.status === 400);
  r = await call('POST', '/api/webhooks/razorpay', null, {
    raw: event,
    headers: { 'x-razorpay-signature': hmac('whsec_test_456', event), 'x-razorpay-event-id': 'evt_1' },
  });
  check('a signed webhook marks the order paid', r.status === 200 && readOrder(1002).paid === true);
  r = await call('POST', '/api/webhooks/razorpay', null, {
    raw: event,
    headers: { 'x-razorpay-signature': hmac('whsec_test_456', event), 'x-razorpay-event-id': 'evt_1' },
  });
  check('a repeated webhook is ignored', r.json.duplicate === true);

  /* ---------- order tracking and reviews ---------- */
  r = await call('POST', '/api/public/ashaboutique/order-status', { orderId: 1001, phone: '1111111111' });
  check('order tracking needs the right phone number', r.status === 404);
  r = await call('POST', '/api/public/ashaboutique/order-status', { orderId: 1001, phone: '98765 00000' });
  check(
    'order tracking shows the order',
    r.status === 200 && r.json.paid === true && r.json.items[0].name === 'Cotton kurta',
  );
  r = await call('POST', '/api/public/ashaboutique/reviews', {
    orderId: 1001,
    phone: '9876500000',
    productId: 'p1',
    rating: 9,
  });
  check('a rating above 5 is refused', r.status === 400);
  r = await call('POST', '/api/public/ashaboutique/reviews', {
    orderId: 1001,
    phone: '9876500000',
    productId: 'p1',
    rating: 5,
    comment: 'Lovely fabric',
  });
  check('a buyer can review what they bought', r.status === 200);
  r = await call('POST', '/api/public/ashaboutique/reviews', {
    orderId: 1001,
    phone: '9876500000',
    productId: 'p1',
    rating: 4,
  });
  check('a second review of the same item is refused', r.status === 409);
  r = await call('GET', '/api/public/ashaboutique');
  check(
    'the shop page shows the rating',
    r.json.ratings.p1 && r.json.ratings.p1.average === 5 && r.json.recentReviews.length === 1,
  );

  /* ---------- WhatsApp: webhook in, chat created ---------- */
  r = await call('GET', '/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc');
  check('Meta verification with a wrong token is refused', r.status === 403);
  r = await call('GET', '/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify_me&hub.challenge=abc123');
  check('Meta verification with the right token echoes the challenge', r.status === 200 && r.json.text === 'abc123');

  const waBody = JSON.stringify({
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: '1234567890' },
              contacts: [{ wa_id: '919800011111', profile: { name: 'Neha Joshi' } }],
              messages: [
                {
                  type: 'text',
                  from: '919800011111',
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  text: { body: 'What is the price of the cotton kurta?' },
                },
              ],
            },
          },
        ],
      },
    ],
  });
  r = await call('POST', '/api/webhooks/whatsapp', null, {
    raw: waBody,
    headers: { 'x-hub-signature-256': 'sha256=bad' },
  });
  check('a WhatsApp message with a bad signature is refused', r.status === 403);
  r = await call('POST', '/api/webhooks/whatsapp', null, {
    raw: waBody,
    headers: { 'x-hub-signature-256': 'sha256=' + hmac('meta_secret_789', waBody) },
  });
  check('a signed WhatsApp message is accepted', r.status === 200);

  r = await call('POST', '/api/auth/login', { email: 'asha@example.com', password: 'Another#Pass1' });
  r = await call('GET', '/api/state');
  const chat = r.json.collections.chats[0];
  check(
    'the message became a chat with a mood and a drafted reply',
    chat &&
      chat.who === 'Neha Joshi' &&
      chat.src === 'WhatsApp' &&
      chat.mood === 'ready' &&
      /Cotton kurta/.test(chat.draft),
  );
  r = await call('POST', '/api/chats/' + encodeURIComponent(chat.id) + '/send', { text: '' });
  check('an empty reply is refused', r.status === 400);

  /* ---------- helpers (team) ---------- */
  r = await call('POST', '/api/team', {
    name: 'Ravi',
    email: 'ravi@example.com',
    password: 'Helper#1234',
    role: 'packing',
  });
  check('the owner adds a helper', r.status === 200 && r.json.helper.role === 'packing');
  const ownerCookie = cookie;
  cookie = '';
  r = await call('POST', '/api/auth/login', { email: 'ravi@example.com', password: 'Helper#1234' });
  check(
    "the helper logs in and sees the owner's shop name",
    r.status === 200 && r.json.user.shop === 'Asha Boutique' && r.json.user.role === 'packing',
  );
  r = await call('GET', '/api/state');
  check(
    'a packing helper sees orders but not chats or settings',
    r.json.collections.orders.length >= 2 &&
      r.json.collections.chats.length === 0 &&
      Object.keys(r.json.settings).length === 0,
  );
  r = await call('PUT', '/api/collections/products', { items: [] });
  check('a packing helper cannot change products', r.status === 403);
  r = await call('PUT', '/api/settings', { cfg: {} });
  check('a helper cannot change settings', r.status === 403);
  r = await call('POST', '/api/team', { name: 'X', email: 'x@example.com', password: 'Helper#1234', role: 'chat' });
  check('a helper cannot add helpers', r.status === 403);
  cookie = ownerCookie;

  /* ---------- the assistant (no AI key: answers come from the shop's numbers) ---------- */
  r = await call('POST', '/api/ai/ask', { question: 'How did I do this week?' });
  check(
    "Ask Stoora answers from the shop's numbers",
    r.status === 200 && r.json.source === 'data' && /₹/.test(r.json.text),
  );
  r = await call('POST', '/api/ai/describe', { title: 'Cotton kurta', sizes: 'S, M, L' });
  check('a product description is written', r.status === 200 && /Cotton kurta/.test(r.json.text));

  /* ---------- payments page, payment retries, refunds, payout accounts ---------- */
  r = await call('GET', '/api/payments');
  check(
    "the payments list shows this seller's online payments",
    r.status === 200 && r.json.payments.length === 2 && r.json.totals.received === 1999,
  );
  r = await call('GET', '/api/payments?status=paid&q=buyer');
  check(
    'payments can be filtered by status and searched',
    r.json.payments.length >= 1 && r.json.payments.every((p) => p.status === 'paid'),
  );
  r = await call('GET', '/api/payments?status=failed');
  check('a filter with no match is empty', r.json.payments.length === 0);

  putOrder({
    id: 1003,
    who: 'Retry Buyer',
    phone: '9000000003',
    items: [],
    total: 700,
    paid: false,
    src: 'Shop link',
    when: 'Today',
    ts: Date.now(),
  });
  db.prepare('INSERT INTO payments(user_id,order_id,rzp_order_id,amount,status,created_at) VALUES (?,?,?,?,?,?)').run(
    shopOwner,
    '1003',
    'order_OPEN3',
    70000,
    'created',
    Date.now(),
  );
  r = await call('POST', '/api/orders/1003/payment');
  check(
    'a cancelled payment is retried on the same Razorpay order',
    r.status === 200 &&
      r.json.orderId === 'order_OPEN3' &&
      r.json.amount === 70000 &&
      r.json.keyId === 'rzp_test_dummy',
  );
  r = await call('POST', '/api/orders/1001/payment');
  check('an order that is already paid cannot be paid again', r.status === 409);
  r = await call('POST', '/api/orders/9999/payment');
  check('an order that does not exist is a 404', r.status === 404);
  r = await call('POST', '/api/orders/1001/refund', { amount: 99999 });
  check('a refund above what was paid is refused', r.status === 400);
  r = await call('POST', '/api/orders/1003/refund', {});
  check('an order that was not paid online cannot be refunded through Razorpay', r.status === 400);
  r = await call('POST', '/api/payouts/link', { accountId: 'acc_AAAAAAAAAAAA' });
  check('linking a payout account needs Razorpay Route to be switched on', r.status === 503);

  const failedEvent = JSON.stringify({
    event: 'payment.failed',
    payload: {
      payment: {
        entity: {
          id: 'pay_FAIL0000000001',
          order_id: 'order_OPEN3',
          method: 'card',
          error_description: 'Card declined',
        },
      },
    },
  });
  r = await call('POST', '/api/webhooks/razorpay', null, {
    raw: failedEvent,
    headers: { 'x-razorpay-signature': hmac('whsec_test_456', failedEvent), 'x-razorpay-event-id': 'evt_fail' },
  });
  r = await call('GET', '/api/payments?status=failed');
  check(
    'a failed payment is recorded with its reason and method',
    r.json.payments.length === 1 &&
      r.json.payments[0].failureReason === 'Card declined' &&
      r.json.payments[0].method === 'card',
  );
  const lateFail = JSON.stringify({
    event: 'payment.failed',
    payload: { payment: { entity: { id: 'pay_LATE', order_id: 'order_TEST1', error_description: 'late' } } },
  });
  await call('POST', '/api/webhooks/razorpay', null, {
    raw: lateFail,
    headers: { 'x-razorpay-signature': hmac('whsec_test_456', lateFail), 'x-razorpay-event-id': 'evt_late' },
  });
  check(
    'a failure never undoes a payment that succeeded',
    readOrder(1001).paid === true &&
      rows("SELECT status FROM payments WHERE rzp_order_id = 'order_TEST1'")[0].status === 'paid',
  );
  const refundEvent = JSON.stringify({
    event: 'refund.processed',
    payload: { refund: { entity: { id: 'rfnd_1', payment_id: 'pay_TESTPAYMENT01', amount: 149900 } } },
  });
  await call('POST', '/api/webhooks/razorpay', null, {
    raw: refundEvent,
    headers: { 'x-razorpay-signature': hmac('whsec_test_456', refundEvent), 'x-razorpay-event-id': 'evt_refund' },
  });
  check(
    'a processed refund marks the order refunded',
    readOrder(1001).refunded === true &&
      rows("SELECT status, refunded_amount FROM payments WHERE rzp_order_id = 'order_TEST1'")[0].refunded_amount ===
        149900,
  );

  /* ---------- a second seller cannot see the first seller's money, orders or chats ---------- */
  const firstCookie = cookie;
  cookie = '';
  await call('POST', '/api/auth/signup', {
    name: 'Other Seller',
    shop: 'Other Shop',
    handle: 'othershop',
    email: 'other2@example.com',
    password: 'Stoora#2026ok',
    acceptTerms: true,
  });
  r = await call('GET', '/api/payments');
  check('another seller sees no payments of this seller', r.status === 200 && r.json.payments.length === 0);
  r = await call('GET', '/api/state');
  check(
    'another seller sees no orders, chats or products of this seller',
    r.json.collections.orders.length === 0 &&
      r.json.collections.chats.length === 0 &&
      r.json.collections.products.length === 0,
  );
  r = await call('POST', '/api/orders/1003/payment');
  check("another seller cannot start a payment for this seller's order", r.status === 404);
  r = await call('POST', '/api/orders/1001/refund', {});
  check("another seller cannot refund this seller's payment", r.status === 400);
  r = await call('POST', '/api/chats/' + encodeURIComponent('whatsapp-919811122233') + '/send', { text: 'hello' });
  check("another seller cannot message this seller's buyer", r.status === 404);
  r = await call('POST', '/api/ai/ask', { question: 'How much did I sell this week?' });
  check(
    "the assistant for another seller never sees this seller's sales",
    r.status === 200 && r.json.cards.every((card) => !/1,499|1,999/.test(card.value)),
  );
  cookie = firstCookie;

  /* ---------- the assistant: tools, cards, order drafts, analytics range ---------- */
  r = await call('POST', '/api/ai/ask', { question: 'How did I do this week?' });
  check(
    'the assistant returns summary cards and says AI is not connected',
    r.status === 200 && r.json.cards.length >= 2 && r.json.source === 'data' && /not connected/i.test(r.json.notice),
  );
  r = await call('POST', '/api/ai/ask', { question: 'Which orders need attention?' });
  check(
    'the assistant lists orders that need attention',
    r.json.cards.some((card) => /waiting to ship|Not paid/.test(card.label)) &&
      r.json.links.some((link) => link.route === 'orders'),
  );
  const toolScope = require('./services/assistant-tools');
  check(
    'an assistant tool only reads the seller it was given',
    toolScope.runTool('get_sales_summary', { days: 30 }, 'u_demo').orders === 0 &&
      toolScope
        .runTool('get_orders_needing_attention', {}, shopOwner)
        .notPaidYet.every((order) => order.buyer !== 'Rahul Verma'),
  );
  let unknownTool = false;
  try {
    toolScope.runTool('drop_tables', {}, shopOwner);
  } catch (error) {
    unknownTool = true;
  }
  check('the assistant cannot call anything that is not a listed tool', unknownTool);
  const ordersBefore = rows("SELECT COUNT(*) AS n FROM records WHERE user_id = ? AND kind = 'orders'", shopOwner)[0].n;
  r = await call('POST', '/api/ai/draft-order', {
    text: 'Hi, my name is Meera Rao. I want 2 cotton kurta. Please deliver to 5 MG Road Pune 411001. Call me on 98765 43210',
  });
  check(
    'a pasted chat becomes an editable draft',
    r.status === 200 &&
      r.json.draft.buyerName === 'Meera Rao' &&
      r.json.draft.phone === '9876543210' &&
      r.json.draft.lines[0].quantity === 2 &&
      r.json.draft.lines[0].id === 'p1',
    JSON.stringify(r.json),
  );
  check(
    'making a draft creates no order',
    rows("SELECT COUNT(*) AS n FROM records WHERE user_id = ? AND kind = 'orders'", shopOwner)[0].n === ordersBefore,
  );
  r = await call('GET', '/api/analytics?days=30');
  check(
    'analytics works for a date range with a comparison',
    r.status === 200 && r.json.summary.days === 30 && 'previous' in r.json.summary && r.json.summary.bars.length === 30,
  );
  r = await call('GET', '/api/analytics?days=5');
  check('analytics refuses an unsupported range', r.status === 400);

  /* ---------- WhatsApp: no duplicates; readiness; security headers ---------- */
  const waAgain = JSON.stringify({
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: '1234567890' },
              contacts: [{ wa_id: '919822200000', profile: { name: 'Repeat Buyer' } }],
              messages: [
                {
                  id: 'wamid.ABC',
                  type: 'text',
                  from: '919822200000',
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  text: { body: 'hello price' },
                },
              ],
            },
          },
        ],
      },
    ],
  });
  const waSig = { 'x-hub-signature-256': 'sha256=' + hmac('meta_secret_789', waAgain) };
  await call('POST', '/api/webhooks/whatsapp', null, { raw: waAgain, headers: waSig });
  await call('POST', '/api/webhooks/whatsapp', null, { raw: waAgain, headers: waSig });
  const dupChat = JSON.parse(
    rows("SELECT data FROM records WHERE user_id = ? AND kind = 'chats' AND id = 'whatsapp-919822200000'", shopOwner)[0]
      .data,
  );
  check('the same WhatsApp message delivered twice is stored once', dupChat.msgs.length === 1);
  r = await call('GET', '/api/ready');
  check('the readiness check reports the database schema', r.status === 200 && r.json.schema === 6);
  const headerCheck = await fetch(`${BASE}/api/health`);
  check(
    'security headers are sent',
    headerCheck.headers.get('x-frame-options') === 'SAMEORIGIN' &&
      headerCheck.headers.get('x-content-type-options') === 'nosniff',
  );

  /* ---------- storefront builder: templates, themes, drafts, publishing, images ---------- */
  const shared = require('../public/js/storefront/shared');
  check(
    'there are five distinct free templates',
    shared.TEMPLATES.filter((t) => !t.premium).length === 5 &&
      new Set(shared.TEMPLATES.map((t) => t.id)).size === shared.TEMPLATES.length,
  );
  check(
    'every theme uses only approved Brand Kit colours',
    shared.THEMES.every((theme) =>
      [
        'primary',
        'secondary',
        'accent',
        'background',
        'surface',
        'text',
        'muted',
        'border',
        'button',
        'buttonText',
      ].every((token) => shared.PALETTE.includes(theme[token])),
    ),
  );
  check(
    'every accent choice is an approved colour',
    shared.ACCENTS.every((colour) => shared.PALETTE.includes(colour)),
  );
  const weakPairs = [];
  for (const theme of shared.THEMES) {
    for (const [a, b, label] of [
      [theme.text, theme.background, 'text'],
      [theme.text, theme.surface, 'text on surface'],
      [theme.muted, theme.background, 'muted'],
      [theme.muted, theme.surface, 'muted on surface'],
      [theme.buttonText, theme.button, 'button'],
    ]) {
      if (shared.contrast(a, b) < 4.5) weakPairs.push(`${theme.id}:${label}`);
    }
  }
  check('every theme keeps text and buttons readable (WCAG AA)', weakPairs.length === 0, weakPairs.join(', '));

  r = await call('GET', '/api/storefront');
  check(
    'a seller who has not started sees an empty storefront with their own catalogue',
    r.status === 200 && r.json.status === 'none' && r.json.catalogue.products.length >= 1,
  );
  const draftConfig = {
    ...r.json.config,
    template: 'studio',
    theme: 'vibrant',
    brand: { name: 'Asha Boutique', tagline: 'Handmade in Pune', logo: '' },
    contact: { email: 'hello@asha.example', phone: '', whatsapp: '9876543210', address: '', hours: '' },
  };
  r = await call('PUT', '/api/storefront', { config: draftConfig });
  check(
    'a draft is saved and is ready to publish',
    r.status === 200 && r.json.status === 'ready' && r.json.config.template === 'studio',
  );
  const firstRevision = r.json.revision;
  check('a draft save returns a revision', Number.isFinite(firstRevision) && firstRevision > 0);
  r = await call('PUT', '/api/storefront', {
    config: { ...draftConfig, brand: { ...draftConfig.brand, tagline: 'Second save' } },
    baseRevision: firstRevision,
  });
  const secondRevision = r.json.revision;
  check('saving from the latest revision works and moves the revision on', r.status === 200 && secondRevision > firstRevision);
  r = await call('PUT', '/api/storefront', {
    config: { ...draftConfig, brand: { ...draftConfig.brand, tagline: 'From a stale tab' } },
    baseRevision: firstRevision,
  });
  check('a stale tab cannot overwrite a newer draft (409)', r.status === 409);
  r = await call('GET', '/api/storefront');
  check(
    'the newer draft is intact after the refused save and the editor state reports its revision',
    r.json.config.brand.tagline === 'Second save' && r.json.revision === secondRevision,
  );
  r = await call('PUT', '/api/storefront', { config: draftConfig, baseRevision: secondRevision });
  check('saving with the current revision is accepted again', r.status === 200);
  r = await call('PUT', '/api/storefront', { config: { ...draftConfig, template: 'wedding' } });
  check('an unknown template is refused', r.status === 400);
  r = await call('PUT', '/api/storefront', { config: { ...draftConfig, theme: 'neon' } });
  check('an unknown theme is refused', r.status === 400);
  r = await call('PUT', '/api/storefront', { config: { ...draftConfig, accent: '#FF00FF' } });
  check('a colour outside the Brand Kit is refused', r.status === 400);
  r = await call('PUT', '/api/storefront', {
    config: { ...draftConfig, hero: { title: 'x', subtitle: '', image: 'https://evil.example/a.jpg', cta: '' } },
  });
  check('an image from another website is refused', r.status === 400);
  r = await call('PUT', '/api/storefront', {
    config: { ...draftConfig, contact: { ...draftConfig.contact, email: 'not-an-email' } },
  });
  check('a bad contact email is refused', r.status === 400);

  r = await call('GET', '/api/public/ashaboutique');
  check('before publishing, buyers see no storefront template', r.json.storefront === null);

  // a real 1x1 PNG
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  r = await call('POST', '/api/storefront/images', null, { raw: png, headers: { 'Content-Type': 'image/png' } });
  const heroUrl = r.json.url;
  check(
    'an image is uploaded and stored on the server',
    r.status === 200 && /^\/uploads\/u_[a-f0-9]+\/[a-f0-9]{16}\.png$/.test(heroUrl || ''),
  );
  const served = await fetch(BASE + heroUrl);
  check(
    'the uploaded image is served with the right type',
    served.status === 200 && served.headers.get('content-type') === 'image/png',
  );
  r = await call('POST', '/api/storefront/images', null, {
    raw: Buffer.from('<script>alert(1)</script>'),
    headers: { 'Content-Type': 'image/png' },
  });
  check('a file that is not really an image is refused, whatever its name', r.status === 400);
  let tooBig = false;
  try {
    require('./storefront').saveImage({ id: 'u_test' }, Buffer.alloc(3 * 1024 * 1024, 1));
  } catch (error) {
    tooBig = error.status === 413;
  }
  check('an image over the size limit is refused', tooBig);

  r = await call('PUT', '/api/storefront', {
    config: {
      ...draftConfig,
      hero: { title: 'Made by hand', subtitle: 'Small batches', image: heroUrl, cta: 'Shop now' },
      hiddenIds: [],
    },
  });
  check(
    "the seller's own uploaded image is accepted in the draft",
    r.status === 200 && r.json.config.hero.image === heroUrl,
  );

  r = await call('POST', '/api/storefront/publish');
  check(
    'publishing works and returns the public address',
    r.status === 200 && r.json.status === 'published' && r.json.url === '/s/ashaboutique',
  );
  r = await call('GET', '/api/public/ashaboutique');
  check(
    'the public page now has the published template and theme',
    r.json.storefront && r.json.storefront.config.template === 'studio' && r.json.storefront.config.theme === 'vibrant',
  );
  check(
    'the public storefront shows no orders, customers or private settings',
    r.json.storefront &&
      !('orders' in r.json.storefront.data) &&
      !('customers' in r.json.storefront.data) &&
      !/9000000003|Buyer One|asha@okhdfc/.test(JSON.stringify(r.json.storefront)),
  );

  r = await call('PUT', '/api/storefront', {
    config: {
      ...draftConfig,
      hero: { title: 'New title', subtitle: '', image: heroUrl, cta: 'Shop now' },
      brand: { ...draftConfig.brand, tagline: 'A newer tagline' },
    },
  });
  check('editing after publishing shows "changes not yet published"', r.json.status === 'changes');
  r = await call('GET', '/api/public/ashaboutique');
  check(
    'buyers keep seeing the published version until the seller republishes',
    r.json.storefront.config.brand.tagline === 'Handmade in Pune',
  );
  r = await call('POST', '/api/storefront/publish');
  r = await call('GET', '/api/public/ashaboutique');
  check('republishing updates the public page', r.json.storefront.config.brand.tagline === 'A newer tagline');

  r = await call('PUT', '/api/storefront', { config: { ...draftConfig, hiddenIds: ['p1'] } });
  check(
    'hiding every product makes the storefront not ready',
    r.json.status === 'changes' && r.json.issues.some((issue) => issue.level === 'error'),
  );
  r = await call('POST', '/api/storefront/publish');
  check('publishing is refused when nothing would be shown', r.status === 400);
  r = await call('GET', '/api/public/ashaboutique');
  check(
    'a refused publish leaves the earlier published version in place',
    r.json.storefront && r.json.storefront.data.products.length === 1,
  );
  r = await call('PUT', '/api/storefront', { config: { ...draftConfig, hiddenIds: [] } });

  const sellerOneCookie = cookie;
  cookie = '';
  await call('POST', '/api/auth/signup', {
    name: 'Third Seller',
    shop: 'Third Shop',
    handle: 'thirdshop',
    email: 'third3@example.com',
    password: 'Stoora#2026ok',
    acceptTerms: true,
  });
  r = await call('GET', '/api/storefront');
  check(
    'another seller starts with their own empty storefront',
    r.json.status === 'none' && r.json.catalogue.products.length === 0,
  );
  r = await call('PUT', '/api/storefront', {
    config: {
      ...draftConfig,
      template: 'services',
      theme: 'minimal',
      hero: { title: '', subtitle: '', image: heroUrl, cta: '' },
    },
  });
  check("another seller cannot use this seller's uploaded image", r.status === 400);
  r = await call('PUT', '/api/storefront', { config: { ...draftConfig, template: 'services', theme: 'minimal' } });
  check('another seller saves their own draft', r.status === 200 && r.json.config.template === 'services');
  r = await call('POST', '/api/storefront/publish');
  check('an empty shop cannot publish a storefront', r.status === 400);
  r = await call('GET', '/api/public/thirdshop');
  check("another seller's unpublished storefront is not public", r.json.storefront === null);
  r = await call('GET', '/api/public/ashaboutique');
  check(
    "another seller's changes never touch this seller's public storefront",
    r.json.storefront.config.template === 'studio',
  );
  cookie = sellerOneCookie;

  r = await call('POST', '/api/storefront/unpublish');
  r = await call('GET', '/api/public/ashaboutique');
  check('unpublishing takes the storefront offline', r.json.storefront === null);

  cookie = '';
  r = await call('GET', '/api/storefront');
  check('the storefront editor needs a login', r.status === 401);
  await call('POST', '/api/auth/login', { email: 'demo@stoora.in', password: 'meera2026' });
  r = await call('PUT', '/api/storefront', { config: draftConfig });
  check("the sample shop's storefront is read-only", r.status === 403);
  cookie = sellerOneCookie;

  /* ---------- premium templates: preview for all, access only after verified payment ---------- */
  check(
    'there are three premium templates and five free ones',
    shared.TEMPLATES.filter((t) => t.premium).length === 3 && shared.TEMPLATES.filter((t) => !t.premium).length === 5,
  );
  r = await call('GET', '/api/storefront/premium');
  check(
    'premium templates are listed as locked for a seller who has not bought them',
    r.status === 200 && r.json.templates.length === 3 && r.json.templates.every((t) => t.owned === false),
  );
  check(
    'the price shown is the one the operator configured',
    r.json.pricing.amount === 499 && r.json.pricing.canCharge === true,
  );

  r = await call('PUT', '/api/storefront', { config: { ...draftConfig, template: 'atelier' } });
  check('a locked premium template cannot be applied', r.status === 403);
  r = await call('PUT', '/api/storefront', { config: { ...draftConfig, template: 'boutique' } });
  check('free templates stay available without paying', r.status === 200);

  appConfig.premium.priceInr = 0;
  r = await call('POST', '/api/storefront/premium/atelier/order');
  check('with no price configured nothing can be bought', r.status === 503 && /pricing/i.test(r.json.error));
  r = await call('GET', '/api/storefront/premium');
  check(
    'with no price configured no amount is shown',
    r.json.pricing.amount === null && r.json.pricing.canCharge === false,
  );
  appConfig.premium.priceInr = 499;
  appConfig.premium.enabled = false;
  r = await call('POST', '/api/storefront/premium/atelier/order');
  check('with purchases switched off nothing is charged', r.status === 503);
  appConfig.premium.enabled = true;
  r = await call('POST', '/api/storefront/premium/boutique/order');
  check('a free template cannot be bought', r.status === 400);

  // Razorpay's own API is not called in tests: make the open purchase by hand, as a real order creation would.
  db.prepare(
    'INSERT INTO template_purchases (user_id, template_id, amount, currency, status, rzp_order_id, created_at) VALUES (?,?,?,?,?,?,?)',
  ).run(shopOwner, 'atelier', 49900, 'INR', 'created', 'order_TPL1', Date.now());
  r = await call('POST', '/api/storefront/premium/atelier/order');
  check(
    'retrying a cancelled purchase reuses the same Razorpay order',
    r.status === 200 && r.json.orderId === 'order_TPL1' && r.json.amount === 49900,
  );
  r = await call('POST', '/api/storefront/premium/verify', {
    razorpay_order_id: 'order_TPL1',
    razorpay_payment_id: 'pay_TPL000000001',
    razorpay_signature: 'wrong',
  });
  check(
    'a wrong payment signature grants nothing',
    r.status === 400 && rows('SELECT * FROM template_entitlements WHERE user_id = ?', shopOwner).length === 0,
  );
  const thirdCookie =
    ((cookie = ''),
    await call('POST', '/api/auth/login', { email: 'third3@example.com', password: 'Stoora#2026ok' }),
    cookie);
  r = await call('POST', '/api/storefront/premium/verify', {
    razorpay_order_id: 'order_TPL1',
    razorpay_payment_id: 'pay_TPL000000001',
    razorpay_signature: hmac('test_secret_123', 'order_TPL1|pay_TPL000000001'),
  });
  check("another seller cannot claim this seller's purchase", r.status === 404);
  cookie = sellerOneCookie;
  r = await call('POST', '/api/storefront/premium/verify', {
    razorpay_order_id: 'order_TPL1',
    razorpay_payment_id: 'pay_TPL000000001',
    razorpay_signature: hmac('test_secret_123', 'order_TPL1|pay_TPL000000001'),
  });
  check(
    'a verified payment grants access',
    r.status === 200 &&
      rows('SELECT * FROM template_entitlements WHERE user_id = ? AND template_id = ?', shopOwner, 'atelier').length ===
        1,
  );
  r = await call('POST', '/api/storefront/premium/verify', {
    razorpay_order_id: 'order_TPL1',
    razorpay_payment_id: 'pay_TPL000000001',
    razorpay_signature: hmac('test_secret_123', 'order_TPL1|pay_TPL000000001'),
  });
  check(
    'confirming twice never creates a second entitlement',
    r.status === 200 &&
      rows('SELECT * FROM template_entitlements WHERE user_id = ? AND template_id = ?', shopOwner, 'atelier').length ===
        1,
  );
  check(
    "the purchase is recorded apart from buyers' orders",
    rows("SELECT * FROM template_purchases WHERE rzp_order_id = 'order_TPL1' AND status = 'paid'").length === 1 &&
      rows("SELECT * FROM payments WHERE rzp_order_id = 'order_TPL1'").length === 0,
  );
  r = await call('POST', '/api/storefront/premium/atelier/order');
  check('a template you own cannot be bought again', r.status === 409);
  r = await call('GET', '/api/storefront/premium');
  check(
    'the owned template now shows as unlocked, the others stay locked',
    r.json.templates.find((t) => t.id === 'atelier').owned && !r.json.templates.find((t) => t.id === 'heritage').owned,
  );
  r = await call('PUT', '/api/storefront', { config: { ...draftConfig, template: 'atelier', theme: 'elegant' } });
  check('after paying, the premium template can be applied', r.status === 200 && r.json.config.template === 'atelier');
  r = await call('PUT', '/api/storefront', { config: { ...draftConfig, template: 'heritage' } });
  check('owning one premium template does not unlock the others', r.status === 403);
  r = await call('POST', '/api/storefront/publish');
  check('a premium template can be published once owned', r.status === 200);
  r = await call('GET', '/api/public/ashaboutique');
  check(
    'the public page uses the premium template',
    r.json.storefront && r.json.storefront.config.template === 'atelier',
  );

  // a signed Razorpay webhook also grants access (the browser might close before verifying)
  db.prepare(
    'INSERT INTO template_purchases (user_id, template_id, amount, currency, status, rzp_order_id, created_at) VALUES (?,?,?,?,?,?,?)',
  ).run(shopOwner, 'heritage', 49900, 'INR', 'created', 'order_TPL2', Date.now());
  const tplEvent = JSON.stringify({
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'pay_TPL000000002', order_id: 'order_TPL2', method: 'upi' } } },
  });
  const tplHeaders = { 'x-razorpay-signature': hmac('whsec_test_456', tplEvent), 'x-razorpay-event-id': 'evt_tpl2' };
  await call('POST', '/api/webhooks/razorpay', null, {
    raw: tplEvent,
    headers: { ...tplHeaders, 'x-razorpay-signature': 'bad' },
  });
  check(
    'an unsigned template webhook grants nothing',
    rows('SELECT * FROM template_entitlements WHERE user_id = ? AND template_id = ?', shopOwner, 'heritage').length ===
      0,
  );
  await call('POST', '/api/webhooks/razorpay', null, { raw: tplEvent, headers: tplHeaders });
  await call('POST', '/api/webhooks/razorpay', null, {
    raw: tplEvent,
    headers: { ...tplHeaders, 'x-razorpay-event-id': 'evt_tpl2_again' },
  });
  check(
    'a signed webhook grants access once, even when delivered twice',
    rows('SELECT * FROM template_entitlements WHERE user_id = ? AND template_id = ?', shopOwner, 'heritage').length ===
      1,
  );

  // operator grants, other sellers, demo
  cookie = thirdCookie;
  r = await call('PUT', '/api/storefront', { config: { ...draftConfig, template: 'atelier' } });
  check('another seller still cannot apply a premium template', r.status === 403);
  appConfig.premium.grantEmails = ['third3@example.com'];
  r = await call('PUT', '/api/storefront', {
    config: { ...draftConfig, template: 'signaturestudio', theme: 'signature' },
  });
  check('an account the operator granted access to can apply premium templates', r.status === 200);
  appConfig.premium.grantEmails = [];
  r = await call('PUT', '/api/storefront', { config: { ...draftConfig, template: 'heritage' } });
  check('removing the grant removes the access', r.status === 403);
  cookie = '';
  await call('POST', '/api/auth/login', { email: 'demo@stoora.in', password: 'meera2026' });
  r = await call('POST', '/api/storefront/premium/atelier/order');
  check('the sample shop cannot buy anything', r.status === 403);
  cookie = sellerOneCookie;

  /* ---------- storefront commerce: cart, checkout, payment modes, fulfilment ---------- */
  const razorpayService = require('./services/razorpay');
  const ordersModule = require('./orders');
  const realCreateOrder = razorpayService.createOrder;
  const realOrderPayments = razorpayService.getOrderPayments;
  let razorpayCalls = 0;
  razorpayService.createOrder = async ({ amountRupees, receipt }) => {
    razorpayCalls += 1;
    return { id: `order_SHOP${razorpayCalls}`, amount: Math.round(amountRupees * 100), receipt };
  };
  const readProduct = (id) =>
    JSON.parse(rows("SELECT data FROM records WHERE user_id = ? AND kind = 'products' AND id = ?", shopOwner, id)[0].data);
  const listOrders = () => rows("SELECT data FROM records WHERE user_id = ? AND kind = 'orders'", shopOwner).map((row) => JSON.parse(row.data));
  const BUYER = { name: 'Ravi Kumar', phone: '9811122233', email: 'ravi@example.com', address: '5 MG Road', city: 'Pune', state: 'Maharashtra', pincode: '411001' };
  const shop = (path, body) => call('POST', `/api/public/ashaboutique${path}`, body);

  r = await call('GET', '/api/state');
  await call('PUT', '/api/collections/products', {
    items: [
      ...r.json.collections.products,
      { id: 'c-shirt', name: 'Linen shirt', price: 1000, stock: 4, status: 'Active', sizes: 'S, M, L' },
      { id: 'c-mug', name: 'Clay mug', price: 300, stock: 30, status: 'Active' },
      { id: 'c-draft', name: 'Hidden item', price: 100, stock: 3, status: 'Draft' },
    ],
  });
  await call('PUT', '/api/collections/services', {
    items: [{ id: 'c-class', name: 'Yoga class', price: 500, type: 'Class', duration: '60 min' }],
  });

  // -- what each shop can offer for payment
  r = await call('GET', '/api/payments/setup');
  check('a seller with real Razorpay setup is Active, but online payment stays off until they choose it', r.status === 200 && r.json.state === 'active' && r.json.online === false && r.json.manual === true);
  r = await call('GET', '/api/public/ashaboutique');
  check('the shop shows no online payment and no Razorpay key before the seller switches it on', r.json.razorpay === null && r.json.payments.online === false && r.json.payments.manual === true);

  appConfig.razorpay.platformCollects = false;
  r = await call('GET', '/api/payments/setup');
  check('without Route or an agreed platform model, online payment needs setup (money would not reach the seller)', r.json.state === 'setup_required' && r.json.canEnableOnline === false);
  r = await call('PUT', '/api/payments/setup', { online: true });
  check('online payment cannot be switched on while setup is required', r.status === 409);
  appConfig.razorpay.route = true;
  r = await call('GET', '/api/payments/setup');
  check('with Route on and no linked account the seller must set one up', r.json.state === 'setup_required');
  for (const [status, expected] of [['created', 'pending'], ['under_review', 'pending'], ['needs_clarification', 'pending'], ['activated', 'active'], ['suspended', 'unavailable'], ['rejected', 'unavailable']]) {
    db.prepare('INSERT OR REPLACE INTO payout_accounts VALUES (?, ?, ?, ?)').run(shopOwner, 'acc_TESTLINK0001', status, Date.now());
    r = await call('GET', '/api/payments/setup');
    check(`a linked account that is "${status}" shows as ${expected}`, r.json.state === expected && r.json.canEnableOnline === (expected === 'active'));
  }
  db.prepare('INSERT OR REPLACE INTO payout_accounts VALUES (?, ?, ?, ?)').run(shopOwner, 'acc_TESTLINK0001', 'under_review', Date.now());
  r = await call('PUT', '/api/payments/setup', { online: true });
  check('online payment cannot be switched on while Razorpay is still verifying the account', r.status === 409);
  r = await call('GET', '/api/public/ashaboutique');
  check('a pending account never shows online payment to buyers', r.json.razorpay === null && r.json.payments.online === false);
  db.prepare('INSERT OR REPLACE INTO payout_accounts VALUES (?, ?, ?, ?)').run(shopOwner, 'acc_TESTLINK0001', 'activated', Date.now());
  r = await call('PUT', '/api/payments/setup', { online: true, manualInstructions: 'Pay by UPI to asha@okhdfc and send a screenshot.' });
  check('once Razorpay has activated the account the seller can switch online payment on', r.status === 200 && r.json.online === true && r.json.manualInstructions.includes('UPI'));
  r = await call('PUT', '/api/payments/setup', { online: false, manual: false });
  check('a shop must keep at least one way to order', r.status === 400);
  r = await call('GET', '/api/public/ashaboutique');
  check('buyers now see online payment and the seller\'s manual instructions', r.json.razorpay.keyId === 'rzp_test_dummy' && r.json.payments.online === true && r.json.payments.instructions.includes('screenshot'));

  // -- the cart is priced from the database
  r = await shop('/cart', { items: [{ id: 'c-shirt', qty: 2, variant: 'M' }, { id: 'c-mug', qty: 1 }, { id: 'c-draft', qty: 1 }, { id: 'nope', qty: 1 }, { id: 'c-shirt', qty: 1 }] });
  const lineOf = (id, variant = '') => r.json.lines.find((line) => line.id === id && line.variant === variant);
  check('the cart shows current prices and the subtotal', r.status === 200 && lineOf('c-shirt', 'M').price === 1000 && lineOf('c-mug').price === 300 && r.json.subtotal === 2300);
  check('a draft product, an unknown product and a missing size are flagged, not priced', lineOf('c-draft').available === false && r.json.lines.some((line) => line.id === 'nope' && !line.available) && r.json.lines.some((line) => line.id === 'c-shirt' && line.reason === 'Choose a size'));
  check('delivery is added to a basket that is below the free-delivery amount, and free above it', r.json.deliveryFee === 0 && r.json.total === 2300);
  r = await shop('/cart', { items: [{ id: 'c-mug', qty: 1 }] });
  check('a small basket pays the shop\'s delivery fee', r.json.deliveryFee === 60 && r.json.total === 360);
  r = await shop('/cart', { items: [{ id: 'c-mug', qty: 40 }] });
  check('a quantity above what can be ordered is trimmed', r.json.lines[0].quantity === 20 && r.json.lines[0].adjusted === true);

  resetRateLimits();
  // -- checkout validation
  r = await shop('/checkout', { ...BUYER, items: [{ id: 'c-shirt', qty: 1 }], payment: 'manual' });
  check('a product with sizes needs a size', r.status === 400 && /size/i.test(r.json.error));
  r = await shop('/checkout', { ...BUYER, items: [{ id: 'c-shirt', qty: 1, variant: 'XXL' }], payment: 'manual' });
  check('a size the product does not have is refused', r.status === 400);
  r = await shop('/checkout', { ...BUYER, email: 'not-an-email', items: [{ id: 'c-mug', qty: 1 }], payment: 'manual' });
  check('an invalid email is refused', r.status === 400);
  r = await shop('/checkout', { ...BUYER, pincode: '12', items: [{ id: 'c-mug', qty: 1 }], payment: 'manual' });
  check('a bad PIN code is refused', r.status === 400);
  r = await shop('/checkout', { ...BUYER, city: '', items: [{ id: 'c-mug', qty: 1 }], payment: 'manual' });
  check('a missing city is refused for products', r.status === 400);
  r = await shop('/checkout', { ...BUYER, items: [{ id: 'c-draft', qty: 1 }], payment: 'manual' });
  check('a draft product cannot be ordered', r.status === 400);
  r = await shop('/checkout', { ...BUYER, items: [{ id: 'c-mug', qty: 1 }], payment: 'cash-in-the-post' });
  check('an unknown payment choice falls back to what the shop offers (online first)', r.status === 200 && r.json.payMode === 'online');
  const fallbackId = r.json.orderId;
  r = await shop('/checkout', { name: 'Yoga Fan', phone: '9822233344', items: [{ id: 'c-class', qty: 1 }], payment: 'manual' });
  check('a service needs no address, PIN code or delivery fee', r.status === 200 && r.json.deliveryFee === 0 && r.json.total === 500);

  // -- a price sent by the browser is ignored
  r = await shop('/checkout', { ...BUYER, items: [{ id: 'c-mug', qty: 1, price: 1 }], total: 1, payment: 'manual' });
  check('the browser cannot set a price or total', r.status === 200 && r.json.total === 360);
  check('the order was saved at the real price', listOrders().find((o) => o.id === r.json.orderId).subtotal === 300);

  // -- a manual order stays unpaid until the seller says so
  const stockBefore = readProduct('c-shirt').stock;
  r = await shop('/checkout', { ...BUYER, items: [{ id: 'c-shirt', qty: 2, variant: 'M' }], payment: 'manual', requestId: 'req-manual-0001' });
  const manualId = r.json.orderId;
  check('a manual order is placed with payment pending, never paid', r.status === 200 && r.json.payMode === 'manual' && r.json.payStatus === 'pending' && r.json.payment === null);
  let order = readOrder(manualId);
  check('the order keeps the buyer\'s details, the size and the statuses', order.paid === false && order.fulfil === 'placed' && order.items[0][2] === 'M' && order.city === 'Pune' && order.pincode === '411001' && order.email === 'ravi@example.com');
  check('stock is taken for the order', readProduct('c-shirt').stock === stockBefore - 2);
  r = await shop('/checkout', { ...BUYER, items: [{ id: 'c-shirt', qty: 2, variant: 'M' }], payment: 'manual', requestId: 'req-manual-0001' });
  check('sending the same order twice does not create a second one', r.status === 200 && r.json.orderId === manualId && r.json.duplicate === true && readProduct('c-shirt').stock === stockBefore - 2);
  r = await shop('/checkout', { ...BUYER, items: [{ id: 'c-shirt', qty: 1, variant: 'S' }, { id: 'c-shirt', qty: 2, variant: 'L' }], payment: 'manual' });
  check('stock is shared across sizes: the last items cannot be sold twice', r.status === 400 && /left/.test(r.json.error));
  r = await call('GET', '/api/state');
  const seen = r.json.collections.orders.find((o) => o.id === manualId);
  check('the order appears in the seller\'s dashboard with its payment and fulfilment status', Boolean(seen) && seen.payMode === 'manual' && seen.payStatus === 'pending');
  r = await shop('/order-status', { orderId: manualId, phone: BUYER.phone });
  check('the buyer sees a manual order\'s payment instructions, but not their address back', r.status === 200 && r.json.manual.instructions.includes('screenshot') && !JSON.stringify(r.json).includes('MG Road') && r.json.items[0].variant === 'M');
  r = await shop('/order-status', { orderId: manualId, phone: '9000000000' });
  check('a wrong phone number cannot read an order', r.status === 404);

  resetRateLimits();
  // -- online payment: created on the server, only paid when verified
  r = await shop('/checkout', { ...BUYER, items: [{ id: 'c-mug', qty: 1 }], payment: 'online', requestId: 'req-online-0001' });
  const onlineId = r.json.orderId;
  const onlineRzp = r.json.payment && r.json.payment.orderId;
  check('an online order creates the Razorpay order on the server for the stored total', r.status === 200 && r.json.payMode === 'online' && r.json.payStatus === 'awaiting_payment' && r.json.payment.amount === 36000 && /^order_SHOP/.test(onlineRzp) && r.json.payment.keyId === 'rzp_test_dummy');
  check('the key secret is never sent to the browser', !JSON.stringify(r.json).includes('test_secret_123'));
  check('the order is not paid yet', readOrder(onlineId).paid === false && readOrder(onlineId).payStatus === 'awaiting_payment');
  const callsBefore = razorpayCalls;
  r = await shop('/checkout', { ...BUYER, items: [{ id: 'c-mug', qty: 1 }], payment: 'online', requestId: 'req-online-0001' });
  check('a repeated click gives the same order and the same Razorpay order', r.json.orderId === onlineId && r.json.payment.orderId === onlineRzp && razorpayCalls === callsBefore);
  r = await call('POST', '/api/public/razorpay/verify', { razorpay_order_id: onlineRzp, razorpay_payment_id: 'pay_SHOP0001', razorpay_signature: 'forged' });
  check('a forged payment proof does not mark the order paid', r.status === 400 && readOrder(onlineId).paid === false);
  r = await shop(`/orders/${onlineId}/sync`, { phone: BUYER.phone });
  check('asking for a status check without a captured payment leaves it unpaid', r.status === 200 && r.json.paid === false);
  r = await call('POST', '/api/public/razorpay/verify', { razorpay_order_id: onlineRzp, razorpay_payment_id: 'pay_SHOP0001', razorpay_signature: hmac('test_secret_123', `${onlineRzp}|pay_SHOP0001`) });
  check('a genuine signature marks the order paid and confirmed', r.status === 200 && readOrder(onlineId).paid === true && readOrder(onlineId).payStatus === 'paid' && readOrder(onlineId).fulfil === 'confirmed');
  const shopCapturedEvent = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_SHOP0001', order_id: onlineRzp, method: 'upi' } } } });
  for (const eventId of ['evt_shop_a', 'evt_shop_b']) await call('POST', '/api/webhooks/razorpay', null, { raw: shopCapturedEvent, headers: { 'x-razorpay-signature': hmac('whsec_test_456', shopCapturedEvent), 'x-razorpay-event-id': eventId } });
  check('webhook repeats do not duplicate the payment record', listOrders().filter((o) => o.id === onlineId).length === 1 && readOrder(onlineId).notes.filter((n) => /Paid online/.test(n)).length === 1);
  check('the payment appears once in the seller\'s payments', rows('SELECT * FROM payments WHERE user_id = ? AND order_id = ?', shopOwner, String(onlineId)).length === 1);

  // -- failed and cancelled payments, retries
  r = await shop('/checkout', { ...BUYER, items: [{ id: 'c-mug', qty: 1 }], payment: 'online' });
  const failId = r.json.orderId;
  const failRzp = r.json.payment.orderId;
  const shopFailedEvent = JSON.stringify({ event: 'payment.failed', payload: { payment: { entity: { id: 'pay_SHOPFAIL', order_id: failRzp, method: 'card', error_description: 'Card declined' } } } });
  await call('POST', '/api/webhooks/razorpay', null, { raw: shopFailedEvent, headers: { 'x-razorpay-signature': hmac('whsec_test_456', shopFailedEvent), 'x-razorpay-event-id': 'evt_shop_fail' } });
  check('a failed payment never becomes a paid order, and the order stays open', readOrder(failId).paid === false && readOrder(failId).payStatus === 'failed' && readOrder(failId).fulfil === 'placed');
  r = await shop('/order-status', { orderId: failId, phone: BUYER.phone });
  check('the buyer is told the payment failed and may retry', r.json.payStatus === 'failed' && r.json.canRetryPayment === true);
  r = await shop(`/orders/${failId}/pay`, { phone: '9000000000' });
  check('only the buyer (matching phone) can restart the payment', r.status === 404);
  r = await shop(`/orders/${failId}/pay`, { phone: BUYER.phone });
  check('the buyer can retry, with a fresh Razorpay order', r.status === 200 && r.json.payment.orderId !== failRzp && readOrder(failId).payStatus === 'awaiting_payment');
  const retryRzp = r.json.payment.orderId;
  r = await shop(`/orders/${failId}/pay`, { phone: BUYER.phone });
  check('retrying again reuses the open Razorpay order, so no duplicates pile up', r.json.payment.orderId === retryRzp);
  r = await call('POST', '/api/public/razorpay/verify', { razorpay_order_id: retryRzp, razorpay_payment_id: 'pay_SHOP0002', razorpay_signature: hmac('test_secret_123', `${retryRzp}|pay_SHOP0002`) });
  check('the retried payment completes the same order', r.status === 200 && readOrder(failId).paid === true && listOrders().filter((o) => String(o.id) === String(failId)).length === 1);
  r = await shop(`/orders/${failId}/pay`, { phone: BUYER.phone });
  check('a paid order cannot be paid again', r.status === 409);

  // -- delayed confirmation: Razorpay is asked directly
  r = await shop('/checkout', { ...BUYER, items: [{ id: 'c-mug', qty: 1 }], payment: 'online' });
  const lateId = r.json.orderId;
  razorpayService.getOrderPayments = async () => ({ items: [{ id: 'pay_SYNC1', status: 'failed', method: 'card' }] });
  r = await shop(`/orders/${lateId}/sync`, { phone: BUYER.phone });
  check('a status check that finds only failed attempts does not mark it paid', r.json.paid === false);
  razorpayService.getOrderPayments = async () => ({ items: [{ id: 'pay_SYNC1', status: 'captured', method: 'upi' }] });
  r = await shop(`/orders/${lateId}/sync`, { phone: BUYER.phone });
  check('when the webhook is late, a status check that finds a captured payment confirms the order', r.json.paid === true && readOrder(lateId).paid === true);
  razorpayService.getOrderPayments = realOrderPayments;

  // -- abandoned checkouts release their stock, and a late payment still works
  const mugBefore = readProduct('c-mug').stock;
  r = await shop('/checkout', { ...BUYER, items: [{ id: 'c-mug', qty: 1 }], payment: 'online' });
  const abandonId = r.json.orderId;
  const abandonRzp = r.json.payment.orderId;
  check('an online order holds its stock while it waits for payment', readProduct('c-mug').stock === mugBefore - 1);
  const aged = readOrder(abandonId);
  aged.ts = Date.now() - 31 * 60 * 1000;
  db.prepare('UPDATE records SET data = ? WHERE user_id = ? AND kind = ? AND id = ?').run(JSON.stringify(aged), shopOwner, 'orders', String(abandonId));
  check('an unpaid online order is cancelled after the hold time', ordersModule.expireAbandonedOrders() >= 1 && readOrder(abandonId).fulfil === 'cancelled' && readOrder(abandonId).expired === true);
  check('and its stock goes back on the shelf', readProduct('c-mug').stock === mugBefore);
  r = await shop(`/orders/${abandonId}/pay`, { phone: BUYER.phone });
  check('an expired order cannot be paid, the buyer is asked to order again', r.status === 409 && /not paid in time/.test(r.json.error));
  r = await shop('/order-status', { orderId: abandonId, phone: BUYER.phone });
  check('the buyer sees that it expired and cannot retry', r.json.fulfil === 'cancelled' && r.json.expired === true && r.json.canRetryPayment === false);
  const latePaid = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_SHOPLATE', order_id: abandonRzp, method: 'upi' } } } });
  await call('POST', '/api/webhooks/razorpay', null, { raw: latePaid, headers: { 'x-razorpay-signature': hmac('whsec_test_456', latePaid), 'x-razorpay-event-id': 'evt_shop_late' } });
  check('a payment that arrives after expiry reopens the order and takes the stock again', readOrder(abandonId).paid === true && readOrder(abandonId).fulfil === 'confirmed' && readProduct('c-mug').stock === mugBefore - 1);

  resetRateLimits();
  // -- if the payment cannot start, no ghost order is left
  const orderCountBefore = listOrders().length;
  const stockBeforeFail = readProduct('c-mug').stock;
  razorpayService.createOrder = async () => { throw new Error('Razorpay is down'); };
  r = await shop('/checkout', { ...BUYER, items: [{ id: 'c-mug', qty: 1 }], payment: 'online' });
  const ghost = listOrders().find((o) => o.id === Math.max(...listOrders().map((x) => x.id)));
  check('when Razorpay cannot start the payment the buyer is told, and the order is cancelled with its stock restored', r.status === 502 && readProduct('c-mug').stock === stockBeforeFail && ghost.fulfil === 'cancelled' && listOrders().length === orderCountBefore + 1, JSON.stringify(r.json));
  razorpayService.createOrder = async ({ amountRupees }) => { razorpayCalls += 1; return { id: `order_SHOP${razorpayCalls}`, amount: Math.round(amountRupees * 100) }; };

  // -- other settings change what is offered
  await call('PUT', '/api/payments/setup', { manual: false });
  r = await shop('/checkout', { ...BUYER, items: [{ id: 'c-mug', qty: 1 }], payment: 'manual' });
  check('when the seller allows only online payment, a manual order is refused', r.status === 400, JSON.stringify(r.json));
  await call('PUT', '/api/payments/setup', { manual: true, online: false });
  r = await shop('/checkout', { ...BUYER, items: [{ id: 'c-mug', qty: 1 }], payment: 'online' });
  check('when the seller switched online payment off, an online order is refused', r.status === 400, JSON.stringify(r.json));
  r = await shop('/checkout', { ...BUYER, items: [{ id: 'c-mug', qty: 1 }] });
  check('with online off and no choice made, the order is placed as pay-separately', r.status === 200 && r.json.payMode === 'manual', JSON.stringify(r.json));
  const noRazorpayOrder = r.json.orderId;
  await call('PUT', '/api/payments/setup', { online: true });
  const savedKey = appConfig.razorpay.keyId;
  appConfig.razorpay.keyId = '';
  r = await call('GET', '/api/public/ashaboutique');
  check('if Razorpay stops being configured the shop quietly stops offering online payment', r.json.razorpay === null && r.json.payments.online === false && r.json.payments.manual === true);
  r = await call('GET', '/api/payments/setup');
  check('the seller sees "Not configured"', r.json.state === 'not_configured');
  r = await shop('/checkout', { ...BUYER, items: [{ id: 'c-mug', qty: 1 }] });
  check('the storefront still takes orders when Razorpay is not configured', r.status === 200 && r.json.payMode === 'manual' && r.json.payment === null, JSON.stringify(r.json));
  appConfig.razorpay.keyId = savedKey;
  appConfig.razorpay.route = false;
  appConfig.razorpay.platformCollects = true;

  // -- fulfilment is separate from payment
  r = await call('POST', `/api/orders/${manualId}/status`, { status: 'processing' });
  check('the seller moves an order to processing without it becoming paid', r.status === 200 && readOrder(manualId).fulfil === 'processing' && readOrder(manualId).paid === false);
  r = await call('POST', `/api/orders/${manualId}/status`, { status: 'shipped' });
  check('shipped also sets the shipped flag used elsewhere', readOrder(manualId).fulfil === 'shipped' && readOrder(manualId).shipped === true);
  r = await call('POST', `/api/orders/${manualId}/status`, { status: 'teleported' });
  check('an unknown status is refused', r.status === 409);
  const shirtBeforeCancel = readProduct('c-shirt').stock;
  r = await call('POST', `/api/orders/${manualId}/status`, { status: 'cancelled' });
  check('cancelling puts the stock back, once', readOrder(manualId).fulfil === 'cancelled' && readProduct('c-shirt').stock === shirtBeforeCancel + 2);
  r = await call('POST', `/api/orders/${manualId}/status`, { status: 'cancelled' });
  check('cancelling twice does not add stock twice', readProduct('c-shirt').stock === shirtBeforeCancel + 2);
  r = await call('POST', `/api/orders/${manualId}/status`, { status: 'processing' });
  check('a cancelled order stays cancelled', r.status === 409);
  const cookieOne = cookie;
  cookie = thirdCookie;
  r = await call('POST', `/api/orders/${onlineId}/status`, { status: 'shipped' });
  check('another seller cannot change this seller\'s order', r.status === 404);
  r = await call('GET', '/api/payments/setup');
  check('another seller sees their own payment setup, not this seller\'s', r.status === 200 && r.json.account === null);
  r = await call('GET', '/api/state');
  check('another seller sees none of these orders', r.json.collections.orders.length === 0);
  cookie = '';
  r = await call('POST', `/api/orders/${onlineId}/status`, { status: 'shipped' });
  check('a visitor who is not signed in cannot change orders', r.status === 401);
  r = await call('GET', '/api/payments/setup');
  check('a visitor who is not signed in cannot read payment settings', r.status === 401);
  r = await call('POST', '/api/public/nobody/checkout', { ...BUYER, items: [{ id: 'c-mug', qty: 1 }] });
  check('an unknown shop is a 404', r.status === 404, JSON.stringify(r.json));
  r = await call('POST', '/api/public/thirdshop/checkout', { ...BUYER, items: [{ id: 'c-mug', qty: 1 }] }).catch(() => ({ status: 0 }));
  check("a product id from another seller's shop cannot be bought", r.status === 404 || r.status === 400);
  cookie = cookieOne;
  razorpayService.createOrder = realCreateOrder;

  /* ---------- the sample shop and security ---------- */
  cookie = '';
  r = await call('POST', '/api/auth/login', { email: 'demo@stoora.in', password: 'meera2026' });
  check('the sample shop logs in', r.status === 200 && r.json.user.demo === true);
  r = await call('PUT', '/api/collections/products', { items: [] });
  check('the sample shop is read-only', r.status === 403);
  r = await call('GET', '/api/state');
  check(
    'the sample shop has its sample data',
    r.json.collections.orders.length === 4 && r.json.collections.products.length === 5,
  );

  cookie = '';
  r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://evil.example' },
    body: '{}',
  });
  check('a request from another website is blocked', r.status === 403);
  for (const [name, url] of [
    ['server code', '/server/index.js'],
    ['the database', '/data/stoora.db'],
    ['.env', '/.env'],
    ['a path outside public', '/../server/config.js'],
  ]) {
    r = await fetch(BASE + url);
    check(`${name} is not served`, r.status === 404);
  }
  r = await fetch(`${BASE}/dashboard`);
  check('the dashboard page is served', r.status === 200);
  r = await fetch(`${BASE}/s/ashaboutique`);
  check('the shop page is served', r.status === 200);

  // the Journal: server-rendered pages with their own metadata
  r = await fetch(`${BASE}/journal`);
  let journalHtml = await r.text();
  check(
    'the Journal home is served with its own title and canonical address',
    r.status === 200 && /<title>The Stoora Journal/.test(journalHtml) && /rel="canonical"/.test(journalHtml),
  );
  check('every Journal story is listed', (journalHtml.match(/class="jr-card"/g) || []).length === 10);
  r = await fetch(`${BASE}/journal/product-photos-at-home`);
  journalHtml = await r.text();
  check('a Journal story is served with article metadata', r.status === 200 && /"@type":"Article"/.test(journalHtml));
  r = await fetch(`${BASE}/journal/no-such-story`);
  check('an unknown Journal story is a 404', r.status === 404);
  r = await fetch(`${BASE}/journal?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E`);
  check('Journal search text is never echoed unescaped', !(await r.text()).includes('<script>alert(1)'));
  r = await fetch(`${BASE}/sitemap.xml`);
  check(
    'the sitemap lists the Journal stories',
    r.status === 200 && (await r.text()).includes('/journal/packing-checklist'),
  );

  console.log(failures ? `\n${failures} FAILED, ${passes} passed` : `\nAll ${passes} checks passed`);
  server.close();
  process.exit(failures ? 1 : 0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
