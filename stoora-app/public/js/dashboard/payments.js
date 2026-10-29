/**
 * Online payments for real accounts:
 *  - the Payments page (every Razorpay payment, with filters and details)
 *  - "Pay online" on an order (opens Razorpay Checkout) and verified confirmation
 *  - refunds through Razorpay
 *  - the payout account (Razorpay Route) section of Settings › Payments
 *
 * Amounts and "paid" status always come from the server. The browser only opens Checkout.
 */

const RAZORPAY_DASHBOARD = 'https://dashboard.razorpay.com/app/payments';

/* ---------- the Payments page ---------- */

const PAY = { loaded: false, loading: false, error: '', rows: [], totals: null, status: '', range: '30', query: '' };

const PAY_STATUS_LABEL = {
  paid: ['ok', 'Paid'],
  created: ['warn', 'Waiting'],
  failed: ['bad', 'Failed'],
  refunded: ['neutral', 'Refunded'],
};
const PAY_FILTERS = [
  ['', 'All'],
  ['paid', 'Paid'],
  ['created', 'Waiting'],
  ['failed', 'Failed'],
  ['refunded', 'Refunded'],
];
const PAY_RANGES = [
  ['1', 'Today'],
  ['7', '7 days'],
  ['30', '30 days'],
  ['0', 'All time'],
];

function paymentsQuery() {
  const params = new URLSearchParams();
  if (PAY.status) params.set('status', PAY.status);
  if (PAY.query) params.set('q', PAY.query);
  if (PAY.range !== '0') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    params.set('from', String(start.getTime() - (Number(PAY.range) - 1) * 86400000));
  }
  return params.toString();
}

async function loadPayments() {
  PAY.loading = true;
  PAY.error = '';
  try {
    const result = await dapi('GET', '/api/payments?' + paymentsQuery());
    PAY.rows = result.payments;
    PAY.totals = result.totals;
    PAY.loaded = true;
  } catch (error) {
    PAY.error = error.message;
  }
  PAY.loading = false;
  if (route.name === 'payments') render();
}

const payDate = (timestamp) => labelOf(timestamp);

function paymentRow(payment) {
  const [tone, label] = PAY_STATUS_LABEL[payment.status] || ['neutral', payment.status];
  const method = payment.method ? payment.method.toUpperCase() : '—';
  if (DESK) {
    return `<tr class="rw" data-act="paydetail" data-id="${payment.id}"><td class="muted">${esc(payDate(payment.createdAt))}</td><td><b>${esc(payment.buyer || '—')}</b></td><td>#${esc(payment.orderId)}</td><td class="muted">${esc(method)}</td><td class="r money">${rs(payment.amount)}</td><td><span class="tag ${tone}">${label}</span></td></tr>`;
  }
  return `<button class="li" data-act="paydetail" data-id="${payment.id}"><div class="sp"><b>${esc(payment.buyer || '—')}</b><div class="small muted">#${esc(payment.orderId)} · ${esc(method)} · ${esc(payDate(payment.createdAt))}</div></div><span class="money small">${rs(payment.amount)}</span><span class="tag ${tone}">${label}</span></button>`;
}

function paymentsBody() {
  if (PAY.error)
    return `<div class="banner" style="background:var(--negative-tint);color:var(--negative-deep)">${I('shield', 18)}<div>${esc(PAY.error)} <button class="link" data-act="payreload">Try again</button></div></div>`;
  if (!PAY.loaded) return noList('Loading payments…');
  if (!PAY.rows.length) {
    const filtered = PAY.status || PAY.query || PAY.range !== '0';
    const text = filtered
      ? 'No payments match these filters.'
      : D.rz && D.rz.configured
        ? 'No online payments yet. When a buyer pays through Razorpay, it appears here.'
        : 'Online payments are not switched on yet. Follow the steps in Settings › Payments.';
    return DESK ? `<table class="tbl"><tbody>${noRows(text)}</tbody></table>` : noList(text);
  }
  return DESK
    ? `<table class="tbl"><thead><tr><th>Date</th><th>Buyer</th><th>Order</th><th>Method</th><th class="r">Amount</th><th>Status</th></tr></thead><tbody>${PAY.rows.map(paymentRow).join('')}</tbody></table>`
    : `<div class="list">${PAY.rows.map(paymentRow).join('')}</div>`;
}

function paymentsPage() {
  if (!PAY.loaded && !PAY.loading && !PAY.error) loadPayments();
  const totals = PAY.totals || { received: 0, pending: 0, failed: 0, refunded: 0 };
  const chips = (list, current, act) =>
    list
      .map(
        ([value, label]) =>
          `<button class="chip ${value === current ? 'on' : ''}" data-act="${act}" data-v="${value}">${label}</button>`,
      )
      .join('');

  return (
    topRow(
      'card',
      'Payments',
      DESK
        ? '<button class="btn line sm" data-act="soon">Export</button><button class="btn ink sm" data-go="setting:Payments">Payment settings</button>'
        : '',
    ) +
    `<div class="pad">
      <div class="banner info">${I('bill', 18)}<div>These are payments from your buyers through Razorpay. Money paid out to your bank (settlements) is shown in your <a class="link" href="https://dashboard.razorpay.com/app/settlements" target="_blank" rel="noopener noreferrer">Razorpay Dashboard</a>.</div></div>
      ${kpiRow(
        [
          ['Received', rs(totals.received)],
          ['Waiting', rs(totals.pending)],
          ['Failed attempts', String(totals.failed)],
          ['Refunded', rs(totals.refunded)],
        ],
        'k4',
      )}
      <div class="box tbox" style="margin-top:16px"><div class="tbar" style="flex-wrap:wrap;gap:8px">
        <div class="chips">${chips(PAY_FILTERS, PAY.status, 'paystatus')}</div><span class="sp"></span>
        <div class="chips">${chips(PAY_RANGES, PAY.range, 'payrange')}</div>
        <label class="search" style="min-width:200px">${I('search', 16)}<input data-pay-search placeholder="Search buyer, order or payment id" value="${esc(PAY.query)}" aria-label="Search payments" style="border:0;background:none;outline:none;width:100%"></label>
      </div>${paymentsBody()}</div></div>`
  );
}

live(V, 'payments', () => paymentsPage());

function showPaymentDetail(id) {
  const payment = PAY.rows.find((row) => String(row.id) === String(id));
  if (!payment) return;
  const [tone, label] = PAY_STATUS_LABEL[payment.status] || ['neutral', payment.status];
  const line = (name, value) =>
    value
      ? `<div class="row" style="padding:6px 0"><span class="sp muted small">${name}</span><span class="small" style="word-break:break-all;text-align:right">${esc(value)}</span></div>`
      : '';
  const canRefund = payment.status === 'paid' && payment.amount - payment.refunded >= 1;
  dlg(
    `Payment · #${esc(payment.orderId)}`,
    `<div class="row" style="padding-bottom:8px"><b style="font-size:22px">${rs(payment.amount)}</b><span class="sp"></span><span class="tag ${tone}">${label}</span></div>
     ${line('Buyer', payment.buyer)}${line('Phone', payment.phone)}${line('Method', payment.method)}${line('Date', payDate(payment.createdAt))}${line('Razorpay payment', payment.razorpayPaymentId)}${line('Razorpay order', payment.razorpayOrderId)}${payment.refunded ? line('Refunded', rs(payment.refunded)) : ''}${line('Why it failed', payment.failureReason)}`,
    null,
    `<button class="btn line" data-act="close">Close</button>
     <button class="btn grey" data-go="order:${esc(payment.orderId)}" data-close="1">Open order</button>
     ${payment.razorpayPaymentId ? `<a class="btn grey" href="${RAZORPAY_DASHBOARD}/${encodeURIComponent(payment.razorpayPaymentId)}" target="_blank" rel="noopener noreferrer">Open in Razorpay</a>` : ''}
     ${canRefund ? `<button class="btn main" data-act="payrefund" data-order="${esc(payment.orderId)}">Refund</button>` : ''}`,
  );
}

/* ---------- pay an order online ---------- */

let razorpayScript = null;
function loadRazorpayCheckout() {
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

/** Reload everything from the server once local edits are saved (used after a payment or refund). */
async function reloadFromServer() {
  await saveChanges();
  const state = await dapi('GET', '/api/state');
  for (const kind of SYNCED_KINDS) {
    D[kind] = state.collections[kind];
    SYNC.snapshot[kind] = JSON.stringify(D[kind]);
    SYNC.known[kind] = D[kind].map((item) => item.id);
  }
  fillThumbs();
  D.stats = state.stats;
  relabel();
  PAY.loaded = false;
  render();
}

async function payOrderOnline(order) {
  try {
    await saveChanges(); // the server reads the order's saved total
    const payment = await dapi('POST', `/api/orders/${encodeURIComponent(order.id)}/payment`);
    await loadRazorpayCheckout();
    const checkout = new Razorpay({
      key: payment.keyId,
      amount: payment.amount,
      currency: payment.currency,
      order_id: payment.orderId,
      name: USER.shop,
      description: `Order #${order.id}`,
      prefill: { name: order.who, contact: order.phone || '' },
      theme: { color: '#EA5B1E' },
      handler: async (response) => {
        try {
          await dapi('POST', '/api/public/razorpay/verify', response);
          await reloadFromServer();
          toast('Payment received and verified');
        } catch (error) {
          toast(`Razorpay says it was paid, but we could not verify it yet: ${error.message}`);
        }
      },
      modal: { ondismiss: () => toast('Payment cancelled. You can try again.') },
    });
    checkout.on('payment.failed', (event) =>
      toast(`The payment failed: ${(event.error && event.error.description) || 'try another method'}`),
    );
    checkout.open();
  } catch (error) {
    toast(error.message);
  }
}

live(V, 'order', (original) => {
  const order = D.orders.find((item) => String(item.id) === String(route.arg)) || D.orders[0];
  const html = original();
  if (!order || order.paid || !(D.rz && D.rz.configured)) return html;
  return html.replace(
    'data-act="remind">Copy UPI link</button>',
    'data-act="remind">Copy UPI link</button><button class="btn main sm" data-act="payonline">Pay online</button>',
  );
});

/* ---------- refunds ---------- */

/** An order paid through Razorpay is refunded through Razorpay; any other order is only marked refunded. */
function refund() {
  const order = D.orders.find((item) => String(item.id) === String(route.arg)) || D.orders[0];
  if (!order) return;
  const online = Boolean(order.paymentId);

  dlg(
    `Refund #${order.id}`,
    `<p class="muted small" style="margin:0 0 12px">${online ? 'Razorpay sends the money back to your buyer.' : 'This order was not paid through Razorpay, so you send the money back yourself. This only marks the order as refunded.'}</p>` +
      fld('f1', 'Refund amount (₹)', order.total, '', 'number') +
      sel(
        'f2',
        'Reason',
        ['Buyer changed their mind', 'Item damaged', 'Wrong item sent', 'Other'],
        'Buyer changed their mind',
      ),
    async () => {
      const amount = Number(gv('f1'));
      if (!(amount > 0 && amount <= order.total)) return toast('Enter an amount up to ' + rs(order.total));
      if (online) {
        try {
          await dapi('POST', `/api/orders/${encodeURIComponent(order.id)}/refund`, { amount, reason: gv('f2') });
          overlay = null;
          await reloadFromServer();
          toast('Refund of ' + rs(amount) + ' sent to Razorpay');
        } catch (error) {
          toast(error.message);
        }
        return;
      }
      order.refunded = true;
      order.refundAmount = amount;
      order.notes = [...(order.notes || []), `Refunded ${rs(amount)} · ${gv('f2')}`];
      done('Marked as refunded');
    },
  );
}

/* ---------- online payments for the shop: setup status, the seller's choices, and the payout account ---------- */

const PAYOUT = { loaded: false, data: null };

const PAYOUT_EXPLAIN = {
  created: 'Razorpay has the account but it is not ready yet.',
  needs_clarification: 'Razorpay needs more details from you. Finish them in your Razorpay account.',
  under_review: 'Razorpay is reviewing the account. Payments are not sent to it until it is activated.',
  activated: 'Active. Online payments from your shop are sent straight to this account.',
  suspended: 'Razorpay has suspended this account.',
  rejected: 'Razorpay rejected this account.',
};

const SETUP_TONE = {
  active: 'ok',
  pending: 'warn',
  setup_required: 'warn',
  unavailable: 'bad',
  not_configured: 'neutral',
};

async function loadPayout() {
  try {
    PAYOUT.data = await dapi('GET', '/api/payments/setup');
  } catch (error) {
    PAYOUT.data = {
      state: 'not_configured',
      label: 'Unavailable',
      detail: error.message,
      route: false,
      account: null,
      online: false,
      manual: true,
      manualInstructions: '',
      canEnableOnline: false,
    };
  }
  PAYOUT.loaded = true;
  if (route.name === 'setting' && route.arg === 'Payments') render();
}

function payoutSection() {
  if (!PAYOUT.loaded) {
    loadPayout();
    return '';
  }
  const setup = PAYOUT.data;
  const account = setup.account;
  const toggle = (act, on, label, disabled = false) =>
    `<button class="switch ${on ? 'on' : ''}" data-act="${act}" role="switch" aria-checked="${on}" aria-label="${label}" ${disabled ? 'disabled' : ''}></button>`;

  const link = setup.route
    ? `<div class="hr"></div>${
        account
          ? `<div class="row"><span class="sp"><b>${esc(account.id)}</b><br><span class="tiny muted">${PAYOUT_EXPLAIN[account.status] || ''}</span></span><span class="tag ${account.status === 'activated' ? 'ok' : 'warn'}">${esc(account.status.replace(/_/g, ' '))}</span></div>
            <div class="row" style="gap:8px;margin-top:12px"><button class="btn grey sm" data-act="payoutrefresh">Check status again</button><button class="btn line sm" data-act="payoutunlink">Remove</button></div>`
          : `<p class="small muted" style="margin:10px 0">To be paid into your own bank account, create a linked account for yourself in the Razorpay Route dashboard, then paste its ID here. Money is never sent to a linked account until Razorpay activates it.</p>
            <div class="field" style="margin:0"><label for="payout-id">Razorpay linked account ID</label><div class="row" style="gap:8px"><input class="input sp" id="payout-id" placeholder="acc_XXXXXXXXXXXXXX" style="margin:0" maxlength="40"><button class="btn ink sm" data-act="payoutlink">Link account</button></div></div>`
      }`
    : '';

  return `<div class="sec-t">Online payments for your shop</div>
    <div class="card">
      <div class="row"><span class="sp"><b>Razorpay</b>${setup.mode ? ` <span class="tiny muted">(${setup.mode} mode)</span>` : ''}<br><span class="tiny muted">${esc(setup.detail)}</span></span><span class="tag ${SETUP_TONE[setup.state] || 'neutral'}">${esc(setup.label)}</span></div>
      ${link}
      <div class="hr"></div>
      <div class="row" style="padding:6px 0"><span class="sp"><b>Accept online payments</b><br><span class="tiny muted">Buyers pay by UPI, card or netbanking through Razorpay. An order counts as paid only after Razorpay confirms it.</span></span>${toggle('payonlinetoggle', setup.online && setup.canEnableOnline, 'Accept online payments', !setup.canEnableOnline && !setup.online)}</div>
      <div class="row" style="padding:6px 0"><span class="sp"><b>Let buyers pay you directly</b><br><span class="tiny muted">Buyers place the order and you arrange the payment yourself. These orders stay unpaid until you mark them paid.</span></span>${toggle('paymanualtoggle', setup.manual, 'Let buyers pay you directly')}</div>
      <div class="field" style="margin:10px 0 0"><label for="pay-instructions">What buyers read about paying you directly</label><textarea class="input" id="pay-instructions" rows="2" maxlength="400" placeholder="Pay by UPI to yourname@okhdfc and send a screenshot on WhatsApp.">${esc(setup.manualInstructions || '')}</textarea></div>
      <div class="row" style="margin-top:10px"><button class="btn grey sm" data-act="paymanualsave">Save instructions</button></div>
    </div>`;
}

/* ---------- clicks ---------- */

document.addEventListener(
  'click',
  async (event) => {
    const element = event.target.closest('[data-act]');
    if (!element || !D.live) return;
    const act = element.dataset.act;
    const handled = () => {
      event.stopImmediatePropagation();
      event.preventDefault();
    };

    if (act === 'paystatus') {
      handled();
      PAY.status = element.dataset.v;
      loadPayments();
      render();
    } else if (act === 'payrange') {
      handled();
      PAY.range = element.dataset.v;
      loadPayments();
      render();
    } else if (act === 'payreload') {
      handled();
      PAY.error = '';
      loadPayments();
      render();
    } else if (act === 'paydetail') {
      handled();
      showPaymentDetail(element.dataset.id);
    } else if (act === 'payrefund') {
      handled();
      overlay = null;
      renderLayer();
      go('order:' + element.dataset.order);
      setTimeout(refund, 150);
    } else if (act === 'payonline') {
      handled();
      const order = D.orders.find((item) => String(item.id) === String(route.arg));
      if (order) payOrderOnline(order);
    } else if (act === 'payonlinetoggle' || act === 'paymanualtoggle') {
      handled();
      const setup = PAYOUT.data;
      const body = act === 'payonlinetoggle' ? { online: !setup.online } : { manual: !setup.manual };
      try {
        PAYOUT.data = await dapi('PUT', '/api/payments/setup', body);
        render();
        toast(
          act === 'payonlinetoggle'
            ? PAYOUT.data.online
              ? 'Online payments are on'
              : 'Online payments are off'
            : PAYOUT.data.manual
              ? 'Buyers can pay you directly'
              : 'Direct payment is off',
        );
      } catch (error) {
        toast(error.message);
      }
    } else if (act === 'paymanualsave') {
      handled();
      const box = document.getElementById('pay-instructions');
      try {
        PAYOUT.data = await dapi('PUT', '/api/payments/setup', { manualInstructions: box ? box.value : '' });
        render();
        toast('Saved');
      } catch (error) {
        toast(error.message);
      }
    } else if (act === 'payoutrefresh') {
      handled();
      try {
        PAYOUT.data = await dapi('POST', '/api/payouts/refresh');
        render();
        toast('Account status: ' + PAYOUT.data.label.toLowerCase());
      } catch (error) {
        toast(error.message);
      }
    } else if (act === 'payoutlink') {
      handled();
      const input = document.getElementById('payout-id');
      const accountId = input ? input.value.trim() : element.dataset.id;
      try {
        const result = await dapi('POST', '/api/payouts/link', { accountId });
        await loadPayout();
        toast('Account status: ' + result.account.status.replace(/_/g, ' '));
      } catch (error) {
        toast(error.message);
      }
    } else if (act === 'payoutunlink') {
      handled();
      try {
        await dapi('DELETE', '/api/payouts/link');
        await loadPayout();
      } catch (error) {
        toast(error.message);
      }
    }
  },
  true,
);

document.addEventListener('input', (event) => {
  if (!event.target.matches('[data-pay-search]')) return;
  clearTimeout(PAY.timer);
  PAY.timer = setTimeout(() => {
    PAY.query = event.target.value.trim();
    loadPayments();
  }, 300);
});

/* ---------- a Payments link in the menu ---------- */

function addPaymentsToMenu() {
  if (!D.live) return;
  const money = document.querySelector('.dnav [data-go="money"]');
  if (money && !document.querySelector('.dnav [data-go="payments"]')) {
    const row = money.cloneNode(true);
    row.dataset.go = 'payments';
    row.title = 'Payments';
    row.className = 'nrow' + (route.name === 'payments' ? ' on' : '');
    row.querySelector('.l').textContent = 'Payments';
    row.querySelector('svg').outerHTML = I('card', 18);
    money.after(row);
  }
}

{
  const draw = renderLayer;
  renderLayer = function () {
    draw();
    addPaymentsToMenu();
  };
  const drawMenu = OV.menu;
  if (drawMenu)
    OV.menu = () =>
      D.live
        ? drawMenu().replace(
            /(<button class="nav[^"]*" data-go="money"[^>]*>[\s\S]*?<\/button>)/,
            `$1<button class="nav ${route.name === 'payments' ? 'on' : ''}" data-go="payments" data-close="1">${I('card', 22)} Payments</button>`,
          )
        : drawMenu();
}
