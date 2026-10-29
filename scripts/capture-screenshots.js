// Opens every screen listed in src/lib/screens.json in headless Edge/Chrome, at laptop and phone size,
// and saves a PNG for each into handoff/screenshots. It also reports JavaScript errors, blank pages and sideways scrolling.
//
//   npm run build && npm start            (in another terminal: serves http://localhost:3000)
//   node scripts/capture-screenshots.js   (BASE=http://localhost:3000  BROWSER=<path to msedge or chrome>)
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = path.join(__dirname, '..', 'handoff', 'screenshots');
const BROWSER = process.env.BROWSER || ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
const PORT = 9336;
const only = process.argv[2]; // optional: only screens whose path contains this text
const screens = require('../src/lib/screens.json').filter((s) => !only || s.path.includes(only));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const problems = [];

const SESSION = { key: 'stoora.session', value: 'demo' };
const SETUP = {
  seller: { [SESSION.key]: 'demo' },
  buyer: { [SESSION.key]: 'demo', 'stoora.buyer': JSON.stringify({ name: 'Priya Sharma', phone: '+91 98765 43210' }) },
  bag: { 'stoora.bag.v1': JSON.stringify({ lines: [{ productId: 'p3', size: 'M', qty: 1 }, { productId: 'p1', size: 'L', qty: 2 }], wish: ['p2', 'p3', 'p6'] }) },
};

async function launch() {
  if (!BROWSER) throw new Error('Set BROWSER to the path of Edge or Chrome');
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'stoora-shots-'));
  const proc = spawn(BROWSER, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${dir}`, '--headless=new', '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) return proc; } catch (_) { /* wait */ } await sleep(250); }
  throw new Error('The browser did not start');
}

async function open(width, height, mobile) {
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = new Map(); const listeners = [];
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else listeners.forEach((f) => f(m)); };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  const evalJs = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.text); return r.result.result.value; };
  return { send, evalJs, listeners, close: () => { ws.close(); fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`).catch(() => {}); } };
}

(async () => {
  fs.mkdirSync(path.join(OUT, 'desktop'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'mobile'), { recursive: true });
  const browser = await launch();
  let n = 0;
  try {
    for (const s of screens) {
      n++;
      for (const [device, w, h, mobile] of [['desktop', 1440, 900, false], ['mobile', 390, 844, true]]) {
        if (s.mobileOnly && device === 'desktop') continue;
        const tab = await open(w, h, mobile); const label = `${String(n).padStart(2, '0')} ${s.name} (${device})`;
        tab.listeners.push((m) => {
          if (m.method === 'Runtime.exceptionThrown') problems.push(`${label}: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
          if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') problems.push(`${label}: console.error ${m.params.args.map((a) => a.value || a.description).join(' ').slice(0, 200)}`);
          if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/favicon|fonts\.g/.test(m.params.entry.url || '')) problems.push(`${label}: ${m.params.entry.text} ${m.params.entry.url || ''}`);
        });
        // set (or clear) the demo login and bag, then open the screen
        await tab.send('Page.navigate', { url: BASE + '/design/states/offline' }); await sleep(900);
        const keys = SETUP[s.auth] || {};
        await tab.evalJs(`localStorage.clear(); ${Object.entries({ ...(s.auth === 'bag' ? {} : {}), ...keys }).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)})`).join(';')}`);
        await tab.send('Page.navigate', { url: BASE + s.path }); await sleep(2600);
        const info = await tab.evalJs(`({ len: document.body.innerText.trim().length, over: document.documentElement.scrollWidth - innerWidth, title: document.title })`);
        if (info.len < 30) problems.push(`${label}: page looks blank`);
        if (device === 'mobile' && info.over > 2) problems.push(`${label}: scrolls sideways by ${info.over}px`);
        const shot = await tab.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        const file = path.join(OUT, device, `${String(n).padStart(2, '0')}-${s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`);
        fs.writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
        tab.close();
      }
    }
  } finally { browser.kill(); }
  // a simple page to look through everything: open handoff/screenshots/index.html
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const groups = {}; screens.forEach((sc, i) => { (groups[sc.group] = groups[sc.group] || []).push([i + 1, sc]); });
  const fileFor = (device, i, sc) => `${device}/${String(i).padStart(2, '0')}-${sc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stoora screens</title>
<style>body{font:15px/1.5 system-ui,sans-serif;margin:0;background:#F7F7F7;color:#171C3C}header{padding:24px 28px;background:#171C3C;color:#fff}h1{margin:0;font-size:24px}main{padding:24px 28px;max-width:1500px;margin:auto}h2{margin:36px 0 12px}
.row{display:grid;grid-template-columns:2fr 0.7fr;gap:16px;background:#fff;border:1px solid #E0D6CA;border-radius:14px;padding:14px;margin-bottom:16px}.row h3{margin:0 0 8px;font-size:16px}code{color:#725F54;font-size:12px}img{width:100%;border:1px solid #EBE3DA;border-radius:8px;display:block}.none{display:grid;place-items:center;color:#938378;font-size:13px}@media(max-width:800px){.row{grid-template-columns:1fr}}</style>
<header><h1>Stoora screens</h1><p>${screens.length} screens, each on a laptop and a phone. Open the app at ${BASE}/design for the live version.</p></header><main>
${Object.entries(groups).map(([g, list]) => `<h2>${esc(g)}</h2>` + list.map(([i, sc]) => `<div class="row"><div><h3>${esc(sc.name)} <code>${esc(sc.path)}</code></h3>${sc.mobileOnly ? '<div class="none">Phone only</div>' : `<a href="${fileFor('desktop', i, sc)}"><img loading="lazy" src="${fileFor('desktop', i, sc)}" alt="${esc(sc.name)} on a laptop"></a>`}</div><div><h3>Phone</h3><a href="${fileFor('mobile', i, sc)}"><img loading="lazy" src="${fileFor('mobile', i, sc)}" alt="${esc(sc.name)} on a phone"></a></div></div>`).join('')).join('')}</main>`;
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
  console.log(`Captured ${n} screens into ${OUT}`);
  console.log(problems.length ? `\nPROBLEMS (${problems.length}):\n - ` + problems.join('\n - ') : '\nNo errors, blank pages or sideways scrolling.');
  process.exit(problems.length ? 1 : 0);
})();
