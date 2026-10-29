/**
 * Analytics for real accounts: a date range (today, 7, 30 or 90 days), compared with the range
 * before it. Numbers come from GET /api/analytics, which reads only this seller's records.
 * With too little data the page says so instead of showing a made-up trend.
 */

const ANALYTICS_RANGES = [
  [1, 'Today'],
  [7, '7 days'],
  [30, '30 days'],
  [90, '90 days'],
];
const ANALYTICS = { days: 7, loadedFor: 0, data: null, loading: false, error: '' };

async function loadAnalytics() {
  const days = ANALYTICS.days;
  ANALYTICS.loading = true;
  ANALYTICS.error = '';
  try {
    ANALYTICS.data = await dapi('GET', '/api/analytics?days=' + days);
    ANALYTICS.loadedFor = days;
  } catch (error) {
    ANALYTICS.error = error.message;
  }
  ANALYTICS.loading = false;
  if (route.name === 'analytics') render();
}

/** "12% more than the 7 days before", or a plain note when there is nothing to compare with. */
function comparison(change, days) {
  if (change == null) return 'Nothing earlier to compare with';
  const label = days === 1 ? 'yesterday' : `the ${days} days before`;
  if (change === 0) return `Same as ${label}`;
  return `${Math.abs(change)}% ${change > 0 ? 'more' : 'less'} than ${label}`;
}

function analyticsBody(data) {
  const { summary } = data;
  const bestSellers = data.bestSellers;
  const channels = Object.entries(data.channels);
  const channelTotal = channels.reduce((total, [, count]) => total + count, 0);
  const top = Math.max(1, ...summary.bars.map((bar) => bar.value));

  const headline = summary.orders
    ? `You sold <b>${rs(summary.sales)}</b> from <b>${summary.orders}</b> order${summary.orders > 1 ? 's' : ''}. That is ${comparison(summary.salesChangePercent, summary.days)}.`
    : 'There are no orders in this period yet. Share your shop link to get started.';

  const chart = summary.bars.some((bar) => bar.value > 0)
    ? `<div class="bars" style="height:140px">${summary.bars.map((bar) => `<i title="${esc(bar.label)}: ${rs(bar.value)}" style="height:${Math.max(3, Math.round((bar.value / top) * 100))}%"></i>`).join('')}</div>
       <div class="row tiny muted" style="justify-content:space-between;margin-top:6px"><span>${esc(summary.bars[0].label)}</span><span>${esc(summary.bars[summary.bars.length - 1].label)}</span></div>`
    : '<p class="muted small" style="margin:8px 0 0">No paid orders in this period, so there is nothing to chart.</p>';

  const bestCard = `<div class="card"><b style="text-decoration:underline dotted">Best sellers</b><div class="small muted" style="margin:2px 0 6px">By money earned in this period</div>${
    bestSellers.length
      ? bestSellers
          .map(
            (item, index) =>
              `<div class="row" style="gap:10px;padding:8px 0;${index ? 'border-top:1px solid var(--line-soft)' : ''}"><b class="muted" style="width:16px">${index + 1}</b><div class="sp"><b class="small">${esc(item.name)}</b><div style="height:6px;background:var(--muted);border-radius:3px;margin-top:6px"><div style="width:${Math.round((item.earned / bestSellers[0].earned) * 100)}%;height:100%;background:var(--primary);border-radius:3px"></div></div></div><div style="text-align:right"><b class="small">${rs(item.earned)}</b><div class="tiny muted">${item.sold} sold</div></div></div>`,
          )
          .join('')
      : '<p class="muted small" style="margin:8px 0 0">Best sellers appear after paid orders.</p>'
  }</div>`;

  const channelCard = `<div class="card"><b style="text-decoration:underline dotted">Orders by channel</b><div class="tiny muted" style="margin:2px 0 0">All time</div>${
    channelTotal
      ? channels
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => {
            const share = Math.round((count / channelTotal) * 100);
            return `<div class="row small" style="margin-top:14px"><span style="width:84px">${esc(name)}</span><div class="sp" style="height:10px;background:var(--muted);border-radius:5px"><div style="width:${share}%;height:100%;background:var(--primary);border-radius:5px"></div></div><b style="width:36px;text-align:right">${share}%</b></div>`;
          })
          .join('')
      : '<p class="muted small" style="margin:12px 0 0">No orders yet.</p>'
  }</div>`;

  return `<div class="aibox" style="margin-bottom:12px"><div class="who">${I('spark', 14)} In short</div><p style="margin:6px 0 0">${headline}</p></div>
    ${kpiRow(
      [
        ['Sales', rs(summary.sales)],
        ['Orders', String(summary.orders)],
        ['Average order', rs(summary.averageOrder)],
        ['Before', rs(summary.previous.sales)],
      ],
      'k4',
    )}
    <div style="display:grid;gap:16px;margin-top:16px;grid-template-columns:${DESK ? '1fr 1fr' : '1fr'}">
      <div class="card"><b style="text-decoration:underline dotted">Sales over time</b><div class="h2" style="margin:4px 0 10px">${rs(summary.sales)}</div>${chart}</div>
      ${channelCard}${bestCard}${ratingsCard()}
    </div>`;
}

live(V, 'analytics', () => {
  if (ANALYTICS.loadedFor !== ANALYTICS.days && !ANALYTICS.loading && !ANALYTICS.error) loadAnalytics();

  const chips = ANALYTICS_RANGES.map(
    ([days, label]) =>
      `<button class="chip ${days === ANALYTICS.days ? 'on' : ''}" data-act="anarange" data-v="${days}">${days === 1 ? I('cal', 15) + ' ' : ''}${label}</button>`,
  ).join('');
  const body = ANALYTICS.error
    ? `<div class="banner" style="background:var(--negative-tint);color:var(--negative-deep)">${I('shield', 18)}<div>${esc(ANALYTICS.error)} <button class="link" data-act="anareload">Try again</button></div></div>`
    : ANALYTICS.data && ANALYTICS.loadedFor === ANALYTICS.days
      ? analyticsBody(ANALYTICS.data)
      : noList('Loading analytics…');

  return (
    topRow('chart', 'Analytics', DESK ? '<button class="btn line sm" data-act="soon">Reports</button>' : '') +
    `<div class="pad"><div class="box ctl"><div class="chips">${chips}</div></div>${body}</div>`
  );
});

document.addEventListener(
  'click',
  (event) => {
    const element = event.target.closest('[data-act="anarange"],[data-act="anareload"]');
    if (!element || !D.live) return;
    event.stopImmediatePropagation();
    event.preventDefault();
    if (element.dataset.act === 'anarange') ANALYTICS.days = Number(element.dataset.v);
    ANALYTICS.error = '';
    ANALYTICS.loadedFor = 0;
    render();
  },
  true,
);
