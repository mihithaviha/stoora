/**
 * Passwords, login sessions, and one-time email links.
 */
'use strict';

const crypto = require('node:crypto');
const { sql } = require('./db');
const { config } = require('./config');
const { parseCookies } = require('./http');

const DAY = 24 * 60 * 60 * 1000;
const COOKIE_NAME = 'stoora_sid';

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

/* ---------- passwords (scrypt, a random salt per user) ---------- */

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') };
}

function passwordMatches(password, salt, expectedHash) {
  const actual = Buffer.from(crypto.scryptSync(password, salt, 64).toString('hex'));
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

/* ---------- sessions (a random token in an HttpOnly cookie; only its hash is stored) ---------- */

function createSession(userId, days) {
  const token = crypto.randomBytes(32).toString('hex');
  sql.insertSession.run(sha256(token), userId, Date.now() + days * DAY);
  return token;
}

/** The Set-Cookie header value. Pass an empty token to clear the cookie. */
function sessionCookie(token, days) {
  const flags = ['Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (config.secureCookie) flags.push('Secure');
  flags.push(`Max-Age=${token ? days * 86400 : 0}`);
  return `${COOKIE_NAME}=${token}; ${flags.join('; ')}`;
}

/**
 * Who is calling? Returns { user, owner } or null.
 * `user` is the person logged in; `owner` is the shop owner whose data they see
 * (the same person, unless `user` is a helper).
 */
function currentSession(req) {
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token) return null;

  const session = sql.sessionByHash.get(sha256(token));
  if (!session) return null;
  if (session.expires_at < Date.now()) {
    sql.deleteSession.run(sha256(token));
    return null;
  }

  const user = sql.userById.get(session.user_id);
  if (!user) return null;
  const owner = user.owner_id ? sql.userById.get(user.owner_id) : user;
  return owner ? { user, owner } : null;
}

function endSession(req) {
  const token = parseCookies(req)[COOKIE_NAME];
  if (token) sql.deleteSession.run(sha256(token));
}

/* ---------- one-time email links ---------- */

/** Create a link token for `purpose` ("reset" or "verify"). Only its hash is stored. */
function createEmailToken(userId, purpose, hours) {
  const token = crypto.randomBytes(24).toString('hex');
  sql.insertEmailToken.run(sha256(token), userId, purpose, Date.now() + hours * 60 * 60 * 1000);
  return token;
}

/** Look up and delete a token. Returns the user id, or null if it is wrong or expired. */
function consumeEmailToken(token, purpose) {
  const row = sql.emailToken.get(sha256(String(token || '')), purpose);
  if (!row) return null;
  sql.deleteEmailToken.run(row.token_hash);
  return row.expires_at < Date.now() ? null : row.user_id;
}

/* ---------- what the browser may know about a user ---------- */

function publicUser(user, owner = user) {
  return {
    email: user.email,
    name: user.name,
    role: user.role,
    // Helpers see the shop they work for.
    shop: owner.shop,
    handle: owner.handle,
    demo: Boolean(owner.demo),
    category: owner.category,
    sub: owner.sub,
    city: owner.city,
    bizPhone: owner.biz_phone,
    onboarding: user.owner_id ? 'done' : user.onboarding,
    emailVerified: Boolean(user.email_verified),
  };
}

/* ---------- input checks ---------- */

const RESERVED_HANDLES = [
  'meera',
  'demo',
  'stoora',
  'admin',
  'shop',
  'help',
  'login',
  'signup',
  'api',
  's',
  'dashboard',
  'www',
  'app',
];

const isValidHandle = (handle) => /^[a-z0-9][a-z0-9-]{1,29}$/.test(handle) && !RESERVED_HANDLES.includes(handle);
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 120;

/** Why a password is not acceptable, or '' when it is fine. Used for sign-up and password reset. */
function passwordProblem(password, address = '') {
  if (typeof password !== 'string' || password.length < 8) return 'Use at least 8 characters for the password';
  if (password.length > 200) return 'That password is too long';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'Use a password with letters and at least one number';
  if (address && password.toLowerCase() === address.toLowerCase()) return 'The password cannot be your email address';
  return '';
}

/** A trimmed string no longer than `max`, or '' if the value is not text. */
const cleanText = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

module.exports = {
  sha256,
  hashPassword,
  passwordMatches,
  createSession,
  sessionCookie,
  currentSession,
  endSession,
  createEmailToken,
  consumeEmailToken,
  publicUser,
  isValidHandle,
  isValidEmail,
  passwordProblem,
  cleanText,
};
