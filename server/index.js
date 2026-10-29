/**
 * Stoora server: serves the website and the JSON API.
 *
 *   npm start        (reads settings from .env; see .env.example)
 *
 * Needs Node 22.5 or newer. No npm packages.
 */
'use strict';

// Stoora uses Node's built-in SQLite, which arrived in Node 22.5. Say so plainly instead of crashing later.
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 5)) {
  console.error(`[stoora] This needs Node 22.5 or newer. You have Node ${process.versions.node}.
  Install the current LTS from https://nodejs.org, open a new terminal, and run "npm start" again.`);
  process.exit(1);
}

const http = require('node:http');
const { config, integrationStatus } = require('./config');
const { Router } = require('./router');
const { serveStatic, serveFile, sendJson, sendHtml, cleanAddress } = require('./http');
const journal = require('./journal/render');
const { ensureDemoShop } = require('./demo');
const { uploadFile } = require('./storefront');
const { db, sql, schemaVersion } = require('./db');

const router = new Router();

/** Liveness: the process is up. */
router.add('GET', '/api/health', {}, () => ({ ok: true }));

/** Readiness: the database answers and is at the latest schema. Use this for the host's health check. */
router.add('GET', '/api/ready', {}, () => {
  db.prepare('SELECT 1').get();
  return { ok: true, schema: schemaVersion };
});

for (const name of ['auth', 'account', 'shop', 'payments', 'ai', 'analytics', 'storefront']) {
  require(`./routes/${name}`)(router);
}

ensureDemoShop();

/** One JSON line per request. Only the method, path (no query string), status and time: never bodies, cookies or tokens. */
function logRequest(req, res, startedAt, pathname) {
  if (pathname === '/api/health' || pathname === '/api/ready') return;
  res.on('finish', () => {
    const line = {
      t: new Date().toISOString(),
      method: req.method,
      path: pathname,
      status: res.statusCode,
      ms: Date.now() - startedAt,
    };
    if (config.isProduction || res.statusCode >= 500) console.log(JSON.stringify(line));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  logRequest(req, res, Date.now(), url.pathname);

  if (url.pathname.startsWith('/api/')) {
    const handled = await router.handle(req, res, url);
    if (!handled) sendJson(res, 404, { error: 'Not found' });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    return res.end();
  }

  // Pages have clean addresses: /dashboard, not /dashboard.html. The old address redirects to the new one.
  const clean = cleanAddress(url.pathname, url.search);
  if (clean) {
    res.writeHead(301, { Location: clean });
    return res.end();
  }

  // Images sellers uploaded for their storefront.
  if (url.pathname.startsWith('/uploads/')) {
    const file = uploadFile(url.pathname);
    if (!file) return sendJson(res, 404, { error: 'Not found' });
    return serveFile(res, file);
  }

  // The Journal: server-rendered pages with their own titles, descriptions and canonical addresses.
  const origin = config.appUrl || `http://${req.headers.host || 'localhost'}`;
  if (url.pathname === '/journal' || url.pathname === '/journal/')
    return sendHtml(
      res,
      200,
      journal.renderIndex({ origin, topic: url.searchParams.get('topic') || '', q: url.searchParams.get('q') || '' }),
    );
  const story = url.pathname.match(/^\/journal\/([a-z0-9-]+)\/?$/);
  if (story) {
    const html = journal.renderArticle({ origin, slug: story[1] });
    return sendHtml(res, html ? 200 : 404, html || journal.renderNotFound({ origin }));
  }
  if (url.pathname === '/sitemap.xml') {
    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    return res.end(journal.renderSitemap({ origin }));
  }

  // A seller's own web address shows their shop at "/".
  const host = String(req.headers.host || '')
    .split(':')[0]
    .toLowerCase();
  if (url.pathname === '/' && sql.domainOwner.get(host)) return serveStatic(req, res, '/s/shop');

  // A shop address nobody owns is a real 404 (the page still loads so it can say so kindly).
  const shopPage = url.pathname.match(/^\/s\/([a-z0-9-]+)\/?$/);
  if (shopPage && !sql.userByHandle.get(shopPage[1])) return serveStatic(req, res, '/shop.html', 404);

  serveStatic(req, res, decodeURIComponent(url.pathname));
});

/** Finish open requests, then exit, when the host asks the server to stop (deploys, restarts). */
function shutDown(signal) {
  console.log(`[stoora] ${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

if (require.main === module) {
  // While developing, if the port is taken (usually an earlier copy still running), try the next few
  // instead of failing. In production a taken port stays an error, because the host expects that port.
  const firstPort = config.port;
  const lastPort = config.isProduction ? firstPort : firstPort + 10;

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && config.port < lastPort) {
      console.log(`[stoora] Port ${config.port} is busy (another copy may be running). Trying ${config.port + 1}...`);
      config.port += 1;
      return server.listen(config.port);
    }
    if (error.code === 'EADDRINUSE')
      console.error(`[stoora] Port ${config.port} is already in use. Stoora may already be running at http://localhost:${firstPort}.
  Stop the other copy, or start this one on another port:  PORT=3001 npm run dev`);
    else if (error.code === 'EACCES') console.error(`[stoora] Not allowed to use port ${config.port}. Pick another with PORT=3001.`);
    else console.error('[stoora] The server could not start:', error.message);
    process.exit(1);
  });
  server.on('listening', () => {
    const on = Object.entries(integrationStatus())
      .map(([name, status]) => `${name}: ${status.configured ? 'on' : 'off'}`)
      .join(', ');
    console.log(`Stoora is running at http://localhost:${config.port}`);
    // Online-payment orders nobody paid for are cancelled after a while, and their stock goes back.
    setInterval(() => require('./orders').expireAbandonedOrders(), 5 * 60 * 1000).unref();
    console.log(`Database: ${config.dbPath} (schema ${schemaVersion})`);
    console.log(`Integrations: ${on}`);
    if (config.isProduction && !config.appUrl)
      console.warn('[stoora] APP_URL is not set: emails and webhook addresses will use localhost.');
  });
  server.listen(config.port);
  process.on('SIGTERM', () => shutDown('SIGTERM'));
  process.on('SIGINT', () => shutDown('SIGINT'));
}

module.exports = { server };
