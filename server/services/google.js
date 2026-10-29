/**
 * Sign in with Google. The browser gets an ID token from Google; the server asks Google
 * whether that token is real and was made for this app (GOOGLE_CLIENT_ID in `.env`).
 */
'use strict';

const { config } = require('../config');
const { sql } = require('../db');
const { isValidHandle } = require('../auth');

/** Ask Google to check the token. Returns { email, name } or throws. */
async function verifyIdToken(idToken) {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('Google rejected the token');
  if (data.aud !== config.google.clientId) throw new Error('The token is for another app');
  if (data.email_verified !== 'true' && data.email_verified !== true)
    throw new Error('The Google email is not verified');
  return { email: String(data.email).toLowerCase(), name: String(data.name || data.email.split('@')[0]).slice(0, 80) };
}

/** A shop link nobody has yet, made from the start of the email address. */
function freeHandle(email) {
  const base =
    email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 22) || 'shop';
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${Math.floor(Math.random() * 9000 + 1000)}`;
    if (isValidHandle(candidate) && !sql.userByHandle.get(candidate)) return candidate;
  }
  return `shop-${Date.now().toString(36)}`;
}

module.exports = { verifyIdToken, freeHandle };
