/**
 * Database: one SQLite file. Shop data (products, orders, chats ...) is stored
 * as JSON rows in a single `records` table, keyed by owner, kind and id.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { config } = require('./config');
const { migrate } = require('./migrations');

/** The kinds of shop data a seller owns. */
const KINDS = ['products', 'services', 'orders', 'bookings', 'customers', 'chats', 'offers', 'reviews'];

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
const db = new DatabaseSync(config.dbPath);

const schemaVersion = migrate(db);

const sql = {
  userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  userById: db.prepare('SELECT * FROM users WHERE id = ?'),
  userByHandle: db.prepare('SELECT * FROM users WHERE handle = ?'),
  helpers: db.prepare('SELECT * FROM users WHERE owner_id = ? ORDER BY created_at'),
  insertUser: db.prepare(`
    INSERT INTO users (id, email, name, shop, handle, pw_salt, pw_hash, demo, onboarding,
                       email_verified, owner_id, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  deleteUser: db.prepare('DELETE FROM users WHERE id = ? AND owner_id = ?'),
  setPassword: db.prepare('UPDATE users SET pw_salt = ?, pw_hash = ? WHERE id = ?'),
  setVerified: db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?'),
  setTermsAccepted: db.prepare('UPDATE users SET terms_accepted_at = ? WHERE id = ?'),
  setSettings: db.prepare('UPDATE users SET settings = ? WHERE id = ?'),

  insertSession: db.prepare('INSERT INTO sessions VALUES (?, ?, ?)'),
  sessionByHash: db.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?'),
  deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
  deleteUserSessions: db.prepare('DELETE FROM sessions WHERE user_id = ?'),

  records: db.prepare('SELECT id, data FROM records WHERE user_id = ? AND kind = ? ORDER BY pos'),
  record: db.prepare('SELECT data FROM records WHERE user_id = ? AND kind = ? AND id = ?'),
  upsertRecord: db.prepare(`
    INSERT INTO records (user_id, kind, id, pos, data, updated_at) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (user_id, kind, id)
    DO UPDATE SET pos = excluded.pos, data = excluded.data, updated_at = excluded.updated_at`),
  deleteRecord: db.prepare('DELETE FROM records WHERE user_id = ? AND kind = ? AND id = ?'),

  countVisit: db.prepare(`
    INSERT INTO visits (user_id, day, n) VALUES (?, ?, 1)
    ON CONFLICT (user_id, day) DO UPDATE SET n = n + 1`),
  visitsSince: db.prepare('SELECT day, n FROM visits WHERE user_id = ? AND day >= ? ORDER BY day'),

  insertPayment: db.prepare(
    'INSERT INTO payments (user_id, order_id, rzp_order_id, amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ),
  paymentByRzpOrder: db.prepare('SELECT * FROM payments WHERE rzp_order_id = ?'),
  paymentByRzpPayment: db.prepare('SELECT * FROM payments WHERE rzp_payment_id = ?'),
  paymentForOrder: db.prepare('SELECT * FROM payments WHERE user_id = ? AND order_id = ? ORDER BY id DESC LIMIT 1'),
  paymentsForOrder: db.prepare('SELECT * FROM payments WHERE user_id = ? AND order_id = ? ORDER BY id DESC'),
  paymentsForUser: db.prepare('SELECT * FROM payments WHERE user_id = ? ORDER BY id DESC LIMIT 500'),
  updatePaymentDetails: db.prepare(
    'UPDATE payments SET status = ?, rzp_payment_id = COALESCE(?, rzp_payment_id), method = COALESCE(?, method), failure_reason = ?, contact = COALESCE(?, contact), updated_at = ? WHERE id = ?',
  ),
  recordRefund: db.prepare(
    'UPDATE payments SET status = ?, refund_id = ?, refunded_amount = ?, updated_at = ? WHERE id = ?',
  ),
  payoutAccount: db.prepare('SELECT * FROM payout_accounts WHERE user_id = ?'),
  savePayoutAccount: db.prepare('INSERT OR REPLACE INTO payout_accounts VALUES (?, ?, ?, ?)'),
  deletePayoutAccount: db.prepare('DELETE FROM payout_accounts WHERE user_id = ?'),
  storefront: db.prepare('SELECT * FROM storefronts WHERE user_id = ?'),
  insertStorefront: db.prepare('INSERT INTO storefronts (user_id, draft, created_at, updated_at) VALUES (?, ?, ?, ?)'),
  updateStorefrontDraft: db.prepare('UPDATE storefronts SET draft = ?, updated_at = ? WHERE user_id = ?'),
  publishStorefront: db.prepare(
    'UPDATE storefronts SET published = ?, published_at = ?, version = version + 1 WHERE user_id = ?',
  ),
  unpublishStorefront: db.prepare('UPDATE storefronts SET published = NULL WHERE user_id = ?'),
  entitlement: db.prepare('SELECT * FROM template_entitlements WHERE user_id = ? AND template_id = ?'),
  grantEntitlement: db.prepare(
    'INSERT OR IGNORE INTO template_entitlements (user_id, template_id, source, payment_ref, amount, currency, granted_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ),
  openPurchase: db.prepare(
    "SELECT * FROM template_purchases WHERE user_id = ? AND template_id = ? AND status = 'created' ORDER BY id DESC LIMIT 1",
  ),
  insertPurchase: db.prepare(
    'INSERT INTO template_purchases (user_id, template_id, amount, currency, status, rzp_order_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ),
  purchaseByRzpOrder: db.prepare('SELECT * FROM template_purchases WHERE rzp_order_id = ?'),
  markPurchasePaid: db.prepare("UPDATE template_purchases SET status = 'paid', rzp_payment_id = ?, paid_at = ? WHERE id = ?"),
  payoutAccountOwner: db.prepare('SELECT user_id FROM payout_accounts WHERE razorpay_account_id = ?'),
  updatePayment: db.prepare('UPDATE payments SET status = ?, rzp_payment_id = ? WHERE id = ?'),
  recentPayments: db.prepare(`
    SELECT order_id, rzp_order_id, rzp_payment_id, amount, status, created_at, method
    FROM payments WHERE user_id = ? ORDER BY id DESC LIMIT 50`),

  insertEmailToken: db.prepare('INSERT INTO email_tokens VALUES (?, ?, ?, ?)'),
  emailToken: db.prepare('SELECT * FROM email_tokens WHERE token_hash = ? AND purpose = ?'),
  deleteEmailToken: db.prepare('DELETE FROM email_tokens WHERE token_hash = ?'),

  webhookSeen: db.prepare('SELECT 1 FROM webhook_events WHERE id = ?'),
  webhookRemember: db.prepare('INSERT INTO webhook_events VALUES (?, ?)'),

  channelOwner: db.prepare('SELECT user_id FROM channel_accounts WHERE channel = ? AND external_id = ?'),
  clearChannels: db.prepare('DELETE FROM channel_accounts WHERE user_id = ?'),
  setChannel: db.prepare('INSERT OR REPLACE INTO channel_accounts VALUES (?, ?, ?)'),

  domainOwner: db.prepare('SELECT user_id FROM domains WHERE host = ?'),
  clearDomains: db.prepare('DELETE FROM domains WHERE user_id = ?'),
  setDomain: db.prepare('INSERT OR REPLACE INTO domains VALUES (?, ?)'),
};

/** Run `work` inside a transaction. */
function transaction(work) {
  db.exec('BEGIN');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/** All rows of one kind for a seller, in saved order. */
function listRecords(ownerId, kind) {
  return sql.records.all(ownerId, kind).map((row) => JSON.parse(row.data));
}

function getRecord(ownerId, kind, id) {
  const row = sql.record.get(ownerId, kind, String(id));
  return row ? JSON.parse(row.data) : null;
}

/** Insert or replace one row. `pos` decides the order (lower comes first). */
function saveRecord(ownerId, kind, item, pos = 0) {
  sql.upsertRecord.run(ownerId, kind, String(item.id), pos, JSON.stringify(item), Date.now());
}

/**
 * Save the list the browser sends. Rows the browser knew about but no longer sends
 * are deleted. Rows it never saw (for example an order a buyer just placed) are kept.
 */
function syncRecords(ownerId, kind, items, knownIds = []) {
  transaction(() => {
    const keep = new Set(items.map((item) => String(item.id)));
    items.forEach((item, index) => saveRecord(ownerId, kind, item, index));
    for (const id of knownIds) {
      if (!keep.has(String(id))) sql.deleteRecord.run(ownerId, kind, String(id));
    }
  });
}

module.exports = { db, sql, schemaVersion, KINDS, transaction, listRecords, getRecord, saveRecord, syncRecords };
