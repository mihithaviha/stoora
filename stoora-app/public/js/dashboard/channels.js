/**
 * Chats from WhatsApp and Instagram, and "Ask Stoora" (the assistant), for real accounts.
 * Loaded after live.js.
 */

/* ---------- Chats ---------- */

const chatNote = (html) =>
  `<div class="banner info" style="margin-bottom:12px">${I('chat', 18)}<div>${html}</div></div>`;

/** The note at the top of Chats: what is waiting, or how to connect an account. */
function chatsBanner() {
  if (!D.chats.length) {
    return chatNote(
      'No chats yet. Connect WhatsApp or Instagram in <button class="link" data-go="setting:Apps">Settings › Apps</button> and buyer messages will appear here.',
    );
  }
  const ready = D.chats.filter((chat) => chat.mood === 'ready' && chat.unread).length;
  return chatNote(
    ready
      ? `<b>${ready} buyer${ready > 1 ? 's are' : ' is'} ready to buy.</b> Replies are drafted. Check them and send.`
      : 'No one is waiting for a reply.',
  );
}

/** The chats screens with the sample banner replaced by a real one, and an empty-list message. */
function withRealChatsBanner(html) {
  const replaced = html.replace(/<div class="aibox" style="margin-bottom:12px">[\s\S]*?<\/div><\/div>/, chatsBanner());
  return D.chats.length
    ? replaced
    : replaced.replace(/(<div class="list">)(<\/div>)/, `$1${noList('No chats yet.')}$2`);
}
live(V, 'chats', (original) => withRealChatsBanner(original()));
live(V, 'chat', (original) => withRealChatsBanner(original()));

/** Send a reply through WhatsApp or Instagram, then show the updated chat. */
async function sendChatMessage(chat, text) {
  if (!text) return toast('Type a message first');
  try {
    const result = await dapi('POST', '/api/chats/' + encodeURIComponent(chat.id) + '/send', { text });
    D.chats[D.chats.indexOf(chat)] = result.chat;
    SYNC.snapshot.chats = JSON.stringify(D.chats); // the server already saved it
    render();
    toast('Sent on ' + chat.src);
  } catch (error) {
    toast(error.message);
  }
}

document.addEventListener(
  'click',
  (event) => {
    const element = event.target.closest('[data-act]');
    if (!element || !D.live || !['chat', 'chats'].includes(route.name)) return;
    const act = element.dataset.act;
    const chat = D.chats.find((item) => item.id === route.arg);
    const handled = () => {
      event.stopImmediatePropagation();
      event.preventDefault();
    };

    if (act === 'sendreply' && chat) {
      handled();
      sendChatMessage(chat, chat.draft);
    } else if (element.getAttribute('aria-label') === 'Send' && chat) {
      handled();
      const box = element.closest('.cv-in') || element.parentElement;
      sendChatMessage(chat, (box.querySelector('input') || {}).value.trim());
    }
  },
  true,
);

/* ---------- Ask Stoora ---------- */

const ask = { answers: {}, pending: {}, history: [] };

const textToHtml = (text) => `<p style="margin:6px 0 10px">${esc(text).replace(/\n/g, '<br>')}</p>`;

/** Summary cards the server built from the seller's real numbers. */
const cardsHtml = (cards) =>
  cards && cards.length
    ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:8px 0">${cards.map((card) => `<div class="tile static"><div class="k">${esc(card.label)}</div><div class="v">${esc(card.value)}</div>${card.note ? `<div class="tiny muted">${esc(card.note)}</div>` : ''}</div>`).join('')}</div>`
    : '';

/** A small bar chart (one bar per day or week) from the server's totals. */
function chartHtml(chart) {
  if (!chart) return '';
  const top = Math.max(1, ...chart.bars.map((bar) => bar.value));
  return `<div class="card" style="margin:8px 0"><b class="small">${esc(chart.title)}</b><div class="bars" style="height:70px;margin-top:8px">${chart.bars.map((bar) => `<i title="${esc(bar.label)}: ${rs(bar.value)}" style="height:${Math.max(3, Math.round((bar.value / top) * 100))}%"></i>`).join('')}</div></div>`;
}

/** Links to the pages the answer is about. They only navigate: the assistant never changes anything. */
const linksHtml = (links) =>
  links && links.length
    ? `<div class="row" style="gap:8px;flex-wrap:wrap">${links.map((link) => `<button class="btn grey sm" data-go="${esc(link.route)}" data-close="1">${esc(link.label)}</button>`).join('')}</div>`
    : '';

const answerHtml = (result) =>
  textToHtml(result.text) +
  cardsHtml(result.cards) +
  chartHtml(result.chart) +
  linksHtml(result.links) +
  (result.notice ? `<p class="tiny muted" style="margin:10px 0 0">${esc(result.notice)}</p>` : '');

/** The answer for a question. The first time it is asked, the server is called and the panel redraws when it arrives. */
live(window, 'answer', (_original, question) => {
  const key = (question || '').trim();
  if (!key) return '';
  if (ask.answers[key]) return ask.answers[key];
  if (!ask.pending[key]) {
    ask.pending[key] = true;
    dapi('POST', '/api/ai/ask', { question: key, history: ask.history.slice(-6) })
      .then((result) => {
        ask.answers[key] = answerHtml(result);
        ask.history.push({ role: 'user', text: key }, { role: 'assistant', text: result.text });
      })
      .catch((error) => {
        ask.answers[key] = textToHtml(error.message);
      })
      .finally(() => {
        delete ask.pending[key];
        if (overlay === 'ask') renderLayer();
      });
  }
  return '<p class="muted" style="margin:6px 0 10px">Thinking…</p>';
});

/* ---------- writing a product description ---------- */

document.addEventListener(
  'click',
  async (event) => {
    const element = event.target.closest('[data-act="aidesc"]');
    if (!element || !D.live) return;
    event.stopImmediatePropagation();
    event.preventDefault();

    const title = gv('pt');
    if (!title) return toast('Type the title first');
    try {
      const result = await dapi('POST', '/api/ai/describe', { title, category: gv('pf-cat'), sizes: gv('pf-sizes') });
      document.getElementById('pd').value = result.text;
      makeDirty();
    } catch (error) {
      toast(error.message);
    }
  },
  true,
);

/* ---------- connecting another account goes to Settings ---------- */

connectAnother = function () {
  overlay = null;
  go('setting:Apps');
};

/* ---------- "Confirm your email" reminder ---------- */

function emailBanner() {
  if (!D.live || USER.emailVerified) return;
  const screen = document.getElementById('screen');
  if (!screen || screen.querySelector('[data-email-banner]')) return;
  screen.insertAdjacentHTML(
    'afterbegin',
    `<div class="pad" data-email-banner style="padding-top:12px"><div class="banner info">${I('bill', 18)}<div><b>Confirm your email.</b> We sent a link to ${esc(USER.email)}. <button class="link" data-act="resendverify">Send it again</button></div></div></div>`,
  );
}

{
  const draw = render;
  render = function (scrollTop) {
    draw(scrollTop);
    emailBanner();
  };
}

document.addEventListener(
  'click',
  async (event) => {
    if (!event.target.closest('[data-act="resendverify"]')) return;
    event.stopImmediatePropagation();
    try {
      await dapi('POST', '/api/auth/resend-verification');
      toast('Sent. Check your email.');
    } catch (error) {
      toast(error.message);
    }
  },
  true,
);

/* ---------- helpers see only what their role allows ---------- */

const ROLE_ROUTES = {
  packing: ['home', 'orders', 'order', 'create', 'booking', 'search'],
  chat: ['home', 'chats', 'chat', 'customers', 'customer', 'search'],
};

const allowedRoutes = () => ROLE_ROUTES[USER && USER.role];

function restrictForHelper() {
  const allowed = allowedRoutes();
  if (!allowed) return;
  document.querySelectorAll('.dnav [data-go], .drawer [data-go], .setnav [data-go]').forEach((button) => {
    const target = button.dataset.go.split(':')[0].split('+')[0];
    if (!allowed.includes(target)) button.remove();
  });
  document.querySelectorAll('.dnav .ngrp, .dnav [data-ov="menu"]').forEach((item) => item.remove());
}

{
  const goTo = go;
  go = function (target, push) {
    const allowed = allowedRoutes();
    if (allowed && !allowed.includes(String(target).split(':')[0].split('+')[0])) target = allowed[1];
    return goTo(target, push);
  };
  const draw = renderLayer;
  renderLayer = function () {
    draw();
    restrictForHelper();
  };
}
