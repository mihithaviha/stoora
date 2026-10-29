/**
 * Small account-level pieces of the dashboard for real accounts: "Write it for me" on a product,
 * the "Confirm your email" reminder, and helpers seeing only what their role allows.
 * Loaded after live.js.
 */

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
