/**
 * Dashboard actions: the dialogs and small features behind the buttons (export CSV, refund,
 * reschedule, offers, share link, order and customer tools ...).
 * Shared by dashboard.html and dashboard-phone.html. Everything here edits the dashboard's
 * data (D); saving to the server is done by api.js.
 */

const LOOKS = [
  [
    'Sunrise',
    'linear-gradient(135deg,#fbe0a8 0%,#f4a24a 14%,#ef7f3d 28%,#dc4a3a 42%,#d13a5b 56%,#8b3a9e 70%,#5f3ba8 84%,#262a7a 100%)',
  ],
  ['Indigo night', 'linear-gradient(135deg,#262a7a,#5f3ba8)'],
  ['Marigold', 'linear-gradient(135deg,#FFB407,#EA5B1E)'],
  ['Garden', 'linear-gradient(135deg,#0FA05C,#065F37)'],
  ['Jaipur pink', 'linear-gradient(135deg,#D13A5B,#8B3A9E)'],
  ['Block print', 'linear-gradient(135deg,#171C3C,#303652 55%,#EA5B1E)'],
  ['Dusk', 'linear-gradient(135deg,#F4A24A,#8B3A9E)'],
];
let SHOP_LINK = 'stoora.in/meerastudio';

/* ---------- small helpers ---------- */
const fld = (id, label, val = '', ph = '', type = 'text', extra = '') =>
  `<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" type="${type}" value="${esc(val)}" placeholder="${esc(ph)}" ${extra}></div>`;
const area = (id, label, val = '', ph = '') =>
  `<div class="field"><label for="${id}">${label}</label><textarea class="input" id="${id}" rows="4" placeholder="${esc(ph)}">${esc(val)}</textarea></div>`;
const sel = (id, label, opts, cur) =>
  `<div class="field"><label for="${id}">${label}</label><select class="input" id="${id}">${opts.map((o) => `<option ${o === cur ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
const gv = (id) => (document.getElementById(id) || { value: '' }).value.trim();
function dlg(title, body, fn, btns) {
  ui.dlg = { title, body, fn, btns };
  overlay = 'dlg';
  renderLayer();
  setTimeout(() => {
    const i = document.querySelector('#layer .sheet input:not([type=file]),#layer .sheet textarea');
    i && i.focus();
  }, 40);
}
function pickList(title, items, intro = '') {
  ui.dlg = {
    title,
    picks: items.map((i) => i[3]),
    btns: false,
    body:
      (intro ? `<p class="muted small" style="margin:0 0 12px">${intro}</p>` : '') +
      `<div class="card" style="padding:4px 14px">${items.map(([ic, l, sub], i) => `<button class="set-row" data-act="dlgpick" data-i="${i}">${I(ic, 20)}<span class="sp"><b>${l}</b>${sub ? `<br><span class="small muted">${sub}</span>` : ''}</span>${I('right', 18)}</button>`).join('')}</div>`,
  };
  overlay = 'dlg';
  renderLayer();
}
OV.dlg = () => {
  const d = ui.dlg;
  return `<div class="scrim" data-act="close"></div><div class="sheet"><div class="grab"></div><div class="sheet-h"><div class="h2">${d.title}</div><button class="ibtn" data-act="close" aria-label="Close">${I('x')}</button></div>${d.body}${d.btns === false ? '' : `<div class="row" style="gap:8px;margin-top:16px;justify-content:flex-end">${d.btns || `<button class="btn line" data-act="close">Cancel</button><button class="btn main" data-act="dlgok">Save</button>`}</div>`}</div>`;
};
function done(msg) {
  overlay = null;
  render();
  toast(msg);
}
function copyText(t, msg = 'Copied') {
  try {
    navigator.clipboard.writeText(t).then(
      () => toast(msg),
      () => toast(msg),
    );
  } catch (e) {
    toast(msg);
  }
}
function download(name, rows) {
  const t = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv' }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast('Downloaded ' + name);
}
function pickFile(accept, cb) {
  const i = document.createElement('input');
  i.type = 'file';
  i.accept = accept;
  i.onchange = () => i.files[0] && cb(i.files[0]);
  i.click();
}
function readCsv(f, cb) {
  const r = new FileReader();
  r.onload = () =>
    cb(
      String(r.result)
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => l.split(',').map((c) => c.replace(/^"|"$/g, '').trim())),
    );
  r.readAsText(f);
}
/** The buyer an order is being made for. A shop with no customers yet starts with a blank buyer to fill in. */
const NEW_BUYER = { name: 'Walk-in buyer', phone: '—', orders: 0 };
const BU = () => ui.buyer || D.customers[0] || NEW_BUYER;
const curOrder = () => D.orders.find((x) => x.id == route.arg) || D.orders[0];
const curBooking = () => D.bookings.find((x) => x.id === route.arg) || D.bookings[1];
const rowsOrders = () => [
  ['Order', 'Date', 'Buyer', 'Came from', 'Total (INR)', 'Paid', 'Shipped'],
  ...D.orders.map((o) => ['#' + o.id, o.when, o.who, o.src, o.total, o.paid ? 'Yes' : 'No', o.shipped ? 'Yes' : 'No']),
];
const rowsBookings = () => [
  ['Booking', 'Service', 'When', 'Buyer', 'Price (INR)', 'Paid', 'Status'],
  ...D.bookings.map((b) => [b.id, prod(b.svc).name, b.when, b.who, prod(b.svc).price, b.paid ? 'Yes' : 'No', b.status]),
];
const rowsProducts = () => [
  ['Name', 'Price (INR)', 'Stock', 'Status'],
  ...D.products.map((p) => [p.name, p.price, p.stock, p.status]),
  ...D.services.map((s) => [s.name, s.price, s.type, s.next]),
];
const rowsCustomers = () => [
  ['Name', 'Phone', 'Orders', 'Spent (INR)', 'Last order'],
  ...D.customers.map((c) => [c.name, c.phone, c.orders, c.spent, c.last]),
];
const rowsMoney = () => [
  ['Buyer', 'Reference', 'Amount (INR)', 'Status'],
  ...D.orders.map((o) => [o.who, '#' + o.id, o.total, o.refunded ? 'Refunded' : o.paid ? 'Received' : 'Pending']),
  ...D.bookings.map((b) => [b.who, b.id, prod(b.svc).price, b.paid ? 'Received' : 'Pending']),
];

/* ---------- state that lives for the session ---------- */
D.recents = ['How did I do this week?', 'Which orders should I ship first?'];
D.custom = [];
D.offers = [];
D.look = 0;
D.tagline = null;
D.done = D.done || 0;
const _fresh = fresh;
fresh = function () {
  const d = _fresh();
  d.recents = ['How did I do this week?', 'Which orders should I ship first?'];
  d.custom = [];
  d.offers = [];
  d.look = 0;
  d.tagline = null;
  d.done = 0;
  return d;
};

/* ---------- the dispatcher: every "soon" button lands here ---------- */
function stooraSoon(el) {
  const al = el.getAttribute('aria-label') || '',
    tx = el.textContent.replace(/\s+/g, ' ').trim(),
    k = al || tx,
    n = route.name;
  const card = el.closest('.card.setup');
  if (card) return setupCard(`${card.dataset.step || ''} ${card.querySelector('b').textContent}`, el);
  if (overlay === 'offer' && el.classList.contains('set-row')) return makeOffer(el.querySelector('b').textContent);
  if (n === 'setting' && el.closest('#screen')) return settingRow(el);
  if (el.classList.contains('chip') && /^(Today|Yesterday|This week|This month|Last 7 days|Last month)/.test(tx))
    return dateRange(el);
  if (el.closest('.idea') && k === 'Use it') return useIdea(el);
  if (el.closest('.idea') && k === 'Try another') return tryIdea(el);
  const A = {
    'Add a photo': () =>
      pickFile('image/*', (f) => {
        toast('Photo added: ' + f.name);
      }),
    Export: () => exportNow(),
    Refund: () => refund(),
    Edit: () => (n === 'order' ? editOrder() : n === 'customer' ? editCustomer() : toast('Done')),
    'More actions': () => moreActions(),
    More: () => moreActions(),
    'Previous order': () => stepOrder(-1),
    'Next order': () => stepOrder(1),
    'Add note': () => addNote(),
    'Add custom item': () => customItem(),
    Change: () =>
      n === 'order'
        ? pickList(
            'Choose a buyer',
            D.customers.map((c) => [
              'user',
              c.name,
              c.phone + ' · ' + c.orders + ' orders',
              () => {
                curOrder().who = c.name;
                done('Buyer changed to ' + c.name);
              },
            ]),
          )
        : changeBuyer(),
    Reschedule: () => reschedule(),
    Import: () => importCsv(),
    Call: () => {
      const c = D.customers[+route.arg] || D.customers[0];
      toast('Calling ' + c.name + '…');
    },
    'Add customer': () => addCustomer(),
    'Payout settings': () => payoutSettings(),
    Reports: () => reports(),
    'Open shop': () => openShop(),
    'Copy link': () => copyText(SHOP_LINK, 'Link copied'),
    'Edit look': () => editLook(),
    'Share link': () => shareLink(),
    'Make looks': () => makeLooks(),
  };
  (A[k] || (() => toast('Done')))();
}

/* ---------- home: setup cards ---------- */
function setupCard(title, btn) {
  const finish = (msg) => {
    overlay = null;
    D.done++;
    btn.textContent = 'Done';
    btn.disabled = true;
    btn.style.opacity = '.6';
    const p = document.querySelector('#screen p.muted.small[style*="center"]');
    if (p) p.innerHTML = p.innerHTML.replace(/\d+ of 4/, D.done + ' of 4');
    renderLayer();
    toast(msg);
  };
  if (/UPI/.test(title))
    return dlg(
      'Turn on UPI payments',
      `<p class="muted small" style="margin:0 0 12px">Buyers pay straight to your bank.</p>` +
        fld('f1', 'UPI ID', '', 'meera@okhdfc'),
      () =>
        /^[\w.\-]{2,}@[a-z]{2,}$/i.test(gv('f1'))
          ? finish('UPI payments are on')
          : toast('That UPI ID looks wrong. Example: meera@okhdfc'),
    );
  if (/link/i.test(title)) {
    copyText(SHOP_LINK, 'Shop link copied');
    D.done++;
    btn.textContent = 'Copied';
    return;
  }
  toast('Done');
}

/* ---------- date range and ideas ---------- */
function dateRange(el) {
  pickList(
    'Choose dates',
    ['Today', 'Yesterday', 'Last 7 days', 'This week', 'This month', 'Last month'].map((l) => [
      'cal',
      l,
      '',
      () => {
        ui.range = l;
        overlay = null;
        render();
        toast('Showing ' + l + ' · sample numbers stay the same');
      },
    ]),
  );
}
const IDEAS = [
  'Soft, breathable cotton, hand block-printed in Jaipur. A relaxed straight fit for everyday wear.',
  'Printed by hand, made to last. Easy on summer days, easy to wash, easy to love.',
  'Jaipur block prints on pure cotton. A classic band collar you can dress up or down.',
];
const POSTS = [
  'Only 3 left in M and L. Our hand block-printed indigo kurta set. Reply "INDIGO" to order on WhatsApp.',
  'Indigo, but make it festive. Hand block-printed in Jaipur. 3 left. DM "INDIGO" to book yours.',
  'Wear the print, not the price tag. Indigo kurta set, ₹2,899. Link in bio.',
];
function ideaNode(el) {
  return el.closest('.idea').childNodes[0];
}
function useIdea(el) {
  const t = ideaNode(el).textContent.trim();
  const pd = document.getElementById('pd');
  if (pd) {
    pd.value = t;
    makeDirty && makeDirty();
    toast('Added to your description');
  } else copyText(t, 'Copied. Paste it where you need it.');
}
function tryIdea(el) {
  const node = ideaNode(el),
    post = /INDIGO|Indigo|bio/.test(node.textContent),
    L = post ? POSTS : IDEAS;
  const i = (L.indexOf(node.textContent.trim()) + 1) % L.length;
  node.textContent = L[i];
}

/* ---------- orders ---------- */
function exportNow() {
  if (n0() === 'money') return download('stoora-money.csv', rowsMoney());
  if (n0() === 'products')
    return download(ui.prodTab === 'services' ? 'stoora-services.csv' : 'stoora-products.csv', rowsProducts());
  download(
    ui.orderTab === 'bookings' ? 'stoora-bookings.csv' : 'stoora-orders.csv',
    ui.orderTab === 'bookings' ? rowsBookings() : rowsOrders(),
  );
}
const n0 = () => route.name;
function refund() {
  const o = curOrder();
  dlg(
    'Refund #' + o.id,
    `<p class="muted small" style="margin:0 0 12px">The refund goes back to the buyer's UPI account.</p>` +
      fld('f1', 'Refund amount (₹)', o.total, '', 'number') +
      sel(
        'f2',
        'Reason',
        ['Buyer changed their mind', 'Item damaged', 'Wrong item sent', 'Other'],
        'Buyer changed their mind',
      ),
    () => {
      const a = +gv('f1');
      if (!(a > 0 && a <= o.total)) return toast('Enter an amount up to ' + rs(o.total));
      o.refunded = true;
      (o.notes = o.notes || []).push('Refunded ' + rs(a) + ' · ' + gv('f2'));
      done('Refund of ' + rs(a) + ' started');
    },
  );
}
function editOrder() {
  const o = curOrder();
  dlg(
    'Edit #' + o.id,
    fld('f1', 'Buyer name', o.who) + area('f2', 'Add a note for your team', '', ' e.g. Gift wrap please'),
    () => {
      if (!gv('f1')) return toast('Buyer name cannot be empty');
      o.who = gv('f1');
      if (gv('f2')) (o.notes = o.notes || []).push(gv('f2'));
      done('Order updated');
    },
  );
}
function addNote() {
  const o = curOrder();
  dlg('Add a note', area('f1', 'Note', '', 'Only your team can see this'), () => {
    if (!gv('f1')) return toast('Type a note first');
    (o.notes = o.notes || []).push(gv('f1'));
    done('Note added');
  });
}
function stepOrder(d) {
  const i = D.orders.findIndex((x) => x.id == route.arg);
  const o = D.orders[(i + d + D.orders.length) % D.orders.length];
  route.arg = String(o.id);
  ui.ship = false;
  render(true);
}
function customItem() {
  dlg(
    'Add custom item',
    fld('f1', 'Item name', '', 'e.g. Stitching charge') + fld('f2', 'Price (₹)', '', '0', 'number'),
    () => {
      const p = +gv('f2');
      if (!gv('f1') || !(p > 0)) return toast('Add a name and a price');
      const id = 'x' + Date.now();
      D.custom.push({
        id,
        name: gv('f1'),
        price: p,
        stock: null,
        emoji: '<span class="ms">flag</span>',
        status: 'Custom',
      });
      ui.draft.push([id, 1]);
      done('Item added');
    },
  );
}
function changeBuyer() {
  const customers = D.customers.map((c) => [
    'user',
    c.name,
    c.phone + ' · ' + c.orders + ' orders',
    () => {
      ui.buyer = c;
      done('Buyer changed to ' + c.name);
    },
  ]);
  const newBuyer = [
    'plus',
    'A new buyer',
    'Type their name and phone',
    () =>
      dlg('New buyer', fld('f1', 'Name', '', 'Asha Nair') + fld('f2', 'Phone number', '', '98765 43210', 'tel'), () => {
        const phone = gv('f2').replace(/\D/g, '').slice(-10);
        if (gv('f1').length < 2) return toast("Add the buyer's name");
        if (gv('f2') && phone.length !== 10) return toast('The phone number should have 10 digits');
        ui.buyer = { name: gv('f1'), phone: phone ? '+91 ' + phone : '—', orders: 0 };
        done('Buyer set to ' + gv('f1'));
      }),
  ];
  pickList('Choose a buyer', [newBuyer, ...customers]);
}
function moreActions() {
  if (route.name === 'order') {
    const o = curOrder();
    return pickList('More actions', [
      [
        'doc',
        'Print packing slip',
        'Opens the print window',
        () => {
          overlay = null;
          renderLayer();
          setTimeout(() => window.print(), 80);
        },
      ],
      [
        'link',
        'Copy order link',
        '',
        () => {
          overlay = null;
          renderLayer();
          copyText(location.origin + location.pathname + '#order:' + o.id, 'Order link copied');
        },
      ],
      [
        'copy',
        'Duplicate order',
        'Creates an unpaid copy',
        () => {
          const id = Math.max(...D.orders.map((x) => x.id)) + 1;
          D.orders.unshift({
            ...o,
            id,
            paid: false,
            shipped: false,
            refunded: false,
            notes: [],
            when: nowLabel(),
            ts: Date.now(),
          });
          overlay = null;
          route.arg = String(id);
          render(true);
          toast('Copied to #' + id);
        },
      ],
      [
        'x',
        'Cancel order',
        'Removes it from your list',
        () => {
          D.orders = D.orders.filter((x) => x !== o);
          overlay = null;
          back();
          setTimeout(() => toast('Order #' + o.id + ' cancelled'), 60);
        },
      ],
    ]);
  }
  if (route.name === 'booking') {
    const b = curBooking();
    return pickList('More actions', [
      [
        'link',
        'Copy booking link',
        '',
        () => {
          overlay = null;
          renderLayer();
          copyText(location.origin + location.pathname + '#booking:' + b.id, 'Booking link copied');
        },
      ],
      [
        'doc',
        'Print',
        '',
        () => {
          overlay = null;
          renderLayer();
          setTimeout(() => window.print(), 80);
        },
      ],
      [
        'x',
        'Cancel booking',
        'The buyer is told on WhatsApp',
        () => {
          b.status = 'Cancelled';
          done('Booking cancelled');
        },
      ],
    ]);
  }
  if (route.name === 'customer') {
    const c = D.customers[+route.arg] || D.customers[0];
    return pickList('More actions', [
      [
        'copy',
        'Copy phone number',
        '',
        () => {
          overlay = null;
          renderLayer();
          copyText(c.phone, 'Phone number copied');
        },
      ],
      [
        'x',
        'Delete customer',
        'Their orders stay in your list',
        () => {
          D.customers = D.customers.filter((x) => x !== c);
          overlay = null;
          back();
          setTimeout(() => toast(c.name + ' deleted'), 60);
        },
      ],
    ]);
  }
  const n = route.name,
    go2 = (f) => () => {
      overlay = null;
      renderLayer();
      f();
    };
  if (n === 'orders' || n === 'money')
    return pickList('More actions', [
      ['doc', 'Export as CSV', '', go2(exportNow)],
      ...(n === 'money'
        ? [['bill', 'Payout settings', '', payoutSettings]]
        : [
            [
              'plus',
              'Create order',
              '',
              () => {
                overlay = null;
                go('create');
              },
            ],
          ]),
    ]);
  if (n === 'products')
    return pickList('More actions', [
      ['doc', 'Import from CSV', '', importCsv],
      ['doc', 'Export as CSV', '', go2(exportNow)],
      [
        'plus',
        ui.prodTab === 'services' ? 'Add service' : 'Add product',
        '',
        () => {
          overlay = null;
          go(ui.prodTab === 'services' ? 'addservice' : 'addproduct');
        },
      ],
    ]);
  if (n === 'customers')
    return pickList('More actions', [
      ['doc', 'Import from CSV', '', importCsv],
      ['plus', 'Add customer', '', addCustomer],
    ]);
  if (n === 'analytics') return pickList('More actions', [['chart', 'Reports', '', reports]]);
  toast('Done');
}
function reschedule() {
  const b = curBooking();
  dlg('Reschedule ' + b.id, fld('f1', 'Date', '', '', 'date') + fld('f2', 'Time', '07:00', '', 'time'), () => {
    const d = gv('f1'),
      t = gv('f2');
    if (!d || !t) return toast('Pick a date and a time');
    const dt = new Date(d + 'T' + t);
    const day = dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    const h = dt.getHours() % 12 || 12,
      m = String(dt.getMinutes()).padStart(2, '0');
    b.when = day + ', ' + h + ':' + m + ' ' + (dt.getHours() < 12 ? 'am' : 'pm');
    b.status = 'Upcoming';
    done('Moved to ' + b.when);
  });
}

/* ---------- products and customers ---------- */
function importCsv() {
  const cust = route.name === 'customers';
  dlg(
    'Import ' + (cust ? 'customers' : 'products'),
    `<p class="muted small" style="margin:0 0 12px">Choose a CSV file with these columns, one row per ${cust ? 'customer' : 'product'}:</p><div class="card small"><b>${cust ? 'name, phone' : 'name, price, stock'}</b><div class="muted">${cust ? 'Asha Nair, 9876543210' : 'Cotton stole, 899, 12'}</div></div>`,
    () =>
      pickFile('.csv,text/csv', (f) =>
        readCsv(f, (rows) => {
          let n = 0;
          rows.forEach((r) => {
            if (/^name$/i.test(r[0])) return;
            if (cust) {
              const p = (r[1] || '').replace(/\D/g, '').slice(-10);
              if (r[0] && p.length === 10) {
                D.customers.push({
                  name: r[0],
                  phone: '+91 ' + p.slice(0, 2) + 'xxxx ' + p.slice(6),
                  orders: 0,
                  spent: 0,
                  last: '—',
                });
                n++;
              }
            } else {
              const pr = +r[1];
              if (r[0] && pr > 0) {
                D.products.push({
                  id: 'i' + Date.now() + n,
                  name: r[0],
                  price: pr,
                  stock: +r[2] || 0,
                  emoji: '<span class="ms">apparel</span>',
                  status: 'Draft',
                });
                n++;
              }
            }
          });
          overlay = null;
          render();
          toast(n ? 'Imported ' + n + (cust ? ' customers' : ' products') : 'No rows found. Check the columns.');
        }),
      ),
    '<button class="btn line" data-act="close">Cancel</button><button class="btn main" data-act="dlgok">Choose file</button>',
  );
}
function addCustomer() {
  dlg('Add customer', fld('f1', 'Name', '', 'Asha Nair') + fld('f2', 'Phone number', '', '98765 43210', 'tel'), () => {
    const p = gv('f2').replace(/\D/g, '').slice(-10);
    if (!gv('f1') || p.length !== 10) return toast('Add a name and a 10-digit phone number');
    D.customers.unshift({
      name: gv('f1'),
      phone: '+91 ' + p.slice(0, 2) + 'xxxx ' + p.slice(6),
      orders: 0,
      spent: 0,
      last: '—',
    });
    done('Customer added');
  });
}
function editCustomer() {
  const c = D.customers[+route.arg] || D.customers[0];
  dlg('Edit customer', fld('f1', 'Name', c.name) + fld('f2', 'Phone number', c.phone), () => {
    if (!gv('f1')) return toast('Name cannot be empty');
    c.name = gv('f1');
    c.phone = gv('f2') || c.phone;
    done('Customer updated');
  });
}

/* ---------- money, analytics, storefront, offers ---------- */
function payoutSettings() {
  dlg(
    'Payout settings',
    sel('f1', 'Bank account', ['HDFC ••4421', 'ICICI ••9087'], 'HDFC ••4421') +
      sel('f2', 'Payout day', ['Every day', 'Monday', 'Tuesday', 'Friday'], 'Tuesday') +
      fld('f3', 'UPI ID', 'meera@okhdfc'),
    () => done('Payouts: ' + gv('f2') + ' to ' + gv('f1')),
  );
}
function reports() {
  pickList(
    'Reports',
    [
      [
        'chart',
        'Sales report',
        'Every order with its total',
        () => {
          overlay = null;
          renderLayer();
          download('stoora-sales.csv', rowsOrders());
        },
      ],
      [
        'cal',
        'Bookings report',
        'Seats, payments and status',
        () => {
          overlay = null;
          renderLayer();
          download('stoora-bookings.csv', rowsBookings());
        },
      ],
      [
        'user',
        'Customers report',
        'Orders and amount spent',
        () => {
          overlay = null;
          renderLayer();
          download('stoora-customers.csv', rowsCustomers());
        },
      ],
      [
        'tag',
        'Products report',
        'Prices and stock',
        () => {
          overlay = null;
          renderLayer();
          download('stoora-products.csv', rowsProducts());
        },
      ],
    ],
    'Each report downloads as a CSV file you can open in Excel or Sheets.',
  );
}
function shopHtml(w = 260) {
  const L = LOOKS[D.look || 0];
  return `<div class="preview" style="width:${w}px;margin:0 auto"><div style="padding:10px;text-align:center;font-size:11px;border-bottom:1px solid var(--line-soft)">${SHOP_LINK}</div><div style="height:150px;background:${L[1]};display:grid;place-items:center;color:#fff;font-family:var(--display);font-size:22px;text-align:center;padding:10px">Meera Studio<br><span style="font-family:var(--body);font-size:12px">${esc(D.tagline || 'Handblock kurtas & morning yoga')}</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:8px">${['checkroom', 'dry_cleaning', 'apparel', 'self_improvement'].map((e) => `<div style="height:64px;background:var(--muted);border-radius:8px;display:grid;place-items:center;font-size:24px"><span class="ms">${e}</span></div>`).join('')}</div></div>`;
}
function openShop() {
  dlg(
    'Your shop',
    shopHtml(300),
    () => copyText(SHOP_LINK, 'Link copied'),
    '<button class="btn line" data-act="close">Close</button><button class="btn main" data-act="dlgok">Copy link</button>',
  );
}
function editLook() {
  dlg(
    'Edit look',
    `<div class="field"><label>Look</label><div class="row" style="gap:10px;flex-wrap:wrap">${LOOKS.slice(0, 4)
      .map(
        (l, i) =>
          `<button class="chip ${(D.look || 0) === i ? 'on' : ''}" data-act="lookpick" data-i="${i}"><span style="width:14px;height:14px;border-radius:50%;background:${l[1]};display:inline-block"></span> ${l[0]}</button>`,
      )
      .join('')}</div></div>` + fld('f1', 'Tagline', D.tagline || 'Handblock kurtas & morning yoga'),
    () => {
      D.tagline = gv('f1') || null;
      done('Look saved');
    },
  );
}
function makeLooks() {
  dlg(
    'Making looks…',
    `<p class="muted small" style="margin:0">Reading the colours in your Instagram photos…</p>`,
    null,
    false,
  );
  setTimeout(() => {
    if (overlay !== 'dlg' || ui.dlg.title !== 'Making looks…') return;
    pickList(
      '3 new looks for your shop',
      LOOKS.slice(4).map((l, i) => [
        'palette',
        l[0],
        'Tap to use it',
        () => {
          D.look = 4 + i;
          done(l[0] + ' look is live');
        },
      ]),
    );
  }, 1300);
}
function shareLink() {
  pickList('Share your shop', [
    [
      'copy',
      'Copy link',
      SHOP_LINK,
      () => {
        overlay = null;
        renderLayer();
        copyText(SHOP_LINK, 'Link copied');
      },
    ],
    [
      'wa',
      'Share on WhatsApp',
      'Opens WhatsApp with your link',
      () => {
        overlay = null;
        renderLayer();
        window.open(
          'https://wa.me/?text=' + encodeURIComponent('Shop with me: https://' + SHOP_LINK),
          '_blank',
          'noopener',
        );
      },
    ],
    [
      'send',
      'More ways to share',
      'Uses your phone or computer share menu',
      () => {
        overlay = null;
        renderLayer();
        navigator.share
          ? navigator.share({ title: 'Meera Studio', url: location.protocol + '//' + SHOP_LINK }).catch(() => {})
          : copyText(SHOP_LINK, 'Sharing is not available here. Link copied.');
      },
    ],
  ]);
}
function makeOffer(kind) {
  dlg(
    'Create offer · ' + kind,
    fld('f1', 'Offer name or code', '', 'e.g. DIWALI10') +
      sel('f2', 'Type', ['% off', '₹ off'], '% off') +
      fld('f3', 'Amount', '', '10', 'number') +
      fld('f4', 'Minimum order (₹)', '0', '0', 'number'),
    () => {
      const a = +gv('f3');
      if (!gv('f1') || !(a > 0)) return toast('Add a name and an amount');
      D.offers.unshift({
        id: 'o' + Date.now(),
        name: gv('f1').toUpperCase(),
        kind,
        desc: (gv('f2') === '% off' ? a + '% off' : '₹' + a + ' off') + (+gv('f4') > 0 ? ' above ₹' + gv('f4') : ''),
        on: true,
      });
      overlay = null;
      route = { name: 'discounts', arg: null };
      render(true);
      toast('Offer created');
    },
  );
}
function offersPage() {
  return (
    topRow('percent', 'Discounts & offers', `<button class="btn ink sm" data-ov="offer">Create offer</button>`) +
    `<div class="pad" style="padding-top:12px"><div class="card" style="padding:4px 14px">${D.offers.map((o, i) => `<div class="row" style="min-height:64px;${i ? 'border-top:1px solid var(--line-soft)' : ''}"><span class="sp"><b>${esc(o.name)}</b><br><span class="small muted">${esc(o.kind)} · ${esc(o.desc)}</span></span><button class="switch ${o.on ? 'on' : ''}" data-act="offertoggle" data-i="${i}" aria-label="Offer on or off"></button><button class="ibtn sm" data-act="offerdel" data-i="${i}" aria-label="Delete offer">${I('x', 16)}</button></div>`).join('')}</div></div>`
  );
}

/* ---------- settings rows ---------- */
function settingRow(el) {
  const t = el.querySelector('b')?.textContent;
  const row = (SETP[route.arg] || []).flatMap((s) => s[2]).find((r) => r[1] === t);
  if (!row) return toast('Done');
  if (t === 'Write my policies')
    return dlg(
      'Write my policies',
      `<p class="muted small" style="margin:0">Stoora will draft a refund, shipping, privacy and terms policy for a clothing and classes shop in India. You can edit each one.</p>`,
      () => {
        SETP.Policies[0][2].forEach((r) => {
          r[2] = 'Drafted by Stoora · tap to edit';
          r[3] = { v: 'Added' };
        });
        overlay = null;
        render();
        toast('4 policies drafted');
      },
      '<button class="btn line" data-act="close">Cancel</button><button class="btn main" data-act="dlgok">Write them</button>',
    );
  dlg(t, fld('f1', 'Details', row[2]), () => {
    if (!gv('f1')) return toast('This cannot be empty');
    row[2] = gv('f1');
    if (row[3].v === 'Add') row[3] = { v: 'On' };
    done('Saved');
  });
}

/* ---------- extra click actions the dialogs use ---------- */
document.addEventListener(
  'click',
  (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const a = el.dataset.act;
    if (a === 'dlgok') {
      e.stopImmediatePropagation();
      ui.dlg && ui.dlg.fn && ui.dlg.fn();
    } else if (a === 'dlgpick') {
      e.stopImmediatePropagation();
      ui.dlg.picks[+el.dataset.i]();
    } else if (a === 'lookpick') {
      e.stopImmediatePropagation();
      D.look = +el.dataset.i;
      el.parentElement.querySelectorAll('.chip').forEach((c) => c.classList.remove('on'));
      el.classList.add('on');
    } else if (a === 'offertoggle') {
      e.stopImmediatePropagation();
      D.offers[+el.dataset.i].on = !D.offers[+el.dataset.i].on;
      el.classList.toggle('on');
    } else if (a === 'offerdel') {
      e.stopImmediatePropagation();
      D.offers.splice(+el.dataset.i, 1);
      render();
      toast('Offer deleted');
    }
  },
  true,
);

/* toast while a dialog is open: do not rebuild the dialog, so typed text stays */
const _toast = toast;
toast = function (m) {
  if (overlay !== 'dlg') return _toast(m);
  let t = document.querySelector('#layer .toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.getElementById('layer').appendChild(t);
  }
  t.innerHTML = I('check', 16, 2.5) + ' ' + esc(m);
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.remove(), 2400);
};
