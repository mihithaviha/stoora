/**
 * The signed-in person: profile, all shop data, saving shop data, settings, and helpers.
 */
'use strict';

const crypto = require('node:crypto');
const { db, sql, KINDS, listRecords, syncRecords } = require('../db');
const { hashPassword, publicUser, isValidEmail, cleanText } = require('../auth');
const { HttpError } = require('../http');
const { integrationStatus, config } = require('../config');
const { computeStats } = require('../stats');

const BUSINESS_TYPES = [
  'retail',
  'online',
  'tutoring',
  'fitness',
  'professional',
  'beauty',
  'food',
  'digital',
  'other',
];
const HELPER_ROLES = ['packing', 'chat'];

/** Which kinds of data each role may read and write. */
const READ_ACCESS = {
  owner: KINDS,
  packing: ['products', 'services', 'orders', 'bookings'],
  chat: ['chats', 'customers', 'products', 'services', 'orders'],
};
const WRITE_ACCESS = {
  owner: KINDS.filter((kind) => kind !== 'reviews'),
  packing: ['orders'],
  chat: ['chats', 'customers'],
};

/** The sample shop can be looked at but never changed. */
function refuseDemoWrites(owner) {
  if (owner.demo) throw new HttpError(403, 'The sample shop is read-only. Create your own shop to save changes.');
}

/* ---------- settings that need extra bookkeeping ---------- */

const isNumericId = (value) => /^\d{5,20}$/.test(value || '');
const isHostname = (value) => /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(value || '');

/** Remember which seller owns a WhatsApp number, an Instagram account and a web address. */
function syncExternalAccounts(ownerId, cfg) {
  const claims = [
    ['whatsapp', cfg.waPhoneId, isNumericId, sql.channelOwner, sql.setChannel],
    ['instagram', cfg.igAccountId, isNumericId, sql.channelOwner, sql.setChannel],
  ];
  sql.clearChannels.run(ownerId);
  for (const [channel, externalId, isValid, findOwner, save] of claims) {
    if (!externalId) continue;
    if (!isValid(externalId)) throw new HttpError(400, `That ${channel} id does not look right`);
    const current = findOwner.get(channel, externalId);
    if (current && current.user_id !== ownerId)
      throw new HttpError(409, `That ${channel} account belongs to another shop`);
    save.run(channel, externalId, ownerId);
  }

  sql.clearDomains.run(ownerId);
  const host = String(cfg.customDomain || '').toLowerCase();
  if (host) {
    if (!isHostname(host)) throw new HttpError(400, 'That web address does not look right. Example: shop.example.com');
    const current = sql.domainOwner.get(host);
    if (current && current.user_id !== ownerId) throw new HttpError(409, 'That web address belongs to another shop');
    sql.setDomain.run(host, ownerId);
  }
}

module.exports = function registerAccountRoutes(router) {
  router.add('GET', '/api/me', { auth: true }, ({ user, owner }) => ({ user: publicUser(user, owner) }));

  router.add('PATCH', '/api/me', { auth: true, ownerOnly: true }, ({ user, body }) => {
    refuseDemoWrites(user);

    const changes = {};
    if ('shop' in body) {
      changes.shop = cleanText(body.shop, 80);
      if (!changes.shop) throw new HttpError(400, 'Shop name cannot be empty');
    }
    if ('name' in body) {
      changes.name = cleanText(body.name, 80);
      if (!changes.name) throw new HttpError(400, 'Name cannot be empty');
    }
    if ('category' in body) {
      if (!BUSINESS_TYPES.includes(body.category)) throw new HttpError(400, 'Unknown business type');
      changes.category = body.category;
    }
    if ('sub' in body) changes.sub = cleanText(body.sub, 60);
    if ('city' in body) changes.city = cleanText(body.city, 60);
    if ('bizPhone' in body) changes.biz_phone = cleanText(body.bizPhone, 20);
    if ('onboarding' in body) {
      if (!['pending', 'done'].includes(body.onboarding)) throw new HttpError(400, 'Bad value');
      changes.onboarding = body.onboarding;
    }

    const columns = Object.keys(changes);
    if (columns.length) {
      // Column names come from the fixed list above, never from the request.
      db.prepare(`UPDATE users SET ${columns.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).run(
        ...columns.map((c) => changes[c]),
        user.id,
      );
    }
    return { user: publicUser(sql.userById.get(user.id)) };
  });

  /** Everything the dashboard needs to start. */
  router.add('GET', '/api/state', { auth: true }, ({ user, owner }) => {
    const allowed = READ_ACCESS[user.role] || [];
    const collections = {};
    for (const kind of KINDS) collections[kind] = allowed.includes(kind) ? listRecords(owner.id, kind) : [];

    const status = integrationStatus();
    return {
      user: publicUser(user, owner),
      collections,
      settings: user.role === 'owner' ? JSON.parse(owner.settings) : {},
      stats: computeStats(owner.id),
      integrations: status,
    };
  });

  router.add('PUT', '/api/collections/:kind', { auth: true }, ({ user, owner, params, body }) => {
    const kind = params.kind;
    if (!KINDS.includes(kind)) throw new HttpError(404, 'Unknown collection');
    if (!(WRITE_ACCESS[user.role] || []).includes(kind)) throw new HttpError(403, 'You cannot change this');
    refuseDemoWrites(owner);

    const items = Array.isArray(body.items) ? body.items : null;
    if (!items || items.length > 2000) throw new HttpError(400, 'Bad list');
    for (const item of items) {
      const valid =
        item &&
        typeof item === 'object' &&
        item.id != null &&
        String(item.id).length <= 40 &&
        JSON.stringify(item).length <= 60000;
      if (!valid) throw new HttpError(400, 'One entry is not valid');
    }

    syncRecords(owner.id, kind, items, Array.isArray(body.known) ? body.known.slice(0, 5000) : []);
    return { ok: true, items: listRecords(owner.id, kind) };
  });

  router.add('PUT', '/api/settings', { auth: true, ownerOnly: true }, ({ owner, body }) => {
    refuseDemoWrites(owner);
    const valid = body && typeof body === 'object' && !Array.isArray(body) && JSON.stringify(body).length <= 100000;
    if (!valid) throw new HttpError(400, 'Bad settings');

    syncExternalAccounts(owner.id, body.cfg || {});
    sql.setSettings.run(JSON.stringify(body), owner.id);
    return { ok: true };
  });

  /* ---------- helpers (Settings > Users) ---------- */

  const describeHelper = (row) => ({ id: row.id, name: row.name, email: row.email, role: row.role });

  router.add('GET', '/api/team', { auth: true, ownerOnly: true }, ({ owner }) => ({
    helpers: sql.helpers.all(owner.id).map(describeHelper),
  }));

  router.add('POST', '/api/team', { auth: true, ownerOnly: true }, ({ owner, body }) => {
    refuseDemoWrites(owner);
    const name = cleanText(body.name, 80);
    const address = cleanText(body.email, 120).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    if (!name) throw new HttpError(400, "Add the helper's name");
    if (!isValidEmail(address)) throw new HttpError(400, 'That email does not look right');
    if (!HELPER_ROLES.includes(body.role)) throw new HttpError(400, 'Pick what the helper can do');
    if (password.length < 8) throw new HttpError(400, 'Use at least 8 characters for the password');
    if (sql.userByEmail.get(address)) throw new HttpError(409, 'An account with this email already exists');
    if (sql.helpers.all(owner.id).length >= 10) throw new HttpError(400, 'You can add up to 10 helpers');

    const { salt, hash } = hashPassword(password);
    const id = 'u_' + crypto.randomBytes(8).toString('hex');
    // A helper never gets a shop of their own: they borrow the owner's handle and shop name.
    sql.insertUser.run(
      id,
      address,
      name,
      owner.shop,
      `${owner.handle}-${id.slice(2, 8)}`,
      salt,
      hash,
      0,
      'done',
      1,
      owner.id,
      body.role,
      Date.now(),
    );
    return { helper: describeHelper(sql.userById.get(id)) };
  });

  router.add('DELETE', '/api/team/:id', { auth: true, ownerOnly: true }, ({ owner, params }) => {
    refuseDemoWrites(owner);
    sql.deleteUserSessions.run(params.id);
    sql.deleteUser.run(params.id, owner.id);
    return { ok: true };
  });

  /** Where the dashboard should point buyers and webhooks. */
  router.add('GET', '/api/addresses', { auth: true }, ({ req, owner }) => {
    const base = config.appUrl || `http://${req.headers.host}`;
    return {
      shop: `${base}/s/${owner.handle}`,
      razorpayWebhook: `${base}/api/webhooks/razorpay`,
      whatsappWebhook: `${base}/api/webhooks/whatsapp`,
      instagramWebhook: `${base}/api/webhooks/instagram`,
    };
  });
};
