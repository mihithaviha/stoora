/**
 * The public shop page: what buyers see, checkout, paying, order tracking and reviews.
 * None of these routes need a login. Every template uses these same routes.
 *
 * Rules that hold everywhere in this file:
 *  - Prices, stock, options and delivery fees always come from the database, never from the browser.
 *  - An order is never "paid" because the browser says so: only a verified signature, a signed webhook,
 *    or Razorpay's own answer when we ask for it.
 */
'use strict';

const { sql, transaction, listRecords, saveRecord } = require('../db');
const { HttpError, clientIp, isRateLimited } = require('../http');
const { cleanText } = require('../auth');
const { ratingsByProduct } = require('../stats');
const orders = require('../orders');
const { acceptedPayments, variantsOf } = require('../commerce');
const razorpay = require('../services/razorpay');
const email = require('../services/email');
const payments = require('./payments');
const { config } = require('../config');
const { publishedStorefront } = require('../storefront');

const { dateLabel, nextOrderId, fulfilOf, payStatusOf } = orders;
const today = () => new Date().toISOString().slice(0, 10);
const lastTenDigits = (text) =>
  String(text || '')
    .replace(/\D/g, '')
    .slice(-10);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Only these settings are shown to buyers. Everything else stays private. */
function publicSettings(owner) {
  const settings = JSON.parse(owner.settings);
  const cfg = settings.cfg || {};
  return {
    look: settings.look || 0,
    tagline: settings.tagline || '',
    contact: {
      whatsapp: /^\d{10}$/.test(cfg.whatsapp || '') ? cfg.whatsapp : null,
      instagram: /^[A-Za-z0-9._]{1,30}$/.test(cfg.instagram || '') ? cfg.instagram : null,
      upi: /^[\w.\-]{2,}@[a-z]{2,}$/i.test(cfg.upi || '') ? cfg.upi : null,
    },
    delivery: { fee: Number(cfg.shipFee) || 0, freeAbove: Number(cfg.freeShipAbove) || 0 },
    requireAddress: cfg.requireAddress !== false,
    policies: {
      refund: cfg.policyRefund || '',
      shipping: cfg.policyShipping || '',
      privacy: cfg.policyPrivacy || '',
      terms: cfg.policyTerms || '',
    },
    gstin: cfg.gstin || '',
    pricesIncludeGst: cfg.pricesIncludeGst !== false,
    address: cfg.address || '',
    tracking: {
      metaPixel: /^\d{5,20}$/.test(cfg.metaPixelId || '') ? cfg.metaPixelId : null,
      googleAnalytics: /^G-[A-Z0-9]{4,14}$/.test(cfg.googleAnalyticsId || '') ? cfg.googleAnalyticsId : null,
    },
  };
}

/** Delivery fee for an order: charged on products only, waived above the "free delivery" amount. */
function deliveryFee(settings, subtotal, hasProducts) {
  if (!hasProducts) return 0;
  const { fee, freeAbove } = settings.delivery;
  return fee > 0 && !(freeAbove > 0 && subtotal >= freeAbove) ? fee : 0;
}

function findShop(handle) {
  const owner = sql.userByHandle.get(handle);
  if (!owner || owner.owner_id) throw new HttpError(404, 'Shop not found');
  return owner;
}

/** Find an order only when the phone number matches: this is how buyers prove it is theirs. */
function findOrderForBuyer(owner, orderId, phone) {
  const order = listRecords(owner.id, 'orders').find((item) => String(item.id) === String(orderId));
  if (!order || !order.phone || lastTenDigits(order.phone) !== lastTenDigits(phone))
    throw new HttpError(404, 'We could not find that order. Check the number and phone.');
  return order;
}

/** What the buyer sees about an order: its status, never the address or other private notes. */
function describeOrderForBuyer(owner, order) {
  const catalogue = [...listRecords(owner.id, 'products'), ...listRecords(owner.id, 'services')];
  const reviewed = new Set(
    listRecords(owner.id, 'reviews')
      .filter((r) => String(r.orderId) === String(order.id))
      .map((r) => r.productId),
  );
  const accepted = acceptedPayments(owner);
  const payStatus = payStatusOf(order);
  const fulfil = fulfilOf(order);
  return {
    id: order.id,
    when: order.when,
    subtotal: order.subtotal ?? order.total,
    deliveryFee: order.deliveryFee || 0,
    total: order.total,
    paid: Boolean(order.paid),
    refunded: Boolean(order.refunded),
    shipped: Boolean(order.shipped),
    payMode: order.payMode || (order.paid ? 'online' : 'manual'),
    payStatus,
    fulfil,
    expired: Boolean(order.expired),
    // The buyer may try the payment again while the order is open and online payment still works for this shop.
    canRetryPayment:
      order.payMode === 'online' &&
      !order.paid &&
      fulfil !== 'cancelled' &&
      accepted.online &&
      payStatus !== 'refunded',
    manual:
      order.payMode === 'manual' && !order.paid ? { instructions: accepted.instructions, upi: accepted.upi } : null,
    courier: order.courier || '',
    tracking: order.tracking || '',
    items: (order.items || []).map(([id, quantity, variant]) => {
      const found = catalogue.find((c) => c.id === id);
      return {
        id,
        quantity,
        variant: variant || '',
        name: (found || { name: 'Item' }).name,
        price: found ? found.price : 0,
        img: (found && found.img) || '',
        reviewed: reviewed.has(id),
      };
    }),
  };
}

/** The Razorpay details the browser needs to open the payment window for an order. */
async function paymentFor(owner, order) {
  try {
    return await payments.startOnlinePayment(owner, order);
  } catch (error) {
    throw new HttpError(502, `The payment could not start: ${error.message}`);
  }
}

module.exports = function registerShopRoutes(router) {
  /** A seller's own web address (Settings > Domains) tells the page which shop to show. */
  router.add('GET', '/api/public/by-host', {}, ({ req }) => {
    const row = sql.domainOwner.get(
      String(req.headers.host || '')
        .split(':')[0]
        .toLowerCase(),
    );
    const owner = row && sql.userById.get(row.user_id);
    if (!owner) throw new HttpError(404, 'No shop for this address');
    return { handle: owner.handle };
  });

  router.add('GET', '/api/public/:handle', {}, ({ params }) => {
    const owner = findShop(params.handle);
    sql.countVisit.run(owner.id, today());

    const reviews = listRecords(owner.id, 'reviews');
    const accepted = acceptedPayments(owner);
    return {
      shop: owner.shop,
      handle: owner.handle,
      city: owner.city,
      // The Razorpay key id is public by design, and is only sent when this shop really can take online payments.
      razorpay: accepted.online ? { keyId: config.razorpay.keyId } : null,
      payments: accepted,
      products: listRecords(owner.id, 'products').filter((product) => product.status === 'Active'),
      services: listRecords(owner.id, 'services'),
      ratings: ratingsByProduct(reviews),
      recentReviews: reviews
        .slice(0, 6)
        .map(({ who, rating, comment, productId }) => ({ who, rating, comment, productId })),
      // The seller's published storefront (template, theme, texts and the products it shows), or null.
      storefront: publishedStorefront(owner),
      ...publicSettings(owner),
    };
  });

  /** Check the basket against the shop right now: current prices, stock, options and the delivery fee. */
  function priceBasket(owner, settings, lines) {
    if (!Array.isArray(lines) || !lines.length || lines.length > 40) throw new HttpError(400, 'Pick at least one item');
    const products = listRecords(owner.id, 'products');
    const services = listRecords(owner.id, 'services');
    const merged = new Map();
    for (const line of lines) {
      const quantity = Math.floor(Number(line.qty));
      const product = products.find((p) => p.id === line.id && p.status === 'Active');
      const service = services.find((s) => s.id === line.id);
      const item = product || service;
      if (!item || !(quantity >= 1 && quantity <= 20)) throw new HttpError(400, 'One item is not available any more');
      let variant = '';
      if (product) {
        const options = variantsOf(product);
        variant = cleanText(line.variant, 30);
        if (options.length && !options.includes(variant)) throw new HttpError(400, `Choose a size for ${product.name}`);
        if (!options.length) variant = '';
      }
      const key = `${item.id}\u0000${variant}`;
      const have = merged.get(key);
      merged.set(key, { item, product: Boolean(product), variant, quantity: (have ? have.quantity : 0) + quantity });
    }

    const items = [];
    const lineDetails = [];
    const perProduct = {};
    let subtotal = 0;
    let hasProducts = false;
    for (const { item, product, variant, quantity } of merged.values()) {
      if (quantity > 20) throw new HttpError(400, `You can order up to 20 of ${item.name} at a time`);
      if (product) {
        hasProducts = true;
        perProduct[item.id] = (perProduct[item.id] || 0) + quantity;
        if (item.stock != null && item.stock < perProduct[item.id])
          throw new HttpError(
            400,
            item.stock > 0 ? `${item.name} has only ${item.stock} left` : `${item.name} is sold out`,
          );
      }
      subtotal += item.price * quantity;
      items.push(variant ? [item.id, quantity, variant] : [item.id, quantity]);
      lineDetails.push({
        id: item.id,
        name: item.name,
        variant,
        quantity,
        price: item.price,
        lineTotal: item.price * quantity,
        img: item.img || '',
      });
    }
    const fee = deliveryFee(settings, subtotal, hasProducts);
    return { items, lineDetails, subtotal, hasProducts, fee, total: subtotal + fee };
  }

  /** The cart screen calls this to show current prices and what is still available, before checkout. */
  router.add('POST', '/api/public/:handle/cart', {}, ({ req, params, body }) => {
    if (isRateLimited(`cart:${clientIp(req)}`, 120, 60 * 1000))
      throw new HttpError(429, 'Too many tries. Wait a minute.');
    const owner = findShop(params.handle);
    const settings = publicSettings(owner);
    const products = listRecords(owner.id, 'products');
    const services = listRecords(owner.id, 'services');
    const lines = (Array.isArray(body.items) ? body.items : []).slice(0, 40).map((line) => {
      const wanted = Math.max(1, Math.floor(Number(line.qty)) || 1);
      const product = products.find((p) => p.id === line.id && p.status === 'Active');
      const item = product || services.find((s) => s.id === line.id);
      if (!item)
        return { id: String(line.id), variant: '', quantity: wanted, available: false, reason: 'No longer available' };
      const options = product ? variantsOf(product) : [];
      const variant = cleanText(line.variant, 30);
      const maxQuantity = product && item.stock != null ? Math.max(0, Math.min(20, item.stock)) : 20;
      let reason = '';
      if (options.length && !options.includes(variant)) reason = 'Choose a size';
      else if (product && item.stock != null && item.stock <= 0) reason = 'Sold out';
      return {
        id: item.id,
        variant: options.length ? variant : '',
        name: item.name,
        price: item.price,
        img: item.img || '',
        isService: !product,
        quantity: Math.min(wanted, Math.max(1, maxQuantity)),
        maxQuantity,
        available: !reason,
        reason,
        adjusted: !reason && wanted > maxQuantity,
      };
    });
    const priced = lines.filter((line) => line.available);
    const subtotal = priced.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const hasProducts = priced.some((line) => !line.isService);
    const fee = deliveryFee(settings, subtotal, hasProducts);
    return {
      lines,
      subtotal,
      deliveryFee: fee,
      total: subtotal + fee,
      payments: acceptedPayments(owner),
      requireAddress: settings.requireAddress,
      delivery: settings.delivery,
    };
  });

  router.add('POST', '/api/public/:handle/checkout', {}, async ({ req, params, body }) => {
    if (isRateLimited(`checkout:${clientIp(req)}`, 20, 60 * 1000))
      throw new HttpError(429, 'Too many tries. Wait a minute.');
    orders.expireAbandonedOrders();
    const owner = findShop(params.handle);
    const settings = publicSettings(owner);
    const accepted = acceptedPayments(owner);

    // The same click sent twice (or a retry after a bad connection) gives back the same order.
    const requestId = cleanText(body.requestId, 64);
    if (requestId && !/^[A-Za-z0-9_-]{8,64}$/.test(requestId)) throw new HttpError(400, 'Bad request id');
    if (requestId) {
      const existing = listRecords(owner.id, 'orders').find(
        (item) => item.requestId === requestId && fulfilOf(item) !== 'cancelled',
      );
      if (existing) {
        const open =
          existing.payMode === 'online' && !existing.paid && fulfilOf(existing) !== 'cancelled' && accepted.online;
        return {
          orderId: existing.id,
          total: existing.total,
          deliveryFee: existing.deliveryFee || 0,
          payMode: existing.payMode,
          payStatus: payStatusOf(existing),
          payment: open ? await paymentFor(owner, existing) : null,
          duplicate: true,
        };
      }
    }

    const name = cleanText(body.name, 80);
    const phone = lastTenDigits(body.phone);
    const buyerEmail = cleanText(body.email, 120).toLowerCase();
    const address = cleanText(body.address, 300);
    const city = cleanText(body.city, 60);
    const state = cleanText(body.state, 60);
    const pincode = String(body.pincode || '').replace(/\s/g, '');
    const instructions = cleanText(body.instructions, 300);
    if (name.length < 2) throw new HttpError(400, 'Add your name');
    if (phone.length !== 10) throw new HttpError(400, 'Add a 10-digit phone number');
    if (buyerEmail && !EMAIL_PATTERN.test(buyerEmail))
      throw new HttpError(400, 'That email address does not look right');

    const basket = priceBasket(owner, settings, body.items);
    if (basket.hasProducts && settings.requireAddress) {
      if (address.length < 6) throw new HttpError(400, 'Add your delivery address');
      if (city.length < 2) throw new HttpError(400, 'Add your city');
      if (!/^\d{6}$/.test(pincode)) throw new HttpError(400, 'Add a 6-digit PIN code');
    } else if (pincode && !/^\d{6}$/.test(pincode)) throw new HttpError(400, 'That PIN code does not look right');

    // The buyer's choice of how to pay, checked against what this shop really offers.
    const wanted =
      body.payment === 'online' || body.payment === 'manual' ? body.payment : accepted.online ? 'online' : 'manual';
    if (!accepted.online && !accepted.manual)
      throw new HttpError(503, 'This shop is not taking orders right now. Please contact the shop.');
    if (wanted === 'online' && !accepted.online)
      throw new HttpError(400, 'Online payment is not available for this shop');
    if (wanted === 'manual' && !accepted.manual) throw new HttpError(400, 'This shop only takes online payment');

    const id = nextOrderId(owner.id);
    const timestamp = Date.now();
    const order = {
      id,
      who: name,
      phone,
      email: buyerEmail,
      address,
      city,
      state,
      pincode,
      instructions,
      items: basket.items,
      subtotal: basket.subtotal,
      deliveryFee: basket.fee,
      total: basket.total,
      paid: false,
      shipped: false,
      payMode: wanted,
      payStatus: wanted === 'online' ? 'awaiting_payment' : 'pending',
      fulfil: 'placed',
      requestId,
      src: 'Shop link',
      when: dateLabel(timestamp),
      ts: timestamp,
    };

    // Stock is checked again and taken inside one transaction, so two buyers cannot both take the last item.
    transaction(() => {
      const products = listRecords(owner.id, 'products');
      const taken = {};
      for (const [productId, quantity] of basket.items) taken[productId] = (taken[productId] || 0) + quantity;
      for (const [productId, quantity] of Object.entries(taken)) {
        const product = products.find((p) => p.id === productId);
        if (product && product.stock != null && product.stock < quantity)
          throw new HttpError(
            400,
            product.stock > 0 ? `${product.name} has only ${product.stock} left` : `${product.name} is sold out`,
          );
      }
      saveRecord(owner.id, 'orders', order, -(timestamp % 1_000_000)); // newest first
      for (const [productId, quantity] of Object.entries(taken)) {
        const product = products.find((p) => p.id === productId);
        if (product && product.stock != null) {
          product.stock -= quantity;
          saveRecord(owner.id, 'products', product, products.indexOf(product));
        }
      }
      const customers = listRecords(owner.id, 'customers');
      let customer = customers.find((c) => c.phoneRaw === phone);
      if (!customer)
        customer = {
          id: `cu${timestamp}`,
          name,
          phone: `+91 ${phone.slice(0, 2)}xxxx ${phone.slice(6)}`,
          phoneRaw: phone,
          orders: 0,
          spent: 0,
          last: '—',
        };
      customer.orders += 1;
      customer.last = 'Today';
      saveRecord(owner.id, 'customers', customer, 0);
    });

    let payment = null;
    if (wanted === 'online') {
      try {
        payment = await payments.startOnlinePayment(owner, order);
      } catch (error) {
        // No ghost order: if the payment cannot start, the order is cancelled and the stock goes back.
        orders.cancelOrder(owner.id, id);
        throw new HttpError(502, `The payment could not start, so your order was not placed: ${error.message}`);
      }
    } else if ((JSON.parse(owner.settings).cfg || {}).notifyEmail !== false) {
      // Tell the seller about an order that will be paid separately. Online orders are announced once paid.
      email.sendNewOrder(owner, order, basket.total);
    }
    return {
      orderId: id,
      total: basket.total,
      deliveryFee: basket.fee,
      payMode: wanted,
      payStatus: order.payStatus,
      payment,
    };
  });

  /** The buyer tries the payment again (cancelled window, failed attempt, a closed tab). */
  router.add('POST', '/api/public/:handle/orders/:id/pay', {}, async ({ req, params, body }) => {
    if (isRateLimited(`repay:${clientIp(req)}`, 15, 60 * 1000))
      throw new HttpError(429, 'Too many tries. Wait a minute.');
    const owner = findShop(params.handle);
    const order = findOrderForBuyer(owner, params.id, body.phone);
    if (order.paid) throw new HttpError(409, 'This order is already paid');
    if (order.payMode !== 'online') throw new HttpError(400, 'This order is paid separately, not online');
    if (fulfilOf(order) === 'cancelled')
      throw new HttpError(
        409,
        order.expired
          ? 'This order was cancelled because it was not paid in time. Please place it again.'
          : 'This order was cancelled.',
      );
    if (!acceptedPayments(owner).online)
      throw new HttpError(409, 'Online payment is not available for this shop right now. Please contact the shop.');
    const payment = await paymentFor(owner, order);
    orders.updateOrder(owner.id, order.id, (item) => {
      if (!item.paid) item.payStatus = 'awaiting_payment';
    });
    return { payment };
  });

  /**
   * "Has my payment gone through?" If the webhook is late, ask Razorpay directly. A payment only counts when
   * Razorpay itself says it was captured.
   */
  router.add('POST', '/api/public/:handle/orders/:id/sync', {}, async ({ req, params, body }) => {
    if (isRateLimited(`sync:${clientIp(req)}`, 30, 60 * 1000))
      throw new HttpError(429, 'Too many tries. Wait a minute.');
    const owner = findShop(params.handle);
    let order = findOrderForBuyer(owner, params.id, body.phone);
    let checked = false;
    if (order.payMode === 'online' && !order.paid && razorpay.isConfigured()) {
      for (const row of sql.paymentsForOrder.all(owner.id, String(order.id))) {
        try {
          const answer = await razorpay.getOrderPayments(row.rzp_order_id);
          checked = true;
          const captured = (answer.items || []).find((item) => item.status === 'captured');
          if (captured) {
            payments.confirmOnlinePayment(owner.id, order.id, captured.method || 'Razorpay', captured.id, row.id);
            break;
          }
        } catch (_) {
          // Razorpay could not be reached: the order simply stays as it is.
        }
      }
      order = findOrderForBuyer(owner, params.id, body.phone);
    }
    return { ...describeOrderForBuyer(owner, order), checked };
  });

  /** "Where is my order?" The buyer proves it is theirs with the order number and phone. */
  router.add('POST', '/api/public/:handle/order-status', {}, ({ req, params, body }) => {
    if (isRateLimited(`status:${clientIp(req)}`, 30, 60 * 1000))
      throw new HttpError(429, 'Too many tries. Wait a minute.');
    const owner = findShop(params.handle);
    return describeOrderForBuyer(owner, findOrderForBuyer(owner, body.orderId, body.phone));
  });

  /** A buyer rates something they bought. One review per item per order. */
  router.add('POST', '/api/public/:handle/reviews', {}, ({ req, params, body }) => {
    if (isRateLimited(`review:${clientIp(req)}`, 10, 60 * 60 * 1000))
      throw new HttpError(429, 'Too many reviews. Try again later.');
    const owner = findShop(params.handle);
    const order = findOrderForBuyer(owner, body.orderId, body.phone);

    const rating = Math.floor(Number(body.rating));
    if (!(rating >= 1 && rating <= 5)) throw new HttpError(400, 'Pick 1 to 5 stars');
    if (!order.items.some(([id]) => id === body.productId)) throw new HttpError(400, 'That item is not in this order');
    if (!order.paid && !order.shipped)
      throw new HttpError(400, 'You can review an item after the order is paid or shipped');

    const reviews = listRecords(owner.id, 'reviews');
    if (reviews.some((r) => String(r.orderId) === String(order.id) && r.productId === body.productId))
      throw new HttpError(409, 'You already reviewed this item');

    const review = {
      id: `r${Date.now()}`,
      orderId: order.id,
      productId: body.productId,
      who: order.who.split(' ')[0],
      rating,
      comment: cleanText(body.comment, 400),
      ts: Date.now(),
    };
    saveRecord(owner.id, 'reviews', review, -(review.ts % 1_000_000));
    return { ok: true };
  });
};

module.exports.deliveryFee = deliveryFee;
module.exports.publicSettings = publicSettings;
