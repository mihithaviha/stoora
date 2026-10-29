/**
 * Loads the signed-in shop from the server and keeps the screen and the database in step.
 * Loaded last by dashboard.html and dashboard-phone.html.
 *
 * The sample shop is read-only on the server, so its changes stay on screen only.
 */

window.USER = null;

/** Shop data the dashboard edits and saves. (Reviews are written by buyers, so they are not saved from here.) */
const SYNCED_KINDS = ['products', 'services', 'orders', 'bookings', 'customers', 'offers'];
const SYNC = { snapshot: {}, known: {}, settings: '', failing: false, busy: false };

/* ---------- talking to the server ---------- */

async function dapi(method, path, body) {
  const response = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  let json = null;
  try {
    json = await response.json();
  } catch (_) {
    /* no JSON body */
  }
  if (response.status === 401) {
    location.replace('/#login');
    const error = new Error('login');
    error.status = 401;
    throw error;
  }
  if (!response.ok) {
    const error = new Error((json && json.error) || 'Something went wrong');
    error.status = response.status;
    throw error;
  }
  return json;
}

/* ---------- dates ---------- */

function labelOf(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = date
    .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\s?([ap])m/i, (_, letter) => ' ' + letter.toLowerCase() + 'm');
  if (date.toDateString() === now.toDateString()) return 'Today, ' + time;
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday, ' + time;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' + time;
}

const nowLabel = () => labelOf(Date.now());

/** "Today" and "Yesterday" go stale overnight, so rebuild the labels from the saved timestamps. */
function relabel() {
  ['orders', 'bookings'].forEach((kind) =>
    D[kind].forEach((item) => {
      if (item.ts) item.when = labelOf(item.ts);
    }),
  );
}

/* ---------- helpers the screens use ---------- */

/** A real account with nothing in it yet: Home shows the welcome and setup list. */
function homeIsNew() {
  return Boolean(D.live && !D.products.length && !D.services.length && !D.orders.length);
}

const SETUP_STEPS = ['upi', 'look', 'link'];

function setupCount() {
  const done = D.setupDone || {};
  const hasCatalogue = D.products.length || D.services.length;
  return (hasCatalogue ? 1 : 0) + SETUP_STEPS.filter((step) => done[step]).length;
}

/** After the dashboard creates an order: take the stock off and update the customer. */
function afterOrder(order) {
  (order.items || []).forEach(([productId, quantity]) => {
    const product = D.products.find((item) => item.id === productId);
    if (product && product.stock != null) product.stock = Math.max(0, product.stock - quantity);
  });
  let customer = D.customers.find((item) => item.name === order.who);
  if (!customer) {
    customer = { id: 'cu' + Date.now(), name: order.who, phone: '—', orders: 0, spent: 0, last: '—' };
    D.customers.unshift(customer);
  }
  customer.orders += 1;
  customer.last = 'Today';
  if (order.paid) customer.spent += order.total;
}

/* ---------- loading ---------- */

function settingsObject() {
  return {
    cfg: D.cfg,
    setupDone: D.setupDone,
    rzp: D.rzp,
    look: D.look,
    tagline: D.tagline,
    setp: SETP,
    recents: D.recents,
  };
}

/** What is switched on on the server, plus the addresses to paste into Razorpay and Meta. */
function setIntegrations(integrations, addresses, payments) {
  D.int = integrations;
  D.addr = addresses || D.addr || {};
  D.rz = {
    ...integrations.razorpay,
    webhookConfigured: integrations.razorpay.webhook,
    webhookUrl: (D.addr || {}).razorpayWebhook,
    payments: payments || (D.rz && D.rz.payments) || [],
  };
}

function applyState(state) {
  USER = window.USER = state.user;
  D.live = !state.user.demo;
  D.stats = state.stats;
  D.reviews = state.collections.reviews || [];

  for (const kind of SYNCED_KINDS) {
    D[kind] = state.collections[kind] || [];
    SYNC.snapshot[kind] = JSON.stringify(D[kind]);
    SYNC.known[kind] = D[kind].map((item) => item.id);
  }
  fillThumbs();

  const saved = state.settings || {};
  D.cfg = saved.cfg || {};
  D.setupDone = saved.setupDone || {};
  if (saved.rzp) D.rzp = saved.rzp; // progress ticks of the Razorpay guide
  D.look = saved.look || 0;
  D.tagline = saved.tagline || null;
  if (saved.recents) D.recents = saved.recents;
  if (saved.setp) for (const page in saved.setp) SETP[page] = saved.setp[page];

  setIntegrations(state.integrations);
  SYNC.settings = JSON.stringify(settingsObject());
  relabel();
  if (D.live) SHOP_LINK = location.host + '/s/' + USER.handle;
}

async function loadExtras() {
  try {
    const [addresses, integrations] = await Promise.all([
      dapi('GET', '/api/addresses'),
      dapi('GET', '/api/integrations'),
    ]);
    setIntegrations(integrations, addresses, integrations.payments);
  } catch (_) {
    /* the pages still work without these */
  }
}

/* ---------- saving ---------- */

function giveMissingIds() {
  SYNCED_KINDS.forEach((kind) =>
    D[kind].forEach((item) => {
      if (item.id == null) item.id = kind[0] + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }),
  );
}

/** Save to the server now and report whether everything really is stored (used before saying "Saved"). */
async function persistNow() {
  if (!D.live) return true;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    while (SYNC.busy) await new Promise((resolve) => setTimeout(resolve, 80));
    await saveChanges();
    if (!hasUnsavedChanges()) return true;
  }
  return false;
}

const hasUnsavedChanges = () =>
  SYNCED_KINDS.some((kind) => JSON.stringify(D[kind]) !== SYNC.snapshot[kind]) ||
  JSON.stringify(settingsObject()) !== SYNC.settings;

async function saveChanges() {
  if (!D.live || SYNC.busy) return;
  SYNC.busy = true;
  try {
    giveMissingIds();
    for (const kind of SYNCED_KINDS) {
      if (JSON.stringify(D[kind]) === SYNC.snapshot[kind]) continue;
      const saved = await dapi('PUT', '/api/collections/' + kind, { items: D[kind], known: SYNC.known[kind] });
      // A buyer may have added a row while we were editing: keep it.
      const mine = new Set(D[kind].map((item) => String(item.id)));
      if (saved.items.some((item) => !mine.has(String(item.id)))) {
        D[kind] = saved.items;
        relabel();
        render();
      }
      SYNC.snapshot[kind] = JSON.stringify(D[kind]);
      SYNC.known[kind] = D[kind].map((item) => item.id);
    }
    const settings = JSON.stringify(settingsObject());
    if (settings !== SYNC.settings) {
      await dapi('PUT', '/api/settings', settingsObject());
      SYNC.settings = settings;
    }
    if (SYNC.failing) {
      SYNC.failing = false;
      toast('Saved again');
    }
  } catch (error) {
    if (error.status !== 401 && !SYNC.failing) {
      SYNC.failing = true;
      toast(error.status && error.status < 500 ? error.message : 'Could not save. Check your connection.');
    }
  }
  SYNC.busy = false;
}

/* ---------- picking up what happened while the page was open ---------- */

/** New orders and reviews arrive from the shop page, so look every 15 seconds. */
async function refreshFromServer() {
  if (!D.live || SYNC.busy || document.hidden || overlay || ui.dirty || hasUnsavedChanges()) return;
  const focused = document.activeElement;
  if (focused && /INPUT|TEXTAREA|SELECT/.test(focused.tagName)) return;

  try {
    const state = await dapi('GET', '/api/state');
    let changed = false;
    for (const kind of SYNCED_KINDS) {
      const incoming = JSON.stringify(state.collections[kind]);
      if (incoming === SYNC.snapshot[kind]) continue;
      const before = D[kind].length;
      D[kind] = state.collections[kind];
      SYNC.snapshot[kind] = incoming;
      SYNC.known[kind] = D[kind].map((item) => item.id);
      changed = true;
      fillThumbs();
      if (kind === 'orders' && D.orders.length > before) setTimeout(() => toast('New order'), 50);
    }
    D.stats = state.stats;
    D.reviews = state.collections.reviews || [];
    if (typeof ANALYTICS !== 'undefined') ANALYTICS.loadedFor = 0; // fetch fresh analytics next time
    if (changed) {
      relabel();
      render();
    }
  } catch (_) {
    /* try again next time */
  }
}

/* ---------- start ---------- */

stooraLogout = function () {
  fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    .catch(() => {})
    .finally(() => location.replace('/#about'));
};

(async function start() {
  try {
    applyState(await dapi('GET', '/api/state'));
  } catch (error) {
    if (error.status !== 401) {
      document.getElementById('screen').innerHTML =
        '<div style="padding:60px 20px;text-align:center"><p>Could not reach the Stoora server.</p><button class="btn main" onclick="location.reload()">Try again</button></div>';
    }
    return;
  }
  await loadExtras();
  window.__start();

  setInterval(saveChanges, 1500);
  setInterval(refreshFromServer, 15000);
  document.addEventListener('click', () => setTimeout(saveChanges, 250), true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveChanges();
  });
  window.addEventListener('pagehide', () => {
    if (D.live && hasUnsavedChanges()) saveChanges();
  });
})();
