/**
 * Small HTTP helpers: JSON replies, request bodies, cookies, rate limiting,
 * and static file serving.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { config } = require('./config');

/** Throw this from a route to reply with an error. */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Headers sent with every response. HSTS is added only when the site is served over https. */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
  ...(config.secureCookie ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}),
};

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...SECURITY_HEADERS,
    ...headers,
  });
  res.end(JSON.stringify(body));
}

/** Send a rendered HTML page. */
function sendHtml(res, status, html) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
    ...SECURITY_HEADERS,
  });
  res.end(html);
}

/** Read the whole request body as a Buffer (limit: 1 MB by default). */
function readRawBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new HttpError(413, 'That request is too large'));
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseJson(buffer) {
  if (!buffer.length) return {};
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch (_) {
    throw new HttpError(400, 'The request is not valid JSON');
  }
}

function parseCookies(req) {
  const jar = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name) jar[name] = rest.join('=');
  }
  return jar;
}

/** Block form posts from other websites: the Origin header must match our own host. */
function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch (_) {
    return false;
  }
}

/** The caller's IP address (uses X-Forwarded-For only when TRUST_PROXY=1). */
function clientIp(req) {
  if (config.trustProxy) {
    const forwarded = String(req.headers['x-forwarded-for'] || '')
      .split(',')[0]
      .trim();
    if (forwarded) return forwarded;
  }
  return req.socket.remoteAddress || 'unknown';
}

const attempts = new Map();

/** True when `key` has been used more than `max` times in the last `windowMs`. */
function isRateLimited(key, max, windowMs) {
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((time) => now - time < windowMs);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > max;
}

/** Forget all attempt counts (used by tests, so one group of checks cannot lock out the next). */
function resetRateLimits() {
  attempts.clear();
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.txt': 'text/plain',
};

/** The home page lives at "/". Every other page in /public is served at its name without ".html" (see pagePath). */
const PAGE_ALIASES = { '/': '/index.html' };

/** "/dashboard" -> "/dashboard.html" when such a page exists in /public; anything else is left as it is. */
function pagePath(pathname) {
  const match = pathname.match(/^\/([a-z0-9-]+)\/?$/);
  if (!match) return pathname;
  return fs.existsSync(path.join(config.publicDir, match[1] + '.html')) ? `/${match[1]}.html` : pathname;
}

/** "/dashboard.html?x=1" -> "/dashboard?x=1" (and "/index.html" -> "/"), or null when the address is already clean. */
function cleanAddress(pathname, search = '') {
  const match = pathname.match(/^\/([a-z0-9-]+)\.html$/);
  if (!match || !fs.existsSync(path.join(config.publicDir, pathname))) return null;
  return (match[1] === 'index' ? '/' : `/${match[1]}`) + search;
}

/** Serve a file from /public. Anything outside that folder is a 404. */
function serveStatic(req, res, pathname, status = 200) {
  let file = PAGE_ALIASES[pathname] || pagePath(pathname);
  if (/^\/s\/[a-z0-9-]+\/?$/.test(file)) file = '/shop.html';

  const resolved = path.join(config.publicDir, path.normalize(file));
  if (!resolved.startsWith(config.publicDir + path.sep)) {
    res.writeHead(404);
    return res.end('Not found');
  }

  fs.readFile(resolved, (error, data) => {
    if (error) {
      // A page address in the browser gets a real "not found" page; files and images get a short reply.
      const wantsPage = !path.extname(pathname) && String(req.headers.accept || '').includes('text/html');
      if (!wantsPage) {
        res.writeHead(404);
        return res.end('Not found');
      }
      return fs.readFile(path.join(config.publicDir, '404.html'), (_, page) => {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS });
        res.end(page || 'Not found');
      });
    }
    const ext = path.extname(resolved);
    const isCode = ['.html', '.js', '.css'].includes(ext);
    res.writeHead(status, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': isCode ? 'no-cache' : 'public, max-age=86400',
      ...SECURITY_HEADERS,
    });
    res.end(data);
  });
}

/** Serve one file by its full path (used for uploaded images, whose names are random and never change). */
function serveFile(res, file) {
  fs.readFile(file, (error, data) => {
    if (error) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      ...SECURITY_HEADERS,
    });
    res.end(data);
  });
}

module.exports = {
  HttpError,
  sendJson,
  sendHtml,
  readRawBody,
  parseJson,
  parseCookies,
  isSameOrigin,
  clientIp,
  isRateLimited,
  resetRateLimits,
  serveStatic,
  serveFile,
  cleanAddress,
};
