const ART = (() => {
  const INK = '#171C3C',
    CREAM = '#FFFAEF',
    MUTED = '#F2EADD';
  let sd = 1;
  const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647 - 0.5;
  const ln = (a, b, c, d, w = 2) =>
    `<path d="M${(a + R() * 1.2).toFixed(1)} ${(b + R() * 1.2).toFixed(1)} Q${((a + c) / 2 + R() * 2.2).toFixed(1)} ${((b + d) / 2 + R() * 2.2).toFixed(1)} ${(c + R() * 1.2).toFixed(1)} ${(d + R() * 1.2).toFixed(1)}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" pathLength="1"/>`;
  const box = (x, y, w, h, f, sw = 2) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>` +
    ln(x - 1.5, y, x + w + 1.5, y, sw) +
    ln(x + w, y - 1.5, x + w, y + h + 1.5, sw) +
    ln(x + w + 1.5, y + h, x - 1.5, y + h, sw) +
    ln(x, y + h + 1.5, x, y - 1.5, sw);
  const ground = `<ellipse cx="60" cy="92" rx="44" ry="5" fill="${MUTED}"/>`;
  const awn = (x, y, w, c) => {
    let s = box(x, y, w, 14, c);
    const n = Math.round(w / 14),
      r = w / n / 2;
    for (let i = 0; i < n; i++) {
      const cx = x + r + i * 2 * r;
      s += `<path d="M${cx - r} ${y + 14} A${r} ${r * 0.8} 0 0 0 ${cx + r} ${y + 14}" fill="${c}" stroke="${INK}" stroke-width="1.8"/>`;
    }
    return s;
  };
  const board = (cx, y, t, fs = 10) => {
    const w = t.length * fs * 0.56 + 18,
      h = fs + 12;
    return (
      ln(cx - w / 2 + 8, y - 10, cx - w / 2 + 11, y, 1.4) +
      ln(cx + w / 2 - 8, y - 10, cx + w / 2 - 11, y, 1.4) +
      `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="${h}" rx="6" fill="${INK}"/><rect x="${cx - w / 2 + 3}" y="${y + 3}" width="${w - 6}" height="${h - 6}" rx="4" fill="none" stroke="${CREAM}" stroke-opacity=".5"/><text x="${cx}" y="${y + h / 2 + fs * 0.36}" text-anchor="middle" font-size="${fs}" font-family="Bricolage Grotesque,sans-serif" font-weight="800" fill="#FFFFFF">${t}</text>`
    );
  };
  const D = {
    product: () =>
      ground +
      ln(60, 10, 60, 18, 1.8) +
      `<path d="M40 28 L60 18 L80 28" fill="none" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M44 28 L76 28 L84 40 L76 45 L76 86 L44 86 L44 45 L36 40 Z" fill="#EF7F3D" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>` +
      ln(60, 30, 60, 54, 1.6) +
      `<circle cx="60" cy="62" r="2" fill="${INK}"/><circle cx="60" cy="70" r="2" fill="${INK}"/>`,
    chat: () =>
      ground +
      box(22, 18, 58, 38, '#D13A5B') +
      `<path d="M32 56 l-5 13 l16 -13" fill="#D13A5B" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><circle cx="39" cy="37" r="3" fill="#FFFFFF"/><circle cx="51" cy="37" r="3" fill="#FFFFFF"/><circle cx="63" cy="37" r="3" fill="#FFFFFF"/>` +
      box(62, 52, 40, 26, CREAM) +
      `<path d="M92 78 l4 10 l-12 -10" fill="${CREAM}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>` +
      ln(70, 61, 94, 61, 1.6) +
      ln(70, 69, 86, 69, 1.6),
    camera: () =>
      ground +
      box(26, 32, 68, 48, '#5F3BA8') +
      box(40, 24, 18, 8, '#5F3BA8', 1.8) +
      `<circle cx="60" cy="56" r="15" fill="${CREAM}" stroke="${INK}" stroke-width="2"/><circle cx="60" cy="56" r="7" fill="${INK}"/><circle cx="83" cy="41" r="3" fill="#FFB407" stroke="${INK}" stroke-width="1.4"/>`,
    upi: () =>
      ground +
      box(38, 10, 40, 76, '#FFFFFF') +
      ln(52, 16, 64, 16, 1.6) +
      `<circle cx="58" cy="46" r="12" fill="#DCEFDF"/><path d="M52 46 l4 4 l8 -8" fill="none" stroke="#065F37" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` +
      ln(48, 70, 68, 70, 1.6) +
      `<circle cx="86" cy="72" r="13" fill="#FFB407" stroke="${INK}" stroke-width="2"/><text x="86" y="77" text-anchor="middle" font-size="14" font-family="Lexend,sans-serif" font-weight="600" fill="${INK}">₹</text>`,
    look: () =>
      ground +
      box(28, 44, 64, 44, CREAM) +
      awn(24, 38, 72, '#F4A24A') +
      box(34, 60, 22, 16, '#FFFFFF', 1.6) +
      box(66, 60, 18, 28, '#FFFFFF', 1.6) +
      board(60, 14, 'your shop', 9) +
      ln(18, 89, 102, 89, 2),
    link: () =>
      ground +
      board(60, 20, 'stoora.in/meera', 10) +
      ln(28, 62, 92, 62, 1.6) +
      `<path d="M44 74 a7 7 0 0 1 0 -10 l6 -6 a7 7 0 0 1 10 10" fill="none" stroke="#DC4A3A" stroke-width="3" stroke-linecap="round"/><path d="M76 66 a7 7 0 0 1 0 10 l-6 6 a7 7 0 0 1 -10 -10" fill="none" stroke="#DC4A3A" stroke-width="3" stroke-linecap="round"/>`,
    gift: () =>
      ground +
      box(30, 42, 60, 44, '#DC4A3A') +
      box(26, 32, 68, 12, '#DC4A3A') +
      box(54, 32, 12, 54, CREAM, 1.8) +
      `<path d="M60 32 c-10 -16 -24 -8 -12 0 M60 32 c10 -16 24 -8 12 0" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` +
      box(84, 52, 20, 12, '#FFE9B0', 1.6) +
      `<text x="94" y="61" text-anchor="middle" font-size="8" font-family="Lexend,sans-serif" font-weight="600" fill="${INK}">%</text>`,
    done: () =>
      ground +
      box(30, 40, 60, 44, '#F4A24A') +
      ln(60, 40, 60, 84, 1.6) +
      ln(30, 56, 90, 56, 1.6) +
      `<circle cx="86" cy="34" r="13" fill="#DCEFDF" stroke="${INK}" stroke-width="2"/><path d="M80 34 l4 4 l8 -8" fill="none" stroke="#065F37" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  };
  return (k, h = 100) => {
    sd = ([...k].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 2147483646) + 1;
    return `<svg class="art" viewBox="0 0 120 100" height="${h}" width="${h * 1.2}" role="img" aria-hidden="true" style="display:block;margin:0 auto;max-width:100%">${(D[k] || D.done)()}</svg>`;
  };
})();

/* ================= Stoora dashboard — design reference build =================
   Sample shop: Meera Studio (kurtas, dupattas, yoga classes). All data below is example data.
   Structure for the Next.js port: each screen is a pure function (state) -> {meta, html};
   overlays are separate functions; events are delegated through data-act attributes. */

/* ---------- helpers ---------- */
const ic = (n, c = '') => `<span class="ms ${c}" aria-hidden="true">${n}</span>`;
const rs = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const bdg = (k, i, w) => `<span class="bdg ${k}">${ic(i)}${w}</span>`;
const SRC = {
  WhatsApp: 'chat',
  Instagram: 'photo_camera',
  'Shop link': 'link',
  'In person': 'storefront',
  'Phone call': 'call',
  Other: 'more_horiz',
};
const src = (s) => `<span class="src">${ic(SRC[s] || 'link')}${s}</span>`;
const initials = (n) =>
  n
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
const avc = (n) => 'c' + (1 + ([...n].reduce((a, c) => a + c.charCodeAt(0), 0) % 4));
const av = (n, cls = '') => `<span class="av ${avc(n)} ${cls}" aria-hidden="true">${initials(n)}</span>`;
const payB = (o) =>
  o.pay === 'cod' && !o.paid
    ? bdg('neutral', 'payments', 'Cash on delivery')
    : o.paid
      ? bdg('ok', 'check_circle', 'Paid')
      : bdg('warn', 'schedule', 'Unpaid');
const shipB = (o) => (o.shipped ? bdg('neutral', 'done_all', 'Shipped') : bdg('warn', 'local_shipping', 'To ship'));
const plural = (n, w, p = w + 's') => `${n} ${n === 1 ? w : p}`;
const $ = (s) => document.querySelector(s);

/* ---------- sample data ---------- */
function fresh() {
  return {
    shop: {
      name: 'Meera Studio',
      handle: 'meera',
      owner: 'Meera',
      email: 'meera.studio@example.in',
      phone: '+91 98480 21234',
      city: 'Jaipur, Rajasthan',
      open: true,
      prices: true,
      cod: true,
    },
    newShop: false,
    setupDone: { product: true, payments: true },
    setupHidden: {},
    products: [
      {
        id: 'p1',
        name: 'Handblock cotton kurta',
        color: 'Natural white',
        sizes: ['S', 'M', 'L', 'XL'],
        price: 1499,
        stock: 24,
        icon: 'checkroom',
        status: 'Active',
        sold: 31,
        views: 9,
      },
      {
        id: 'p2',
        name: 'Silk dupatta, maroon',
        color: 'Maroon',
        price: 2299,
        stock: 7,
        icon: 'dry_cleaning',
        status: 'Active',
        sold: 12,
        views: 4,
      },
      {
        id: 'p3',
        name: 'Indigo kurta set',
        color: 'Indigo blue',
        sizes: ['M', 'L'],
        price: 2899,
        stock: 3,
        icon: 'apparel',
        status: 'Active',
        sold: 22,
        views: 12,
      },
      {
        id: 'p6',
        name: 'Handblock kurta, sky blue',
        color: 'Sky blue',
        sizes: ['S', 'M', 'L', 'XL'],
        price: 1599,
        stock: 10,
        icon: 'checkroom',
        status: 'Active',
        sold: 14,
        views: 7,
      },
      {
        id: 'p4',
        name: 'Cotton dupatta, mustard',
        color: 'Mustard',
        price: 699,
        stock: 0,
        icon: 'texture',
        status: 'Active',
        sold: 18,
        views: 6,
      },
      {
        id: 'p5',
        name: 'Linen kurta, sage',
        color: 'Sage green',
        sizes: ['S', 'M', 'L'],
        price: 1899,
        stock: 12,
        icon: 'apparel',
        status: 'Draft',
        sold: 0,
        views: 0,
      },
    ],
    services: [
      {
        id: 'v1',
        name: 'Morning yoga (group class)',
        type: 'Class',
        price: 499,
        mins: 60,
        next: 'Wed 7:00 am · 4 seats left',
        icon: 'self_improvement',
      },
      {
        id: 'v2',
        name: '1-on-1 yoga session',
        type: '1-on-1',
        price: 1200,
        mins: 60,
        next: 'Thu 6:00 pm',
        icon: 'person',
      },
      {
        id: 'v3',
        name: 'Yoga for beginners e-book',
        type: 'Digital',
        price: 299,
        mins: 0,
        next: 'Instant download',
        icon: 'menu_book',
      },
    ],
    orders: [
      {
        id: 1012,
        who: 'Priya Sharma',
        phone: '+91 98xxx x1234',
        items: [
          ['p1', 1],
          ['p2', 1],
        ],
        total: 3798,
        paid: true,
        pay: 'upi',
        shipped: false,
        src: 'WhatsApp',
        when: 'Today, 10:42 am',
        city: 'Pune',
      },
      {
        id: 1011,
        who: 'Rahul Verma',
        phone: '+91 90xxx x4410',
        items: [['p1', 1]],
        total: 1499,
        paid: false,
        pay: 'upi',
        shipped: false,
        src: 'Instagram',
        when: 'Yesterday, 6:15 pm',
        city: 'Lucknow',
      },
      {
        id: 1010,
        who: 'Anjali Rao',
        phone: '+91 99xxx x5521',
        items: [['p3', 1]],
        total: 2899,
        paid: true,
        pay: 'upi',
        shipped: true,
        courier: 'Delhivery',
        track: 'DL4482190',
        src: 'Shop link',
        when: '23 Oct, 2:05 pm',
        city: 'Bengaluru',
      },
      {
        id: 1009,
        who: 'Walk-in buyer',
        phone: '',
        items: [['p4', 1]],
        total: 699,
        paid: true,
        pay: 'cash',
        shipped: true,
        src: 'In person',
        when: '22 Oct, 11:30 am',
        city: 'Jaipur',
      },
    ],
    bookings: [
      { id: 'B-208', who: 'Kavya Iyer', svc: 'v1', when: 'Today, 7:00 am', day: 'Today', paid: true, status: 'Done' },
      {
        id: 'B-209',
        who: 'Arjun Mehta',
        svc: 'v2',
        when: 'Thu 30 Oct, 6:00 pm',
        day: 'Thu 30 Oct',
        paid: false,
        status: 'Upcoming',
      },
      {
        id: 'B-210',
        who: 'Sneha Kulkarni',
        svc: 'v1',
        when: 'Wed 29 Oct, 7:00 am',
        day: 'Wed 29 Oct',
        paid: true,
        status: 'Upcoming',
      },
    ],
    chats: [
      {
        id: 'c1',
        who: 'Priya Sharma',
        mood: 'ready',
        src: 'WhatsApp',
        last: 'Is the indigo set there in size M?',
        time: '2 min',
        unread: true,
        msgs: [
          ['them', 'Hi, loved the kurta I got last week', '10:31 am'],
          ['them', 'Is the indigo set there in size M?', '10:32 am'],
        ],
        draft:
          'Hi Priya, yes — the indigo kurta set is in stock in M, only 3 left. It is ₹2,899. Shall I send you a UPI link to book it?',
      },
      {
        id: 'c2',
        who: 'Rohan Das',
        mood: 'ready',
        src: 'Instagram',
        last: 'How do I pay for the yoga class?',
        time: '18 min',
        unread: true,
        msgs: [['them', 'How do I pay for the yoga class?', '10:16 am']],
        draft:
          'Hi Rohan, the morning yoga class is ₹499. Wednesday 7 am has 4 seats left. I will send you a UPI link now.',
      },
      {
        id: 'c3',
        who: 'Anjali Rao',
        mood: 'upset',
        src: 'WhatsApp',
        last: "My parcel still hasn't come",
        time: '1 hr',
        unread: true,
        msgs: [
          ['them', "My parcel still hasn't come", '9:20 am'],
          ['them', 'It has been 4 days', '9:21 am'],
        ],
        draft:
          'Sorry for the wait, Anjali. Order #1010 left on 23 Oct with Delhivery, tracking DL4482190. It should reach you tomorrow — I will keep checking and message you.',
      },
      {
        id: 'c4',
        who: 'Neha Joshi',
        mood: 'look',
        src: 'Instagram',
        last: 'Such lovely colours',
        time: '3 hr',
        unread: false,
        msgs: [['them', 'Such lovely colours', '7:48 am']],
        draft: 'Thank you, Neha. New block prints go up every Friday — shall I message you when they are live?',
      },
    ],
    customers: [
      {
        name: 'Priya Sharma',
        phone: '+91 98xxx x1234',
        city: 'Pune',
        orders: 3,
        spent: 7196,
        last: 'Today',
        src: 'WhatsApp',
      },
      {
        name: 'Kavya Iyer',
        phone: '+91 97xxx x8890',
        city: 'Jaipur',
        orders: 6,
        spent: 2994,
        last: 'Today',
        src: 'Instagram',
      },
      {
        name: 'Anjali Rao',
        phone: '+91 99xxx x5521',
        city: 'Bengaluru',
        orders: 2,
        spent: 4398,
        last: '23 Oct',
        src: 'Shop link',
      },
      {
        name: 'Rahul Verma',
        phone: '+91 90xxx x4410',
        city: 'Lucknow',
        orders: 1,
        spent: 0,
        last: 'Yesterday',
        src: 'Instagram',
      },
      {
        name: 'Arjun Mehta',
        phone: '+91 88xxx x0912',
        city: 'Jaipur',
        orders: 1,
        spent: 0,
        last: 'Yesterday',
        src: 'WhatsApp',
      },
    ],
    ideas: [
      {
        id: 'i1',
        icon: 'photo_camera',
        seg: 'reel',
        text: 'The indigo kurta set has 3 left, and 12 people looked at it yesterday. Share “Only 3 left” with your customers?',
        earn: 8600,
        cost: 0,
        act: 'Copy message',
        done: 'Message copied. Share it where your customers are',
      },
      {
        id: 'i2',
        icon: 'currency_rupee',
        seg: 'pay',
        text: 'Rahul has not paid ₹1,499 for 2 days. Send him a gentle UPI reminder?',
        earn: 1499,
        cost: 0,
        act: 'Send reminder',
        done: 'Reminder sent to Rahul',
      },
      {
        id: 'i3',
        icon: 'self_improvement',
        seg: 'chat',
        text: 'Wednesday’s morning yoga has 4 seats free. Offer ₹100 off to your 9 past students?',
        earn: 1600,
        cost: 400,
        act: 'Send offer',
        done: 'Offer sent to 9 past students',
      },
    ],
    ideasGone: [],
    offers: [
      { code: 'DIWALI10', what: '10% off everything', used: 14, ends: 'Ends 2 Nov', on: true },
      { code: 'YOGA100', what: '₹100 off yoga classes', used: 3, ends: 'Ends 30 Oct', on: true },
      { code: 'FIRSTKURTA', what: '₹150 off first order', used: 41, ends: 'No end date', on: false },
    ],
    alerts: [
      {
        icon: 'shopping_bag',
        t: 'New order #1012 from Priya Sharma',
        s: '₹3,798 · paid by UPI',
        when: '10:42 am',
        go: 'order-1012',
      },
      {
        icon: 'inventory_2',
        t: 'Cotton dupatta, mustard is sold out',
        s: 'Buyers can still see it. Restock or hide it.',
        when: '9:05 am',
        go: 'products',
      },
      {
        icon: 'event',
        t: 'Arjun booked a 1-on-1 session',
        s: 'Thu 30 Oct, 6:00 pm · not paid yet',
        when: 'Yesterday',
        go: 'booking-B-209',
      },
    ],
    payouts: { acct: 'HDFC ••4421', next: 8120, date: 'Tue 28 Oct' },
    askLog: [],
    nextOrder: 1013,
  };
}
let S = fresh();
const prod = (id) => S.products.find((p) => p.id === id) || S.services.find((s) => s.id === id);
const ord = (id) => S.orders.find((o) => String(o.id) === String(id));

/* ---------- UI state (not data) ---------- */
let ui = {
  orderFilter: 'All',
  orderQ: '',
  prodQ: '',
  chatTab: 'ready',
  moneyRange: 'today',
  anRange: '7',
  setQ: '',
  draft: { who: '', phone: '', items: [], pay: 'paid', errors: {} },
  form: {},
  dirty: false,
  editing: {},
  chatOpen: null,
};

/* ---------- router (plain #name hashes only) ---------- */
let route = 'home',
  prevRoute = null,
  overlay = null;
function parseHash() {
  const h = (location.hash || '').slice(1);
  return h || 'home';
}
function go(r, ov) {
  if (ui.dirty && r !== route) {
    askDiscard(() => {
      ui.dirty = false;
      go(r, ov);
    });
    return;
  }
  if (location.hash.slice(1) !== r) {
    pendingOv = ov || null;
    location.hash = r;
    return;
  }
  render(true);
  if (ov) openOv(ov);
}
let pendingOv = null;
window.addEventListener('hashchange', () => {
  const r = parseHash();
  if (ui.dirty && r !== route) {
    const back = route;
    history.replaceState(null, '', '#' + back);
    askDiscard(() => {
      ui.dirty = false;
      location.hash = r;
    });
    return;
  }
  closeOv(true);
  render(true);
  if (pendingOv) {
    const o = pendingOv;
    pendingOv = null;
    openOv(o);
  }
});

/* ---------- navigation model ---------- */
const NAV = [
  { r: 'home', i: 'home', l: 'Home' },
  {
    r: 'orders',
    i: 'inbox',
    l: 'Orders',
    cnt: () => S.orders.filter((o) => !o.shipped && o.pay !== 'cash').length,
    sub: [{ r: 'bookings', l: 'Bookings' }],
  },
  { r: 'products', i: 'sell', l: 'Products', sub: [{ r: 'services', l: 'Services' }] },
  { r: 'chats', i: 'forum', l: 'Chats', cnt: () => S.chats.filter((c) => c.unread).length, hot: true },
  { r: 'customers', i: 'group', l: 'Customers' },
  { r: 'money', i: 'account_balance_wallet', l: 'Money' },
  { r: 'analytics', i: 'bar_chart', l: 'Analytics' },
  { r: 'offers', i: 'local_offer', l: 'Discounts & offers' },
  { r: 'payments', i: 'credit_card', l: 'Payments' },
  { r: 'help', i: 'help', l: 'Help & Support' },
  { r: 'profile', i: 'person', l: 'Profile' },
];
const CHANNELS = [
  { r: 'storefront', i: 'storefront', l: 'Storefront' },
  { r: 'chats', i: 'chat', l: 'WhatsApp', k: 'wa' },
  { r: 'chats', i: 'photo_camera', l: 'Instagram', k: 'ig' },
];
function tabOf(r) {
  if (/^(orders|bookings|order-|booking-|create-order)/.test(r)) return 'orders';
  if (/^(product|services|add-)/.test(r)) return 'products';
  if (/^chat/.test(r)) return 'chats';
  if (/^customer/.test(r)) return 'customers';
  if (r.startsWith('shop-settings')) return 'shop-settings';
  return r === 'new-shop' ? 'home' : r;
}

function sideHTML() {
  const t = tabOf(route);
  const item = (n) => {
    const c = n.cnt ? n.cnt() : 0;
    const on = t === n.r && !(n.sub || []).some((s) => s.r === route);
    return (
      `<a class="nav ${on ? 'on' : ''}" href="#${n.r}" ${on ? 'aria-current="page"' : ''} title="${n.l}">${ic(n.i)}<span class="lbl">${n.l}</span>${c ? `<span class="cnt ${n.hot ? 'hot' : ''}" aria-label="${c} new">${c}</span>` : ''}</a>` +
      (n.sub && t === n.r
        ? n.sub.map((s) => `<a class="nav sub ${route === s.r ? 'on' : ''}" href="#${s.r}">${s.l}</a>`).join('')
        : '')
    );
  };
  return `<div class="side-in">
  <a class="brand" href="#home" aria-label="stoora.in home"><span class="appicon" aria-hidden="true">S</span><span class="wordmark">stoora<i>.in</i></span></a>
  <button class="sbtn-search" data-act="search" title="Search">${ic('search', 'sm')}<span class="txt">Search</span><kbd>Ctrl K</kbd></button>
  ${NAV.map(item).join('')}
  <div class="ngroup">Sales channels</div>
  ${CHANNELS.map((c) => `<a class="nav ${c.r === 'storefront' && t === 'storefront' ? 'on' : ''}" href="#${c.r}" title="${c.l}">${ic(c.i)}<span class="lbl">${c.l}</span></a>`).join('')}
  <div class="side-foot">
   <a class="nav ${t === 'shop-settings' ? 'on' : ''}" href="#shop-settings" title="Settings">${ic('settings')}<span class="lbl">Settings</span></a>
   <button class="shopbtn" data-act="alerts" title="Alerts"><span class="shop-av" aria-hidden="true">${esc(S.shop.name[0].toUpperCase())}</span><span class="txt grow"><b>${esc(S.shop.name)}</b><small>stoora.in/${S.shop.handle}</small></span><span class="ms sm txt" aria-hidden="true">notifications</span></button>
  </div></div>`;
}

function bbarHTML() {
  const t = tabOf(route);
  const unread = S.chats.some((c) => c.unread);
  const tab = (r, i, l, b) =>
    `<a href="#${r}" class="${t === r ? 'on' : ''}" ${t === r ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span>${b ? '<i class="bd" aria-label="new"></i>' : ''}</a>`;
  return `<button class="round" data-act="menu" aria-label="Open menu">${ic('menu')}</button>
  <div class="pill" role="navigation" aria-label="Main">${tab('home', 'home', 'Home')}${tab('orders', 'inbox', 'Orders')}${tab('products', 'sell', 'Products')}${tab('chats', 'forum', 'Chats', unread)}</div>
  <button class="round" data-act="ask" aria-label="Ask Stoora"><span class="smark" aria-hidden="true">S</span></button>`;
}

/* ---------- render ---------- */
function renderApp(enter) {
  route = parseHash();
  if (!resolve(route)) route = 'home';
  const scr = resolve(route) || SCREENS.home;
  let m;
  try {
    m = scr.fn(scr.arg);
  } catch (e) {
    console.error(e);
    m = SCREENS.home.fn();
  }
  ui.meta = m;
  document.title = (m.title ? m.title + ' · ' : '') + 'Stoora';
  $('#side').innerHTML = sideHTML();
  $('#bbar').innerHTML = bbarHTML();
  $('#bbar').classList.toggle('hide', !!m.hideBar);
  const unreadAlerts = S.alerts.length;
  const phoneLeft = m.back
    ? `<a class="ibtn" href="#${m.back[1]}" aria-label="Back to ${m.back[0]}">${ic('arrow_back')}</a><div class="ttl"><span class="t-body">${m.back[0]}</span></div>`
    : `<div class="ttl"><span class="shop-av" aria-hidden="true">${esc(S.shop.name[0].toUpperCase())}</span><span>${esc(S.shop.name)}</span></div>`;
  const crumbs = (m.crumb || []).map(([l, r]) => `<a href="#${r}">${l}</a>${ic('chevron_right', 'xs t-cap')}`).join('');
  const view = $('#view');
  view.innerHTML = `
  <header class="top page" style="padding-bottom:var(--s2)">${phoneLeft}<div class="acts">${m.phoneActs || ''}<button class="ibtn" data-act="search" aria-label="Search">${ic('search', 'sm')}</button><button class="ibtn" data-act="alerts" aria-label="Alerts, ${unreadAlerts} new">${ic('notifications', 'sm')}${unreadAlerts ? `<span class="dotn">${unreadAlerts}</span>` : ''}</button></div></header>
  <header class="dbar"><nav class="crumb" aria-label="Breadcrumb">${crumbs}<b>${m.crumbTitle || m.title}</b></nav>
   <button class="dask" data-act="ask" aria-label="Ask Stoora"><span class="smark xs" aria-hidden="true">S</span>Ask Stoora anything<kbd>Ctrl J</kbd></button>
   <button class="ibtn flat" data-act="alerts" aria-label="Alerts, ${unreadAlerts} new">${ic('notifications', 'sm')}${unreadAlerts ? `<span class="dotn">${unreadAlerts}</span>` : ''}</button></header>
  <div class="page ${m.narrow ? 'narrow' : ''} ${enter ? 'enter' : ''}" id="pg">${m.body}</div>`;
  if (enter) {
    const main = $('#main');
    if (window.innerWidth >= 760) {
      main.scrollTop = 0;
    }
    window.scrollTo(0, 0);
    setTimeout(() => {
      const p = $('#pg');
      p && p.classList.remove('enter');
    }, 1400);
  }
  countUp();
  if (m.after) m.after();
  renderDock();
  if (typeof syncSave === 'function') syncSave();
}
function countUp() {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  document.querySelectorAll('#pg.enter [data-count]').forEach((el) => {
    const end = +el.dataset.count,
      pre = el.dataset.pre || '',
      t0 = performance.now(),
      d = 700;
    const f = (t) => {
      const k = Math.min(1, (t - t0) / d),
        v = end * (1 - Math.pow(1 - k, 3));
      el.textContent = pre + Math.round(v).toLocaleString('en-IN');
      if (k < 1) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
}
const cnt = (n, pre = '') =>
  `<span data-count="${n}" data-pre="${pre}">${pre}${Math.round(n).toLocaleString('en-IN')}</span>`;

/* toast with optional undo */
let toastT;
function toast(msg, undo, icon = 'check_circle') {
  clearTimeout(toastT);
  const z = $('#toastz');
  z.innerHTML = `<div class="toast" role="status">${ic(icon)}<span>${esc(msg)}</span>${undo ? '<button data-act="undo">Undo</button>' : ''}</div>`;
  window._undo = undo || null;
  toastT = setTimeout(
    () => {
      z.innerHTML = '';
      window._undo = null;
    },
    undo ? 6000 : 3200,
  );
}

/* ================= screens ================= */
const sheetBtnClose = `<button class="ibtn flat" data-act="close" aria-label="Close">${ic('close')}</button>`;
const emptyState = (art, title, text, btn = '') =>
  `<div class="empty anim">${ART(art, 88)}<div class="ct">${title}</div><p class="t-body">${text}</p>${btn}</div>`;

function counts() {
  const o = S.orders;
  return {
    toShip: o.filter((x) => !x.shipped && (x.paid || x.pay === 'cod')).length,
    unpaid: o.filter((x) => !x.paid).length + S.bookings.filter((b) => !b.paid).length,
    unpaidOrders: o.filter((x) => !x.paid).length,
    replies: S.chats.filter((c) => c.unread).length,
    bookToday: S.bookings.filter((b) => b.day === 'Today').length,
    done: o.filter((x) => x.shipped && x.paid).length,
  };
}

/* ---------- HOME ---------- */
function homeScreen() {
  if (S.newShop) return newShopScreen();
  const c = counts();
  const ideas = S.ideas.filter((i) => !S.ideasGone.includes(i.id));
  const earnSum = ideas.reduce((a, i) => a + i.earn, 0);
  const todo = [
    c.toShip && {
      r: 'orders',
      f: 'To ship',
      i: 'local_shipping',
      k: 'shop',
      t: 'Ship orders',
      s: 'Paid and waiting to leave',
      n: c.toShip,
    },
    c.replies && {
      r: 'chats',
      i: 'forum',
      k: 'chat',
      t: 'Reply to buyers',
      s: 'Replies are drafted for you',
      n: c.replies,
    },
    c.unpaid && {
      r: 'money',
      i: 'currency_rupee',
      k: 'pay',
      t: 'Collect payments',
      s: 'UPI pending from buyers',
      n: c.unpaid,
    },
    c.bookToday && {
      r: 'bookings',
      i: 'event',
      k: 'reel',
      t: 'Bookings today',
      s: 'Morning yoga, 7:00 am',
      n: c.bookToday,
    },
  ].filter(Boolean);
  const upcoming = S.bookings.filter((b) => b.status === 'Upcoming');
  const doneSteps = 4;
  return {
    title: 'Home',
    crumbTitle: 'Home',
    body: `
 <div class="phead anim"><div class="l"><span class="eyebrow">Tuesday, 27 October</span><h1 class="h1">Good morning, ${esc(S.shop.owner)}</h1>
  <p class="t-body">${
    ideas.length
      ? `Stoora has ${plural(ideas.length, 'idea')} ready for you, and ${plural(
          todo.reduce((a, t) => a + t.n, 0),
          'thing',
        )} on today’s list.`
      : 'Your list is clear. Stoora will keep an eye on the shop.'
  }</p></div>
  <div class="r"><span class="live"><i></i>2 people on your shop now</span></div></div>
 <div class="home-grid">
  <div class="col">
   <section class="card morning anim" style="--i:1;order:2" aria-labelledby="mm-h">
    <div class="card-h"><div class="row"><span class="smark" aria-hidden="true">S</span><div class="stack" style="gap:var(--s1)"><span class="eyebrow">Morning message · 7:30 am</span><h2 class="ct" id="mm-h">${ideas.length ? `${plural(ideas.length, 'idea')} ready to approve` : 'All done for today'}</h2></div></div></div>
    ${
      ideas.length
        ? `<p class="t-soft" style="margin-bottom:var(--s3)">Yesterday you made <b class="t-ink num">₹6,940</b> from 5 orders. Together, these could bring in about <b class="t-ink num">${rs(earnSum)}</b> this week.</p>
    <div class="stack tight" id="ideas">${ideas
      .map(
        (i) => `<div class="idea" id="idea-${i.id}">
      <div class="row" style="align-items:flex-start;gap:var(--s2)"><span class="ic ${i.seg}" style="width:36px;height:36px;border-radius:var(--r-xl);display:grid;place-items:center;flex:none">${ic(i.icon, 'sm')}</span><p>${i.text}</p></div>
      <div class="earn">${bdg('ok', 'trending_up', 'Could earn ' + rs(i.earn))}${i.cost ? bdg('neutral', 'payments', 'Costs ' + rs(i.cost)) : bdg('neutral', 'money_off', 'Costs nothing')}</div>
      <div class="btns"><button class="btn ink sm" data-act="idea-yes" data-id="${i.id}">${ic('check')}${i.act}</button><button class="btn quiet sm" data-act="idea-no" data-id="${i.id}">Not now</button></div></div>`,
      )
      .join('')}</div>
    <p class="cap faint" style="margin-top:var(--s2)">Nothing happens until you tap. Stoora checks each idea after a week and tells you if it worked.</p>`
        : emptyState(
            'done',
            'You approved everything',
            'Stoora will check how these did and send tomorrow’s message at 7:30 am.',
          )
    }
   </section>
   <section class="card anim" style="--i:2;order:3" aria-labelledby="td-h">
    <div class="card-h"><h2 class="ct" id="td-h">${ic('checklist')}To do today</h2><span class="cap">${plural(
      todo.reduce((a, t) => a + t.n, 0),
      'thing',
    )}</span></div>
    ${
      todo.length
        ? `<div class="todo">${todo.map((t) => `<a class="trow" href="#${t.r}" ${t.f ? `data-filter="${t.f}"` : ''}><span class="ic ${t.k}">${ic(t.i, 'sm')}</span><span class="grow"><span class="t">${t.t}</span><span class="s">${t.s}</span></span><span class="n num">${t.n}</span>${ic('chevron_right', 'sm t-cap')}</a>`).join('')}</div>`
        : `<p class="t-body">Nothing waiting. Orders, chats and payments are all handled.</p>`
    }
   </section>
   <section class="card anim" style="--i:3;order:4" aria-labelledby="ask-h">
    <div class="card-h"><h2 class="ct" id="ask-h"><span class="smark xs" aria-hidden="true">S</span>Ask Stoora about your shop</h2></div>
    <form class="askbox" data-form="home-ask"><label class="sr" for="home-q">Your question</label><textarea id="home-q" rows="1" placeholder="How did I do this week?"></textarea>
     <div class="tools"><span class="cap grow">Answers use your real numbers</span><button class="go" type="submit" aria-label="Ask">${ic('arrow_upward', 'sm')}</button></div></form>
    <div class="sugg">${['How did I do this week?', 'Which orders should I ship first?', 'Write a post for my indigo kurta set'].map((q) => `<button data-act="ask" data-q="${q}">${q}</button>`).join('')}</div>
   </section>
  </div>
  <div class="col">
   <section class="card anim" style="--i:0;order:1" aria-labelledby="today-h">
    <div class="card-h"><h2 class="ct" id="today-h">${ic('today')}Today</h2><span class="cap">Compared with yesterday</span></div>
    <div class="tiles four">
     <a class="tile" href="#analytics"><span class="k">Sales</span><span class="v big">${cnt(8195, '₹')}</span><span class="d up">${ic('arrow_upward')}12% more</span></a>
     <a class="tile" href="#orders"><span class="k">Orders</span><span class="v big">${cnt(S.orders.length)}</span><span class="d up">${ic('arrow_upward')}1 more</span></a>
     <a class="tile" href="#analytics"><span class="k">Visits</span><span class="v big">${cnt(148)}</span><span class="d up">${ic('arrow_upward')}18% more</span></a>
     <a class="tile" href="#bookings"><span class="k">Bookings</span><span class="v big">${cnt(S.bookings.length - 1)}</span><span class="d">Same</span></a>
    </div>
   </section>
   <section class="card anim" style="--i:4;order:5" aria-labelledby="mon-h">
    <div class="card-h"><h2 class="ct" id="mon-h">${ic('account_balance_wallet')}Money</h2><a class="link cap" href="#money">Open${ic('chevron_right', 'xs')}</a></div>
    <div class="tiles"><div class="tile"><span class="k">Received today</span><span class="v big" style="font-size:24px">₹4,497</span></div><div class="tile"><span class="k">Waiting for UPI</span><span class="v big" style="font-size:24px">${rs(S.orders.filter((o) => !o.paid).reduce((a, o) => a + o.total, 0) + S.bookings.filter((b) => !b.paid).reduce((a, b) => a + prod(b.svc).price, 0))}</span></div></div>
    <p class="cap" style="margin-top:var(--s2)">${ic('account_balance', 'xs')} Next payout <b class="t-ink num">${rs(S.payouts.next)}</b> to ${S.payouts.acct} on ${S.payouts.date}</p>
   </section>
   <section class="card anim" style="--i:5;order:6" aria-labelledby="up-h">
    <div class="card-h"><h2 class="ct" id="up-h">${ic('event')}Coming up</h2><a class="link cap" href="#bookings">All bookings${ic('chevron_right', 'xs')}</a></div>
    <div class="rows">${upcoming.map((b) => `<a class="li" href="#booking-${b.id}" style="background:var(--inner)">${av(b.who)}<span class="grow"><span class="t">${prod(b.svc).name}</span><span class="s">${b.when} · ${b.who}</span></span>${b.paid ? bdg('ok', 'check_circle', 'Paid') : bdg('warn', 'schedule', 'Unpaid')}</a>`).join('')}</div>
   </section>
   <section class="card anim" style="--i:6;order:7" aria-labelledby="su-h">
    <div class="card-h"><h2 class="ct" id="su-h">${ic('flag')}Finish setting up</h2><span class="cap">${doneSteps} of 6 done</span></div>
    <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="6" aria-valuenow="${doneSteps}" aria-label="Setup progress"><i style="width:${(doneSteps / 6) * 100}%"></i></div>
    <p class="t-soft" style="margin:var(--s2) 0">Next: connect Instagram, so buyer DMs turn into orders here.</p>
    <a class="btn line sm" href="#new-shop">See all steps</a>
   </section>
  </div>
 </div>`,
  };
}

const SETUP = [
  {
    k: 'product',
    art: 'product',
    t: 'Add your first product or service',
    s: 'A photo, a name and a price. Stoora fills in the rest.',
    b: 'Add product',
    go: 'add-product',
  },
  {
    k: 'payments',
    art: 'upi',
    t: 'Start accepting online payments',
    s: 'Create a Razorpay account so buyers can pay by UPI. We guide you step by step.',
    b: 'See how',
    go: 'payments',
  },
  {
    k: 'look',
    art: 'look',
    t: 'Choose how your shop looks',
    s: 'Pick colours and a cover photo. You can change it any time.',
    b: 'Choose a look',
    go: 'storefront',
  },
  {
    k: 'link',
    art: 'link',
    t: 'Share your shop link',
    s: 'Send stoora.in/meera to your customers, or put it wherever people find you.',
    b: 'Copy link',
  },
];
function newShopScreen() {
  const vis = SETUP.filter((x) => !S.setupHidden[x.k]);
  const done = SETUP.filter((x) => S.setupDone[x.k]).length;
  const firstOpen = vis.find((x) => !S.setupDone[x.k]);
  return {
    title: 'Home',
    body: `
 <div class="phead anim"><div class="l"><span class="eyebrow">Welcome to stoora.in</span><h1 class="h1">Let’s set up <em class="em">${esc(S.shop.name)}</em></h1>
  <p class="t-body">A few short steps. Most take under two minutes.</p></div>
  <div class="r" style="min-width:220px;flex:0 1 300px"><div class="stack tight" style="width:100%"><div class="row"><span class="cap grow">${done} of ${SETUP.length} done</span></div><div class="meter"><i style="width:${(done / SETUP.length) * 100}%"></i></div></div></div></div>
 <div class="setupgrid">${vis
   .map((x, n) => {
     const d = S.setupDone[x.k];
     return `<section class="card setup anim ${d ? 'done' : ''}" style="--i:${n}">
   <div class="art">${ART(x.art, 100)}<button class="ibtn x" data-act="setup-hide" data-k="${x.k}" aria-label="Hide “${x.t}”">${ic('close', 'xs')}</button></div>
   <div class="body"><h2 class="ct">${x.t}</h2><p class="cap">${x.s.replace('stoora.in/meera', 'stoora.in/' + esc(S.shop.handle))}</p>${d ? bdg('ok', 'check_circle', 'Done') : `<button class="btn sm ${x === firstOpen ? 'primary' : 'line'}" data-act="setup-do" data-k="${x.k}">${x.b}</button>`}</div></section>`;
   })
   .join('')}</div>
 ${vis.length < SETUP.length ? `<p class="cap" style="margin-top:var(--s3)"><button class="link" data-act="setup-unhide">Show hidden steps</button></p>` : ''}
 ${S.isNewAccount ? `<section class="card" style="margin-top:var(--s4)"><div class="row" style="flex-wrap:wrap;gap:var(--s3)"><div class="grow" style="min-width:220px"><h2 class="ct">Want to look around first?</h2><p class="cap">Explore every page with a sample shop’s orders, chats and money. Your setup list stays here.</p></div><button class="btn line" data-act="leave-newshop">Explore with sample data</button></div></section>` : `<p class="cap" style="margin-top:var(--s4)">Design review: this is the first-day Home. <button class="link" data-act="leave-newshop">See Home for an active shop</button></p>`}`,
  };
}

/* ---------- ORDERS ---------- */
const OF = {
  All: () => true,
  'To ship': (o) => !o.shipped && (o.paid || o.pay === 'cod'),
  Unpaid: (o) => !o.paid,
  Done: (o) => o.shipped && o.paid,
};
function ordersTabs(on) {
  return `<div class="seg inline" role="tablist" aria-label="Orders or bookings"><button role="tab" aria-selected="${on === 'orders'}" class="${on === 'orders' ? 'on' : ''}" data-go="orders">Orders</button><button role="tab" aria-selected="${on === 'bookings'}" class="${on === 'bookings' ? 'on' : ''}" data-go="bookings">Bookings</button></div>`;
}
function ordersScreen() {
  const q = ui.orderQ.trim().toLowerCase();
  const list = S.orders
    .filter(OF[ui.orderFilter])
    .filter((o) => !q || (o.who + ' #' + o.id + ' ' + o.src).toLowerCase().includes(q));
  const items = S.orders.reduce((a, o) => a + o.items.reduce((x, i) => x + i[1], 0), 0);
  return {
    title: 'Orders',
    body: `
 <div class="phead anim"><div class="l"><h1 class="h1">Orders</h1><p class="t-body">From WhatsApp, Instagram, your shop link and in person — all in one list.</p></div>
  <div class="r"><a class="btn primary" href="#create-order">${ic('add')}Create order</a></div></div>
 <div class="stack">
 <section class="card anim" style="--i:1" aria-label="This week"><div class="tiles four">
  <div class="tile"><span class="k">Orders</span><span class="v big">${cnt(S.orders.length)}</span><span class="d">This week</span></div>
  <div class="tile"><span class="k">Items ordered</span><span class="v big">${cnt(items)}</span><span class="d">This week</span></div>
  <div class="tile"><span class="k">Sales</span><span class="v big">${cnt(
    S.orders.reduce((a, o) => a + o.total, 0),
    '₹',
  )}</span><span class="d">This week</span></div>
  <div class="tile"><span class="k">Shipped</span><span class="v big">${cnt(S.orders.filter((o) => o.shipped).length)}</span><span class="d">This week</span></div></div></section>
 <section class="card anim stack tight" style="--i:2" aria-label="Filter orders">
  <div class="row" style="flex-wrap:wrap;gap:var(--s2)">${ordersTabs('orders')}
   <label class="search" style="flex:1 1 220px">${ic('search', 'sm')}<span class="sr">Search orders</span><input id="order-q" type="search" placeholder="Search by name or order number" value="${esc(ui.orderQ)}" data-input="orderQ"></label></div>
  <div class="chips" role="group" aria-label="Show">${Object.keys(OF)
    .map(
      (f) =>
        `<button class="chip ${ui.orderFilter === f ? 'on' : ''}" aria-pressed="${ui.orderFilter === f}" data-act="ofilter" data-f="${f}">${f}<span class="n">${S.orders.filter(OF[f]).length}</span></button>`,
    )
    .join('')}</div>
 </section>
 <div class="anim" style="--i:3" id="olist">${ordersList(list)}</div></div>`,
  };
}
function ordersList(list) {
  if (!list.length)
    return `<div class="card">${ui.orderQ ? emptyState('done', 'No orders match “' + esc(ui.orderQ) + '”', 'Try a buyer’s first name, or an order number like 1012.') : ui.orderFilter === 'To ship' ? emptyState('done', 'Nothing to ship', 'Every paid order has left. New ones will show up here.') : emptyState('done', 'No orders here yet', 'When a buyer orders on WhatsApp, Instagram or your shop link, it lands in this list.', '<a class="btn line sm" href="#create-order">Add an order by hand</a>')}</div>`;
  return `<div class="tbl-wrap only-wide"><table class="tbl"><thead><tr><th>Order</th><th>Date</th><th>Buyer</th><th>Came from</th><th class="r">Total</th><th>Payment</th><th>Shipping</th><th>Items</th></tr></thead><tbody>
  ${list
    .map(
      (o) =>
        `<tr data-go="order-${o.id}" tabindex="0"><td><b>#${o.id}</b></td><td>${o.when}</td><td>${esc(o.who)}</td><td>${src(o.src)}</td><td class="r"><b class="num">${rs(o.total)}</b></td><td>${payB(o)}</td><td>${shipB(o)}</td><td>${plural(
          o.items.reduce((a, i) => a + i[1], 0),
          'item',
        )}</td></tr>`,
    )
    .join('')}</tbody></table></div>
 <div class="rows only-narrow">${list
   .map(
     (o) => `<a class="li" href="#order-${o.id}" style="align-items:flex-start">
  <span class="grow"><span class="t">#${o.id} · ${esc(o.who)}</span><span class="s">${o.when} · ${plural(
    o.items.reduce((a, i) => a + i[1], 0),
    'item',
  )}</span><span class="row" style="margin-top:var(--s1);flex-wrap:wrap;gap:var(--s1)">${payB(o)}${shipB(o)}</span></span>
  <span class="end"><span class="money">${rs(o.total)}</span>${src(o.src)}</span></a>`,
   )
   .join('')}</div>`;
}

function orderScreen(id) {
  const o = ord(id);
  if (!o) return notFound('That order', 'orders');
  const nItems = o.items.reduce((a, i) => a + i[1], 0);
  const cust = S.customers.find((c) => c.name === o.who);
  const chat = S.chats.find((c) => c.who === o.who);
  const prim = !o.paid
    ? `<button class="btn primary" data-act="mark-paid" data-id="${o.id}">${ic('check_circle')}Mark as paid</button>`
    : !o.shipped
      ? `<button class="btn primary" data-act="ship" data-id="${o.id}">${ic('local_shipping')}Ship order</button>`
      : '';
  const sec = !o.paid
    ? `<button class="btn line" data-act="remind" data-who="${esc(o.who)}">${ic('send')}Send UPI reminder</button>`
    : chat
      ? `<a class="btn line" href="#chat-${chat.id}">${ic('forum')}Message buyer</a>`
      : '';
  const ev = [[`Order placed`, `${o.when} · from ${o.src}`]];
  ev.push(['Stoora sent an order confirmation', 'On WhatsApp to ' + o.who.split(' ')[0]]);
  if (o.paid) ev.push([o.pay === 'cash' ? 'Paid in cash' : 'Paid by UPI', rs(o.total) + ' received']);
  if (o.shipped)
    ev.push([o.courier ? 'Shipped with ' + o.courier : 'Handed over', o.track ? 'Tracking ' + o.track : 'In person']);
  return {
    title: '#' + o.id,
    crumb: [['Orders', 'orders']],
    back: ['Orders', 'orders'],
    body: `
 <div class="phead anim"><div class="l"><h1 class="h1">Order #${o.id}</h1><div class="row" style="flex-wrap:wrap;gap:var(--s1)">${payB(o)}${shipB(o)}${src(o.src)}</div><p class="cap">${o.when}</p></div>
  <div class="r">${sec}${prim}</div></div>
 <div class="detail"><div>
  <section class="card anim" style="--i:1"><div class="card-h"><h2 class="ct">${ic('shopping_bag')}${plural(nItems, 'item')}</h2>${shipB(o)}</div>
   <div class="rows">${o.items
     .map(([pid, q]) => {
       const p = prod(pid);
       return `<div class="li" style="background:var(--inner)"><span class="thumb">${ic(p.icon)}</span><span class="grow"><span class="t">${p.name}</span><span class="s num">${q} × ${rs(p.price)}</span></span><span class="money">${rs(p.price * q)}</span></div>`;
     })
     .join('')}</div>
   <div class="kv" style="margin-top:var(--s3)"><div class="r"><span>Subtotal</span><span>${rs(o.total)}</span></div><div class="r"><span>Shipping</span><span>Free</span></div><div class="r t"><span>Total</span><span>${rs(o.total)}</span></div>
   <div class="r"><span>${o.paid ? (o.pay === 'cash' ? 'Paid in cash' : 'Paid by UPI') : 'Buyer owes'}</span><span>${rs(o.total)}</span></div></div></section>
  <section class="card anim" style="--i:2"><div class="card-h"><h2 class="ct">${ic('history')}What happened</h2></div>
   <div class="tl">${ev
     .reverse()
     .map(
       (e, n) =>
         `<div class="ev ${n === 0 ? 'now' : ''}"><i></i><div><b>${e[0]}</b><span class="cap">${e[1]}</span></div></div>`,
     )
     .join('')}</div></section>
 </div><div>
  <section class="card anim" style="--i:3"><div class="card-h"><h2 class="ct">${ic('person')}Buyer</h2>${cust ? `<a class="link cap" href="#customer-${S.customers.indexOf(cust)}">View${ic('chevron_right', 'xs')}</a>` : ''}</div>
   <div class="row">${av(o.who)}<div class="grow"><div class="t-ink" style="font-weight:500">${esc(o.who)}</div><div class="cap">${o.phone || 'No phone saved'} · ${o.city}</div></div></div>
   ${cust ? `<p class="cap" style="margin-top:var(--s2)">${plural(cust.orders, 'order')} · ${rs(cust.spent)} spent with you</p>` : ''}</section>
  <section class="card anim" style="--i:4"><div class="card-h"><h2 class="ct">${ic('local_shipping')}Delivery</h2></div>
   ${o.shipped ? `<p class="t-soft">${o.courier ? `${o.courier} · <span class="num">${o.track || 'no tracking number'}</span>` : 'Handed over in person'}</p>` : `<p class="t-soft">Not shipped yet. ${o.paid ? 'Paid, so it is ready to go.' : 'Wait for payment, or ship as cash on delivery.'}</p>`}
   <p class="cap" style="margin-top:var(--s1)">To ${o.city}</p></section>
 </div></div>`,
  };
}

function notFound(what, back) {
  return {
    title: 'Not found',
    back: ['Back', back],
    body: `<div class="card" style="margin-top:var(--s4)">${emptyState('done', what + ' isn’t here', 'It may have been removed. Go back to the list to find it.', `<a class="btn line sm" href="#${back}">Go back</a>`)}</div>`,
  };
}

/* ---------- CREATE ORDER ---------- */
function createScreen() {
  const d = ui.draft;
  const lines = d.items.map(([id, q]) => [prod(id), q]);
  const total = lines.reduce((a, [p, q]) => a + p.price * q, 0);
  const PAY = [
    ['paid', 'Paid already', 'The buyer has paid you by UPI or cash.'],
    ['upi', 'Send UPI link', 'Stoora sends a UPI link on WhatsApp and marks it paid when the money arrives.'],
    ['cod', 'Cash on delivery', 'Collect the money when the parcel reaches the buyer.'],
  ];
  return {
    title: 'Create order',
    crumb: [['Orders', 'orders']],
    back: ['Orders', 'orders'],
    narrow: false,
    body: `
 <div class="phead anim"><div class="l"><h1 class="h1">Create order</h1><p class="t-body">For orders you take on a call, in a DM or in person.</p></div></div>
 <form class="form2" data-form="create" novalidate><div>
  <section class="card anim stack" style="--i:1"><h2 class="ct">Buyer</h2>
   <div class="field"><label for="co-who">Buyer’s name</label><input class="input ${d.errors.who ? 'bad' : ''}" id="co-who" autocomplete="name" value="${esc(d.who)}" data-draft="who" placeholder="Priya Sharma" ${d.errors.who ? 'aria-invalid="true" aria-describedby="co-who-e"' : ''}>${d.errors.who ? `<span class="err" id="co-who-e">${ic('error', 'xs')}Add the buyer’s name.</span>` : ''}</div>
   <div class="field"><label for="co-ph">WhatsApp number <span class="cap">(optional)</span></label><input class="input" id="co-ph" type="tel" inputmode="tel" autocomplete="tel" value="${esc(d.phone)}" data-draft="phone" placeholder="+91 98480 21234"><span class="hint">Stoora sends the order confirmation here.</span></div>
   <div class="field"><span class="flabel" id="co-src-l">Where did this order come from?</span><div class="chips" role="radiogroup" aria-labelledby="co-src-l">${Object.keys(
     SRC,
   )
     .map(
       (s) =>
         `<button type="button" role="radio" aria-checked="${(d.src || 'WhatsApp') === s}" class="chip ${(d.src || 'WhatsApp') === s ? 'on' : ''}" data-act="co-src" data-v="${s}">${ic(SRC[s], 'xs')}${s}</button>`,
     )
     .join('')}</div></div>
  </section>
  <section class="card anim" style="--i:2"><div class="card-h"><h2 class="ct">Products</h2><button type="button" class="btn line sm" data-act="picker">${ic('add')}Add products</button></div>
   ${
     lines.length
       ? `<div class="rows">${lines
           .map(
             ([
               p,
               q,
             ]) => `<div class="li" style="background:var(--inner)"><span class="thumb sm">${ic(p.icon, 'sm')}</span><span class="grow"><span class="t">${p.name}</span><span class="s num">${rs(p.price)} each</span></span>
    <span class="step" role="group" aria-label="Quantity of ${p.name}"><button type="button" data-act="co-qty" data-id="${p.id}" data-d="-1" aria-label="One less">${ic(q > 1 ? 'remove' : 'delete', 'xs')}</button><output class="num">${q}</output><button type="button" data-act="co-qty" data-id="${p.id}" data-d="1" aria-label="One more">${ic('add', 'xs')}</button></span></div>`,
           )
           .join('')}</div>`
       : `<div class="inner ${d.errors.items ? '' : ''}" style="text-align:center;padding:var(--s4) var(--s3)"><p class="t-soft">No products yet.</p><p class="cap">Add what the buyer wants. Stock updates when you create the order.</p>${d.errors.items ? `<p class="err" style="justify-content:center;margin-top:var(--s1);color:var(--negative-deep);font-size:14px">${ic('error', 'xs')}Add at least one product.</p>` : ''}</div>`
   }
  </section>
  <section class="card anim stack tight" style="--i:3"><h2 class="ct" id="co-pay-l">Payment</h2>
   <div class="stack tight" role="radiogroup" aria-labelledby="co-pay-l">${PAY.map(
     ([
       k,
       l,
       s,
     ]) => `<button type="button" role="radio" aria-checked="${d.pay === k}" class="trow" data-act="co-pay" data-v="${k}" style="${d.pay === k ? 'border-color:var(--ink);background:var(--surface);box-shadow:inset 0 0 0 1px var(--ink)' : ''}">
    <span class="ic" style="background:${d.pay === k ? 'var(--ink)' : 'var(--muted)'};color:${d.pay === k ? '#FFFFFF' : 'var(--ink-soft)'};border-radius:50%;width:24px;height:24px">${d.pay === k ? ic('check', 'xs') : ''}</span><span class="grow"><span class="t">${l}</span><span class="s">${s}</span></span></button>`,
   ).join('')}</div>
  </section>
 </div><div>
  <section class="card anim stack" style="--i:4;position:sticky;top:80px"><h2 class="ct">Summary</h2>
   <div class="kv">${lines.map(([p, q]) => `<div class="r"><span>${p.name} × ${q}</span><span>${rs(p.price * q)}</span></div>`).join('') || '<div class="r"><span>No products</span><span>₹0</span></div>'}
   <div class="r"><span>Shipping</span><span>Free</span></div><div class="r t"><span>Total</span><span>${rs(total)}</span></div></div>
   <button class="btn primary full" type="submit">${d.pay === 'upi' ? 'Create and send UPI link' : 'Create order'}</button>
   <a class="btn quiet full" href="#orders">Cancel</a></section>
 </div></form>`,
  };
}

/* ---------- BOOKINGS ---------- */
function bookingsScreen() {
  const days = [...new Set(S.bookings.map((b) => b.day))];
  return {
    title: 'Bookings',
    crumb: [['Orders', 'orders']],
    body: `
 <div class="phead anim"><div class="l"><h1 class="h1">Bookings</h1><p class="t-body">Classes and sessions people have booked with you.</p></div>
  <div class="r"><button class="btn line" data-act="copy" data-text="https://stoora.in/${S.shop.handle}/book">${ic('content_copy')}Copy booking link</button></div></div>
 <div class="stack">
 <section class="card anim" style="--i:1">${ordersTabs('bookings')}</section>
 <div class="tbl-wrap only-wide anim" style="--i:2"><table class="tbl"><thead><tr><th>Booking</th><th>When</th><th>Buyer</th><th>Service</th><th class="r">Price</th><th>Payment</th><th>Status</th></tr></thead><tbody>
  ${S.bookings.map((b) => `<tr data-go="booking-${b.id}" tabindex="0"><td><b>${b.id}</b></td><td>${b.when}</td><td>${b.who}</td><td>${prod(b.svc).name}</td><td class="r num"><b>${rs(prod(b.svc).price)}</b></td><td>${b.paid ? bdg('ok', 'check_circle', 'Paid') : bdg('warn', 'schedule', 'Unpaid')}</td><td>${b.status === 'Done' ? bdg('neutral', 'done_all', 'Done') : bdg('offer', 'event_upcoming', 'Upcoming')}</td></tr>`).join('')}</tbody></table></div>
 <div class="only-narrow stack">${days
   .map(
     (d, n) =>
       `<div class="stack tight anim" style="--i:${n + 2}"><h2 class="label">${d}</h2><div class="rows">${S.bookings
         .filter((b) => b.day === d)
         .map(
           (b) =>
             `<a class="li" href="#booking-${b.id}">${av(b.who)}<span class="grow"><span class="t">${prod(b.svc).name}</span><span class="s">${b.when.split(', ')[1] || b.when} · ${b.who}</span></span><span class="end"><span class="money">${rs(prod(b.svc).price)}</span>${b.paid ? bdg('ok', 'check_circle', 'Paid') : bdg('warn', 'schedule', 'Unpaid')}</span></a>`,
         )
         .join('')}</div></div>`,
   )
   .join('')}</div>
 </div>`,
  };
}
function bookingScreen(id) {
  const b = S.bookings.find((x) => x.id === id);
  if (!b) return notFound('That booking', 'bookings');
  const v = prod(b.svc);
  return {
    title: b.id,
    crumb: [
      ['Orders', 'orders'],
      ['Bookings', 'bookings'],
    ],
    back: ['Bookings', 'bookings'],
    body: `
 <div class="phead anim"><div class="l"><h1 class="h1">${v.name}</h1><div class="row" style="flex-wrap:wrap;gap:var(--s1)">${b.paid ? bdg('ok', 'check_circle', 'Paid') : bdg('warn', 'schedule', 'Unpaid')}${b.status === 'Done' ? bdg('neutral', 'done_all', 'Done') : bdg('offer', 'event_upcoming', 'Upcoming')}</div><p class="cap">Booking ${b.id}</p></div>
  <div class="r">${!b.paid ? `<button class="btn line" data-act="remind" data-who="${b.who}">${ic('send')}Send UPI reminder</button><button class="btn primary" data-act="book-paid" data-id="${b.id}">${ic('check_circle')}Mark as paid</button>` : b.status !== 'Done' ? `<button class="btn primary" data-act="book-done" data-id="${b.id}">${ic('done_all')}Mark as done</button>` : ''}</div></div>
 <div class="detail"><div><section class="card anim" style="--i:1"><div class="card-h"><h2 class="ct">${ic('event')}When</h2></div>
  <div class="tiles"><div class="tile"><span class="k">Date and time</span><span class="t-ink" style="font-weight:600;font-size:17px">${b.when}</span></div><div class="tile"><span class="k">Length</span><span class="t-ink" style="font-weight:600;font-size:17px">${v.mins} minutes</span></div><div class="tile"><span class="k">Type</span><span class="t-ink" style="font-weight:600;font-size:17px">${v.type}</span></div><div class="tile"><span class="k">Price</span><span class="t-ink num" style="font-weight:600;font-size:17px">${rs(v.price)}</span></div></div>
  ${!b.paid && b.status !== 'Done' ? `<div class="banner warn" style="margin-top:var(--s3)">${ic('schedule')}<span>Not paid yet. Send ${b.who.split(' ')[0]} a UPI reminder so it’s paid before the session.</span></div>` : ''}</section></div>
 <div><section class="card anim" style="--i:2"><div class="card-h"><h2 class="ct">${ic('person')}Booked by</h2></div><div class="row">${av(b.who)}<div><div class="t-ink" style="font-weight:500">${b.who}</div><div class="cap">Booked on Instagram</div></div></div></section></div></div>`,
  };
}

/* ---------- PRODUCTS / SERVICES ---------- */
function prodTabs(on) {
  return `<div class="seg inline" role="tablist" aria-label="Products or services"><button role="tab" aria-selected="${on === 'products'}" class="${on === 'products' ? 'on' : ''}" data-go="products">Products</button><button role="tab" aria-selected="${on === 'services'}" class="${on === 'services' ? 'on' : ''}" data-go="services">Services</button></div>`;
}
const stockTxt = (p) =>
  p.stock === 0
    ? bdg('bad', 'block', 'Sold out')
    : p.stock <= 5
      ? `<span class="cap" style="color:var(--marigold-deep);font-weight:500">Only ${p.stock} left</span>`
      : `<span class="cap">${p.stock} in stock</span>`;
const statusB = (p) =>
  p.status === 'Active' ? bdg('ok', 'visibility', 'Active') : bdg('neutral', 'edit_note', 'Draft');
function productsScreen() {
  const q = ui.prodQ.trim().toLowerCase();
  const list = S.products.filter((p) => !q || p.name.toLowerCase().includes(q));
  return {
    title: 'Products',
    body: `
 <div class="phead anim"><div class="l"><h1 class="h1">Products</h1><p class="t-body">${plural(S.products.filter((p) => p.status === 'Active').length, 'product')} live on your shop. ${S.products.filter((p) => p.stock === 0).length ? S.products.filter((p) => p.stock === 0).length + ' sold out.' : ''}</p></div>
  <div class="r"><a class="btn primary" href="#add-product">${ic('add')}Add product</a></div></div>
 <div class="stack"><section class="card anim stack tight" style="--i:1"><div class="row" style="flex-wrap:wrap;gap:var(--s2)">${prodTabs('products')}<label class="search" style="flex:1 1 220px">${ic('search', 'sm')}<span class="sr">Search products</span><input id="prod-q" type="search" placeholder="Search products" value="${esc(ui.prodQ)}" data-input="prodQ"></label></div></section>
 <div id="plist" class="anim" style="--i:2">${productsList(list)}</div></div>`,
  };
}
function productsList(list) {
  if (!list.length)
    return `<div class="card">${ui.prodQ ? emptyState('product', 'No products match “' + esc(ui.prodQ) + '”', 'Check the spelling, or search a shorter word like “kurta”.') : emptyState('product', 'Add your first product', 'A photo, a name and a price is enough to start selling.', '<a class="btn primary sm" href="#add-product">Add product</a>')}</div>`;
  return `<div class="tbl-wrap only-wide"><table class="tbl"><thead><tr><th>Product</th><th>Status</th><th>Stock</th><th class="r">Price</th><th class="r">Sold in 30 days</th></tr></thead><tbody>
 ${list.map((p) => `<tr data-go="product-${p.id}" tabindex="0"><td><span class="row"><span class="thumb sm">${ic(p.icon, 'sm')}</span><b>${p.name}</b></span></td><td>${statusB(p)}</td><td>${stockTxt(p)}</td><td class="r num"><b>${rs(p.price)}</b></td><td class="r num">${p.sold}</td></tr>`).join('')}</tbody></table></div>
 <div class="rows only-narrow">${list.map((p) => `<a class="li" href="#product-${p.id}"><span class="thumb">${ic(p.icon)}</span><span class="grow"><span class="t">${p.name}</span><span class="row" style="gap:var(--s1);margin-top:4px;flex-wrap:wrap">${statusB(p)}${stockTxt(p)}</span></span><span class="money">${rs(p.price)}</span></a>`).join('')}</div>`;
}
function servicesScreen() {
  return {
    title: 'Services',
    crumb: [['Products', 'products']],
    body: `
 <div class="phead anim"><div class="l"><h1 class="h1">Services</h1><p class="t-body">Classes, 1-on-1 sessions and digital downloads.</p></div><div class="r"><a class="btn primary" href="#add-service">${ic('add')}Add service</a></div></div>
 <div class="stack"><section class="card anim" style="--i:1">${prodTabs('services')}</section>
 <div class="rows anim" style="--i:2">${S.services.map((v) => `<div class="li"><span class="thumb">${ic(v.icon)}</span><span class="grow"><span class="t">${v.name}</span><span class="row" style="gap:var(--s1);margin-top:4px;flex-wrap:wrap">${bdg('neutral', v.type === 'Class' ? 'groups' : v.type === 'Digital' ? 'download' : 'person', v.type)}<span class="cap">${v.next}</span></span></span><span class="money">${rs(v.price)}</span></div>`).join('')}</div></div>`,
  };
}

function productForm(id) {
  const p = id ? S.products.find((x) => x.id === id) : null;
  if (id && !p) return notFound('That product', 'products');
  const f =
    ui.form.pid === (id || 'new')
      ? ui.form
      : (ui.form = {
          pid: id || 'new',
          name: p?.name || '',
          desc: p ? 'Hand block printed in Jaipur on soft cotton. Natural dyes, made in small batches.' : '',
          price: p ? String(p.price) : '',
          was: '',
          stock: p ? String(p.stock) : '1',
          status: p?.status || 'Active',
          more: false,
          sizes: p ? ['S', 'M', 'L'] : [],
          sku: '',
          weight: '',
          oos: false,
          ch: { shop: true, ig: true, wa: true },
          photos: [],
          errors: {},
        });
  return {
    title: p ? p.name : 'Add product',
    crumbTitle: p ? p.name : 'Add product',
    crumb: [['Products', 'products']],
    back: ['Products', 'products'],
    body: `
 <div class="phead anim"><div class="l"><h1 class="h1">${p ? esc(p.name) : 'Add product'}</h1>${p ? `<div class="row" style="gap:var(--s1)">${statusB(p)}${stockTxt(p)}</div>` : `<p class="t-body">Start with a photo, a name and a price. Everything else can wait.</p>`}</div></div>
 <form class="form2" data-form="product" novalidate><div>
  <section class="card anim stack" style="--i:1"><h2 class="ct">Photos</h2>
   ${f.photos.length ? `<div class="photos">${f.photos.map((s, n) => `<img src="${s}" alt="Product photo ${n + 1}">`).join('')}</div>` : ''}
   <div class="drop" id="drop">${ic('add_photo_alternate', 'lg t-soft')}<span class="t-ink" style="font-weight:500">Add photos</span><span class="cap">Drag them here, or tap to pick from your phone. JPG or PNG.</span><input type="file" id="pf-photos" accept="image/*" multiple aria-label="Add photos"></div></section>
  <section class="card anim stack" style="--i:2">
   <div class="field"><label for="pf-name">Name</label><input class="input ${f.errors.name ? 'bad' : ''}" id="pf-name" data-pf="name" value="${esc(f.name)}" placeholder="Handblock cotton kurta" ${f.errors.name ? 'aria-invalid="true" aria-describedby="pf-name-e"' : ''}>${f.errors.name ? `<span class="err" id="pf-name-e">${ic('error', 'xs')}Add a name buyers will recognise.</span>` : ''}</div>
   <div class="field"><label for="pf-desc">Description</label><textarea class="input" id="pf-desc" data-pf="desc" placeholder="Fabric, fit, how to wash it">${esc(f.desc)}</textarea></div></section>
  <section class="card anim stack" style="--i:3"><h2 class="ct">Price and stock</h2><div class="grid2">
   <div class="field"><label for="pf-price">Price</label><div class="affix ${f.errors.price ? 'bad' : ''}"><span aria-hidden="true">₹</span><input id="pf-price" inputmode="numeric" data-pf="price" value="${esc(f.price)}" placeholder="1,499" ${f.errors.price ? 'aria-invalid="true" aria-describedby="pf-price-e"' : ''}></div>${f.errors.price ? `<span class="err" id="pf-price-e">${ic('error', 'xs')}Add a price in rupees.</span>` : ''}</div>
   <div class="field"><label for="pf-was">Price before discount <span class="cap">(optional)</span></label><div class="affix"><span aria-hidden="true">₹</span><input id="pf-was" inputmode="numeric" data-pf="was" value="${esc(f.was)}" placeholder="1,899"></div></div>
   <div class="field"><label for="pf-stock">How many you have</label><input class="input" id="pf-stock" inputmode="numeric" data-pf="stock" value="${esc(f.stock)}"></div></div>
   <div class="toggle-row"><span class="grow"><span class="t-ink" style="font-weight:500;display:block">Keep selling when sold out</span><span class="cap">Buyers can still order. You make it later.</span></span><button type="button" class="switch" role="switch" aria-checked="${f.oos}" aria-label="Keep selling when sold out" data-act="pf-sw" data-k="oos"></button></div>
  </section>
  <section class="card anim" style="--i:4"><button type="button" class="row" style="width:100%;min-height:var(--tap);justify-content:space-between" data-act="pf-more" aria-expanded="${f.more}"><span class="ct">More details</span><span class="row"><span class="cap">Sizes, weight, SKU</span>${ic(f.more ? 'expand_less' : 'expand_more', 't-soft')}</span></button>
   ${
     f.more
       ? `<div class="stack" style="margin-top:var(--s3)"><div class="field"><span class="flabel" id="pf-sz">Sizes</span><div class="chips" role="group" aria-labelledby="pf-sz">${['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((z) => `<button type="button" class="chip ${f.sizes.includes(z) ? 'on' : ''}" aria-pressed="${f.sizes.includes(z)}" data-act="pf-size" data-v="${z}">${z}</button>`).join('')}</div></div>
    <div class="grid2"><div class="field"><label for="pf-w">Weight in grams</label><input class="input" id="pf-w" inputmode="numeric" data-pf="weight" value="${esc(f.weight)}" placeholder="350"><span class="hint">Used to work out shipping.</span></div>
    <div class="field"><label for="pf-sku">SKU <span class="cap">(your own code)</span></label><input class="input" id="pf-sku" data-pf="sku" value="${esc(f.sku)}" placeholder="KUR-IND-M"></div></div></div>`
       : ''
   }
  </section>
 </div><div>
  <section class="card anim stack tight" style="--i:5"><h2 class="ct">Status</h2><label class="sr" for="pf-status">Status</label><select class="input" id="pf-status" data-pf="status"><option ${f.status === 'Active' ? 'selected' : ''}>Active</option><option ${f.status === 'Draft' ? 'selected' : ''}>Draft</option></select><p class="cap">${f.status === 'Active' ? 'Buyers can see and order it.' : 'Only you can see it. Publish when ready.'}</p></section>
  <section class="card anim" style="--i:6"><h2 class="ct" style="margin-bottom:var(--s1)">Where it sells</h2>
   ${[['shop', 'Shop link', 'stoora.in/' + S.shop.handle]].map(([k, l, s]) => `<div class="toggle-row"><span class="grow"><span class="t-ink" style="font-weight:500;display:block">${l}</span><span class="cap">${s}</span></span><button type="button" class="switch" role="switch" aria-checked="${f.ch[k]}" aria-label="${l}" data-act="pf-ch" data-k="${k}"></button></div>`).join('')}</section>
  ${p ? `<button type="button" class="btn danger" data-act="pf-delete" data-id="${p.id}">${ic('delete')}Delete product</button>` : ''}
 </div></form>`,
    after: () => bindDrop(),
  };
}

function serviceForm() {
  const f =
    ui.form.pid === 'svc'
      ? ui.form
      : (ui.form = {
          pid: 'svc',
          name: '',
          type: 'Class',
          price: '',
          mins: '60',
          seats: '12',
          days: ['Wed', 'Sat'],
          time: '07:00',
          desc: '',
          errors: {},
        });
  return {
    title: 'Add service',
    crumb: [
      ['Products', 'products'],
      ['Services', 'services'],
    ],
    back: ['Services', 'services'],
    body: `
 <div class="phead anim"><div class="l"><h1 class="h1">Add service</h1><p class="t-body">A class, a 1-on-1 session, or something people download.</p></div></div>
 <form class="form2" data-form="service" novalidate><div>
  <section class="card anim stack" style="--i:1">
   <div class="field"><span class="flabel" id="sv-t">Type</span><div class="seg" role="radiogroup" aria-labelledby="sv-t">${['Class', '1-on-1', 'Digital'].map((t) => `<button type="button" role="radio" aria-checked="${f.type === t}" class="${f.type === t ? 'on' : ''}" data-act="sv-type" data-v="${t}">${t}</button>`).join('')}</div></div>
   <div class="field"><label for="sv-name">Name</label><input class="input ${f.errors.name ? 'bad' : ''}" id="sv-name" data-pf="name" value="${esc(f.name)}" placeholder="${f.type === 'Digital' ? 'Yoga for beginners e-book' : f.type === 'Class' ? 'Evening yoga (group class)' : '1-on-1 styling session'}">${f.errors.name ? `<span class="err">${ic('error', 'xs')}Add a name.</span>` : ''}</div>
   <div class="grid2"><div class="field"><label for="sv-price">Price</label><div class="affix ${f.errors.price ? 'bad' : ''}"><span aria-hidden="true">₹</span><input id="sv-price" inputmode="numeric" data-pf="price" value="${esc(f.price)}" placeholder="499"></div>${f.errors.price ? `<span class="err">${ic('error', 'xs')}Add a price in rupees.</span>` : ''}</div>
   ${f.type !== 'Digital' ? `<div class="field"><label for="sv-mins">Length</label><select class="input" id="sv-mins" data-pf="mins">${['30', '45', '60', '90'].map((m) => `<option value="${m}" ${f.mins === m ? 'selected' : ''}>${m} minutes</option>`).join('')}</select></div>` : ''}</div>
   <div class="field"><label for="sv-desc">What people get</label><textarea class="input" id="sv-desc" data-pf="desc" placeholder="${f.type === 'Digital' ? 'A 40-page PDF with 20 poses and photos.' : 'Bring your own mat. Suitable for beginners.'}">${esc(f.desc)}</textarea></div>
  </section>
  ${
    f.type !== 'Digital'
      ? `<section class="card anim stack" style="--i:2"><h2 class="ct">When it runs</h2>
   <div class="field"><span class="flabel" id="sv-d">Days</span><div class="chips" role="group" aria-labelledby="sv-d">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<button type="button" class="chip ${f.days.includes(d) ? 'on' : ''}" aria-pressed="${f.days.includes(d)}" data-act="sv-day" data-v="${d}">${d}</button>`).join('')}</div></div>
   <div class="grid2"><div class="field"><label for="sv-time">Start time</label><input class="input" type="time" id="sv-time" data-pf="time" value="${f.time}"></div>
   ${f.type === 'Class' ? `<div class="field"><label for="sv-seats">Seats per class</label><input class="input" id="sv-seats" inputmode="numeric" data-pf="seats" value="${esc(f.seats)}"></div>` : ''}</div></section>`
      : ''
  }
 </div><div><section class="card anim" style="--i:3"><h2 class="ct" style="margin-bottom:var(--s1)">How buyers book</h2><p class="t-soft">${f.type === 'Digital' ? 'They pay by UPI at your shop link. You see the payment on your Money page.' : 'They pick a slot on your shop link and pay by UPI. You get a booking in Orders › Bookings.'}</p></section></div></form>`,
  };
}

/* ---------- CHATS ---------- */
const MOOD = {
  ready: ['ok', 'shopping_bag', 'Ready to buy'],
  upset: ['bad', 'sentiment_dissatisfied', 'Upset'],
  look: ['neutral', 'visibility', 'Just looking'],
};
const moodB = (m) => bdg(...MOOD[m]);
function chatsScreen(id) {
  let open = id ? S.chats.find((c) => c.id === id) : null;
  if (id && !open) return notFound('That chat', 'chats');
  if (open) ui.chatTab = open.mood;
  const list = S.chats.filter((c) => c.mood === ui.chatTab && (!ui.chatSrc || c.src === ui.chatSrc));
  const wide = window.innerWidth >= 760;
  if (!open && wide) open = list[0] || null;
  const ready = S.chats.filter((c) => c.mood === 'ready' && c.unread).length;
  return {
    title: open && id ? open.who : 'Chats',
    crumb: id ? [['Chats', 'chats']] : null,
    back: id ? ['Chats', 'chats'] : null,
    hideBar: !!id && !wide,
    body: `
 <div class="phead anim ${id ? 'd-only' : ''}"><div class="l"><h1 class="h1">${ui.chatSrc ? ui.chatSrc + ' chats' : 'Chats'}</h1><p class="t-body">${ui.chatSrc ? `Only messages that came from ${ui.chatSrc}. <a class="link" href="#chats" data-chatsrc="">Show all chats</a>` : 'Buyer messages, sorted by Stoora.'}</p></div></div>
 ${!id || wide ? `<div class="banner info anim" style="--i:1;margin-bottom:var(--s3);align-items:center"><span class="smark xs" aria-hidden="true">S</span><span>${ready ? `<b class="t-ink">${plural(ready, 'buyer is', 'buyers are')} ready to buy.</b> Replies are drafted. Check them and send.` : 'Every ready-to-buy buyer has a reply. Nice work.'}</span></div>` : ''}
 <div class="chatwrap ${id ? 'has-open' : ''}">
  <section class="card stack tight chatlist anim" style="--i:2;align-self:start" aria-label="Chat list">
   <div class="chips" role="tablist">${Object.keys(MOOD)
     .map((m) => {
       const n = S.chats.filter((c) => c.mood === m && (!ui.chatSrc || c.src === ui.chatSrc)).length;
       return `<button role="tab" aria-selected="${ui.chatTab === m}" class="chip ${ui.chatTab === m ? 'on' : ''}" data-act="chat-tab" data-v="${m}">${MOOD[m][2]}<span class="n">${n}</span></button>`;
     })
     .join('')}</div>
   <div class="rows">${
     list.length
       ? list
           .map(
             (
               c,
             ) => `<a class="li" href="#chat-${c.id}" style="align-items:flex-start;${open && open.id === c.id && wide ? 'border-color:var(--ink);background:var(--surface)' : ''}" ${open && open.id === c.id ? 'aria-current="true"' : ''}>${av(c.who)}
    <span class="grow"><span class="row" style="gap:var(--s1)"><span class="t grow">${c.who}</span><span class="cap faint">${c.time}</span></span><span class="s" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.last)}</span><span style="margin-top:6px;display:block">${src(c.src)}</span></span>${c.unread ? '<span class="unread" style="margin-top:6px" aria-label="Unread"></span>' : ''}</a>`,
           )
           .join('')
       : `<p class="cap" style="padding:var(--s3)">No chats here right now.</p>`
   }</div>
  </section>
  <section class="card flush chatconv anim" style="--i:3;display:flex;flex-direction:column" aria-label="Conversation">${open ? convHTML(open) : emptyState('chat', 'Pick a chat', 'Buyer messages show up here.')}</section>
 </div>`,
    after: () => {
      if (open) {
        setTimeout(() => {
          if (open.unread && !open.draft) {
          }
        }, 0);
      }
    },
  };
}
function convHTML(c) {
  const ci = S.customers.findIndex((x) => x.name === c.who);
  return `<div class="row" style="padding:var(--s3);border-bottom:1px solid var(--line-soft)">${av(c.who)}<div class="grow"><div class="t-ink" style="font-weight:500">${c.who}</div><div class="row" style="gap:var(--s1);flex-wrap:wrap;margin-top:2px">${src(c.src)}${moodB(c.mood)}</div></div>${ci >= 0 ? `<a class="btn line sm" href="#customer-${ci}">${ic('person')}Buyer</a>` : ''}</div>
 <div class="thread" style="flex:1" aria-live="polite">${c.msgs.map(([w, t, time]) => `<div class="bubble ${w}">${esc(t)}<small>${time}${w === 'me' ? ' · Sent' : ''}</small></div>`).join('')}
 ${
   c.draft
     ? `<div class="draft" style="margin-top:var(--s2)"><div class="who"><span class="smark xs" aria-hidden="true">S</span>Stoora drafted a reply</div>
  ${ui.editing[c.id] ? `<label class="sr" for="dr-${c.id}">Edit reply</label><textarea id="dr-${c.id}" data-draftmsg="${c.id}">${esc(c.draft)}</textarea>` : `<p class="t-soft">${esc(c.draft)}</p>`}
  <div class="btns"><button class="btn primary sm" data-act="send-draft" data-id="${c.id}">${ic('send')}Send on ${c.src}</button>${ui.editing[c.id] ? '' : `<button class="btn line sm" data-act="edit-draft" data-id="${c.id}">${ic('edit')}Edit</button>`}<button class="btn quiet sm" data-act="drop-draft" data-id="${c.id}">Dismiss</button></div></div>`
     : ''
 }</div>
 <div style="padding:0 var(--s3)"><div class="chips">${c.mood !== 'upset' ? `<button class="chip" data-act="send-upi" data-id="${c.id}">${ic('currency_rupee', 'xs')}Send UPI link</button><button class="chip" data-act="chat-order" data-id="${c.id}">${ic('receipt_long', 'xs')}Create order</button>` : `<a class="chip" href="#order-1010">${ic('local_shipping', 'xs')}Open order #1010</a>`}<button class="chip" data-act="chat-book" data-id="${c.id}">${ic('event', 'xs')}Book a slot</button></div></div>
 <form class="composer" data-form="chat" data-id="${c.id}"><label class="search">${ic('chat', 'sm')}<span class="sr">Message ${c.who}</span><input id="msg-${c.id}" placeholder="Type a message" autocomplete="off"></label><button class="go" type="submit" aria-label="Send">${ic('arrow_upward', 'sm')}</button></form>`;
}

/* ---------- CUSTOMERS ---------- */
function customersScreen() {
  return {
    title: 'Customers',
    body: `
 <div class="phead anim"><div class="l"><h1 class="h1">Customers</h1><p class="t-body">${plural(S.customers.length, 'person', 'people')} have bought or booked with you.</p></div></div>
 <div class="tbl-wrap only-wide anim" style="--i:1"><table class="tbl"><thead><tr><th>Name</th><th>Phone</th><th>City</th><th>Came from</th><th class="r">Orders</th><th class="r">Spent</th><th>Last order</th></tr></thead><tbody>
 ${S.customers.map((c, n) => `<tr data-go="customer-${n}" tabindex="0"><td><span class="row">${av(c.name)}<b>${c.name}</b></span></td><td class="num">${c.phone}</td><td>${c.city}</td><td>${src(c.src)}</td><td class="r num">${c.orders}</td><td class="r num"><b>${rs(c.spent)}</b></td><td>${c.last}</td></tr>`).join('')}</tbody></table></div>
 <div class="rows only-narrow anim" style="--i:1">${S.customers.map((c, n) => `<a class="li" href="#customer-${n}">${av(c.name)}<span class="grow"><span class="t">${c.name}</span><span class="s">${plural(c.orders, 'order')} · last ${c.last}</span></span><span class="money">${rs(c.spent)}</span></a>`).join('')}</div>`,
  };
}
function customerScreen(i) {
  const c = S.customers[+i];
  if (!c) return notFound('That customer', 'customers');
  const os = S.orders.filter((o) => o.who === c.name);
  const chat = S.chats.find((x) => x.who === c.name);
  return {
    title: c.name,
    crumb: [['Customers', 'customers']],
    back: ['Customers', 'customers'],
    body: `
 <div class="phead anim"><div class="row" style="gap:var(--s3)">${av(c.name, '').replace('class="av', 'style="width:56px;height:56px;font-size:18px" class="av')}<div class="l"><h1 class="h1">${c.name}</h1><p class="cap">${c.city} · first came from ${c.src}</p></div></div>
  <div class="r">${chat ? `<a class="btn primary" href="#chat-${chat.id}">${ic('forum')}Open chat</a>` : ''}</div></div>
 <div class="detail"><div>
  <section class="card anim" style="--i:1"><div class="tiles four"><div class="tile"><span class="k">Orders</span><span class="v big">${cnt(c.orders)}</span></div><div class="tile"><span class="k">Spent</span><span class="v big">${cnt(c.spent, '₹')}</span></div><div class="tile"><span class="k">Average order</span><span class="v big">${rs(c.orders ? c.spent / c.orders : 0)}</span></div><div class="tile"><span class="k">Last order</span><span class="v big" style="font-size:22px;line-height:1.3">${c.last}</span></div></div></section>
  <section class="card anim" style="--i:2"><div class="card-h"><h2 class="ct">${ic('receipt_long')}Orders</h2></div>${os.length ? `<div class="rows">${os.map((o) => `<a class="li" href="#order-${o.id}" style="background:var(--inner)"><span class="grow"><span class="t">#${o.id}</span><span class="s">${o.when}</span></span>${payB(o)}<span class="money">${rs(o.total)}</span></a>`).join('')}</div>` : `<p class="t-body">Older orders from before Stoora are not shown.</p>`}</section>
 </div><div><section class="card anim" style="--i:3"><div class="card-h"><h2 class="ct">${ic('call')}Contact</h2></div>
  <div class="row"><span class="grow t-ink num" style="user-select:all">${c.phone}</span><button class="btn line sm" data-act="copy" data-text="${c.phone}">${ic('content_copy')}Copy</button></div><p class="cap" style="margin-top:var(--s1)">Number hidden in this sample. Real numbers show in full to you only.</p></section></div></div>`,
  };
}

/* ---------- MONEY ---------- */
const MR = {
  today: { l: 'Today', rec: 4497, pend: 2699, refund: 0 },
  week: { l: 'This week', rec: 31840, pend: 2699, refund: 699 },
  month: { l: 'This month', rec: 128460, pend: 2699, refund: 1398 },
};
function moneyScreen() {
  const m = MR[ui.moneyRange];
  const pend = [
    ...S.orders.filter((o) => !o.paid).map((o) => ({ who: o.who, ref: '#' + o.id, amt: o.total, since: o.when })),
    ...S.bookings
      .filter((b) => !b.paid)
      .map((b) => ({ who: b.who, ref: b.id, amt: prod(b.svc).price, since: 'Booked yesterday' })),
  ];
  const got = [
    ...S.orders
      .filter((o) => o.paid)
      .map((o) => ({
        who: o.who,
        ref: '#' + o.id,
        amt: o.total,
        how: o.pay === 'cash' ? 'Cash' : 'UPI',
        when: o.when,
      })),
    ...S.bookings
      .filter((b) => b.paid)
      .map((b) => ({ who: b.who, ref: b.id, amt: prod(b.svc).price, how: 'UPI', when: b.when })),
  ];
  const pendSum = pend.reduce((a, p) => a + p.amt, 0);
  return {
    title: 'Money',
    body: `
 <div class="phead anim"><div class="l"><h1 class="h1">Money</h1><p class="t-body">Payments in, UPI still to come, and payouts to your bank.</p></div>
  <div class="r"><div class="seg inline" role="radiogroup" aria-label="Time range">${Object.entries(MR)
    .map(
      ([k, v]) =>
        `<button role="radio" aria-checked="${ui.moneyRange === k}" class="${ui.moneyRange === k ? 'on' : ''}" data-act="mrange" data-v="${k}">${v.l}</button>`,
    )
    .join('')}</div></div></div>
 <div class="stack">
 <section class="card anim" style="--i:1"><div class="tiles four">
  <div class="tile"><span class="k">Received</span><span class="v big">${cnt(m.rec, '₹')}</span><span class="d">${m.l}</span></div>
  <div class="tile"><span class="k">Waiting for UPI</span><span class="v big">${cnt(pendSum, '₹')}</span><span class="d">${plural(pend.length, 'payment')}</span></div>
  <div class="tile"><span class="k">Next payout</span><span class="v big">${cnt(S.payouts.next, '₹')}</span><span class="d">${S.payouts.date}</span></div>
  <div class="tile"><span class="k">Refunds</span><span class="v big">${cnt(m.refund, '₹')}</span><span class="d">${m.l}</span></div></div></section>
 <div class="banner info anim" style="--i:2">${ic('account_balance')}<span>Next payout of <b class="t-ink num">${rs(S.payouts.next)}</b> goes to ${S.payouts.acct} on ${S.payouts.date}.</span></div>
 <div class="detail"><div>
  <section class="card anim" style="--i:3"><div class="card-h"><h2 class="ct">${ic('schedule')}Waiting for payment</h2><span class="cap">${rs(pendSum)}</span></div>
   ${pend.length ? `<div class="rows">${pend.map((p) => `<div class="li" style="background:var(--inner);flex-wrap:wrap">${av(p.who)}<span class="grow"><span class="t">${p.who}</span><span class="s">${p.ref} · ${p.since}</span></span><span class="money">${rs(p.amt)}</span><button class="btn ink sm" data-act="remind" data-who="${p.who}">${ic('send')}Remind</button></div>`).join('')}</div>` : emptyState('upi', 'Nobody owes you money', 'Every order and booking is paid.')}</section>
  <section class="card anim" style="--i:4"><div class="card-h"><h2 class="ct">${ic('check_circle')}Payments received</h2></div>
   <div class="rows">${got.map((p) => `<div class="li" style="background:var(--inner)">${av(p.who)}<span class="grow"><span class="t">${p.who}</span><span class="s">${p.ref} · ${p.how} · ${p.when}</span></span><span class="end"><span class="money">${rs(p.amt)}</span>${bdg('ok', 'check_circle', 'Received')}</span></div>`).join('')}</div></section>
 </div><div>
  <section class="card anim" style="--i:5"><div class="card-h"><h2 class="ct">${ic('account_balance')}Payouts to bank</h2></div>
   <div class="rows">${[
     ['Tue 28 Oct', 8120, 0],
     ['Mon 20 Oct', 12480, 1],
     ['Mon 13 Oct', 9655, 1],
   ]
     .map(
       ([d, a, p]) =>
         `<div class="li" style="background:var(--inner)"><span class="grow"><span class="t">${d}</span><span class="s">${S.payouts.acct}</span></span><span class="end"><span class="money">${rs(a)}</span>${p ? bdg('ok', 'check_circle', 'In bank') : bdg('offer', 'event_upcoming', 'Scheduled')}</span></div>`,
     )
     .join('')}</div>
   <a class="link cap" href="#shop-settings" style="margin-top:var(--s2)">Change bank account${ic('chevron_right', 'xs')}</a></section>
 </div></div></div>`,
  };
}

/* ---------- ANALYTICS ---------- */
const AN = {
  7: {
    l: 'Last 7 days',
    x: ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'],
    v: [5200, 3100, 6900, 9400, 5900, 6940, 8195],
    orders: 31,
    visits: 1046,
  },
  30: {
    l: 'Last 30 days',
    x: ['28 Sep', '5 Oct', '12 Oct', '19 Oct', '26 Oct'],
    v: [28400, 31200, 26900, 36800, 15135],
    orders: 118,
    visits: 4310,
  },
};
function barsHTML(xs, vs, label) {
  const max = Math.max(...vs);
  const top = Math.ceil(max / 2000) * 2000;
  return `<div class="chart" role="img" aria-label="${label}"><div style="display:flex;gap:var(--s2)"><div style="display:flex;flex-direction:column;justify-content:space-between;height:150px;padding-top:var(--s2);font-size:12px;color:var(--ink-65);text-align:right;min-width:52px" aria-hidden="true"><span>${rs(top)}</span><span>${rs(top / 2)}</span><span>₹0</span></div>
  <div style="flex:1;min-width:0;position:relative"><div aria-hidden="true" style="position:absolute;left:0;right:0;top:calc(var(--s2) + (150px - var(--s2))/2);border-top:1px dashed var(--line-soft)"></div><div class="bars">${vs.map((v, n) => `<div class="b" tabindex="0" style="--b:${n}" aria-label="${xs[n]}: ${rs(v)}"><span class="tip">${xs[n]} · ${rs(v)}</span><i style="height:${(v / top) * 100}%;${n === vs.length - 1 ? '' : 'opacity:.55'}"></i></div>`).join('')}</div>
  <div class="xlab" aria-hidden="true">${xs.map((x) => `<span>${x}</span>`).join('')}</div></div></div></div>`;
}
function analyticsScreen() {
  const a = AN[ui.anRange];
  const sales = a.v.reduce((x, y) => x + y, 0);
  const top = [...S.products].sort((x, y) => y.sold - x.sold).slice(0, 4);
  const tmax = top[0].sold;
  return {
    title: 'Analytics',
    body: `
 <div class="phead anim"><div class="l"><h1 class="h1">Analytics</h1><p class="t-body">How your shop did. Numbers are after discounts, before payout fees.</p></div>
  <div class="r"><div class="seg inline" role="radiogroup" aria-label="Time range">${Object.entries(AN)
    .map(
      ([k, v]) =>
        `<button role="radio" aria-checked="${ui.anRange === k}" class="${ui.anRange === k ? 'on' : ''}" data-act="arange" data-v="${k}">${v.l}</button>`,
    )
    .join('')}</div></div></div>
 <div class="stack">
 <section class="card anim" style="--i:1"><div class="tiles four">
  <div class="tile"><span class="k">Sales</span><span class="v big">${cnt(sales, '₹')}</span><span class="d up">${ic('arrow_upward')}18% vs before</span></div>
  <div class="tile"><span class="k">Orders</span><span class="v big">${cnt(a.orders)}</span><span class="d up">${ic('arrow_upward')}9% vs before</span></div>
  <div class="tile"><span class="k">Visits</span><span class="v big">${cnt(a.visits)}</span><span class="d down">${ic('arrow_downward')}4% vs before</span></div>
  <div class="tile"><span class="k">Visits that bought</span><span class="v big">${((a.orders / a.visits) * 100).toFixed(1)}%</span><span class="d">About 3 in 100</span></div></div></section>
 <section class="card anim" style="--i:2"><div class="card-h"><h2 class="ct">Sales by ${ui.anRange === '7' ? 'day' : 'week'}</h2><span class="cap">${a.l} · today in full colour</span></div>${barsHTML(a.x, a.v, 'Sales by ' + (ui.anRange === '7' ? 'day' : 'week') + ', ' + a.l)}</section>
 <div class="grid2">
  <section class="card anim" style="--i:3"><div class="card-h"><h2 class="ct">Best sellers</h2><span class="cap">Units, 30 days</span></div><div class="stack tight">${top.map((p) => `<div class="hbar"><div class="top2"><span>${p.name}</span><span class="num t-ink">${p.sold}</span></div><div class="trk"><i style="width:${(p.sold / tmax) * 100}%"></i></div></div>`).join('')}</div></section>
  <section class="card anim" style="--i:4"><div class="card-h"><h2 class="ct">Where orders came from</h2><span class="cap">Share of orders</span></div><div class="stack tight">${[
    ['WhatsApp', 46],
    ['Instagram', 31],
    ['Shop link', 15],
    ['In person', 8],
  ]
    .map(
      ([s, v]) =>
        `<div class="hbar"><div class="top2"><span class="row" style="gap:var(--s1)">${ic(SRC[s], 'xs t-soft')}${s}</span><span class="num t-ink">${v}%</span></div><div class="trk"><i style="width:${(v / 46) * 100}%"></i></div></div>`,
    )
    .join('')}</div></section>
 </div></div>`,
  };
}

/* ---------- STOREFRONT ---------- */
function storefrontScreen() {
  const th = ui.theme || 'warm';
  const hdbg = { warm: 'var(--gradient-soft)', indigo: 'var(--ink)', plain: 'var(--card)' }[th];
  return {
    title: 'Storefront',
    body: `
 <div class="phead anim"><div class="l"><h1 class="h1">Storefront</h1><p class="t-body">What buyers see at your shop link.</p></div>
  <div class="r"><button class="btn line" data-act="copy" data-text="https://stoora.in/${S.shop.handle}">${ic('content_copy')}Copy shop link</button></div></div>
 <div class="detail"><div><section class="card anim pad-lg" style="--i:1;background:var(--inner)">
  <div class="shopprev" aria-label="Preview of your shop on a phone"><div class="hd" style="background:${hdbg}"><span class="shop-av" aria-hidden="true">${esc(S.shop.name[0].toUpperCase())}</span><b style="font-family:var(--font-display);font-size:20px;color:${th === 'indigo' ? '#FFFFFF' : 'var(--ink)'};letter-spacing:-.02em">${esc(S.shop.name)}</b><span style="font-size:12px;color:${th === 'indigo' ? 'var(--on-ink-soft)' : 'var(--ink-65)'}">Hand block prints and yoga, Jaipur</span></div>
   <div class="gridp">${S.products
     .filter((p) => p.status === 'Active')
     .slice(0, 4)
     .map(
       (p) =>
         `<div><span class="ph">${ic(p.icon)}</span><span>${p.name}</span>${S.shop.prices ? `<b class="t-ink num">${rs(p.price)}</b>` : ''}${p.stock === 0 ? '<span style="color:var(--negative-deep)">Sold out</span>' : ''}</div>`,
     )
     .join('')}</div></div>
  ${!S.shop.open ? `<div class="banner warn" style="margin-top:var(--s3)">${ic('storefront')}<span>Your shop is closed. Buyers see a “back soon” page.</span></div>` : ''}</section></div>
 <div><section class="card anim stack tight" style="--i:2"><h2 class="ct">Your shop link</h2><div class="row"><span class="grow t-ink" style="user-select:all;font-weight:500">stoora.in/${S.shop.handle}</span><button class="btn line sm" data-act="copy" data-text="https://stoora.in/${S.shop.handle}">${ic('content_copy')}Copy</button></div><p class="cap">Share it with your customers.</p></section>
 <section class="card anim" style="--i:3"><h2 class="ct" style="margin-bottom:var(--s1)">Shop settings</h2>
  ${[
    ['open', 'Shop is open', 'Buyers can order right now'],
    ['prices', 'Show prices', 'Turn off to take orders on chat only'],
    ['cod', 'Cash on delivery', 'Let buyers pay when the parcel arrives'],
  ]
    .map(
      ([k, l, s]) =>
        `<div class="toggle-row"><span class="grow"><span class="t-ink" style="font-weight:500;display:block">${l}</span><span class="cap">${s}</span></span><button class="switch" role="switch" aria-checked="${S.shop[k]}" aria-label="${l}" data-act="shop-sw" data-k="${k}"></button></div>`,
    )
    .join('')}</section>
 <section class="card anim stack tight" style="--i:4"><h2 class="ct">Look</h2><div class="chips" role="radiogroup" aria-label="Shop look">${[
   ['warm', 'Warm'],
   ['indigo', 'Indigo'],
   ['plain', 'Plain'],
 ]
   .map(
     ([k, l]) =>
       `<button role="radio" aria-checked="${th === k}" class="chip ${th === k ? 'on' : ''}" data-act="theme" data-v="${k}">${l}</button>`,
   )
   .join('')}</div><p class="cap">Changes the top of your shop. Products stay the same.</p></section></div></div>`,
  };
}

/* ---------- OFFERS ---------- */
function offersScreen() {
  return {
    title: 'Discounts & offers',
    body: `
 <div class="phead anim"><div class="l"><h1 class="h1">Discounts & offers</h1><p class="t-body">Codes buyers type at checkout, or you send on WhatsApp.</p></div><div class="r"><button class="btn primary" data-act="new-offer">${ic('add')}Create offer</button></div></div>
 ${
   S.offers.length
     ? `<div class="rows anim" style="--i:1">${S.offers.map((o, n) => `<div class="li" style="flex-wrap:wrap"><span class="thumb">${ic('local_offer')}</span><span class="grow" style="min-width:160px"><span class="t">${o.code}</span><span class="s">${o.what} · used ${o.used} times · ${o.ends}</span></span>${o.on ? bdg('ok', 'check_circle', 'On') : bdg('neutral', 'pause_circle', 'Off')}<button class="switch" role="switch" aria-checked="${o.on}" aria-label="${o.code} on or off" data-act="offer-sw" data-i="${n}"></button></div>`).join('')}</div>`
     : `<div class="card">${emptyState('gift', 'No offers yet', 'A small offer to past buyers is the cheapest way to get a repeat order.', '<button class="btn primary sm" data-act="new-offer">Create offer</button>')}</div>`
 }`,
  };
}

/* ---------- SETTINGS ---------- */
const SET = [
  ['General', 'store'],
  ['Plan', 'workspace_premium'],
  ['Billing', 'receipt_long'],
  ['Users', 'group'],
  ['Payments', 'payments'],
  ['Checkout', 'shopping_cart_checkout'],
  ['Customer accounts', 'account_circle'],
  ['Shipping and delivery', 'local_shipping'],
  ['Taxes and duties', 'percent'],
  ['Locations', 'location_on'],
  ['Apps', 'apps'],
  ['Sales channels', 'hub'],
  ['Domains', 'language'],
  ['Customer events', 'ads_click'],
  ['Notifications', 'notifications'],
  ['Languages', 'translate'],
  ['Customer privacy', 'lock'],
  ['Policies', 'description'],
];
const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, '-');
function settingsScreen() {
  const q = ui.setQ.trim().toLowerCase();
  const rows = SET.filter(([l]) => !q || l.toLowerCase().includes(q));
  return {
    title: 'Settings',
    narrow: true,
    body: `
 <div class="phead anim"><div class="l"><h1 class="h1">Settings</h1></div></div>
 <div class="stack">
 <section class="card anim" style="--i:1"><div class="row"><span class="shop-av" aria-hidden="true">${esc(S.shop.name[0].toUpperCase())}</span><div class="grow"><div class="t-ink" style="font-weight:500">${esc(S.shop.name)}</div><div class="cap">stoora.in/${S.shop.handle}</div></div>${bdg('offer', 'workspace_premium', 'Starter plan')}</div></section>
 <label class="search anim" style="--i:2;flex:none">${ic('search', 'sm')}<span class="sr">Search settings</span><input id="set-q" type="search" placeholder="Search settings" value="${esc(ui.setQ)}" data-input="setQ"></label>
 <section class="card flush anim" style="--i:3" id="setlist"><nav class="setlist" aria-label="Settings">${rows.map(([l, i]) => `<a class="set-row" href="#shop-settings-${slug(l)}">${ic(i)}<span>${l}</span>${ic('chevron_right', 'sm')}</a>`).join('') || `<p class="cap" style="padding:var(--s3)">No setting called “${esc(ui.setQ)}”. Try “payments” or “shipping”.</p>`}</nav></section></div>`,
  };
}
function settingScreen(s) {
  const row = SET.find(([l]) => slug(l) === s);
  if (!row) return notFound('That setting', 'shop-settings');
  if (s === 'general') return generalScreen();
  return {
    title: row[0],
    crumb: [['Settings', 'shop-settings']],
    back: ['Settings', 'shop-settings'],
    narrow: true,
    body: `
 <div class="phead anim"><div class="l"><h1 class="h1">${row[0]}</h1></div></div>
 <div class="card anim">${emptyState('done', 'Not designed in this pass', 'This page follows the General pattern: one card per topic, plain labels, and a save bar that appears when something changes.', '<a class="btn line sm" href="#shop-settings-general">See the General page</a>')}</div>`,
  };
}
function generalScreen() {
  const f =
    ui.form.pid === 'gen'
      ? ui.form
      : (ui.form = {
          pid: 'gen',
          name: S.shop.name,
          handle: S.shop.handle,
          email: S.shop.email,
          phone: S.shop.phone,
          addr: '14, Haldiyon ka Rasta, Johari Bazaar',
          city: 'Jaipur',
          state: 'Rajasthan',
          pin: '302003',
          gst: '',
          errors: {},
        });
  const STATES = [
    'Andhra Pradesh',
    'Delhi',
    'Gujarat',
    'Karnataka',
    'Kerala',
    'Maharashtra',
    'Rajasthan',
    'Tamil Nadu',
    'Telangana',
    'Uttar Pradesh',
    'West Bengal',
  ];
  return {
    title: 'General',
    crumb: [['Settings', 'shop-settings']],
    back: ['Settings', 'shop-settings'],
    narrow: true,
    body: `
 <div class="phead anim"><div class="l"><h1 class="h1">General</h1><p class="t-body">Your shop’s name, contact details and address.</p></div></div>
 <form class="stack" data-form="general" novalidate>
  <section class="card anim stack" style="--i:1"><h2 class="ct">Shop details</h2>
   <div class="field"><label for="g-name">Shop name</label><input class="input ${f.errors.name ? 'bad' : ''}" id="g-name" data-pf="name" value="${esc(f.name)}">${f.errors.name ? `<span class="err">${ic('error', 'xs')}Your shop needs a name.</span>` : ''}</div>
   <div class="field"><label for="g-handle">Shop link</label><div class="affix"><span>stoora.in/</span><input id="g-handle" data-pf="handle" value="${esc(f.handle)}" autocapitalize="none" spellcheck="false"></div><span class="hint">Changing this breaks links you have already shared.</span></div>
   <div class="grid2"><div class="field"><label for="g-email">Email</label><input class="input" id="g-email" type="email" inputmode="email" autocomplete="email" data-pf="email" value="${esc(f.email)}"></div>
   <div class="field"><label for="g-phone">WhatsApp number</label><input class="input" id="g-phone" type="tel" inputmode="tel" data-pf="phone" value="${esc(f.phone)}"></div></div></section>
  <section class="card anim stack" style="--i:2"><h2 class="ct">Address</h2><p class="cap" style="margin-top:calc(var(--s2) * -1)">Printed on invoices and used for pickups.</p>
   <div class="field"><label for="g-addr">Address</label><input class="input" id="g-addr" autocomplete="street-address" data-pf="addr" value="${esc(f.addr)}"></div>
   <div class="grid2"><div class="field"><label for="g-city">City</label><input class="input" id="g-city" data-pf="city" value="${esc(f.city)}"></div>
   <div class="field"><label for="g-pin">PIN code</label><input class="input" id="g-pin" inputmode="numeric" maxlength="6" data-pf="pin" value="${esc(f.pin)}"></div></div>
   <div class="field"><label for="g-state">State</label><select class="input" id="g-state" data-pf="state">${STATES.map((s) => `<option ${s === f.state ? 'selected' : ''}>${s}</option>`).join('')}</select></div></section>
  <section class="card anim stack" style="--i:3"><h2 class="ct">Tax</h2>
   <div class="field"><label for="g-gst">GSTIN <span class="cap">(optional)</span></label><input class="input" id="g-gst" data-pf="gst" value="${esc(f.gst)}" placeholder="08ABCDE1234F1Z5" autocapitalize="characters"><span class="hint">Add it if you are registered for GST.</span></div></section>
  <section class="card anim" style="--i:4"><h2 class="ct" style="margin-bottom:var(--s2)">Shop defaults</h2><dl class="spec"><dt>Currency</dt><dd class="t-ink">Indian rupee (₹)</dd><dt>Time zone</dt><dd class="t-ink">India (IST, UTC+5:30)</dd><dt>Order numbers</dt><dd class="t-ink">Start at #1001</dd></dl></section>
 </form>`,
  };
}

/* ---------- DESIGN SYSTEM (for Mihitha + Midhun) ---------- */
const SCREEN_MAP = [
  ['S01', 'new-shop', 'Home · new shop'],
  ['S02', 'home', 'Home · active shop'],
  ['S03', 'home', 'Morning message', 'morning'],
  ['S04', 'home', 'Menu (phone)', 'menu'],
  ['S05', 'home', 'Search', 'search'],
  ['S06', 'home', 'Alerts', 'alerts'],
  ['S07', 'home', 'Ask Stoora', 'ask'],
  ['S08', 'orders', 'Orders list'],
  ['S09', 'order-1012', 'Order page'],
  ['S10', 'order-1012', 'Ship an order', 'ship'],
  ['S11', 'create-order', 'Create order'],
  ['S12', 'create-order', 'Product picker', 'picker'],
  ['S13', 'order-1011', 'Confirm payment'],
  ['S14', 'bookings', 'Bookings tab'],
  ['S15', 'booking-B-209', 'Booking page'],
  ['S16', 'products', 'Products list'],
  ['S17', 'add-product', 'Add product'],
  ['S18', 'product-p3', 'Edit product (save bar)'],
  ['S19', 'services', 'Services tab'],
  ['S20', 'add-service', 'Add service'],
  ['S21', 'chats', 'Chats list'],
  ['S22', 'chat-c1', 'Chat with drafted reply'],
  ['S23', 'customers', 'Customers'],
  ['S24', 'customer-0', 'Customer page'],
  ['S25', 'money', 'Money'],
  ['S26', 'analytics', 'Analytics'],
  ['S27', 'storefront', 'Storefront'],
  ['S28', 'offers', 'Discounts & offers'],
  ['S29', 'shop-settings', 'Settings list'],
  ['S30', 'shop-settings-general', 'Settings › General'],
];
function systemScreen() {
  const sw = (n, v, note) =>
    `<div><b style="background:${v}"></b><span><span class="t-ink" style="font-weight:500">${n}</span><br><code>${v.startsWith('var') ? getComputedStyle(document.documentElement).getPropertyValue(v.slice(4, -1)).trim().slice(0, 40) : v}</code>${note ? `<br>${note}` : ''}</span></div>`;
  return {
    title: 'Design system',
    body: `
 <div class="phead anim"><div class="l"><span class="eyebrow">Design review · 27 Oct 2026</span><h1 class="h1">How this dashboard is built</h1><p class="t-body" style="max-width:62ch">One responsive app in place of two separate mock-ups. It follows Brand Kit v2 and the 25 Oct decisions. All shop data is sample data for Meera Studio.</p></div></div>
 <div class="stack loose">
 <section class="card pad-lg anim" style="--i:1"><h2 class="h2" style="margin-bottom:var(--s3)">Every screen</h2><p class="cap" style="margin-bottom:var(--s3)">Same numbers as the prototypes. Open any of them, then resize the window: phone below 760px, icon rail to 1099px, full sidebar from 1100px, Ask Stoora docks beside the page from 1280px.</p>
  <div class="idx">${SCREEN_MAP.map(([n, r, l, ov]) => `<a href="#${r}" data-go="${r}" ${ov ? `data-ov="${ov}"` : ''}><code>${n}</code>${l}</a>`).join('')}</div></section>
 <section class="card pad-lg anim" style="--i:2"><h2 class="h2" style="margin-bottom:var(--s3)">What changed from the prototypes</h2><ul class="notes" style="padding-left:18px;margin:0">
  <li><b>One app, three layouts.</b> The phone and laptop files were two apps. This is one codebase with breakpoints, the way the Next.js build will work.</li>
  <li><b>Morning message leads Home.</b> The PRD says sellers read a message and tap. The ideas now sit on Home with Do it and Not now, each showing what it could earn and cost. No modal first.</li>
  <li><b>Badges carry an icon and a word.</b> The prototypes used a coloured dot. Brand rule R6 asks for colour, icon and word.</li>
  <li><b>Kit values only.</b> Shadows use the warm oklch values, not rgba black. Spacing uses the φ scale (6, 10, 16, 26, 42, 68). Inputs and chips are pills. The drawer greys now come from ink and white, not new hex values.</li>
  <li><b>No exclamation marks.</b> “Good morning, Meera!” became “Good morning, Meera”, per the voice rules.</li>
  <li><b>Readable at 25 to 60.</b> Body text 15px, captions 13px, table text 14px (was 12px). Every tap target is at least 44px.</li>
  <li><b>Wordmark in the sidebar.</b> “stoora.in” in Fraunces 900 with the orange .in, beside the app icon. The prototypes used plain “Stoora” in the body font.</li>
  <li><b>Gradient budget.</b> One gradient button per screen at most, plus eyebrow labels and the app icon. Home has no gradient button at all.</li>
  <li><b>Honest edges.</b> Settings pages other than General show a “not designed yet” state, not fake forms. Ask Stoora answers three sample questions and says so for the rest.</li></ul></section>
 <section class="card pad-lg anim" style="--i:3"><h2 class="h2" style="margin-bottom:var(--s3)">Colour</h2>
  <p class="label" style="margin-bottom:var(--s2)">Ground and ink</p><div class="sw">${[
    ['Page', 'var(--surface)'],
    ['Card', 'var(--card)'],
    ['Inside a card', 'var(--inner)'],
    ['Sunken', 'var(--muted)'],
    ['Border', 'var(--line)'],
    ['Heading ink', 'var(--ink)'],
    ['Sub-heading ink', 'var(--ink-soft)'],
    ['Body ink', 'var(--ink-65)'],
    ['Caption ink', 'var(--ink-45)', 'Captions only, 3.6:1'],
  ]
    .map((a) => sw(...a))
    .join('')}</div>
  <p class="label" style="margin:var(--s4) 0 var(--s2)">Signal — text uses the deep shade on the tint</p><div class="sw">${[
    ['Primary', 'var(--primary)'],
    ['Primary deep', 'var(--primary-deep)'],
    ['Primary tint', 'var(--primary-tint)'],
    ['Waiting deep', 'var(--marigold-deep)'],
    ['Waiting tint', 'var(--marigold-tint)'],
    ['Paid deep', 'var(--positive-deep)'],
    ['Paid tint', 'var(--positive-tint)'],
    ['Failed deep', 'var(--negative-deep)'],
    ['Failed tint', 'var(--negative-tint)'],
  ]
    .map((a) => sw(...a))
    .join('')}</div>
  <p class="label" style="margin:var(--s4) 0 var(--s2)">Gradients — about 5% of a screen</p><div class="sw">${sw('Action', 'var(--gradient-action)', 'Main button, eyebrows')}${sw('Warm', 'var(--gradient-warm)', 'App icon, shop avatar')}${sw('Soft', 'var(--gradient-soft)', 'Drawing panels')}</div></section>
 <section class="card pad-lg anim" style="--i:4"><h2 class="h2" style="margin-bottom:var(--s3)">Type</h2><dl class="spec">
  <dt>Page title</dt><dd><span class="h1">Good morning, Meera</span><div class="cap">Bricolage Grotesque 800 · 28px phone, 32px wider · −0.025em</div></dd>
  <dt>Big number</dt><dd><span class="big" style="font-size:28px">₹8,195</span><div class="cap">Bricolage 800 · 28px · tabular figures</div></dd>
  <dt>Card title</dt><dd><span class="ct">To do today</span><div class="cap">Lexend 600 · 17px</div></dd>
  <dt>Body</dt><dd><span class="t-body">Rahul has not paid ₹1,499 for 2 days.</span><div class="cap">Lexend 400 · 15px · warm brown ink</div></dd>
  <dt>Eyebrow</dt><dd><span class="eyebrow">Morning message</span><div class="cap">Lexend 700 · 11px · +0.16em · action gradient</div></dd>
  <dt>Wordmark</dt><dd><span class="wordmark">stoora<i>.in</i></span><div class="cap">Fraunces 900 · logo only</div></dd></dl></section>
 <section class="card pad-lg anim" style="--i:5"><h2 class="h2" style="margin-bottom:var(--s3)">Components</h2><div class="stack">
  <div class="btns"><button class="btn primary">Main action</button><button class="btn ink">Second action</button><button class="btn line">Other action</button><button class="btn quiet">Cancel</button><button class="btn danger">${ic('delete')}Delete</button></div>
  <div class="btns">${bdg('ok', 'check_circle', 'Paid')}${bdg('warn', 'schedule', 'Unpaid')}${bdg('warn', 'local_shipping', 'To ship')}${bdg('neutral', 'done_all', 'Shipped')}${bdg('bad', 'block', 'Sold out')}${bdg('offer', 'event_upcoming', 'Upcoming')}${src('WhatsApp')}${src('Instagram')}</div>
  <div class="row" style="flex-wrap:wrap"><div class="chips"><button class="chip on">All<span class="n">4</span></button><button class="chip">To ship<span class="n">1</span></button></div><div class="seg inline"><button class="on">Orders</button><button>Bookings</button></div><button class="switch" role="switch" aria-checked="true" aria-label="Example switch" data-act="demo-sw"></button></div>
  <div class="grid2"><div class="field"><label for="ds-a">Label above every field</label><input class="input" id="ds-a" placeholder="Example, never the only label"></div><div class="field"><label for="ds-b">Money field</label><div class="affix"><span>₹</span><input id="ds-b" inputmode="numeric" value="1,499"></div></div></div>
  <div class="field"><label for="ds-c">Error state</label><input class="input bad" id="ds-c" aria-invalid="true"><span class="err">${ic('error', 'xs')}Say what to do, not what went wrong.</span></div></div></section>
 <section class="card pad-lg anim" style="--i:6"><h2 class="h2" style="margin-bottom:var(--s3)">Rules that do not change</h2><dl class="spec">
  <dt>Shape</dt><dd class="t-soft">Anything you tap is a pill (50px radius). Anything that holds content is 12px or 16px.</dd>
  <dt>Spacing</dt><dd class="t-soft">6, 10, 16, 26, 42, 68. No 8, 12, 24 or 32.</dd>
  <dt>Shadow</dt><dd class="t-soft">Warm brown oklch only. Cards use the soft shadow; sheets and toasts use the warm one.</dd>
  <dt>Icons</dt><dd class="t-soft">Material Symbols Rounded, outline, weight 400. 20px in lists, 24px default. No emoji.</dd>
  <dt>Motion</dt><dd class="t-soft">Cards rise in, numbers count up, badges pop, drawings draw. All of it turns off with reduced motion.</dd>
  <dt>Drawings</dt><dd class="t-soft">Painted-sign style, only on empty screens and setup cards. Mihitha redraws the final set in Figma as SVG.</dd></dl></section>
 </div>`,
  };
}

/* ---------- screen registry ---------- */
const SCREENS = {
  home: { fn: homeScreen },
  'new-shop': {
    fn: () => {
      S.newShop = true;
      S.leftSetup = false;
      return newShopScreen();
    },
  },
  orders: { fn: ordersScreen },
  bookings: { fn: bookingsScreen },
  'create-order': { fn: createScreen },
  products: { fn: productsScreen },
  services: { fn: servicesScreen },
  'add-product': { fn: () => productForm(null) },
  'add-service': { fn: serviceForm },
  chats: { fn: () => chatsScreen(null) },
  customers: { fn: customersScreen },
  money: { fn: moneyScreen },
  analytics: { fn: analyticsScreen },
  storefront: { fn: storefrontScreen },
  offers: { fn: offersScreen },
  'shop-settings': { fn: settingsScreen },
  'design-system': { fn: systemScreen },
};
const ARGS = {
  'order-': orderScreen,
  'booking-': bookingScreen,
  'chat-': chatsScreen,
  'customer-': customerScreen,
  'product-': productForm,
  'shop-settings-': settingScreen,
};
function resolve(r) {
  if (SCREENS[r]) {
    if (r === 'home') S.newShop = !!(S.isNewAccount && !S.leftSetup);
    return SCREENS[r];
  }
  for (const k in ARGS)
    if (r.startsWith(k) && r.length > k.length) {
      const fn = ARGS[k],
        a = r.slice(k.length);
      return { fn: () => fn(a) };
    }
  return null;
}

/* ================= overlays ================= */
let opener = null;
function sheet(id, title, body, foot = '', o = {}) {
  return `<div class="scrim" data-act="close"></div>
 <div class="sheet ${o.full ? 'full' : ''}" role="dialog" aria-modal="true" aria-labelledby="${id}-t" id="${id}"><div class="grab" aria-hidden="true"></div>
  <div class="sheet-h">${o.lead || ''}<h2 class="h2" id="${id}-t">${title}</h2>${sheetBtnClose}</div><div class="sheet-b">${body}</div>${foot ? `<div class="sheet-f">${foot}</div>` : ''}</div>`;
}
function setLayer(html, focusSel) {
  opener = opener || document.activeElement;
  const L = $('#layer');
  L.innerHTML = html;
  document.body.style.overflow = 'hidden';
  const f = L.querySelector(focusSel || 'input,textarea,[data-focus]') || L.querySelector('button');
  f && setTimeout(() => f.focus({ preventScroll: true }), 40);
}
function closeOv(silent) {
  const L = $('#layer');
  if (!L.innerHTML) return;
  L.innerHTML = '';
  overlay = null;
  document.body.style.overflow = '';
  if (!silent && opener && opener.isConnected) opener.focus({ preventScroll: true });
  opener = null;
}
function openOv(name, arg) {
  overlay = name;
  (
    ({
      menu: openMenu,
      search: openSearch,
      alerts: openAlerts,
      ask: () => openAsk(arg),
      ship: () => openShip(arg || route.split('-')[1]),
      picker: openPicker,
      offer: openOffer,
      morning: () => {
        const m = $('#mm-h');
        m && m.closest('section').scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    })[name] || (() => {})
  )();
}

function openMenu() {
  const t = tabOf(route);
  setLayer(
    `<div class="drawer" role="dialog" aria-modal="true" aria-label="Menu"><nav class="panel" aria-label="Main">
  <div class="brand" style="padding-left:var(--s2)"><span class="appicon" aria-hidden="true">S</span><span class="wordmark" style="color:var(--on-ink)">stoora<i>.in</i></span></div>
  <button class="sbtn-search" data-act="search" style="margin:var(--s1) 0 var(--s2)">${ic('search', 'sm')}Search everything</button>
  ${NAV.map((n) => `<a class="nav ${t === n.r ? 'on' : ''}" href="#${n.r}">${ic(n.i)}${n.l}</a>`).join('')}
  <div class="ngroup">Sales channels</div>
  ${CHANNELS.map((c) => `<a class="nav" href="#${c.r}">${ic(c.i)}${c.l}</a>`).join('')}
  <div class="ngroup">Design review</div><a class="nav" href="#design-system">${ic('palette')}Design system and screens</a>
  <div class="foot"><a class="btn grow" href="#shop-settings">${ic('settings')}Settings</a><button class="btn" data-act="close" aria-label="Close menu" style="padding:0 var(--s3)">${ic('close')}</button></div>
 </nav><div class="peek" data-act="close" aria-hidden="true"></div></div>`,
    'a.nav.on',
  );
}

function searchResults(q) {
  q = q.trim().toLowerCase();
  if (!q)
    return `<p class="label" style="margin:var(--s2) 0 var(--s1)">Try</p><div class="rows">${[
      ['Orders to ship', 'orders', 'local_shipping'],
      ['Priya Sharma', 'customer-0', 'person'],
      ['Indigo kurta set', 'product-p3', 'apparel'],
      ['Payments settings', 'shop-settings-payments', 'payments'],
    ]
      .map(
        ([l, r, i]) =>
          `<a class="li" href="#${r}">${ic(i, 't-soft')}<span class="t grow">${l}</span>${ic('north_west', 'sm t-cap')}</a>`,
      )
      .join('')}</div>`;
  const G = [
    [
      'Pages',
      [
        ...NAV.map((n) => [n.l, n.r, n.i]),
        ['Storefront', 'storefront', 'storefront'],
        ['Settings', 'shop-settings', 'settings'],
        ...SET.map(([l, i]) => [l + ' settings', 'shop-settings-' + slug(l), i]),
      ].filter((x) => x[0].toLowerCase().includes(q)),
    ],
    [
      'Orders',
      S.orders
        .filter((o) => (o.who + ' #' + o.id).toLowerCase().includes(q))
        .map((o) => [`#${o.id} · ${o.who}`, 'order-' + o.id, 'receipt_long', rs(o.total)]),
    ],
    [
      'Products',
      [...S.products, ...S.services]
        .filter((p) => p.name.toLowerCase().includes(q))
        .map((p) => [p.name, p.id.startsWith('p') ? 'product-' + p.id : 'services', p.icon, rs(p.price)]),
    ],
    [
      'Customers',
      S.customers
        .map((c, n) => [c.name, 'customer-' + n, 'person', c.city])
        .filter((x) => x[0].toLowerCase().includes(q)),
    ],
  ].filter((g) => g[1].length);
  return G.length
    ? G.map(
        ([h, xs]) =>
          `<p class="label" style="margin:var(--s3) 0 var(--s1)">${h}</p><div class="rows">${xs
            .slice(0, 5)
            .map(
              ([l, r, i, e]) =>
                `<a class="li" href="#${r}">${ic(i, 't-soft')}<span class="t grow">${esc(l)}</span>${e ? `<span class="cap">${e}</span>` : ''}</a>`,
            )
            .join('')}</div>`,
      ).join('')
    : `<div class="empty"><p class="t-soft">Nothing called “${esc(q)}”.</p><p class="cap">Search works on order numbers, buyer names, products and settings.</p></div>`;
}
function openSearch() {
  setLayer(
    sheet(
      'srch',
      'Search',
      `<label class="search" style="position:sticky;top:0;z-index:1;background:var(--inner)">${ic('search', 'sm')}<span class="sr">Search</span><input id="srch-q" type="search" placeholder="Orders, buyers, products, settings" autocomplete="off" data-input="search"></label><div id="sres">${searchResults('')}</div>`,
      '',
      { full: innerWidth < 760 },
    ),
    '#srch-q',
  );
}

function openAlerts() {
  const body = `<div class="rows">${S.alerts.map((a) => `<a class="li" href="#${a.go}" style="align-items:flex-start"><span class="thumb sm">${ic(a.icon, 'sm')}</span><span class="grow"><span class="t">${a.t}</span><span class="s">${a.s}</span></span><span class="cap faint">${a.when}</span></a>`).join('')}</div>`;
  if (innerWidth < 760) return setLayer(sheet('alr', 'Alerts', body));
  setLayer(
    `<div class="scrim" data-act="close" style="background:transparent"></div><div class="pop" role="dialog" aria-modal="true" aria-labelledby="alr-t" style="top:calc(64px + var(--s2));right:var(--s4);width:min(400px,calc(100vw - 52px))"><div class="sheet-h" style="padding:var(--s2) var(--s3)"><h2 class="ct grow" id="alr-t">Alerts</h2>${sheetBtnClose}</div><div style="overflow-y:auto;padding:0 var(--s2) var(--s2)">${body}</div></div>`,
  );
}

function openShip(id) {
  const o = ord(id);
  if (!o) return;
  setLayer(
    sheet(
      'shp',
      `Ship order #${o.id}`,
      `<div class="stack">
  <div class="inner row">${ic('location_on', 't-soft')}<div class="grow"><div class="t-ink" style="font-weight:500">${o.who}</div><div class="cap">${o.city} · ${plural(
    o.items.reduce((a, i) => a + i[1], 0),
    'item',
  )}</div></div></div>
  <div class="field"><label for="shp-c">Courier</label><select class="input" id="shp-c">${['Delhivery', 'India Post', 'Shiprocket', 'Blue Dart', 'DTDC', 'I will deliver it myself'].map((c) => `<option>${c}</option>`).join('')}</select></div>
  <div class="field"><label for="shp-t">Tracking number <span class="cap">(optional)</span></label><input class="input" id="shp-t" placeholder="DL4482190" autocapitalize="characters" spellcheck="false"><span class="hint">Buyers stop asking “where is my parcel” when they have this.</span></div>
  <div class="toggle-row" style="border:0"><span class="grow"><span class="t-ink" style="font-weight:500;display:block">Send tracking to ${o.who.split(' ')[0]} on WhatsApp</span><span class="cap">Stoora sends it once the courier picks up.</span></span><button class="switch" role="switch" aria-checked="true" aria-label="Send tracking on WhatsApp" data-act="toggle"></button></div></div>`,
      `<button class="btn line" data-act="close">Cancel</button><button class="btn primary" data-act="ship-confirm" data-id="${o.id}">${ic('local_shipping')}Mark as shipped</button>`,
    ),
  );
}

function pickerBody(q = '') {
  q = q.toLowerCase();
  const list = S.products.filter((p) => p.status === 'Active' && p.name.toLowerCase().includes(q));
  return `<div class="rows">${
    list
      .map((p) => {
        const n = ui.pick[p.id] || 0;
        return `<div class="li" style="${n ? 'border-color:var(--ink)' : ''}"><span class="thumb sm">${ic(p.icon, 'sm')}</span><span class="grow"><span class="t">${p.name}</span><span class="s num">${rs(p.price)} · ${p.stock ? p.stock + ' in stock' : 'Sold out'}</span></span>
  ${p.stock ? (n ? `<span class="step" role="group" aria-label="Quantity"><button data-act="pick" data-id="${p.id}" data-d="-1" aria-label="One less">${ic('remove', 'xs')}</button><output class="num">${n}</output><button data-act="pick" data-id="${p.id}" data-d="1" aria-label="One more" ${n >= p.stock ? 'disabled' : ''}>${ic('add', 'xs')}</button></span>` : `<button class="btn line sm" data-act="pick" data-id="${p.id}" data-d="1">Add</button>`) : bdg('bad', 'block', 'Sold out')}</div>`;
      })
      .join('') || '<p class="cap">No products match.</p>'
  }</div>`;
}
function pickerFoot() {
  const n = Object.values(ui.pick).reduce((a, b) => a + b, 0);
  return `<button class="btn line" data-act="close">Cancel</button><button class="btn ink" data-act="pick-done" ${n ? '' : 'disabled'}>${n ? `Add ${plural(n, 'item')}` : 'Pick products'}</button>`;
}
function openPicker() {
  if (route !== 'create-order') {
    go('create-order', 'picker');
    return;
  }
  ui.pick = Object.fromEntries(ui.draft.items);
  setLayer(
    sheet(
      'pkr',
      'Add products',
      `<label class="search" style="margin-bottom:var(--s2)">${ic('search', 'sm')}<span class="sr">Search products</span><input id="pkr-q" type="search" placeholder="Search products" data-input="pick"></label><div id="pkr-l">${pickerBody()}</div>`,
      `<div id="pkr-f" style="display:contents">${pickerFoot()}</div>`,
      { full: innerWidth < 760 },
    ),
    '#pkr-q',
  );
}

function openOffer() {
  ui.offer = { type: 'pct' };
  setLayer(
    sheet(
      'off',
      'Create offer',
      `<form class="stack" data-form="offer" id="off-form" novalidate>
  <div class="field"><label for="of-code">Code buyers type</label><input class="input" id="of-code" placeholder="FRIDAY15" autocapitalize="characters" spellcheck="false" style="text-transform:uppercase"></div>
  <div class="field"><span class="flabel" id="of-tl">Offer</span><div class="seg" role="radiogroup" aria-labelledby="of-tl"><button type="button" role="radio" aria-checked="true" class="on" data-act="offer-type" data-v="pct">% off</button><button type="button" role="radio" aria-checked="false" data-act="offer-type" data-v="amt">₹ off</button></div></div>
  <div class="field"><label for="of-amt" id="of-al">How much off, in %</label><input class="input" id="of-amt" inputmode="numeric" placeholder="15"></div>
  <div class="field"><label for="of-on">Works on</label><select class="input" id="of-on"><option>Everything</option><option>Kurtas</option><option>Dupattas</option><option>Yoga classes</option></select></div>
  <div class="field"><label for="of-end">Last day</label><input class="input" id="of-end" type="date" value="2026-11-02"></div>
  <p class="err" id="of-err" hidden>${ic('error', 'xs')}Add a code and an amount.</p></form>`,
      `<button class="btn line" data-act="close">Cancel</button><button class="btn primary" data-act="offer-save">Create offer</button>`,
    ),
  );
}

function askDiscard(cb) {
  ui._discard = cb;
  setLayer(
    sheet(
      'dsc',
      'Leave without saving?',
      `<p class="t-soft">You have changes on this page that are not saved. If you leave now, they are lost.</p>`,
      `<button class="btn line" data-act="close" data-focus>Keep editing</button><button class="btn danger" data-act="discard-leave">Discard and leave</button>`,
    ),
    '[data-focus]',
  );
}

/* ---------- Ask Stoora (F1) ---------- */
ui.askOpen = false;
function answer(q) {
  const t = q.toLowerCase();
  if (/week|how did|how am i|sales/.test(t)) {
    const a = AN['7'];
    return `<p class="t-ink">You made <b class="num">${rs(a.v.reduce((x, y) => x + y, 0))}</b> in the last 7 days, 18% more than the week before.</p><p class="t-soft">Saturday was your best day. Almost half the orders came from WhatsApp.</p>
  <div style="background:var(--surface);border-radius:var(--r-xl);padding:var(--s2)">${barsHTML(a.x, a.v, 'Sales by day, last 7 days')}</div>
  <div class="inner stack tight"><span class="label" style="font-size:11px">One idea</span><p class="t-soft">The indigo kurta set sold fastest and has 3 left. Make 10 more before Friday, when your new prints go up.</p><div class="btns"><button class="btn ink sm" data-act="ask-idea">Remind me Thursday</button></div></div>`;
  }
  if (/ship/.test(t))
    return `<p class="t-ink">Ship <b>#1012</b> first. Priya paid ${rs(3798)} by UPI this morning and lives in Pune, so a courier can pick up today.</p><p class="t-soft">#1011 is not paid yet. Stoora can remind Rahul on WhatsApp.</p><div class="btns"><a class="btn ink sm" href="#order-1012">Open #1012</a><button class="btn line sm" data-act="remind" data-who="Rahul Verma">Remind Rahul</button></div>`;
  if (/post|write|caption|instagram/.test(t))
    return `<p class="t-ink">Here is a post for the indigo kurta set. It uses your real stock count.</p><div class="inner"><p class="t-soft" id="cap-txt">Only 3 left. Our indigo kurta set is hand block printed in Jaipur with natural dye, and it softens with every wash. Sizes M and L. ₹2,899, free shipping. DM “INDIGO” to book yours.</p></div><div class="btns"><button class="btn ink sm" data-act="copy" data-from="#cap-txt">${ic('content_copy')}Copy post</button></div>`;
  return `<p class="t-soft">In this design preview Stoora answers three sample questions. Connected to your shop, it answers anything about your orders, money and buyers from your real numbers.</p><div class="sugg" style="flex-wrap:wrap">${['How did I do this week?', 'Which orders should I ship first?', 'Write a post for my indigo kurta set'].map((x) => `<button data-act="ask" data-q="${x}">${x}</button>`).join('')}</div>`;
}
function askPanelHTML(sheetMode) {
  const log = S.askLog;
  return `<div class="askpanel">
  <div class="sheet-h" style="${sheetMode ? '' : 'padding:var(--s3)'};border-bottom:1px solid var(--line-soft)"><span class="smark" aria-hidden="true">S</span><div class="grow"><h2 class="ct" id="ask-t">Ask Stoora</h2><p class="cap">Plain answers from your shop’s numbers</p></div>${log.length ? `<button class="btn quiet sm" data-act="ask-clear">New chat</button>` : ''}${sheetBtnClose}</div>
  <div class="sheet-b" id="ask-log" style="padding-top:var(--s3);display:grid;gap:var(--s3);align-content:start" aria-live="polite">
   ${
     log.length
       ? log
           .map(
             (m) =>
               `<div class="ans"><div class="qbubble">${esc(m.q)}</div><div class="abox"><div class="who"><span class="smark xs" aria-hidden="true">S</span>Stoora</div>${m.a || '<span class="typing" aria-label="Stoora is writing"><i></i><i></i><i></i></span>'}</div></div>`,
           )
           .join('')
       : `<div class="stack tight">${ART('chat', 80)}<p class="t-soft" style="text-align:center">Ask about sales, orders, buyers or money. You get two lines, a chart and one idea.</p></div><div class="stack tight">${['How did I do this week?', 'Which orders should I ship first?', 'Write a post for my indigo kurta set'].map((q) => `<button class="trow" data-act="ask" data-q="${q}"><span class="grow t-soft">${q}</span>${ic('arrow_forward', 'sm t-cap')}</button>`).join('')}</div>`
   }
  </div>
  <form class="askbox" data-form="ask" style="margin:var(--s2) var(--s3) calc(var(--s3) + ${sheetMode ? 'env(safe-area-inset-bottom,0px)' : '0px'});flex:none"><label class="sr" for="ask-q">Ask Stoora</label><textarea id="ask-q" rows="1" placeholder="Ask anything about your shop"></textarea><div class="tools"><span class="cap grow">Nothing changes until you tap a button</span><button class="go" type="submit" aria-label="Ask">${ic('arrow_upward', 'sm')}</button></div></form></div>`;
}
function renderAsk() {
  if (document.body.classList.contains('docked') && innerWidth >= 1280) {
    renderDock();
    return;
  }
  const sh = $('#ask-sheet');
  if (sh) {
    sh.innerHTML = askPanelHTML(true);
    const l = $('#ask-log');
    l && (l.scrollTop = l.scrollHeight);
  }
}
function renderDock() {
  const d = $('#askdock');
  if (!document.body.classList.contains('docked')) {
    d.innerHTML = '';
    return;
  }
  d.innerHTML = askPanelHTML(false);
  const l = $('#ask-log');
  l && (l.scrollTop = l.scrollHeight);
}
function openAsk(q) {
  if (innerWidth >= 1280) {
    document.body.classList.add('docked');
    ui.askOpen = true;
    renderDock();
    setTimeout(() => $('#ask-q')?.focus(), 40);
  } else
    setLayer(
      `<div class="scrim" data-act="close"></div><div class="sheet full" role="dialog" aria-modal="true" aria-labelledby="ask-t" id="ask-sheet" style="${innerWidth >= 760 ? '' : 'top:0'}">${askPanelHTML(true)}</div>`,
      '#ask-q',
    );
  if (q) ask(q);
}
function ask(q) {
  q = q.trim();
  if (!q) return;
  const m = { q, a: null };
  S.askLog.push(m);
  renderAsk();
  setTimeout(() => {
    m.a = answer(q);
    renderAsk();
  }, 750);
}

/* ---------- save bar ---------- */
function syncSave() {
  const z = $('#savez');
  const show = ui.dirty && /^(add-product|add-service|product-|shop-settings-general)/.test(route);
  z.innerHTML = show
    ? `<div class="savebar" role="region" aria-label="Unsaved changes"><span class="msg">${ic('edit_note', 'sm')}<span>Unsaved changes</span></span><button class="btn line sm" data-act="discard">Discard</button><button class="btn save sm" data-act="save">Save</button></div>`
    : '';
}
function markDirty() {
  if (!ui.dirty) {
    ui.dirty = true;
    syncSave();
  }
}

/* ---------- saves ---------- */
const toNum = (s) => +String(s).replace(/[^\d.]/g, '') || 0;
function save() {
  const f = ui.form;
  if (route === 'shop-settings-general') {
    f.errors = {};
    if (!f.name.trim()) f.errors.name = 1;
    if (Object.keys(f.errors).length) {
      render(false);
      syncSave();
      toast('Your shop needs a name to save', null, 'error');
      return;
    }
    Object.assign(S.shop, {
      name: f.name.trim(),
      handle: f.handle.trim() || S.shop.handle,
      email: f.email,
      phone: f.phone,
    });
    ui.dirty = false;
    ui.form = {};
    syncSave();
    render(false);
    toast('Saved');
    return;
  }
  if (route === 'add-service') {
    f.errors = {};
    if (!f.name.trim()) f.errors.name = 1;
    if (!toNum(f.price)) f.errors.price = 1;
    if (Object.keys(f.errors).length) {
      render(false);
      syncSave();
      toast('Add a name and price to save', null, 'error');
      return;
    }
    S.services.push({
      id: 'v' + (S.services.length + 1),
      name: f.name.trim(),
      type: f.type,
      price: toNum(f.price),
      mins: +f.mins,
      next: f.type === 'Digital' ? 'Instant download' : `${f.days.join(', ')} · ${f.time}`,
      icon: f.type === 'Class' ? 'self_improvement' : f.type === 'Digital' ? 'menu_book' : 'person',
    });
    ui.dirty = false;
    ui.form = {};
    syncSave();
    location.hash = 'services';
    toast('Service added');
    return;
  }
  f.errors = {};
  if (!f.name.trim()) f.errors.name = 1;
  if (!toNum(f.price)) f.errors.price = 1;
  if (Object.keys(f.errors).length) {
    render(false);
    syncSave();
    toast('Add a name and price to save', null, 'error');
    return;
  }
  const data = { name: f.name.trim(), price: toNum(f.price), stock: toNum(f.stock), status: f.status };
  if (f.pid === 'new') S.products.unshift({ id: 'p' + (Date.now() % 100000), icon: 'apparel', sold: 0, ...data });
  else
    Object.assign(
      S.products.find((p) => p.id === f.pid),
      data,
    );
  ui.dirty = false;
  ui.form = {};
  syncSave();
  location.hash = 'products';
  toast(f.pid === 'new' ? 'Product added' : 'Product saved');
}

function createOrder() {
  const d = ui.draft;
  d.errors = {};
  if (!d.who.trim()) d.errors.who = 1;
  if (!d.items.length) d.errors.items = 1;
  if (Object.keys(d.errors).length) {
    render(false);
    $(d.errors.who ? '#co-who' : '[data-act="picker"]')?.focus();
    return;
  }
  const id = S.nextOrder++;
  const total = d.items.reduce((a, [p, q]) => a + prod(p).price * q, 0);
  S.orders.unshift({
    id,
    who: d.who.trim(),
    phone: d.phone,
    items: d.items.map((x) => [...x]),
    total,
    paid: d.pay === 'paid',
    pay: d.pay === 'cod' ? 'cod' : 'upi',
    shipped: false,
    src: d.src || 'WhatsApp',
    when: 'Just now',
    city: 'Jaipur',
  });
  d.items.forEach(([p, q]) => {
    const x = S.products.find((y) => y.id === p);
    if (x) x.stock = Math.max(0, x.stock - q);
  });
  const msg =
    d.pay === 'upi' ? `Order #${id} created. UPI link sent to ${d.who.trim().split(' ')[0]}` : `Order #${id} created`;
  ui.draft = { who: '', phone: '', items: [], pay: 'paid', errors: {} };
  ui.dirty = false;
  location.hash = 'order-' + id;
  toast(msg);
}

/* ================= events ================= */
document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-go]');
  const a = e.target.closest('[data-act]');
  if (a && (!g || g.contains(a))) {
    act(a.dataset.act, a, e);
    return;
  }
  if (g) {
    e.preventDefault();
    const ov = g.dataset.ov;
    closeOv(true);
    go(g.dataset.go, ov);
    return;
  }
  const link = e.target.closest('a[href^="#"]');
  if (link) {
    if (link.dataset.filter) ui.orderFilter = link.dataset.filter;
    if (link.getAttribute('href') === '#orders' && !link.dataset.filter && link.closest('.side,.bbar,.drawer'))
      ui.orderFilter = 'All';
    if ($('#layer').innerHTML) {
      closeOv(true);
    }
    if (link.getAttribute('href').slice(1) === route) {
      e.preventDefault();
      render(false);
    }
  }
});
function act(k, el, e) {
  const d = el.dataset;
  const id = d.id;
  switch (k) {
    case 'menu':
      return openMenu();
    case 'search':
      closeOv(true);
      return openSearch();
    case 'alerts':
      return openAlerts();
    case 'ask':
      closeOv(true);
      return d.q && (document.body.classList.contains('docked') || $('#ask-sheet')) ? ask(d.q) : openAsk(d.q);
    case 'close':
      if (el.closest('.askdock')) {
        document.body.classList.remove('docked');
        ui.askOpen = false;
        return renderDock();
      }
      return closeOv();
    case 'ask-clear':
      S.askLog = [];
      return renderAsk();
    case 'ask-idea':
      return toast('Stoora will remind you on Thursday morning');
    case 'undo': {
      const u = window._undo;
      window._undo = null;
      $('#toastz').innerHTML = '';
      u && u();
      return;
    }
    case 'idea-yes':
    case 'idea-no': {
      const i = S.ideas.find((x) => x.id === id);
      const card = $('#idea-' + id);
      card && card.classList.add('out');
      setTimeout(
        () => {
          S.ideasGone.push(id);
          render(false);
          toast(k === 'idea-yes' ? i.done : 'Hidden until tomorrow', () => {
            S.ideasGone = S.ideasGone.filter((x) => x !== id);
            render(false);
          });
        },
        matchMedia('(prefers-reduced-motion:reduce)').matches ? 0 : 260,
      );
      return;
    }
    case 'setup-hide':
      S.setupHidden[d.k] = 1;
      render(false);
      return toast('Step hidden', () => {
        delete S.setupHidden[d.k];
        render(false);
      });
    case 'setup-unhide':
      S.setupHidden = {};
      return render(false);
    case 'setup-do': {
      const s = SETUP.find((x) => x.k === d.k);
      if (s.go) {
        return go(s.go);
      }
      if (d.k === 'link') {
        copy('https://stoora.in/' + S.shop.handle);
      }
      S.setupDone[d.k] = true;
      render(false);
      if (d.k !== 'link') toast('Done');
      return;
    }
    case 'leave-newshop':
      S.newShop = false;
      S.leftSetup = true;
      return go('home');
    case 'ofilter':
      ui.orderFilter = d.f;
      return render(false);
    case 'mark-paid': {
      const o = ord(id);
      o.paid = true;
      render(false);
      return toast(`Order #${o.id} marked as paid`, () => {
        o.paid = false;
        render(false);
      });
    }
    case 'remind':
      return toast(`UPI reminder sent to ${d.who.split(' ')[0]}`, null, 'send');
    case 'copy':
      return copy(d.from ? $(d.from).textContent : d.text);
    case 'ship':
      return openShip(id);
    case 'ship-confirm': {
      const o = ord(id);
      const c = $('#shp-c').value,
        t = $('#shp-t').value.trim();
      o.shipped = true;
      o.courier = c.startsWith('I will') ? null : c;
      o.track = t;
      closeOv(true);
      render(false);
      return toast(`Order #${o.id} marked as shipped`, () => {
        o.shipped = false;
        render(false);
      });
    }
    case 'toggle':
    case 'demo-sw':
      return el.setAttribute('aria-checked', el.getAttribute('aria-checked') !== 'true');
    case 'picker':
      return openPicker();
    case 'pick': {
      const p = S.products.find((x) => x.id === id);
      ui.pick[id] = Math.max(0, Math.min(p.stock, (ui.pick[id] || 0) + +d.d));
      if (!ui.pick[id]) delete ui.pick[id];
      $('#pkr-l').innerHTML = pickerBody($('#pkr-q')?.value || '');
      $('#pkr-f').innerHTML = pickerFoot();
      return;
    }
    case 'pick-done':
      ui.draft.items = Object.entries(ui.pick);
      ui.draft.errors.items = 0;
      ui.dirty = true;
      closeOv(true);
      return render(false);
    case 'co-qty': {
      const it = ui.draft.items.find((x) => x[0] === id);
      it[1] += +d.d;
      if (it[1] <= 0) ui.draft.items = ui.draft.items.filter((x) => x !== it);
      return render(false);
    }
    case 'co-pay':
      ui.draft.pay = d.v;
      return render(false);
    case 'co-src':
      ui.draft.src = d.v;
      return render(false);
    case 'book-paid': {
      const b = S.bookings.find((x) => x.id === id);
      b.paid = true;
      render(false);
      return toast(`Booking ${b.id} marked as paid`, () => {
        b.paid = false;
        render(false);
      });
    }
    case 'book-done': {
      const b = S.bookings.find((x) => x.id === id);
      b.status = 'Done';
      render(false);
      return toast('Marked as done', () => {
        b.status = 'Upcoming';
        render(false);
      });
    }
    case 'pf-sw':
      ui.form[d.k] = !ui.form[d.k];
      el.setAttribute('aria-checked', ui.form[d.k]);
      return markDirty();
    case 'pf-ch':
      ui.form.ch[d.k] = !ui.form.ch[d.k];
      el.setAttribute('aria-checked', ui.form.ch[d.k]);
      return markDirty();
    case 'pf-more':
      ui.form.more = !ui.form.more;
      return render(false);
    case 'pf-size': {
      const s = ui.form.sizes;
      ui.form.sizes = s.includes(d.v) ? s.filter((x) => x !== d.v) : [...s, d.v];
      markDirty();
      return render(false);
    }
    case 'pf-delete': {
      const i = S.products.findIndex((p) => p.id === id);
      const [p] = S.products.splice(i, 1);
      ui.dirty = false;
      ui.form = {};
      syncSave();
      location.hash = 'products';
      return toast(`Deleted ${p.name}`, () => {
        S.products.splice(i, 0, p);
        render(false);
      });
    }
    case 'sv-type':
      ui.form.type = d.v;
      markDirty();
      return render(false);
    case 'sv-day': {
      const s = ui.form.days;
      ui.form.days = s.includes(d.v) ? s.filter((x) => x !== d.v) : [...s, d.v];
      markDirty();
      return render(false);
    }
    case 'save':
      return save();
    case 'discard':
      ui.dirty = false;
      ui.form = {};
      syncSave();
      return render(false);
    case 'discard-leave': {
      ui.dirty = false;
      ui.form = {};
      ui.draft = { who: '', phone: '', items: [], pay: 'paid', errors: {} };
      syncSave();
      const cb = ui._discard;
      closeOv(true);
      cb && cb();
      return;
    }
    case 'chat-tab':
      ui.chatTab = d.v;
      if (route !== 'chats') {
        location.hash = 'chats';
        return;
      }
      return render(false);
    case 'edit-draft':
      ui.editing[id] = true;
      render(false);
      return setTimeout(() => $('#dr-' + id)?.focus(), 30);
    case 'drop-draft': {
      const c = S.chats.find((x) => x.id === id);
      const was = c.draft;
      c.draft = null;
      render(false);
      return toast('Reply dismissed', () => {
        c.draft = was;
        render(false);
      });
    }
    case 'send-draft': {
      const c = S.chats.find((x) => x.id === id);
      sendMsg(c, c.draft);
      c.draft = null;
      ui.editing[id] = false;
      render(false);
      return toast(`Sent to ${c.who.split(' ')[0]} on ${c.src}`, null, 'send');
    }
    case 'send-upi': {
      const c = S.chats.find((x) => x.id === id);
      sendMsg(c, `Here is your UPI link to pay ${S.shop.name}: stoora.in/pay/${c.id}x`);
      render(false);
      return toast('UPI link sent', null, 'send');
    }
    case 'chat-order': {
      const c = S.chats.find((x) => x.id === id);
      ui.draft = { who: c.who, phone: '', items: id === 'c1' ? [['p3', 1]] : [], pay: 'upi', src: c.src, errors: {} };
      ui.dirty = true;
      return go('create-order');
    }
    case 'chat-book': {
      const c = S.chats.find((x) => x.id === id);
      sendMsg(c, 'Pick a time that suits you: stoora.in/meera/book');
      render(false);
      return toast('Booking link sent', null, 'send');
    }
    case 'mrange':
      ui.moneyRange = d.v;
      return render(true);
    case 'arange':
      ui.anRange = d.v;
      return render(true);
    case 'shop-sw':
      S.shop[d.k] = !S.shop[d.k];
      render(false);
      return toast(S.shop[d.k] ? 'Turned on' : 'Turned off');
    case 'theme':
      ui.theme = d.v;
      return render(false);
    case 'new-offer':
      return openOffer();
    case 'offer-type': {
      ui.offer.type = d.v;
      el.parentNode.querySelectorAll('button').forEach((b) => {
        const on = b === el;
        b.classList.toggle('on', on);
        b.setAttribute('aria-checked', on);
      });
      $('#of-al').textContent = d.v === 'pct' ? 'How much off, in %' : 'How much off, in ₹';
      return;
    }
    case 'offer-save': {
      const code = $('#of-code').value.trim().toUpperCase(),
        amt = toNum($('#of-amt').value);
      if (!code || !amt) {
        $('#of-err').hidden = false;
        return;
      }
      const end = new Date($('#of-end').value);
      S.offers.unshift({
        code,
        what:
          (ui.offer.type === 'pct' ? amt + '% off ' : rs(amt) + ' off ') +
          ($('#of-on').value === 'Everything' ? 'everything' : $('#of-on').value.toLowerCase()),
        used: 0,
        ends: isNaN(end)
          ? 'No end date'
          : 'Ends ' + end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        on: true,
      });
      closeOv(true);
      render(false);
      return toast(`Offer ${code} is live`);
    }
    case 'offer-sw': {
      const o = S.offers[+d.i];
      o.on = !o.on;
      render(false);
      return toast(`${o.code} turned ${o.on ? 'on' : 'off'}`);
    }
  }
}
function sendMsg(c, t) {
  c.msgs.push(['me', t, 'Now']);
  c.unread = false;
  c.last = t;
}
function copy(t) {
  const ok = () => toast('Copied', null, 'content_copy');
  try {
    navigator.clipboard.writeText(t).then(ok, () => fallbackCopy(t, ok));
  } catch (_) {
    fallbackCopy(t, ok);
  }
}
function fallbackCopy(t, ok) {
  const x = document.createElement('textarea');
  x.value = t;
  x.style.position = 'fixed';
  x.style.opacity = '0';
  document.body.appendChild(x);
  x.select();
  let r = false;
  try {
    r = document.execCommand('copy');
  } catch (_) {}
  x.remove();
  r ? ok() : toast('Select the text and copy it', null, 'info');
}

document.addEventListener('input', (e) => {
  const t = e.target,
    d = t.dataset;
  if (d.input === 'orderQ') {
    ui.orderQ = t.value;
    const q = t.value.trim().toLowerCase();
    $('#olist').innerHTML = ordersList(
      S.orders
        .filter(OF[ui.orderFilter])
        .filter((o) => !q || (o.who + ' #' + o.id + ' ' + o.src).toLowerCase().includes(q)),
    );
    return;
  }
  if (d.input === 'prodQ') {
    ui.prodQ = t.value;
    const q = t.value.trim().toLowerCase();
    $('#plist').innerHTML = productsList(S.products.filter((p) => !q || p.name.toLowerCase().includes(q)));
    return;
  }
  if (d.input === 'setQ') {
    ui.setQ = t.value;
    const q = t.value.trim().toLowerCase();
    const rows = SET.filter(([l]) => !q || l.toLowerCase().includes(q));
    $('#setlist').innerHTML =
      `<nav class="setlist" aria-label="Settings">${rows.map(([l, i]) => `<a class="set-row" href="#shop-settings-${slug(l)}">${ic(i)}<span>${l}</span>${ic('chevron_right', 'sm')}</a>`).join('') || `<p class="cap" style="padding:var(--s3)">No setting called “${esc(t.value)}”. Try “payments” or “shipping”.</p>`}</nav>`;
    return;
  }
  if (d.input === 'search') {
    $('#sres').innerHTML = searchResults(t.value);
    return;
  }
  if (d.input === 'pick') {
    $('#pkr-l').innerHTML = pickerBody(t.value);
    return;
  }
  if (d.draft) {
    ui.draft[d.draft] = t.value;
    ui.dirty = !!(ui.draft.who || ui.draft.items.length);
    if (ui.draft.errors[d.draft] && t.value.trim()) {
      ui.draft.errors[d.draft] = 0;
      t.classList.remove('bad');
      t.removeAttribute('aria-invalid');
      t.parentNode.querySelector('.err')?.remove();
    }
    return;
  }
  if (d.pf) {
    ui.form[d.pf] = t.value;
    markDirty();
    if (ui.form.errors && ui.form.errors[d.pf] && t.value.trim()) {
      ui.form.errors[d.pf] = 0;
      (t.closest('.affix') || t).classList.remove('bad');
      t.closest('.field').querySelector('.err')?.remove();
    }
    return;
  }
  if (d.draftmsg) {
    const c = S.chats.find((x) => x.id === d.draftmsg);
    c.draft = t.value;
    return;
  }
  if (t.closest('.askbox')) {
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 160) + 'px';
  }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.pf && t.tagName === 'SELECT') {
    ui.form[t.dataset.pf] = t.value;
    markDirty();
    if (t.dataset.pf === 'status') render(false), syncSave();
  }
  if (t.id === 'pf-photos') addPhotos(t.files);
});
document.addEventListener('submit', (e) => {
  const f = e.target;
  if (!f.dataset.form) return;
  e.preventDefault();
  const k = f.dataset.form;
  if (k === 'ask' || k === 'home-ask') {
    const ta = f.querySelector('textarea');
    const q = ta.value;
    ta.value = '';
    if (!q.trim()) {
      ta.focus();
      return;
    }
    if (k === 'home-ask') openAsk(q);
    else ask(q);
    return;
  }
  if (k === 'chat') {
    const c = S.chats.find((x) => x.id === f.dataset.id);
    const v = f.querySelector('input').value.trim();
    if (!v) return;
    sendMsg(c, v);
    render(false);
    $('#msg-' + c.id)?.focus();
    return;
  }
  if (k === 'create') return createOrder();
  if (k === 'product' || k === 'service' || k === 'general') return save();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('.askbox textarea') && !e.shiftKey) {
    e.preventDefault();
    e.target.form.requestSubmit();
    return;
  }
  if (e.key === 'Enter' && e.target.matches('tr[data-go]')) {
    go(e.target.dataset.go);
    return;
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    closeOv(true);
    openSearch();
    return;
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
    e.preventDefault();
    closeOv(true);
    openAsk();
    return;
  }
  if (e.key === 'Escape') {
    if ($('#layer').innerHTML) closeOv();
    else if (document.body.classList.contains('docked')) {
      document.body.classList.remove('docked');
      renderDock();
    }
  }
  if (e.key === 'Tab' && $('#layer').innerHTML) {
    const box = $('#layer [role="dialog"]');
    if (!box) return;
    const f = [...box.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex="0"]')].filter(
      (x) => x.offsetParent !== null,
    );
    if (!f.length) return;
    const first = f[0],
      last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
function addPhotos(files) {
  [...files].slice(0, 6).forEach((f) => {
    if (!f.type.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = () => {
      ui.form.photos.push(r.result);
      markDirty();
      render(false);
    };
    r.readAsDataURL(f);
  });
}
function bindDrop() {
  const z = $('#drop');
  if (!z) return;
  ['dragenter', 'dragover'].forEach((n) =>
    z.addEventListener(n, (e) => {
      e.preventDefault();
      z.classList.add('over');
    }),
  );
  ['dragleave', 'drop'].forEach((n) =>
    z.addEventListener(n, (e) => {
      e.preventDefault();
      z.classList.remove('over');
    }),
  );
  z.addEventListener('drop', (e) => addPhotos(e.dataTransfer.files));
}
let lastW = innerWidth;
addEventListener('resize', () => {
  const w = innerWidth;
  if (w < 760 !== lastW < 760 && /^chat/.test(route)) render(false);
  if (w < 1280 && document.body.classList.contains('docked')) {
    document.body.classList.remove('docked');
    renderDock();
  }
  lastW = w;
});

/* ================= PUBLIC SITE · AUTH · ROUTER =================
   Flow: #about (public)  →  #login / #signup / #forgot  →  dashboard routes (need a session).
   PREVIEW AUTH: accounts live only in this browser (localStorage, SHA-256 of the password).
   In the Next.js app, swap login()/signup()/forgot() for the real auth calls; the screens stay. */

/* ---------- storage that never throws ---------- */
const store = {
  get(k, ses) {
    try {
      const v = (ses ? sessionStorage : localStorage).getItem(k);
      return v ? JSON.parse(v) : null;
    } catch (_) {
      return null;
    }
  },
  set(k, v, ses) {
    try {
      (ses ? sessionStorage : localStorage).setItem(k, JSON.stringify(v));
    } catch (_) {}
  },
  del(k) {
    try {
      localStorage.removeItem(k);
    } catch (_) {}
    try {
      sessionStorage.removeItem(k);
    } catch (_) {}
  },
};
let SESSION = null; /* the server decides who is logged in; see the boot at the end of features.js */
let ACCOUNTS = {};
store.del('stoora.session');
store.del('stoora.accounts');
async function api(method, path, body) {
  const r = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  let j = null;
  try {
    j = await r.json();
  } catch (_) {}
  if (!r.ok) {
    const e = new Error((j && j.error) || 'Something went wrong. Try again.');
    e.status = r.status;
    throw e;
  }
  return j;
}
const sessionFrom = (u) => ({
  email: u.email,
  name: u.name,
  shop: u.shop,
  handle: u.handle,
  demo: !!u.demo,
  category: u.category,
  sub: u.sub,
  city: u.city,
  bizPhone: u.bizPhone,
  onboarding: u.onboarding,
});
const DEMO = { email: 'demo@stoora.in', pw: 'meera2026' };
const TAKEN = ['meera', 'demo', 'stoora', 'admin', 'shop', 'help', 'login', 'signup'];
let AUTH_NEXT = null,
  MODE = null,
  L = { handle: '', built: false, scene: 0, timer: null, paused: false, step: 0 };
async function sha(s) {
  try {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
  } catch (_) {
    let h = 0;
    for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
    return 'x' + h;
  }
}
const cleanHandle = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
const titleCase = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const reduced = () => matchMedia('(prefers-reduced-motion:reduce)').matches;

function applySession(se) {
  S = fresh();
  ui.form = {};
  ui.dirty = false;
  ui.draft = { who: '', phone: '', items: [], pay: 'paid', errors: {} };
  S.askLog = [];
  if (se && !se.demo) {
    S.shop.name = se.shop;
    S.shop.owner = se.name.split(' ')[0];
    S.shop.handle = se.handle;
    S.shop.email = se.email;
    S.isNewAccount = true;
    S.newShop = true;
    S.setupDone = {};
  }
}
if (SESSION) applySession(SESSION);

/* ---------- shopfront: pencil + watercolour treatment of the same drawing ----------
   Same shapes, colours and positions as before. Fills are watercolour washes (filter #st-wc: soft
   displaced edges, pigment variation, darker pooled rims, paper grain); outlines are graphite pencil
   (filter #st-pencil: grain + a faint second pass). The name board text stays crisp and live. */
const WC_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
 <filter id="st-wc" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="4" result="low"/>
  <feDisplacementMap in="SourceGraphic" in2="low" scale="4" xChannelSelector="R" yChannelSelector="G" result="shape"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="4" seed="9" result="mid"/>
  <feColorMatrix in="mid" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.7 0.55" result="pig"/>
  <feComposite in="shape" in2="pig" operator="in" result="wash"/>
  <feMorphology in="shape" operator="erode" radius="1.4" result="inner"/>
  <feComposite in="shape" in2="inner" operator="out" result="rim"/>
  <feGaussianBlur in="rim" stdDeviation="0.7" result="rimb"/>
  <feColorMatrix in="rimb" type="matrix" values="0.72 0 0 0 0  0 0.72 0 0 0  0 0 0.72 0 0  0 0 0 0.5 0" result="pool"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="2" result="grain"/>
  <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.3  0 0 0 -0.9 0.42" result="g2"/>
  <feComposite in="g2" in2="shape" operator="in" result="paper"/>
  <feMerge><feMergeNode in="wash"/><feMergeNode in="pool"/><feMergeNode in="paper"/></feMerge></filter>
 <filter id="st-pencil" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="5" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="1.3" xChannelSelector="R" yChannelSelector="G" result="d"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="7" result="g"/>
  <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.5 -0.12" result="ga"/>
  <feComposite in="d" in2="ga" operator="in"/></filter>
 <filter id="st-bloom" x="-20%" y="-20%" width="140%" height="140%">
  <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="12" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="26" xChannelSelector="R" yChannelSelector="G" result="d"/>
  <feGaussianBlur in="d" stdDeviation="2.2"/></filter>
</defs></svg>`;
function SHOPF(id) {
  const LEAD = '#2A2E4D',
    CREAM = '#FFFAEF',
    MUTED = '#F2EADD';
  let sd = 11;
  const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647 - 0.5;
  const f = (n) => n.toFixed(1);
  const F = [],
    Pn = [],
    G = [];
  const wc = (el) => F.push(el.replace(/^<(\w+)/, '<$1 filter="url(#st-wc)"'));
  const ln = (a, b, c, d, w = 1.5) => {
    const mk = (j) =>
      `M${f(a + R() * j)} ${f(b + R() * j)} Q${f((a + c) / 2 + R() * 2.6 * j)} ${f((b + d) / 2 + R() * 2.6 * j)} ${f(c + R() * j)} ${f(d + R() * j)}`;
    Pn.push(`<path d="${mk(1.3)}" stroke-width="${w}" pathLength="1"/>`);
    Pn.push(
      `<path class="p2" d="${mk(2.4)}" stroke-width="${(w * 0.5).toFixed(2)}" stroke-opacity=".38" pathLength="1"/>`,
    );
  };
  const out = (el, w = 1.3) =>
    Pn.push(el.replace(/fill="[^"]*"/, '').replace(/^<(\w+)/, `<$1 stroke-width="${w}" pathLength="1"`));
  const box = (x, y, w, h, fill, sw = 1.5) => {
    wc(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`);
    ln(x - 1.5, y, x + w + 1.5, y, sw);
    ln(x + w, y - 1.5, x + w, y + h + 1.5, sw);
    ln(x + w + 1.5, y + h, x - 1.5, y + h, sw);
    ln(x, y + h + 1.5, x, y - 1.5, sw);
  };
  const kurta = (cx, t, c) => {
    const d = `M${cx - 13} ${t + 8} L${cx - 6} ${t} L${cx + 6} ${t} L${cx + 13} ${t + 8} L${cx + 20} ${t + 18} L${cx + 13} ${t + 23} L${cx + 13} ${t + 56} L${cx - 13} ${t + 56} L${cx - 13} ${t + 23} L${cx - 20} ${t + 18} Z`;
    wc(`<path d="${d}" fill="${c}"/>`);
    out(`<path d="${d}" fill="none"/>`, 1.3);
    ln(cx, t + 2, cx, t + 26, 1);
    G.push(
      `<path d="M${cx + 4} ${t + 30} L${cx + 9} ${t + 52}" stroke="#FFFFFF" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>`,
    );
  };
  // soft wash behind the shop (watercolour bloom), same footprint as the ground
  F.push(
    `<path d="M70 300 C 40 230, 60 120, 150 100 C 230 80, 330 96, 352 170 C 372 240, 360 300, 300 312 C 230 326, 110 330, 70 300 Z" fill="#FFEFD5" opacity=".85" filter="url(#st-bloom)"/>`,
  );
  wc(`<ellipse cx="200" cy="320" rx="190" ry="13" fill="${MUTED}"/>`);
  box(60, 136, 280, 172, CREAM);
  wc(`<rect x="60" y="136" width="280" height="16" fill="${MUTED}" opacity=".75"/>`);
  ln(130, 62, 130, 88, 1.3);
  ln(270, 62, 270, 88, 1.3);
  wc(`<rect x="88" y="12" width="224" height="52" rx="9" fill="#171C3C"/>`);
  Pn.push(`<rect x="88" y="12" width="224" height="52" rx="9" stroke-width="1.2" pathLength="1"/>`);
  box(44, 88, 312, 22, '#DC4A3A');
  const sc = ['#F4A24A', '#EF7F3D'];
  for (let i = 0; i < 8; i++) {
    const x = 52 + i * 37;
    wc(`<path d="M${x} 110 L${x + 37} 110 L${x + 37} 136 A18.5 14 0 0 1 ${x} 136 Z" fill="${sc[i % 2]}"/>`);
    Pn.push(`<path d="M${x} 136 A18.5 14 0 0 0 ${x + 37} 136" stroke-width="1.2" pathLength="1"/>`);
  }
  ln(50, 110, 350, 110);
  ln(350, 108, 350, 137);
  ln(50, 137, 50, 108);
  box(80, 172, 140, 96, '#FFFFFF');
  G.push(
    `<path d="M92 260 L120 178 M104 262 L130 182" stroke="#EBE3DA" stroke-width="3" stroke-linecap="round" opacity=".7"/>`,
  );
  ln(86, 186, 214, 186, 1.2);
  kurta(110, 190, '#EF7F3D');
  kurta(150, 190, '#5F3BA8');
  kurta(190, 190, '#D13A5B');
  box(74, 268, 152, 8, '#F4A24A', 1.3);
  box(244, 172, 76, 136, '#5F3BA8');
  wc(`<rect x="244" y="172" width="12" height="136" fill="#262A7A" opacity=".35"/>`);
  wc(`<rect x="254" y="182" width="56" height="52" fill="${CREAM}"/>`);
  out(`<rect x="254" y="182" width="56" height="52"/>`, 1.2);
  wc(`<rect x="262" y="199" width="40" height="18" rx="4" fill="#FFE9B0"/>`);
  out(`<rect x="262" y="199" width="40" height="18" rx="4"/>`, 1);
  wc(`<circle cx="307" cy="254" r="4" fill="#FFB407"/>`);
  out(`<circle cx="307" cy="254" r="4"/>`, 1.1);
  box(236, 308, 92, 7, '#F4A24A', 1.2);
  Pn.push(`<path d="M56 140 Q200 184 344 140" stroke-width="1.1" pathLength="1"/>`);
  let tor = '';
  for (let i = 0; i <= 16; i++) {
    const t = i / 16,
      x = (1 - t) * (1 - t) * 56 + 2 * (1 - t) * t * 200 + t * t * 344,
      y = (1 - t) * (1 - t) * 140 + 2 * (1 - t) * t * 162 + t * t * 140;
    tor += `<circle cx="${f(x)}" cy="${f(y)}" r="5.2" fill="${i % 2 ? '#EF7F3D' : '#FFB407'}"/>`;
    Pn.push(`<circle cx="${f(x)}" cy="${f(y)}" r="5.2" stroke-width=".9"/>`);
  }
  F.push(`<g filter="url(#st-wc)">${tor}</g>`);
  const pot = (d, c) => {
    wc(`<path d="${d}" fill="${c}"/>`);
    out(`<path d="${d}"/>`, 1.4);
  };
  pot('M30 284 L60 284 L56 310 L34 310 Z', '#DC4A3A');
  pot('M342 284 L372 284 L368 310 L346 310 Z', '#8B3A9E');
  let fl = '';
  [
    [38, 272, '#FFB407', '#EF7F3D'],
    [47, 264, '#FFB407', '#EF7F3D'],
    [55, 274, '#FFB407', '#EF7F3D'],
    [45, 279, '#FFB407', '#EF7F3D'],
    [350, 272, '#EF7F3D', '#FFB407'],
    [359, 264, '#EF7F3D', '#FFB407'],
    [366, 274, '#EF7F3D', '#FFB407'],
  ].forEach(([x, y, a, b]) => {
    fl += `<circle cx="${x}" cy="${y}" r="6.5" fill="${a}"/><circle cx="${x}" cy="${y}" r="1.8" fill="${b}"/>`;
    Pn.push(`<circle cx="${x}" cy="${y}" r="6.5" stroke-width="1"/>`);
  });
  F.push(`<g filter="url(#st-wc)">${fl}</g>`);
  return `<svg class="paint" viewBox="0 0 400 340" role="img" aria-label="A hand-drawn shopfront with a name board">
  <g class="wash">${F.join('')}</g><g class="light">${G.join('')}</g>
  <g class="pencil" fill="none" stroke="${LEAD}" stroke-linecap="round" stroke-linejoin="round" filter="url(#st-pencil)">${Pn.join('')}</g>
  <rect x="92" y="16" width="216" height="44" rx="6" fill="none" stroke="${CREAM}" stroke-opacity=".4"/>
  <text x="200" y="33" text-anchor="middle" font-size="11" font-family="Lexend,sans-serif" font-weight="600" letter-spacing="1.2" fill="#FFB407">STOORA.IN/</text>
  <text id="${id}" x="200" y="54" text-anchor="middle" font-size="20" font-family="Bricolage Grotesque,sans-serif" font-weight="800" fill="#FFFFFF">your shop</text>
  <text x="282" y="212" text-anchor="middle" font-size="10" font-family="Lexend,sans-serif" font-weight="700" fill="#171C3C">UPI</text>
 </svg>`;
}
function setBoards(h) {
  const t = h || 'your shop';
  const fs = Math.max(10, Math.min(20, 190 / (t.length * 0.6)));
  document.querySelectorAll('svg.paint text[id^="board"]').forEach((el) => {
    el.textContent = t;
    el.setAttribute('font-size', fs.toFixed(1));
  });
}

/* ---------- hero phone (illustrative) ---------- */
const SCENES = ['A buyer asks', 'Reply drafted', 'Paid by UPI', 'Money in'];
function waHead(name, sub, who) {
  return `<div class="wa-h"><span class="wa-b">${ic('arrow_back', 'sm')}</span>${who ? av(who) : '<span class="smark" style="width:30px;height:30px;font-size:13px">S</span>'}<div class="wa-n"><b>${name}</b><small>${sub}</small></div><span class="wa-i">${ic('call', 'sm')}${ic('more_vert', 'sm')}</span></div>`;
}
const waIn = `<div class="wa-in"><span class="wa-f">${ic('add', 'sm')}</span><span class="wa-t">Message</span><span class="wa-f">${ic('mic', 'sm')}</span></div>`;
const waTk = '<i class="tk">' + '</i>';
function waMsg(t, time, me) {
  return `<div class="wa-m ${me ? 'me' : 'them'}">${t}<span class="tm">${time}${me ? ic('done_all', 'xs') : ''}</span></div>`;
}
function heroPhone() {
  return `<div class="dev" aria-hidden="true"><div class="scr"><span class="notch"></span>
 <div class="stat"><b>10:42</b><span>${ic('signal_cellular_alt', 'xs')}${ic('wifi', 'xs')}${ic('battery_full', 'xs')}</span></div>
 <div class="scene wa on">${waHead('Priya Sharma', 'online', 'Priya Sharma')}<div class="wa-b2"><span class="wa-day">Today</span>${waMsg('Hi di, indigo kurta set M size mein hai kya?', '10:41')}${waMsg('Pune delivery ho jayegi?', '10:41')}<div class="wa-tag">${src('Instagram')}${bdg('ok', 'shopping_bag', 'Ready to buy')}</div></div>${waIn}</div>
 <div class="scene wa">${waHead('Priya Sharma', 'online', 'Priya Sharma')}<div class="wa-b2">${waMsg('Hi di, indigo kurta set M size mein hai kya? Pune delivery ho jayegi?', '10:41')}<div class="wa-draft"><span class="dh"><span class="smark xs" style="width:16px;height:16px;font-size:9px">S</span>Stoora drafted a reply</span>Yes, M is in stock (3 left). ₹2,899, delivery to Pune in 3–4 days. Shall I send a UPI link?<span class="sbtn">${ic('send', 'xs')}Send</span></div></div>${waIn}</div>
 <div class="scene wa">${waHead('Priya Sharma', 'online', 'Priya Sharma')}<div class="wa-b2">${waMsg('Shall I send a UPI link?', '10:43', 1)}${waMsg('Haan please, send kar do', '10:44')}${waMsg('Paid ✔ ₹2,899', '10:45')}<div class="wa-card">${ic('check_circle', 'sm')}<div><b>#1013 · ₹2,899 paid by UPI</b><small>Indigo kurta set · M · Pune</small></div></div></div>${waIn}</div>
 <div class="scene wa">${waHead('Stoora', 'Money', '')}<div class="wa-b2"><div class="mini"><span>Received today</span><span class="bignum">₹4,398</span><span style="color:var(--positive-deep)">+₹2,899 from Priya, by UPI</span></div><div class="mini"><span>Next payout</span><b>₹8,120 to your bank · Tue</b></div></div></div>
 </div></div>`;
}
const SLIDE_MS = 2000;
function setScene(n, announce) {
  const prev = L.scene;
  L.scene = n;
  L.elapsed = 0;
  L.start = performance.now();
  document.querySelectorAll('.hero .scene').forEach((s, i) => {
    s.classList.toggle('on', i === n);
    s.classList.toggle('out', i === prev && i !== n);
  });
  document.querySelectorAll('.hero .dots button[data-i]').forEach((b, i) => {
    const on = i === n;
    b.classList.toggle('on', on);
    on ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current');
    if (on) {
      b.classList.remove('on');
      void b.offsetWidth;
      b.classList.add('on');
    }
  });
  document
    .querySelectorAll('.hero .float')
    .forEach((x, i) => x.classList.toggle('lit', (n <= 1 && i === 0) || (n >= 2 && i === 1)));
  if (announce) {
    const l = $('#scene-live');
    if (l) l.textContent = `Slide ${n + 1} of 4: ${SCENES[n]}`;
  }
}
function heroPaused() {
  // The slideshow simply keeps moving. It only rests for people who ask for less motion, or while the tab is hidden.
  return reduced() || !L.visible || document.hidden || MODE !== 'public';
}
function cycle() {
  clearTimeout(L.timer);
  L.timer = null;
  const st = $('#stage');
  if (!st) return;
  const p = heroPaused();
  st.classList.toggle('paused', p);
  if (p) {
    if (L.start) {
      L.elapsed += performance.now() - L.start;
      L.start = 0;
    }
    return;
  }
  L.start = performance.now();
  const wait = Math.max(400, SLIDE_MS - (L.elapsed || 0));
  L.timer = setTimeout(() => {
    setScene((L.scene + 1) % SCENES.length);
    cycle();
  }, wait);
}
function toggleAuto(btn) {
  L.stopped = !L.stopped;
  btn.setAttribute('aria-label', L.stopped ? 'Play slideshow' : 'Pause slideshow');
  btn.setAttribute('aria-pressed', L.stopped);
  btn.innerHTML = ic(L.stopped ? 'play_arrow' : 'pause', 'xs');
  cycle();
}

/* ---------- storefront phone for the 4 steps ---------- */
function stepPhone() {
  return `<div class="dev" aria-hidden="true"><div class="scr"><span class="notch"></span><div class="sf" id="sf">
 <div class="shd" id="sf-hd"><span class="shop-av" id="sf-av">M</span><b id="sf-name">Meera Studio</b><small>Hand block prints and yoga</small><span class="url" id="sf-url">stoora.in/meera</span></div>
 <div class="ghost" id="sf-ghost">${ic('add', 'xs')}<br>Add your first product</div>
 <div class="gp empty" id="sf-gp">${[
   ['checkroom', 'Cotton kurta', 1499],
   ['apparel', 'Indigo kurta set', 2899],
   ['dry_cleaning', 'Silk dupatta', 2299],
   ['self_improvement', 'Morning yoga', 499],
 ]
   .map(
     ([i, n, p], k) =>
       `<div style="transition-delay:${k * 80}ms"><span class="ph2">${ic(i, 'sm')}</span><span>${n}</span><b class="num">${rs(p)}</b></div>`,
   )
   .join('')}</div>
 <div class="pay hide-o" id="sf-pay">${ic('currency_rupee', 'xs')}Pay by UPI</div>
 <div class="bio hide-o" id="sf-bio"><b>@yourshop</b><span>Hand block prints · Jaipur</span><a id="sf-bio-l">stoora.in/meera</a></div>
 </div></div></div>`;
}
function setStep(n) {
  if (n === L.step && L.stepInit) return;
  L.stepInit = 1;
  L.step = n;
  document.querySelectorAll('.step-i').forEach((s, i) => s.classList.toggle('on', i === n));
  document.querySelectorAll('.stepper .bts button').forEach((b, i) => {
    b.classList.toggle('on', i === n);
    b.setAttribute('aria-pressed', i === n);
  });
  const g = $('#sf-gp');
  if (!g) return;
  g.classList.toggle('empty', n < 1);
  $('#sf-ghost').classList.toggle('gone', n >= 1);
  $('#sf-hd').classList.toggle('warm', n >= 2);
  $('#sf-pay').classList.toggle('hide-o', n < 2);
  $('#sf-bio').classList.toggle('hide-o', n < 3);
  const st = $('#stepper-t');
  if (st) st.textContent = ['Sign up', 'Add what you sell', 'Choose a look', 'Share your link'][n];
}
/* The step follows scroll position with a 12% hysteresis band, so a small scroll back never flips it.
   Step text dims continuously with distance from the reading line instead of jumping. */
function stepScroll(vh) {
  const items = [...document.querySelectorAll('.step-i')];
  if (!items.length) return;
  const wide = innerWidth >= 980;
  const ph = $('.steps .ph');
  const top0 = wide ? 0 : ph ? ph.getBoundingClientRect().bottom : 0;
  const line = top0 + (vh - top0) * (wide ? 0.5 : 0.4);
  const tops = items.map((s) => s.getBoundingClientRect().top);
  let n = L.step || 0;
  while (n < 3 && tops[n + 1] < line - vh * 0.04) n++;
  while (n > 0 && tops[n] > line + vh * 0.08) n--;
  setStep(n);
  if (wide && !reduced())
    items.forEach((s) => {
      const r = s.getBoundingClientRect();
      const d = Math.abs((r.top + r.bottom) / 2 - vh * 0.5) / (vh * 0.6);
      s.style.opacity = (1 - Math.min(1, d) * 0.5).toFixed(3);
    });
  else items.forEach((s) => (s.style.opacity = ''));
}
function syncStepShop() {
  const h = L.handle || 'meera';
  const nm = L.handle ? titleCase(L.handle) : 'Meera Studio';
  ['#sf-url', '#sf-bio-l'].forEach((s) => {
    const e = $(s);
    if (e) e.textContent = 'stoora.in/' + h;
  });
  const n = $('#sf-name');
  if (n) n.textContent = nm;
  const a = $('#sf-av');
  if (a) a.textContent = nm[0].toUpperCase();
  const b = $('#sf-bio b');
  if (b) b.textContent = '@' + h;
}

/* ---------- chaos → order ---------- */
const MESS = [
  [
    'image',
    'Screenshot_20261026-214512.jpg',
    'GPay payment — is this Rahul?',
    '#1011 · Rahul Verma',
    '₹1,499 · paid by UPI',
    ['ok', 'check_circle', 'Paid'],
    [0.02, 0.03, -7],
  ],
  [
    'photo_camera',
    'COD hoga?',
    'Instagram DM · 2:14 am',
    'Ananya · Instagram',
    'Asked about COD · reply ready',
    ['ok', 'shopping_bag', 'Ready to buy'],
    [0.47, 0, 5],
  ],
  [
    'chat',
    'Didi size chart bhej do',
    'WhatsApp · 11:52 pm',
    'Kiran · WhatsApp',
    'Size chart sent',
    ['neutral', 'done_all', 'Replied'],
    [0.08, 0.34, 4],
  ],
  [
    'edit_note',
    'Priya 2 kurta M, GPay aaya?',
    'Notes app',
    '#1012 · Priya Sharma',
    '₹3,798 · paid by UPI',
    ['ok', 'check_circle', 'Paid'],
    [0.5, 0.3, -5],
  ],
  [
    'event',
    'Wed yoga: Sneha, Pooja unpaid',
    'Reminder · 12:00 am',
    'Morning yoga · Wed 7 am',
    '4 booked · 2 not paid',
    ['warn', 'schedule', 'Unpaid'],
    [0, 0.66, -3],
  ],
  [
    'photo_camera',
    'price pls dm',
    'Instagram comment',
    'Neha · Instagram',
    'Just looking · reply ready',
    ['neutral', 'visibility', 'Just looking'],
    [0.45, 0.64, 7],
  ],
];
const RANK = [3, 0, 4, 2, 1, 5]; // tidy order: ready to buy, unpaid, then handled items
const MROW = 66,
  MLBL = 30,
  MTOP = MLBL; // row height, label height
function messHTML() {
  return `<div class="mess rv" id="mess">
 <div class="top3"><div class="cmp" role="radiogroup" aria-label="Compare"><span class="cmp-thumb" aria-hidden="true"></span>
   <button role="radio" aria-checked="true" data-act="cmp" data-v="0" tabindex="0">Before</button><button role="radio" aria-checked="false" data-act="cmp" data-v="1" tabindex="-1">${ic('auto_awesome', 'xs')}With Stoora</button></div>
  <span class="cmp-cap" aria-hidden="true"><span class="c0">6 messages · 4 apps · nothing marked</span><span class="c1">One list · ready to buy first</span></span></div>
 <p class="sr" aria-live="polite" id="mess-live">Before Stoora: six messages spread across the gallery, DMs, WhatsApp and notes, with nothing marked.</p>
 <div class="mstage" id="mstage" aria-hidden="true">
  <span class="mlbl" id="ml-a">${ic('flag', 'xs')}Needs you · 2</span><span class="mlbl" id="ml-b">${ic('done_all', 'xs')}Handled · 4</span>
  ${MESS.map(([i, a, b, c, d, bd], k) => `<div class="mcard ${RANK[k] < 2 ? 'need' : ''}"><span class="ic">${ic(i, 'sm')}</span><div class="tx"><div class="messy"><b>${a}</b><span>${b}</span></div><div class="tidy"><b>${c}</b><span>${d}</span></div></div>${bdg(...bd)}</div>`).join('')}</div></div>`;
}
function moveCmpThumb() {
  const th = $('.cmp-thumb'),
    on = $('.cmp [aria-checked="true"]');
  if (!th || !on) return;
  th.style.width = on.offsetWidth + 'px';
  th.style.transform = `translateX(${on.offsetLeft - 4}px)`;
}
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function messGeo() {
  const st = $('#mstage');
  const W = st.clientWidth;
  const H = MESS.length * MROW + MLBL * 2;
  st.style.height = H + 'px';
  return { st, W, H };
}
function layoutMess(t) {
  const st = $('#mstage');
  if (!st) return;
  const { W, H } = messGeo();
  const cw = Math.min(300, Math.max(W * 0.6, 230));
  st.querySelectorAll('.mcard').forEach((c, i) => {
    const r = RANK[i];
    const local = Math.min(1, Math.max(0, (t - r * 0.07) / 0.6));
    const e = ease(local);
    const [x, y, rot] = MESS[i][6];
    const mx = ((x * (W - cw)) / 0.55) * 0.55,
      my = y * (H - 70) + 4;
    const ty = r * MROW + (r >= 2 ? MLBL * 2 : MLBL);
    c.style.width = (cw + (W - cw) * e).toFixed(1) + 'px';
    c.style.transform = `translate(${(mx * (1 - e)).toFixed(1)}px,${(my * (1 - e) + ty * e).toFixed(1)}px) rotate(${(rot * (1 - e)).toFixed(2)}deg)`;
    c.style.zIndex = t > 0.5 ? 20 - r : 10 + i;
    const k = Math.min(1, Math.max(0, (local - 0.35) / 0.35));
    c.querySelector('.messy').style.opacity = (1 - k).toFixed(3);
    c.querySelector('.tidy').style.opacity = k.toFixed(3);
    const b = c.querySelector('.bdg');
    const kb = Math.min(1, Math.max(0, (local - 0.7) / 0.3));
    b.style.opacity = kb.toFixed(3);
    b.style.transform = `scale(${(0.88 + 0.12 * kb).toFixed(3)})`;
    c.classList.toggle('lit', t > 0.98 && RANK[i] < 2);
  });
  const la = Math.min(1, Math.max(0, (t - 0.55) / 0.35));
  ['#ml-a', '#ml-b'].forEach((s) => {
    const el = $(s);
    el.style.opacity = la.toFixed(3);
    el.style.transform = `translateY(${((1 - la) * 6).toFixed(1)}px)`;
  });
  $('#ml-b').style.top = 2 * MROW + MLBL + 4 + 'px';
}
function setCmp(v, user) {
  if (user) L.cmpTouched = 1;
  if (L.cmp === v && L.cmpT != null) return;
  L.cmp = v;
  const m = $('#mess');
  if (!m) return;
  m.classList.toggle('with', !!v);
  m.querySelectorAll('.cmp [role=radio]').forEach((b) => {
    const on = +b.dataset.v === v;
    b.setAttribute('aria-checked', on);
    b.tabIndex = on ? 0 : -1;
  });
  moveCmpThumb();
  $('#mess-live').textContent = v
    ? 'With Stoora: one list. Ananya is ready to buy and the yoga booking is unpaid, so they come first. Four items are handled and marked.'
    : 'Before Stoora: six messages spread across the gallery, DMs, WhatsApp and notes, with nothing marked.';
  cancelAnimationFrame(L.cmpRaf);
  const from = L.cmpT ?? 0,
    to = v ? 1 : 0;
  if (reduced()) {
    L.cmpT = to;
    layoutMess(to);
    return;
  }
  const dur = v ? 1150 : 800,
    t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    L.cmpT = from + (to - from) * k;
    layoutMess(L.cmpT);
    if (k < 1) L.cmpRaf = requestAnimationFrame(step);
  };
  L.cmpRaf = requestAnimationFrame(step);
}

/* ---------- audiences ---------- */
const AUD = [
  {
    k: 'shop',
    acc: 'shop',
    photo: 'shop',
    alt: 'Garments neatly arranged on rails in a bright boutique',
    t: 'Shops that sell things',
    s: 'Clothes, crafts, home bakes',
    h: 'You make things and ship them.',
    how: 'Every order in one list — paid or not, shipped or not.',
    snip: [
      ['ok', 'check_circle', 'Paid'],
      ['warn', 'local_shipping', 'To ship'],
      ['bad', 'block', 'Sold out'],
    ],
  },
  {
    k: 'classes',
    acc: 'pay',
    photo: 'classes',
    alt: 'A tutor and a student working together at a wooden table with a laptop',
    t: 'Teachers and creators',
    s: 'Classes, sessions, downloads',
    h: 'You teach, coach or sell downloads.',
    how: 'Bookings sit next to orders, with who has paid before the class.',
    snip: [
      ['offer', 'event_upcoming', 'Wed 7:00 am'],
      ['ok', 'check_circle', 'Paid'],
      ['warn', 'schedule', 'Unpaid'],
    ],
  },
  {
    k: 'chat',
    acc: 'chat',
    photo: 'chat',
    alt: 'A shop owner smiling as she reads customer messages on her phone',
    t: 'Sellers who live on chat',
    s: 'Most sales happen in DMs',
    h: 'Your shop is your inbox.',
    how: 'Buyers ready to pay come first, with a reply drafted for you to check.',
    snip: [
      ['ok', 'shopping_bag', 'Ready to buy'],
      ['bad', 'sentiment_dissatisfied', 'Upset'],
      ['neutral', 'visibility', 'Just looking'],
    ],
  },
];
const PHOTOS = { shop: 'assets/home/shop.jpg', classes: 'assets/home/classes.jpg', chat: 'assets/home/chat.jpg' };
const PHOTOPOS = { shop: '50% 42%', classes: '50% 45%', chat: '50% 48%' };
function audBody(i) {
  const a = AUD[i];
  return `<div class="aud-body aud-photo">
 <figure class="aphoto" style="--k:1"><img src="${PHOTOS[a.photo]}" style="object-position:${PHOTOPOS[a.photo]}" alt="${a.alt}" width="1200" height="800" loading="lazy" decoding="async"><figcaption>Illustrative photo</figcaption></figure>
 <div class="atext"><span class="ey" style="--k:2">${a.t}</span><h3 class="l-h3" style="--k:3">${a.h}</h3><p class="t-soft" style="--k:4">${a.how}</p><div class="aud-snip" style="--k:5">${a.snip.map((s) => bdg(...s)).join('')}</div></div></div>`;
}
function audPanel(i) {
  return `<div class="aud-panel" data-accent="${AUD[i].acc}" role="tabpanel" id="aud-p" aria-labelledby="aud-t${i}" tabindex="0">${audBody(i)}</div>`;
}
function moveAudInd() {
  const on = $('.aud-tab[aria-selected="true"]'),
    ind = $('#aud-ind');
  if (!on || !ind) return;
  ind.style.transform = `translate(${on.offsetLeft}px,${on.offsetTop}px)`;
  ind.style.width = on.offsetWidth + 'px';
  ind.style.height = on.offsetHeight + 'px';
  ind.style.opacity = 1;
}
function selectAud(i, focus) {
  const tabs = [...document.querySelectorAll('.aud-tab')];
  if (!tabs[i]) return;
  tabs.forEach((t, j) => {
    t.setAttribute('aria-selected', j === i);
    t.tabIndex = j === i ? 0 : -1;
  });
  if (focus) tabs[i].focus();
  moveAudInd();
  const p = $('#aud-p');
  if (!p || +p.dataset.i === i) return;
  p.dataset.i = i;
  p.setAttribute('aria-labelledby', 'aud-t' + i);
  p.dataset.accent = AUD[i].acc;
  clearTimeout(L.audT);
  const old = p.querySelector('.aud-body');
  if (reduced() || !old) {
    p.innerHTML = audBody(i);
    return;
  }
  old.classList.add('leave');
  L.audT = setTimeout(() => {
    p.innerHTML = audBody(i);
    p.querySelector('.aud-body').classList.add('enter2');
  }, 140);
}

/* "Who it's for" turns to the next seller type every few seconds. It rests while the pointer or keyboard is on it,
   stops for good once anyone presses, taps or types in it (they are looking closely), and has a visible pause button. */
const AUD_MS = 5200;
function audAuto() {
  clearTimeout(L.audAuto);
  L.audAuto = null;
  const panel = $('#aud-p');
  if (
    !panel ||
    L.audStopped ||
    L.audHover ||
    L.audFocus ||
    !L.audVisible ||
    reduced() ||
    document.hidden ||
    MODE !== 'public'
  )
    return;
  L.audAuto = setTimeout(() => {
    selectAud((+panel.dataset.i + 1) % AUD.length);
    audAuto();
  }, AUD_MS);
}
function audPlayButton() {
  const b = $('#aud-pp');
  if (!b) return;
  b.setAttribute('aria-pressed', !!L.audStopped);
  b.setAttribute('aria-label', L.audStopped ? 'Play automatic change' : 'Pause automatic change');
  b.innerHTML = ic(L.audStopped ? 'play_arrow' : 'pause', 'xs');
}
function initAudAuto() {
  const box = $('.aud');
  if (!box || box.dataset.auto) return;
  box.dataset.auto = '1';
  L.audVisible = false;
  const stopForGood = () => {
    L.audStopped = true;
    audPlayButton();
    audAuto();
  };
  box.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('#aud-pp')) stopForGood();
  });
  box.addEventListener('keydown', (e) => {
    if (/^(Arrow|Home|End|Enter| )/.test(e.key) && !e.target.closest('#aud-pp')) stopForGood();
  });
  box.addEventListener('pointerenter', () => {
    L.audHover = true;
    audAuto();
  });
  box.addEventListener('pointerleave', () => {
    L.audHover = false;
    audAuto();
  });
  box.addEventListener('focusin', (e) => {
    if (e.target.matches(':focus-visible')) {
      L.audFocus = true;
      audAuto();
    }
  });
  box.addEventListener('focusout', (e) => {
    if (!box.contains(e.relatedTarget)) {
      L.audFocus = false;
      audAuto();
    }
  });
  document.addEventListener('visibilitychange', audAuto);
  if ('IntersectionObserver' in window)
    new IntersectionObserver(
      (es) => {
        L.audVisible = es[0].isIntersecting;
        audAuto();
      },
      { threshold: 0.4 },
    ).observe(box);
  else {
    L.audVisible = true;
    audAuto();
  }
  $('#aud-pp')?.addEventListener('click', () => {
    L.audStopped = !L.audStopped;
    audPlayButton();
    audAuto();
  });
  audPlayButton();
}

/* ---------- feature previews: real dashboard screens, sample shop ---------- */
function previews() {
  const keep = S;
  S = fresh();
  const tmp = document.createElement('div');
  const out = {};
  try {
    tmp.innerHTML = homeScreen().body;
    out.morning = `<div style="display:grid;grid-template-columns:1.5fr 1fr;gap:var(--s3);align-items:start">${tmp.querySelector('.morning').outerHTML}${tmp.querySelector('[aria-labelledby="today-h"]').outerHTML}</div>`;
    tmp.innerHTML = ordersScreen().body;
    tmp.querySelector('.phead').remove();
    out.orders = tmp.innerHTML;
    out.chats = `<div class="banner info" style="margin-bottom:var(--s3);align-items:center"><span class="smark xs">S</span><span><b class="t-ink">2 buyers are ready to buy.</b> Replies are drafted. Check them and send.</span></div><div class="card flush" style="display:flex;flex-direction:column">${convHTML(S.chats[0])}</div>`;
    tmp.innerHTML = moneyScreen().body;
    tmp.querySelector('.phead').remove();
    out.money = tmp.innerHTML;
    out.ask = `<div class="ans" style="max-width:640px;margin-left:auto"><div class="qbubble">How did I do this week?</div><div class="abox"><div class="who"><span class="smark xs">S</span>Stoora</div>${answer('how did i do this week')}</div></div>`;
  } finally {
    S = keep;
  }
  return out;
}
function frame(html, crumb) {
  return `<div class="frame rv"><div class="bar2"><span class="appicon" style="width:22px;height:22px;font-size:12px;border-radius:7px">S</span><span class="wordmark">stoora<i>.in</i></span><span>›</span><span>${crumb}</span></div><div class="vp"><div class="in2 force-wide" inert aria-hidden="true">${html}</div></div><span class="note">Sample shop</span></div>`;
}
function fitFrames() {
  document.querySelectorAll('#site .frame .vp').forEach((vp) => {
    const in2 = vp.firstElementChild;
    const k = Math.min(1, vp.clientWidth / 900);
    in2.style.transform = `scale(${k})`;
    vp.style.height = Math.min(in2.offsetHeight * k, innerWidth < 760 ? 380 : 560) + 'px';
  });
}

/* ---------- landing ---------- */
const NAVL = [
  ['l-about', 'About'],
  ['l-how', 'How it works'],
  ['l-for', 'Who it’s for'],
  ['l-features', 'Features'],
];
function claimForm(id, btn = 'Get started') {
  return `<form class="claim" data-pub="claim" novalidate><label class="box" for="${id}"><span class="pre">stoora.in/</span><input id="${id}" data-handle placeholder="yourshop" autocomplete="off" autocapitalize="none" spellcheck="false" inputmode="url" maxlength="30" aria-label="Choose your shop link"></label><button class="btn primary" type="submit">${btn}${ic('arrow_forward', 'sm')}</button></form>`;
}
function navActs() {
  return SESSION
    ? `<a class="btn ink sm" href="#home">Open dashboard${ic('arrow_forward', 'sm')}</a>`
    : `<a class="btn quiet sm login" href="#login">Log in</a><a class="btn primary sm cta" href="#signup">Get started<span class="arr" aria-hidden="true">${ic('arrow_forward', 'xs')}</span></a>`;
}
function landingHTML() {
  const P = previews();
  const live = (s) =>
    `<span class="status ${s}">${ic(s === 'live' ? 'check_circle' : s === 'early' ? 'science' : 'schedule')}${s === 'live' ? 'Ready today' : s === 'early' ? 'In early access' : 'Later'}</span>`;
  return `
 <header class="lnav" id="lnav"><div class="wrap in"><a class="logo" href="#about" aria-label="stoora.in home"><span class="appicon" aria-hidden="true">S</span><span class="wordmark">stoora<i>.in</i></span></a>
  <nav class="links" aria-label="Sections" id="llinks"><span class="ind" id="lind" aria-hidden="true"></span><span class="hov" id="lhov" aria-hidden="true"></span>${NAVL.map(([t, l]) => `<button data-act="scroll" data-t="${t}">${l}</button>`).join('')}<a href="/journal">Journal</a></nav>
  <div class="acts" id="lacts">${navActs()}</div><button class="menu-btn" data-act="lmenu" aria-label="Open menu" aria-expanded="false" aria-controls="mnav"><span></span><span></span></button></div></header>
 <main id="lmain">
 <section class="hero" aria-labelledby="hero-h"><div class="wrap grid">
  <div><span class="eyebrow ent" style="--d:0">For sellers in India on WhatsApp and Instagram</span>
   <h1 id="hero-h"><span class="ln"><span class="ent" style="--d:1">One link for every order,</span></span><span class="ln"><span class="ent" style="--d:2">every chat and</span></span><span class="ln"><span class="ent" style="--d:3"><em class="em">every rupee.</em></span></span></h1>
   <p class="lede ent" style="--d:4">Your own shop at stoora.in/yourname, and one place for every order, chat and UPI payment — wherever it came from.</p>
   <div class="ent" style="--d:5">${claimForm('claim-hero')}</div>
   <div class="sub ent" style="--d:6"><button class="btn line sm" data-act="scroll" data-t="l-how">See how it works${ic('arrow_downward', 'sm')}</button><span class="admit"><i aria-hidden="true"></i>The new dashboard is opening to a first group of sellers, a few at a time.</span></div>
  </div>
  <div class="ent" style="--d:3"><div class="stage" id="stage">
   <div class="shop layer paint-in" data-depth="6">${SHOPF('board-hero')}</div>
   <div class="phone layer" data-depth="14">${heroPhone()}</div>
   <div class="float layer lit" data-depth="22" style="left:44%;top:56%"><span class="chipf drift"><span class="ic ic chat" style="background:color-mix(in srgb,var(--seg-chat-a) 13%,var(--surface));color:var(--negative-deep)">${ic('photo_camera', 'xs')}</span>Instagram DM, 10:31 am</span></div>
   <div class="float layer" data-depth="26" style="right:2%;top:78%"><span class="chipf drift d2"><span class="ic" style="background:var(--positive-tint);color:var(--positive-deep)">${ic('check_circle', 'xs')}</span>Paid ₹2,899 by UPI</span></div>
   <span class="cap2">Illustration · sample shop</span>
  </div></div>
 </div></section>

 <section class="sec" id="l-about" aria-labelledby="ab-h"><div class="wrap what">
  <div class="stick"><div class="sec-open rv" style="margin-bottom:0"><span class="eyebrow">About Stoora</span><h2 class="l-h2" id="ab-h">Your business already works. The plumbing doesn’t.</h2>
   <p class="lede">You have buyers and a phone full of messages. Stoora.in is the system behind them.</p></div>
   <div class="pain rv" style="--d:1"><p>${ic('close')}Payment screenshots in your gallery.</p><p>${ic('close')}Orders lost in 2 am DMs.</p><p>${ic('close')}“COD hoga?” — again and again.</p></div></div>
  <div>${messHTML()}
</div></div>
 </div></section>

 <section class="sec" id="l-for" aria-labelledby="for-h"><div class="wrap">
  <div class="sec-open rv"><span class="eyebrow">Who it’s for</span><h2 class="l-h2" id="for-h">Made for people who sell from their phone.</h2><p class="aud-hint">${ic('touch_app', 'sm')}Choose your selling style to see how Stoora fits.</p></div>
  <div class="aud rv"><div class="aud-tabs" role="tablist" aria-label="Kinds of sellers" aria-orientation="vertical"><span class="aud-ind" id="aud-ind" aria-hidden="true"></span>${AUD.map((a, i) => `<button class="aud-tab" role="tab" id="aud-t${i}" aria-selected="${i === 0}" aria-controls="aud-p" tabindex="${i ? -1 : 0}" data-act="aud" data-i="${i}" data-accent="${a.acc}"><span class="sw2" aria-hidden="true"></span><span class="tt">${a.t}<small>${a.s}</small></span><span class="go2" aria-hidden="true">${ic('arrow_forward', 'sm')}</span></button>`).join('')}</div>
   ${audPanel(0).replace('id="aud-p"', 'id="aud-p" data-i="0"')}</div>
 </div></section>

 <section class="sec" id="l-how" aria-labelledby="how-h"><div class="wrap">
  <div class="sec-open rv"><span class="eyebrow">How it works</span><h2 class="l-h2" id="how-h">Open your shop in four steps.</h2><p class="lede">Your shop page is made from what you sell. Pick a look, share one link.</p></div>
  <div class="steps">
   <div class="step-list">${[
     [
       'Sign up with Google or email',
       'Pick a shop name and link. Your shop is live at stoora.in/yourname from day one, and a short setup list tells you what to do next.',
     ],
     [
       'Add what you sell',
       'A product needs a photo, a name and a price. A class or 1-on-1 session also needs days and times. Everything else can wait.',
     ],
     [
       'Choose a look, turn on payments',
       'Pick how the top of your shop looks. Turn on UPI so buyers can pay you at your link.',
     ],
     [
       'Share your link',
       'Put it in your Instagram bio and your WhatsApp status. When orders come in, they land in one list.',
     ],
   ]
     .map(
       ([h, p], i) =>
         `<div class="step-i ${i ? '' : 'on'}" data-step="${i}"><span class="no" aria-hidden="true">0${i + 1}</span><h3>${h}</h3><p>${p}</p></div>`,
     )
     .join('')}</div>
   <div class="ph">${stepPhone()}<div class="stepper"><span class="label" id="stepper-t">Sign up</span><div class="bts" role="group" aria-label="Steps">${[1, 2, 3, 4].map((n, i) => `<button data-act="step" data-i="${i}" aria-pressed="${!i}" class="${i ? '' : 'on'}" aria-label="Step ${n}">${n}</button>`).join('')}</div></div></div>
  </div>
  <div class="day" id="day" style="margin-top:var(--s7)"><div class="day-pin" id="daypin">
   <div class="sec-open rv" style="margin-bottom:var(--s4)"><h3 class="l-h3">A Tuesday with Stoora</h3><p class="cap">The times are an example. The new dashboard is in early access.<span class="day-hint"> Keep scrolling to follow the day.</span></p></div>
   <div class="day-view" id="dayview"><div class="day-track" id="daytrack"><div class="day-line" aria-hidden="true"><i></i></div>
    ${[
      [
        '7:30 am',
        'Your morning message',
        'Up to three ideas, each showing what it could earn and what it costs.',
        `${bdg('ok', 'trending_up', 'Could earn ₹8,600')}${bdg('neutral', 'money_off', 'Costs nothing')}`,
      ],
      [
        '10:31 am',
        'A buyer asks on Instagram',
        'Stoora sorts the chat as ready to buy and drafts a reply.',
        `<span>“Is the indigo set there in size M?”</span>${bdg('ok', 'shopping_bag', 'Ready to buy')}`,
      ],
      [
        '10:33 am',
        'You check, and send',
        'Change the words if you like. Nothing goes out until you tap.',
        `<span>“Yes — only 3 left in M. ₹2,899.”</span><span class="row" style="gap:6px">${ic('send', 'xs')}Sent with a UPI link</span>`,
      ],
      [
        '10:42 am',
        'Paid by UPI',
        'The order lands in your list, marked paid, with where it came from.',
        `<span class="row"><b class="t-ink grow">#1013 · ₹2,899</b>${bdg('ok', 'check_circle', 'Paid')}</span>`,
      ],
      [
        '4:00 pm',
        'Ship it',
        'Add the courier and the tracking number to the order.',
        `<span class="row"><span class="grow">Delhivery · DL4482190</span>${bdg('neutral', 'done_all', 'Shipped')}</span>`,
      ],
      [
        'Payout day',
        'Money to your bank',
        'Your Money page shows what came in, what’s pending and the next payout.',
        `<span class="row"><span class="grow">Next payout</span><b class="t-ink num">₹8,120</b></span>`,
      ],
    ]
      .map(
        ([t, h, p, v], i) =>
          `<article class="dcard"><time>${t}</time><h3>${h}</h3><p class="cap">${p}</p><div class="vis">${v}</div></article>`,
      )
      .join('')}
   </div></div><div class="day-prog" aria-hidden="true"><i></i></div></div></div>
 </div></section>

 <section class="sec" id="l-features" aria-labelledby="ft-h" style="padding-bottom:var(--s5)"><div class="wrap">
  <div class="sec-open rv"><span class="eyebrow">Features</span><h2 class="l-h2" id="ft-h">The dashboard, screen by screen.</h2><p class="lede">Real screens from the new dashboard, with a sample shop.</p></div>
  ${[
    [
      'orders',
      'Orders',
      'Four places, one list of orders',
      'WhatsApp, Instagram, your shop link and in person. Each order shows where it came from, whether it’s paid and whether it’s shipped.',
      [
        'Filter to what needs you: to ship, unpaid, done',
        'Mark an order paid or shipped from its page',
        'Take an order by hand and send a UPI link',
      ],
    ],
    [
      'chats',
      'Chats',
      'Buyers ready to pay, first',
      'Chats from WhatsApp and Instagram in one place, sorted into ready to buy, upset and just looking. Each one has a reply drafted for you to check.',
      [
        'Change any reply before it goes',
        'Send a UPI link or start an order from the chat',
        'Upset buyers don’t get buried',
      ],
    ],
    [
      'ask',
      'Ask Stoora',
      'Ask about your sales in plain words',
      'Ask “How did I do this week?” and get two lines, a small chart and one idea. No reports to read.',
      ['Answers come from your own numbers', 'If Stoora doesn’t know, it says so'],
    ],
  ]
    .map(
      ([k, c, h, p, li], i) => `
   <div class="feat ${i % 2 ? 'flip' : ''}"><div class="ftx rv">${live('live')}<h3 class="l-h3">${h}</h3><p class="t-body">${p}</p><ul>${li.map((x) => `<li>${ic('check', 'sm')}${x}</li>`).join('')}</ul></div><div class="frame-wrap">${frame(P[k], c)}</div></div>`,
    )
    .join('')}
 </div></section>

 <section class="sec" id="l-trust" aria-labelledby="tr-h"><div class="wrap">
  <div class="sec-open rv"><span class="eyebrow">What you can count on</span><h2 class="l-h2" id="tr-h">Four promises we test.</h2><p class="lede">You only ever see your own shop’s data — never another seller’s.</p></div>
  <div class="prom">${[
    ['0', 'Actions without your tap', 'Stoora never sends, posts, changes prices or spends money by itself.'],
    ['0', 'Made-up numbers', 'Every number comes from your own shop. If Stoora doesn’t know, it says so.'],
    ['1', 'Tap to switch any feature off', 'Every helper has its own on and off switch.'],
    ['1', 'Flat price', 'No credits or coins that run out. No hidden prices, no sales calls.'],
  ]
    .map(
      ([n, h, p], i) =>
        `<div class="rv" style="--d:${i}"><span class="n">${n}</span><h3>${h}</h3><p class="cap">${p}</p></div>`,
    )
    .join('')}</div>
 </div></section>

 <section class="sec" aria-labelledby="fin-h"><div class="wrap"><div class="final rv">
  <div class="stack"><span class="eyebrow">Get started</span><h2 class="l-h2" id="fin-h">Your shop is one link away.</h2><p class="lede">Type the name you want. It takes a name, an email and a password.</p>
   ${claimForm('claim-final', 'Open my shop')}<p class="cap">Already selling with Stoora? <a href="#login" class="link">Log in</a></p></div>
  <div class="shop paint-in">${SHOPF('board-final')}</div></div></div></section>
 </main>
 <footer class="sfoot"><div class="sf-card"><div class="sf-g">
  <div class="sf-brand"><a class="wordmark sf-logo" href="/" aria-label="Stoora.in home">stoora<i>.in</i></a>
  <p>Work for yourself. A complete online business for India’s creators, coaches and micro-sellers.</p>
  <a class="sf-cta" href="#signup">Create my store <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
  <span class="sf-soon">iOS &amp; Android apps — coming soon</span></div>
  <div class="sf-col"><h4>Product</h4><ul>
    <li><button data-act="scroll" data-t="l-how">How it works</button></li>
    <li><a href="/s/meera">Example storefront</a></li>
    <li><a href="/dashboard">Seller dashboard</a></li>
    <li><a href="#signup">Bring your catalogue</a></li></ul></div>
  <div class="sf-col"><h4>Sell</h4><ul>
    <li><a href="#signup">Sell crafts and products</a></li>
    <li><a href="#signup">Sell courses and classes</a></li>
    <li><a href="#signup">Sell mentoring and services</a></li>
    <li><a href="#signup">Create my store</a></li></ul></div>
  <div class="sf-col"><h4>Company</h4><ul>
    <li><a href="#login">Log in</a></li>
    <li><a href="/privacy">Privacy</a></li>
    <li><a href="/terms">Terms</a></li>
    <li><a href="mailto:hello@stoora.in">hello@stoora.in</a></li></ul></div>
 </div><div class="sf-bt">© 2026 Stoora.in · Made in India</div></div></footer>`;
}

function buildLanding() {
  const site = $('#site');
  if (!$('#st-defs')) {
    document.body.insertAdjacentHTML('afterbegin', WC_DEFS.replace('<svg ', '<svg id="st-defs" '));
  }
  site.innerHTML = landingHTML();
  L.built = true;
  setBoards(L.handle);
  syncStepShop();
  const io = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.remove('pre');
          io.unobserve(e.target);
        }
      }),
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );
  if (!reduced())
    site.querySelectorAll('.rv').forEach((el) => {
      if (el.getBoundingClientRect().top > innerHeight) {
        el.classList.add('pre');
        io.observe(el);
      }
    });
  // hero carousel: pause on hover / focus / off-screen / hidden tab; resume from where it stopped
  const stage = $('#stage');
  L.visible = true;
  if (stage) {
    stage.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') {
        L.hover = true;
        cycle();
      }
    });
    stage.addEventListener('pointerleave', () => {
      L.hover = false;
      cycle();
    });
    stage.addEventListener('focusin', (e) => {
      if (e.target.matches(':focus-visible')) {
        L.focus = true;
        cycle();
      }
    });
    stage.addEventListener('focusout', (e) => {
      if (!stage.contains(e.relatedTarget)) {
        L.focus = false;
        cycle();
      }
    });
    new IntersectionObserver(
      (es) => {
        L.visible = es[0].isIntersecting;
        cycle();
      },
      { threshold: 0.25 },
    ).observe(stage);
    const hero = $('.hero');
    hero.addEventListener('pointermove', (e) => {
      if (reduced() || e.pointerType !== 'mouse') return;
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5,
        y = (e.clientY - r.top) / r.height - 0.5;
      stage.querySelectorAll('.layer').forEach((l) => {
        const d = +l.dataset.depth;
        l.style.transform = `translate(${(-x * d).toFixed(1)}px,${(-y * d).toFixed(1)}px)`;
      });
    });
  }
  // comparison: sorts itself once when first seen, unless the visitor has already used the control
  L.cmp = 0;
  L.cmpT = 0;
  layoutMess(0);
  moveCmpThumb();
  const mo = new IntersectionObserver(
    (es) => {
      if (es[0].isIntersecting) {
        mo.disconnect();
        setTimeout(
          () => {
            if (!L.cmpTouched) setCmp(1);
          },
          reduced() ? 0 : 500,
        );
      }
    },
    { threshold: 0.55 },
  );
  mo.observe($('#mess'));
  setScene(0);
  cycle();
  initAudAuto();
  requestAnimationFrame(() => {
    fitFrames();
    moveAudInd();
    layoutDay();
    onScroll();
  });
  document.fonts &&
    document.fonts.ready.then(() => {
      fitFrames();
      moveAudInd();
      layoutDay();
      onScroll();
    });
}
/* A Tuesday with Stoora — desktop: the section pins and vertical scroll moves the cards sideways.
   The section is exactly (pinned height + horizontal distance) tall, so the pin releases on the last card.
   Narrow screens and reduced motion: a plain vertical timeline. No wheel handlers. */
function dayMode() {
  return innerWidth >= 980 && !reduced();
}
function layoutDay() {
  const day = $('#day'),
    pin = $('#daypin'),
    view = $('#dayview'),
    tr = $('#daytrack');
  if (!day) return;
  day.classList.toggle('pinned', dayMode());
  if (!dayMode()) {
    day.style.height = '';
    tr.style.transform = '';
    pin.style.top = '';
    L.dayDist = 0;
    tr.querySelectorAll('.dcard').forEach((c) => {
      c.style.opacity = '';
      c.classList.remove('now');
    });
    return;
  }
  const cs = getComputedStyle(view);
  const inner = view.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  L.dayDist = Math.max(0, tr.scrollWidth - inner);
  pin.style.top = Math.max(88, (innerHeight - pin.offsetHeight) / 2) + 'px';
  day.style.height = pin.offsetHeight + L.dayDist + 'px';
}
function dayScroll(vh) {
  const day = $('#day');
  if (!day || !dayMode() || !L.dayDist) return;
  const pin = $('#daypin'),
    tr = $('#daytrack');
  const top = parseFloat(getComputedStyle(pin).top) || 0;
  const p = Math.min(1, Math.max(0, (top - day.getBoundingClientRect().top) / L.dayDist));
  tr.style.transform = `translate3d(${(-p * L.dayDist).toFixed(1)}px,0,0)`;
  day.style.setProperty('--p', p.toFixed(4));
  const vw = $('#dayview').clientWidth,
    lineX = p * tr.scrollWidth;
  tr.querySelectorAll('.dcard').forEach((c) => {
    const x = c.offsetLeft - p * L.dayDist;
    const vis = 1 - Math.min(1, Math.max(0, (x - vw * 0.78) / (vw * 0.3)));
    c.style.opacity = (0.4 + 0.6 * vis).toFixed(3);
    c.classList.toggle('now', c.offsetLeft + 20 <= lineX);
  });
}
let scrollRaf = 0;
function onScroll() {
  if (MODE !== 'public') return;
  const nav = $('#lnav');
  if (!nav) return;
  if (scrollY > 40) nav.classList.add('solid');
  else if (scrollY < 10) nav.classList.remove('solid');
  const vh = innerHeight;
  let act = null;
  NAVL.forEach(([t]) => {
    const s = document.getElementById(t);
    if (s) {
      const r = s.getBoundingClientRect();
      if (r.top < vh * 0.4 && r.bottom > vh * 0.4) act = t;
    }
  });
  if (act !== L.navAct) {
    L.navAct = act;
    document.querySelectorAll('.lnav .links button').forEach((b) => {
      const on = b.dataset.t === act;
      b.classList.toggle('on', on);
      on ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current');
    });
    moveInd('#lind', act ? $(`.lnav .links button[data-t="${act}"]`) : null);
  }
  stepScroll(vh);
  dayScroll(vh);
}
function moveInd(sel, btn) {
  const ind = $(sel);
  if (!ind) return;
  if (!btn) {
    ind.style.opacity = 0;
    return;
  }
  ind.style.opacity = 1;
  ind.style.width = btn.offsetWidth + 'px';
  ind.style.transform = `translateX(${btn.offsetLeft}px)`;
}
addEventListener(
  'scroll',
  () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      onScroll();
    });
  },
  { passive: true },
);
addEventListener('resize', () => {
  if (MODE === 'public') {
    fitFrames();
    moveAudInd();
    layoutDay();
    moveInd('#lind', $('.lnav .links button.on'));
    if (L.cmpT != null) layoutMess(L.cmpT);
    onScroll();
  }
});
document.addEventListener('visibilitychange', () => {
  if (L.built) cycle();
});
function renderLanding() {
  if (!L.built) buildLanding();
  else {
    $('#lacts').innerHTML = navActs();
    setScene(L.scene);
    requestAnimationFrame(() => {
      layoutDay();
      moveAudInd();
      cycle();
      audAuto();
    });
  }
  document.title = 'Stoora.in · One link for your shop';
  requestAnimationFrame(onScroll);
}
function openLMenu() {
  const btn = $('.lnav .menu-btn');
  btn.setAttribute('aria-expanded', 'true');
  btn.setAttribute('aria-label', 'Close menu');
  document.body.classList.add('lmenu-open');
  setLayer(
    `<div class="mnav" id="mnav" role="dialog" aria-modal="true" aria-label="Menu">
 <nav aria-label="Sections">${NAVL.map(([t, l], i) => `<button data-act="scroll" data-t="${t}" style="--i:${i}" ${L.navAct === t ? 'aria-current="true"' : ''}><span>${l}</span>${ic('arrow_forward', 't-cap')}</button>`).join('')}<a href="/journal" style="--i:${NAVL.length}"><span>Journal</span>${ic('arrow_forward', 't-cap')}</a></nav>
 <div class="ft" style="--i:4">${SESSION ? `<a class="btn ink full" href="#home">Open dashboard</a>` : `<a class="btn primary full" href="#signup">Get started</a><a class="btn line full" href="#login">Log in</a>`}</div></div>`,
    '.mnav nav button',
  );
}
function closeLMenu(then) {
  const m = $('.mnav');
  const btn = $('.lnav .menu-btn');
  if (btn) {
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open menu');
  }
  document.body.classList.remove('lmenu-open');
  if (!m) {
    then && then();
    return;
  }
  if (reduced()) {
    closeOv(true);
    then && then();
    return;
  }
  m.classList.add('out');
  setTimeout(() => {
    closeOv(true);
    btn && btn.focus({ preventScroll: true });
    then && then();
  }, 200);
}

/* ---------- auth ---------- */
function authSide() {
  return `<aside class="auth-side" aria-hidden="true"><a class="logo row" href="#about" style="text-decoration:none" tabindex="-1"><span class="appicon">S</span><span class="wordmark">stoora<i>.in</i></span></a>
 <div class="shop paint-in">${SHOPF('board-auth')}</div>
 <div class="stack"><h2 class="l-h3">Your shop, live on day one.</h2><ol><li>Your shop goes up at stoora.in/yourname.</li><li>A short setup list tells you what to do next.</li><li>Add one product and share the link.</li></ol></div></aside>`;
}
const field = (id, label, attrs, hint = '') =>
  `<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" ${attrs}>${hint ? `<span class="hint" id="${id}-h">${hint}</span>` : ''}<span class="err" id="${id}-e" hidden></span></div>`;
const pwField = (id, label, ac, hint = '') =>
  `<div class="field"><label for="${id}">${label}</label><div class="pw"><input class="input" id="${id}" type="password" autocomplete="${ac}" ${hint ? `aria-describedby="${id}-h"` : ''}><button type="button" data-act="pw-toggle" data-for="${id}" aria-pressed="false" aria-label="Show password">Show</button></div>${hint ? `<span class="hint" id="${id}-h">${hint}</span>` : ''}<span class="err" id="${id}-e" hidden></span></div>`;
/* "Continue with Google" appears only when the server has a GOOGLE_CLIENT_ID (see .env.example). */
let PUBLIC_CONFIG = { googleClientId: null };
const gBtn = () =>
  PUBLIC_CONFIG.googleClientId
    ? '<div id="g-btn" style="display:flex;justify-content:center;min-height:44px"></div><div class="or">or with email</div>'
    : '';
function mountGoogle() {
  const holder = $('#g-btn');
  if (!holder || !PUBLIC_CONFIG.googleClientId) return;
  const draw = () => {
    google.accounts.id.initialize({
      client_id: PUBLIC_CONFIG.googleClientId,
      callback: (r) =>
        api('POST', '/api/auth/google', { credential: r.credential })
          .then((x) => startSession(x.user))
          .catch((e) => toast(e.message, null, 'error')),
    });
    google.accounts.id.renderButton(holder, {
      theme: 'outline',
      size: 'large',
      width: Math.min(360, holder.clientWidth || 360),
      text: 'continue_with',
    });
  };
  if (window.google && google.accounts) return draw();
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.async = true;
  s.onload = draw;
  document.head.appendChild(s);
}
const prevNote = `<p class="prev-note">${ic('info')}<span>Your account is saved on the Stoora server, and your password is stored scrambled, never as text. Use a password you don’t use anywhere else.</span></p>`;
function authHTML(kind) {
  let box = '';
  if (kind === 'login')
    box = `<div class="stack tight"><span class="eyebrow">Log in</span><h1>Welcome back.</h1><p class="t-body">${AUTH_NEXT ? 'Log in to continue to your dashboard.' : 'See today’s orders, chats and money.'}</p></div>
  ${gBtn()}<form class="stack" data-pub="login" novalidate>
  <div class="banner bad" id="login-err" role="alert" hidden>${ic('error')}<span>That email and password don’t match. Check for typos, or <a href="#forgot" class="link" style="color:inherit;text-decoration:underline">reset your password</a>.</span></div>
  ${field('li-email', 'Email', 'type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="you@example.in"')}
  ${pwField('li-pw', 'Password', 'current-password')}
  <div class="row" style="justify-content:space-between;flex-wrap:wrap"><label class="check"><input type="checkbox" id="li-rem" checked>Keep me logged in</label><a href="#forgot" class="link">Forgot password?</a></div>
  <button class="btn primary full" type="submit" style="height:50px">Log in</button></form>
  <div class="inner stack tight" style="padding:var(--s3)"><span class="t-ink" style="font-weight:500">Want to look around first?</span><p class="cap">Log in to the sample shop, Meera Studio: <span class="num" style="user-select:all">${DEMO.email}</span> · <span style="user-select:all">${DEMO.pw}</span></p><button class="btn line sm" data-act="demo" style="justify-self:start">Use the sample shop</button></div>
  <p class="t-body" style="text-align:center">New to Stoora? <a href="#signup" class="link">Open a shop</a></p>`;
  if (kind === 'signup')
    box = `<div class="stack tight"><span class="eyebrow">Open a shop</span><h1>Start selling from one link.</h1><p class="t-body">A name, an email and a password. Everything else can wait.</p></div>
  ${gBtn()}<form class="stack" data-pub="signup" novalidate>
  ${field('su-name', 'Your name', 'autocomplete="name" placeholder="Meera Joshi"')}
  ${field('su-shop', 'Shop name', 'autocomplete="organization" placeholder="Meera Studio"')}
  <div class="field"><label for="su-handle">Shop link</label><div class="affix" id="su-handle-box"><span>stoora.in/</span><input id="su-handle" data-handle autocapitalize="none" spellcheck="false" maxlength="30" value="${esc(L.handle)}" placeholder="meerastudio" aria-describedby="su-handle-h"></div><span class="hint" id="su-handle-h" aria-live="polite">Letters, numbers and dashes.</span><span class="err" id="su-handle-e" hidden></span></div>
  ${field('su-email', 'Email', 'type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="you@example.in"')}
  ${pwField('su-pw', 'Password', 'new-password', 'At least 8 characters, with letters and a number.')}<div class="meterpw" id="su-meter" aria-hidden="true"><i></i><i></i><i></i></div>
  ${pwField('su-pw2', 'Confirm password', 'new-password')}
  <div class="field"><label class="check" for="su-terms" style="display:flex;gap:10px;align-items:flex-start"><input type="checkbox" id="su-terms" style="margin-top:3px"><span>I agree to the <a href="/terms" class="link" target="_blank" rel="noopener">terms</a> and the <a href="/privacy" class="link" target="_blank" rel="noopener">privacy policy</a>.</span></label><span class="err" id="su-terms-e" hidden></span></div>
  ${prevNote}
  <button class="btn primary full" type="submit" style="height:50px">Create my shop</button></form>
  <p class="t-body" style="text-align:center">Already have a shop? <a href="#login" class="link">Log in</a></p>`;
  if (kind === 'reset')
    box = `<div class="stack tight"><span class="eyebrow">Password</span><h1>Choose a new password.</h1><p class="t-body">Use at least 8 characters, with letters and a number.</p></div>
  <form class="stack" data-pub="reset" novalidate>${pwField('rs-pw', 'New password', 'new-password')}<button class="btn primary full" type="submit" style="height:50px">Save new password</button></form>`;
  if (kind === 'forgot')
    box = `<div class="stack tight"><span class="eyebrow">Password</span><h1>Reset your password.</h1><p class="t-body">Type the email you signed up with.</p></div>
  <form class="stack" data-pub="forgot" novalidate id="fg-form">${field('fg-email', 'Email', 'type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false"')}
  <button class="btn primary full" type="submit" style="height:50px">Send reset link</button></form><div id="fg-done" hidden></div>
  <p class="t-body" style="text-align:center"><a href="#login" class="link">${ic('arrow_back', 'sm')}Back to log in</a></p>`;
  return `<div class="auth">${authSide()}<div class="auth-main"><div class="auth-top"><a class="logo row" href="#about" style="text-decoration:none" aria-label="stoora.in home"><span class="appicon" aria-hidden="true" style="width:30px;height:30px;font-size:17px">S</span><span class="wordmark" style="font-size:20px">stoora<i>.in</i></span></a><a class="link" href="#about">${ic('arrow_back', 'sm')}Back to the website</a></div>
  <div class="auth-box" style="animation:rise .45s var(--ease-out)">${box}</div></div></div>`;
}
function renderAuth(kind) {
  $('#auth').innerHTML = authHTML(kind);
  document.title =
    { login: 'Log in', signup: 'Open a shop', forgot: 'Reset password', reset: 'New password' }[kind] + ' · Stoora.in';
  setBoards(L.handle);
  if (kind === 'signup') checkHandle();
  mountGoogle();
  mountGoogle();
  const f = $('#auth form input:not([type=checkbox])');
  if (f && innerWidth >= 980) setTimeout(() => f.focus({ preventScroll: true }), 80);
}

function setErr(id, msg) {
  const e = $('#' + id + '-e'),
    i = $('#' + id);
  if (!e) return;
  const box = i.closest('.affix') || i;
  if (msg) {
    e.innerHTML = ic('error', 'xs') + msg;
    e.hidden = false;
    box.classList.add('bad');
    i.setAttribute('aria-invalid', 'true');
    i.setAttribute(
      'aria-describedby',
      (i.getAttribute('aria-describedby') || '').replace(id + '-e', '').trim() + ' ' + id + '-e',
    );
  } else {
    e.hidden = true;
    box.classList.remove('bad');
    i.removeAttribute('aria-invalid');
  }
  return !!msg;
}
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
function busy(btn, on, label) {
  if (on) {
    btn.dataset.l = btn.innerHTML;
    btn.innerHTML = `<span class="spin" aria-hidden="true"></span>${label}`;
    btn.disabled = true;
    btn.classList.add('busy');
    btn.style.background = 'var(--gradient-action)';
    btn.style.color = '#FFFFFF';
  } else {
    btn.innerHTML = btn.dataset.l;
    btn.disabled = false;
    btn.classList.remove('busy');
    btn.style.background = '';
    btn.style.color = '';
  }
}
let _hT;
function checkHandle() {
  const i = $('#su-handle');
  if (!i) return true;
  const h = cleanHandle(i.value);
  const hint = $('#su-handle-h');
  if (!h) {
    hint.className = 'hint';
    hint.textContent = 'Letters, numbers and dashes.';
    return false;
  }
  const taken = TAKEN.includes(h);
  hint.className = 'hint ' + (taken ? 'handle-no' : 'handle-ok');
  hint.textContent = taken ? `stoora.in/${h} is taken. Try ${h}-studio or ${h}-shop.` : `stoora.in/${h} is free.`;
  if (!taken && h.length >= 2) {
    clearTimeout(_hT);
    _hT = setTimeout(async () => {
      try {
        const r = await api('GET', '/api/handle?h=' + encodeURIComponent(h));
        const cur = $('#su-handle');
        if (cur && cleanHandle(cur.value) === h) {
          hint.className = 'hint ' + (r.ok ? 'handle-ok' : 'handle-no');
          hint.textContent = r.ok
            ? `stoora.in/${h} is free.`
            : `stoora.in/${h} is taken. Try ${h}-studio or ${h}-shop.`;
        }
      } catch (_) {}
    }, 300);
  }
  return !taken;
}
async function doLogin(f, demo) {
  const btn = f.querySelector('[type=submit]');
  if (btn.disabled) return;
  $('#login-err').hidden = true;
  const email = (demo ? DEMO.email : $('#li-email').value).trim().toLowerCase(),
    pw = demo ? DEMO.pw : $('#li-pw').value;
  if (demo) {
    $('#li-email').value = email;
    $('#li-pw').value = pw;
  }
  let bad = setErr(
    'li-email',
    !email
      ? 'Type the email you signed up with.'
      : !emailOk(email)
        ? 'That doesn’t look like an email. Check for a missing @ or dot.'
        : '',
  );
  bad = setErr('li-pw', !pw ? 'Type your password.' : '') || bad;
  if (bad) {
    f.querySelector('[aria-invalid="true"]').focus();
    return;
  }
  busy(btn, true, 'Logging in…');
  try {
    const r = await api('POST', '/api/auth/login', { email, password: pw, remember: $('#li-rem').checked });
    startSession(r.user, true);
    toast(`Welcome back, ${r.user.name.split(' ')[0]}`);
  } catch (e) {
    busy(btn, false);
    if (e.status === 401) {
      $('#login-err').hidden = false;
      $('#li-pw').value = '';
      $('#li-pw').focus();
    } else toast(e.message, null, 'error');
  }
}
async function doSignup(f) {
  const btn = f.querySelector('[type=submit]');
  if (btn.disabled) return;
  const v = (id) => $('#' + id).value.trim();
  const name = v('su-name'),
    shop = v('su-shop'),
    handle = cleanHandle(v('su-handle')),
    email = v('su-email').toLowerCase(),
    pw = $('#su-pw').value,
    pw2 = $('#su-pw2').value;
  const pwWeak = pw.length < 8 ? 'Use at least 8 characters.' : !/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw) ? 'Use letters and at least one number.' : pw.toLowerCase() === email ? 'The password cannot be your email.' : '';
  const errs = [
    setErr('su-name', !name ? 'Add your name, so Stoora knows what to call you.' : ''),
    setErr('su-shop', !shop ? 'Add your shop’s name. You can change it later.' : ''),
    setErr('su-handle', !handle ? 'Pick a link for your shop.' : !checkHandle() ? 'Pick a link nobody has yet.' : ''),
    setErr(
      'su-email',
      !email
        ? 'Add an email to log in with.'
        : !emailOk(email)
          ? 'That doesn’t look like an email. Check for a missing @ or dot.'
          : '',
    ),
    setErr('su-pw', pwWeak),
    setErr('su-pw2', !pwWeak && pw2 !== pw ? 'The two passwords do not match.' : ''),
    setErr('su-terms', $('#su-terms').checked ? '' : 'Tick the box to open a shop.'),
  ];
  if (errs.some(Boolean)) {
    f.querySelector('[aria-invalid="true"]').focus();
    return;
  }
  busy(btn, true, 'Creating your shop…');
  try {
    const r = await api('POST', '/api/auth/signup', { name, shop, handle, email, password: pw, acceptTerms: true });
    startSession(r.user, true);
    toast(`Welcome, ${name.split(' ')[0]}. Let’s set up your shop.`);
  } catch (e) {
    busy(btn, false);
    const m = e.message;
    const id = /email/i.test(m)
      ? 'su-email'
      : /link|handle/i.test(m)
        ? 'su-handle'
        : /password/i.test(m)
          ? 'su-pw'
          : /shop/i.test(m)
            ? 'su-shop'
            : /name/i.test(m)
              ? 'su-name'
              : '';
    if (id && setErr(id, m)) $('#' + id).focus();
    else toast(m, null, 'error');
  }
}
function startSession(acc) {
  SESSION = sessionFrom(acc);
  applySession(SESSION);
  const next = AUTH_NEXT;
  AUTH_NEXT = null;
  location.hash = next || (SESSION.onboarding === 'pending' ? 'new-shop' : 'home');
}
function logout() {
  api('POST', '/api/auth/logout').catch(() => {});
  SESSION = null;
  applySession(null);
  document.body.classList.remove('docked');
  closeOv(true);
  ui.dirty = false;
  AUTH_NEXT = null;
  history.replaceState(null, '', '#about');
  render(true);
  window.scrollTo(0, 0);
  setTimeout(() => toast('You’re logged out'), 60);
}

/* ---------- router: public → auth → app ---------- */
const AUTHR = ['login', 'signup', 'forgot'];
function setMode(m, fn) {
  const changed = MODE !== m;
  const apply = () => {
    MODE = m;
    document.body.classList.remove('mode-public', 'mode-auth', 'mode-app');
    document.body.classList.add('mode-' + m);
    if (m !== 'app') document.body.classList.remove('docked');
    fn();
    if (changed) window.scrollTo(0, 0);
  };
  if (changed && MODE && document.startViewTransition && !reduced()) document.startViewTransition(apply);
  else apply();
}
function render(enter) {
  const h = (location.hash || '').slice(1) || 'about';
  if (h === 'about') {
    closeOv(true);
    return setMode('public', renderLanding);
  }
  if (AUTHR.includes(h)) {
    if (SESSION && h !== 'forgot') {
      location.replace('#' + (SESSION.demo ? 'home' : 'home'));
      return;
    }
    closeOv(true);
    return setMode('auth', () => renderAuth(h));
  }
  if (!SESSION) {
    AUTH_NEXT = h;
    location.replace('#login');
    return;
  }
  setMode('app', () => {
    renderApp(enter);
    if (S.isNewAccount && route !== 'new-shop' && !(route === 'home' && S.newShop)) {
      const pg = $('#pg');
      pg &&
        pg.insertAdjacentHTML(
          'afterbegin',
          `<div class="sample-bar" role="note">${ic('info', 'sm')}<span class="grow">Your shop is new, so these pages show a sample shop’s orders and chats for you to try.</span><a class="btn line sm" href="#new-shop">Back to setup</a></div>`,
        );
    }
  });
}

/* ---------- extra actions ---------- */
const _act = act;
act = function (k, el, e) {
  const d = el.dataset;
  switch (k) {
    case 'scroll': {
      const go2 = () => {
        const t = document.getElementById(d.t);
        if (t) t.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
      };
      if ($('.mnav')) closeLMenu(go2);
      else if ($('#layer').innerHTML) {
        closeOv(true);
        setTimeout(go2, 30);
      } else go2();
      return;
    }
    case 'lmenu':
      return $('.mnav') ? closeLMenu() : openLMenu();
    case 'scene':
      setScene(+d.i, true);
      cycle();
      return;
    case 'autoplay':
      return toggleAuto(el);
    case 'cmp':
      return setCmp(+d.v, true);
    case 'step':
      return setStep(+d.i);
    case 'aud':
      return selectAud(+d.i);
    case 'close':
      if ($('.mnav')) return closeLMenu();
      break;
    case 'pw-toggle': {
      const i = $('#' + d.for);
      const show = i.type === 'password';
      i.type = show ? 'text' : 'password';
      el.textContent = show ? 'Hide' : 'Show';
      el.setAttribute('aria-pressed', show);
      el.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      return;
    }
    case 'demo':
      return doLogin($('form[data-pub="login"]'), true);
    case 'logout':
      return logout();
  }
  return _act(k, el, e);
};
document.addEventListener(
  'keydown',
  (e) => {
    const t = e.target;
    if (e.key === 'Escape' && $('.mnav')) {
      e.stopImmediatePropagation();
      closeLMenu();
      return;
    }
    if (t.classList && t.classList.contains('aud-tab') && /^(Arrow(Left|Right|Up|Down)|Home|End)$/.test(e.key)) {
      e.preventDefault();
      const n = AUD.length,
        i = +t.dataset.i;
      selectAud(
        e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : (i + (/Right|Down/.test(e.key) ? 1 : -1) + n) % n,
        true,
      );
      return;
    }
    if (t.closest && t.closest('.cmp') && /^Arrow(Left|Right|Up|Down)$/.test(e.key)) {
      e.preventDefault();
      const v = L.cmp ? 0 : 1;
      setCmp(v, true);
      $(`.cmp [data-v="${v}"]`).focus();
    }
  },
  true,
);
document.addEventListener('submit', (e) => {
  const f = e.target;
  const k = f.dataset.pub;
  if (!k) return;
  e.preventDefault();
  if (k === 'claim') {
    const h = cleanHandle(f.querySelector('input').value);
    L.handle = h;
    location.hash = 'signup';
    return;
  }
  if (k === 'login') return doLogin(f);
  if (k === 'signup') return doSignup(f);
  if (k === 'reset') {
    const btn = f.querySelector('[type=submit]');
    const pw = $('#rs-pw').value;
    if (setErr('rs-pw', pw.length < 8 ? 'Use at least 8 characters.' : !/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw) ? 'Use letters and at least one number.' : '')) return $('#rs-pw').focus();
    busy(btn, true, 'Saving…');
    api('POST', '/api/auth/reset', { token: L.resetToken, password: pw })
      .then(() => {
        toast('Password changed. Log in with the new one.');
        location.hash = 'login';
      })
      .catch((e) => {
        busy(btn, false);
        toast(e.message, null, 'error');
      });
    return;
  }
  if (k === 'forgot') {
    const btn = f.querySelector('[type=submit]');
    const v = $('#fg-email').value.trim();
    if (
      setErr(
        'fg-email',
        !v
          ? 'Type the email you signed up with.'
          : !emailOk(v)
            ? 'That doesn’t look like an email. Check for a missing @ or dot.'
            : '',
      )
    )
      return $('#fg-email').focus();
    busy(btn, true, 'Sending…');
    api('POST', '/api/auth/forgot', { email: v })
      .catch(() => {})
      .then(() => {
        f.hidden = true;
        const d = $('#fg-done');
        d.hidden = false;
        d.innerHTML = `<div class="banner ok" role="status">${ic('check_circle')}<span>If there’s a shop with ${esc(v)}, a reset link is on its way.</span></div><p class="prev-note" style="margin-top:var(--s2)">${ic('info')}<span>Email sending isn’t set up on this server yet, so the reset link is printed in the server window. Connect an email service to send it to you.</span></p>`;
      }, 700);
  }
});
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.hasAttribute && t.hasAttribute('data-handle')) {
    const pos = t.selectionStart;
    const c = t.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (c !== t.value) {
      t.value = c;
      try {
        t.setSelectionRange(pos - 1, pos - 1);
      } catch (_) {}
    }
    L.handle = cleanHandle(c);
    setBoards(L.handle);
    syncStepShop();
    document.querySelectorAll('[data-handle]').forEach((x) => {
      if (x !== t) x.value = c;
    });
    if (t.id === 'su-handle') {
      t.dataset.touched = 1;
      checkHandle();
      setErr('su-handle', '');
    }
    return;
  }
  if (t.id === 'su-shop') {
    const hi = $('#su-handle');
    if (hi && !hi.dataset.touched) {
      hi.value = cleanHandle(t.value).replace(/-/g, '');
      L.handle = hi.value;
      setBoards(L.handle);
      checkHandle();
    }
  }
  if (t.id === 'su-pw') {
    const v = t.value;
    const s = !v ? 0 : v.length < 8 ? 1 : /[0-9]/.test(v) && /[a-zA-Z]/.test(v) && v.length >= 10 ? 3 : 2;
    $('#su-meter').className = 'meterpw' + (s ? ' s' + s : '');
  }
  if (t.matches && t.matches('#auth .input[aria-invalid], #auth .affix input')) setErr(t.id, '');
});

document.addEventListener('pointerover', (e) => {
  const b = e.target.closest && e.target.closest('.lnav .links button');
  if (b) moveInd('#lhov', b);
});
document.addEventListener('pointerout', (e) => {
  const g = e.target.closest && e.target.closest('#llinks');
  if (g && !g.contains(e.relatedTarget)) {
    const h = $('#lhov');
    if (h) h.style.opacity = 0;
  }
});
addEventListener('hashchange', () => {
  document.body.classList.remove('lmenu-open');
  const b = $('.lnav .menu-btn');
  if (b) {
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-label', 'Open menu');
  }
});

/* ---------- logout entry points in the dashboard ---------- */
const _side = sideHTML;
sideHTML = function () {
  return _side().replace(
    '<div class="side-foot">',
    `<div class="side-foot"><a class="nav" href="#about" title="Stoora.in website">${ic('public')}<span class="lbl">Website</span></a><button class="nav" data-act="logout" title="Log out" style="width:100%;text-align:left">${ic('logout')}<span class="lbl">Log out</span></button>`,
  );
};
const _menu = openMenu;
openMenu = function () {
  _menu();
  const f = $('.drawer .foot');
  f &&
    f.insertAdjacentHTML(
      'beforebegin',
      `<a class="nav" href="#about">${ic('public')}Stoora.in website</a><button class="nav" data-act="logout" style="width:100%;text-align:left">${ic('logout')}Log out</button>`,
    );
};
const _set = SCREENS['shop-settings'].fn;
SCREENS['shop-settings'].fn = function () {
  const m = _set();
  m.body += `<section class="card anim" style="--i:4;margin-top:var(--s3)"><div class="row" style="flex-wrap:wrap"><div class="grow"><div class="t-ink" style="font-weight:500">${esc(SESSION ? SESSION.email : '')}</div><p class="cap">Logged in${SESSION && SESSION.demo ? ' to the sample shop' : ''}</p></div><button class="btn line" data-act="logout">${ic('logout')}Log out</button></div></section>`;
  return m;
};

/* boot moved to the last part (h-assist.js) so every override is in place first */

/* ================= STOORA ASSISTANT · CALM HOME · AI ORDERS =================
   Layers (kept separate so the Next.js port can swap each one):
   1. Business data   — bizSnapshot(), DATASETS: computed from the signed-in seller's own state (S) only.
   2. AI generation   — Claude via the artifact `sample` capability, on the viewer's own account.
                        Prompts carry ONLY this seller's snapshot. No API keys live in the page.
   3. Charts          — the AI may only NAME a dataset; the page draws it from real numbers.
   4. Actions         — the AI may only pick from ACTIONS; nothing runs until the seller taps.
   5. Orders          — AI prepares a DRAFT; only "Approve and create order" adds it to Orders.
   In production, (2) moves to Stoora's server (same prompt + schema), and audio transcription
   needs a speech-to-text service there. Both are flagged in the UI where they apply. */

/* ---------- 0. AI availability ---------- */
let SAMPLE = undefined,
  SAMPLE_LIM = null,
  AI_OFF = false;
const SAMPLE_P = (async () => {
  try {
    const s = window.claude && window.claude.use ? await window.claude.use('sample') : null;
    SAMPLE = s || null;
    if (s) SAMPLE_LIM = await s.limits().catch(() => null);
  } catch (_) {
    SAMPLE = null;
  }
  if (MODE === 'app' && /^create-order-ai/.test(route)) render(false);
  return SAMPLE;
})();
const aiReady = () => SAMPLE && !AI_OFF;
const AI_ERR = {
  not_granted:
    'You chose not to let this page use Claude, so live answers are off for now. Reload the page to be asked again.',
  sampling_disabled: 'Claude isn’t available for this account, so live answers are off.',
  rate_limited: 'Too many questions in a short time. Wait a minute and try again.',
  session_expired: 'Your Claude session ended. Sign in again, then try once more.',
  refused: 'Stoora couldn’t answer that. Try asking it a different way.',
  empty_completion: 'Stoora didn’t write an answer. Try asking a shorter question.',
  invalid_json: 'Stoora’s answer came back in a shape the page couldn’t read. Try again.',
  prompt_too_large: 'That was too much text at once. Try a shorter question or chat.',
  upstream_error: 'The connection to Claude dropped. Try again.',
  image_rejected: 'That image couldn’t be read. Try a clearer PNG or JPG screenshot.',
};
const aiErr = (c) => AI_ERR[c] || AI_ERR.upstream_error;
function aiOffIf(code) {
  if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code))
    AI_OFF = true;
}

/* ---------- 1. business data (this seller only) ---------- */
const SALES7 = () => ({ x: AN['7'].x.map((d, i) => (i === 6 ? 'Today' : d)), v: AN['7'].v });
function moneyWaiting() {
  return [
    ...S.orders
      .filter((o) => !o.paid && o.pay !== 'cod')
      .map((o) => ({ who: o.who, ref: '#' + o.id, amt: o.total, since: o.when })),
    ...S.bookings
      .filter((b) => !b.paid)
      .map((b) => ({ who: b.who, ref: b.id, amt: prod(b.svc).price, since: 'booked ' + b.when })),
  ];
}
function bizSnapshot() {
  const c = counts();
  const w = moneyWaiting();
  return {
    shop: S.shop.name,
    owner: S.shop.owner,
    today: 'Tuesday 27 October 2026',
    sales: {
      today: 8195,
      yesterday: 6940,
      ordersYesterday: 5,
      last7Days: SALES7().x.map((d, i) => ({ day: d, sales: SALES7().v[i] })),
      note: 'Today is still in progress.',
    },
    visits: { today: 148, yesterday: 125, last7Days: 1046, changeVsPrevious7DaysPercent: -4, peopleOnShopNow: 2 },
    money: {
      receivedToday: MR.today.rec,
      receivedThisWeek: MR.week.rec,
      waitingTotal: w.reduce((a, x) => a + x.amt, 0),
      waiting: w,
      nextPayout: { amount: S.payouts.next, date: S.payouts.date, to: S.payouts.acct },
    },
    orders: S.orders.map((o) => ({
      id: '#' + o.id,
      buyer: o.who,
      total: o.total,
      paid: o.paid,
      payment: o.pay,
      shipped: o.shipped,
      from: o.src,
      when: o.when,
      items: o.items.map(([p, q, sz]) => `${q} × ${prod(p).name}${sz ? ' (' + sz + ')' : ''}`),
    })),
    ordersNeedingAction: { toShip: c.toShip, unpaid: c.unpaidOrders },
    products: S.products.map((p) => ({
      name: p.name,
      price: p.price,
      stock: p.stock,
      status: p.status,
      soldLast30Days: p.sold,
      viewsYesterday: p.views ?? null,
      sizes: p.sizes || [],
    })),
    bookings: S.bookings.map((b) => ({
      id: b.id,
      buyer: b.who,
      service: prod(b.svc).name,
      when: b.when,
      paid: b.paid,
      status: b.status,
    })),
    chats: S.chats.map((ch) => ({
      buyer: ch.who,
      from: ch.src,
      group: { ready: 'ready to buy', upset: 'upset', look: 'just looking' }[ch.mood],
      unread: ch.unread,
      lastMessage: ch.last,
      replyDrafted: !!ch.draft,
    })),
    orderSourcesLast30DaysPercent: { WhatsApp: 46, Instagram: 31, 'Shop link': 15, 'In person': 8 },
    notAvailable: [
      'orders per day',
      'profit or costs',
      'visits per product before yesterday',
      'delivery status from couriers',
    ],
  };
}
const DATASETS = {
  sales_7d: {
    t: 'Sales, last 7 days',
    render: () => {
      const d = SALES7();
      return lineChart(d.x, d.v, 'Sales over the last 7 days');
    },
  },
  best_sellers: {
    t: 'Best sellers, last 30 days (units)',
    render: () =>
      hbars(
        [...S.products]
          .sort((a, b) => b.sold - a.sold)
          .slice(0, 4)
          .map((p) => [p.name, p.sold]),
        (v) => String(v),
      ),
  },
  product_views: {
    t: 'People who looked at each product yesterday',
    render: () =>
      hbars(
        S.products
          .filter((p) => p.views)
          .sort((a, b) => b.views - a.views)
          .slice(0, 5)
          .map((p) => [p.name, p.views]),
        (v) => String(v),
      ),
  },
  money_status: {
    t: 'Money: received today vs still waiting',
    render: () => {
      const w = moneyWaiting().reduce((a, x) => a + x.amt, 0);
      return splitBar([
        ['Received today', MR.today.rec, 'ok'],
        ['Still waiting', w, 'warn'],
      ]);
    },
  },
  order_status: {
    t: 'Your orders right now',
    render: () => {
      const c = counts();
      return splitBar(
        [
          ['Done', c.done, 'ok'],
          ['To ship', c.toShip, 'neutral'],
          ['Not paid yet', c.unpaidOrders, 'warn'],
        ],
        String,
      );
    },
  },
  order_sources: {
    t: 'Where orders came from, last 30 days',
    render: () =>
      hbars(
        [
          ['WhatsApp', 46],
          ['Instagram', 31],
          ['Shop link', 15],
          ['In person', 8],
        ],
        (v) => v + '%',
      ),
  },
};
const ACTIONS = {
  open_orders_to_ship: {
    l: 'Open orders to ship',
    run: () => {
      ui.orderFilter = 'To ship';
      go('orders');
    },
  },
  open_unpaid: {
    l: 'See unpaid orders',
    run: () => {
      ui.orderFilter = 'Unpaid';
      go('orders');
    },
  },
  review_messages: {
    l: 'Review messages',
    run: () => {
      ui.chatTab = 'ready';
      ui.chatSrc = null;
      go('chats');
    },
  },
  open_money: { l: 'Open Money', run: () => go('money') },
  remind_unpaid: {
    l: 'Remind buyers who haven’t paid',
    run: () => {
      const n = moneyWaiting();
      confirmSheet(
        'Send UPI reminders?',
        `Stoora will send a polite UPI reminder on WhatsApp to ${n.map((x) => x.who.split(' ')[0]).join(' and ')}.`,
        'Send reminders',
        () => toast(`Reminders sent to ${n.length} buyers`, null, 'send'),
      );
    },
  },
  open_products: { l: 'Open products', run: () => go('products') },
  open_indigo: { l: 'Open Indigo kurta set', run: () => go('product-p3') },
  draft_post: { l: 'Prepare a post for me to check', run: () => openPostDraft() },
  open_analytics: { l: 'Open analytics', run: () => go('analytics') },
  open_bookings: { l: 'Open bookings', run: () => go('bookings') },
  create_order: { l: 'Create an order', run: () => go('create-order') },
};

/* ---------- 3. charts (always drawn from real data) ---------- */
function lineChart(xs, vs, label) {
  const W = 600,
    H = 210,
    pl = 56,
    pr = 18,
    pt = 16,
    pb = 30;
  const max = Math.ceil(Math.max(...vs) / 2000) * 2000 || 1;
  const X = (i) => pl + (i * (W - pl - pr)) / (vs.length - 1),
    Y = (v) => pt + (H - pt - pb) * (1 - v / max);
  const pts = vs.map((v, i) => [X(i), Y(v)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = line + ` L${X(vs.length - 1)} ${H - pb} L${pl} ${H - pb} Z`;
  const best = vs.indexOf(Math.max(...vs));
  return `<figure class="lchart" role="img" aria-label="${label}: ${xs.map((x, i) => x + ' ' + rs(vs[i])).join(', ')}"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
  ${[0, 0.5, 1].map((f) => `<line x1="${pl}" x2="${W - pr}" y1="${Y(max * f)}" y2="${Y(max * f)}" class="g"/><text x="${pl - 8}" y="${Y(max * f) + 4}" text-anchor="end" class="yl">${rs(max * f)}</text>`).join('')}
  <path d="${area}" class="ar"/><path d="${line}" class="ln"/>
  ${pts.map((p, i) => `<g class="pt ${i === vs.length - 1 ? 'end' : ''} ${i === best ? 'best' : ''}"><circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i === vs.length - 1 ? 5 : 3.5}"/><title>${xs[i]}: ${rs(vs[i])}</title></g>`).join('')}
  ${xs.map((x, i) => `<text x="${X(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" class="xl ${i === vs.length - 1 ? 'now' : ''}">${x}</text>`).join('')}
  <text x="${pts[vs.length - 1][0] - 8}" y="${pts[vs.length - 1][1] - 12}" text-anchor="end" class="vl">${rs(vs[vs.length - 1])}</text>
 </svg></figure>`;
}
function hbars(rows, fmt) {
  const m = Math.max(...rows.map((r) => r[1]), 1);
  return `<div class="stack tight" role="list">${rows.map(([l, v]) => `<div class="hbar" role="listitem"><div class="top2"><span>${esc(l)}</span><span class="num t-ink">${fmt(v)}</span></div><div class="trk"><i style="width:${((v / m) * 100).toFixed(1)}%"></i></div></div>`).join('')}</div>`;
}
function splitBar(parts, fmt = rs) {
  const tot = parts.reduce((a, p) => a + p[1], 0) || 1;
  return `<div class="split" role="img" aria-label="${parts.map((p) => p[0] + ' ' + fmt(p[1])).join(', ')}"><div class="sbar">${parts
    .filter((p) => p[1])
    .map(([l, v, k]) => `<i class="${k}" style="flex:${v}"></i>`)
    .join(
      '',
    )}</div><div class="slg">${parts.map(([l, v, k]) => `<span><i class="${k}"></i>${l} <b class="num">${fmt(v)}</b></span>`).join('')}</div></div>`;
}

/* ---------- 2. the assistant ---------- */
const SUGG = [
  'Give me today’s shop update',
  'Show my pending payments',
  'Which products need attention?',
  'Summarize my orders',
  'What should I do first today?',
];
function assistRules() {
  return `You are Stoora, the shop assistant inside the Stoora seller dashboard. You are talking to ${S.shop.owner}, who runs ${S.shop.name}, a small business in India. Many sellers have never used business software.
How to write: plain, warm English a 15-year-old understands. Short sentences. No jargon — if you need a metric, say it in everyday words (not "conversion rate" but "people who visited and bought"). No emoji. No exclamation marks. Money in rupees with Indian grouping, like ₹1,499 or ₹1,28,460.
Truth: use ONLY the numbers and names in SHOP DATA. Never invent figures, products, buyers or comparisons. If the data does not cover the question, say so plainly and name what is missing (see notAvailable). You cannot send messages, post, change prices or change anything yourself — you can only suggest one action button, and the seller decides.
Reply with ONLY one JSON object, no other text:
{"answer": "1-2 sentences that directly answer the question",
 "facts": ["up to 4 short facts with real numbers from SHOP DATA"],
 "chart": one of ${JSON.stringify(Object.keys(DATASETS))} or null — only when a picture truly helps,
 "chartNote": "one plain sentence on what the chart shows" or null,
 "next": "one recommended next step, in plain words" or null,
 "action": one of ${JSON.stringify(Object.keys(ACTIONS))} or null}
Example: {"answer":"Two buyers still owe you ₹2,699.","facts":["Rahul owes ₹1,499 for order #1011","Arjun owes ₹1,200 for his yoga session"],"chart":"money_status","chartNote":"Most of today’s money is in; a small part is still waiting.","next":"Send both a polite UPI reminder.","action":"remind_unpaid"}`;
}
function cleanRes(r) {
  if (!r || typeof r !== 'object') throw { code: 'invalid_json' };
  const s = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const a = s(r.answer);
  if (!a) throw { code: 'invalid_json' };
  return {
    answer: a,
    facts: Array.isArray(r.facts) ? r.facts.map(s).filter(Boolean).slice(0, 4) : [],
    chart: DATASETS[r.chart] ? r.chart : null,
    chartNote: s(r.chartNote),
    next: s(r.next),
    action: ACTIONS[r.action] ? r.action : null,
  };
}
/* Computed answers for when live AI is not available in this view. Labelled as such. */
function computedAnswer(q) {
  const t = q.toLowerCase();
  const w = moneyWaiting(),
    wt = w.reduce((a, x) => a + x.amt, 0),
    c = counts();
  const ready = S.chats.filter((x) => x.mood === 'ready' && x.unread).length;
  if (/pay|owe|money|waiting|pending/.test(t))
    return {
      answer: `${plural(w.length, 'buyer')} still owe you ${rs(wt)}.`,
      facts: w.map((x) => `${x.who} owes ${rs(x.amt)} (${x.ref})`),
      chart: 'money_status',
      chartNote: `You received ${rs(MR.today.rec)} today. ${rs(wt)} is still to come.`,
      next: 'Send a polite UPI reminder to each of them.',
      action: 'remind_unpaid',
    };
  if (/product|stock|attention|promote|sell/.test(t))
    return {
      answer: 'The indigo kurta set needs you most: 12 people looked at it yesterday and only 3 are left.',
      facts: S.products
        .filter((p) => p.stock <= 3)
        .map((p) => `${p.name}: ${p.stock === 0 ? 'sold out' : p.stock + ' left'}`),
      chart: 'product_views',
      chartNote: 'More people looked at the indigo kurta set yesterday than any other product.',
      next: 'Restock it, or post that only 3 are left.',
      action: 'draft_post',
    };
  if (/order|ship/.test(t))
    return {
      answer: `You have ${plural(c.toShip, 'order')} to ship and ${plural(c.unpaidOrders, 'order')} not paid yet.`,
      facts: S.orders
        .slice(0, 4)
        .map(
          (o) =>
            `#${o.id} · ${o.who} · ${rs(o.total)} · ${o.paid ? 'paid' : 'not paid'}${o.shipped ? ' · shipped' : ''}`,
        ),
      chart: 'order_status',
      chartNote: 'Most of your orders are paid and on their way.',
      next: 'Pack the paid order first.',
      action: 'open_orders_to_ship',
    };
  if (/first|focus|today|update|how/.test(t))
    return {
      answer: `Today you have made ${rs(8195)} so far — already more than all of yesterday (${rs(6940)}).`,
      facts: [
        `${plural(ready, 'buyer is', 'buyers are')} ready to buy, with replies drafted`,
        `${plural(c.toShip, 'paid order')} waiting to ship`,
        `${rs(wt)} still to be paid`,
      ],
      chart: 'sales_7d',
      chartNote: 'Saturday was your best day this week. Today is already your second best.',
      next: 'Reply to the buyers who are ready to buy, then ship the paid order.',
      action: 'review_messages',
    };
  return {
    answer:
      'Live answers aren’t available here, so Stoora can only answer the suggested questions from your shop’s numbers.',
    facts: [],
    chart: null,
    chartNote: null,
    next: null,
    action: null,
  };
}

let askCtl = null;
ask = async function (q) {
  q = String(q || '').trim();
  if (!q) return;
  const m = { q, status: 'thinking' };
  S.askLog.push(m);
  renderAsk();
  const sample = await SAMPLE_P;
  if (!sample || AI_OFF) {
    m.res = computedAnswer(q);
    m.computed = true;
    m.status = 'done';
    renderAsk();
    return;
  }
  const turns = [
    { role: 'user', content: assistRules() + '\n\nSHOP DATA (this seller only):\n' + JSON.stringify(bizSnapshot()) },
  ];
  S.askLog
    .filter((x) => x !== m && x.status === 'done' && !x.computed)
    .slice(-3)
    .forEach((p) => {
      turns.push({ role: 'user', content: p.q });
      turns.push({ role: 'assistant', content: JSON.stringify(p.res) });
    });
  turns.push({ role: 'user', content: q });
  askCtl = new AbortController();
  m.ctl = askCtl;
  try {
    m.res = cleanRes(await sample.json(turns, { modelTier: 'quick', cache: false, signal: askCtl.signal }));
    m.status = 'done';
  } catch (e) {
    if (e && e.code === 'cancelled') {
      m.status = 'stopped';
    } else {
      m.status = 'error';
      m.err = e && e.code;
      aiOffIf(m.err);
    }
  }
  renderAsk();
};
function resHTML(m) {
  const r = m.res;
  return `<p class="a-main">${esc(r.answer)}</p>
 ${r.facts.length ? `<ul class="a-facts">${r.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
 ${r.chart ? `<div class="a-chart"><p class="label">${DATASETS[r.chart].t}</p>${DATASETS[r.chart].render()}${r.chartNote ? `<p class="cap">${esc(r.chartNote)}</p>` : ''}</div>` : ''}
 ${r.next || r.action ? `<div class="a-next"><span class="label">${ic('arrow_forward', 'xs')}Next step</span>${r.next ? `<p class="t-soft">${esc(r.next)}</p>` : ''}${r.action ? `<button class="btn ink sm" data-act="ai-act" data-a="${r.action}">${ACTIONS[r.action].l}</button>` : ''}</div>` : ''}
 <p class="a-src">${m.computed ? `${ic('calculate', 'xs')}Worked out from your shop’s numbers. Live AI answers aren’t available in this view.` : `${ic('auto_awesome', 'xs')}Written by Stoora from your shop’s data. Check important numbers before acting.`}</p>`;
}
askPanelHTML = function (sheetMode) {
  const log = S.askLog;
  const busy = log.some((x) => x.status === 'thinking');
  return `<div class="askpanel">
  <div class="sheet-h" style="${sheetMode ? '' : 'padding:var(--s3)'};border-bottom:1px solid var(--line-soft)"><span class="smark" aria-hidden="true">S</span><div class="grow"><h2 class="ct" id="ask-t">Stoora</h2><p class="cap">Your shop assistant · answers from ${esc(S.shop.name)}’s data</p></div>${log.length ? `<button class="btn quiet sm" data-act="ask-clear">New chat</button>` : ''}${sheetBtnClose}</div>
  <div class="sheet-b" id="ask-log" style="padding-top:var(--s3);display:grid;gap:var(--s3);align-content:start" aria-live="polite">
   ${
     log.length
       ? log
           .map(
             (
               m,
             ) => `<div class="ans"><div class="qbubble">${esc(m.q)}</div><div class="abox"><div class="who"><span class="smark xs" aria-hidden="true">S</span>Stoora</div>
     ${
       m.status === 'thinking'
         ? `<div class="row"><span class="typing" aria-label="Stoora is working"><i></i><i></i><i></i></span><span class="cap grow">Reading your shop data and writing an answer…</span>${m.ctl ? '<button class="btn quiet sm" data-act="ask-stop">Stop</button>' : ''}</div>`
         : m.status === 'error'
           ? `<div class="banner warn">${ic('error')}<span>${aiErr(m.err)}</span></div>${AI_OFF ? '' : `<button class="btn line sm" data-act="ask" data-q="${esc(m.q)}">Try again</button>`}`
           : m.status === 'stopped'
             ? `<p class="cap">Stopped.</p>`
             : resHTML(m)
     }</div></div>`,
           )
           .join('')
       : `<div class="stack tight"><p class="t-ink" style="font-weight:500">Good ${dayPart()}, ${esc(S.shop.owner)}. What would you like to know?</p><p class="t-soft">Ask in your own words. I answer from your shop’s orders, payments, products and chats, and I tell you when I don’t have the numbers.</p></div>
    <div class="stack tight">${SUGG.map((q) => `<button class="trow" data-act="ask" data-q="${q}"><span class="grow t-soft">${q}</span>${ic('arrow_forward', 'sm t-cap')}</button>`).join('')}</div>`
   }
  </div>
  <form class="askbox" data-form="ask" style="margin:var(--s2) var(--s3) calc(var(--s3) + ${sheetMode ? 'env(safe-area-inset-bottom,0px)' : '0px'});flex:none"><label class="sr" for="ask-q">Ask Stoora</label><textarea id="ask-q" rows="1" placeholder="Ask about sales, orders, payments…" ${busy ? 'disabled' : ''}></textarea><div class="tools"><span class="cap grow">Stoora suggests. You decide.</span><button class="go" type="submit" aria-label="Ask" ${busy ? 'disabled' : ''}>${ic('arrow_upward', 'sm')}</button></div></form></div>`;
};
const dayPart = () => 'morning';

/* post draft: generated, editable, never posted by Stoora */
async function openPostDraft() {
  const p = S.products.find((x) => x.id === 'p3');
  setLayer(
    sheet(
      'pd',
      'Post draft — check before you share',
      `<p class="t-soft" style="margin-bottom:var(--s2)">Stoora can’t post to Instagram or WhatsApp for you yet. Edit this, copy it, and post it yourself.</p><label class="flabel" for="pd-t">Post text</label><textarea class="input" id="pd-t" rows="6" style="margin-top:var(--s1)">${aiReady() ? 'Writing…' : esc(`Only ${p.stock} left. Our indigo kurta set is hand block printed, and it softens with every wash. ₹${p.price.toLocaleString('en-IN')}. DM “INDIGO” to book yours.`)}</textarea><p class="cap" id="pd-n" style="margin-top:var(--s1)">${aiReady() ? 'Stoora is writing a draft from your product details.' : 'A starting point from your product details. Change anything you like.'}</p>`,
      `<button class="btn line" data-act="close">Dismiss</button><button class="btn ink" data-act="copy" data-from="#pd-t">${ic('content_copy')}Copy text</button>`,
    ),
    '#pd-t',
  );
  if (!aiReady()) return;
  try {
    const { text } = await SAMPLE(
      `Write a short Instagram caption (max 50 words) for a small Indian clothing shop called ${S.shop.name}. Product: ${p.name}, price ₹${p.price.toLocaleString('en-IN')}, only ${p.stock} left in stock. Plain, warm English. No emoji, no hashtags, no exclamation marks. End with: DM "INDIGO" to book yours. Reply with only the caption.`,
      { modelTier: 'quick' },
    );
    const t = $('#pd-t');
    if (t) {
      t.value = text.trim();
      $('#pd-n').textContent = 'Written by Stoora. Change anything you like before you post it.';
    }
  } catch (e) {
    const t = $('#pd-t');
    if (t) {
      t.value = `Only ${p.stock} left. Our indigo kurta set is hand block printed. ₹${p.price.toLocaleString('en-IN')}. DM “INDIGO” to book yours.`;
      $('#pd-n').textContent = aiErr(e && e.code) + ' Here is a simple draft instead.';
    }
  }
}
function confirmSheet(title, body, yes, fn) {
  ui._confirm = fn;
  setLayer(
    sheet(
      'cf',
      title,
      `<p class="t-soft">${body}</p>`,
      `<button class="btn line" data-act="close">Not now</button><button class="btn ink" data-act="confirm-yes">${yes}</button>`,
    ),
    '[data-act="confirm-yes"]',
  );
}

/* ---------- Home: calm, assistant-first ---------- */
function attentionItems() {
  const items = [];
  const w = moneyWaiting();
  const c = counts();
  const ready = S.chats.filter((x) => x.mood === 'ready' && x.unread);
  const upset = S.chats.filter((x) => x.mood === 'upset' && x.unread);
  const r = S.orders.find((o) => !o.paid && o.pay !== 'cod');
  if (r)
    items.push({
      i: 'currency_rupee',
      k: 'pay',
      t: `${r.who.split(' ')[0]} hasn’t paid ${rs(r.total)} for order #${r.id} yet.`,
      b: 'Send reminder',
      a: `data-act="remind" data-who="${esc(r.who)}"`,
    });
  if (ready.length)
    items.push({
      i: 'forum',
      k: 'chat',
      t: `${plural(ready.length, 'buyer is', 'buyers are')} ready to buy. Replies are drafted for you.`,
      b: 'Review messages',
      a: 'data-act="ai-act" data-a="review_messages"',
    });
  if (upset.length)
    items.push({
      i: 'sentiment_dissatisfied',
      k: 'chat',
      t: `${upset[0].who.split(' ')[0]} is upset about a late parcel.`,
      b: 'Reply now',
      a: `data-go="chat-${upset[0].id}"`,
    });
  if (c.toShip)
    items.push({
      i: 'local_shipping',
      k: 'shop',
      t: `${plural(c.toShip, 'paid order is', 'paid orders are')} waiting to be shipped.`,
      b: 'Ship it',
      a: 'data-act="ai-act" data-a="open_orders_to_ship"',
    });
  const low = S.products
    .filter((p) => p.status === 'Active' && p.stock > 0 && p.stock <= 3)
    .sort((a, b) => (b.views || 0) - (a.views || 0))[0];
  if (low)
    items.push({
      i: 'inventory_2',
      k: 'reel',
      t: `${low.name}: ${low.views ? low.views + ' people looked yesterday and ' : ''}only ${low.stock} left.`,
      b: 'See product',
      a: `data-go="product-${low.id}"`,
    });
  return items.slice(0, 4);
}
function homeCalm() {
  if (S.newShop) return newShopScreen();
  const att = attentionItems();
  const ideas = S.ideas.filter((i) => !S.ideasGone.includes(i.id));
  const w = moneyWaiting();
  const wt = w.reduce((a, x) => a + x.amt, 0);
  const c = counts();
  const d = SALES7();
  const best = d.v.indexOf(Math.max(...d.v.slice(0, 6)));
  const upcoming = S.bookings.filter((b) => b.status === 'Upcoming');
  return {
    title: 'Home',
    crumbTitle: 'Home',
    body: `
 <div class="phead anim home-head"><div class="l"><span class="eyebrow">Tuesday, 27 October · ${esc(S.shop.name)}</span><h1 class="h1">Good morning, ${esc(S.shop.owner)}</h1><p class="t-body">Here’s what is happening in your shop today.</p></div>
  <div class="r"><span class="live"><i></i>2 people on your shop now</span></div></div>
 <section class="card assist anim" style="--i:1" aria-labelledby="as-h">
  <div class="as-grid">
   <div class="as-l">
    <div class="as-who"><span class="smark" aria-hidden="true">S</span><div><h2 class="ct" id="as-h">Your shop today</h2><p class="cap">From Stoora, your shop assistant · checked at 7:30 am</p></div></div>
    <p class="brief">Yesterday you made <b class="num">${rs(6940)}</b> from 5 orders. Today you’ve made <b class="num">${rs(8195)}</b> so far — already more than all of yesterday.</p>
    <h3 class="label as-lbl">Needs your attention · ${att.length}</h3>
    ${att.length ? `<ul class="attn">${att.map((x, n) => `<li class="anim" style="--i:${n + 2}"><span class="ic ${x.k}">${ic(x.i, 'sm')}</span><span class="grow">${x.t}</span><button class="btn line sm" ${x.a}>${x.b}</button></li>`).join('')}</ul>` : `<p class="t-soft">Nothing needs you right now. Stoora is keeping an eye on the shop.</p>`}
   </div>
   <div class="as-r">
    <form class="askbox" data-form="home-ask"><label class="flabel" for="home-q" style="display:block;margin-bottom:var(--s1)">Ask Stoora anything about your shop</label><textarea id="home-q" rows="2" placeholder="How did I do this week?"></textarea>
     <div class="tools"><span class="cap grow">Answers come from your shop’s numbers</span><button class="go" type="submit" aria-label="Ask">${ic('arrow_upward', 'sm')}</button></div></form>
    <div class="sugg2">${SUGG.map((q) => `<button data-act="ask" data-q="${q}">${q}</button>`).join('')}</div>
    <p class="cap as-note">${ic('verified_user', 'xs')}Stoora suggests. Nothing is sent, posted or changed until you tap.</p>
   </div>
  </div>
 </section>
 <div class="home-row">
  <section class="card anim" style="--i:3" aria-labelledby="gl-h"><div class="card-h"><h2 class="ct" id="gl-h">Today at a glance</h2></div>
   <dl class="glance">
    <div><dt>Sales today</dt><dd class="big num">${cnt(8195, '₹')}</dd><dd class="cap">Orders placed today, paid or not. Yesterday: ${rs(6940)}.</dd></div>
    <div><dt>Waiting for payment</dt><dd class="big num">${cnt(wt, '₹')}</dd><dd class="cap">${plural(w.length, 'buyer hasn’t', 'buyers haven’t')} paid yet. <a class="link" href="#money">See who</a></dd></div>
    <div><dt>Orders to ship</dt><dd class="big num">${cnt(c.toShip)}</dd><dd class="cap">Paid and ready to pack. <a class="link" href="#orders" data-filter="To ship">Open</a></dd></div>
   </dl></section>
  <section class="card anim" style="--i:4" aria-labelledby="ch-h"><div class="card-h"><h2 class="ct" id="ch-h">Your sales this week</h2><a class="link cap" href="#analytics">More${ic('chevron_right', 'xs')}</a></div>
   ${lineChart(d.x, d.v, 'Sales over the last 7 days')}
   <p class="cap">${d.x[best]} was your best day (${rs(d.v[best])}). Today is still going, and it’s already your second best.</p></section>
 </div>
 <div class="home-row">
  <section class="card anim" style="--i:5" aria-labelledby="id-h"><div class="card-h"><h2 class="ct" id="id-h">${ic('lightbulb')}Ideas from Stoora</h2><span class="cap">${ideas.length ? plural(ideas.length, 'idea') + ' to approve' : 'All done'}</span></div>
   ${
     ideas.length
       ? `<div class="stack tight" id="ideas">${ideas.map((i) => `<div class="idea" id="idea-${i.id}"><p>${i.text}</p><div class="row" style="flex-wrap:wrap;gap:var(--s1)">${bdg('ok', 'trending_up', 'Could earn ' + rs(i.earn))}${i.cost ? bdg('neutral', 'payments', 'Costs ' + rs(i.cost)) : bdg('neutral', 'money_off', 'Costs nothing')}<span class="grow"></span><button class="btn quiet sm" data-act="idea-no" data-id="${i.id}">Not now</button><button class="btn ink sm" data-act="idea-yes" data-id="${i.id}">${i.act}</button></div></div>`).join('')}</div><p class="cap" style="margin-top:var(--s2)">“Could earn” is Stoora’s estimate, not a promise.</p>`
       : `<p class="t-soft">You’ve handled today’s ideas. New ones come tomorrow at 7:30 am.</p>`
   }</section>
  <section class="card anim" style="--i:6" aria-labelledby="up-h"><div class="card-h"><h2 class="ct" id="up-h">${ic('event')}Coming up</h2><a class="link cap" href="#bookings">All bookings${ic('chevron_right', 'xs')}</a></div>
   ${upcoming.length ? `<div class="rows">${upcoming.map((b) => `<a class="li" href="#booking-${b.id}" style="background:var(--inner)">${av(b.who)}<span class="grow"><span class="t">${prod(b.svc).name}</span><span class="s">${b.when} · ${b.who}</span></span>${b.paid ? bdg('ok', 'check_circle', 'Paid') : bdg('warn', 'schedule', 'Unpaid')}</a>`).join('')}</div>` : `<p class="t-soft">No bookings coming up.</p>`}</section>
 </div>`,
  };
}
SCREENS.home.fn = homeCalm;

/* ---------- navigation: grouped, with plain descriptions ---------- */
const NAVG = [
  [
    'My business',
    [
      { r: 'home', i: 'home', l: 'Home', d: 'Today’s summary and what needs you' },
      {
        r: 'orders',
        i: 'inbox',
        l: 'Orders',
        d: 'Orders and bookings from every place',
        cnt: () => S.orders.filter((o) => !o.shipped && o.pay !== 'cash').length,
        sub: [{ r: 'bookings', l: 'Bookings' }],
      },
      {
        r: 'products',
        i: 'sell',
        l: 'Products',
        d: 'What you sell and how much stock is left',
        sub: [{ r: 'services', l: 'Services' }],
      },
      { r: 'customers', i: 'group', l: 'Customers', d: 'People who bought or booked with you' },
    ],
  ],
  [
    'Selling',
    [
      { r: 'storefront', i: 'storefront', l: 'Storefront', d: 'Your shop page and its link' },
      { r: 'about', i: 'public', l: 'Website', d: 'The public stoora.in website' },
      { r: 'offers', i: 'local_offer', l: 'Discounts & offers', d: 'Codes and offers for your buyers' },
    ],
  ],
  [
    'Money and insights',
    [
      { r: 'money', i: 'account_balance_wallet', l: 'Money', d: 'Payments received and money still owed' },
      { r: 'analytics', i: 'bar_chart', l: 'Analytics', d: 'How your sales are doing over time' },
    ],
  ],
];
function navOn(n) {
  const t = tabOf(route);
  if (n.r === 'chats') return t === 'chats' && (ui.chatSrc || '') === (n.src || '');
  return t === n.r && !(n.sub || []).some((s) => s.r === route);
}
sideHTML = function () {
  const t = tabOf(route);
  const item = (n) => {
    const c = n.cnt ? n.cnt() : 0;
    const on = navOn(n);
    return (
      `<a class="nav ${on ? 'on' : ''}" href="#${n.r}" ${n.src !== undefined ? `data-chatsrc="${n.src}"` : ''} ${on ? 'aria-current="page"' : ''} title="${n.l} — ${n.d}">${ic(n.i)}<span class="lbl">${n.l}</span>${c ? `<span class="cnt ${n.hot ? 'hot' : ''}" aria-label="${c} new">${c}</span>` : ''}</a>` +
      (n.sub && t === n.r
        ? n.sub.map((s) => `<a class="nav sub ${route === s.r ? 'on' : ''}" href="#${s.r}">${s.l}</a>`).join('')
        : '')
    );
  };
  return `<div class="side-in">
  <a class="brand" href="#home" aria-label="stoora.in home"><span class="appicon" aria-hidden="true">S</span><span class="wordmark">stoora<i>.in</i></span></a>
  <button class="sbtn-search" data-act="search" title="Search">${ic('search', 'sm')}<span class="txt">Search</span><kbd>Ctrl K</kbd></button>
  ${NAVG.map(([g, items]) => `<div class="ngroup">${g}</div>${items.map(item).join('')}`).join('')}
  <div class="ngroup">Account</div>
  <a class="nav ${t === 'shop-settings' ? 'on' : ''}" href="#shop-settings" title="Settings — Shop details, payments and shipping">${ic('settings')}<span class="lbl">Settings</span></a>
  <button class="nav" data-act="logout" title="Log out" style="width:100%;text-align:left">${ic('logout')}<span class="lbl">Log out</span></button>
  <div class="side-foot"><button class="shopbtn" data-act="alerts" title="Alerts"><span class="shop-av" aria-hidden="true">${esc(S.shop.name[0].toUpperCase())}</span><span class="txt grow"><b>${esc(S.shop.name)}</b><small>stoora.in/${esc(S.shop.handle)}</small></span><span class="ms sm txt" aria-hidden="true">notifications</span></button></div></div>`;
};
openMenu = function () {
  const t = tabOf(route);
  setLayer(
    `<div class="drawer" role="dialog" aria-modal="true" aria-label="Menu"><nav class="panel" aria-label="Main">
  <div class="brand" style="padding-left:var(--s2)"><span class="appicon" aria-hidden="true">S</span><span class="wordmark" style="color:var(--on-ink)">stoora<i>.in</i></span></div>
  <button class="sbtn-search" data-act="search" style="margin:var(--s1) 0 var(--s2)">${ic('search', 'sm')}Search everything</button>
  ${NAVG.map(([g, items]) => `<div class="ngroup">${g}</div>${items.map((n) => `<a class="nav dnav ${navOn(n) ? 'on' : ''}" href="#${n.r}" ${n.src !== undefined ? `data-chatsrc="${n.src}"` : ''}>${ic(n.i)}<span class="grow"><span>${n.l}</span><small>${n.d}</small></span></a>`).join('')}`).join('')}
  <div class="ngroup">Account</div><a class="nav dnav" href="#shop-settings">${ic('settings')}<span class="grow"><span>Settings</span><small>Shop details, payments and shipping</small></span></a>
  <button class="nav dnav" data-act="logout" style="width:100%;text-align:left">${ic('logout')}<span class="grow"><span>Log out</span></span></button>
  <div class="ngroup">Design review</div><a class="nav" href="#design-system">${ic('palette')}Design system and screens</a>
  <div class="foot"><button class="btn" data-act="close" aria-label="Close menu" style="padding:0 var(--s3)">${ic('close')}Close</button></div>
 </nav><div class="peek" data-act="close" aria-hidden="true"></div></div>`,
    'a.nav.on',
  );
};
document.addEventListener(
  'click',
  (e) => {
    const a = e.target.closest && e.target.closest('[data-chatsrc]');
    if (a) ui.chatSrc = a.dataset.chatsrc || null;
  },
  true,
);

/* ---------- Create order: choose a way ---------- */
function chooserScreen() {
  return {
    title: 'Create order',
    crumb: [['Orders', 'orders']],
    back: ['Orders', 'orders'],
    narrow: true,
    body: `
 <div class="phead anim"><div class="l"><h1 class="h1">Create order</h1><p class="t-body">For orders that came by phone, chat or in person. Orders from your shop link arrive on their own.</p></div></div>
 <div class="choose">
  <a class="card choice anim" style="--i:1" href="#create-order-manual"><span class="ic shop">${ic('edit_note')}</span><span class="grow"><h2 class="ct">Add it yourself</h2><span class="t-soft">You know the buyer, the products and the price. Fill in a short form.</span></span>${ic('arrow_forward', 't-cap')}</a>
  <a class="card choice ai anim" style="--i:2" href="#create-order-ai"><span class="ic chat">${ic('auto_awesome')}</span><span class="grow"><h2 class="ct">Create order with AI</h2><span class="t-soft">Got an order through a chat or a call? Paste the chat or upload a screenshot. Stoora prepares a draft, and you check it before anything is added.</span></span>${ic('arrow_forward', 't-cap')}</a>
 </div>
 <p class="cap anim" style="--i:3;margin-top:var(--s3)">Both ways end the same: an order in your list, only after you approve it.</p>`,
  };
}
SCREENS['create-order'].fn = chooserScreen;

/* ---------- manual order: sizes, shipping, notes ---------- */
const sub = (d) => d.items.reduce((a, [p, q]) => a + prod(p).price * q, 0);
function manualScreen() {
  const d = ui.draft;
  d.ship = d.ship ?? '';
  d.notes = d.notes ?? '';
  const lines = d.items.map(([id, q, sz]) => [prod(id), q, sz || '']);
  const subtotal = sub(d);
  const ship = toNum(d.ship);
  const PAY = [
    ['paid', 'Paid already', 'The buyer has paid you by UPI or cash.'],
    ['upi', 'Send UPI link', 'Stoora sends a UPI link on WhatsApp. It’s marked paid when the money arrives.'],
    ['cod', 'Cash on delivery', 'Collect the money when the parcel reaches the buyer.'],
  ];
  const req = '<span class="req">Required</span>',
    opt = '<span class="opt">Optional</span>';
  return {
    title: 'Add order yourself',
    crumbTitle: 'Add it yourself',
    crumb: [
      ['Orders', 'orders'],
      ['Create order', 'create-order'],
    ],
    back: ['Create order', 'create-order'],
    body: `
 <div class="phead anim"><div class="l"><h1 class="h1">Add order yourself</h1><p class="t-body">Three short steps. Fields marked required must be filled.</p></div></div>
 <form class="form2" data-form="create2" novalidate><div>
  <section class="card anim stack" style="--i:1"><h2 class="ct"><span class="stepno">1</span>Buyer</h2>
   <div class="field"><label for="co-who">Buyer’s name ${req}</label><input class="input ${d.errors.who ? 'bad' : ''}" id="co-who" autocomplete="name" value="${esc(d.who)}" data-draft="who" placeholder="Priya Sharma" ${d.errors.who ? 'aria-invalid="true" aria-describedby="co-who-e"' : ''}>${d.errors.who ? `<span class="err" id="co-who-e">${ic('error', 'xs')}Add the buyer’s name.</span>` : ''}</div>
   <div class="field"><label for="co-ph">WhatsApp number ${opt}</label><input class="input" id="co-ph" type="tel" inputmode="tel" autocomplete="tel" value="${esc(d.phone)}" data-draft="phone" placeholder="+91 98480 21234"><span class="hint">Stoora sends the order confirmation here.</span></div>
   <div class="field"><span class="flabel" id="co-src-l">Where did this order come from? ${req}</span><div class="chips wrap" role="radiogroup" aria-labelledby="co-src-l">${['WhatsApp', 'Instagram', 'Phone call', 'In person', 'Other'].map((s) => `<button type="button" role="radio" aria-checked="${(d.src || 'WhatsApp') === s}" class="chip ${(d.src || 'WhatsApp') === s ? 'on' : ''}" data-act="co-src" data-v="${s}">${ic(SRC[s] || (s === 'Phone call' ? 'call' : 'more_horiz'), 'xs')}${s}</button>`).join('')}</div></div>
  </section>
  <section class="card anim" style="--i:2"><div class="card-h"><h2 class="ct"><span class="stepno">2</span>Products ${req}</h2><button type="button" class="btn line sm" data-act="picker">${ic('add')}Add products</button></div>
   ${
     lines.length
       ? `<div class="rows">${lines
           .map(
             (
               [p, q, sz],
               n,
             ) => `<div class="li co-line" style="background:var(--inner);flex-wrap:wrap"><span class="thumb sm">${ic(p.icon, 'sm')}</span><span class="grow" style="min-width:140px"><span class="t">${p.name}</span><span class="s num">${rs(p.price)} each · ${p.stock} in stock</span></span>
     ${p.sizes && p.sizes.length ? `<label class="sr" for="co-sz-${n}">Size for ${p.name}</label><select class="input sel-sm ${d.errors['size' + n] ? 'bad' : ''}" id="co-sz-${n}" data-cosize="${n}"><option value="">Size…</option>${p.sizes.map((s) => `<option ${s === sz ? 'selected' : ''}>${s}</option>`).join('')}</select>` : ''}
     <span class="step" role="group" aria-label="Quantity of ${p.name}"><button type="button" data-act="co-qty" data-id="${p.id}" data-d="-1" aria-label="One less">${ic(q > 1 ? 'remove' : 'delete', 'xs')}</button><output class="num">${q}</output><button type="button" data-act="co-qty" data-id="${p.id}" data-d="1" aria-label="One more" ${q >= p.stock ? 'disabled' : ''}>${ic('add', 'xs')}</button></span>
     <span class="money">${rs(p.price * q)}</span>${d.errors['size' + n] ? `<span class="err" style="width:100%">${ic('error', 'xs')}Pick a size.</span>` : ''}</div>`,
           )
           .join('')}</div>`
       : `<div class="inner" style="text-align:center;padding:var(--s4) var(--s3)"><p class="t-soft">No products yet.</p><p class="cap">Add what the buyer wants. Stock goes down when you create the order.</p>${d.errors.items ? `<p class="err" style="justify-content:center;margin-top:var(--s1)">${ic('error', 'xs')}Add at least one product.</p>` : ''}</div>`
   }
  </section>
  <section class="card anim stack" style="--i:3"><h2 class="ct" id="co-pay-l"><span class="stepno">3</span>Payment and delivery</h2>
   <div class="stack tight" role="radiogroup" aria-labelledby="co-pay-l">${PAY.map(([k, l, s]) => `<button type="button" role="radio" aria-checked="${d.pay === k}" class="trow radio ${d.pay === k ? 'on' : ''}" data-act="co-pay" data-v="${k}"><span class="rdot" aria-hidden="true">${d.pay === k ? ic('check', 'xs') : ''}</span><span class="grow"><span class="t">${l}</span><span class="s">${s}</span></span></button>`).join('')}</div>
   <div class="grid2"><div class="field"><label for="co-ship">Delivery charge ${opt}</label><div class="affix"><span aria-hidden="true">₹</span><input id="co-ship" inputmode="numeric" data-draft="ship" value="${esc(d.ship)}" placeholder="0"></div><span class="hint">Leave empty for free delivery.</span></div>
   <div class="field"><label for="co-notes">Notes ${opt}</label><input class="input" id="co-notes" data-draft="notes" value="${esc(d.notes)}" placeholder="Gift wrap, deliver after 6 pm"></div></div>
  </section>
 </div><div>
  <section class="card anim stack" style="--i:4;position:sticky;top:80px" id="co-sum">${manualSummary()}</section>
 </div></form>`,
  };
}
function manualSummary() {
  const d = ui.draft;
  const s = sub(d),
    sh = toNum(d.ship);
  return `<h2 class="ct">Summary</h2><div class="kv">${d.items.map(([p, q, sz]) => `<div class="r"><span>${prod(p).name}${sz ? ' · ' + sz : ''} × ${q}</span><span>${rs(prod(p).price * q)}</span></div>`).join('') || '<div class="r"><span>No products yet</span><span>₹0</span></div>'}
  <div class="r"><span>Delivery</span><span>${sh ? rs(sh) : 'Free'}</span></div><div class="r t"><span>Total</span><span>${rs(s + sh)}</span></div></div>
  <button class="btn primary full" type="submit" ${ui.busy ? 'disabled' : ''}>${ui.busy ? '<span class="spin"></span>Creating…' : d.pay === 'upi' ? 'Create and send UPI link' : 'Create order'}</button>
  <a class="btn quiet full" href="#create-order">Back</a>`;
}
SCREENS['create-order-manual'] = { fn: manualScreen };
function createManual() {
  if (ui.busy) return;
  const d = ui.draft;
  d.errors = {};
  if (!d.who.trim()) d.errors.who = 1;
  if (!d.items.length) d.errors.items = 1;
  d.items.forEach(([p, q, sz], n) => {
    const P = prod(p);
    if (P.sizes && P.sizes.length && !sz) d.errors['size' + n] = 1;
  });
  if (Object.keys(d.errors).length) {
    render(false);
    const f = $('[aria-invalid="true"],.input.bad,[data-act="picker"]');
    f && f.focus();
    toast('Fill in the highlighted fields', null, 'error');
    return;
  }
  ui.busy = true;
  render(false);
  setTimeout(() => {
    const o = addOrder({
      who: d.who.trim(),
      phone: d.phone,
      items: d.items,
      pay: d.pay,
      src: d.src || 'WhatsApp',
      ship: toNum(d.ship),
      notes: d.notes,
      how: 'manual',
    });
    ui.busy = false;
    ui.draft = { who: '', phone: '', items: [], pay: 'paid', errors: {} };
    ui.dirty = false;
    location.hash = 'order-' + o.id;
    toast(d.pay === 'upi' ? `Order #${o.id} created. UPI link sent.` : `Order #${o.id} created`);
  }, 350);
}
/* One place that adds an order and takes stock down once. In production: POST /orders. */
function addOrder({ who, phone, items, pay, src, ship = 0, notes = '', how, city = '', address = '' }) {
  const id = S.nextOrder++;
  const total = items.reduce((a, [p, q]) => a + prod(p).price * q, 0) + ship;
  const o = {
    id,
    who,
    phone,
    items: items.map((x) => [...x]),
    total,
    ship,
    notes,
    paid: pay === 'paid',
    pay: pay === 'cod' ? 'cod' : 'upi',
    shipped: false,
    src,
    srcDetail: src,
    when: 'Just now',
    city: city || '—',
    address,
    how,
  };
  S.orders.unshift(o);
  items.forEach(([p, q]) => {
    const x = S.products.find((y) => y.id === p);
    if (x) x.stock = Math.max(0, x.stock - q);
  });
  return o;
}

/* ---------- AI order: input → reading → review → approve → done ---------- */
const EXAMPLE_CHAT = `[27/10/26, 9:12 am] Priya Sharma: Hi, I need two blue kurtas in size M
[27/10/26, 9:12 am] Priya Sharma: Can you deliver to Hyderabad? Banjara Hills
[27/10/26, 9:13 am] Priya Sharma: My name is Priya Sharma. Please tell me the total price
[27/10/26, 9:20 am] Meera Studio: Hi Priya, sure. Checking stock now
[27/10/26, 9:21 am] Priya Sharma: I can pay by UPI once you confirm`;
const AUDIO = /\.(mp3|m4a|aac|ogg|opus|wav|amr|3gp|webm)$/i,
  IMG = /^image\/(png|jpe?g|webp|gif)$/;
function aiState() {
  return (
    ui.ai ||
    (ui.ai = {
      stage: 'input',
      mode: 'paste',
      text: '',
      src: 'WhatsApp',
      files: [],
      fileNote: null,
      err: null,
      draft: null,
      steps: [],
      busy: false,
    })
  );
}
function aiStepsHTML(a) {
  const S0 = [
    ['Reading the conversation', 'read'],
    ['Finding the buyer, products, quantities and delivery details', 'ai'],
    ['Checking against your product catalog', 'match'],
  ];
  return `<ol class="psteps">${S0.map(([l, k]) => {
    const st = a.steps.find((x) => x.k === k);
    const s = st ? st.s : 'wait';
    return `<li class="${s}"><span class="pi">${s === 'done' ? ic('check', 'xs') : s === 'on' ? '<span class="spin dark"></span>' : ''}</span>${l}${s === 'on' && k === 'ai' ? '<span class="cap"> · usually 10–40 seconds</span>' : ''}</li>`;
  }).join('')}</ol>`;
}
function aiScreen() {
  const a = aiState();
  const stepper = `<ol class="flow" aria-label="Steps">${[
    'Add the chat',
    'Stoora reads it',
    'You review',
    'Order created',
  ]
    .map((l, i) => {
      const cur = { input: 0, reading: 1, error: 0, review: 2, done: 3 }[a.stage];
      return `<li class="${i < cur ? 'done' : i === cur ? 'on' : ''}" ${i === cur ? 'aria-current="step"' : ''}><span>${i < cur ? ic('check', 'xs') : i + 1}</span>${l}</li>`;
    })
    .join('')}</ol>`;
  let body = '';
  if (a.stage === 'input' || a.stage === 'error') {
    const imgs = !!(SAMPLE_LIM && SAMPLE_LIM.images);
    body = `${a.stage === 'error' ? `<div class="banner bad anim" role="alert">${ic('error')}<span>${esc(a.err)}</span></div>` : ''}
  ${SAMPLE === null || AI_OFF ? `<div class="banner warn anim">${ic('info')}<span><b>AI isn’t available in this view.</b> Stoora reads chats with Claude, which needs this page to be opened in Claude with permission to use it. You can still <a class="link" href="#create-order-manual" style="color:inherit;text-decoration:underline">add the order yourself</a>.</span></div>` : ''}
  <section class="card anim stack" style="--i:1"><h2 class="ct">How did the order come in?</h2>
   <div class="seg ai-seg" role="tablist" aria-label="Input type">${[
     ['paste', 'Paste a chat', 'content_paste'],
     ['file', 'Upload a file', 'upload_file'],
     ['call', 'Phone call', 'call'],
   ]
     .map(
       ([k, l, i]) =>
         `<button type="button" role="tab" aria-selected="${a.mode === k}" class="${a.mode === k ? 'on' : ''}" data-act="ai-mode" data-v="${k}">${ic(i, 'xs')}${l}</button>`,
     )
     .join('')}</div>
   ${
     a.mode === 'paste'
       ? `<div class="field"><label for="ai-text">Paste the conversation</label><textarea class="input" id="ai-text" rows="9" data-ai="text" placeholder="Copy the messages from WhatsApp or Instagram and paste them here.">${esc(a.text)}</textarea><span class="hint">Include the messages about what they want, sizes, and where to deliver. <button type="button" class="link" data-act="ai-example">Use an example chat</button></span></div>`
       : a.mode === 'file'
         ? `<div class="drop" id="ai-drop">${ic('upload_file', 'lg t-soft')}<span class="t-ink" style="font-weight:500">${a.files.length ? esc(a.files.map((f) => f.name).join(', ')) : 'Choose a file'}</span><span class="cap">WhatsApp chat export (.txt)${imgs ? ' or chat screenshots (PNG, JPG, up to ' + SAMPLE_LIM.images.maxCount + ')' : ''}. In WhatsApp: open the chat › More › Export chat › Without media.</span><input type="file" id="ai-file" accept=".txt,text/plain${imgs ? ',' + SAMPLE_LIM.images.mediaTypes.join(',') : ''},audio/*" ${imgs ? 'multiple' : ''} aria-label="Choose a chat file"></div>${a.fileNote ? `<div class="banner ${a.fileNote.k}">${ic(a.fileNote.k === 'ok' ? 'check_circle' : 'info')}<span>${a.fileNote.t}</span></div>` : ''}`
         : `<div class="banner info">${ic('mic_off')}<span><b>Call recordings can’t be turned into text yet.</b> That needs a speech-to-text service on Stoora’s servers, which isn’t connected. For now, type or paste what the buyer said, or a transcript from your phone’s recorder app.</span></div>
     <div class="field"><label for="ai-text">What did the buyer say?</label><textarea class="input" id="ai-text" rows="7" data-ai="text" placeholder="Rahul called. Wants 1 silk dupatta, maroon. Lives in Lucknow. Will pay cash on delivery.">${esc(a.text)}</textarea></div>`
   }
   <div class="field"><label for="ai-src">Where did it come from?</label><select class="input" id="ai-src" data-ai="src">${['WhatsApp', 'Instagram', 'Phone call', 'In person', 'Other'].map((s) => `<option ${a.src === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
  </section>
  <p class="prev-note anim" style="--i:2">${ic('lock')}<span>Share only chats you’re allowed to. Stoora reads this to prepare a draft and doesn’t message the buyer. If you recorded a call, getting the buyer’s consent is your responsibility. In this preview nothing is saved on a server.</span></p>
  <div class="btns anim" style="--i:3"><button class="btn primary" data-act="ai-run" ${SAMPLE === null || AI_OFF ? 'disabled' : ''}>${ic('auto_awesome')}Prepare order draft</button><a class="btn quiet" href="#create-order">Back</a></div>`;
  }
  if (a.stage === 'reading')
    body = `<section class="card anim pad-lg stack" style="--i:1" aria-live="polite"><div class="as-who"><span class="smark" aria-hidden="true">S</span><div><h2 class="ct">Stoora is reading the chat</h2><p class="cap">Nothing is added to your orders until you approve it.</p></div></div>${aiStepsHTML(a)}<button class="btn line sm" data-act="ai-stop" style="justify-self:start">Stop</button></section>`;
  if (a.stage === 'review') body = reviewHTML(a);
  if (a.stage === 'done')
    body = `<section class="card pad-lg anim stack done-card" style="--i:1" role="status"><span class="ic big-ok">${ic('check_circle', 'lg')}</span><h2 class="h2">Order created successfully.</h2><p class="t-soft">Order <b class="t-ink">#${a.created}</b> is now in your orders list, marked as coming from ${esc(a.src)}.</p><div class="btns"><a class="btn ink" href="#order-${a.created}">View order #${a.created}</a><button class="btn line" data-act="ai-new">Create another</button></div></section>`;
  return {
    title: 'Create order with AI',
    crumbTitle: 'Create with AI',
    crumb: [
      ['Orders', 'orders'],
      ['Create order', 'create-order'],
    ],
    back: ['Create order', 'create-order'],
    body: `
 <div class="phead anim"><div class="l"><h1 class="h1">${a.stage === 'review' ? 'Review AI-prepared order' : 'Create order with AI'}</h1><p class="t-body">${a.stage === 'review' ? 'Stoora has organized the order details. Please check them before adding this order to your list.' : 'Got an order through a chat or a call? Let Stoora prepare it for you.'}</p></div></div>
 ${stepper}<div class="stack">${body}</div>`,
    after: () => bindAiDrop(),
  };
}
SCREENS['create-order-ai'] = { fn: aiScreen };
function bindAiDrop() {
  const z = $('#ai-drop');
  if (!z) return;
  ['dragenter', 'dragover'].forEach((n) =>
    z.addEventListener(n, (e) => {
      e.preventDefault();
      z.classList.add('over');
    }),
  );
  ['dragleave', 'drop'].forEach((n) =>
    z.addEventListener(n, (e) => {
      e.preventDefault();
      z.classList.remove('over');
    }),
  );
  z.addEventListener('drop', (e) => takeFiles(e.dataTransfer.files));
}
function takeFiles(list) {
  const a = aiState();
  const fs = [...list];
  a.files = [];
  a.text = '';
  a.fileNote = null;
  if (!fs.length) return render(false);
  if (fs.some((f) => AUDIO.test(f.name) || /^audio\//.test(f.type))) {
    a.fileNote = {
      k: 'warn',
      t: 'Call recordings can’t be turned into text yet — speech-to-text isn’t connected. Choose “Phone call” and type what the buyer said, or upload a .txt transcript.',
    };
    return render(false);
  }
  const imgs = fs.filter((f) => IMG.test(f.type)),
    txts = fs.filter((f) => /\.txt$/i.test(f.name) || f.type === 'text/plain');
  if (imgs.length && !(SAMPLE_LIM && SAMPLE_LIM.images)) {
    a.fileNote = { k: 'warn', t: 'Screenshots can’t be read in this view. Paste the chat as text instead.' };
    return render(false);
  }
  if (!imgs.length && !txts.length) {
    a.fileNote = {
      k: 'warn',
      t:
        'That file type isn’t supported. Use a WhatsApp export (.txt)' +
        (SAMPLE_LIM && SAMPLE_LIM.images ? ' or PNG/JPG screenshots.' : '.') +
        ' A .zip export must be unzipped first.',
    };
    return render(false);
  }
  if (imgs.length) {
    const max = SAMPLE_LIM.images.maxCount;
    a.files = imgs.slice(0, max);
    a.fileNote = {
      k: 'ok',
      t: `${plural(a.files.length, 'screenshot')} ready.${imgs.length > max ? ` Only the first ${max} are used.` : ''}`,
    };
    return render(false);
  }
  const f = txts[0];
  if (f.size > 1024 * 1024) {
    a.fileNote = {
      k: 'warn',
      t: 'That chat file is over 1 MB. Export only this buyer’s chat, or paste the recent messages.',
    };
    return render(false);
  }
  const r = new FileReader();
  r.onload = () => {
    a.text = String(r.result).split(/\r?\n/).slice(-120).join('\n');
    a.files = [{ name: f.name }];
    a.fileNote = {
      k: 'ok',
      t: `Read ${f.name}. Stoora will use the last ${Math.min(120, String(r.result).split(/\r?\n/).length)} lines.`,
    };
    render(false);
  };
  r.onerror = () => {
    a.fileNote = { k: 'warn', t: 'That file couldn’t be read. Try exporting the chat again.' };
    render(false);
  };
  r.readAsText(f);
}
function catalogForAI() {
  return S.products
    .filter((p) => p.status === 'Active')
    .map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color || null,
      sizes: p.sizes || [],
      price: p.price,
      stock: p.stock,
    }));
}
let aiCtl = null;
async function runAI() {
  const a = aiState();
  if (a.busy) return;
  const images = a.files.filter((f) => f instanceof Blob);
  if (!images.length && !a.text.trim()) {
    a.stage = 'error';
    a.err = a.mode === 'file' ? 'Choose a chat file first.' : 'Paste the conversation first.';
    return render(false);
  }
  a.busy = true;
  a.stage = 'reading';
  a.steps = [{ k: 'read', s: 'on' }];
  render(false);
  // 1. reading (local): trim and keep the latest messages
  const text = a.text.trim().slice(-8000);
  a.steps = [
    { k: 'read', s: 'done' },
    { k: 'ai', s: 'on' },
  ];
  render(false);
  const sample = await SAMPLE_P;
  if (!sample || AI_OFF) {
    a.busy = false;
    a.stage = 'error';
    a.err = 'AI isn’t available in this view, so the chat wasn’t read. You can add the order yourself.';
    return render(false);
  }
  const prompt = `You help a small Indian seller turn a buyer conversation into an ORDER DRAFT for the seller to check. Read the conversation${images.length ? ' in the attached screenshot(s)' : ''} and the seller's CATALOG.
Rules: extract only what the buyer actually said. Use null for anything not stated — never guess names, phone numbers, addresses, prices or delivery fees. Match products ONLY to catalog ids; list every catalog id that could fit (best first) and set "sure" false when more than one fits or the match is a guess. If nothing fits, give an empty list. If a quantity or size is unclear, set it null and add a plain question for the seller. A buyer saying they will pay or have paid is NOT proof of payment.
CATALOG: ${JSON.stringify(catalogForAI())}
${text ? `CONVERSATION (source: ${a.src}):\n${text}` : ''}
Reply with only JSON:
{"customer":{"name":string|null,"phone":string|null},
 "items":[{"said":"the buyer's words for this item","matches":["catalog id",...],"sure":boolean,"size":string|null,"qty":number|null}],
 "delivery":{"city":string|null,"address":string|null},
 "payment":{"method":"upi"|"cod"|"cash"|null,"buyerSaysPaid":boolean,"said":string|null},
 "notes":string|null,
 "questions":["short plain questions for the seller about anything unclear"],
 "excerpts":["up to 4 exact short quotes from the conversation that support the details"]}`;
  aiCtl = new AbortController();
  try {
    const r = await sample.json(prompt, {
      modelTier: 'default',
      cache: false,
      signal: aiCtl.signal,
      ...(images.length ? { images } : {}),
    });
    a.steps = [
      { k: 'read', s: 'done' },
      { k: 'ai', s: 'done' },
      { k: 'match', s: 'on' },
    ];
    render(false);
    a.draft = matchDraft(r, text);
    a.steps = [
      { k: 'read', s: 'done' },
      { k: 'ai', s: 'done' },
      { k: 'match', s: 'done' },
    ];
    a.stage = 'review';
    a.busy = false;
    ui.dirty = true;
    render(true);
  } catch (e) {
    a.busy = false;
    if (e && e.code === 'cancelled') {
      a.stage = 'input';
      return render(false);
    }
    aiOffIf(e && e.code);
    a.stage = 'error';
    a.err =
      e && e.code === 'invalid_json'
        ? 'Stoora couldn’t find an order in this chat. Check that it includes what the buyer wants, then try again — or add the order yourself.'
        : aiErr(e && e.code);
    render(false);
  }
}
/* 3. catalog matching (local, from the real catalog only) */
function matchDraft(r, text) {
  const ids = new Set(S.products.map((p) => p.id));
  const s = (v) => (typeof v === 'string' && v.trim() ? v.trim() : '');
  const items = (Array.isArray(r.items) ? r.items : []).slice(0, 8).map((it) => {
    const cands = (Array.isArray(it.matches) ? it.matches : []).map(String).filter((id) => ids.has(id));
    const P = cands[0] ? prod(cands[0]) : null;
    const size = s(it.size).toUpperCase();
    const q = Number(it.qty);
    return {
      said: s(it.said) || '(not quoted)',
      cands,
      pid: cands.length === 1 && it.sure !== false ? cands[0] : '',
      size: P && P.sizes && P.sizes.includes(size) ? size : '',
      saidSize: size,
      qty: Number.isFinite(q) && q > 0 ? Math.round(q) : '',
      qtyUnclear: !(Number.isFinite(q) && q > 0),
    };
  });
  const pm = r.payment || {};
  const c = r.customer || {},
    d = r.delivery || {};
  return {
    name: s(c.name),
    phone: s(c.phone),
    city: s(d.city),
    address: s(d.address),
    items,
    pay: pm.method === 'cod' ? 'cod' : pm.method === 'cash' ? 'paid-check' : 'upi',
    buyerSaysPaid: !!pm.buyerSaysPaid,
    paySaid: s(pm.said),
    ship: '',
    notes: s(r.notes),
    questions: (Array.isArray(r.questions) ? r.questions : []).map(s).filter(Boolean).slice(0, 5),
    excerpts: (Array.isArray(r.excerpts) ? r.excerpts : []).map(s).filter(Boolean).slice(0, 4),
    source: text,
    hadImages: !text,
  };
}
function draftIssues(d) {
  const out = [];
  if (!d.name) out.push({ f: 'ai-name', t: 'Add the buyer’s name — it wasn’t in the chat.' });
  if (!d.items.length)
    out.push({ f: 'ai-add', t: 'No products were found in the chat. Add the product the buyer wants.' });
  d.items.forEach((it, n) => {
    const P = it.pid && prod(it.pid);
    if (!P)
      out.push({
        f: 'ai-p-' + n,
        t:
          it.cands.length > 1
            ? `Choose which product “${it.said}” means — ${it.cands.length} could match.`
            : `Choose the product for “${it.said}”. It didn’t match your catalog for sure.`,
      });
    else {
      if (P.sizes && P.sizes.length && !it.size)
        out.push({
          f: 'ai-s-' + n,
          t: it.saidSize
            ? `Size ${it.saidSize} isn’t available for ${P.name}. Pick a size.`
            : `Pick a size for ${P.name} — the buyer didn’t say.`,
        });
      if (!it.qty) out.push({ f: 'ai-q-' + n, t: `Confirm how many ${P.name} the buyer wants.` });
      else if (it.qty > P.stock)
        out.push({ f: 'ai-q-' + n, t: `Only ${P.stock} ${P.name} in stock. Lower the quantity or restock first.` });
    }
  });
  return out;
}
function draftNotes(d) {
  const n = [];
  if (!d.phone) n.push('No phone number in the chat. Add it if you have it, so Stoora can send the confirmation.');
  if (!d.address)
    n.push(
      d.city
        ? `Only the city (${d.city}) is known. Ask the buyer for the full address before shipping.`
        : 'No delivery address in the chat. Ask the buyer before shipping.',
    );
  return n;
}
function reviewHTML(a) {
  const d = a.draft;
  const iss = draftIssues(d);
  const notes = draftNotes(d);
  const subtotal = d.items.reduce((s, it) => s + (it.pid && it.qty ? prod(it.pid).price * it.qty : 0), 0);
  const ready = !iss.length;
  const field = (id, label, key, ph, flag, attrs = '') =>
    `<div class="field"><label for="${id}">${label}</label><input class="input ${flag ? 'flag' : ''}" id="${id}" data-aid="${key}" value="${esc(d[key])}" placeholder="${ph}" ${attrs}>${flag ? `<span class="fl">${ic('help', 'xs')}${flag}</span>` : ''}</div>`;
  return `<div class="banner info anim" style="--i:0">${ic('edit_note')}<span><b class="t-ink">This is a draft.</b> It is not in your orders yet. Nothing is added until you tap “Approve and create order”.</span></div>
 ${iss.length ? `<section class="card anim needs" style="--i:1" aria-labelledby="nd-h"><h2 class="ct" id="nd-h">${ic('flag')}${plural(iss.length, 'thing needs', 'things need')} your attention</h2><ul>${iss.map((x) => `<li><button class="link" data-act="ai-focus" data-f="${x.f}">${x.t}</button></li>`).join('')}</ul></section>` : ''}
 <div class="form2"><div>
  <section class="card anim stack" style="--i:2"><h2 class="ct">${ic('person')}Customer</h2>
   <div class="grid2">${field('ai-name', 'Buyer’s name <span class="req">Required</span>', 'name', 'Not in the chat', d.name ? '' : 'Not found in the chat')}${field('ai-phone', 'WhatsApp number <span class="opt">Optional</span>', 'phone', 'Not in the chat', '', 'type="tel" inputmode="tel"')}</div></section>
  <section class="card anim" style="--i:3"><div class="card-h"><h2 class="ct">${ic('shopping_bag')}Products and quantities</h2><button class="btn line sm" id="ai-add" data-act="ai-additem">${ic('add')}Add product</button></div>
   ${
     d.items.length
       ? `<div class="stack tight">${d.items
           .map((it, n) => {
             const P = it.pid && prod(it.pid);
             const opts = it.cands.length ? it.cands : [];
             return `<div class="ai-item">
    <p class="said">${ic('format_quote', 'xs')}Buyer said: “${esc(it.said)}”</p>
    <div class="ai-row">
     <div class="field grow"><label for="ai-p-${n}">Product</label><select class="input ${P ? '' : 'flag'}" id="ai-p-${n}" data-aitem="${n}" data-k="pid"><option value="">${it.cands.length > 1 ? 'Choose one of the matches…' : 'Choose a product…'}</option>${opts.length ? `<optgroup label="Matches from the chat">${opts.map((id) => `<option value="${id}" ${it.pid === id ? 'selected' : ''}>${esc(prod(id).name)} · ${rs(prod(id).price)}</option>`).join('')}</optgroup>` : ''}<optgroup label="All products">${S.products
       .filter((p) => p.status === 'Active' && !opts.includes(p.id))
       .map(
         (p) => `<option value="${p.id}" ${it.pid === p.id ? 'selected' : ''}>${esc(p.name)} · ${rs(p.price)}</option>`,
       )
       .join('')}</optgroup></select></div>
     ${P && P.sizes && P.sizes.length ? `<div class="field"><label for="ai-s-${n}">Size</label><select class="input ${it.size ? '' : 'flag'}" id="ai-s-${n}" data-aitem="${n}" data-k="size"><option value="">Size…</option>${P.sizes.map((z) => `<option ${it.size === z ? 'selected' : ''}>${z}</option>`).join('')}</select></div>` : ''}
     <div class="field"><label for="ai-q-${n}">How many</label><input class="input qty ${it.qty && (!P || it.qty <= P.stock) ? '' : 'flag'}" id="ai-q-${n}" inputmode="numeric" data-aitem="${n}" data-k="qty" value="${it.qty}" placeholder="?"></div>
     <button class="ibtn flat" data-act="ai-rmitem" data-i="${n}" aria-label="Remove this item" style="align-self:end">${ic('delete', 'sm')}</button></div>
    ${P ? `<p class="cap">${rs(P.price)} each from your catalog · ${P.stock} in stock${it.qty ? ` · line total <b class="t-ink num">${rs(P.price * it.qty)}</b>` : ''}</p>` : it.cands.length > 1 ? `<p class="cap fl">${ic('help', 'xs')}${it.cands.length} products could match. Pick the right one.</p>` : ''}
   </div>`;
           })
           .join('')}</div>`
       : `<p class="t-soft">No products were found in the chat. Add the product the buyer wants.</p>`
   }</section>
  <section class="card anim stack" style="--i:4"><h2 class="ct">${ic('local_shipping')}Delivery</h2>
   <div class="grid2">${field('ai-city', 'City', 'city', 'Not in the chat', d.city ? '' : 'Not in the chat')}${field('ai-addr', 'Full address', 'address', 'Not in the chat', d.address ? '' : 'Ask the buyer before shipping')}</div>
   <div class="field"><label for="ai-ship">Delivery charge <span class="opt">Optional</span></label><div class="affix"><span aria-hidden="true">₹</span><input id="ai-ship" inputmode="numeric" data-aid="ship" value="${esc(d.ship)}" placeholder="0"></div><span class="hint">Stoora doesn’t guess delivery charges. Leave empty for free delivery.</span></div></section>
  <section class="card anim stack" style="--i:5"><h2 class="ct" id="ai-pay-l">${ic('payments')}Payment</h2>
   ${d.buyerSaysPaid ? `<div class="banner warn">${ic('info')}<span>The buyer says they’ve paid${d.paySaid ? `: “${esc(d.paySaid)}”` : ''}. Check your UPI app before choosing “Paid already”.</span></div>` : d.paySaid ? `<p class="cap">${ic('format_quote', 'xs')}About payment, the buyer said: “${esc(d.paySaid)}”</p>` : ''}
   <div class="stack tight" role="radiogroup" aria-labelledby="ai-pay-l">${[
     ['upi', 'Not paid yet — send a UPI link', 'Marked paid when the money arrives.'],
     ['cod', 'Cash on delivery', 'Collect the money when the parcel arrives.'],
     ['paid-check', 'Paid already', 'Only if you’ve seen the money in your account.'],
   ]
     .map(
       ([k, l, s]) =>
         `<button type="button" role="radio" aria-checked="${d.pay === k}" class="trow radio ${d.pay === k ? 'on' : ''}" data-act="ai-pay" data-v="${k}"><span class="rdot" aria-hidden="true">${d.pay === k ? ic('check', 'xs') : ''}</span><span class="grow"><span class="t">${l}</span><span class="s">${s}</span></span></button>`,
     )
     .join('')}</div></section>
  <details class="card anim src-box" style="--i:6"><summary>${ic('forum', 'sm')}Compare with the original ${d.hadImages ? 'screenshots' : 'conversation'}</summary>
   ${d.excerpts.length ? `<p class="label" style="margin:var(--s2) 0 var(--s1)">What Stoora used</p><ul class="quotes">${d.excerpts.map((q) => `<li>“${esc(q)}”</li>`).join('')}</ul>` : ''}
   ${d.source ? `<p class="label" style="margin:var(--s3) 0 var(--s1)">Full conversation</p><pre class="srctext">${esc(d.source)}</pre>` : `<p class="cap" style="margin-top:var(--s2)">Stoora read your screenshots. They aren’t kept after this page closes.</p>`}</details>
 </div><div>
  <section class="card anim stack" style="--i:7;position:sticky;top:80px" id="ai-sum">${aiSummary(a)}</section>
 </div></div>`;
}
function aiSummary(a) {
  const d = a.draft;
  const iss = draftIssues(d);
  const sh = toNum(d.ship);
  const lines = d.items.filter((it) => it.pid && it.qty);
  const subtotal = lines.reduce((s, it) => s + prod(it.pid).price * it.qty, 0);
  return `<h2 class="ct">Summary</h2><p class="cap">${ic('edit_note', 'xs')}Draft · from ${esc(a.src)}</p>
  <div class="kv">${lines.map((it) => `<div class="r"><span>${esc(prod(it.pid).name)}${it.size ? ' · ' + it.size : ''} × ${it.qty}</span><span>${rs(prod(it.pid).price * it.qty)}</span></div>`).join('') || '<div class="r"><span>No products confirmed yet</span><span>—</span></div>'}
  <div class="r"><span>Delivery</span><span>${sh ? rs(sh) : 'Free'}</span></div><div class="r t"><span>Total</span><span>${iss.length ? 'Not ready yet' : rs(subtotal + sh)}</span></div></div>
  ${iss.length ? `<p class="cap fl">${ic('flag', 'xs')}Fix ${plural(iss.length, 'thing')} above to see the total.</p>` : ''}
  <button class="btn primary full" data-act="ai-approve" ${a.busy ? 'disabled' : ''}>${a.busy ? '<span class="spin"></span>Creating order…' : `${ic('check')}Approve and create order`}</button>
  <button class="btn quiet full" data-act="ai-cancel">Cancel draft</button>`;
}
function approveAI() {
  const a = aiState();
  if (a.busy) return;
  const d = a.draft;
  const iss = draftIssues(d);
  if (iss.length) {
    render(false);
    toast(`${plural(iss.length, 'thing needs', 'things need')} your attention first`, null, 'error');
    const f = $('#' + iss[0].f);
    f && f.focus();
    return;
  }
  a.busy = true;
  $('#ai-sum').innerHTML = aiSummary(a);
  setTimeout(() => {
    const o = addOrder({
      who: d.name,
      phone: d.phone,
      items: d.items.map((it) => [it.pid, Number(it.qty), it.size]),
      pay: d.pay === 'paid-check' ? 'paid' : d.pay,
      src: a.src,
      ship: toNum(d.ship),
      notes: d.notes,
      how: 'ai',
      city: d.city,
      address: d.address,
    });
    a.busy = false;
    a.created = o.id;
    a.stage = 'done';
    ui.dirty = false;
    render(true);
    toast('Order created successfully');
  }, 400);
}

/* ---------- order page: show how an order was made ---------- */
const _orderFn = ARGS['order-'];
ARGS['order-'] = function (id) {
  const m = _orderFn(id);
  const o = ord(id);
  if (o && o.how)
    m.body = m.body.replace(
      '<div class="tl">',
      `<div class="tl"><div class="ev"><i></i><div><b>${o.how === 'ai' ? 'Prepared by Stoora from a ' + esc(o.srcDetail || o.src) + ' conversation, approved by you' : 'Added by you'}</b><span class="cap">${o.notes ? esc(o.notes) : 'No notes'}</span></div></div>`,
    );
  if (o && o.items.some((x) => x[2]))
    o.items.forEach(([p, q, sz]) => {
      if (sz)
        m.body = m.body.replace(
          `<span class="t">${prod(p).name}</span>`,
          `<span class="t">${prod(p).name} · ${sz}</span>`,
        );
    });
  return m;
};

/* ---------- events ---------- */
const _act2 = act;
act = function (k, el, e) {
  const d = el.dataset;
  const a = ui.ai;
  switch (k) {
    case 'ai-act': {
      const A = ACTIONS[d.a];
      if (A) {
        closeOv(true);
        if (document.body.classList.contains('docked') && innerWidth < 1280) document.body.classList.remove('docked');
        A.run();
      }
      return;
    }
    case 'ask-stop':
      askCtl && askCtl.abort();
      return;
    case 'confirm-yes': {
      const f = ui._confirm;
      ui._confirm = null;
      closeOv(true);
      f && f();
      return;
    }
    case 'chat-order': {
      const c = S.chats.find((x) => x.id === d.id);
      ui.draft = {
        who: c.who,
        phone: '',
        items: d.id === 'c1' ? [['p3', 1, 'M']] : [],
        pay: 'upi',
        src: c.src,
        errors: {},
      };
      ui.dirty = true;
      return go('create-order-manual');
    }
    case 'pick-done': {
      const old = ui.draft.items;
      ui.draft.items = Object.entries(ui.pick).map(([id, q]) => [id, q, (old.find((x) => x[0] === id) || [])[2] || '']);
      ui.draft.errors.items = 0;
      ui.dirty = true;
      closeOv(true);
      return render(false);
    }
    case 'discard-leave':
      ui.ai = null;
      ui.busy = false;
      break;
    case 'ai-mode':
      aiState().mode = d.v;
      if (d.v !== 'file') aiState().files = [];
      aiState().fileNote = null;
      return render(false);
    case 'ai-example': {
      const s = aiState();
      s.text = EXAMPLE_CHAT;
      s.src = 'WhatsApp';
      ui.dirty = true;
      render(false);
      return $('#ai-text')?.focus();
    }
    case 'ai-run':
      return runAI();
    case 'ai-stop':
      aiCtl && aiCtl.abort();
      return;
    case 'ai-new':
      ui.ai = null;
      return render(false);
    case 'ai-pay':
      a.draft.pay = d.v;
      return render(false);
    case 'ai-additem':
      a.draft.items.push({ said: 'Added by you', cands: [], pid: '', size: '', saidSize: '', qty: 1 });
      render(false);
      return $('#ai-p-' + (a.draft.items.length - 1))?.focus();
    case 'ai-rmitem':
      a.draft.items.splice(+d.i, 1);
      return render(false);
    case 'ai-focus': {
      const f = $('#' + d.f);
      if (f) {
        f.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => f.focus({ preventScroll: true }), 300);
      }
      return;
    }
    case 'ai-approve':
      return approveAI();
    case 'ai-cancel':
      return confirmSheet(
        'Cancel this draft?',
        'Nothing will be added to your orders. The chat you added will be cleared.',
        'Cancel draft',
        () => {
          ui.ai = null;
          ui.dirty = false;
          go('orders');
          setTimeout(() => toast('Draft cancelled. No order was created.', null, 'info'), 50);
        },
      );
  }
  return _act2(k, el, e);
};
openPicker = function () {
  if (!/^create-order-manual/.test(route)) {
    go('create-order-manual', 'picker');
    return;
  }
  ui.pick = Object.fromEntries(ui.draft.items.map(([id, q]) => [id, q]));
  setLayer(
    sheet(
      'pkr',
      'Add products',
      `<label class="search" style="margin-bottom:var(--s2)">${ic('search', 'sm')}<span class="sr">Search products</span><input id="pkr-q" type="search" placeholder="Search products" data-input="pick"></label><div id="pkr-l">${pickerBody()}</div>`,
      `<div id="pkr-f" style="display:contents">${pickerFoot()}</div>`,
      { full: innerWidth < 760 },
    ),
    '#pkr-q',
  );
};
document.addEventListener('submit', (e) => {
  const f = e.target;
  if (f.dataset.form === 'create2') {
    e.preventDefault();
    createManual();
  }
});
document.addEventListener('input', (e) => {
  const t = e.target;
  const a = ui.ai;
  if (t.dataset.draft === 'ship' || t.dataset.draft === 'notes') {
    ui.draft[t.dataset.draft] = t.value;
    ui.dirty = true;
    const s = $('#co-sum');
    if (s) s.innerHTML = manualSummary();
    return;
  }
  if (t.dataset.ai) {
    aiState()[t.dataset.ai] = t.value;
    if (t.dataset.ai === 'text') ui.dirty = !!t.value.trim();
    return;
  }
  if (t.dataset.aid && a && a.draft) {
    a.draft[t.dataset.aid] = t.value;
    $('#ai-sum').innerHTML = aiSummary(a);
    t.classList.toggle('flag', !t.value.trim() && ['name', 'city', 'address'].includes(t.dataset.aid));
    return;
  }
  if (t.dataset.aitem !== undefined && t.dataset.k === 'qty' && a && a.draft) {
    const v = parseInt(t.value, 10);
    a.draft.items[+t.dataset.aitem].qty = v > 0 ? v : '';
    $('#ai-sum').innerHTML = aiSummary(a);
    return;
  }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  const a = ui.ai;
  if (t.dataset.cosize !== undefined) {
    const it = ui.draft.items[+t.dataset.cosize];
    it[2] = t.value;
    delete ui.draft.errors['size' + t.dataset.cosize];
    t.classList.remove('bad');
    const s = $('#co-sum');
    if (s) s.innerHTML = manualSummary();
    return;
  }
  if (t.dataset.ai === 'src') {
    aiState().src = t.value;
    return;
  }
  if (t.id === 'ai-file') {
    takeFiles(t.files);
    return;
  }
  if (t.dataset.aitem !== undefined && a && a.draft) {
    const it = a.draft.items[+t.dataset.aitem];
    if (t.dataset.k === 'pid') {
      it.pid = t.value;
      const P = it.pid && prod(it.pid);
      it.size = P && P.sizes && P.sizes.includes(it.saidSize) ? it.saidSize : '';
    } else if (t.dataset.k === 'size') it.size = t.value;
    render(false);
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'home-q') {
    e.preventDefault();
    e.target.form.requestSubmit();
  }
});

/* boot: see features.js */
