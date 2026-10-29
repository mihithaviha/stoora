/**
 * The buyer's shopping experience, shared by every storefront template: the cart, the product page,
 * checkout, paying, and the order status pages. A template only decides how things LOOK; this file
 * decides what happens, so switching templates never changes how buying works.
 *
 * Rules:
 *  - The browser never decides a price, a total or whether something was paid. It shows what the server says.
 *  - The cart is saved on the buyer's device, one cart per shop, and checked against the shop before every order.
 *  - A payment is only ever "successful" when the server says the order is paid.
 *
 * All routes are /api/public/<shop>/... and need no login.
 */
(function () {
  'use strict';

  const S = {
    handle: '',
    shop: null,
    lines: [], // { id, variant, qty, name, price, img }
    wish: [], // saved for later on this device: { id, name, price, img }
    info: null, // the last answer of /cart: totals, payment choices, delivery rules
    notices: [], // things changed since the buyer added them (price, stock)
    form: {}, // what the buyer typed at checkout, kept if they go back
    attempt: '', // identifies one checkout attempt, so a double click cannot place two orders
    order: null, // the order just placed in this visit
    opener: null,
    poll: null,
  };

  /* ---------- helpers ---------- */

  const rupees = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
  const esc = (value) =>
    String(value == null ? '' : value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const keyOf = (id, variant) => `${id}|${variant || ''}`;
  const lineKey = (line) => keyOf(line.id, line.variant);
  const isService = (item) => Boolean(item && item.type);
  const optionsOf = (item) => [
    ...new Set(
      String(item.sizes || '')
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ];

  /** Everything the shop sells: what the published storefront shows, or the plain shop list. */
  const catalogue = () =>
    S.shop.storefront
      ? [...S.shop.storefront.data.products, ...S.shop.storefront.data.services]
      : [...S.shop.products, ...S.shop.services];
  const itemOf = (id) => catalogue().find((item) => item.id === id);

  const store = {
    read(name) {
      try {
        return JSON.parse(localStorage.getItem(`stoora.${name}.v1.${S.handle}`) || 'null');
      } catch (_) {
        return null;
      }
    },
    write(name, value) {
      try {
        if (value == null) localStorage.removeItem(`stoora.${name}.v1.${S.handle}`);
        else localStorage.setItem(`stoora.${name}.v1.${S.handle}`, JSON.stringify(value));
      } catch (_) {
        // Private browsing can refuse storage: the cart then lasts only until the page closes.
      }
    },
  };

  async function post(url, body) {
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (_) {
      throw new Error('We could not reach the shop. Check your connection and try again.');
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw Object.assign(new Error(data.error || 'Something went wrong. Please try again.'), {
        status: response.status,
      });
    return data;
  }
  const shopPost = (path, body) => post(`/api/public/${encodeURIComponent(S.handle)}${path}`, body);

  const newId = () => {
    const bytes = new Uint8Array(12);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  /* ---------- the cart (saved per shop on this device) ---------- */

  function load() {
    const saved = store.read('cart');
    S.lines = (Array.isArray(saved) ? saved : [])
      .filter(
        (line) => line && typeof line.id === 'string' && Number.isInteger(line.qty) && line.qty >= 1 && line.qty <= 20,
      )
      .slice(0, 40)
      .map((line) => ({
        id: line.id,
        variant: String(line.variant || ''),
        qty: line.qty,
        name: String(line.name || ''),
        price: Number(line.price) || 0,
        img: String(line.img || ''),
      }));
  }
  /* ---------- saved for later (a list kept on this device, per shop; there are no buyer accounts) ---------- */

  function loadWish() {
    const saved = store.read('wish');
    S.wish = (Array.isArray(saved) ? saved : [])
      .filter((entry) => entry && typeof entry.id === 'string')
      .slice(0, 60)
      .map((entry) => ({ id: entry.id, name: String(entry.name || ''), price: Number(entry.price) || 0, img: String(entry.img || '') }));
  }
  const wishIds = () => S.wish.map((entry) => entry.id);
  const isSaved = (id) => S.wish.some((entry) => entry.id === id);
  function saveWish() {
    store.write('wish', S.wish.length ? S.wish : null);
    if (typeof S.onChange === 'function') S.onChange();
  }
  function toggleWish(id) {
    if (isSaved(id)) {
      S.wish = S.wish.filter((entry) => entry.id !== id);
      saveWish();
      return say('Removed from your saved items');
    }
    const item = itemOf(id);
    if (!item || isService(item)) return say('That item is not available any more.');
    if (S.wish.length >= 60) return say('Your saved list is full. Remove something first.');
    S.wish.unshift({ id, name: item.name, price: item.price, img: item.img || '' });
    saveWish();
    say('Saved. Find it under Saved.');
  }
  /** Why a saved item cannot be bought right now, or '' when it can. Judged from the live catalogue. */
  function wishProblem(entry) {
    const item = itemOf(entry.id);
    if (!item) return 'No longer available';
    if (item.stock != null && item.stock <= 0) return 'Sold out';
    return '';
  }
  function openWish() {
    if (!S.wish.length) {
      return show(
        `<div class="cm-head"><h2>Saved items</h2>${closeButton}</div><div class="cm-empty"><p><b>Nothing saved yet.</b></p><p>Tap the heart on a product to keep it here for later.</p><button class="cm-btn cm-primary" type="button" data-cm="close">Keep browsing</button></div>`,
        'Saved items',
      );
    }
    const rows = S.wish
      .map((entry) => {
        const live = itemOf(entry.id);
        const item = live || entry;
        const problem = wishProblem(entry);
        const sized = live && optionsOf(live).length;
        return `<li class="cm-line ${problem ? 'bad' : ''}">${photo(item)}<div class="cm-line-body"><b>${esc(item.name)}</b><span class="cm-sub">${rupees(item.price)}</span>${problem ? `<span class="cm-problem">${esc(problem)}</span>` : ''}<div class="cm-actions tight">${problem ? '' : `<button class="cm-btn" type="button" data-cm="wview" data-id="${esc(entry.id)}">View</button><button class="cm-btn cm-primary" type="button" data-cm="wtobag" data-id="${esc(entry.id)}">${sized ? 'Choose size' : 'Move to bag'}</button>`}</div></div><div class="cm-line-end"><button type="button" class="cm-link" data-cm="wremove" data-id="${esc(entry.id)}" aria-label="Remove ${esc(item.name)} from saved items">Remove</button></div></li>`;
      })
      .join('');
    show(
      `<div class="cm-head"><h2>Saved items <small>${S.wish.length}</small></h2>${closeButton}</div><ul class="cm-lines">${rows}</ul><div class="cm-actions"><button class="cm-btn" type="button" data-cm="close">Keep browsing</button></div>`,
      'Saved items',
    );
  }

  const save = () => {
    store.write('cart', S.lines.length ? S.lines : null);
    if (typeof S.onChange === 'function') S.onChange();
  };

  const count = () => S.lines.reduce((sum, line) => sum + line.qty, 0);
  const subtotal = () => S.lines.reduce((sum, line) => sum + line.qty * line.price, 0);
  /** How many of one product the cart holds (all sizes together), for the stock limit. */
  const heldOf = (id) => S.lines.filter((line) => line.id === id).reduce((sum, line) => sum + line.qty, 0);
  /** Quantity by product id, for the templates' "Add / stepper" control (products without sizes). */
  const qtyById = () => {
    const map = {};
    for (const line of S.lines) if (!line.variant) map[line.id] = (map[line.id] || 0) + line.qty;
    return map;
  };
  const hasProducts = () => S.lines.some((line) => !isService(itemOf(line.id)));
  const limitOf = (item) => (!isService(item) && item.stock != null ? Math.min(20, Math.max(0, item.stock)) : 20);

  function deliveryFee(sub = subtotal()) {
    const { fee, freeAbove } = S.shop.delivery;
    if (!hasProducts() || !fee) return 0;
    return freeAbove && sub >= freeAbove ? 0 : fee;
  }

  /** Put something in the cart. Returns { ok, message }. */
  function add(id, variant = '', qty = 1) {
    const item = itemOf(id);
    if (!item) return { ok: false, message: 'That item is not available any more.' };
    const options = optionsOf(item);
    if (options.length && !options.includes(variant)) return { ok: false, message: 'Choose a size first.' };
    const room = limitOf(item) - heldOf(id);
    if (room <= 0)
      return {
        ok: false,
        message:
          isService(item) || item.stock == null
            ? 'You have the most you can order.'
            : item.stock <= 0
              ? 'Sold out.'
              : `Only ${item.stock} available.`,
      };
    const take = Math.min(qty, room);
    const line = S.lines.find((entry) => lineKey(entry) === keyOf(id, variant));
    if (line) line.qty += take;
    else
      S.lines.push({
        id,
        variant: options.length ? variant : '',
        qty: take,
        name: item.name,
        price: item.price,
        img: item.img || '',
      });
    save();
    return { ok: true, message: take < qty ? `Only ${take} more could be added.` : '' };
  }
  function change(key, delta) {
    const line = S.lines.find((entry) => lineKey(entry) === key);
    if (!line) return;
    const item = itemOf(line.id);
    const room = item ? limitOf(item) - heldOf(line.id) : 0;
    const next = line.qty + delta;
    if (next < 1) S.lines = S.lines.filter((entry) => entry !== line);
    else if (delta > 0 && room <= 0)
      return say(item && item.stock != null ? `Only ${item.stock} available.` : 'You have the most you can order.');
    else line.qty = next;
    save();
  }
  const remove = (key) => {
    S.lines = S.lines.filter((entry) => lineKey(entry) !== key);
    save();
  };
  function clear() {
    S.lines = [];
    S.info = null;
    S.notices = [];
    save();
  }

  /**
   * One checkout attempt has one id, kept on the device while the bag stays the same. Clicking twice, going back
   * and trying again, or reloading the page all give back the same order instead of placing a second one.
   */
  function attemptId() {
    // The payment choice is part of the attempt: switching from online to "pay the shop" must start a new order, not reopen the old one.
    const signature = JSON.stringify([S.form.payment || "", S.lines.map((line) => [line.id, line.variant, line.qty])]);
    const saved = store.read('attempt');
    if (saved && saved.signature === signature) return saved.id;
    const id = newId();
    store.write('attempt', { id, signature });
    return id;
  }

  /* ---------- the sheet everything appears in ---------- */

  function sheetElement() {
    let sheet = document.getElementById('cm-sheet');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'cm-sheet';
      sheet.className = 'cm-sheet';
      sheet.innerHTML = '<div class="cm-panel" id="cm-panel" role="dialog" aria-modal="true" tabindex="-1"></div>';
      document.body.appendChild(sheet);
      const live = document.createElement('div');
      live.id = 'cm-live';
      live.className = 'cm-live';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      document.body.appendChild(live);
      sheet.addEventListener('mousedown', (event) => {
        if (event.target === sheet) close();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && sheet.classList.contains('on')) close();
      });
    }
    return sheet;
  }
  const panel = () => document.getElementById('cm-panel');

  function show(html, label) {
    const sheet = sheetElement();
    if (!sheet.classList.contains('on')) S.opener = document.activeElement;
    // The sheet takes the shop's own colours.
    const themed = document.querySelector('[class~="sf"][style]');
    sheet.setAttribute('style', themed ? themed.getAttribute('style') : '');
    panel().setAttribute('aria-label', label);
    panel().innerHTML = html;
    sheet.classList.add('on');
    document.body.classList.add('cm-open');
    const first = panel().querySelector('[autofocus], input:not([type=hidden]), button.cm-primary, button');
    panel().scrollTop = 0;
    (first || panel()).focus({ preventScroll: true });
  }
  function close() {
    stopPolling();
    const sheet = document.getElementById('cm-sheet');
    if (sheet) sheet.classList.remove('on');
    document.body.classList.remove('cm-open');
    if (S.opener && S.opener.focus) S.opener.focus({ preventScroll: true });
  }
  /** A short message that stays on screen for a moment, over the page or the sheet. */
  function say(message) {
    sheetElement();
    const live = document.getElementById('cm-live');
    live.textContent = '';
    live.textContent = message;
    live.classList.add('on');
    clearTimeout(say.timer);
    say.timer = setTimeout(() => live.classList.remove('on'), 2600);
  }
  const spinner = (text) =>
    `<div class="cm-wait"><span class="cm-spin" aria-hidden="true"></span><p>${esc(text)}</p></div>`;
  const closeButton = '<button class="cm-x" type="button" data-cm="close" aria-label="Close">×</button>';

  /* ---------- small pieces ---------- */

  const photo = (line, size = '') =>
    `<span class="cm-photo ${size}">${line.img ? `<img src="${esc(line.img)}" alt="" loading="lazy">` : `<b aria-hidden="true">${esc((line.name || '?')[0].toUpperCase())}</b>`}</span>`;

  const stepper = (key, qty, name) =>
    `<div class="cm-step" role="group" aria-label="Quantity of ${esc(name)}"><button type="button" data-cm="less" data-key="${esc(key)}" aria-label="One less">−</button><span aria-live="polite">${qty}</span><button type="button" data-cm="more" data-key="${esc(key)}" aria-label="One more">+</button></div>`;

  const FULFIL = {
    placed: 'Order received',
    confirmed: 'Confirmed',
    processing: 'Being prepared',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  const PAYMENT = {
    paid: 'Paid',
    awaiting_payment: 'Awaiting payment',
    failed: 'Payment failed',
    pending: 'Payment to be arranged',
    refunded: 'Refunded',
  };
  const chip = (text, tone) => `<span class="cm-chip ${tone || ''}">${esc(text)}</span>`;

  function totalsBlock({ sub, fee, total }, freeAbove) {
    return `<dl class="cm-totals"><div><dt>Subtotal</dt><dd>${rupees(sub)}</dd></div>
      ${fee ? `<div><dt>Delivery</dt><dd>${rupees(fee)}</dd></div>` : hasProducts() && S.shop.delivery.fee ? '<div><dt>Delivery</dt><dd>Free</dd></div>' : ''}
      ${freeAbove && fee && S.shop.delivery.freeAbove ? `<p class="cm-hint">Free delivery on orders of ${rupees(S.shop.delivery.freeAbove)} or more.</p>` : ''}
      <div class="cm-grand"><dt>Total payable</dt><dd>${rupees(total)}</dd></div></dl>`;
  }

  /* ---------- the cart screen ---------- */

  /** Ask the shop for today's prices and stock, and bring the cart in line. */
  async function refreshCart() {
    if (!S.lines.length) {
      S.info = null;
      return;
    }
    const data = await shopPost('/cart', {
      items: S.lines.map((line) => ({ id: line.id, variant: line.variant, qty: line.qty })),
    });
    S.notices = [];
    const kept = [];
    data.lines.forEach((answer, n) => {
      const line = S.lines[n];
      if (!line) return;
      if (answer.available || answer.reason === 'Choose a size') {
        if (answer.name) line.name = answer.name;
        if (answer.img != null) line.img = answer.img;
        if (answer.available && answer.price !== line.price) {
          S.notices.push(`The price of ${line.name} is now ${rupees(answer.price)}.`);
          line.price = answer.price;
        }
        if (answer.available && answer.quantity !== line.qty) {
          S.notices.push(`We lowered ${line.name} to ${answer.quantity} because that is all that is available.`);
          line.qty = answer.quantity;
        }
      }
      line.problem = answer.available ? '' : answer.reason || 'Not available';
      kept.push(line);
    });
    S.lines = kept;
    S.info = data;
    store.write('cart', S.lines);
    if (typeof S.onChange === 'function') S.onChange();
  }

  async function openCart() {
    show(spinner('Loading your bag…'), 'Your bag');
    if (S.lines.length) {
      try {
        await refreshCart();
      } catch (error) {
        S.notices = [error.message];
      }
    }
    drawCart();
  }

  function drawCart() {
    if (!S.lines.length) {
      return show(
        `<div class="cm-head"><h2>Your bag</h2>${closeButton}</div>
        <div class="cm-empty"><p><b>Your bag is empty.</b></p><p>Add something you like and it will wait for you here.</p><button class="cm-btn cm-primary" type="button" data-cm="close">Start shopping</button></div>`,
        'Your bag',
      );
    }
    const sub = subtotal();
    const fee = deliveryFee(sub);
    const blocked = S.lines.some((line) => line.problem);
    const items = S.lines
      .map((line) => {
        const key = lineKey(line);
        return `<li class="cm-line ${line.problem ? 'bad' : ''}">${photo(line)}
          <div class="cm-line-body"><b>${esc(line.name)}</b>${line.variant ? `<span class="cm-sub">Size ${esc(line.variant)}</span>` : ''}
            <span class="cm-sub">${rupees(line.price)} each</span>
            ${line.problem ? `<span class="cm-problem">${esc(line.problem)}</span>` : stepper(key, line.qty, line.name)}</div>
          <div class="cm-line-end"><b>${line.problem ? '' : rupees(line.price * line.qty)}</b><button type="button" class="cm-link" data-cm="remove" data-key="${esc(key)}" aria-label="Remove ${esc(line.name)}">Remove</button></div></li>`;
      })
      .join('');
    show(
      `<div class="cm-head"><h2>Your bag <small>${count()} item${count() === 1 ? '' : 's'}</small></h2>${closeButton}</div>
      ${S.notices.length ? `<div class="cm-note" role="status">${S.notices.map(esc).join('<br>')}</div>` : ''}
      <ul class="cm-lines">${items}</ul>
      ${totalsBlock({ sub, fee, total: sub + fee }, true)}
      ${blocked ? '<p class="cm-error" role="alert">Remove the unavailable items to continue.</p>' : ''}
      <div class="cm-actions"><button class="cm-btn" type="button" data-cm="close">Continue shopping</button><button class="cm-btn cm-primary" type="button" data-cm="checkout" ${blocked ? 'disabled' : ''}>Checkout</button></div>`,
      'Your bag',
    );
  }

  /* ---------- the product page ---------- */

  function openProduct(id) {
    const item = itemOf(id);
    if (!item) return;
    const options = optionsOf(item);
    const out = !isService(item) && item.stock != null && item.stock <= 0;
    const rating = S.shop.ratings && S.shop.ratings[id];
    const policy = (S.shop.policies.shipping || '').slice(0, 160);
    const returns = (S.shop.policies.refund || '').slice(0, 160);
    const delivery = S.shop.delivery;
    const state = { variant: options.length === 1 ? options[0] : '', qty: 1 };

    const draw = (message = '', added = false) => {
      const room = Math.max(0, limitOf(item) - heldOf(id));
      show(
        `<div class="cm-head"><span></span>${closeButton}</div>
        <div class="cm-product">
          <div class="cm-hero">${item.img ? `<img src="${esc(item.img)}" alt="${esc(item.name)}">` : `<b aria-hidden="true">${esc(item.name[0].toUpperCase())}</b>`}</div>
          <div class="cm-product-body">
            <h2>${esc(item.name)}</h2>
            ${isService(item) ? '' : `<button class="cm-btn cm-save" type="button" data-cm="wsheet" aria-pressed="${isSaved(id)}">${isSaved(id) ? '♥ Saved' : '♡ Save for later'}</button>`}
            ${rating ? `<p class="cm-sub">${'★'.repeat(Math.round(rating.average))}${'☆'.repeat(5 - Math.round(rating.average))} ${rating.average.toFixed(1)} (${rating.count})</p>` : ''}
            <p class="cm-price">${rupees(item.price)}</p>
            <p class="cm-stock ${out ? 'out' : item.stock != null && item.stock <= 3 ? 'low' : 'in'}">${out ? 'Sold out' : item.stock != null && item.stock <= 3 ? `Only ${item.stock} left` : 'In stock'}</p>
            ${item.desc ? `<p class="cm-desc">${esc(item.desc)}</p>` : ''}
            ${options.length ? `<fieldset class="cm-options"><legend>Size</legend>${options.map((option) => `<label class="cm-option"><input type="radio" name="size" value="${esc(option)}" ${state.variant === option ? 'checked' : ''}><span>${esc(option)}</span></label>`).join('')}</fieldset>` : ''}
            ${
              out
                ? ''
                : `<div class="cm-buyrow"><div class="cm-step" role="group" aria-label="Quantity"><button type="button" data-cm="pless" aria-label="One less">−</button><span id="cm-qty" aria-live="polite">${state.qty}</span><button type="button" data-cm="pmore" aria-label="One more">+</button></div>
              <button class="cm-btn cm-primary" type="button" data-cm="addto" ${room <= 0 ? 'disabled' : ''}>${room <= 0 ? 'You have the most in your bag' : 'Add to bag'}</button></div>`
            }
            <p class="cm-error" id="cm-msg" role="alert" ${message && !added ? '' : 'hidden'}>${esc(message)}</p>
            ${added ? `<div class="cm-note ok" role="status"><b>Added to your bag.</b><div class="cm-actions tight"><button class="cm-btn" type="button" data-cm="close">Keep shopping</button><button class="cm-btn cm-primary" type="button" data-cm="cart">View bag</button></div></div>` : ''}
            <ul class="cm-facts">
              <li><b>Delivery:</b> ${delivery.fee ? `${rupees(delivery.fee)}${delivery.freeAbove ? `, free on orders of ${rupees(delivery.freeAbove)} or more` : ''}.` : 'Set by the shop.'}${policy ? ` ${esc(policy)}` : ''}</li>
              ${returns ? `<li><b>Returns:</b> ${esc(returns)}</li>` : ''}
              ${S.shop.pricesIncludeGst ? '<li>Prices include GST.</li>' : ''}
            </ul>
          </div>
        </div>`,
        item.name,
      );
      panel()
        .querySelector('[data-cm="wsheet"]')
        ?.addEventListener('click', () => {
          toggleWish(id);
          draw();
        });
      const group = panel().querySelector('.cm-options');
      if (group) group.addEventListener('change', (event) => (state.variant = event.target.value));
      panel()
        .querySelector('[data-cm="pless"]')
        ?.addEventListener('click', () => {
          state.qty = Math.max(1, state.qty - 1);
          panel().querySelector('#cm-qty').textContent = state.qty;
        });
      panel()
        .querySelector('[data-cm="pmore"]')
        ?.addEventListener('click', () => {
          state.qty = Math.min(Math.max(1, limitOf(item) - heldOf(id)), state.qty + 1);
          panel().querySelector('#cm-qty').textContent = state.qty;
        });
      panel()
        .querySelector('[data-cm="addto"]')
        ?.addEventListener('click', () => {
          const result = add(id, state.variant, state.qty);
          if (result.ok) draw(result.message, true);
          else {
            const box = panel().querySelector('#cm-msg');
            box.textContent = result.message;
            box.hidden = false;
          }
        });
    };
    draw();
  }

  /* ---------- checkout ---------- */

  async function openCheckout() {
    if (!S.lines.length) return openCart();
    show(spinner('Checking your bag…'), 'Checkout');
    try {
      await refreshCart();
    } catch (error) {
      return drawProblem(error.message, 'checkout');
    }
    if (!S.lines.length || S.lines.some((line) => line.problem)) return drawCart();
    drawCheckout();
  }

  function drawProblem(message, retry) {
    show(
      `<div class="cm-head"><h2>Something went wrong</h2>${closeButton}</div><p class="cm-error" role="alert">${esc(message)}</p>
      <div class="cm-actions"><button class="cm-btn" type="button" data-cm="close">Close</button>${retry ? `<button class="cm-btn cm-primary" type="button" data-cm="${retry}">Try again</button>` : ''}</div>`,
      'Problem',
    );
  }

  function drawCheckout(error = '') {
    const info = S.info;
    const sub = info.subtotal;
    const fee = info.deliveryFee;
    const physical = hasProducts();
    const needAddress = physical && info.requireAddress;
    const pay = info.payments;
    const f = S.form;
    f.payment =
      f.payment && ((f.payment === 'online' && pay.online) || (f.payment === 'manual' && pay.manual))
        ? f.payment
        : pay.online
          ? 'online'
          : 'manual';
    const nothing = !pay.online && !pay.manual;
    const field = (id, label, extra = '') =>
      `<div class="cm-field"><label for="cm-${id}">${label}</label>${extra}</div>`;
    show(
      `<div class="cm-head"><h2>Checkout</h2>${closeButton}</div>
      <details class="cm-summary"><summary>${count()} item${count() === 1 ? '' : 's'} · ${rupees(sub + fee)}</summary>
        <ul class="cm-mini">${S.lines.map((line) => `<li><span>${esc(line.name)}${line.variant ? ` (${esc(line.variant)})` : ''} × ${line.qty}</span><b>${rupees(line.price * line.qty)}</b></li>`).join('')}</ul>${totalsBlock({ sub, fee, total: sub + fee })}</details>
      <form id="cm-form" novalidate>
        <h3>Your details</h3>
        ${field('name', 'Full name', `<input class="cm-input" id="cm-name" name="name" autocomplete="name" maxlength="80" value="${esc(f.name || '')}" required>`)}
        ${field('phone', 'Phone number', `<input class="cm-input" id="cm-phone" name="phone" inputmode="tel" autocomplete="tel" maxlength="16" placeholder="98765 43210" value="${esc(f.phone || '')}" required>`)}
        ${field('email', 'Email <small>(optional, for your receipt)</small>', `<input class="cm-input" id="cm-email" name="email" type="email" autocomplete="email" maxlength="120" value="${esc(f.email || '')}">`)}
        ${
          physical
            ? `<h3>Delivery address</h3>
          ${field('address', `Address${needAddress ? '' : ' <small>(optional)</small>'}`, `<textarea class="cm-input" id="cm-address" name="address" autocomplete="street-address" maxlength="300" rows="2">${esc(f.address || '')}</textarea>`)}
          <div class="cm-two">${field('city', `City${needAddress ? '' : ' <small>(optional)</small>'}`, `<input class="cm-input" id="cm-city" name="city" autocomplete="address-level2" maxlength="60" value="${esc(f.city || '')}">`)}
          ${field('pincode', `PIN code${needAddress ? '' : ' <small>(optional)</small>'}`, `<input class="cm-input" id="cm-pincode" name="pincode" inputmode="numeric" autocomplete="postal-code" maxlength="6" value="${esc(f.pincode || '')}">`)}</div>
          ${field('state', 'State <small>(optional)</small>', `<input class="cm-input" id="cm-state" name="state" autocomplete="address-level1" maxlength="60" value="${esc(f.state || '')}">`)}
          ${field('instructions', 'Delivery instructions <small>(optional)</small>', `<input class="cm-input" id="cm-instructions" name="instructions" maxlength="300" value="${esc(f.instructions || '')}">`)}`
            : ''
        }
        <h3>Payment</h3>
        ${
          nothing
            ? '<p class="cm-error">This shop is not taking orders right now. Please contact the shop.</p>'
            : `<div class="cm-pay" role="radiogroup" aria-label="Payment method">
          ${pay.online ? `<label class="cm-paychoice"><input type="radio" name="payment" value="online" ${f.payment === 'online' ? 'checked' : ''}><span><b>Pay online</b><small>Securely with Razorpay. You will choose how to pay in the next step.</small></span></label>` : ''}
          ${pay.manual ? `<label class="cm-paychoice"><input type="radio" name="payment" value="manual" ${f.payment === 'manual' ? 'checked' : ''}><span><b>Pay the shop directly</b><small>${esc(pay.instructions || 'The shop will tell you how to pay after you place the order. Your order is not paid until the shop confirms it.')}</small></span></label>` : ''}</div>`
        }
        ${totalsBlock({ sub, fee, total: sub + fee })}
        <p class="cm-error" id="cm-error" role="alert" ${error ? '' : 'hidden'}>${esc(error)}</p>
        <div class="cm-actions"><button class="cm-btn" type="button" data-cm="cart">Back to bag</button><button class="cm-btn cm-primary" id="cm-submit" type="submit" ${nothing ? 'disabled' : ''}>${f.payment === 'online' ? `Pay ${rupees(sub + fee)}` : 'Place order'}</button></div>
      </form>`,
      'Checkout',
    );
    const form = panel().querySelector('#cm-form');
    const remember = () => {
      for (const element of form.elements)
        if (element.name && element.type !== 'radio') f[element.name] = element.value;
      const chosen = form.querySelector('input[name=payment]:checked');
      if (chosen) f.payment = chosen.value;
    };
    form.addEventListener('input', remember);
    form.addEventListener('change', (event) => {
      remember();
      if (event.target.name === 'payment')
        form.querySelector('#cm-submit').textContent =
          f.payment === 'online' ? `Pay ${rupees(sub + fee)}` : 'Place order';
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      remember();
      submitOrder(needAddress, physical);
    });
  }

  function validate(needAddress, physical) {
    const f = S.form;
    const phone = String(f.phone || '')
      .replace(/\D/g, '')
      .slice(-10);
    if (String(f.name || '').trim().length < 2) return ['Please enter your name.', 'name'];
    if (phone.length !== 10) return ['Please enter a 10-digit phone number.', 'phone'];
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email))
      return ['That email address does not look right.', 'email'];
    if (physical && needAddress) {
      if (String(f.address || '').trim().length < 6) return ['Please enter your delivery address.', 'address'];
      if (String(f.city || '').trim().length < 2) return ['Please enter your city.', 'city'];
      if (!/^\d{6}$/.test(String(f.pincode || '').trim())) return ['Please enter a 6-digit PIN code.', 'pincode'];
    } else if (physical && f.pincode && !/^\d{6}$/.test(String(f.pincode).trim()))
      return ['That PIN code does not look right.', 'pincode'];
    return null;
  }

  async function submitOrder(needAddress, physical) {
    const problem = validate(needAddress, physical);
    const box = panel().querySelector('#cm-error');
    if (problem) {
      box.textContent = problem[0];
      box.hidden = false;
      const field = panel().querySelector(`#cm-${problem[1]}`);
      if (field) field.focus();
      return;
    }
    const button = panel().querySelector('#cm-submit');
    if (button.disabled) return;
    button.disabled = true;
    button.textContent = 'Please wait…';
    box.hidden = true;
    const f = S.form;
    S.attempt = attemptId();
    const phone = String(f.phone).replace(/\D/g, '').slice(-10);
    try {
      const order = await shopPost('/checkout', {
        requestId: S.attempt,
        name: f.name,
        phone,
        email: f.email || '',
        address: f.address || '',
        city: f.city || '',
        state: f.state || '',
        pincode: f.pincode || '',
        instructions: f.instructions || '',
        payment: f.payment,
        items: S.lines.map((line) => ({ id: line.id, variant: line.variant, qty: line.qty })),
      });
      S.order = { id: order.orderId, phone, email: f.email || '', name: f.name, total: order.total };
      store.write('order', { id: order.orderId, phone });
      if (order.payment) {
        // An online order keeps the bag until the payment is confirmed, so a failed payment loses nothing.
        return payWithRazorpay(order.payment);
      }
      await showOrder(order.orderId, phone, { justPlaced: true });
    } catch (error) {
      if (error.status === 400 || error.status === 409 || error.status === 503) store.write('attempt', null);
      drawCheckout(error.message);
    }
  }

  /* ---------- paying online ---------- */

  let razorpayScript = null;
  function loadRazorpay() {
    if (window.Razorpay) return Promise.resolve();
    razorpayScript =
      razorpayScript ||
      new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = resolve;
        script.onerror = () => {
          razorpayScript = null;
          reject(new Error('The payment window could not load. Check your connection.'));
        };
        document.head.appendChild(script);
      });
    return razorpayScript;
  }

  async function payWithRazorpay(payment) {
    const order = S.order;
    show(spinner('Opening the secure payment window…'), 'Payment');
    try {
      await loadRazorpay();
    } catch (error) {
      return showOrder(order.id, order.phone, { notice: error.message });
    }
    let failure = '';
    const themed = getComputedStyle(document.getElementById('cm-sheet')).getPropertyValue('--store-primary').trim();
    const checkout = new window.Razorpay({
      key: payment.keyId,
      amount: payment.amount,
      currency: payment.currency,
      order_id: payment.orderId,
      name: S.shop.shop,
      description: `Order #${order.id}`,
      prefill: { name: order.name, contact: order.phone, email: order.email || undefined },
      theme: { color: themed || '#EA5B1E' },
      handler: async (response) => {
        show(spinner('Confirming your payment…'), 'Payment');
        try {
          await post('/api/public/razorpay/verify', response);
          await showOrder(order.id, order.phone, { justPlaced: true });
        } catch (_) {
          // The money may have moved even though our proof check failed: ask the shop's server, never assume.
          await showOrder(order.id, order.phone, { pending: true });
        }
      },
      modal: {
        ondismiss: () =>
          showOrder(order.id, order.phone, {
            notice:
              failure ||
              'You closed the payment window before it finished. You have not been charged unless the status below says Paid.',
          }),
      },
    });
    checkout.on('payment.failed', (event) => {
      failure = `The payment did not go through${event.error && event.error.description ? `: ${event.error.description}` : ''}. You can try again.`;
    });
    checkout.open();
  }

  /* ---------- an order: confirmation, pending, failed, tracking ---------- */

  function stopPolling() {
    if (S.poll) clearTimeout(S.poll.timer);
    S.poll = null;
  }

  /** Show an order. Asks the server where it stands (and the server asks Razorpay if a payment is late). */
  async function showOrder(id, phone, options = {}) {
    stopPolling();
    show(spinner('Checking your order…'), 'Your order');
    let order;
    try {
      order = await shopPost(`/orders/${encodeURIComponent(id)}/sync`, { phone });
    } catch (error) {
      return drawProblem(error.message, null);
    }
    drawOrder(order, phone, options);
    if (options.pending && !order.paid && order.canRetryPayment) {
      let tries = 0;
      const tick = async () => {
        if (!document.getElementById('cm-sheet').classList.contains('on') || tries >= 12) return;
        tries += 1;
        try {
          const next = await shopPost(`/orders/${encodeURIComponent(id)}/sync`, { phone });
          if (next.paid || tries >= 12) return drawOrder(next, phone, { justPlaced: next.paid });
        } catch (_) {
          // Try again on the next tick.
        }
        S.poll = { timer: setTimeout(tick, 5000) };
      };
      S.poll = { timer: setTimeout(tick, 4000) };
    }
  }

  function drawOrder(order, phone, options = {}) {
    const mine = S.order && String(S.order.id) === String(order.id);
    // The bag is emptied only once the order is really settled: paid, or placed to be paid directly.
    if (mine && (order.paid || order.payMode === 'manual')) {
      clear();
      S.order = null;
    }
    const cancelled = order.fulfil === 'cancelled';
    let tone = 'wait';
    let heading = 'Order placed';
    let lead = '';
    if (order.paid && !order.refunded) {
      tone = 'ok';
      heading = options.justPlaced ? 'Payment successful' : 'Payment received';
      lead = 'Thank you. The shop has your payment and will start on your order.';
    } else if (order.refunded) {
      heading = 'Order refunded';
      lead = 'This order has been refunded. The money returns to your account in a few days, depending on your bank.';
    } else if (cancelled) {
      tone = 'bad';
      heading = 'Order cancelled';
      lead = order.expired
        ? 'This order was cancelled because the payment was not made in time. Nothing was charged. You can place it again.'
        : 'This order was cancelled.';
    } else if (order.payMode === 'online') {
      if (options.pending) {
        heading = 'Confirming your payment';
        lead =
          'We have not had confirmation from your bank yet. This can take a minute. Please do not pay again: this page updates by itself.';
      } else if (order.payStatus === 'failed') {
        tone = 'bad';
        heading = 'Payment not confirmed';
        lead = 'Your payment did not go through, and you have not been charged. Your items are saved for you.';
      } else {
        tone = 'bad';
        heading = 'Payment not completed';
        lead = 'Your order is saved, but it is not paid yet. Finish the payment to confirm it.';
      }
    } else {
      heading = 'Order placed';
      lead = 'The shop has your order. It is not paid yet: payment is arranged directly with the shop.';
    }

    const upiLink =
      order.manual && order.manual.upi
        ? `upi://pay?pa=${encodeURIComponent(order.manual.upi)}&pn=${encodeURIComponent(S.shop.shop)}&am=${order.total}&cu=INR&tn=${encodeURIComponent('Order #' + order.id)}`
        : '';
    const retry = order.canRetryPayment && !options.pending;
    show(
      `<div class="cm-head"><h2>${esc(heading)}</h2>${closeButton}</div>
      <div class="cm-banner ${tone}" role="status">${esc(lead)}${options.notice ? `<br><b>${esc(options.notice)}</b>` : ''}</div>
      <p class="cm-ref">Order reference <b>#${esc(order.id)}</b> · ${esc(order.when || '')}</p>
      <div class="cm-chips">${chip(PAYMENT[order.payStatus] || 'Pending', order.paid ? 'ok' : order.payStatus === 'failed' ? 'bad' : '')}${chip(FULFIL[order.fulfil] || 'Order received', cancelled ? 'bad' : order.fulfil === 'delivered' ? 'ok' : '')}</div>
      <ul class="cm-lines compact">${order.items.map((item) => `<li class="cm-line">${photo(item, 'sm')}<div class="cm-line-body"><b>${esc(item.name)}</b>${item.variant ? `<span class="cm-sub">Size ${esc(item.variant)}</span>` : ''}<span class="cm-sub">Quantity ${item.quantity}</span></div><div class="cm-line-end"><b>${item.price ? rupees(item.price * item.quantity) : ''}</b>${(order.paid || order.shipped) && !item.reviewed ? `<button type="button" class="cm-link" data-cm="review" data-item="${esc(item.id)}">Rate</button>` : ''}</div></li>`).join('')}</ul>
      <dl class="cm-totals"><div><dt>Subtotal</dt><dd>${rupees(order.subtotal)}</dd></div>${order.deliveryFee ? `<div><dt>Delivery</dt><dd>${rupees(order.deliveryFee)}</dd></div>` : ''}<div class="cm-grand"><dt>${order.paid ? 'Amount paid' : 'Total'}</dt><dd>${rupees(order.total)}</dd></div></dl>
      ${order.manual ? `<div class="cm-note"><b>How to pay</b><br>${esc(order.manual.instructions || 'The shop will contact you on your phone to arrange payment and delivery.')}${upiLink ? `<div style="margin-top:10px"><a class="cm-btn cm-primary" href="${esc(upiLink)}">Pay ${rupees(order.total)} by UPI</a></div><p class="cm-sub">The shop marks your order paid after it sees the money.</p>` : ''}</div>` : ''}
      ${order.courier || order.tracking ? `<div class="cm-note">${order.courier ? `Courier: <b>${esc(order.courier)}</b><br>` : ''}${order.tracking ? `Tracking number: <b>${esc(order.tracking)}</b>` : ''}</div>` : ''}
      ${order.paid || order.manual ? `<p class="cm-sub">Keep your order number. Follow it any time with “Where is my order?” and your phone number.</p>` : ''}
      <div id="cm-review"></div>
      <div class="cm-actions">
        ${retry ? `<button class="cm-btn cm-primary" type="button" data-cm="retry" data-id="${esc(order.id)}" data-phone="${esc(phone)}">Try payment again</button>` : ''}
        ${order.payMode === 'online' && !order.paid && !cancelled ? `<button class="cm-btn" type="button" data-cm="recheck" data-id="${esc(order.id)}" data-phone="${esc(phone)}">I have paid: check again</button>` : ''}
        ${cancelled ? '<button class="cm-btn cm-primary" type="button" data-cm="cart">Back to my bag</button>' : ''}
        <button class="cm-btn" type="button" data-cm="close">${order.paid || order.manual ? 'Done' : 'Close'}</button>
      </div>`,
      'Your order',
    );
    panel().dataset.order = JSON.stringify({
      id: order.id,
      phone,
      items: order.items.map((item) => ({ id: item.id, name: item.name, reviewed: item.reviewed })),
    });
  }

  /** The buyer picks the payment up again (cancelled window, failed attempt, closed tab). */
  async function retryPayment(id, phone) {
    show(spinner('Opening the payment window…'), 'Payment');
    try {
      const answer = await shopPost(`/orders/${encodeURIComponent(id)}/pay`, { phone });
      S.order = S.order && String(S.order.id) === String(id) ? S.order : { id, phone, name: '', email: '', total: 0 };
      payWithRazorpay(answer.payment);
    } catch (error) {
      showOrder(id, phone, { notice: error.message });
    }
  }

  /* ---------- "Where is my order?" and reviews ---------- */

  function openTracking(message = '') {
    const last = store.read('order') || {};
    show(
      `<div class="cm-head"><h2>Where is my order?</h2>${closeButton}</div>
      <form id="cm-lookup" novalidate>
        <div class="cm-field"><label for="cm-oid">Order number</label><input class="cm-input" id="cm-oid" inputmode="numeric" placeholder="1001" value="${esc(last.id || '')}" autofocus></div>
        <div class="cm-field"><label for="cm-ph">Phone number you used</label><input class="cm-input" id="cm-ph" inputmode="tel" autocomplete="tel" placeholder="98765 43210" value="${esc(last.phone || '')}"></div>
        <p class="cm-error" id="cm-error" role="alert" ${message ? '' : 'hidden'}>${esc(message)}</p>
        <div class="cm-actions"><button class="cm-btn" type="button" data-cm="close">Close</button><button class="cm-btn cm-primary" type="submit">Find my order</button></div></form>`,
      'Where is my order',
    );
    panel()
      .querySelector('#cm-lookup')
      .addEventListener('submit', async (event) => {
        event.preventDefault();
        const id = panel().querySelector('#cm-oid').value.trim();
        const phone = panel().querySelector('#cm-ph').value;
        try {
          const found = await shopPost('/order-status', { orderId: id, phone });
          store.write('order', { id: found.id, phone });
          await showOrder(found.id, phone);
        } catch (error) {
          openTracking(error.message);
        }
      });
  }

  function openReview(productId) {
    const data = JSON.parse(panel().dataset.order || '{}');
    const item = (data.items || []).find((entry) => entry.id === productId);
    if (!item) return;
    const box = panel().querySelector('#cm-review');
    box.innerHTML = `<form id="cm-reviewform" class="cm-reviewform"><b>Rate ${esc(item.name)}</b>
      <div class="cm-field"><select class="cm-input" id="cm-rating"><option value="5">★★★★★ Loved it</option><option value="4">★★★★ Good</option><option value="3">★★★ Okay</option><option value="2">★★ Not great</option><option value="1">★ Poor</option></select></div>
      <div class="cm-field"><textarea class="cm-input" id="cm-comment" maxlength="400" rows="2" placeholder="Say a little about it (optional)"></textarea></div>
      <p class="cm-error" id="cm-rerror" role="alert" hidden></p><button class="cm-btn cm-primary" type="submit">Send my review</button></form>`;
    box.querySelector('#cm-rating').focus();
    box.querySelector('#cm-reviewform').addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await shopPost('/reviews', {
          orderId: data.id,
          phone: data.phone,
          productId,
          rating: Number(box.querySelector('#cm-rating').value),
          comment: box.querySelector('#cm-comment').value,
        });
        box.innerHTML = '<div class="cm-note ok" role="status">Thank you for your review!</div>';
      } catch (error) {
        const message = box.querySelector('#cm-rerror');
        message.textContent = error.message;
        message.hidden = false;
      }
    });
  }

  /* ---------- clicks anywhere on the page ---------- */

  function onClick(event) {
    const target = event.target.closest('[data-d], [data-view], [data-book], [data-cart], [data-cm], [data-wish], [data-wishlist]');
    if (!target) return;
    if (target.dataset.wish) {
      event.preventDefault();
      return toggleWish(target.dataset.wish);
    }
    if (target.hasAttribute('data-wishlist')) return openWish();
    if (target.dataset.cm) {
      const key = target.dataset.key;
      switch (target.dataset.cm) {
        case 'close':
          return close();
        case 'cart':
          return openCart();
        case 'checkout':
          return openCheckout();
        case 'less':
          change(key, -1);
          return drawCart();
        case 'more':
          change(key, 1);
          return drawCart();
        case 'remove':
          remove(key);
          S.notices = [];
          return drawCart();
        case 'retry':
          return retryPayment(target.dataset.id, target.dataset.phone);
        case 'recheck':
          return showOrder(target.dataset.id, target.dataset.phone, { notice: 'Checked just now.' });
        case 'review':
          return openReview(target.dataset.item);
        case 'wview':
          return openProduct(target.dataset.id);
        case 'wremove':
          S.wish = S.wish.filter((entry) => entry.id !== target.dataset.id);
          saveWish();
          return openWish();
        case 'wtobag': {
          const wanted = itemOf(target.dataset.id);
          if (!wanted) return openWish();
          if (optionsOf(wanted).length) return openProduct(wanted.id);
          const result = add(wanted.id, '', 1);
          if (!result.ok) return say(result.message);
          S.wish = S.wish.filter((entry) => entry.id !== wanted.id);
          saveWish();
          say('Moved to your bag');
          return openWish();
        }
        default:
          return;
      }
    }
    if (target.dataset.view) {
      event.preventDefault();
      return openProduct(target.dataset.view);
    }
    if (target.dataset.d) {
      // The Add button and quantity stepper on a product card (products without sizes).
      const id = target.dataset.id;
      const delta = Number(target.dataset.d);
      const result = delta > 0 ? add(id, '', 1) : (change(keyOf(id, ''), -1), { ok: true });
      if (!result.ok || result.message) say(result.message);
      return;
    }
    if (target.dataset.book) {
      // A service is booked straight away: no bag step.
      const id = target.dataset.book;
      if (!S.lines.some((line) => line.id === id)) add(id, '', 1);
      return openCheckout();
    }
    if (target.hasAttribute('data-cart')) return openCart();
  }

  /** Start the buyer experience for one shop. `onChange` runs after every cart change so the page can redraw. */
  function init({ handle, shop, onChange }) {
    S.handle = handle;
    S.shop = shop;
    S.onChange = onChange;
    load();
    loadWish();
    if (!init.bound) {
      document.addEventListener('click', onClick);
      init.bound = true;
    }
  }

  window.StoreCommerce = { init, wishIds, wishCount: () => S.wish.length, openWish, count, subtotal, qtyById, openCart, openCheckout, openTracking, openProduct, close };
})();
