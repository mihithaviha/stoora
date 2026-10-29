/**
 * Forms: add or edit a product or a service (with a photo), new booking, delete.
 */
const FM_ICON = { product: 'shopping_bag', service: 'self_improvement' };
const chk = (on) => `<span class="chk ${on ? 'on' : ''}">${on ? I('check', 14, 2.5) : ''}</span>`;
const switchHtml = (id, on, label) =>
  `<button class="switch ${on ? 'on' : ''}" id="${id}" data-act="toggle" aria-label="${label}"></button>`;
const isOn = (id) => {
  const e = document.getElementById(id);
  return !!(e && e.classList.contains('on'));
};
const form2 = (l, r) => (DESK ? `<div class="cols"><div>${l}</div><div>${r}</div></div>` : l + r);
const numOr = (id, d = null) => {
  const v = gv(id).replace(/[, ]/g, '');
  return v === '' ? d : Number(v);
};
const imgHtml = (src) =>
  `<img src="${src}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block">`;

/**
 * Products and services that did not come from this form (imported, or created by the shop itself) have no thumbnail
 * markup saved. Give them their photo, or an icon, so no screen ever shows the word "undefined". The value is worked
 * out on reading and is not stored, so it never counts as a change to save.
 */
function fillThumbs() {
  const give = (item, icon) => {
    if (item.emoji) return;
    Object.defineProperty(item, 'emoji', {
      configurable: true,
      enumerable: false,
      get: () => (item.img ? imgHtml(item.img) : `<span class="ms">${icon}</span>`),
      set(value) {
        Object.defineProperty(item, 'emoji', { value, writable: true, enumerable: true, configurable: true });
      },
    });
  };
  (D.products || []).forEach((item) => give(item, FM_ICON.product));
  (D.services || []).forEach((item) => give(item, FM_ICON.service));
}

/* ---------- product ---------- */
V.addproduct = () => {
  const p = route.arg ? D.products.find((x) => x.id === route.arg) : null;
  if (!ui.fImg || ui.fImgFor !== (p ? p.id : 'new')) {
    ui.fImg = (p && p.img) || null;
    ui.fImgFor = p ? p.id : 'new';
  }
  const ch = (p && p.channels) || { shop: true };
  const v = (x) => esc(p && p[x] != null ? p[x] : '');
  const left = `<div class="card"><div class="field"><label for="pt">Title</label><input id="pt" class="input" placeholder="e.g. Handblock cotton kurta" data-dirty value="${v('name')}" maxlength="80"></div>
  <div class="field"><label for="pd">Description</label><textarea id="pd" class="input" placeholder="What is it made of? Who is it for?" data-dirty>${esc((p && p.desc) || '')}</textarea><button class="mini ai" style="justify-self:start" data-act="aidesc">${I('spark', 14)} Write it for me</button></div>
  <div class="field"><label>Photos</label><div class="drop"><button class="btn grey sm" data-act="addphoto">${I('img', 16)} ${ui.fImg ? 'Change photo' : 'Add photos'}</button><span class="tiny muted">The photo shows on your shop page.</span><div id="fphoto" style="${ui.fImg ? '' : 'display:none;'}width:72px;height:72px;border-radius:12px;overflow:hidden;margin-top:8px">${ui.fImg ? imgHtml(ui.fImg) : ''}</div></div></div>
  <div class="field" style="margin:0"><label for="pf-cat">Category</label><input id="pf-cat" class="input" placeholder="e.g. Kurtas" data-dirty value="${v('cat')}" maxlength="40"></div></div>
 <div class="card"><div class="box-h"><span class="box-t">Price</span></div><div class="row" style="gap:12px;align-items:flex-start;flex-wrap:wrap">${[
   ['pf-price', 'Price', 'price'],
   ['pf-cmp', 'Compare-at price', 'compare'],
   ['pf-cost', 'Cost per item', 'cost'],
 ]
   .map(
     ([id, l, k]) =>
       `<div class="field sp"><label for="${id}">${l}</label><div class="money-in"><span>₹</span><input id="${id}" inputmode="numeric" placeholder="0" data-dirty value="${v(k)}" aria-label="${l}"></div></div>`,
   )
   .join(
     '',
   )}</div><div class="row"><span class="sp small">Charge GST on this product</span><span class="mini">GST <b>5%</b></span></div></div>
 <div class="card"><div class="box-h"><span class="box-t">Stock</span></div><div class="row"><span class="sp"><b>Track stock</b></span>${switchHtml('pf-track', !p || p.track !== false, 'Track stock')}</div><div class="hr"></div>
  <div class="row"><span class="sp">${esc((USER && USER.shop) || 'Your shop')}${USER && USER.city ? ', ' + esc(USER.city) : ''}</span><div class="step"><button data-act="dirty" aria-label="Less">−</button><input id="pf-stock" inputmode="numeric" value="${p && p.stock != null ? p.stock : ''}" placeholder="0" aria-label="Quantity"><button data-act="dirty" aria-label="More">+</button></div></div></div>
 <div class="card"><div class="box-h"><span class="box-t">Delivery</span></div><div class="row"><span class="sp"><b>Needs shipping</b></span>${switchHtml('pf-ship', !p || p.ship !== false, 'Needs shipping')}</div><div class="hr"></div>
  <div class="row" style="gap:12px;align-items:flex-start"><div class="field sp"><label for="pf-w">Weight</label><div class="money-in"><input id="pf-w" placeholder="0.4" data-dirty value="${v('weight')}" aria-label="Weight"><span style="padding-right:14px" class="muted">kg</span></div></div><div class="field sp" style="margin:0"><label for="pf-pkg">Package</label><select id="pf-pkg" class="input" data-dirty>${['Small pouch · 25 × 20 cm', 'Box · 30 × 20 × 10 cm'].map((o) => `<option ${p && p.pkg === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div></div></div>
 <div class="card"><div class="box-h"><span class="box-t">Sizes and colours</span></div><input id="pf-sizes" class="input" placeholder="e.g. S, M, L, XL" data-dirty value="${v('sizes')}" aria-label="Sizes and colours" maxlength="120"></div>`;
  const right = `<div class="card"><div class="box-h"><span class="box-t">Status</span></div><div class="seg" id="pf-status"><button class="${p && p.status === 'Draft' ? '' : 'on'}" data-act="segsel">Active</button><button class="${p && p.status === 'Draft' ? 'on' : ''}" data-act="segsel">Draft</button></div>${p ? `<button class="btn line sm" style="margin-top:12px" data-act="delitem">Delete product</button>` : ''}</div>
 <div class="card"><div class="box-h"><span class="box-t">Sells on</span></div>${[
   ['shop', 'Shop link'],
 ]
   .map(
     ([k, l]) =>
       `<div class="row" style="padding:5px 0"><button class="chk ${ch[k] !== false ? 'on' : ''}" data-act="chansel" data-k="${k}" aria-label="${l}">${ch[k] !== false ? I('check', 14, 2.5) : ''}</button><span class="sp small">${l}</span></div>`,
   )
   .join('')}</div>
 <div class="card"><div class="box-h"><span class="box-t">Organise</span></div><div class="field"><label for="pf-type">Type</label><input id="pf-type" class="input" placeholder="e.g. Kurta" data-dirty value="${v('type')}" aria-label="Type"></div><div class="field" style="margin:0"><label for="pf-tags">Tags</label><input id="pf-tags" class="input" placeholder="e.g. festive, cotton" data-dirty value="${v('tags')}" aria-label="Tags"></div></div>`;
  return (
    (ui.dirty ? saveRow() : backRow(`${I('tag', 16)} Products`)) +
    `<div class="pad"><h1 class="h1" style="margin:0 0 16px">${p ? 'Edit product' : 'Add product'}</h1>${form2(left, right)}</div>`
  );
};

function saveProduct() {
  const old = route.arg ? D.products.find((x) => x.id === route.arg) : null;
  const name = gv('pt');
  if (name.length < 2) return fmErr('pt', 'Add a title (at least 2 letters)');
  const price = numOr('pf-price');
  if (price == null || !(price >= 0) || isNaN(price)) return fmErr('pf-price', 'Add a price, like 1499');
  const track = isOn('pf-track');
  let stock = numOr('pf-stock', null);
  if (track && (stock == null || isNaN(stock))) stock = 0;
  if (stock != null && (isNaN(stock) || stock < 0 || stock !== Math.floor(stock)))
    return fmErr('pf-stock', 'Stock must be a whole number');
  const status = document.querySelector('#pf-status .on')?.textContent || 'Active';
  const ch = {};
  document.querySelectorAll('[data-act=chansel]').forEach((b) => (ch[b.dataset.k] = b.classList.contains('on')));
  const p = {
    ...(old || {}),
    id: old ? old.id : 'p' + Date.now().toString(36),
    name,
    desc: gv('pd'),
    cat: gv('pf-cat'),
    price,
    compare: numOr('pf-cmp', null),
    cost: numOr('pf-cost', null),
    track,
    stock: track ? stock : null,
    ship: isOn('pf-ship'),
    weight: gv('pf-w'),
    pkg: gv('pf-pkg'),
    sizes: gv('pf-sizes'),
    status,
    channels: ch,
    type: gv('pf-type'),
    tags: gv('pf-tags'),
    img: ui.fImg || null,
  };
  p.emoji = p.img ? imgHtml(p.img) : `<span class="ms">${FM_ICON.product}</span>`;
  if (old) D.products[D.products.indexOf(old)] = p;
  else D.products.unshift(p);
  return p;
}

/* ---------- service ---------- */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
V.addservice = () => {
  const s = route.arg ? D.services.find((x) => x.id === route.arg) : null;
  if (!ui.fImg || ui.fImgFor !== (s ? s.id : 'new')) {
    ui.fImg = (s && s.img) || null;
    ui.fImgFor = s ? s.id : 'new';
  }
  const days = (s && s.days) || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    where = (s && s.where) || 'Online',
    type = (s && s.type) || 'Class';
  const left = `<div class="card"><div class="field"><label for="st">Title</label><input id="st" class="input" placeholder="e.g. Morning yoga (group class)" data-dirty value="${esc((s && s.name) || '')}" maxlength="80"></div>
  <div class="field" style="margin:0"><label>Photo</label><div class="drop"><button class="btn grey sm" data-act="addphoto">${I('img', 16)} ${ui.fImg ? 'Change photo' : 'Add photo'}</button><div id="fphoto" style="${ui.fImg ? '' : 'display:none;'}width:72px;height:72px;border-radius:12px;overflow:hidden;margin-top:8px">${ui.fImg ? imgHtml(ui.fImg) : ''}</div></div></div></div>
 <div class="card"><div class="row" style="align-items:flex-start;gap:12px"><div class="field sp"><label for="sv-price">Price</label><div class="money-in"><span>₹</span><input id="sv-price" inputmode="numeric" placeholder="499" data-dirty value="${s ? s.price : ''}" aria-label="Price"></div></div>
  <div class="field sp"><label for="sv-dur">Duration</label><select id="sv-dur" class="input" data-dirty>${['45 min', '60 min', '90 min'].map((o) => `<option ${((s && s.duration) || '60 min') === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div></div>
  <div class="field" style="margin:0"><label>Where</label><div class="chips" id="sv-where">${['Online', 'At my studio', "At buyer's home"].map((w) => `<button class="chip ${w === where ? 'on' : ''}" data-act="chipsel">${w}</button>`).join('')}</div></div></div>
 <div class="card"><div class="box-h"><span class="box-t">Slots</span></div><div class="field"><label>Days</label><div class="chips" id="sv-days">${DAYS.map((d) => `<button class="chip ${days.includes(d) ? 'on' : ''}" data-act="chiptoggle">${d}</button>`).join('')}</div></div>
  <div class="row" style="gap:12px"><div class="field sp"><label for="sv-time">Time</label><input id="sv-time" class="input" type="time" data-dirty value="${esc((s && s.time) || '07:00')}"></div><div class="field sp"><label for="sv-seats">Seats per class</label><div class="step"><button data-act="dirty" aria-label="Less">−</button><input id="sv-seats" inputmode="numeric" value="${(s && s.seats) || 10}" aria-label="Seats"><button data-act="dirty" aria-label="More">+</button></div></div></div></div>`;
  const right = `<div class="card"><div class="box-h"><span class="box-t">Type</span></div><div class="seg" id="sv-type">${['Class', '1-on-1', 'Digital'].map((t) => `<button class="${t === type ? 'on' : ''}" data-act="segsel">${t}</button>`).join('')}</div>${s ? `<button class="btn line sm" style="margin-top:12px" data-act="delitem">Delete service</button>` : ''}</div>
 <div class="card"><div class="row"><span class="sp"><b>Remind buyers</b><br><span class="small muted">1 hour before it starts</span></span>${switchHtml('sv-remind', !s || s.remind !== false, 'Remind buyers')}</div></div>`;
  return (
    (ui.dirty ? saveRow('service') : backRow(`${I('tag', 16)} Services`)) +
    `<div class="pad"><h1 class="h1" style="margin:0 0 16px">${s ? 'Edit service' : 'Add service'}</h1>${form2(left, right)}</div>`
  );
};

function saveService() {
  const old = route.arg ? D.services.find((x) => x.id === route.arg) : null;
  const name = gv('st');
  if (name.length < 2) return fmErr('st', 'Add a title (at least 2 letters)');
  const price = numOr('sv-price');
  if (price == null || isNaN(price) || price < 0) return fmErr('sv-price', 'Add a price, like 499');
  const seats = numOr('sv-seats', 10);
  if (!(seats >= 1) || seats !== Math.floor(seats)) return fmErr('sv-seats', 'Seats must be 1 or more');
  const type = document.querySelector('#sv-type .on')?.textContent || 'Class',
    days = [...document.querySelectorAll('#sv-days .on')].map((b) => b.textContent),
    time = gv('sv-time') || '07:00';
  const h = +time.slice(0, 2),
    t12 = (h % 12 || 12) + ':' + time.slice(3, 5) + ' ' + (h < 12 ? 'am' : 'pm');
  const next =
    type === 'Digital'
      ? 'Instant download'
      : type === '1-on-1'
        ? (days[0] ? days[0] + ' ' : '') + t12
        : (days[0] ? days[0] + ' ' : '') + t12 + ' · ' + seats + ' seats left';
  const s = {
    ...(old || {}),
    id: old ? old.id : 'v' + Date.now().toString(36),
    name,
    type,
    price,
    duration: gv('sv-dur'),
    where: document.querySelector('#sv-where .on')?.textContent || 'Online',
    days,
    time,
    seats,
    remind: isOn('sv-remind'),
    next,
    img: ui.fImg || null,
  };
  s.emoji = s.img ? imgHtml(s.img) : `<span class="ms">${FM_ICON.service}</span>`;
  if (old) D.services[D.services.indexOf(old)] = s;
  else D.services.unshift(s);
  return s;
}

function fmErr(id, msg) {
  const e = document.getElementById(id);
  if (e) {
    e.classList.add('bad');
    e.setAttribute('aria-invalid', 'true');
    e.focus();
    e.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  toast(msg);
  return null;
}

/* ---------- photo: shrink it in the browser so it stays small ---------- */
/**
 * Choose a product or service photo. For a real shop the photo is uploaded to Stoora (the same image store the
 * storefront builder uses) and only its address is kept on the product, so the product record stays small.
 * The sample shop is read-only, so it keeps a small inline preview.
 */
function addPhoto() {
  pickFile('image/*', (f) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(f.type)) return toast('Use a JPG, PNG or WebP photo');
    const url = URL.createObjectURL(f),
      im = new Image();
    im.onload = () => {
      const m = D.live ? 1200 : 480,
        k = Math.min(1, m / Math.max(im.width, im.height)),
        c = document.createElement('canvas');
      c.width = Math.round(im.width * k);
      c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const box = document.getElementById('fphoto');
      const show = (src) => {
        ui.fImg = src;
        if (box) {
          box.style.display = 'block';
          box.innerHTML = imgHtml(src);
        }
        makeDirty();
      };
      if (!D.live) return show(c.toDataURL('image/jpeg', 0.72));
      ui.fUploading = true;
      if (box) {
        box.style.display = 'block';
        box.innerHTML = '<span class="tiny muted" style="padding:6px;display:block">Uploading…</span>';
      }
      c.toBlob(
        async (blob) => {
          try {
            const response = await fetch('/api/storefront/images', {
              method: 'POST',
              headers: { 'Content-Type': 'image/jpeg' },
              body: blob,
              credentials: 'same-origin',
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || 'The photo could not be uploaded');
            show(result.url);
          } catch (error) {
            if (box) box.innerHTML = ui.fImg ? imgHtml(ui.fImg) : '';
            if (box && !ui.fImg) box.style.display = 'none';
            toast(error.message);
          }
          ui.fUploading = false;
        },
        'image/jpeg',
        0.82,
      );
    };
    im.onerror = () => toast('That photo could not be read');
    im.src = url;
  });
}

/* ---------- new booking ---------- */
function newBooking() {
  if (!D.services.length) {
    toast('Add a service first');
    return go('addservice');
  }
  dlg(
    'New booking',
    sel(
      'f1',
      'Service',
      D.services.map((s) => s.name),
      D.services[0].name,
    ) +
      fld('f2', 'Buyer name', '', 'e.g. Asha Nair') +
      `<div class="row" style="gap:12px"><div class="field sp">${`<label for="f3">Date</label><input class="input" id="f3" type="date" min="${new Date().toISOString().slice(0, 10)}">`}</div><div class="field sp"><label for="f4">Time</label><input class="input" id="f4" type="time" value="07:00"></div></div>`,
    () => {
      const svc = D.services.find((s) => s.name === gv('f1')),
        who = gv('f2'),
        d = gv('f3'),
        t = gv('f4');
      if (who.length < 2) return toast("Add the buyer's name");
      if (!d || !t) return toast('Pick a date and a time');
      const dt = new Date(d + 'T' + t),
        n = D.bookings.reduce((a, b) => Math.max(a, +String(b.id).replace(/\D/g, '') || 0), 200) + 1,
        h = dt.getHours() % 12 || 12;
      D.bookings.unshift({
        id: 'B-' + n,
        who,
        svc: svc.id,
        when:
          dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) +
          ', ' +
          h +
          ':' +
          String(dt.getMinutes()).padStart(2, '0') +
          ' ' +
          (dt.getHours() < 12 ? 'am' : 'pm'),
        ts: dt.getTime(),
        paid: false,
        status: 'Upcoming',
      });
      if (!D.customers.find((c) => c.name === who))
        D.customers.unshift({ id: 'cu' + Date.now(), name: who, phone: '—', orders: 0, spent: 0, last: '—' });
      ui.orderTab = 'bookings';
      overlay = null;
      route = { name: 'orders', arg: null };
      render(true);
      toast('Booking added');
    },
  );
}

/* ---------- delete ---------- */
function deleteItem() {
  const svc = route.name === 'addservice',
    list = svc ? D.services : D.products,
    it = list.find((x) => x.id === route.arg);
  if (!it) return;
  dlg(
    'Delete ' + (svc ? 'service' : 'product') + '?',
    `<p style="margin:0">“${esc(it.name)}” will be removed from your shop. Past orders keep their record.</p>`,
    () => {
      list.splice(list.indexOf(it), 1);
      overlay = null;
      ui.dirty = false;
      stack = [];
      go(svc ? 'services' : 'products', false);
      toast('Deleted');
    },
    '<button class="btn line" data-act="close">Keep it</button><button class="btn main" data-act="dlgok" style="background:var(--negative)">Delete</button>',
  );
}

/* ---------- clicks for the forms (run before the prototype's own handler) ---------- */
document.addEventListener(
  'click',
  (e) => {
    const el = e.target.closest('[data-act],[data-go]');
    if (!el) return;
    const a = el.dataset.act,
      stop = () => {
        e.stopImmediatePropagation();
        e.preventDefault();
      };
    if (a === 'save' && (route.name === 'addproduct' || route.name === 'addservice')) {
      stop();
      if (ui.fUploading) return toast('Wait a moment: the photo is still uploading');
      const r = route.name === 'addproduct' ? saveProduct() : saveService();
      if (r) {
        ui.dirty = false;
        ui.fImg = null;
        stack = [];
        const wasService = route.name === 'addservice';
        const backToEditor = typeof editorReturnPending === 'function' && editorReturnPending();
        if (backToEditor) returnToEditor();
        else go(wasService ? 'services' : 'products', false);
        // "Saved" only once the server has it; otherwise say so plainly.
        persistNow().then((stored) =>
          toast(stored ? 'Saved' : 'Not saved to Stoora yet. Check your connection; we will keep trying.'),
        );
      }
      return;
    }
    if (a === 'addphoto') {
      stop();
      return addPhoto();
    }
    if (a === 'delitem') {
      stop();
      return deleteItem();
    }
    if (a === 'chansel') {
      stop();
      el.classList.toggle('on');
      el.innerHTML = el.classList.contains('on') ? I('check', 14, 2.5) : '';
      return makeDirty();
    }
    if (a === 'toggle' && (route.name === 'addproduct' || route.name === 'addservice')) makeDirty();
    if (a === 'dirty' && el.closest('.step')) {
      stop();
      const i = el.parentElement.querySelector('input'),
        d = el.getAttribute('aria-label') === 'More' ? 1 : -1;
      i.value = Math.max(0, (parseInt(i.value) || 0) + d);
      return makeDirty();
    }
    if (el.dataset.go === 'create' && /New booking/.test(el.textContent)) {
      stop();
      return newBooking();
    }
  },
  true,
);
document.addEventListener('input', (e) => {
  if (e.target.matches('#screen .input,#screen .money-in input')) e.target.classList.remove('bad');
});
