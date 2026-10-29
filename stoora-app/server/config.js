/**
 * Configuration. Every setting comes from the environment or the `.env` file
 * (copy `.env.example` to `.env` and fill in what you need).
 *
 * Nothing here is secret by itself: the secrets live in `.env`, which is never
 * served to browsers and never committed (see `.gitignore`).
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

/** Read KEY=value lines from `.env` into process.env (real environment variables win). */
function loadEnvFile() {
  let text = '';
  try {
    text = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  } catch (_) {
    return; // no .env file: that is fine
  }
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadEnvFile();

/** First variable that is set, so a setting can have a second, friendlier name. */
const env = (name, fallback = '', ...aliases) =>
  [name, ...aliases].map((n) => process.env[n]).find(Boolean) || fallback;

const config = {
  root: ROOT,
  publicDir: path.join(ROOT, 'public'),

  isProduction: env('NODE_ENV') === 'production',
  port: Number(env('PORT', '3000')),
  dbPath: env('DB_PATH', path.join(ROOT, 'data', 'stoora.db')),
  /** Public address of the site, e.g. https://stoora.in. Used in emails and webhook addresses. */
  appUrl: env('APP_URL', '', 'APP_BASE_URL').replace(/\/$/, ''),
  /** Set COOKIE_SECURE=1 when the site is served over https. */
  secureCookie: env('COOKIE_SECURE') === '1',
  /** Set TRUST_PROXY=1 when running behind a reverse proxy (nginx, a cloud load balancer). */
  trustProxy: env('TRUST_PROXY') === '1',

  razorpay: {
    keyId: env('RAZORPAY_KEY_ID'),
    keySecret: env('RAZORPAY_KEY_SECRET'),
    webhookSecret: env('RAZORPAY_WEBHOOK_SECRET'),
    /** Set RAZORPAY_ROUTE=1 if Razorpay Route is enabled on your account (pays each seller directly). */
    route: env('RAZORPAY_ROUTE') === '1',
    /**
     * Without Route, a Razorpay payment lands in the platform's own account, not the seller's. Only set
     * RAZORPAY_COLLECT_TO_PLATFORM=1 if that is the business model you have agreed and are set up for
     * (you collect for sellers and pay them out yourself). Left off, sellers cannot take online payments
     * until Route is on and their linked account is activated.
     */
    platformCollects: env('RAZORPAY_COLLECT_TO_PLATFORM') === '1',
    /** Minutes an online-payment order may wait for payment before it is cancelled and its stock released. */
    holdMinutes: Math.max(10, Math.min(1440, Number(env('ORDER_PAYMENT_HOLD_MINUTES', '30')) || 30)),
  },

  email: {
    /** "resend" or "smtp". Leave empty to run without email. */
    provider: env('EMAIL_PROVIDER'),
    from: env('EMAIL_FROM', '', 'EMAIL_FROM_ADDRESS'),
    resendApiKey: env('RESEND_API_KEY', '', 'EMAIL_PROVIDER_API_KEY'),
    smtp: {
      host: env('SMTP_HOST'),
      port: Number(env('SMTP_PORT', '465')),
      user: env('SMTP_USER'),
      password: env('SMTP_PASSWORD'),
    },
  },

  /**
   * Premium storefront templates. Nothing is charged until the operator sets a price AND switches purchases on.
   * PREMIUM_GRANT_EMAILS lists accounts (staff, testers) that get every premium template without paying.
   */
  premium: {
    priceInr: Math.floor(Number(env('PREMIUM_PRICE_INR', '0'))) || 0,
    enabled: env('PREMIUM_PURCHASES_ENABLED') === '1',
    terms: env('PREMIUM_TERMS'),
    grantEmails: env('PREMIUM_GRANT_EMAILS')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  },

  ai: {
    apiKey: env('ANTHROPIC_API_KEY', '', 'AI_PROVIDER_API_KEY'),
    model: env('AI_MODEL', 'claude-sonnet-5-5'),
  },

  google: {
    /** Google Cloud Console > APIs & Services > Credentials > OAuth client ID (Web). Leave empty to hide the Google button. */
    clientId: env('GOOGLE_CLIENT_ID'),
  },

  meta: {
    /** From your Meta app: App settings > Basic > App secret. Used to check webhook signatures. */
    appSecret: env('META_APP_SECRET'),
    /** Any text you choose. Paste the same text into Meta's webhook setup. */
    verifyToken: env('META_VERIFY_TOKEN'),
    graphVersion: env('META_GRAPH_VERSION', 'v21.0'),
    whatsappToken: env('WHATSAPP_TOKEN'),
    instagramToken: env('INSTAGRAM_TOKEN'),
  },
};

/** What is switched on right now. The dashboard shows this on the Apps and Payments pages. */
function integrationStatus() {
  const { razorpay, email, ai, meta, google } = config;
  return {
    razorpay: {
      configured: Boolean(razorpay.keyId && razorpay.keySecret),
      mode: razorpay.keyId.startsWith('rzp_live') ? 'live' : razorpay.keyId ? 'test' : null,
      webhook: Boolean(razorpay.webhookSecret),
      route: razorpay.route,
      platformCollects: razorpay.platformCollects,
    },
    email: {
      configured: Boolean(
        (email.provider === 'resend' && email.resendApiKey && email.from) ||
          (email.provider === 'smtp' && email.smtp.host && email.smtp.user && email.from),
      ),
    },
    ai: { configured: Boolean(ai.apiKey), model: ai.model },
    google: { configured: Boolean(google.clientId) },
    whatsapp: { configured: Boolean(meta.whatsappToken && meta.appSecret && meta.verifyToken) },
    instagram: { configured: Boolean(meta.instagramToken && meta.appSecret && meta.verifyToken) },
  };
}

module.exports = { config, integrationStatus };
