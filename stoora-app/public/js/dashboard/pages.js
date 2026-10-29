/**
 * Order, booking, customer and product pages for real accounts.
 * The sample screens carry made-up text (an address, a phone number, a tag); here every
 * line comes from the shop's own record. Loaded after channels.js.
 */

const phoneOf = (record) =>
  record && (record.phone || record.phoneRaw)
    ? String(record.phoneRaw || record.phone)
        .replace(/\D/g, '')
        .slice(-10)
    : '';
const whatsappLink = (phone, text = '') => `https://wa.me/91${phone}${text ? '?text=' + encodeURIComponent(text) : ''}`;
const customerIndex = (name) => D.customers.findIndex((customer) => customer.name === name);
const replaceAll = (html, from, to) => html.split(from).join(to);

const whatsappButton = (phone, className = 'btn grey sm') =>
  phone
    ? `<a class="${className}" style="margin-top:12px" href="${whatsappLink(phone)}" target="_blank" rel="noopener noreferrer">${I('wa', 16)} Message on WhatsApp</a>`
    : '';

/* ---------- order ---------- */

live(V, 'order', (original) => {
  const order = D.orders.find((item) => String(item.id) === String(route.arg)) || D.orders[0];
  if (!order) return original();
  const phone = phoneOf(order);
  const customer = D.customers[customerIndex(order.who)];
  let html = original();

  html = replaceAll(
    html,
    '<div class="ev"><i></i><div>Order confirmation sent on WhatsApp.',
    '<div class="ev" hidden><i></i><div>',
  );
  html = html.replace(
    'Order shipped with Delhivery.',
    `Order shipped${order.courier ? ' with ' + esc(order.courier) : ''}${order.tracking ? ' · ' + esc(order.tracking) : ''}.`,
  );
  html = replaceAll(
    html,
    '+91 98xxxx 1234 · 3 orders',
    `${phone ? '+91 ' + phone : 'No phone given'}${customer ? ' · ' + customer.orders + ' order' + (customer.orders > 1 ? 's' : '') : ''}`,
  );
  html = replaceAll(html, '12 Lake View Road, Indiranagar, Bengaluru 560038', esc(order.address || 'No address given'));
  html = html.replace(
    /<button class="btn grey sm" style="margin-top:12px" data-go="chat:c1">[\s\S]*?Message on WhatsApp<\/button>/,
    whatsappButton(phone),
  );
  html = html.replace('data-go="customer:0"', `data-go="customer:${Math.max(0, customerIndex(order.who))}"`);
  html = html.replace(
    /<div class="sec"><div class="sec-h">Tags<\/div><span class="mini">Repeat buyer<\/span><\/div>/,
    '',
  );

  // The ship form: the shop's own couriers, and no promise to message the buyer.
  const couriers = (D.cfg.couriers || COURIERS_DEFAULT)
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  html = html.replace(
    '<option>Delhivery</option><option>India Post</option><option>Shiprocket</option><option>Hand delivery</option>',
    couriers.map((name) => `<option>${esc(name)}</option>`).join(''),
  );
  html = html.replace(
    /<div class="row" style="margin-bottom:14px"><span class="sp small"><b>Tell buyer on WhatsApp<\/b>[\s\S]*?<\/button><\/div>/,
    '',
  );
  return html;
});

/** "Mark as shipped" saves the courier and tracking number from the form. */
document.addEventListener(
  'click',
  (event) => {
    const element = event.target.closest('[data-act="doship"]');
    if (!element || !D.live) return;
    event.stopImmediatePropagation();
    event.preventDefault();

    const order = D.orders.find((item) => String(item.id) === String(route.arg));
    if (!order) return;
    const courier = document.querySelector('#screen select.input');
    const tracking = document.querySelector('#screen input.input[placeholder^="e.g."]');
    order.shipped = true;
    order.fulfil = 'shipped';
    order.courier = courier ? courier.value : '';
    order.tracking = tracking ? tracking.value.trim() : '';
    ui.ship = false;
    render();
    toast('Order shipped. The buyer can see the tracking on your shop page.');
  },
  true,
);

/* ---------- booking ---------- */

live(V, 'booking', (original) => {
  const booking = D.bookings.find((item) => item.id === route.arg) || D.bookings[0];
  if (!booking) return original();
  const service = svcOf(booking);
  const customer = D.customers[customerIndex(booking.who)];
  const place = service.where || 'Online';
  let html = original();

  html = html.replace(/Booked from Instagram · 24 Oct/, `Booking ${esc(booking.id)}`);
  html = html.replace(/ · 60 min · Online \(Google Meet\)/, ` · ${esc(service.duration || '60 min')} · ${esc(place)}`);
  html = html.replace(
    /\+91 97xxxx 2210 · 2 bookings/,
    esc(customer && customer.phone !== '—' ? customer.phone : 'No phone given'),
  );
  html = html.replace(/Online\. The Google Meet link goes out 1 hour before\./, esc(place));
  html = html.replace(/First 1-on-1 session/, 'No notes');
  html = html.replace(
    /<button class="btn main" data-act="remindbook">[\s\S]*?<\/button>/,
    '<button class="btn main" data-act="remindbook">Send reminder</button>',
  );
  return html;
});

/** A booking reminder opens WhatsApp with the message filled in, or copies it when there is no phone number. */
document.addEventListener(
  'click',
  (event) => {
    if (!event.target.closest('[data-act="remindbook"]') || !D.live) return;
    event.stopImmediatePropagation();
    event.preventDefault();

    const booking = D.bookings.find((item) => item.id === route.arg);
    if (!booking) return;
    const customer = D.customers[customerIndex(booking.who)];
    const message = `Hi ${booking.who.split(' ')[0]}, a reminder: ${svcOf(booking).name} on ${booking.when}. See you then! – ${USER.shop}`;
    const phone = phoneOf(customer);
    if (phone) window.open(whatsappLink(phone, message), '_blank', 'noopener');
    else copyText(message, 'Reminder copied. Paste it into your chat with the buyer.');
  },
  true,
);

/* ---------- customers ---------- */

function customerRows() {
  return D.customers.map((customer, index) => ({
    customer,
    index,
    orders: D.orders.filter((order) => order.who === customer.name),
  }));
}

live(V, 'customers', () => {
  const rows = customerRows();
  const addButtons = DESK
    ? '<button class="btn line sm" data-act="soon">Import</button><button class="btn ink sm" data-act="soon">Add customer</button>'
    : '<button class="btn ink sm" data-act="soon">Add customer</button>';
  const empty = 'No customers yet. They appear after the first order or booking.';

  const table = `<div class="box tbox"><table class="tbl"><thead><tr><th>Customer</th><th>Phone</th><th>Orders</th><th class="r">Amount spent</th><th>Last order</th></tr></thead><tbody>${
    rows.length
      ? rows
          .map(
            ({ customer, index }) =>
              `<tr class="rw" data-go="customer:${index}"><td><span class="row" style="gap:10px">${av(customer.name, index)}<b>${esc(customer.name)}</b></span></td><td class="muted">${esc(customer.phone)}</td><td>${customer.orders}</td><td class="r money">${rs(customer.spent)}</td><td class="muted">${esc(customer.last)}</td></tr>`,
          )
          .join('')
      : noRows(empty)
  }</tbody></table></div>`;
  const list = `<div class="list">${
    rows.length
      ? rows
          .map(
            ({ customer, index }) =>
              `<button class="li" data-go="customer:${index}">${av(customer.name, index)}<div class="sp"><b>${esc(customer.name)}</b><div class="small muted">${esc(customer.phone)}</div><div class="small">${customer.orders} orders · last ${esc(customer.last)}</div></div><span class="money small">${rs(customer.spent)}</span></button>`,
          )
          .join('')
      : noList(empty)
  }</div>`;
  return topRow('user', 'Customers', addButtons) + `<div class="pad">${DESK ? table : list}</div>`;
});

live(V, 'customer', () => {
  const customer = D.customers[Number(route.arg)] || D.customers[0];
  if (!customer) return V.customers();
  const orders = D.orders.filter((order) => order.who === customer.name);
  const phone = phoneOf(customer);
  const orderRows = orders.length
    ? orders
        .map(
          (order) =>
            `<button class="row" style="width:100%;text-align:left;padding:8px 0" data-go="order:${order.id}"><b class="sp">#${order.id}</b>${payTag(order)}${shipTag(order)}<span class="money small">${rs(order.total)}</span></button>`,
        )
        .join('')
    : '<p class="small muted" style="margin:0">No orders yet.</p>';

  return (
    backRow(
      `${I('user', 16)} Customers`,
      DESK
        ? '<button class="btn line sm" data-act="soon">Edit</button><button class="btn line sm" data-act="soon">More actions</button>'
        : '',
    ) +
    `<div class="pad">
    <div class="box head"><div class="row">${av(customer.name)}<div class="sp"><h1 class="h1">${esc(customer.name)}</h1><div class="small muted">${esc(customer.phone)} · last order ${esc(customer.last)}</div></div>
      <div class="tile static" style="min-width:130px"><div class="k">Amount spent</div><div class="v">${rs(customer.spent)}</div></div><div class="tile static" style="min-width:90px"><div class="k">Orders</div><div class="v">${customer.orders}</div></div></div></div>
    <div class="card"><div class="box-h"><span class="box-t">Orders</span><button class="btn ink sm" data-go="create">Create order</button></div>${orderRows}</div>
    <div class="card"><div class="box-h"><span class="box-t">Contact</span></div><div class="row small">${I('phone', 16)}<span class="sp">${esc(customer.phone)}</span></div>${whatsappButton(phone, 'btn main sm')}</div></div>`
  );
});

/* ---------- products ---------- */

live(V, 'products', (original) => {
  if (ui.prodTab === 'services') return original();
  let html = original();
  D.products.forEach((product) => {
    const row = new RegExp(
      `(data-go="addproduct:${product.id}">[\\s\\S]*?<td class="muted">)[^<]*(</td><td class="muted">)[^<]*(</td>)`,
    );
    const channels = Object.entries(product.channels || { shop: true })
      .filter(([, on]) => on)
      .map(([name]) => ({ shop: 'Shop page', whatsapp: 'WhatsApp', instagram: 'Instagram' })[name])
      .join(', ');
    html = html.replace(
      row,
      `$1${esc(product.cat || '—')}$2${esc(product.status === 'Active' ? channels || '—' : '—')}$3`,
    );
  });
  return html;
});
