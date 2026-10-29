/**
 * The sample shop's screens (Analytics ratings, discount ideas) and helpers every dashboard
 * file uses: DESK (laptop layout or phone layout), empty-state blocks, names shown in place
 * of the sample shop's, greeting by time of day.
 */

const DESK = !!document.getElementById('nav');
const SES = () => window.USER;
const emptyBlock = (msg, art = 'done') =>
  `<div class="card" style="text-align:center;padding:36px 20px;margin-top:16px">${ART(art, 100)}<div class="muted" style="margin-top:8px">${msg}</div></div>`;
const kpiRow = (a, c = '') =>
  `<div class="kpis ${DESK ? c : ''}">${a.map((k) => `<div class="kpi"><div class="k">${k[0]}</div><div class="v">${k[1]}</div></div>`).join('')}</div>`;
const noRows = (t) => `<tr><td colspan="9" class="muted" style="text-align:center;padding:28px">${t}</td></tr>`;
const noList = (t) => `<div class="muted" style="text-align:center;padding:28px">${t}</div>`;

/* ---------- show the signed-in person's own names instead of the sample shop ---------- */
const hello = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
function personalise() {
  const u = SES();
  if (!u || u.demo) return;
  const shop = u.shop || 'Your shop',
    first = (u.name || 'there').split(' ')[0],
    handle = u.handle || 'yourshop';
  const map = [
    ['Good morning, Meera!', hello() + ', ' + first + '!'],
    ['stoora.in/meerastudio', location.host + '/s/' + handle],
    ['meera@meerastudio.in', u.email],
    ['Meera Iyer', u.name],
    ['Meera Studio', shop],
    ['meerastudio', handle],
  ];
  ['#screen', '#nav', '#layer', '#sidepanel', '#floatbar'].forEach((sel) => {
    const root = document.querySelector(sel);
    if (!root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach((t) => {
      let v = t.nodeValue;
      const o = v;
      map.forEach(([a, b]) => {
        if (v.includes(a)) v = v.split(a).join(b);
      });
      if (v !== o) t.nodeValue = v;
    });
    root.querySelectorAll('.smark').forEach((m) => {
      if (m.textContent.trim() === 'M' && m.closest('#nav,.top,.setnav,.pop')) m.textContent = shop[0].toUpperCase();
    });
  });
  if (D.live) document.querySelectorAll('.nbell .dot,.top .ibtn .dot').forEach((d) => d.remove());
}
{
  const _r1 = render;
  render = function (s) {
    _r1(s);
    personalise();
  };
  const _rl3 = renderLayer;
  renderLayer = function () {
    _rl3();
    personalise();
  };
}

/* ---------- Analytics: what sells and what people rate ---------- */
const PERF = [
  ['p3', 9, 26091, 4.9, 38, 640],
  ['p1', 14, 20986, 4.8, 41, 512],
  ['p2', 7, 16093, 4.6, 19, 311],
  ['p4', 5, 3495, 4.2, 11, 190],
  ['v1', 21, 10479, 4.9, 27, 380],
];
function perfCards() {
  const items = PERF.map(([id, sold, rev, rate, rv, views]) => ({ p: prod(id), sold, rev, rate, rv, views }));
  const best = [...items].sort((a, b) => b.rev - a.rev),
    rated = [...items].filter((x) => x.rv >= 10).sort((a, b) => b.rate - a.rate || b.rv - a.rv),
    viewed = [...items].sort((a, b) => b.views - a.views).slice(0, 3);
  const max = best[0].rev,
    star = (r) => '★'.repeat(Math.round(r)) + '<span style="opacity:.25">' + '★'.repeat(5 - Math.round(r)) + '</span>';
  const th = (x) => `<span class="thumb xs" style="flex:none">${x.p.emoji}</span>`,
    sep = (i) => (i ? 'border-top:1px solid var(--line-soft)' : '');
  return `<div style="display:grid;gap:16px;margin-top:16px;grid-template-columns:${DESK ? '1fr 1fr' : '1fr'}">
 <div class="card"><b style="text-decoration:underline dotted">Best sellers</b><div class="small muted" style="margin:2px 0 6px">Most bought this week, by money earned</div>${best.map((x, i) => `<div class="row" style="gap:10px;padding:8px 0;${sep(i)}"><b class="muted" style="width:16px">${i + 1}</b>${th(x)}<div class="sp"><b class="small">${x.p.name}</b><div style="height:6px;background:var(--muted);border-radius:3px;margin-top:6px"><div style="width:${Math.round((x.rev / max) * 100)}%;height:100%;background:var(--primary);border-radius:3px"></div></div></div><div style="text-align:right"><b class="small">${rs(x.rev)}</b><div class="tiny muted">${x.sold} ${x.p.type ? 'seats booked' : 'sold'}</div></div></div>`).join('')}</div>
 <div class="card"><b style="text-decoration:underline dotted">Top rated</b><div class="small muted" style="margin:2px 0 6px">From buyer reviews (10 or more reviews)</div>${rated.map((x, i) => `<div class="row" style="gap:10px;padding:8px 0;${sep(i)}">${th(x)}<div class="sp"><b class="small">${x.p.name}</b><div class="tiny muted">${x.rv} reviews</div></div><div style="text-align:right"><b style="color:#b07a00;font-size:13px">${star(x.rate)}</b><div class="tiny muted">${x.rate.toFixed(1)} out of 5</div></div></div>`).join('')}</div>
 <div class="card"><b style="text-decoration:underline dotted">Most viewed</b><div class="small muted" style="margin:2px 0 6px">How many looked, and how many bought</div>${viewed.map((x, i) => `<div class="row" style="gap:10px;padding:8px 0;${sep(i)}">${th(x)}<div class="sp"><b class="small">${x.p.name}</b><div class="tiny muted">${x.views} views · ${x.sold} bought</div></div><span class="tag ${x.sold / x.views > 0.02 ? 'ok' : 'warn'}">${((x.sold / x.views) * 100).toFixed(1)}% bought</span></div>`).join('')}</div>
 <div class="aibox" style="align-self:start"><div class="who">${I('spark', 14)} What this tells you</div><p class="small" style="margin:6px 0 10px"><b>${best[0].p.name}</b> earns the most and is rated ${best[0].rate.toFixed(1)} out of 5. <b>${prod('p4').name}</b> sold 5 this week but is out of stock. Restock it before the weekend.</p><button class="btn ink sm" data-go="products" data-close="1">Open products</button></div></div>`;
}
{
  const _an = V.analytics;
  V.analytics = () => {
    const h = _an();
    const i = h.lastIndexOf('</div>');
    return h.slice(0, i) + perfCards() + h.slice(i);
  };
}

/* ---------- Discounts: ideas to start with ---------- */
const DISC = [
  [
    'Diwali sale',
    'Money off products',
    'DIWALI10',
    '% off',
    10,
    1500,
    'Festive weeks bring the most buyers. 10% off above ₹1,500.',
  ],
  [
    'Welcome offer',
    'Money off the order',
    'WELCOME100',
    '₹ off',
    100,
    999,
    '₹100 off a first order above ₹999. Gives new buyers a reason to try you.',
  ],
  [
    'Free delivery above ₹1,999',
    'Free delivery',
    'FREESHIP',
    '₹ off',
    60,
    1999,
    'Buyers add one more item to reach free delivery.',
  ],
  [
    'Buy 2 kurtas, get a dupatta free',
    'Buy X get Y',
    'KURTA2',
    '₹ off',
    699,
    0,
    'Raises the order size. The free dupatta costs you less than a second sale.',
  ],
  [
    'Returning student',
    'Money off products',
    'STUDENT100',
    '₹ off',
    100,
    0,
    '₹100 off the Wednesday yoga class for past students. Fills empty seats.',
  ],
  [
    'Weekend flash sale',
    'Money off products',
    'FLASH15',
    '% off',
    15,
    0,
    '15% off for 48 hours. Post it on WhatsApp and Instagram.',
  ],
];
function discIdeas() {
  return `<div class="sec-t" style="margin-top:20px">Ideas to start with</div><p class="small muted" style="margin:-4px 0 10px">Tap one and change the numbers before you save.</p><div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(${DESK ? '280px' : '100%'},1fr))">${DISC.map((d, i) => `<div class="card" style="margin:0"><div class="row" style="gap:8px"><b class="sp">${d[0]}</b><span class="mini">${d[2]}</span></div><div class="small muted" style="margin:6px 0 12px">${d[6]}</div><div class="row" style="gap:8px;flex-wrap:wrap"><span class="tag ok">${d[3] === '% off' ? d[4] + '% off' : '₹' + d[4] + ' off'}</span>${d[5] ? `<span class="tag neutral">Above ₹${d[5].toLocaleString('en-IN')}</span>` : ''}<span class="sp"></span><button class="btn grey sm" data-act="offeridea" data-i="${i}">Use this idea</button></div></div>`).join('')}</div>`;
}
{
  const _d0 = V.discounts0;
  V.discounts0 = () => {
    const h = _d0();
    const i = h.lastIndexOf('</div>');
    return h.slice(0, i) + discIdeas() + h.slice(i);
  };
  const _op = offersPage;
  offersPage = function () {
    const h = _op();
    const i = h.lastIndexOf('</div>');
    return h.slice(0, i) + discIdeas() + h.slice(i);
  };
}
makeOffer = function (kind, pre = {}) {
  dlg(
    'Create offer · ' + kind,
    fld('f1', 'Offer name or code', pre.name || '', 'e.g. DIWALI10') +
      sel('f2', 'Type', ['% off', '₹ off'], pre.type || '% off') +
      fld('f3', 'Amount', pre.amount || '', '10', 'number') +
      fld('f4', 'Minimum order (₹)', pre.min == null ? '0' : pre.min, '0', 'number'),
    () => {
      const a = +gv('f3');
      if (!gv('f1') || !(a > 0)) return toast('Add a name and an amount');
      D.offers.unshift({
        id: 'o' + Date.now(),
        name: gv('f1').toUpperCase(),
        kind,
        desc:
          (gv('f2') === '% off' ? a + '% off' : '₹' + a + ' off') +
          (+gv('f4') > 0 ? ' above ₹' + (+gv('f4')).toLocaleString('en-IN') : ''),
        on: true,
      });
      overlay = null;
      route = { name: 'discounts', arg: null };
      render(true);
      toast('Offer created');
    },
  );
};

/* ---------- Settings › Payments: Razorpay guide ---------- */
D.rzp = [false, false, false, false, false];
const RZP = {
  signup: 'https://dashboard.razorpay.com/signup',
  dash: 'https://dashboard.razorpay.com/',
  pays: 'https://dashboard.razorpay.com/app/payments',
  docs: 'https://razorpay.com/docs/',
  price: 'https://razorpay.com/pricing/',
};
const rlink = (u, t) =>
  `<a class="btn line sm" href="${u}" target="_blank" rel="noopener noreferrer">${t} ${I('right', 14)}</a>`;
document.addEventListener(
  'click',
  (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const a = el.dataset.act;
    if (a === 'offeridea') {
      e.stopImmediatePropagation();
      const d = DISC[+el.dataset.i];
      makeOffer(d[1], { name: d[2], type: d[3], amount: d[4], min: d[5] });
    } else if (a === 'rzpstep') {
      e.stopImmediatePropagation();
      D.rzp[+el.dataset.i] = !D.rzp[+el.dataset.i];
      render();
    }
  },
  true,
);

/* links styled as buttons keep the button colours */
{
  const st = document.createElement('style');
  st.textContent = 'a.btn{text-decoration:none}a.btn.line,a.btn.grey{color:var(--ink)}a.btn.main,a.btn.ink{color:#fff}';
  document.head.appendChild(st);
}
