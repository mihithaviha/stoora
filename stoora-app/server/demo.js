/**
 * The sample shop for the demo login (demo@stoora.in / meera2026).
 * It is created once and is read-only, so visitors always see it the same way.
 */
'use strict';

const { sql, transaction, saveRecord, db, KINDS } = require('./db');
const { hashPassword } = require('./auth');
const buildSampleData = require('./seed');

const DEMO_EMAIL = 'demo@stoora.in';
const DEMO_PASSWORD = 'meera2026';

function ensureDemoShop() {
  if (sql.userByEmail.get(DEMO_EMAIL)) return;

  const { salt, hash } = hashPassword(DEMO_PASSWORD);
  const id = 'u_demo';
  const sample = buildSampleData();

  transaction(() => {
    sql.insertUser.run(
      id,
      DEMO_EMAIL,
      'Meera Iyer',
      'Meera Studio',
      'meera',
      salt,
      hash,
      1,
      'done',
      1,
      null,
      'owner',
      Date.now(),
    );
    db.prepare("UPDATE users SET category = 'retail', city = 'Bengaluru' WHERE id = ?").run(id);
    for (const kind of KINDS) {
      (sample[kind] || []).forEach((item, position) => saveRecord(id, kind, item, position));
    }
  });
}

module.exports = { ensureDemoShop, DEMO_EMAIL, DEMO_PASSWORD };
