/**
 * Sign-up, login, logout, password reset and email verification.
 */
'use strict';

const crypto = require('node:crypto');
const { sql } = require('../db');
const {
  hashPassword,
  passwordMatches,
  createSession,
  sessionCookie,
  endSession,
  createEmailToken,
  consumeEmailToken,
  publicUser,
  isValidHandle,
  isValidEmail,
  passwordProblem,
  cleanText,
} = require('../auth');
const { HttpError, clientIp, isRateLimited } = require('../http');
const { reply } = require('../router');
const email = require('../services/email');
const google = require('../services/google');
const { config } = require('../config');

/** Log the person in: reply with their profile and the session cookie. */
function loggedIn(status, user, days) {
  const owner = user.owner_id ? sql.userById.get(user.owner_id) : user;
  return reply(
    status,
    { user: publicUser(user, owner) },
    { 'Set-Cookie': sessionCookie(createSession(user.id, days), days) },
  );
}

module.exports = function registerAuthRoutes(router) {
  router.add('GET', '/api/handle', {}, ({ url }) => {
    const handle = (url.searchParams.get('h') || '').toLowerCase();
    return { ok: isValidHandle(handle) && !sql.userByHandle.get(handle) };
  });

  router.add('POST', '/api/auth/signup', {}, ({ req, body }) => {
    const name = cleanText(body.name, 80);
    const shop = cleanText(body.shop, 80);
    const handle = cleanText(body.handle, 30).toLowerCase();
    const address = cleanText(body.email, 120).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';

    if (!name) throw new HttpError(400, 'Add your name');
    if (!shop) throw new HttpError(400, 'Add your shop name');
    if (!isValidHandle(handle)) throw new HttpError(400, 'Pick a link with 2 to 30 letters, numbers or dashes');
    if (!isValidEmail(address)) throw new HttpError(400, 'That email does not look right');
    const weak = passwordProblem(password, address);
    if (weak) throw new HttpError(400, weak);
    if (body.acceptTerms !== true) throw new HttpError(400, 'Accept the terms and privacy policy to open a shop');
    if (sql.userByEmail.get(address)) throw new HttpError(409, 'An account with this email already exists');
    if (sql.userByHandle.get(handle)) throw new HttpError(409, 'That shop link is taken');

    // Only real attempts count: a typo in the form does not use up the hourly allowance.
    if (isRateLimited(`signup:${clientIp(req)}`, 10, 60 * 60 * 1000))
      throw new HttpError(429, 'Too many sign-ups from this address. Try again later.');

    const { salt, hash } = hashPassword(password);
    const id = 'u_' + crypto.randomBytes(8).toString('hex');
    // Without an email service there is no way to confirm an address, so it counts as confirmed.
    // Only while developing without an email service does an address count as confirmed automatically.
    const verified = email.isConfigured() || config.isProduction ? 0 : 1;
    sql.insertUser.run(id, address, name, shop, handle, salt, hash, 0, 'pending', verified, null, 'owner', Date.now());
    sql.setTermsAccepted.run(Date.now(), id);

    const user = sql.userById.get(id);
    if (!verified) email.sendVerification(user, createEmailToken(id, 'verify', 48));
    return loggedIn(201, user, 30);
  });

  router.add('POST', '/api/auth/login', {}, ({ req, body }) => {
    const address = cleanText(body.email, 120).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    if (isRateLimited(`login:${clientIp(req)}:${address}`, 10, 10 * 60 * 1000))
      throw new HttpError(429, 'Too many tries. Wait a few minutes.');

    const user = sql.userByEmail.get(address);
    if (!user || !passwordMatches(password, user.pw_salt, user.pw_hash))
      throw new HttpError(401, 'That email and password do not match');
    return loggedIn(200, user, body.remember ? 30 : 1);
  });

  router.add('POST', '/api/auth/logout', {}, ({ req }) => {
    endSession(req);
    return reply(200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) });
  });

  /* ---- Google sign-in ---- */

  /** What the sign-in page needs to know before anyone logs in. */
  router.add('GET', '/api/public-config', {}, () => ({ googleClientId: config.google.clientId || null }));

  router.add('POST', '/api/auth/google', {}, async ({ req, body }) => {
    if (!config.google.clientId) throw new HttpError(503, 'Google sign-in is not set up on this server');
    if (isRateLimited(`google:${clientIp(req)}`, 20, 10 * 60 * 1000))
      throw new HttpError(429, 'Too many tries. Wait a few minutes.');

    let profile;
    try {
      profile = await google.verifyIdToken(String(body.credential || ''));
    } catch (error) {
      throw new HttpError(401, 'Google could not confirm who you are. Try again.');
    }

    const existing = sql.userByEmail.get(profile.email);
    if (existing) {
      if (!existing.email_verified) sql.setVerified.run(existing.id);
      return loggedIn(200, existing, 30);
    }

    // First time: make a shop. The seller can rename it during setup.
    const id = 'u_' + crypto.randomBytes(8).toString('hex');
    const { salt, hash } = hashPassword(crypto.randomBytes(24).toString('hex')); // no password: they sign in with Google
    sql.insertUser.run(
      id,
      profile.email,
      profile.name,
      `${profile.name.split(' ')[0]}'s shop`,
      google.freeHandle(profile.email),
      salt,
      hash,
      0,
      'pending',
      1,
      null,
      'owner',
      Date.now(),
    );
    return loggedIn(201, sql.userById.get(id), 30);
  });

  /* ---- password reset ---- */

  router.add('POST', '/api/auth/forgot', {}, ({ req, body }) => {
    const address = cleanText(body.email, 120).toLowerCase();
    if (isRateLimited(`forgot:${clientIp(req)}`, 5, 60 * 60 * 1000))
      throw new HttpError(429, 'Too many tries. Try again later.');
    const user = sql.userByEmail.get(address);
    // The reply is the same whether or not the address exists, so nobody can probe for accounts.
    if (user && !user.demo) email.sendPasswordReset(user, createEmailToken(user.id, 'reset', 1));
    return { ok: true };
  });

  router.add('POST', '/api/auth/reset', {}, ({ body }) => {
    const userId = consumeEmailToken(body.token, 'reset');
    if (!userId) throw new HttpError(400, 'This reset link has expired. Ask for a new one.');
    const password = typeof body.password === 'string' ? body.password : '';
    const weak = passwordProblem(password);
    if (weak) throw new HttpError(400, weak);

    const { salt, hash } = hashPassword(password);
    sql.setPassword.run(salt, hash, userId);
    sql.deleteUserSessions.run(userId); // log out everywhere
    return { ok: true };
  });

  /* ---- email verification ---- */

  router.add('POST', '/api/auth/verify', {}, ({ body }) => {
    const userId = consumeEmailToken(body.token, 'verify');
    if (!userId) throw new HttpError(400, 'This confirmation link has expired. Log in and ask for a new one.');
    sql.setVerified.run(userId);
    return { ok: true };
  });

  router.add('POST', '/api/auth/resend-verification', { auth: true }, ({ req, user }) => {
    if (user.email_verified) return { ok: true };
    if (!email.isConfigured())
      throw new HttpError(503, 'Email is not set up on this server yet, so the link cannot be sent.');
    if (isRateLimited(`resend:${user.id}`, 3, 60 * 60 * 1000))
      throw new HttpError(429, 'Too many emails. Try again in an hour.');
    email.sendVerification(user, createEmailToken(user.id, 'verify', 48));
    return { ok: true, emailConfigured: email.isConfigured() };
  });
};
