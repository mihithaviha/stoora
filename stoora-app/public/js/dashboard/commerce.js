/**
 * Orders from the shop page, in the dashboard: payment and fulfilment are shown, and changed, separately.
 *   Payment      Paid, Awaiting payment (online), Payment failed, To be arranged (pay directly), Refunded
 *   Fulfilment   Order received, Confirmed, Being prepared, Shipped, Delivered, Cancelled
 * The server decides every change (POST /api/orders/:id/status), so stock and flags always stay in step.
 * Loaded after pages.js.
 */

const FULFIL_STEPS = [
  ['placed', 'Order received'],
  ['confirmed', 'Confirmed'],
  ['processing', 'Being prepared'],
  ['shipped', 'Shipped'],
  ['delivered', 'Delivered'],
  ['cancelled', 'Cancelled'],
];
const FULFIL_NAME = Object.fromEntries(FULFIL_STEPS);
const PAY_NAME = {
  paid: ['Paid', 'ok'],
  awaiting_payment: ['Awaiting payment', 'warn'],
  failed: ['Payment failed', 'bad'],
  pending: ['To be arranged', 'warn'],
  refunded: ['Refunded', 'neutral'],
};

/** Same rules as the server, so older orders (only paid and shipped flags) still show a sensible status. */
function orderFulfil(order) {
  if (FULFIL_NAME[order.fulfil]) return order.fulfil;
  if (order.shipped) return 'shipped';
  return order.paid || order.payMode === 'manual' ? 'confirmed' : 'placed';
}
function orderPayStatus(order) {
  if (order.refunded) return 'refunded';
  if (order.paid) return 'paid';
  return order.payStatus || 'pending';
}

/** Paid orders that still have to go out (not shipped, delivered or cancelled). */
const isToShip = (order) => order.paid && !['shipped', 'delivered', 'cancelled'].includes(orderFulfil(order));
const isDoneOrder = (order) => ['shipped', 'delivered'].includes(orderFulfil(order));

function orderStatusCard(order) {
  const fulfil = orderFulfil(order);
  const pay = PAY_NAME[orderPayStatus(order)] || PAY_NAME.pending;
  const mode =
    order.payMode === 'online'
      ? 'Online with Razorpay'
      : order.payMode === 'manual'
        ? 'Directly to you'
        : order.payMethod || '';
  const cancelled = fulfil === 'cancelled';
  const where = [order.address, [order.city, order.state].filter(Boolean).join(', '), order.pincode]
    .filter(Boolean)
    .map(esc)
    .join('<br>');
  const sized = (order.items || [])
    .filter((item) => item[2])
    .map(([id, quantity, variant]) => `${esc(prod(id).name)} · size ${esc(variant)} × ${quantity}`);
  const waiting =
    order.payMode === 'online' && !order.paid && !cancelled
      ? `<p class="tiny muted" style="margin:8px 0 0">Waiting for the buyer to pay. If it is not paid in time, the order is cancelled and its stock goes back on the shelf.</p>`
      : '';
  const expired =
    cancelled && order.expired
      ? '<p class="tiny muted" style="margin:8px 0 0">Cancelled because the online payment was not made in time. If the buyer pays late, the order comes back automatically.</p>'
      : '';
  return `<div class="card" id="order-status-card">
    <div class="box-h"><span class="box-t">Status</span></div>
    <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:10px"><span class="sp small muted">Payment</span><span class="tag ${pay[1]}">${pay[0]}</span>${mode ? `<span class="tiny muted">${esc(mode)}</span>` : ''}</div>
    <div class="row" style="gap:8px;align-items:flex-end;flex-wrap:wrap">
      <div class="field sp" style="margin:0;min-width:160px"><label for="fulfil-select">Fulfilment</label><select class="input" id="fulfil-select" ${cancelled ? 'disabled' : ''}>${FULFIL_STEPS.map(([id, label]) => `<option value="${id}" ${id === fulfil ? 'selected' : ''}>${label}</option>`).join('')}</select></div>
      ${cancelled ? '' : '<button class="btn ink sm" data-act="setfulfil">Update</button>'}</div>
    ${waiting}${expired}
    ${where ? `<div class="hr"></div><div class="small"><b>Deliver to</b><br>${where}${order.instructions ? `<br><span class="muted">Note from buyer: ${esc(order.instructions)}</span>` : ''}</div>` : ''}
    ${order.email ? `<div class="small" style="margin-top:8px"><b>Email</b> <a class="link" href="mailto:${esc(order.email)}">${esc(order.email)}</a></div>` : ''}
    ${sized.length ? `<div class="small" style="margin-top:8px"><b>Sizes</b><br>${sized.join('<br>')}</div>` : ''}
  </div>`;
}

live(V, 'order', (original) => {
  const order = D.orders.find((item) => String(item.id) === String(route.arg)) || D.orders[0];
  const html = original();
  if (!order || !D.live) return html;
  let page = html;
  if (orderFulfil(order) === 'cancelled') {
    // A cancelled order is not "to ship" any more, and cannot be shipped.
    page = page
      .replace('<b class="sp">To ship</b>', '<b class="sp">Cancelled</b>')
      .replace(/<button class="btn main sm" data-act="openship">[\s\S]*?<\/button>/, '');
  }
  if (orderFulfil(order) === 'processing')
    page = page.replace('<b class="sp">To ship</b>', '<b class="sp">Being prepared</b>');
  const anchor = '<div class="card"><div class="row"><span style="color:';
  const at = page.indexOf(anchor);
  return at < 0 ? page : page.slice(0, at) + orderStatusCard(order) + page.slice(at);
});

document.addEventListener(
  'click',
  async (event) => {
    const element = event.target.closest('[data-act="setfulfil"]');
    if (!element || !D.live) return;
    event.stopImmediatePropagation();
    event.preventDefault();
    const order = D.orders.find((item) => String(item.id) === String(route.arg));
    const select = document.getElementById('fulfil-select');
    if (!order || !select) return;
    if (
      select.value === 'cancelled' &&
      !confirm('Cancel this order? Its stock goes back on the shelf. This cannot be undone.')
    )
      return;
    try {
      await saveChanges(); // so the server sees the order as it is on screen
      const answer = await dapi('POST', `/api/orders/${encodeURIComponent(order.id)}/status`, { status: select.value });
      Object.assign(order, answer.order);
      if (typeof reloadFromServer === 'function') await reloadFromServer();
      else render();
      toast('Order marked ' + FULFIL_NAME[select.value].toLowerCase());
    } catch (error) {
      toast(error.message);
    }
  },
  true,
);
