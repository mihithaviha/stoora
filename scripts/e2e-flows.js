// Drives the main flows in a real browser and checks the result of each one.
//   npm run build && npm start   (serves http://localhost:3000), then:   node scripts/e2e-flows.js
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const BASE = process.env.BASE || 'http://localhost:3000';
const BROWSER = process.env.BROWSER || ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
const PORT = 9337;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const errors = [];

async function launch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stoora-e2e-'));
  const proc = spawn(BROWSER, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${dir}`, '--headless=new', '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) return proc; } catch (_) { /* wait */ } await sleep(250); }
  throw new Error('browser did not start');
}

async function page(width = 1440, height = 900) {
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable'); await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  const js = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
  const api = {
    js,
    goto: async (p) => { await send('Page.navigate', { url: BASE + p }); await sleep(1800); },
    where: () => js('location.pathname + location.search'),
    text: () => js('document.body.innerText'),
    has: async (t) => (await api.text()).includes(t),
    waitFor: async (t, ms = 6000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await api.has(t)) return true; await sleep(250); } return false; },
    waitUrl: async (part, ms = 6000) => { const end = Date.now() + ms; while (Date.now() < end) { if ((await api.where()).includes(part)) return true; await sleep(250); } return false; },
    click: async (text, scope = 'document') => { const ok = await js(`(() => { const els = [...${scope}.querySelectorAll('button,a,[role=tab],[role=radio]')].filter((e) => e.offsetParent !== null || e.closest('.pcard')); const el = els.find((e) => e.textContent.replace(/\\s+/g, ' ').trim() === ${JSON.stringify(text)}) || els.find((e) => e.textContent.replace(/\\s+/g, ' ').trim().includes(${JSON.stringify(text)})); if (!el) return false; el.click(); return true; })()`); if (!ok) throw new Error('no button/link "' + text + '"'); await sleep(450); },
    type: async (selector, value) => { await js(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.focus(); el.select && el.select(); })()`); await send('Input.insertText', { text: value }); await sleep(120); },
    keys: async (digits) => { for (const d of digits) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: d, text: d }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: d }); await sleep(60); } },
    set: (k, v) => js(`localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)})`),
    close: () => { ws.close(); },
  };
  return api;
}

async function flow(name, fn) {
  if (process.env.ONLY && !name.includes(process.env.ONLY)) return; // ONLY="Start for Free" runs just those flows
  const tab = await page(); const before = errors.length;
  try { await fn(tab); results.push([true, name]); } catch (e) { results.push([false, `${name}: ${e.message}`]); }
  if (errors.length > before) results.push([false, `${name}: JavaScript errors: ${errors.slice(before).join(' | ').slice(0, 300)}`]);
  tab.close();
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

// ---- helpers for the Add product checks: fake photos, and a fake AI answer (there is no AI key here, so what is tested is the screen's own handling) ----
const pick = (sel, specs) => `(async () => { const mk = (name, ok) => new Promise((res) => { if (!ok) { res(new File([new Uint8Array([1, 2, 3])], name, { type: 'image/jpeg' })); return; } const c = document.createElement('canvas'); c.width = 1600; c.height = 1200; const x = c.getContext('2d'); x.fillStyle = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'); x.fillRect(0, 0, 1600, 1200); c.toBlob((b) => res(new File([b], name, { type: 'image/jpeg' })), 'image/jpeg', 0.8); }); const dt = new DataTransfer(); for (const [n, ok] of ${JSON.stringify(specs)}) dt.items.add(await mk(n, ok)); const el = document.querySelector(${JSON.stringify(sel)}); el.files = dt.files; el.dispatchEvent(new Event('change', { bubbles: true })); return dt.files.length; })()`;
const fakeAi = (draft, status = 200) => `(() => { if (!window.__realFetch) window.__realFetch = window.fetch; window.__aiCalls = 0; window.fetch = (u, o) => String(u).includes('/api/v1/products/ai-draft') ? (window.__aiCalls++, Promise.resolve(new Response(${status === 200 ? JSON.stringify(JSON.stringify({ draft })) : '"{}"'}, { status: ${status} }))) : window.__realFetch(u, o); })()`;
const photoCount = (t) => t.js(`document.querySelectorAll('.photos img').length`);
const MUG = { title: 'Ceramic mug', description: 'A glazed ceramic mug for tea and coffee. Made of stoneware and easy to wash.', category: 'Cups', categoryIsNew: true, color: 'Blue', material: 'Stoneware', sizeKind: 'capacity', sizes: ['250 ml', '350 ml'], weightGrams: 350, boxCm: { l: 12, w: 12, h: 12 }, tags: ['mug'] };
const KURTA = { title: 'Handblock cotton kurta', description: 'A soft cotton kurta with a hand block print. Made for everyday wear.', category: 'Kurtas', categoryIsNew: true, color: 'Indigo', material: 'Cotton', sizeKind: 'clothes', sizes: [], weightGrams: 400, tags: ['kurta'] };
const CAKE = { title: 'Chocolate cake', description: 'A rich chocolate cake baked to order. Made with cocoa and fresh cream.', category: 'Cakes', categoryIsNew: true, color: '', material: '', sizeKind: 'food', sizes: [], weightGrams: 1000, tags: ['cake'] };

(async () => {
  const browser = await launch();
  try {
    await flow('Seller login with a code (wrong code, then the right one)', async (t) => {
      await t.goto('/login'); await t.type('#li-phone', '9876543210'); await t.click('Get WhatsApp code');
      expect(await t.waitUrl('/login/verify'), 'did not reach the code screen');
      await t.js(`document.querySelector('.otp-box').focus()`); await t.keys('000000');
      expect(await t.waitFor('That code isn’t right'), 'wrong code was not rejected');
      await t.js(`document.querySelector('.otp-box').focus()`); await t.keys('123456');
      expect(await t.waitUrl('/dashboard', 8000), 'right code did not open the dashboard');
    });

    await flow('Continue with Google signs in, and the phone must be added first (P0-6)', async (t) => {
      await t.goto('/design/states/offline'); await t.js('localStorage.clear()');
      await t.goto('/login'); expect(await t.has('Continue with Google') && await t.has('or with a WhatsApp code'), 'login page is missing the Google button or the WhatsApp option');
      expect(!(await t.has('Password')), 'a password field is still on the page');
      await t.click('Continue with Google'); expect(await t.waitUrl('/dashboard', 8000), 'Google button did not open the dashboard');
      expect(await t.waitFor('Add your WhatsApp number'), 'a Google sign-up reached the dashboard without being asked for a phone');
      expect(!(await t.has('Good morning')) && !(await t.has('Welcome to Stoora')), 'the dashboard showed before the phone was verified');
      await t.type('#pg-num', '9000000001'); await t.click('Send code on WhatsApp');
      expect(await t.waitFor('This number is already used by another Stoora account'), 'a number that belongs to another account was not refused');
      await t.type('#pg-num', '9811122233'); await t.click('Send code on WhatsApp');
      expect(await t.waitFor('We sent a 6-digit code'), 'no code step');
      await t.js(`document.querySelector('.otp-box').focus()`); await t.keys('000000');
      expect(await t.waitFor('That code isn’t right'), 'a wrong code was accepted');
      await t.js(`document.querySelector('.otp-box').focus()`); await t.keys('123456');
      expect(await t.waitFor('Welcome to Stoora', 8000) || await t.waitFor('Good morning', 3000) || await t.waitFor('Good afternoon', 3000) || await t.waitFor('Good evening', 3000), 'the dashboard did not open after the code');
      await t.goto('/account'); expect(await t.waitFor('Phone login') && await t.has('Google login'), 'Account does not show both logins');
      expect((await t.text()).includes('••• ••'), 'the phone is not shown masked');
      await t.goto('/buyer/login'); await t.click('Continue with Google'); expect(await t.waitUrl('/buyer/orders', 8000), 'buyer Google sign-in did not open orders');
      await t.goto('/dashboard'); await t.goto('/account'); await t.click('Sign out'); expect(await t.waitUrl('/signed-out', 6000), 'sign out did not reach the signed-out screen');
    });

    await flow('An unknown phone number asks "first time on Stoora?" and never makes an account by itself (P0-3)', async (t) => {
      await t.goto('/design/states/offline'); await t.js('localStorage.clear()');
      await t.goto('/login'); await t.type('#li-phone', '9123456780'); await t.click('Get WhatsApp code');
      expect(await t.waitFor('Is this your first time on Stoora?'), 'an unknown number was not asked about');
      expect(!(await t.has('link an existing email')) && !(await t.has('make a new account')), 'the old link-an-email screen showed');
      expect((await t.where()).startsWith('/login') && !(await t.where()).includes('verify'), 'a code was sent before asking');
      await t.click('No, I used Google before'); expect(await t.waitUrl('/dashboard', 8000), 'Google did not lead to the dashboard');
      expect(await t.waitFor('Add your WhatsApp number'), 'the number was not asked for again to connect the two');
      expect((await t.js(`document.getElementById('pg-num').value`)).replace(/\D/g, '') === '9123456780', 'the number typed at login was not carried to the connect step');
      await t.click('Send code on WhatsApp'); expect(await t.waitFor('We sent a 6-digit code'), 'no code step');
      await t.js(`document.querySelector('.otp-box').focus()`); await t.keys('123456');
      expect(await t.waitFor('Welcome to Stoora', 8000) || await t.waitFor('Good morning', 3000) || await t.waitFor('Good afternoon', 3000) || await t.waitFor('Good evening', 3000), 'the dashboard did not open after connecting the number');
      await t.goto('/account'); await t.click('Sign out'); expect(await t.waitUrl('/signed-out', 6000), 'sign out failed');
      await t.goto('/login'); await t.type('#li-phone', '9123456780'); await t.click('Get WhatsApp code');
      expect(await t.waitUrl('/login/verify', 6000), 'after connecting, the same number should go straight to the code screen');
      await t.js(`document.querySelector('.otp-box').focus()`); await t.keys('123456');
      expect(await t.waitUrl('/dashboard', 8000), 'the next phone login did not open the dashboard');
    });

    await flow('Signed up with the phone: Google is offered, Later keeps it in the setup list (P0-6 rule 2)', async (t) => {
      await t.goto('/design/states/offline'); await t.js('localStorage.clear()');
      await t.goto('/login'); await t.type('#li-phone', '9333344444'); await t.click('Get WhatsApp code');
      expect(await t.waitFor('Is this your first time on Stoora?'), 'unknown number was not asked');
      await t.click('Yes, I’m new'); expect(await t.waitUrl('/login/verify', 6000), 'no code screen');
      await t.js(`document.querySelector('.otp-box').focus()`); await t.keys('123456');
      expect(await t.waitUrl('/onboarding', 8000), 'a new number should be asked for the store name');
      expect(await t.waitFor('What’s your store name?'), 'the store name question is missing');
      await t.goto('/dashboard'); expect(await t.waitFor('Add your Google account so you can log in with it too'), 'Google was not offered');
      await t.click('Later'); await sleep(300);
      expect(!(await t.has('Add your Google account so you can log in with it too')), 'the prompt should go after Later');
      expect(await t.has('Add Google login'), 'Later should leave "Add Google login" in the setup list');
      await t.goto('/account'); expect(await t.has('Google login') && await t.has('Not added yet'), 'Account should show Google as not added');
    });

    await flow('Buyer buys something and it reaches the seller', async (t) => {
      await t.goto('/s/meera'); await t.js(`document.querySelectorAll('.pcard')[1].querySelector('.quick').click()`); await sleep(600);
      expect(await t.has('Add to bag'), 'quick view did not open');
      await t.click('Add to bag'); expect(await t.waitFor('Choose a size first'), 'size was not required');
      await t.click('M'); await t.click('Add to bag'); await sleep(500);
      expect((await t.js(`document.querySelector('.cartcount')?.textContent`)) === '1', 'bag count is not 1');
      await t.goto('/s/meera/checkout?demo=filled'); await t.click('Pay ₹2,899');
      expect(await t.waitUrl('/payment/success', 9000), 'did not reach the success screen');
      expect(await t.waitFor('Payment received'), 'success screen text missing');
      await t.set('stoora.session', 'demo'); await t.goto('/buyer/orders');
      expect(await t.has('Order #1013'), 'the new order is not in the buyer\'s orders');
      await t.goto('/orders'); expect(await t.has('#1013') && await t.has('Priya Sharma'), 'the seller does not see the new order');
      await t.goto('/orders/1013'); expect(await t.has('Order placed by buyer') && await t.has('Paid'), 'order 1013 is not marked as a paid buyer order');
    });

    await flow('A failed payment keeps the bag', async (t) => {
      await t.goto('/s/meera'); await t.set('stoora.bag.v1', JSON.stringify({ lines: [{ productId: 'p1', size: 'M', qty: 1 }], wish: [] }));
      await t.goto('/s/meera/checkout?demo=filled');
      await t.js(`(() => { const s = document.querySelector('select[aria-label="Demo payment result"]'); const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(s, 'failed'); s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await t.click('Pay ₹1,559'); expect(await t.waitUrl('/payment/failed', 9000), 'did not reach the failed screen');
      expect(await t.has('Payment didn’t go through'), 'failed text missing');
      await t.goto('/s/meera/bag'); expect(await t.has('Handblock cotton kurta'), 'the bag was emptied after a failed payment');
    });

    await flow('Refund an order', async (t) => {
      await t.goto('/orders/1012'); await t.click('Refund'); expect(await t.waitFor('Refund order #1012'), 'refund dialog did not open');
      await t.click('Part refund'); await t.type('#rf-amt', '500'); await t.click('Refund ₹500');
      expect(await t.waitFor('Refunded ₹500'), 'refund is not on the order');
    });

    await flow('Import products from a CSV', async (t) => {
      await t.goto('/products/import'); await t.click('Try a sample file'); expect(await t.waitFor('MATCH THE COLUMNS'), 'no column step');
      await t.click('Review products'); expect(await t.has('4 products ready') && await t.has('2 rows need fixing'), 'review counts are wrong');
      await t.click('Import 4 products'); expect(await t.waitFor('4 products imported'), 'import did not finish');
      await t.goto('/products'); expect(await t.has('Chanderi silk kurta'), 'imported product is not in the list');
    });

    await flow('Verify a WhatsApp number', async (t) => {
      await t.goto('/settings/whatsapp'); await sleep(800); await t.type('#wa-num', '9876543210'); await t.click('Send code on WhatsApp');
      expect(await t.waitFor('Waiting for code'), 'no code step');
      await t.js(`document.querySelector('.otp-box').focus()`); await t.keys('123456'); await t.click('Verify number');
      expect(await t.waitFor('Verified'), 'number was not verified');
    });

    await flow('Send an enquiry and see it in the admin inbox', async (t) => {
      await t.goto('/'); await t.click('Talk to us'); expect(await t.waitFor('What is this about'), 'dialog did not open');
      await t.type('#en-name', 'Test Visitor'); await t.type('#en-contact', 'visitor@example.in'); await t.type('#en-msg', 'Can I take UPI payments for my cakes?');
      await t.click('Send enquiry'); expect(await t.waitFor('We have your message'), 'enquiry was not sent');
      await t.goto('/admin/enquiries'); expect(await t.has('Test Visitor'), 'enquiry is not in the admin inbox');
    });

    await flow('Pause my shop: the words follow the switch and the shop page agrees (P0-1)', async (t) => {
      await t.goto('/settings/shop-details'); await sleep(600);
      const words = () => t.js(`document.getElementById('pause-words').textContent`);
      expect((await words()).includes('Shop is open. Buyers can order.'), 'open shop should say it is open');
      await t.js(`document.querySelector('button[role=switch][aria-label="Pause my shop"]').click()`); await sleep(300);
      expect((await words()).includes('Shop is paused. Buyers can look but can’t order.'), 'the words did not follow the switch');
      await t.click('Save changes'); await sleep(900);
      await t.goto('/s/meera'); expect(await t.has('Shop is paused') || await t.has('can’t order'), 'shop page does not show the pause');
      expect(!(await t.js(`[...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Add to bag')`)), 'Add to bag is still shown while paused');
      await t.goto('/settings/shop-details'); await sleep(600);
      await t.js(`document.querySelector('button[role=switch][aria-label="Pause my shop"]').click()`); await sleep(300);
      expect((await words()).includes('Shop is open. Buyers can order.'), 'unpausing did not change the words');
      await t.click('Save changes'); await sleep(900);
      await t.goto('/s/meera'); expect(!(await t.has('Shop is paused')), 'shop still says paused after unpausing');
    });

    await flow('Pick a template, edit it, publish it, and the shop page uses it', async (t) => {
      await t.goto('/design'); await t.js(`localStorage.clear(); localStorage.setItem('stoora.session', 'demo')`);
      await t.goto('/storefront'); await sleep(2500);
      expect(await t.js(`document.querySelectorAll('.sfg-card').length`) === 5, 'the gallery should show the 5 templates that are on sale (premium ones are hidden)');
      expect(await t.js(`!!document.querySelector('a[href="/s/meera"]')`), 'View storefront button missing');
      await t.js(`[...document.querySelectorAll('.sfg-card button')].find((b) => b.textContent.includes('Use this template')).click()`); await sleep(3500);
      expect(await t.js(`!!document.querySelector('.sfin')`), 'editor did not open');
      await t.js(`(() => { const el = document.querySelector('#sf-ht'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, 'Made by Meera'); el.dispatchEvent(new Event('input', { bubbles: true })); })()`); await sleep(1500);
      expect(await t.js(`document.querySelector('.sfed-device-frame iframe').contentDocument.body.innerText.includes('Made by Meera')`), 'the preview did not update');
      await t.js(`[...document.querySelectorAll('.sfed-bar button')].find((b) => b.textContent.includes('Publish')).click()`); await sleep(1800);
      await t.goto('/s/meera'); await sleep(1500);
      expect(await t.js(`!!document.querySelector('.sf')`) && await t.has('Made by Meera'), 'the shop page should be drawn by the template with the new headline');
      await t.js(`[...document.querySelectorAll('.sf-card .sf-btn')].find((b) => b.textContent.includes('Add to bag')).click()`); await sleep(700);
      expect(await t.js(`document.querySelector('.sf-float-pill.dark b').textContent`) === '1', 'the bag should hold one item');
    });

    await flow('Add product: many photos at once, the cap of 8, and one broken photo (5.6 item 1)', async (t) => {
      await t.goto('/products/new'); await t.js(fakeAi(MUG, 503)); // AI off: only the photos are tested here
      await t.js(pick('#pf-photos', [['a.jpg', 1], ['b.jpg', 1], ['c.jpg', 1], ['d.jpg', 1], ['e.jpg', 1]])); await sleep(1800);
      expect(await photoCount(t) === 5, '5 photos picked in one go should all appear, saw ' + await photoCount(t));
      await t.js(pick('#pf-photos', [['f.jpg', 1], ['g.jpg', 1], ['h.jpg', 1], ['i.jpg', 1], ['j.jpg', 1]])); await sleep(1800);
      expect(await photoCount(t) === 8, 'picking more than 8 should stop at 8, saw ' + await photoCount(t));
      expect(await t.has('We added the first 3'), 'no note saying only the first 3 were added');
      await t.goto('/products/new'); await t.js(fakeAi(MUG, 503));
      await t.js(pick('#pf-photos', [['ok1.jpg', 1], ['broken.jpg', 0], ['ok2.jpg', 1]])); await sleep(1800);
      expect(await photoCount(t) === 2, 'the good photos should still be added when one is broken, saw ' + await photoCount(t));
      expect(await t.has('Try again'), 'the broken photo should offer Try again');
      expect(await t.js(`document.querySelectorAll('.photos img')[0].closest('.phot').textContent.includes('Cover')`), 'the first photo should be the cover');
    });

    await flow('Add product: AI fills the details; mug gets ml sizes, no price or "One size" (5.6 item 2)', async (t) => {
      await t.goto('/products/new'); await t.js(fakeAi(MUG));
      await t.js(pick('#pf-photos', [['mug.jpg', 1]])); await sleep(2800);
      expect(await t.js('window.__aiCalls') === 1, 'exactly one AI call per product, saw ' + await t.js('window.__aiCalls'));
      expect(await t.has('Ceramic mug') && await t.has('glazed ceramic mug'), 'title and description were not filled');
      expect(!/₹\s?0|One size/.test((await t.text()).split(/your answers/i)[0]), 'the description mentions a price or One size');
      expect(await t.js(`[...document.querySelectorAll('.chip')].some((c) => c.textContent === '250 ml' && c.getAttribute('aria-pressed') === 'true')`), 'ml sizes were not suggested');
      expect(await t.js(`document.querySelector('#pf-stock') === null`), 'stock for each size should replace the single stock box');
      expect(await t.js(`document.querySelector('#pf-weight').value`) === '350', 'weight guess missing');
      expect(await t.js(`document.querySelector('#pf-cat').value`) === '__new', 'a new category should be suggested through "+ New category"');
    });

    await flow('Add product: kurta sizes are XS to XXL and stock per size adds up (5.6 item 3)', async (t) => {
      await t.goto('/products/new'); await t.js(fakeAi(KURTA));
      await t.js(pick('#pf-photos', [['k.jpg', 1]])); await sleep(2800);
      expect(await t.js(`['XS','S','M','L','XL','XXL'].every((z) => [...document.querySelectorAll('.chip')].some((c) => c.textContent === z && c.getAttribute('aria-pressed') === 'true'))`), 'XS to XXL should be pre-set');
      expect(await t.js(`[...document.querySelectorAll('[role=tab]')].some((b) => b.getAttribute('aria-selected') === 'true' && b.textContent === 'Yes' && b.closest('.field').textContent.includes('sizes or colours'))`), 'sizes or colours should be pre-set to Yes');
      for (const [z, n] of [['XS', '1'], ['S', '2'], ['M', '3'], ['L', '4'], ['XL', '5'], ['XXL', '6']]) await t.type(`input[aria-label="Stock for ${z}"]`, n);
      const total = await t.js(`document.querySelector('b.num[aria-live=polite]')?.textContent`);
      expect(total === '21', 'stock per size should add up to 21, saw ' + total);
    });

    await flow('Add product: cake has no colour question and sizes in kg (5.6 item 4)', async (t) => {
      await t.goto('/products/new'); await t.js(fakeAi(CAKE));
      await t.js(pick('#pf-photos', [['c.jpg', 1]])); await sleep(2800);
      expect(!(await t.has('Colour')) && !(await t.has('colours')) || !(await t.js(`!!document.querySelector('#pf-color')`)), 'a cake should not be asked about colour');
      expect(await t.js(`['0.5 kg','1 kg','2 kg'].every((z) => [...document.querySelectorAll('.chip')].some((c) => c.textContent === z))`), 'kg sizes missing');
    });

    await flow('Add product: weight 1500 shows = 1.5 kg and has no arrows (5.6 item 5)', async (t) => {
      await t.goto('/products/new'); await t.type('#pf-weight', '1500');
      expect(await t.has('= 1.5 kg'), 'no kg note');
      expect(await t.js(`document.querySelector('#pf-weight').type`) === 'text', 'weight should be a plain box with no arrows');
    });

    await flow('Add product: with AI off the seller types everything; no photo stays hidden; with a photo it goes live (5.6 items 6, 7)', async (t) => {
      await t.goto('/products/new'); await t.js(fakeAi(MUG, 503));
      expect(await t.js(`document.querySelector('#pf-stock').value`) === '', 'stock should start empty, not 1');
      await t.type('#pf-name', 'Hidden test lamp'); await t.type('#pf-price', '800'); await t.type('#pf-stock', '4');
      expect(await t.has('Add a photo to show it in your shop'), 'no hint about the photo');
      await t.click('Add product'); await sleep(900);
      await t.goto('/s/meera'); expect(!(await t.has('Hidden test lamp')), 'a product with no photo should stay hidden from the shop');
      await t.goto('/products'); expect(await t.has('Hidden test lamp'), 'the product is not in the seller\'s list');
      await t.goto('/products/new'); await t.js(fakeAi(MUG, 503));
      await t.js(pick('#pf-photos', [['v.jpg', 1]])); await sleep(1500);
      await t.type('#pf-name', 'Visible test lamp'); await t.type('#pf-price', '800');
      await t.js(`[...document.querySelectorAll('[role=tab]')].find((b) => b.textContent === 'Yes' && b.closest('.field').textContent.includes('on sale')).click()`); await sleep(300);
      await t.type('#pf-was', '1000'); await t.type('#pf-stock', '4');
      await t.click('Add product'); await sleep(1200);
      await t.goto('/s/meera'); expect(await t.has('Visible test lamp'), 'a product with a photo should be live in the shop');
      expect(await t.js(`!!document.querySelector('s, del')`) || await t.has('₹1,000'), 'the crossed-out old price is missing on the shop');
    });

    await flow('Add product: leaving with unsaved changes asks; Delete has Undo (5.6 items 8, 9)', async (t) => {
      await t.goto('/products'); await sleep(600);
      await t.js(`[...document.querySelectorAll('tr.rw')].find((x) => x.textContent.includes('Visible test lamp')).click()`); await sleep(1500);
      await t.click('Visible test lamp'); await t.type('#pf-name', ' 2'); // tap the title line to fix it
      expect(await t.has('Unsaved changes'), 'the unsaved bar is missing');
      expect(await t.js(`!!document.querySelector('a[aria-label="Back to Products"]') && getComputedStyle(document.querySelector('.savebar-float')).position === 'fixed'`), 'the bar should float and leave the back button visible');
      await t.js(`document.querySelector('a[aria-label="Back to Products"]').click()`); await sleep(500);
      expect(await t.has('Leave without saving?'), 'no leave prompt');
      await t.click('Not now'); await sleep(300);
      expect((await t.where()).startsWith('/products/'), 'should still be on the product');
      await t.click('Discard'); await sleep(300);
      await t.js(`document.querySelector('details.more summary').click()`); await sleep(300); await t.click('Delete product'); await sleep(900);
      expect((await t.where()) === '/products', 'delete should go back to the list, at ' + await t.where());
      expect(!(await t.js(`[...document.querySelectorAll('tr.rw')].some((r) => r.textContent.includes('Visible test lamp'))`)), 'the product should be gone from the list');
      await t.click('Undo'); await sleep(900);
      expect(await t.js(`[...document.querySelectorAll('tr.rw')].some((r) => r.textContent.includes('Visible test lamp'))`), 'Undo did not bring it back');
    });

    await flow('Services: Add service asks which kind first, then opens that form with no stock or sizes (P0-5)', async (t) => {
      await t.goto('/products/service/new'); expect(await t.has('What are you adding?') && await t.has('Workshop') && await t.has('Digital download'), 'the kind chooser is missing');
      await t.goto('/products/service/new?kind=workshop'); expect((await t.text()).toLowerCase().includes('date and time') && (await t.text()).toLowerCase().includes('seats'), 'workshop form is missing date, time and seats');
      expect(!/stock|weight|sizes/i.test(await t.text()), 'a service form shows stock, sizes or weight');
      await t.goto('/products/service/new?kind=session'); expect((await t.text()).toLowerCase().includes('time slots'), 'session form is missing time slots');
      await t.goto('/products/service/new?kind=digital'); expect((await t.text()).toLowerCase().includes('the file'), 'download form is missing the file');
      await t.type('#sv-name', 'Pattern ebook'); await t.type('#sv-price', '299'); await t.click('Add digital download');
      expect(await t.has('Add the file buyers will receive'), 'a download without a file was accepted');
      await t.js(pick('#sv-file', [['ebook.jpg', 1]])); await sleep(500); await t.click('Add digital download'); await sleep(900);
      await t.goto('/products?tab=services'); expect(await t.has('Pattern ebook'), 'the download is not in the services list');
    });

    await flow('Start for Free: every sign-up button says it and opens /shop/start', async (t) => {
      await t.goto('/');
      const labels = await t.js(`[...document.querySelectorAll('a.btn.primary, a.sf-cta')].filter((a) => (a.getAttribute('href') || '').includes('shop/start') || (a.getAttribute('href') || '').includes('signup')).map((a) => a.textContent.trim().split(String.fromCharCode(10)).join(' ') + ' > ' + a.getAttribute('href')).join(' | ')`);
      expect(labels.includes('Start for Free') && labels.includes('> /shop/start'), 'no Start for Free button found: ' + labels);
      expect(!/Get started|Get to Start/i.test(labels), 'an old label is left: ' + labels);
      expect(!(await t.js(`!!document.querySelector('a[href="/signup"]')`)), 'a link still goes to /signup');
      await t.click('Start for Free'); expect(await t.waitUrl('/shop/start'), 'the button did not open /shop/start');
      await t.goto('/journal'); expect(await t.has('Start for Free'), 'the Journal page has no Start for Free button');
      await t.goto('/signup'); expect(await t.waitUrl('/shop/start'), 'the old /signup address should lead to /shop/start');
    });

    await flow('Start for Free: country box, new number, code, store name, then the shop setup', async (t) => {
      await t.goto('/shop/start');
      expect(await t.has('Start selling from one link') && await t.has('Continue with Google'), 'Start for Free screen is missing its two ways in');
      expect(await t.js(`document.querySelector('.cc-box')?.textContent.trim() === '+91'`), 'the country code box is missing');
      await t.click('Get WhatsApp code'); expect(await t.has('Enter your 10-digit mobile number'), 'a short number was accepted');
      await t.type('#su-phone', '9555500001'); await t.click('Get WhatsApp code');
      expect(await t.waitUrl('/login/verify', 6000), 'no code screen');
      expect(!(await t.has('already has a Stoora account')), 'a new number was treated as an existing account');
      expect(await t.has('Code not coming?') && await t.has('Use Google instead'), '"Code not coming? Use Google instead" is missing');
      await t.js(`document.querySelector('.otp-box').focus()`); await t.keys('000000');
      expect(await t.waitFor('That code isn’t right. Try again.'), 'a wrong code was not rejected in the plain words');
      await t.js(`document.querySelector('.otp-box').focus()`); await t.keys('123456');
      expect(await t.waitUrl('/onboarding', 8000), 'a new number should go to the store name');
      expect(await t.waitFor('What’s your store name?'), 'the store name question is missing');
      expect(!(await t.has('link an existing email')) && !(await t.has('make a new account')), 'the old account screen appeared');
      await t.click('Continue'); expect(await t.has('Add your shop’s name'), 'name was not required');
      await t.type('#ob-name', 'Meera Studio'); await sleep(1200);
      expect(await t.has('is taken') && await t.has('try'), 'a taken link was not flagged with a suggestion');
      await t.type('#ob-name', 'Shaurya Studio'); await sleep(1200);
      expect(await t.has('is free'), 'a free link was not flagged');
      expect(!(await t.has('Add your shop’s name')), 'the red message should clear once the box is filled');
    });

    await flow('Start for Free: a number that already has an account is sent to log in', async (t) => {
      await t.goto('/design/states/offline'); await t.js('localStorage.clear()');
      await t.goto('/shop/start'); await t.type('#su-phone', '9876543210'); await t.click('Get WhatsApp code');
      expect(await t.waitUrl('/login/verify', 6000), 'no code screen');
      expect(await t.has('already has a Stoora account'), 'the person was not told the number is already used');
      await t.js(`document.querySelector('.otp-box').focus()`); await t.keys('123456');
      expect(await t.waitUrl('/dashboard', 8000), 'an existing number should open the dashboard');
    });

    await flow('Start for Free: Use Google instead works from the code screen', async (t) => {
      await t.goto('/design/states/offline'); await t.js('localStorage.clear()');
      await t.goto('/shop/start'); await t.type('#su-phone', '9555500002'); await t.click('Get WhatsApp code');
      expect(await t.waitUrl('/login/verify', 6000), 'no code screen');
      await t.click('Use Google instead'); expect(await t.waitUrl('/onboarding', 8000), 'Google did not lead on to the store name');
      expect(await t.waitFor('What’s your store name?'), 'the store name question is missing after Google');
    });

    await flow('The public site: home, Journal and Start for Free open without errors', async (t) => {
      await t.goto('/'); expect(await t.has('One link for every order'), 'home page headline missing');
      await t.goto('/how-it-works'); await sleep(900);
      expect(await t.js(`Math.abs(document.getElementById('l-how').getBoundingClientRect().top) < 140`), '/how-it-works should open at that section');
      await t.goto('/journal'); await sleep(1500);
      expect(await t.js(`document.querySelector('.jr-orbit').classList.contains('is-ring')`), 'the story ring did not start');
      await t.goto('/shop/start'); expect(await t.has('Start selling from one link'), 'Start for Free screen missing');
      await t.goto('/privacy'); expect(await t.has('Privacy policy'), 'privacy page missing');
    });

    await flow('Open a shop: name, what you sell, setting up, live; Settings can change what you sell', async (t) => {
      await t.goto('/design/states/offline'); await t.js('localStorage.clear()');
      await t.goto('/onboarding'); await t.click('Continue'); expect(await t.has('Add your shop’s name'), 'name was not required');
      await t.type('#ob-name', 'Test Bakes'); await t.click('Continue');
      expect(await t.waitFor('What do you sell?'), 'the what-you-sell step is missing');
      await t.click('Continue'); expect(await t.has('Pick one to go on.'), 'a choice was not required');
      await t.click('Physical products'); expect(await t.waitFor('You picked Physical products'), 'the choice was not confirmed back');
      await t.click('Digital products'); expect(await t.has('You picked Digital products'), 'the choice could not be changed');
      await t.click('Physical products'); await t.click('Continue');
      await t.click('Continue'); await t.click('Continue'); await t.click('Publish my shop');
      expect(await t.waitFor('Setting up Test Bakes', 4000), 'there was no setting-up screen with steps');
      expect(await t.waitFor('Test Bakes is live', 8000), 'shop was not published');
      expect(await t.has('stoora.in/test-bakes'), 'shop link was not made from the name');
      await t.goto('/s/test-bakes'); expect(await t.has('Coming soon'), 'a shop with no products should say Coming soon');
      await t.goto('/dashboard'); expect(await t.waitFor('Add your first product'), 'a physical shop should be asked to add a product first: ' + (await t.text()).replace(/\s+/g, ' ').slice(0, 260));
      expect(!(await t.js(`!!document.querySelector('.dnav a[href="/products?tab=services"]')`)), 'a physical shop should not show Services in the menu');
      await t.goto('/settings/shop-details'); await t.click('Digital products'); await t.click('Save changes'); await sleep(900);
      await t.goto('/dashboard'); expect(await t.waitFor('Add your first session or download'), 'a digital shop should be asked to add a session first');
      expect(!(await t.js(`!!document.querySelector('.dnav a[href="/products"]')`)) && (await t.js(`!!document.querySelector('.dnav a[href="/products?tab=services"]')`)), 'the menu should show Services and hide Products after switching to digital');
      await t.goto('/settings/shop-details'); await t.click('Physical products'); await t.click('Save changes'); await sleep(900);
      await t.goto('/dashboard'); expect(await t.js(`!!document.querySelector('.dnav a[href="/products"]')`), 'switching back should bring Products back');
    });

    await flow('Signed-out screens appear without a login', async (t) => {
      await t.goto('/design/states/offline'); await t.js('localStorage.clear()');
      await t.goto('/buyer/orders'); expect(await t.has('Sign in to see your orders'), 'buyer orders did not ask for a sign-in');
      await t.goto('/s/nobody'); expect(await t.has('We couldn’t find that shop'), 'unknown shop did not say not found');
      await t.goto('/nothing-here'); expect(await t.has('We couldn’t find that page'), '404 page missing');
    });
  } finally { browser.kill(); }
  const failed = results.filter((r) => !r[0]);
  results.forEach(([ok, name]) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`));
  console.log(failed.length ? `\n${failed.length} of ${results.length} checks failed` : `\nAll ${results.length} flows passed`);
  process.exit(failed.length ? 1 : 0);
})();
