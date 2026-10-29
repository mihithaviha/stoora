/**
 * Database migrations. Each one runs once, in order, and the number of the last one that ran is kept
 * in the database (PRAGMA user_version). To change the database, add a new entry at the end:
 * never edit one that has already shipped.
 */
'use strict';

const hasColumn = (db, table, column) =>
  db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some((row) => row.name === column);

/** ALTER TABLE ... ADD COLUMN, skipped when the column is already there. */
function addColumn(db, table, column, definition) {
  if (!hasColumn(db, table, column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

const MIGRATIONS = [
  {
    version: 1,
    name: 'first schema: users, sessions, shop records, visits, payments, email links, channels, domains',
    up(db) {
      db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    shop TEXT NOT NULL,
    handle TEXT UNIQUE NOT NULL,
    pw_salt TEXT NOT NULL,
    pw_hash TEXT NOT NULL,
    demo INTEGER NOT NULL DEFAULT 0,
    category TEXT,
    sub TEXT,
    city TEXT,
    biz_phone TEXT,
    onboarding TEXT NOT NULL DEFAULT 'pending',
    settings TEXT NOT NULL DEFAULT '{}',
    email_verified INTEGER NOT NULL DEFAULT 0,
    owner_id TEXT,
    role TEXT NOT NULL DEFAULT 'owner',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS records (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    id TEXT NOT NULL,
    pos INTEGER NOT NULL,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, kind, id)
  );

  CREATE TABLE IF NOT EXISTS visits (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day TEXT NOT NULL,
    n INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL,
    rzp_order_id TEXT UNIQUE,
    rzp_payment_id TEXT,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  -- One-time links sent by email: password reset and email verification.
  CREATE TABLE IF NOT EXISTS email_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
  );

  -- Which seller owns a WhatsApp number or Instagram account (set in Settings > Apps).
  CREATE TABLE IF NOT EXISTS channel_accounts (
    channel TEXT NOT NULL,
    external_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (channel, external_id)
  );

  -- A seller's own web address (Settings > Domains).
  CREATE TABLE IF NOT EXISTS domains (
    host TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
  );
`);
    },
  },
  {
    version: 2,
    name: 'payments: method, failure reason, refunds, buyer contact; indexes',
    up(db) {
      addColumn(db, 'payments', 'method', 'TEXT');
      addColumn(db, 'payments', 'failure_reason', 'TEXT');
      addColumn(db, 'payments', 'refunded_amount', 'INTEGER NOT NULL DEFAULT 0');
      addColumn(db, 'payments', 'refund_id', 'TEXT');
      addColumn(db, 'payments', 'contact', 'TEXT');
      addColumn(db, 'payments', 'updated_at', 'INTEGER');
      db.exec(`
        CREATE INDEX IF NOT EXISTS payments_by_user ON payments (user_id, id DESC);
        CREATE INDEX IF NOT EXISTS payments_by_payment_id ON payments (rzp_payment_id);
        CREATE INDEX IF NOT EXISTS sessions_by_user ON sessions (user_id);
        CREATE INDEX IF NOT EXISTS records_by_kind ON records (user_id, kind, pos);
      `);
    },
  },
  {
    version: 3,
    name: 'seller payout accounts (Razorpay Route linked accounts)',
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS payout_accounts (
          user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          razorpay_account_id TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL,
          checked_at INTEGER NOT NULL
        );
      `);
    },
  },
  {
    version: 4,
    name: 'storefront builder: draft and published configuration per seller',
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS storefronts (
          user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          draft TEXT NOT NULL,
          published TEXT,
          version INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          published_at INTEGER
        );
      `);
    },
  },
  {
    version: 5,
    name: 'premium storefront templates: purchases and entitlements',
    up(db) {
      db.exec(`
        -- One row per attempt to buy a template (kept apart from buyers' orders and payments).
        CREATE TABLE IF NOT EXISTS template_purchases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          template_id TEXT NOT NULL,
          amount INTEGER NOT NULL,
          currency TEXT NOT NULL,
          status TEXT NOT NULL,
          rzp_order_id TEXT UNIQUE,
          rzp_payment_id TEXT,
          created_at INTEGER NOT NULL,
          paid_at INTEGER
        );
        CREATE INDEX IF NOT EXISTS template_purchases_by_user ON template_purchases (user_id, template_id, status);

        -- Who may use which premium template. One row per seller and template, so a repeat can never duplicate it.
        CREATE TABLE IF NOT EXISTS template_entitlements (
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          template_id TEXT NOT NULL,
          source TEXT NOT NULL,
          payment_ref TEXT,
          amount INTEGER NOT NULL DEFAULT 0,
          currency TEXT NOT NULL DEFAULT 'INR',
          granted_at INTEGER NOT NULL,
          PRIMARY KEY (user_id, template_id)
        );
      `);
    },
  },
  {
    version: 6,
    name: 'record when a seller accepted the terms and privacy policy',
    up(db) {
      db.exec('ALTER TABLE users ADD COLUMN terms_accepted_at INTEGER');
    },
  },
];

/** Run every migration that has not run yet. Returns the schema version the database is now at. */
function migrate(db) {
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const current = db.prepare('PRAGMA user_version').get().user_version;
  for (const migration of MIGRATIONS.filter((item) => item.version > current)) {
    db.exec('BEGIN');
    try {
      migration.up(db);
      db.exec(`PRAGMA user_version = ${migration.version}`);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw new Error(`Migration ${migration.version} failed: ${error.message}`);
    }
  }
  return MIGRATIONS[MIGRATIONS.length - 1].version;
}

module.exports = { migrate, MIGRATIONS };
