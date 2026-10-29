/**
 * Screens for real accounts: Home, Money, Analytics, search, alerts, Razorpay guide.
 * Every number comes from the shop's own data and the server's counts.
 * The sample shop keeps the prototype's screens.
 */
const live = (obj, key, fn) => {
  const o = obj[key];
  obj[key] = (...a) => (D.live ? fn(o, ...a) : o(...a));
};
const inRange = (ts, r) => {
  if (!ts) return r === 'All time';
  const d = new Date(ts),
    n = new Date();
  if (r === 'Today') return d.toDateString() === n.toDateString();
  if (r === 'This week') return n - d < 7 * 864e5;
  if (r === 'This month') return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  return true;
};
const svcOf = (b) => D.services.find((s) => s.id === b.svc) || { name: 'Service', price: 0, emoji: '', type: '' };
const upcoming = () => D.bookings.filter((b) => b.status === 'Upcoming');
const liveHead = () =>
  `<div class="top"><div class="row sp"><div class="smark" style="border-radius:10px;width:40px;height:40px">${esc((USER.shop || 'S')[0].toUpperCase())}</div><b>${esc(USER.shop)}</b></div><button class="ibtn" data-go="search" aria-label="Search">${I('search')}</button><button class="ibtn" data-ov="alerts" aria-label="Alerts">${I('bell')}</button></div>`;

/* ---------- Home ---------- */
function liveCards() {
  const o = D.orders,
    toShip = o.filter(isToShip).length,
    unpaid = o.filter((x) => !x.paid).length,
    up = upcoming(),
    st = D.stats || {};
  const glance = [
    toShip ? `<b>${toShip}</b> order${toShip > 1 ? 's' : ''} paid and waiting to ship` : '',
    unpaid ? `<b>${unpaid}</b> order${unpaid > 1 ? 's' : ''} not paid yet` : '',
    up.length ? `<b>${up.length}</b> booking${up.length > 1 ? 's' : ''} coming up` : '',
  ].filter(Boolean);
  const cards = [];
  cards.push(
    `<div class="box ai hcard"><div class="box-h"><span class="box-t" style="color:var(--ai)">${I('spark', 16)} Your morning message</span></div><p style="margin:0 0 12px">${glance.length ? glance.join('<br>') : 'Nothing needs you right now. Share your shop link to get your next order.'}</p>${toShip ? '<button class="btn main' + (DESK ? '' : ' full') + '" data-go="orders" data-filter="To ship">See orders to ship</button>' : unpaid ? '<button class="btn main' + (DESK ? '' : ' full') + '" data-go="orders" data-filter="Unpaid">See unpaid orders</button>' : '<button class="btn grey' + (DESK ? '' : ' full') + '" data-go="storefront">Open your storefront</button>'}</div>`,
  );
  const comingUp = `<div class="box hcard"><div class="box-h"><span class="box-t">${I('cal', 16)} Coming up</span><button class="link small" data-go="bookings">See all ›</button></div><div class="todo">${
    up.length
      ? up
          .slice(0, 3)
          .map((b) => {
            const s = svcOf(b);
            return `<button class="trow" data-go="booking:${b.id}"><span class="ic" style="background:color-mix(in srgb,var(--positive) 12%,var(--card));font-size:18px">${s.emoji}</span><span class="sp"><b>${esc(s.name)}</b><span class="tiny muted">${esc(b.when)} · ${esc(b.who)}</span></span>${paidTag(b.paid)}</button>`;
          })
          .join('')
      : '<p class="muted small" style="margin:0">No bookings coming up.</p>'
  }</div></div>`;
  const money = `<button class="box tapbox hcard" data-go="money" style="text-align:left;width:100%"><div class="box-h"><span class="box-t">${I('wallet', 16)} Money</span><span class="link small">See all ›</span></div><div class="tiles"${DESK ? '' : ' style="grid-template-columns:1fr 1fr"'}><div class="tile static"><div class="k">Received</div><div class="v">${rs(st.received || 0)}</div></div><div class="tile static"><div class="k">Pending</div><div class="v">${rs(st.pending || 0)}</div></div></div><div class="small muted" style="margin-top:10px">${D.rz && D.rz.configured ? 'Online payments are on (' + D.rz.mode + ' mode).' : 'Online payments are off. Set up Razorpay in Settings.'}</div></button>`;
  const n = setupCount(),
    next = !(D.products.length || D.services.length)
      ? 'add your first product'
      : !D.setupDone.upi
        ? 'add your UPI ID'
        : !D.setupDone.look
          ? 'choose your shop look'
          : !D.setupDone.link
            ? 'share your shop link'
            : '';
  const finish = `<div class="box hcard"><div class="box-h"><span class="box-t">${I('box', 16)} Finish setting up</span><span class="tiny muted">${n} of 4 done</span></div><div class="meter"><i style="width:${Math.round((n / 4) * 100)}%"></i></div><p class="muted small" style="margin:10px 0 12px">${next ? 'Next: ' + next + '.' : 'Everything is set up. Nice work!'}</p>${next ? '<button class="btn grey sm" data-go="home-setup">Continue setup</button>' : ''}</div>`;
  return DESK ? [cards[0], money, comingUp, finish] : [cards[0], money, finish];
}
function liveHome() {
  const st = D.stats || {},
    first = (USER.name || '').split(' ')[0],
    o = D.orders;
  const ask = askBox(['How did I do this week?', 'Which orders should I ship first?', 'What should I restock?']);
  if (DESK)
    return `<div class="pad" style="padding-top:20px">${mstrip(dateChip('Today'), [
      ['Visits', String(st.visitsToday || 0)],
      ['Sales', rs(st.todaySales || 0)],
      ['Orders', String(st.todayOrders || 0)],
      ['Bookings', String(upcoming().length)],
    ])}
  <div class="box hero"><h1 class="h1 big">${hello()}, ${esc(first)}!</h1><p class="muted" style="margin:0 0 18px">Ask Stoora anything about your shop.</p><div class="hero-ask">${ask}</div></div><div class="hgrid">${liveCards().join('')}</div></div>`;
  return (
    liveHead() +
    `<div class="pad hstack"><div class="box"><div class="box-h"><span class="box-t">${I('chart', 16)} Today</span></div><div class="tiles">${[
      ['Visits', st.visitsToday || 0],
      ['Sales', rs(st.todaySales || 0)],
      ['Orders', st.todayOrders || 0],
      ['Bookings', upcoming().length],
    ]
      .map(
        (t) =>
          `<button class="tile" data-go="analytics"><div class="k">${t[0]}</div><div class="v">${t[1]}</div></button>`,
      )
      .join('')}</div></div>
  <div class="box"><h1 class="h1" style="margin:0 0 4px">${hello()}, ${esc(first)}!</h1><p class="muted small" style="margin:0 0 12px">Ask Stoora anything about your shop.</p>${ask}</div>${liveCards().join('')}</div>`
  );
}
live(V, 'home', (orig) => (D.setup || homeIsNew() ? orig() : liveHome()));

/* the setup list: cards already done show "Done" */
live(V, 'home', (orig) => {
  let h = orig();
  if (!(D.setup || homeIsNew())) return h;
  const done = (step) => (step === 'product' ? D.products.length || D.services.length : (D.setupDone || {})[step]);
  h = h.replace(
    /(<div class="card setup" data-step="([a-z]+)">[\s\S]*?<button class="btn grey sm"[^>]*>)([^<]*)(<\/button>)/g,
    (match, before, step, label, after) => (done(step) ? before + 'Done' + after : match),
  );
  return h;
});
function markDone(key, msg) {
  D.setupDone[key] = true;
  overlay = null;
  render();
  toast(msg);
}
setupCard = function (title, btn) {
  const cfg = (D.cfg = D.cfg || {});
  if (!D.live && /UPI/.test(title))
    return toast('This is the sample shop. Log in with your own account to set this up.');
  if (/UPI/.test(title))
    return dlg(
      'Turn on UPI payments',
      `<p class="muted small" style="margin:0 0 12px">Buyers on your shop page get a “Pay by UPI” button that opens their UPI app with the amount filled in. You confirm each payment by marking the order paid.</p>` +
        fld('f1', 'Your UPI ID', cfg.upi || '', 'meera@okhdfc'),
      () => {
        if (!/^[\w.\-]{2,}@[a-z]{2,}$/i.test(gv('f1'))) return toast('That UPI ID looks wrong. Example: meera@okhdfc');
        cfg.upi = gv('f1');
        markDone('upi', 'UPI payments are on');
      },
    );
  if (/look/i.test(title)) {
    D.setupDone.look = true;
    return go('storefront');
  }
  if (/link/i.test(title)) {
    copyText(location.protocol + '//' + SHOP_LINK, 'Shop link copied');
    D.setupDone.link = true;
    btn.textContent = 'Done';
    return;
  }
  toast('Done');
};

/* ---------- Money ---------- */
const moneyRange = () => ui.moneyRange || 'This month';
function moneyRows() {
  const r = moneyRange();
  return [
    ...D.orders
      .filter((o) => inRange(o.ts, r) || !o.ts)
      .map((o) => ({
        who: o.who,
        ref: '#' + o.id,
        method: o.payMethod || (o.paid ? 'UPI' : '—'),
        when: o.when,
        amt: o.total,
        st: o.refunded ? ['neutral', 'Refunded'] : o.paid ? ['ok', 'Received'] : ['warn', 'Pending'],
        go: 'order:' + o.id,
        paid: o.paid && !o.refunded,
        refund: o.refunded,
      })),
    ...D.bookings.map((b) => ({
      who: b.who,
      ref: b.id,
      method: b.paid ? 'UPI' : '—',
      when: b.when,
      amt: svcOf(b).price,
      st: b.paid ? ['ok', 'Received'] : ['warn', 'Pending'],
      go: 'booking:' + b.id,
      paid: b.paid,
    })),
  ];
}
function liveMoney() {
  const rows = moneyRows(),
    rec = rows.filter((r) => r.paid).reduce((a, r) => a + r.amt, 0),
    pend = rows.filter((r) => !r.paid && !r.refund).reduce((a, r) => a + r.amt, 0),
    ref = rows.filter((r) => r.refund).reduce((a, r) => a + r.amt, 0),
    on = D.rz && D.rz.configured;
  const chips = `<div class="box ctl"><div class="chips">${['Today', 'This week', 'This month', 'All time'].map((c) => `<button class="chip ${c === moneyRange() ? 'on' : ''}" data-act="moneyrange" data-v="${c}">${c === 'Today' ? I('cal', 15) + ' ' : ''}${c}</button>`).join('')}</div></div>`;
  const banner = `<div class="banner info" style="margin-top:12px">${I('bill', 18)}<div>${on ? `Razorpay is set up on this server (<b>${D.rz.mode}</b> mode). Whether buyers can pay you online, and where the money goes, is shown in <button class="link" data-go="setting:Payments">Settings › Payments</button>.` : 'Online payments are off. Buyers can pay by UPI and you mark orders paid. To take cards and UPI automatically, set up Razorpay in <b>Settings › Payments</b>.'}</div></div>`;
  const table = DESK
    ? `<div class="box tbox" style="margin-top:16px"><div class="tbar"><span class="box-t">Payments</span></div><table class="tbl"><thead><tr><th>Buyer</th><th>Order</th><th>Method</th><th>When</th><th class="r">Amount</th><th>Status</th></tr></thead><tbody>${rows.length ? rows.map((p) => `<tr class="rw" data-go="${p.go}"><td><b>${esc(p.who)}</b></td><td>${p.ref}</td><td class="muted">${esc(p.method)}</td><td class="muted">${esc(p.when)}</td><td class="r money">${rs(p.amt)}</td><td><span class="tag ${p.st[0]}">${p.st[1]}</span></td></tr>`).join('') : noRows('No payments in this period.')}</tbody></table></div>`
    : `<div class="sec-t">Payments</div><div class="list">${rows.length ? rows.map((p) => `<button class="li" data-go="${p.go}"><div class="sp"><b>${esc(p.who)}</b><div class="small muted">${p.ref} · ${esc(p.method)} · ${esc(p.when)}</div></div><span class="money small">${rs(p.amt)}</span><span class="tag ${p.st[0]}">${p.st[1]}</span></button>`).join('') : noList('No payments in this period.')}</div>`;
  return (
    topRow(
      'wallet',
      'Money',
      DESK
        ? '<button class="btn line sm" data-act="soon">Export</button><button class="btn ink sm" data-go="setting:Payments">Payment settings</button>'
        : `<button class="ibtn" data-act="soon" aria-label="More">${I('more')}</button>`,
    ) +
    `<div class="pad">${chips}${kpiRow(
      [
        ['Received', rs(rec)],
        ['Pending', rs(pend)],
        ['Refunds', rs(ref)],
        ['Payments', String(rows.length)],
      ],
      'k4',
    )}${banner}${table}</div>`
  );
}
live(V, 'money', () => liveMoney());

/* ---------- Analytics ---------- */
function liveAnalytics() {
  const st = D.stats || {},
    max = Math.max(1, ...(st.bars || []).map((b) => b.sales)),
    ch = Object.entries(st.channels || {}),
    tot = ch.reduce((a, c) => a + c[1], 0);
  const conv = st.visitsWeek ? (st.weekOrders / st.visitsWeek) * 100 : 0,
    ret = st.customers ? Math.round((st.returning / st.customers) * 100) : 0;
  const best = st.best || [];
  const sentence = st.weekOrders
    ? `You sold <b>${rs(st.weekSales)}</b> from <b>${st.weekOrders}</b> order${st.weekOrders > 1 ? 's' : ''} in the last 7 days.${best[0] ? ` <b>${esc(best[0].name)}</b> earns the most.` : ''}`
    : 'No orders in the last 7 days yet. Share your shop link to get started.';
  const bestCard = `<div class="card"><b style="text-decoration:underline dotted">Best sellers</b><div class="small muted" style="margin:2px 0 6px">Most bought, by money earned</div>${best.length ? best.map((x, i) => `<div class="row" style="gap:10px;padding:8px 0;${i ? 'border-top:1px solid var(--line-soft)' : ''}"><b class="muted" style="width:16px">${i + 1}</b><span class="thumb xs" style="flex:none">${x.emoji || ''}</span><div class="sp"><b class="small">${esc(x.name)}</b><div style="height:6px;background:var(--muted);border-radius:3px;margin-top:6px"><div style="width:${Math.round((x.rev / best[0].rev) * 100)}%;height:100%;background:var(--primary);border-radius:3px"></div></div></div><div style="text-align:right"><b class="small">${rs(x.rev)}</b><div class="tiny muted">${x.sold} sold</div></div></div>`).join('') : '<p class="muted small" style="margin:8px 0 0">Best sellers appear after your first orders.</p>'}</div>`;
  const ratingCard = ratingsCard();
  return (
    topRow(
      'chart',
      'Analytics',
      DESK
        ? '<button class="btn line sm" data-act="soon">Reports</button>'
        : `<button class="ibtn" data-act="soon" aria-label="More">${I('more')}</button>`,
    ) +
    `<div class="pad"><div class="aibox" style="margin-bottom:12px"><div class="who">${I('spark', 14)} In short</div><p style="margin:6px 0 0">${sentence}</p></div>
 <div class="box ctl"><div class="chips"><button class="chip on">${I('cal', 15)} Last 7 days</button></div></div>
 ${kpiRow(
   [
     ['Sales', rs(st.weekSales || 0)],
     ['Orders', String(st.weekOrders || 0)],
     ['Bookings', String(D.bookings.length)],
     ['Visits', String(st.visitsWeek || 0)],
     ['Returning buyers', ret + '%'],
     ['Conversion', conv.toFixed(1) + '%'],
   ],
   'k6',
 )}
 <div style="display:grid;gap:16px;margin-top:16px;grid-template-columns:${DESK ? '1fr 1fr' : '1fr'}"><div class="card"><b style="text-decoration:underline dotted">Sales over time</b><div class="h2" style="margin:4px 0 10px">${rs(st.weekSales || 0)}</div><div class="bars" style="height:140px">${(st.bars || []).map((b) => `<i style="height:${Math.max(3, Math.round((b.sales / max) * 100))}%"></i>`).join('')}</div><div class="row tiny muted" style="justify-content:space-between;margin-top:6px">${(
   st.bars || []
 )
   .filter((b, i) => i % 2 === 0)
   .map((b) => `<span>${b.day}</span>`)
   .join('')}</div></div>
 <div class="card"><b style="text-decoration:underline dotted">Orders by channel</b>${
   tot
     ? ch
         .sort((a, b) => b[1] - a[1])
         .map(([n, c]) => {
           const p = Math.round((c / tot) * 100);
           return `<div class="row small" style="margin-top:14px"><span style="width:84px">${esc(n)}</span><div class="sp" style="height:10px;background:var(--muted);border-radius:5px"><div style="width:${p}%;height:100%;background:var(--primary);border-radius:5px"></div></div><b style="width:36px;text-align:right">${p}%</b></div>`;
         })
         .join('')
     : '<p class="muted small" style="margin:12px 0 0">No orders yet.</p>'
 }</div>${bestCard}${ratingCard}</div></div>`
  );
}
live(V, 'analytics', () => liveAnalytics());

/* ---------- lists: strips with real numbers, empty messages ---------- */
const stripRe = /<div class="mstrip">[\s\S]*?<\/div><\/div>(?=<div class="box tbox">)/;
live(V, 'products', (orig) => {
  let h = orig();
  const isS = ui.prodTab === 'services',
    st = D.stats || {};
  const strip = isS
    ? mstripSafe(
        ['Services', String(D.services.length)],
        ['Bookings', String(D.bookings.length)],
        ['Paid', rs(D.bookings.filter((b) => b.paid).reduce((a, b) => a + svcOf(b).price, 0))],
        ['Upcoming', String(upcoming().length)],
      )
    : mstripSafe(
        ['Products', String(D.products.length)],
        ['Low on stock', String(D.products.filter((p) => p.stock != null && p.stock > 0 && p.stock <= 5).length)],
        ['Out of stock', String(D.products.filter((p) => p.stock === 0).length)],
        ['Views (7 days)', String(st.visitsWeek || 0)],
      );
  h = h.replace(stripRe, strip);
  const t = isS ? 'No services yet. Add your first one.' : 'No products yet. Add your first one.';
  if (!(isS ? D.services.length : D.products.length))
    h = h.replace('</tbody>', noRows(t) + '</tbody>').replace(/(<div class="list">)(<\/div>)/, '$1' + noList(t) + '$2');
  return h;
});
function mstripSafe(...a) {
  return typeof mstrip === 'function' ? mstrip(dateChip('All time'), a) : '';
}
live(V, 'orders', (orig) => {
  let h = orig();
  if (ui.orderTab === 'bookings') {
    h = h.replace(
      stripRe,
      mstripSafe(
        ['Bookings', String(D.bookings.length)],
        ['Upcoming', String(upcoming().length)],
        ['Paid', rs(D.bookings.filter((b) => b.paid).reduce((a, b) => a + svcOf(b).price, 0))],
        ['Done', String(D.bookings.filter((b) => b.status === 'Done').length)],
      ),
    );
    if (!D.bookings.length)
      h = h
        .replace('</tbody>', noRows('No bookings yet.') + '</tbody>')
        .replace(/(<div class="list">)(<\/div>)/, '$1' + noList('No bookings yet.') + '$2');
  }
  return h;
});
/* ---------- order and booking pages: mark paid, real UPI link ---------- */
const payBtn = '<button class="btn grey sm" data-act="markpaid">Mark as paid</button>';
live(V, 'order', (orig) =>
  orig().replace('data-act="remind">Send UPI link</button>', 'data-act="remind">Copy UPI link</button>' + payBtn),
);
live(V, 'booking', (orig) =>
  orig().replace('data-act="remind">Send UPI link</button>', 'data-act="remind">Copy UPI link</button>' + payBtn),
);
function upiLink(amount, note) {
  const u = (D.cfg || {}).upi;
  if (!u) return null;
  return `upi://pay?pa=${encodeURIComponent(u)}&pn=${encodeURIComponent(USER.shop)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
}
function copyUpi() {
  const o = route.name === 'booking' ? null : D.orders.find((x) => x.id == route.arg),
    b = route.name === 'booking' ? D.bookings.find((x) => x.id === route.arg) : null;
  const amt = o ? o.total : svcOf(b).price,
    ref = o ? 'Order #' + o.id : 'Booking ' + b.id;
  const l = upiLink(amt, ref);
  if (!l) return toast('Add your UPI ID first (Home › Turn on UPI payments)');
  copyText(l, 'UPI link copied. Paste it into your chat with the buyer.');
}
function markPaid() {
  const o = route.name === 'booking' ? null : D.orders.find((x) => x.id == route.arg),
    b = route.name === 'booking' ? D.bookings.find((x) => x.id === route.arg) : null;
  if (o) {
    o.paid = true;
    o.payMethod = o.payMethod || 'UPI';
    o.payStatus = 'paid';
    if (!o.fulfil || o.fulfil === 'placed') o.fulfil = 'confirmed';
    const c = D.customers.find((x) => x.name === o.who);
    if (c) c.spent += o.total;
  }
  if (b) {
    b.paid = true;
  }
  render();
  toast('Marked as paid');
}

/* ---------- search and alerts from real data ---------- */
function searchHTML(q) {
  q = (q || '').trim().toLowerCase();
  if (!q) return '<div class="small muted" style="padding:14px 0">Type a product, an order number or a customer.</div>';
  const r = [];
  D.products.forEach((p) => {
    if (p.name.toLowerCase().includes(q))
      r.push([
        'addproduct:' + p.id,
        p.emoji,
        esc(p.name),
        (p.stock != null ? p.stock + ' in stock · ' : '') + rs(p.price),
      ]);
  });
  D.services.forEach((s) => {
    if (s.name.toLowerCase().includes(q)) r.push(['addservice:' + s.id, s.emoji, esc(s.name), rs(s.price)]);
  });
  D.orders.forEach((o) => {
    if (('#' + o.id + ' ' + o.who).toLowerCase().includes(q))
      r.push(['order:' + o.id, I('orders'), '#' + o.id, esc(o.who) + ' · ' + rs(o.total)]);
  });
  D.customers.forEach((c, i) => {
    if (c.name.toLowerCase().includes(q)) r.push(['customer:' + i, I('user'), esc(c.name), esc(c.phone)]);
  });
  return r.length
    ? r
        .slice(0, 12)
        .map(
          (x) =>
            `<button class="li" data-go="${x[0]}" data-close="1"><div class="thumb">${x[1]}</div><div class="sp"><b>${x[2]}</b><div class="small muted">${x[3]}</div></div></button>`,
        )
        .join('')
    : '<div class="small muted" style="padding:14px 0">Nothing found.</div>';
}
live(
  OV,
  'search',
  () =>
    `<div class="scrim" data-act="close" style="background:rgba(23,28,60,.3)"></div><div class="spop"><div class="search">${I('search', 18)}<input id="q" placeholder="Search products, orders, customers" aria-label="Search" autocomplete="off"><kbd>Esc</kbd></div><div class="list" id="qres" style="padding:8px 14px 14px">${searchHTML('')}</div></div>`,
);
live(V, 'search', (orig) =>
  orig()
    .replace('value="kurta"', 'placeholder="Search products, orders, customers"')
    .replace(/<div class="list-t">[\s\S]*$/, `<div class="list" id="qres">${searchHTML('')}</div></div>`),
);
document.addEventListener('input', (e) => {
  if (e.target.id === 'q' && D.live) {
    const r = document.getElementById('qres');
    if (r) r.innerHTML = searchHTML(e.target.value);
  }
});
function liveAlerts() {
  const a = [];
  D.orders
    .filter((o) => !o.paid)
    .slice(0, 3)
    .forEach((o) =>
      a.push(['Orders · ' + o.when, '#' + o.id + ' is not paid · ' + rs(o.total), esc(o.who), 'order:' + o.id, true]),
    );
  D.orders
    .filter(isToShip)
    .slice(0, 3)
    .forEach((o) =>
      a.push([
        'Orders · ' + o.when,
        '#' + o.id + ' is ready to ship',
        esc(o.who) + ' · ' + rs(o.total),
        'order:' + o.id,
        false,
      ]),
    );
  D.products
    .filter((p) => p.stock != null && p.stock <= 3 && p.status === 'Active')
    .slice(0, 3)
    .forEach((p) =>
      a.push([
        'Stock',
        esc(p.name) + (p.stock ? ' is low' : ' is out of stock'),
        p.stock + ' left',
        'addproduct:' + p.id,
        p.stock === 0,
      ]),
    );
  upcoming()
    .slice(0, 2)
    .forEach((b) => a.push(['Bookings · ' + b.when, esc(svcOf(b).name), esc(b.who), 'booking:' + b.id, false]));
  return a;
}
live(OV, 'alerts', () => {
  const a = liveAlerts();
  return `<div class="scrim" data-act="close" style="background:rgba(23,28,60,.15)"></div><div class="pop"><div class="row" style="padding:14px 16px;border-bottom:1px solid var(--line-soft)"><b class="sp">Alerts</b></div>${a.length ? a.map((x) => `<button class="li" data-go="${x[3]}" data-close="1" style="padding:12px 16px"><span class="unread" style="background:${x[4] ? 'var(--negative)' : 'var(--primary)'}"></span><div class="sp"><div class="tiny muted">${x[0]}</div><b class="small">${x[1]}</b><div class="small muted">${x[2]}</div></div></button>`).join('') : '<div style="padding:24px 12px;text-align:center" class="small muted">No alerts. You are all caught up.</div>'}</div>`;
});

/* ---------- storefront and sharing use the real link ---------- */
live(V, 'storefront', (orig) => {
  const u = location.protocol + '//' + location.host + '/s/' + USER.handle;
  return orig().replace(
    '<button class="btn line sm" data-act="soon">Open shop</button>',
    `<a class="btn line sm" href="${u}" target="_blank" rel="noopener">Open shop</a>`,
  );
});
live(window, 'openShop', () =>
  window.open(location.protocol + '//' + location.host + '/s/' + USER.handle, '_blank', 'noopener'),
);

/* ---------- Razorpay settings: shows the server's real state ---------- */
const rzS = () => D.rz || {};
function rzpGuideLive(m) {
  const st = D.rzp,
    r = rzS(),
    n = st.filter(Boolean).length,
    on = r.configured;
  const steps = [
    [
      'Create your Razorpay account',
      'Sign up on Razorpay with your business email and mobile number, then confirm the OTP. It is free to sign up.',
      rlink(RZP.signup, 'Open Razorpay sign-up'),
    ],
    [
      'Finish business verification (KYC)',
      'Razorpay asks for your business type, PAN, address and the bank account where your money should land. They review it before live payments switch on, which can take a few days.',
      rlink(RZP.dash, 'Open Razorpay Dashboard'),
    ],
    [
      'Get your test keys',
      'In the Razorpay Dashboard, switch on Test Mode, then open Account & Settings › API keys and generate a key. You get a Key ID (starts with rzp_test_) and a Key Secret. For a UPI test, pay with <b>success@razorpay</b>; to see a failed payment use <b>failure@razorpay</b>.<div class="banner" style="margin:10px 0;background:var(--negative-tint);color:var(--negative-deep)">' +
        I('shield', 18) +
        '<div><b>Keep your Key Secret private.</b> Never paste it into this dashboard, a chat or an email.</div></div>',
      rlink(RZP.docs, 'Razorpay guides'),
    ],
    [
      'Put the keys on the Stoora server',
      'Open the <b>.env</b> file in the Stoora folder on the server and fill in <b>RAZORPAY_KEY_ID</b> and <b>RAZORPAY_KEY_SECRET</b>. Then restart the server. The keys stay on the server and never reach the browser.<div class="small" style="margin-top:8px">Status: ' +
        (on
          ? `<span class="tag ok">Keys found · ${r.mode} mode</span>`
          : '<span class="tag warn">No keys on the server yet</span>') +
        '</div>',
      '<button class="btn ink sm" data-act="rzpcheckconn">Check connection</button>',
    ],
    [
      'Add the webhook, then test a payment',
      'In Razorpay Dashboard › Account & Settings › Webhooks, add this address and pick the events <b>payment.captured</b>, <b>payment.failed</b>, <b>order.paid</b> and <b>refund.processed</b>. Set a secret, put it in <b>RAZORPAY_WEBHOOK_SECRET</b> in .env, and restart. Then open your shop page, buy something for ₹1 and watch the order turn Paid.<div class="card small" style="margin-top:10px;word-break:break-all"><b>' +
        esc(r.webhookUrl || '') +
        '</b></div><div class="small" style="margin-top:8px">Webhook secret: ' +
        (r.webhookConfigured ? '<span class="tag ok">set</span>' : '<span class="tag warn">not set</span>') +
        '</div>' +
        (r.webhookUrl && /localhost|127\.0\.0\.1/.test(r.webhookUrl)
          ? '<div class="small muted" style="margin-top:8px">This address is on your own computer, so Razorpay cannot reach it. Put Stoora on a public web address first (or use a tunnel while testing).</div>'
          : ''),
      '<button class="btn grey sm" data-act="rzpcopyhook">Copy webhook address</button>',
    ],
  ];
  const pays = r.payments || [];
  return `<div class="sec-t">Setting up Razorpay on this server</div><p class="small muted" style="margin:-4px ${m} 8px">Razorpay needs keys on the Stoora server (whoever runs it does this once). Which Razorpay account receives the money depends on the status shown above.</p>
 <div class="banner ${on ? '' : 'info'}" style="margin-bottom:12px;${on ? 'background:var(--positive-tint);color:var(--positive-deep)' : ''}">${I('bill', 18)}<div>${on ? `<b>Razorpay keys are on the server (${r.mode} mode).</b> Buyers on your shop page see “Pay online”.` : "<b>Not connected yet.</b> Follow the five steps below. Steps 1, 2 and 3 happen on Razorpay's own site."}</div></div>
 <div class="card" style="padding:4px 14px"><div class="row" style="padding:12px 0"><b class="sp">Your progress</b><span class="small muted">${n} of 5 done</span></div><div class="meter" style="margin-bottom:6px"><i style="width:${n * 20}%"></i></div>
 ${steps.map((s, i) => `<div class="hr"></div><div class="row" style="align-items:flex-start;gap:12px;padding:14px 0"><button class="chk ${st[i] ? 'on' : ''}" data-act="rzpstep" data-i="${i}" aria-label="Mark step ${i + 1} done">${st[i] ? I('check', 14, 2.5) : ''}</button><div class="sp"><b>${i + 1}. ${s[0]}</b><div class="small muted" style="margin:4px 0 10px">${s[1]}</div>${s[2]}</div></div>`).join('')}</div>
 <div class="sec-t">Payments through Razorpay</div><p class="small muted" style="margin:-4px ${m} 8px">The latest online payments Stoora started. Paste a Razorpay payment ID to find one.</p>
 <div class="card"><div class="row" style="gap:8px"><input class="input sp" id="rzpid" placeholder="pay_..." aria-label="Razorpay payment ID" style="margin:0"><button class="btn main" data-act="rzpcheck">Find</button></div></div>
 ${
   pays.length
     ? `<div class="card" style="padding:4px 14px;margin-top:12px">${pays
         .slice(0, 8)
         .map(
           (p, i) =>
             `${i ? '<div class="hr"></div>' : ''}<div class="row" style="padding:10px 0"><span class="sp"><b>Order #${esc(p.order_id)}</b><br><span class="small muted">${esc(p.rzp_payment_id || p.rzp_order_id || '')}</span></span><b>${rs(p.amount / 100)}</b><span class="tag ${p.status === 'paid' ? 'ok' : p.status === 'failed' ? 'bad' : p.status === 'refunded' ? 'neutral' : 'warn'}">${esc(p.status)}</span></div>`,
         )
         .join('')}</div>`
     : '<div class="card small muted" style="margin-top:12px">No online payments yet.</div>'
 }
 <div class="sec-t">Good to know</div><div class="card" style="padding:4px 14px">${[
   [
     'Fees',
     'Razorpay charges a fee on each payment. See their current pricing before you go live.',
     rlink(RZP.price, 'Razorpay pricing'),
   ],
   [
     'Payouts',
     'Razorpay sends the money to the bank account in your Razorpay account. How fast depends on your Razorpay plan.',
     '',
   ],
   [
     'One Razorpay account',
     'This build uses one Razorpay account for the whole server. Paying each seller separately needs Razorpay Route, which is not set up.',
     '',
   ],
   [
     'Need help?',
     'Razorpay support and guides are on their site. Stoora cannot see or change your Razorpay account.',
     rlink(RZP.docs, 'Razorpay docs'),
   ],
 ]
   .map(
     (x, i) =>
       `${i ? '<div class="hr"></div>' : ''}<div style="padding:12px 0"><b>${x[0]}</b><div class="small muted" style="margin:4px 0 ${x[2] ? '8px' : '0'}">${x[1]}</div>${x[2]}</div>`,
   )
   .join('')}</div>`;
}
{
  const _sp2 = setPage;
  setPage = function (n, m) {
    return n === 'Payments' ? rzpGuideLive(m) + setPageOnly(n, m) : _sp2(n, m);
  };
}
function setPageOnly(n, m) {
  return (SETP[n] || [])
    .map(
      ([t, h, rows]) =>
        '<div class="sec-t">' +
        t +
        '</div><p class="small muted" style="margin:-4px ' +
        m +
        ' 8px">' +
        h +
        '</p>' +
        setRows(rows),
    )
    .join('');
}
async function refreshRz() {
  await loadExtras();
  render();
}

/* ---------- clicks for the real accounts (run before the prototype's own handler) ---------- */
document.addEventListener(
  'click',
  (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !D.live) return;
    const a = el.dataset.act,
      stop = () => {
        e.stopImmediatePropagation();
        e.preventDefault();
      };
    if (a === 'moneyrange') {
      stop();
      ui.moneyRange = el.dataset.v;
      return render();
    }
    if (a === 'remind' || a === 'sendlink' || a === 'remindbook') {
      stop();
      return a === 'sendlink' ? toast('Use “Copy UPI link” on the order page') : copyUpi();
    }
    if (a === 'markpaid') {
      stop();
      return markPaid();
    }
    if (a === 'rzpcheckconn') {
      stop();
      return refreshRz().then(() => toast(D.rz.configured ? 'Keys found on the server' : 'No keys on the server yet'));
    }
    if (a === 'rzpcopyhook') {
      stop();
      return copyText((D.rz || {}).webhookUrl || '', 'Webhook address copied');
    }
    if (a === 'aidesc') {
      stop();
      const t = gv('pt');
      if (!t) return toast('Type the title first');
      const c = gv('pf-cat'),
        s = gv('pf-sizes');
      document.getElementById('pd').value =
        `${t}${c ? ' (' + c + ')' : ''}. ${s ? 'Available in ' + s + '. ' : ''}Ordered straight from ${USER.shop}. Message us to order.`;
      return makeDirty();
    }
    if (a === 'rzpcheck') {
      stop();
      const v = gv('rzpid');
      const p = ((D.rz || {}).payments || []).find((x) => x.rzp_payment_id === v || x.rzp_order_id === v);
      if (!/^(pay|order)_[A-Za-z0-9]{10,20}$/.test(v)) return toast('A payment ID looks like pay_Abc123Def456gh');
      return dlg(
        p ? 'Found it' : 'Not in Stoora',
        p
          ? `<p style="margin:0 0 8px">Order <b>#${esc(p.order_id)}</b> · ${rs(p.amount / 100)}</p><p class="muted small" style="margin:0">Status in Stoora: <b>${esc(p.status)}</b></p>`
          : `<p style="margin:0 0 10px">Stoora has no payment with this ID. It may be from another account, or the webhook has not reached Stoora yet. Check it in your Razorpay Dashboard:</p><div class="card small"><b>${esc(v)}</b></div>`,
        null,
        `<button class="btn line" data-act="close">Close</button>${v.startsWith('pay_') ? `<a class="btn main" href="${RZP.pays}/${encodeURIComponent(v)}" target="_blank" rel="noopener noreferrer">Open in Razorpay</a>` : ''}`,
      );
    }
  },
  true,
);
/* the Razorpay "connect" dialog of the guide is replaced by the real status above */

/* ---------- ratings from buyer reviews ---------- */
const stars = (rating) =>
  '★'.repeat(Math.round(rating)) + '<span style="opacity:.25">' + '★'.repeat(5 - Math.round(rating)) + '</span>';

function ratingsCard() {
  const catalogue = [...D.products, ...D.services];
  const ranked = Object.entries((D.stats || {}).ratings || {})
    .map(([id, rating]) => ({ item: catalogue.find((product) => product.id === id), ...rating }))
    .filter((row) => row.item)
    .sort((a, b) => b.average - a.average || b.count - a.count)
    .slice(0, 5);
  const latest = (D.reviews || []).slice(0, 3);

  const rows = ranked
    .map(
      (row, index) =>
        `<div class="row" style="gap:10px;padding:8px 0;${index ? 'border-top:1px solid var(--line-soft)' : ''}"><span class="thumb xs" style="flex:none">${row.item.emoji || ''}</span><div class="sp"><b class="small">${esc(row.item.name)}</b><div class="tiny muted">${row.count} review${row.count > 1 ? 's' : ''}</div></div><div style="text-align:right"><b style="color:#b07a00;font-size:13px">${stars(row.average)}</b><div class="tiny muted">${row.average.toFixed(1)} out of 5</div></div></div>`,
    )
    .join('');
  const comments = latest
    .filter((review) => review.comment)
    .map(
      (review) =>
        `<p class="small" style="margin:8px 0 0"><b>${esc(review.who)}</b> ${stars(review.rating)}<br>${esc(review.comment)}</p>`,
    )
    .join('');

  return `<div class="card"><b style="text-decoration:underline dotted">Top rated</b><div class="small muted" style="margin:2px 0 6px">From buyer reviews</div>${rows || '<p class="muted small" style="margin:8px 0 0">No reviews yet. Buyers can rate what they bought from your shop page, under “Where is my order?”.</p>'}${comments}</div>`;
}
