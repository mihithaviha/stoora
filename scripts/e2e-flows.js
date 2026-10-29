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
  const tab = await page(); const before = errors.length;
  try { await fn(tab); results.push([true, name]); } catch (e) { results.push([false, `${name}: ${e.message}`]); }
  if (errors.length > before) results.push([false, `${name}: JavaScript errors: ${errors.slice(before).join(' | ').slice(0, 300)}`]);
  tab.close();
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

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

    await flow('Continue with Google signs in (demo mode)', async (t) => {
      await t.goto('/design/states/offline'); await t.js('localStorage.clear()');
      await t.goto('/login'); expect(await t.has('Continue with Google') && await t.has('or with a WhatsApp code'), 'login page is missing the Google button or the WhatsApp option');
      expect(!(await t.has('Password')), 'a password field is still on the page');
      await t.click('Continue with Google'); expect(await t.waitUrl('/dashboard', 8000), 'Google button did not open the dashboard');
      await t.goto('/buyer/login'); await t.click('Continue with Google'); expect(await t.waitUrl('/buyer/orders', 8000), 'buyer Google sign-in did not open orders');
      await t.goto('/dashboard'); await t.goto('/account'); await t.click('Sign out'); expect(await t.waitUrl('/signed-out', 6000), 'sign out did not reach the signed-out screen');
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
      await t.goto('/products/import'); await t.click('Try a sample file'); expect(await t.has('Match the columns'), 'no column step');
      await t.click('Review products'); expect(await t.has('4 products ready') && await t.has('2 rows need fixing'), 'review counts are wrong');
      await t.click('Import 4 products'); expect(await t.waitFor('4 products imported'), 'import did not finish');
      await t.goto('/products'); expect(await t.has('Chanderi silk kurta'), 'imported product is not in the list');
    });

    await flow('Verify a WhatsApp number', async (t) => {
      await t.goto('/settings/whatsapp-verification'); await t.type('#wa-num', '9876543210'); await t.click('Send code on WhatsApp');
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

    await flow('Pause orders and the shop page says so', async (t) => {
      await t.goto('/settings/order-taking');
      await t.js(`document.querySelector('button[role=switch][aria-label="Shop is open for orders"]').click()`); await sleep(300);
      expect(await t.has('Your shop is paused'), 'pause banner missing');
      await t.click('Save changes'); expect(await t.waitFor('Order-taking settings saved'), 'not saved');
      await t.goto('/s/meera'); expect(await t.has('is not taking orders right now'), 'shop page does not show the pause');
    });

    await flow('Pick a template, edit it, publish it, and the shop page uses it', async (t) => {
      await t.goto('/design'); await t.js(`localStorage.clear(); localStorage.setItem('stoora.session', 'demo')`);
      await t.goto('/storefront'); await sleep(2500);
      expect(await t.js(`document.querySelectorAll('.sfg-card').length`) === 8, 'the gallery should show 8 templates');
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

    await flow('The public site: home, Journal and sign-up open without errors', async (t) => {
      await t.goto('/'); expect(await t.has('One link for every order'), 'home page headline missing');
      await t.goto('/how-it-works'); await sleep(900);
      expect(await t.js(`Math.abs(document.getElementById('l-how').getBoundingClientRect().top) < 140`), '/how-it-works should open at that section');
      await t.goto('/journal'); await sleep(1500);
      expect(await t.js(`document.querySelector('.jr-orbit').classList.contains('is-ring')`), 'the story ring did not start');
      await t.goto('/signup'); expect(await t.has('Start selling from one link'), 'sign-up screen missing');
      await t.goto('/privacy'); expect(await t.has('Privacy policy'), 'privacy page missing');
    });

    await flow('Open a shop through onboarding', async (t) => {
      await t.goto('/onboarding'); await t.click('Continue'); expect(await t.has('Add your shop’s name'), 'name was not required');
      await t.type('#ob-name', 'Test Bakes'); await t.click('Continue'); await t.type('#ob-pn', 'Chocolate cake'); await t.type('#ob-pp', '850'); await t.click('Continue');
      await t.click('Continue'); await t.click('Continue'); await t.click('Publish my shop');
      expect(await t.waitFor('Test Bakes is live', 8000), 'shop was not published');
      expect(await t.has('stoora.in/test-bakes'), 'shop link was not made from the name');
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
