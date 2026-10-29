/**
 * Storefront builder (dashboard).
 *
 *  1. The Storefront page: "Choose your storefront", a gallery of the five templates with live
 *     thumbnails, a category filter and "Preview template".
 *  2. The editor: a full-screen workspace with editing panels, a live preview of the real template,
 *     a toolbar (save status, undo, desktop/mobile, preview, publish).
 *
 * The preview is the same renderer buyers get (public/js/storefront/templates.js), shown in an
 * iframe, so it cannot look different from the published store. Colours come only from the
 * curated Brand Kit themes in shared.js. Drafts save to the server; "Publish" copies the draft to
 * the version buyers see. Products come from the shop's real catalogue: nothing is copied or invented.
 */

const Shared = window.StoreShared;

const SF = {
  state: null, // what GET /api/storefront returned
  loading: false,
  error: '',
  filter: 'all',
  tab: 'templates', // the Storefront page has three tabs: templates, editor, how
  config: null, // the draft being edited
  dirty: false,
  saveState: 'saved', // saved, saving, unsaved, failed
  edits: 0, // counts every change, so a save knows whether the seller kept typing while it was in flight
  revision: 0, // the server's revision of the draft this editor started from (stops stale overwrites)
  saving: null, // the save in flight, if any
  reopenEditor: false, // the seller went to edit a product from the editor; come back to it afterwards
  conflict: false, // the draft was changed somewhere else; autosave stops until the seller reloads
  history: [],
  future: [],
  device: 'desktop',
  mobileTab: 'edit',
  openPanels: new Set(['template', 'theme']), // editor panels the seller has opened (kept when a panel is redrawn)
  timers: {},
  premium: null, // { templates: [{id, owned}], pricing } from GET /api/storefront/premium
  buying: '', // premium template being paid for right now
};

const STATUS_TEXT = {
  none: ['Not started', 'warn'],
  draft: ['Draft', 'warn'],
  ready: ['Ready to publish', 'ok'],
  published: ['Published', 'ok'],
  changes: ['Changes not yet published', 'warn'],
};

/**
 * "Come back to the editor after the product form". The destination is always the storefront editor of
 * this seller (never an address taken from the page or the URL, so it cannot be used to redirect anywhere).
 * It is kept in sessionStorage as well, so refreshing the product form does not lose it.
 */
const RETURN_KEY = 'stoora.sfreturn.v1';
function setEditorReturn(on) {
  SF.reopenEditor = on;
  try {
    if (on) sessionStorage.setItem(RETURN_KEY, JSON.stringify({ template: SF.config && SF.config.template, at: Date.now() }));
    else {
      sessionStorage.removeItem(RETURN_KEY);
      if (/^#add(product|service)/.test(location.hash)) history.replaceState(null, '', '#storefront');
    }
  } catch (_) {
    /* the in-memory flag still works */
  }
}
function editorReturnPending() {
  if (SF.reopenEditor) return true;
  try {
    const saved = JSON.parse(sessionStorage.getItem(RETURN_KEY) || 'null');
    return Boolean(saved && Date.now() - saved.at < 2 * 60 * 60 * 1000);
  } catch (_) {
    return false;
  }
}

/** Save the draft, close the editor and open a product or service form that returns here once it is saved. */
async function openItemForm(form, id = '') {
  if (!(await saveDraft())) return; // never leave with work that is not stored
  setEditorReturn(true);
  closeEditor(true);
  const target = id ? `${form}:${id}` : form;
  // Write the route into the address, so refreshing the form reopens it (and the way back to the editor).
  history.replaceState(null, "", "#" + target);
  go(target);
}

const publicUrl = () => `${location.origin}/s/${USER.handle}`;
const clone = (value) => JSON.parse(JSON.stringify(value));

/* ---------- loading ---------- */

async function loadStorefront() {
  SF.loading = true;
  SF.error = '';
  try {
    SF.state = await dapi('GET', '/api/storefront');
    SF.revision = SF.state.revision || 0;
  } catch (error) {
    SF.error = error.message;
  }
  SF.loading = false;
  if (route.name === 'storefront') render();
}

async function loadPremium() {
  if (SF.premium || SF.premiumLoading) return;
  SF.premiumLoading = true;
  try {
    SF.premium = await dapi('GET', '/api/storefront/premium');
  } catch (error) {
    SF.premium = { templates: [], pricing: { canCharge: false, amount: null }, error: error.message };
  }
  SF.premiumLoading = false;
  if (route.name === 'storefront') render();
}

/** Free templates are always usable; a premium one only once the server says this seller owns it. */
const ownsTemplate = (id) =>
  !Shared.isPremium(id) || Boolean(SF.premium && SF.premium.templates.find((item) => item.id === id && item.owned));

/** The price exactly as the server configured it. Nothing is shown when no price has been set. */
function priceText() {
  const pricing = SF.premium && SF.premium.pricing;
  return pricing && pricing.amount ? `${rs(pricing.amount)} one-time` : '';
}

/* ---------- the Storefront page ---------- */

function galleryFilterChips() {
  return Shared.GALLERY_FILTERS.map(
    ([id, label]) =>
      `<button class="chip ${id === SF.filter ? 'on' : ''}" data-act="sffilter" data-v="${id}">${label}</button>`,
  ).join('');
}

function templateCard(template) {
  const theme = Shared.themeById(template.theme);
  const owned = ownsTemplate(template.id);
  const current = SF.state && SF.state.status !== 'none' && SF.config && SF.config.template === template.id;
  const price = template.premium && !owned ? priceText() : '';
  const action = !owned
    ? `<button class="btn main" data-act="sfunlock" data-id="${template.id}">Unlock</button>`
    : `<button class="btn main" data-act="sfuse" data-id="${template.id}">${current ? 'Edit' : 'Customise'}</button>`;
  return `<article class="sfg-card ${template.premium ? 'premium' : ''} ${current ? 'is-current' : ''}">
    <div class="sfg-thumb" data-thumb><iframe title="${esc(template.name)} preview" src="/store-preview.html?sample=${template.id}&theme=${template.theme}" loading="lazy" tabindex="-1" aria-hidden="true"></iframe></div>
    <div class="sfg-body"><h3 class="sfg-title">${esc(template.name)} <span class="sfg-pill ${template.premium ? 'pro' : ''}">${template.premium ? (owned ? 'Unlocked' : 'Premium') : 'Free'}</span>${current ? '<span class="sfg-pill ok">In use</span>' : ''}</h3>
      <p class="sfg-blurb">${esc(template.blurb)}</p>
      <p class="sfg-suits">Suits: ${esc(template.suits)}</p>
      <div class="sfg-swatches" aria-label="Default colours">${[theme.primary, theme.secondary, theme.accent, theme.background, theme.surface].map((c) => `<i style="background:${c}"></i>`).join('')}</div>
      <div class="sfg-btns">${action}<button class="btn line" data-act="sfpreview" data-id="${template.id}">Full preview</button></div>${price ? `<p class="sfg-suits" style="margin:6px 0 0">${price}</p>` : ''}</div></article>`;
}

function currentStorefrontCard() {
  const state = SF.state;
  if (!state || state.status === 'none') return '';
  const [label, tone] = STATUS_TEXT[state.status];
  const template = Shared.templateById(state.config.template);
  const live = state.status === 'published' || state.status === 'changes';
  return `<div class="box" style="margin-bottom:16px"><div class="row" style="gap:12px;flex-wrap:wrap"><span class="sp"><b>${esc(template.name)}</b> <span class="tag ${tone}">${label}</span><br><span class="small muted">${live ? `Live at <a class="link" href="${publicUrl()}" target="_blank" rel="noopener">${esc(location.host)}/s/${esc(USER.handle)}</a>` : 'Not visible to customers yet.'}</span></span>
    <button class="btn ink" data-act="sfedit">Edit your storefront</button></div></div>`;
}

const SF_TABS = [
  ['templates', 'Templates'],
  ['editor', 'Editor'],
  ['how', 'How it works'],
];

/** View and share the public storefront from anywhere on the Storefront page (not only inside the editor). */
function viewStoreButtons() {
  if (!D.live) return '';
  const live = SF.state && (SF.state.status === 'published' || SF.state.status === 'changes');
  if (!live)
    return `<button class="btn line sm" data-act="sfview" title="Publish your storefront to share it">View storefront</button>`;
  return `<a class="btn main sm" href="${esc(publicUrl())}" target="_blank" rel="noopener">View storefront</a><button class="btn line sm" data-act="sfshare">Copy link</button>`;
}

function sfTabs() {
  return `<div class="sf-tabs" role="tablist">${SF_TABS.map(([id, label]) => `<button class="sf-tab" role="tab" aria-selected="${SF.tab === id}" data-act="sftab" data-v="${id}">${label}</button>`).join('')}</div>`;
}

function templatesTab() {
  const shown = Shared.TEMPLATES.filter((template) => SF.filter === 'all' || template.categories.includes(SF.filter));
  const pricing = SF.premium && SF.premium.pricing;
  const note =
    pricing && !pricing.canCharge
      ? '<p class="tiny muted" style="margin:0 0 12px">Previews are free. Buying a premium template is not switched on for this account yet.</p>'
      : '';
  return `<h1 class="h1 sf-h1">Choose your storefront</h1>
    <p class="sf-lede">${Shared.TEMPLATES.length} templates drawn by the real Stoora renderer, with sample shops. Pick one to open it in the editor. Your real products replace the sample ones.</p>
    ${currentStorefrontCard()}${D.live ? '' : `<div class="banner info" style="margin-bottom:12px">${I('bill', 18)}<div>This is the sample shop, so templates are for looking only. Create your own shop to build a storefront.</div></div>`}
    <div class="chips sf-chips">${galleryFilterChips()}</div>${note}
    <div class="sfg-grid">${shown.map(templateCard).join('')}</div>`;
}

/** The Editor tab: controls on the left, the live storefront on the right. It edits the same draft as the full editor. */
function editorTab() {
  if (!D.live)
    return `<h1 class="h1 sf-h1">Editor</h1><div class="box"><p style="margin:0 0 10px">This is the sample shop, so there is nothing to edit.</p><p class="small muted" style="margin:0">Create your own shop to build a storefront.</p></div>`;
  if (!SF.state || !SF.config) return noList('Loading your storefront…');
  if (SF.state.status === 'none' && !SF.dirty)
    return `<h1 class="h1 sf-h1">Editor</h1><div class="box"><p style="margin:0 0 12px"><b>Pick a template to start.</b></p><button class="btn main" data-act="sftab" data-v="templates">Choose a template</button></div>`;
  const [badge, tone] = STATUS_TEXT[SF.state.status];
  return `<div class="sfroot sfin" id="sfin">
    <div class="sfin-controls"><aside class="sfed-panel" aria-label="Editing controls">${editorPanels()}</aside></div>
    <div class="sfin-stage">
      <div class="sfin-tools">
        <div class="seg sfed-device"><button class="${SF.device === 'desktop' ? 'on' : ''}" data-sf="device" data-id="desktop">Desktop</button><button class="${SF.device === 'mobile' ? 'on' : ''}" data-sf="device" data-id="mobile">Mobile</button></div>
        <button class="ibtn sm" data-sf="undo" aria-label="Undo">${I('back', 16)}</button><button class="ibtn sm" data-sf="redo" aria-label="Redo">${I('right', 16)}</button>
        <span class="tag ${tone} sfed-badge">${badge}</span><span class="sfed-save ${SF.saveState}">All changes saved</span>
        <span class="sp"></span>
        <button class="btn line sm" data-sf="preview">Full preview</button>
        <button class="btn line sm" data-sf="save">Save draft</button>
        <button class="btn main sm" data-sf="publish">${publishLabel()}</button>
      </div>
      <div class="sfed-device-frame ${SF.device}"><iframe title="Live preview of your storefront" src="/store-preview.html"></iframe></div>
    </div></div>`;
}

function howTab() {
  const steps = [
    ['1. Choose a template', 'A gallery with live thumbnails and a category filter. Five are free and three are premium. Anyone can preview a premium one; applying it needs access.'],
    ['2. Edit the draft', 'Pick a theme and an approved accent, rename the shop, write the hero line and switch sections on or off. The preview is the same renderer buyers get.'],
    ['3. Publish', `Drafts save to the server, with undo. Publish copies the draft to the version buyers see at ${esc(location.host)}/s/${esc(USER.handle)}.`],
    ['4. Buyers shop', 'Every template sells the same way: cart, checkout with UPI, pay on contact or Razorpay, and "Where is my order?" tracking.'],
  ];
  return `<h1 class="h1 sf-h1">How the storefront section works</h1>
    <p class="sf-lede">Everything a seller does between choosing a look and having a public shop page.</p>
    <div class="sf-how">${steps.map(([title, text]) => `<div><h3>${title}</h3><p>${text}</p></div>`).join('')}</div>
    <h2 class="sf-h2">Themes</h2>
    <p class="sf-lede" style="margin-bottom:0">Colours come only from the Stoora palette, and every theme passes the contrast test for text and buttons.</p>
    <div class="sf-table"><table><tr><th>Theme</th><th>Look</th><th>Colours</th></tr>${Shared.THEMES.map((theme) => `<tr><td><b>${esc(theme.name)}</b></td><td>${esc(theme.note)}</td><td><span class="sfg-swatches">${[theme.background, theme.primary, theme.secondary, theme.accent].map((c) => `<i style="background:${c}"></i>`).join('')}</span></td></tr>`).join('')}</table></div>
    <p class="tiny muted" style="margin-top:20px">Sample photos are labelled demo images and never appear on a real shop.</p>`;
}

V.storefront = () => {
  if (!SF.state && !SF.loading && !SF.error) loadStorefront();
  if (SF.state && !SF.config) SF.config = clone(SF.state.config);
  if (D.live) loadPremium();
  const content = SF.error
    ? `<div class="banner" style="background:var(--negative-tint);color:var(--negative-deep)">${I('shield', 18)}<div>${esc(SF.error)} <button class="link" data-act="sfreload">Try again</button></div></div>`
    : SF.tab === 'editor'
      ? editorTab()
      : SF.tab === 'how'
        ? howTab()
        : !SF.state
          ? noList('Loading your storefront…')
          : templatesTab();
  return topRow('store', 'Storefront', viewStoreButtons()) + `<div class="pad sf-page">${sfTabs()}${content}</div>`;
};

/** Open the draft in the inline Editor tab. */
function showEditor() {
  SF.history = [JSON.stringify(SF.config)];
  SF.future = [];
  SF.tab = 'editor';
  render();
  window.scrollTo(0, 0);
}

/** Scale each gallery thumbnail (a full-size page) down to the width of its card. */
function fitThumbnails() {
  document.querySelectorAll('[data-thumb]').forEach((box) => {
    const frame = box.querySelector('iframe');
    if (frame) frame.style.transform = `scale(${box.clientWidth / 1200})`;
  });
}
{
  const draw = render;
  render = function (scrollTop) {
    draw(scrollTop);
    if (route.name === 'storefront') {
      requestAnimationFrame(fitThumbnails);
      if (document.querySelector('.sfin')) setSaveState(SF.saveState);
    }
  };
  window.addEventListener('resize', () => {
    if (route.name === 'storefront') fitThumbnails();
  });
  // Leaving the product form any other way than saving cancels the "back to the editor" return.
  const settle = render;
  render = function (scrollTop) {
    settle(scrollTop);
    if (!['addproduct', 'addservice'].includes(route.name) && !document.querySelector('.sfroot') && editorReturnPending())
      setEditorReturn(false);
  };
}

/* ---------- preview a template ---------- */

function openTemplatePreview(templateId) {
  const template = Shared.templateById(templateId);
  let themeId = template.theme;
  let device = 'desktop';
  const overlayEl = document.createElement('div');
  overlayEl.className = 'sfpv';
  overlayEl.setAttribute('role', 'dialog');
  overlayEl.setAttribute('aria-label', `${template.name} preview`);

  const paint = () => {
    overlayEl.innerHTML = `<div class="sfpv-bar"><b class="sp">${esc(template.name)} <span class="muted small">· sample content</span></b>
      <div class="sfpv-themes">${Shared.THEMES.map((theme) => `<button class="sfpv-theme ${theme.id === themeId ? 'on' : ''}" data-theme="${theme.id}" title="${esc(theme.name)}" aria-label="${esc(theme.name)}"><i style="background:${theme.primary}"></i><i style="background:${theme.background}"></i><i style="background:${theme.accent}"></i></button>`).join('')}</div>
      <div class="seg"><button class="${device === 'desktop' ? 'on' : ''}" data-device="desktop">Desktop</button><button class="${device === 'mobile' ? 'on' : ''}" data-device="mobile">Mobile</button></div>
      ${ownsTemplate(templateId) ? '<button class="btn ink sm" data-use>Use This Template</button>' : '<button class="btn main sm" data-unlock>Unlock This Template</button>'}<button class="ibtn sm" data-close aria-label="Close">${I('x', 16)}</button></div>
      <div class="sfpv-stage"><div class="sfpv-device ${device}"><iframe title="Template preview" src="/store-preview.html?sample=${template.id}&theme=${themeId}"></iframe></div></div>`;
  };
  paint();
  overlayEl.addEventListener('click', (event) => {
    const target = event.target.closest('[data-theme],[data-device],[data-use],[data-unlock],[data-close]');
    if (!target) return;
    if (target.dataset.theme) {
      themeId = target.dataset.theme;
      paint();
    } else if (target.dataset.device) {
      device = target.dataset.device;
      paint();
    } else if (target.hasAttribute('data-use')) {
      overlayEl.remove();
      chooseTemplate(templateId);
    } else if (target.hasAttribute('data-unlock')) {
      overlayEl.remove();
      unlockTemplate(templateId);
    } else overlayEl.remove();
  });
  overlayEl.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') overlayEl.remove();
  });
  document.body.appendChild(overlayEl);
}

/* ---------- choosing a template ---------- */

/** A first storefront starts from what the shop already has: its name, WhatsApp, Instagram and address. */
function starterConfig(templateId) {
  const config = Shared.defaultConfig(templateId, { name: USER.shop });
  const settings = D.cfg || {};
  config.contact.whatsapp = /^\d{10}$/.test(settings.whatsapp || '') ? settings.whatsapp : '';
  config.contact.address = settings.address || '';
  const phone = String(USER.bizPhone || '')
    .replace(/\D/g, '')
    .slice(-10);
  config.contact.phone = phone.length === 10 ? phone : '';
  config.social.instagram = settings.instagram || '';
  return config;
}

/** Ask to buy a premium template: explain what it is, then open Razorpay. Access is only ever granted by the server. */
async function unlockTemplate(templateId) {
  if (!D.live) return toast('This is the sample shop. Create your own shop to buy a template.');
  const template = Shared.templateById(templateId);
  if (!SF.premium) {
    await loadPremium();
    if (!SF.premium) return;
  }
  const pricing = SF.premium.pricing;
  if (!pricing.canCharge) {
    return dlg(
      `${template.name} is not on sale yet`,
      '<p style="margin:0">Template purchases are not switched on for this Stoora account yet, so nothing can be charged. You can keep previewing every premium template for free.</p>',
      null,
      '<button class="btn main" data-act="close">Okay</button>',
    );
  }
  dlg(
    `Unlock ${template.name}`,
    `<p style="margin:0 0 10px"><b>${priceText()}</b> for this template, on your account.</p>
     <ul class="small" style="margin:0 0 10px;padding-left:18px"><li>Use it on your live storefront, with all your products and details kept.</li><li>Change colours, images and text as often as you like.</li><li>Paid securely through Razorpay. Your card or UPI details never reach Stoora.</li></ul>
     ${pricing.terms ? `<p class="tiny muted" style="margin:0">${esc(pricing.terms)}</p>` : '<p class="tiny muted" style="margin:0">This is separate from payments your customers make for orders.</p>'}`,
    () => {
      overlay = null;
      renderLayer();
      buyTemplate(templateId);
    },
    '<button class="btn line" data-act="close">Not now</button><button class="btn main" data-act="dlgok">Pay and unlock</button>',
  );
}

async function buyTemplate(templateId) {
  if (SF.buying) return;
  SF.buying = templateId;
  const template = Shared.templateById(templateId);
  try {
    const order = await dapi('POST', `/api/storefront/premium/${encodeURIComponent(templateId)}/order`);
    await loadRazorpayCheckout();
    const checkout = new Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: 'Stoora',
      description: `${template.name} storefront template`,
      prefill: { name: USER.name || '', email: USER.email || '' },
      theme: { color: '#EA5B1E' },
      handler: async (response) => {
        try {
          await dapi('POST', '/api/storefront/premium/verify', response);
          SF.premium = null;
          await loadPremium();
          toast(`${template.name} is unlocked`);
          chooseTemplate(templateId);
        } catch (error) {
          toast(
            `Razorpay says it was paid, but we could not confirm it yet: ${error.message}. If you were charged, access appears within a few minutes.`,
          );
        }
        SF.buying = '';
      },
      modal: {
        ondismiss: () => {
          SF.buying = '';
          toast('Payment cancelled. You were not charged.');
        },
      },
    });
    checkout.on('payment.failed', (event) =>
      toast(`The payment failed: ${(event.error && event.error.description) || 'try another method'}`),
    );
    checkout.open();
  } catch (error) {
    SF.buying = '';
    if (/already/i.test(error.message)) {
      SF.premium = null;
      loadPremium();
    }
    toast(error.message);
  }
}

function chooseTemplate(templateId) {
  if (!D.live) return toast('This is the sample shop. Create your own shop to build a storefront.');
  if (!ownsTemplate(templateId)) return unlockTemplate(templateId);
  const exists = SF.state && SF.state.status !== 'none';
  if (!exists) {
    SF.config = starterConfig(templateId);
    SF.dirty = true;
    return showEditor();
  }
  if (SF.config.template === templateId) return showEditor();

  const next = Shared.templateById(templateId);
  const from = Shared.templateById(SF.config.template);
  dlg(
    `Switch to ${next.name}?`,
    `<p style="margin:0 0 10px">Your products, business details, colours and texts all stay.</p>
     <p class="small muted" style="margin:0">Some content belongs to one template only (for example the story and process in Studio, or subjects and credentials in Services). It stays saved, but only templates that use it will show it. ${next.kind !== from.kind ? `<b>${next.kind === 'services' ? 'Services shows only your services, not products.' : 'This template shows products.'}</b>` : ''}</p>`,
    () => {
      const defaultCta = (kind) => (kind === 'services' ? 'Book a session' : 'Shop now');
      if (SF.config.hero.cta === defaultCta(from.kind)) SF.config.hero.cta = defaultCta(next.kind);
      SF.config.template = templateId;
      overlay = null;
      renderLayer();
      markChanged();
      showEditor();
    },
    '<button class="btn line" data-act="close">Keep my current template</button><button class="btn main" data-act="dlgok">Switch template</button>',
  );
}

/* ---------- the editor: state and saving ---------- */

const getPath = (object, path) =>
  path.split('.').reduce((value, key) => (value == null ? undefined : value[key]), object);
function setPath(object, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((node, key) => (node[key] = node[key] || {}), object)[last] = value;
}

function setSaveState(state) {
  SF.saveState = state;
  const label = { saved: 'All changes saved', saving: 'Saving…', unsaved: 'Unsaved changes', failed: 'Could not save' }[
    state
  ];
  const element = document.querySelector('.sfroot .sfed-save');
  if (element) {
    element.textContent = label;
    element.className = `sfed-save ${state}`;
    element.innerHTML = state === 'failed' ? `${label}. <button class="link" data-sf="retry">Retry</button>` : label;
  }
  const publish = document.querySelector('.sfroot [data-sf="publish"]');
  if (publish) publish.textContent = publishLabel();
  // No double submits: the save and publish buttons wait while a save is running.
  document.querySelectorAll('.sfroot [data-sf="save"], .sfroot [data-sf="publish"]').forEach((button) => {
    button.disabled = state === 'saving';
  });
}

function publishLabel() {
  const status = SF.state && SF.state.status;
  return status === 'published' || status === 'changes' ? 'Update website' : 'Publish website';
}

/** Something changed: update the preview now, remember it for undo, and save soon. */
function markChanged() {
  SF.dirty = true;
  SF.edits += 1;
  setSaveState('unsaved');
  pushPreview();
  clearTimeout(SF.timers.history);
  SF.timers.history = setTimeout(() => {
    const snapshot = JSON.stringify(SF.config);
    if (SF.history[SF.history.length - 1] !== snapshot) {
      SF.history.push(snapshot);
      if (SF.history.length > 40) SF.history.shift();
      SF.future = [];
    }
  }, 500);
  clearTimeout(SF.timers.save);
  SF.timers.save = setTimeout(saveDraft, 1200);
}

/**
 * Save the draft. One save runs at a time; if the seller keeps editing during it, a second save follows,
 * and "All changes saved" is shown only when nothing newer is waiting. Resolves true when everything is stored.
 */
async function saveDraft() {
  if (!D.live || !SF.config) return true;
  clearTimeout(SF.timers.save);
  if (SF.conflict) {
    showConflict();
    return false;
  }
  if (SF.saving) {
    await SF.saving;
    return SF.dirty ? saveDraft() : true;
  }
  const sent = SF.edits;
  setSaveState('saving');
  SF.saving = (async () => {
    try {
      const result = await dapi('PUT', '/api/storefront', { config: SF.config, baseRevision: SF.revision });
      SF.state = {
        ...(SF.state || {}),
        status: result.status,
        issues: result.issues,
        config: result.config,
        published: SF.state && SF.state.published,
        revision: result.revision,
      };
      SF.revision = result.revision;
      SF.dirty = SF.edits !== sent; // typed during the save? then it is still unsaved
      setSaveState(SF.dirty ? 'unsaved' : 'saved');
      refreshStatusBadge();
      if (SF.dirty) SF.timers.save = setTimeout(saveDraft, 400);
      return true;
    } catch (error) {
      if (error.status === 409) {
        SF.conflict = true;
        setSaveState('failed');
        showConflict();
      } else {
        SF.saveError = error.status ? error.message : 'Could not reach Stoora. Check your connection; your changes are kept here and will be saved when you retry.';
        setSaveState('failed');
        toast(SF.saveError);
      }
      return false;
    } finally {
      SF.saving = null;
    }
  })();
  return SF.saving;
}

function showConflict() {
  dlg(
    'This storefront changed somewhere else',
    '<p style="margin:0 0 8px">Another tab or device saved a newer version, so saving here could overwrite it. Nothing has been lost on the server.</p><p class="small muted" style="margin:0">Load the latest version to keep working. Changes you made in this tab since then will be discarded.</p>',
    async () => {
      overlay = null;
      renderLayer();
      await reloadLatest();
    },
    '<button class="btn line" data-act="close">Not now</button><button class="btn main" data-act="dlgok">Load the latest version</button>',
  );
}

/** Throw away this tab's draft state and open the editor on what the server has now. */
async function reloadLatest() {
  closeEditor(true);
  SF.conflict = false;
  SF.state = null;
  SF.config = null;
  SF.dirty = false;
  await loadStorefront();
  if (SF.state) {
    SF.config = clone(SF.state.config);
    showEditor();
  }
}

const frame = () => document.querySelector('.sfroot iframe');

function extrasForPreview() {
  return {
    payments: { online: Boolean(D.rz && D.rz.configured), upi: Boolean((D.cfg || {}).upi) },
    policies: {},
    gstin: (D.cfg || {}).gstin || '',
    pricesIncludeGst: (D.cfg || {}).pricesIncludeGst !== false,
  };
}

/** Send the current draft to the preview iframe. */
function pushPreview() {
  const target = frame();
  if (!target || !target.contentWindow) return;
  const data = Shared.visibleData(SF.state.data, SF.config);
  target.contentWindow.postMessage(
    { type: 'render', config: SF.config, data, extras: extrasForPreview() },
    location.origin,
  );
}

window.addEventListener('message', (event) => {
  if (event.origin === location.origin && event.data && event.data.type === 'ready' && document.querySelector('.sfroot'))
    pushPreview();
});

/* ---------- the editor: layout ---------- */

function panelSection(id, title, body, hint = '') {
  return `<details class="sfed-sec" data-panel="${id}" ${SF.openPanels.has(id) ? 'open' : ''}><summary>${title}</summary><div class="sfed-sec-body">${hint ? `<p class="tiny muted" style="margin:0 0 10px">${hint}</p>` : ''}${body}</div></details>`;
}

const textField = (path, label, { area = false, max = 120, placeholder = '' } = {}) =>
  `<div class="field"><label for="sf-${path}">${label}</label>${area ? `<textarea class="input" id="sf-${path}" data-path="${path}" maxlength="${max}" rows="4" placeholder="${esc(placeholder)}">${esc(getPath(SF.config, path) || '')}</textarea>` : `<input class="input" id="sf-${path}" data-path="${path}" maxlength="${max}" placeholder="${esc(placeholder)}" value="${esc(getPath(SF.config, path) || '')}">`}</div>`;

const listField = (path, label, placeholder) =>
  `<div class="field"><label for="sf-${path}">${label}</label><input class="input" id="sf-${path}" data-list="${path}" placeholder="${esc(placeholder)}" value="${esc((getPath(SF.config, path) || []).join(', '))}"><span class="tiny muted">Separate with commas.</span></div>`;

function imageField(path, label, hint = '') {
  const url = getPath(SF.config, path);
  return `<div class="field"><label>${label}</label><div class="sfed-image">${url ? `<img src="${esc(url)}" alt="">` : '<span class="muted small">No image yet</span>'}</div>
    <div class="row" style="gap:8px"><button class="btn grey sm" data-sf="upload" data-path="${path}">${url ? 'Change image' : 'Upload image'}</button>${url ? `<button class="btn line sm" data-sf="removeimage" data-path="${path}">Remove</button>` : ''}</div>${hint ? `<span class="tiny muted">${hint}</span>` : ''}</div>`;
}

function themePanel() {
  const current = SF.config.theme;
  const cards = Shared.THEMES.map(
    (
      theme,
    ) => `<button class="sfed-theme ${theme.id === current ? 'on' : ''}" data-sf="theme" data-id="${theme.id}" aria-pressed="${theme.id === current}">
      <span class="sfed-swatch">${['primary', 'secondary', 'accent', 'background', 'surface', 'text', 'button'].map((token) => `<i style="background:${theme[token]}" title="${token}"></i>`).join('')}</span>
      <b>${esc(theme.name)}</b><small>${esc(theme.note)}</small></button>`,
  ).join('');
  const accents = Shared.ACCENTS.map(
    (colour) =>
      `<button class="sfed-dot ${SF.config.accent === colour ? 'on' : ''}" data-sf="accent" data-id="${colour}" style="background:${colour}" aria-label="Accent ${colour}" aria-pressed="${SF.config.accent === colour}"></button>`,
  ).join('');
  return `<div class="sfed-themes">${cards}</div>
    <div class="field" style="margin-top:12px"><label>Accent colour</label><div class="row" style="gap:8px;flex-wrap:wrap"><button class="sfed-dot default ${SF.config.accent ? '' : 'on'}" data-sf="accent" data-id="" aria-label="Theme default accent">Auto</button>${accents}</div><span class="tiny muted">Only colours from the Stoora palette. Text always stays easy to read.</span></div>
    <button class="btn line sm" data-sf="resettheme">Reset to this template's default</button>`;
}

function templatePanel() {
  return `<div class="sfed-templates">${Shared.TEMPLATES.map((template) => `<button class="sfed-tpl ${template.id === SF.config.template ? 'on' : ''}" data-sf="template" data-id="${template.id}"><b>${esc(template.name)}${template.premium ? (ownsTemplate(template.id) ? ' · Premium' : ' · Premium, locked') : ''}</b><small>${esc(template.blurb)}</small></button>`).join('')}</div>`;
}

function catalogueList() {
  const { products, services } = SF.state.catalogue;
  const hidden = new Set(SF.config.hiddenIds);
  const featured = new Set(SF.config.featuredIds);
  const isServices = Shared.templateById(SF.config.template).kind === 'services';
  const items = isServices ? services : [...products.filter((product) => product.status === 'Active'), ...services];
  if (!items.length) {
    return `<div class="sfed-empty"><p><b>${isServices ? 'Add your first service' : 'Add your first product'} to start building your storefront.</b></p><button class="btn ink sm" data-sf="addproducts">${isServices ? 'Add a service' : 'Add a product'}</button></div>`;
  }
  const rows = items
    .map(
      (
        item,
      ) => `<div class="row sfed-item" style="gap:10px"><span class="sp"><b class="small">${esc(item.name)}</b><br><span class="tiny muted">${rs(item.price)}${item.cat ? ' · ' + esc(item.cat) : ''}</span></span>
      <button class="link small" data-sf="edititem" data-id="${esc(item.id)}" data-kind="${item.type !== undefined && !('status' in item) ? 'service' : 'product'}">Edit</button>
      ${isServices ? '' : `<button class="sfed-star ${featured.has(item.id) ? 'on' : ''}" data-sf="feature" data-id="${esc(item.id)}" aria-label="Feature ${esc(item.name)}" aria-pressed="${featured.has(item.id)}">★</button>`}
      <button class="switch ${hidden.has(item.id) ? '' : 'on'}" data-sf="visible" data-id="${esc(item.id)}" aria-label="Show ${esc(item.name)} on the storefront"></button></div>`,
    )
    .join('');
  const inactive = products.filter((product) => product.status !== 'Active').length;
  return `${rows}${inactive && !isServices ? `<p class="tiny muted">${inactive} draft product${inactive > 1 ? 's are' : ' is'} not shown: set them to Active in Products.</p>` : ''}${isServices && products.length ? '<p class="tiny muted">The Services template shows services only, not products.</p>' : ''}<button class="btn line sm" data-sf="addproducts" style="margin-top:8px">${isServices ? 'Add or edit services' : 'Add or edit products'}</button>`;
}

function collectionsInfo() {
  const groups = {};
  SF.state.catalogue.products
    .filter((product) => product.status === 'Active' && product.cat)
    .forEach((product) => {
      groups[product.cat] = (groups[product.cat] || 0) + 1;
    });
  const names = Object.entries(groups);
  return names.length
    ? `<ul class="sfed-plain">${names.map(([name, count]) => `<li><b>${esc(name)}</b> <span class="muted">${count} item${count > 1 ? 's' : ''}</span></li>`).join('')}</ul><p class="tiny muted">Collections come from the Category on each product.</p>`
    : '<p class="small muted">No collections yet. Give your products a category (for example Kurtas or Skincare) and they appear here.</p>';
}

function repeatableList(path, label, fields, addLabel, limit) {
  const list = getPath(SF.config, path) || [];
  const rows = list
    .map(
      (entry, index) =>
        `<div class="sfed-repeat">${fields.map(([key, placeholder, area]) => (area ? `<textarea class="input" data-repeat="${path}.${index}.${key}" rows="2" placeholder="${placeholder}" maxlength="500">${esc(entry[key] || '')}</textarea>` : `<input class="input" data-repeat="${path}.${index}.${key}" placeholder="${placeholder}" maxlength="140" value="${esc(entry[key] || '')}">`)).join('')}<button class="btn line sm" data-sf="removerow" data-path="${path}" data-index="${index}">Remove</button></div>`,
    )
    .join('');
  return `<div class="field"><label>${label}</label>${rows}${list.length < limit ? `<button class="btn grey sm" data-sf="addrow" data-path="${path}">${addLabel}</button>` : ''}</div>`;
}

function sectionToggles() {
  return Object.entries(Shared.SECTIONS)
    .map(
      ([key, label]) =>
        `<div class="row" style="padding:6px 0"><span class="sp small">${label}</span><button class="switch ${SF.config.sections[key] ? 'on' : ''}" data-sf="section" data-id="${key}" aria-label="Show ${label}"></button></div>`,
    )
    .join('');
}

function reviewsInfo() {
  const summary = SF.state.data.reviewSummary;
  return summary.count
    ? `<p class="small">Your store has <b>${summary.count}</b> genuine review${summary.count > 1 ? 's' : ''}, ${summary.average.toFixed(1)} out of 5 on average. They show on your storefront when "Customer reviews" is on.</p>`
    : '<p class="small muted">No reviews yet. Ratings appear on your storefront after buyers leave genuine reviews. Nothing is made up.</p>';
}

/** Which part of the hero photo stays in view when it is cropped for different screens. */
function focusField() {
  if (!SF.config.hero.image) return '';
  const names = { '50% 20%': 'Top', '50% 50%': 'Middle', '50% 80%': 'Bottom' };
  return `<div class="field"><label>Keep this part of the photo in view</label><div class="seg">${Shared.FOCUS_OPTIONS.map((value) => `<button class="${SF.config.hero.focus === value ? 'on' : ''}" data-sf="focus" data-id="${value}">${names[value]}</button>`).join('')}</div></div>`;
}

function editorPanels() {
  const kind = Shared.templateById(SF.config.template).kind;
  const template = SF.config.template;
  return [
    panelSection('template', 'Template', templatePanel()),
    panelSection(
      'theme',
      'Colors and theme',
      themePanel(),
      'These colours apply to your public storefront only, not to your Stoora dashboard.',
    ),
    panelSection(
      'business',
      'Business information',
      textField('brand.name', 'Store name', { max: 80 }) +
        textField('brand.tagline', 'Short tagline', { max: 120, placeholder: 'What makes your business special?' }),
      'Your category and shop link are set in Settings.',
    ),
    panelSection(
      'logo',
      'Logo and branding',
      imageField('brand.logo', 'Logo', 'Shown in the header. A square or wide image works best.'),
    ),
    panelSection(
      'hero',
      'Hero section',
      textField('hero.title', 'Headline', { max: 100, placeholder: SF.config.brand.name }) +
        textField('hero.subtitle', 'Subheading', { max: 220 }) +
        textField('hero.cta', 'Button text', { max: 30 }) +
        imageField('hero.image', 'Hero image', 'A wide, bright photo of your best work.') +
        focusField(),
    ),
    panelSection(
      'catalogue',
      kind === 'services' ? 'Services' : 'Products and services',
      catalogueList(),
      'Choose what appears on your storefront. These are your real products from Stoora.',
    ),
    kind === 'products' ? panelSection('collections', 'Collections', collectionsInfo()) : '',
    panelSection(
      'about',
      'About',
      textField('about.title', 'Heading', { max: 60 }) +
        textField('about.text', 'About your business', {
          area: true,
          max: 1200,
          placeholder: 'Tell customers who you are and what you make or teach.',
        }) +
        imageField('about.image', 'About image'),
    ),
    ['studio', 'signature', 'atelier', 'heritage'].includes(template)
      ? panelSection(
          'story',
          template === 'studio' || template === 'heritage' ? 'Your story and process' : 'Brand story',
          textField('story.title', 'Story heading', { max: 60 }) +
            textField('story.text', 'Your story', { area: true, max: 1200 }) +
            (template === 'studio' || template === 'heritage'
              ? repeatableList(
                  'process',
                  'How it is made (up to 4 steps)',
                  [
                    ['title', 'Step title'],
                    ['text', 'What happens', true],
                  ],
                  'Add a step',
                  4,
                )
              : ''),
        )
      : '',
    template === 'services' || template === 'signaturestudio'
      ? panelSection(
          'servicedetails',
          'Classes and credentials',
          listField('services.subjects', 'Subjects or specialities', 'Maths, Yoga') +
            listField('services.levels', 'Levels', 'Class 8 to 10, Beginners') +
            listField('services.modes', 'Teaching modes', 'Online, At my studio') +
            textField('services.sessions', 'Available sessions', {
              area: true,
              max: 300,
              placeholder: 'Weekday mornings and evenings',
            }) +
            listField('services.credentials', 'Credentials', 'RYT 200 certified, 8 years of teaching'),
        )
      : '',
    true
      ? panelSection(
          'faqs',
          'Questions and answers',
          repeatableList(
            'faqs',
            'Questions customers ask',
            [
              ['q', 'Question'],
              ['a', 'Answer', true],
            ],
            'Add a question',
            8,
          ),
        )
      : '',
    panelSection(
      'contact',
      'Contact information',
      textField('contact.whatsapp', 'WhatsApp number', { max: 14, placeholder: '98765 43210' }) +
        textField('contact.phone', 'Phone', { max: 14 }) +
        textField('contact.email', 'Email', { max: 120 }) +
        textField('social.instagram', 'Instagram name', { max: 30 }) +
        textField('contact.address', 'Address', { area: true, max: 300 }) +
        textField('contact.hours', 'Opening hours', { max: 120, placeholder: 'Mon to Sat, 10 am to 7 pm' }),
    ),
    panelSection('sections', 'Sections and reviews', sectionToggles() + reviewsInfo()),
    panelSection(
      'footer',
      'Footer',
      textField('footer.note', 'Footer note', { max: 160, placeholder: 'Handmade with care in Pune' }),
      'Your refund, shipping and privacy policies (Settings › Policies) appear in the footer automatically.',
    ),
    panelSection('settings', 'Store settings', storeSettingsPanel()),
  ].join('');
}

function storeSettingsPanel() {
  const state = SF.state;
  const live = state.status === 'published' || state.status === 'changes';
  return `<p class="small" style="margin:0 0 6px"><b>Address</b><br><span class="muted" style="word-break:break-all">${esc(publicUrl())}</span></p>
    <p class="small" style="margin:0 0 10px"><b>Status</b><br><span data-status>${STATUS_TEXT[state.status][0]}</span>${live ? ' · customers can see it' : ' · customers cannot see it yet'}</p>
    ${live ? '<button class="btn line sm" data-sf="unpublish">Take storefront offline</button>' : ''}`;
}

function refreshStatusBadge() {
  const element = document.querySelector('.sfroot [data-status]');
  if (element && SF.state) element.textContent = STATUS_TEXT[SF.state.status][0];
  const badge = document.querySelector('.sfroot .sfed-badge');
  if (badge && SF.state) {
    badge.textContent = STATUS_TEXT[SF.state.status][0];
    badge.className = `tag ${STATUS_TEXT[SF.state.status][1]} sfed-badge`;
  }
}

/* ---------- the editor: open and close ---------- */

function openEditor() {
  closeEditor(true);
  const root = document.createElement('div');
  root.id = 'sfed';
  root.className = 'sfed sfroot';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Storefront editor');
  // Inside the dashboard frame, below the dialogs, so a dialog opened from the editor shows on top.
  document.getElementById('device').appendChild(root);
  document.body.classList.add('sfed-open');
  SF.history = [JSON.stringify(SF.config)];
  SF.future = [];
  paintEditor();
  if (SF.dirty) saveDraft();
}

/** Close the editor. With `quiet` nothing is asked; otherwise unsaved changes are saved first. */
async function closeEditor(quiet) {
  const root = document.getElementById('sfed');
  if (!root) return;
  // Leave only when everything is stored; if saving fails the editor stays open with the reason shown.
  if (!quiet && SF.dirty && !(await saveDraft())) return;
  root.remove();
  document.body.classList.remove('sfed-open');
  clearTimeout(SF.timers.save);
  if (!quiet) {
    SF.state = null;
    loadStorefront();
  }
}

function paintEditor() {
  const root = document.getElementById('sfed');
  if (!root) return;
  const [badge, tone] = STATUS_TEXT[SF.state.status];
  root.innerHTML = `
    <header class="sfed-bar">
      <button class="btn line sm" data-sf="close">${I('back', 14)} Back</button>
      <b class="sfed-name">${esc(SF.config.brand.name || USER.shop)}</b><span class="tag ${tone} sfed-badge">${badge}</span>
      <span class="sfed-save ${SF.saveState}">All changes saved</span><span class="sp"></span>
      <button class="ibtn sm" data-sf="undo" aria-label="Undo">${I('back', 16)}</button><button class="ibtn sm" data-sf="redo" aria-label="Redo">${I('right', 16)}</button>
      <div class="seg sfed-device"><button class="${SF.device === 'desktop' ? 'on' : ''}" data-sf="device" data-id="desktop">Desktop</button><button class="${SF.device === 'mobile' ? 'on' : ''}" data-sf="device" data-id="mobile">Mobile</button></div>
      <button class="btn line sm" data-sf="preview">Preview storefront</button>
      <button class="btn line sm" data-sf="save">Save draft</button>
      <button class="btn main sm" data-sf="publish">${publishLabel()}</button>
    </header>
    <div class="sfed-tabs" role="tablist"><button class="${SF.mobileTab === 'edit' ? 'on' : ''}" data-sf="tab" data-id="edit">Edit</button><button class="${SF.mobileTab === 'preview' ? 'on' : ''}" data-sf="tab" data-id="preview">Preview</button></div>
    <div class="sfed-body tab-${SF.mobileTab}">
      <aside class="sfed-panel" aria-label="Editing controls">${editorPanels()}</aside>
      <main class="sfed-stage"><div class="sfed-device-frame ${SF.device}"><iframe title="Live preview of your storefront" src="/store-preview.html"></iframe></div></main>
    </div>`;
  setSaveState(SF.saveState);
}

/** Rebuild one panel after a structural change (adding a row, picking a theme) without losing the others' scroll. */
function repaintPanels() {
  const panel = document.querySelector('.sfroot .sfed-panel');
  if (!panel) return;
  const scroll = panel.scrollTop;
  panel.innerHTML = editorPanels();
  panel.scrollTop = scroll;
}

/* ---------- the editor: events ---------- */

/** Shrink a photo in the browser, then upload it as the raw file. */
function uploadImage(path) {
  pickFile('image/*', (file) => {
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return toast('Use a JPG, PNG or WebP image');
    const url = URL.createObjectURL(file);
    const picture = new Image();
    picture.onerror = () => toast('That image could not be read');
    picture.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(picture.width, picture.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(picture.width * scale);
      canvas.height = Math.round(picture.height * scale);
      canvas.getContext('2d').drawImage(picture, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        async (blob) => {
          try {
            toast('Uploading…');
            const response = await fetch('/api/storefront/images', {
              method: 'POST',
              headers: { 'Content-Type': 'image/jpeg' },
              body: blob,
              credentials: 'same-origin',
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Upload failed');
            setPath(SF.config, path, result.url);
            repaintPanels();
            markChanged();
            toast('Image added');
          } catch (error) {
            toast(error.message);
          }
        },
        'image/jpeg',
        0.82,
      );
    };
    picture.src = url;
  });
}

function applyHistory(snapshot) {
  SF.config = JSON.parse(snapshot);
  repaintPanels();
  SF.dirty = true;
  SF.edits += 1;
  setSaveState('unsaved');
  pushPreview();
  clearTimeout(SF.timers.save);
  SF.timers.save = setTimeout(saveDraft, 1200);
}

async function previewDraft() {
  if (SF.dirty && !(await saveDraft())) return;
  window.open('/store-preview.html?draft=1', '_blank', 'noopener');
}

/* ---------- publishing ---------- */

async function startPublish() {
  if (SF.dirty && !(await saveDraft())) return;
  const issues = SF.state.issues || [];
  const errors = issues.filter((issue) => issue.level === 'error');
  const warnings = issues.filter((issue) => issue.level === 'warning');
  const list = (items, tone) =>
    items
      .map(
        (issue) =>
          `<div class="banner" style="margin:6px 0;${tone === 'error' ? 'background:var(--negative-tint);color:var(--negative-deep)' : 'background:var(--marigold-tint);color:var(--marigold-deep)'}">${I('shield', 18)}<div>${esc(issue.text)}</div></div>`,
      )
      .join('');

  dlg(
    errors.length ? 'Not ready to publish yet' : publishLabel(),
    `${list(errors, 'error')}${list(warnings, 'warning')}
     ${errors.length ? '' : `<p class="small muted" style="margin:10px 0 6px">Final check: this is what customers will see.</p><div class="sfed-final"><iframe title="Final preview" src="/store-preview.html?draft=1"></iframe></div>`}
     <p class="tiny muted" style="margin:10px 0 0">Address: ${esc(publicUrl())}</p>`,
    async () => {
      try {
        const result = await dapi('POST', '/api/storefront/publish');
        SF.state.status = 'published';
        SF.state.published = clone(SF.config);
        overlay = null;
        renderLayer();
        refreshStatusBadge();
        setSaveState('saved');
        showPublished(result.url);
      } catch (error) {
        showPublishFailed(error.message);
      }
    },
    errors.length
      ? '<button class="btn main" data-act="close">Back to editing</button>'
      : `<button class="btn line" data-act="close">Not yet</button><button class="btn main" data-act="dlgok">${publishLabel()}</button>`,
  );
}

function showPublished(path) {
  const address = location.origin + path;
  dlg(
    'Your storefront is live',
    `<p style="margin:0 0 10px">Customers can visit it here:</p><div class="card small" style="word-break:break-all"><b>${esc(address)}</b></div>`,
    null,
    `<button class="btn line" data-act="close">Done</button><button class="btn grey" data-sf="copyaddress">Copy link</button><a class="btn main" href="${esc(address)}" target="_blank" rel="noopener">Open my store</a>`,
  );
}

function showPublishFailed(message) {
  dlg(
    'Publishing failed',
    `<p style="margin:0 0 8px">${esc(message)}</p><p class="small muted" style="margin:0">Your draft is safe, and the version customers see has not changed.</p>`,
    null,
    '<button class="btn line" data-act="close">Close</button><button class="btn main" data-sf="publish">Try again</button>',
  );
}

/* ---------- one place for every click and input in the editor ---------- */

document.addEventListener(
  'click',
  async (event) => {
    const page = event.target.closest('[data-act^="sf"]');
    if (page) {
      const act = page.dataset.act;
      event.stopImmediatePropagation();
      event.preventDefault();
      if (act === 'sffilter') {
        SF.filter = page.dataset.v;
        render();
      } else if (act === 'sfview') {
        toast('Publish your storefront first. Then customers can see it at your shop link.');
      } else if (act === 'sfshare') {
        copyText(publicUrl(), 'Shop link copied');
      } else if (act === 'sftab') {
        if (SF.tab === 'editor' && page.dataset.v !== 'editor') await saveDraft();
        SF.tab = page.dataset.v;
        render();
      } else if (act === 'sfpreview') openTemplatePreview(page.dataset.id);
      else if (act === 'sfuse') chooseTemplate(page.dataset.id);
      else if (act === 'sfunlock') unlockTemplate(page.dataset.id);
      else if (act === 'sfedit') {
        SF.config = clone(SF.state.config);
        showEditor();
      } else if (act === 'sfreload') {
        SF.error = '';
        SF.state = null;
        render();
      }
      return;
    }

    const control = event.target.closest('[data-sf]');
    if (!control || (!document.querySelector('.sfroot') && !['publish', 'copyaddress'].includes(control.dataset.sf)))
      return;
    const action = control.dataset.sf;
    const id = control.dataset.id;

    if (action === 'close') closeEditor(false);
    else if (action === 'save') {
      if (await saveDraft()) toast('Draft saved');
    } else if (action === 'retry') saveDraft();
    else if (action === 'publish') {
      overlay = null;
      renderLayer();
      startPublish();
    } else if (action === 'preview') previewDraft();
    else if (action === 'copyaddress') copyText(publicUrl(), 'Link copied');
    else if (action === 'undo' && SF.history.length > 1) {
      SF.future.push(SF.history.pop());
      applyHistory(SF.history[SF.history.length - 1]);
    } else if (action === 'redo' && SF.future.length) {
      const snapshot = SF.future.pop();
      SF.history.push(snapshot);
      applyHistory(snapshot);
    } else if (action === 'device') {
      SF.device = id;
      document.querySelector('.sfroot .sfed-device-frame').className = `sfed-device-frame ${id}`;
      document
        .querySelectorAll('.sfroot .sfed-device button')
        .forEach((button) => button.classList.toggle('on', button.dataset.id === id));
    } else if (action === 'tab') {
      SF.mobileTab = id;
      document.querySelector('.sfroot .sfed-body').className = `sfed-body tab-${id}`;
      document
        .querySelectorAll('.sfroot .sfed-tabs button')
        .forEach((button) => button.classList.toggle('on', button.dataset.id === id));
      if (id === 'preview') pushPreview();
    } else if (action === 'template') {
      const from = SF.config.template;
      if (id !== from) {
        chooseTemplate(id);
      }
    } else if (action === 'focus') {
      SF.config.hero.focus = id;
      repaintPanels();
      markChanged();
    } else if (action === 'theme') {
      SF.config.theme = id;
      repaintPanels();
      markChanged();
    } else if (action === 'accent') {
      SF.config.accent = id || null;
      repaintPanels();
      markChanged();
    } else if (action === 'resettheme') {
      SF.config.theme = Shared.templateById(SF.config.template).theme;
      SF.config.accent = null;
      repaintPanels();
      markChanged();
      toast('Colours reset to the template default');
    } else if (action === 'visible') {
      toggleId(SF.config.hiddenIds, id);
      repaintPanels();
      markChanged();
    } else if (action === 'feature') {
      toggleId(SF.config.featuredIds, id);
      repaintPanels();
      markChanged();
    } else if (action === 'section') {
      SF.config.sections[id] = !SF.config.sections[id];
      repaintPanels();
      markChanged();
    } else if (action === 'upload') uploadImage(control.dataset.path);
    else if (action === 'removeimage') {
      setPath(SF.config, control.dataset.path, '');
      repaintPanels();
      markChanged();
    } else if (action === 'addrow') {
      const list = getPath(SF.config, control.dataset.path);
      list.push(control.dataset.path === 'faqs' ? { q: '', a: '' } : { title: '', text: '' });
      repaintPanels();
      markChanged();
    } else if (action === 'removerow') {
      getPath(SF.config, control.dataset.path).splice(Number(control.dataset.index), 1);
      repaintPanels();
      markChanged();
    } else if (action === 'edititem') {
      // Save the draft, open the product form, and come back here once the product is saved.
      openItemForm(control.dataset.kind === 'service' ? 'addservice' : 'addproduct', id);
    } else if (action === 'addproducts') {
      const services = Shared.templateById(SF.config.template).kind === 'services';
      openItemForm(services ? 'addservice' : 'addproduct');
    } else if (action === 'unpublish') {
      try {
        await dapi('POST', '/api/storefront/unpublish');
        SF.state.status = SF.state.issues.some((i) => i.level === 'error') ? 'draft' : 'ready';
        SF.state.published = null;
        repaintPanels();
        refreshStatusBadge();
        setSaveState(SF.saveState);
        toast('Your storefront is offline');
      } catch (error) {
        toast(error.message);
      }
    }
  },
  true,
);

/** After editing a product from the editor: reload the storefront state and reopen the editor. */
async function returnToEditor() {
  setEditorReturn(false);
  SF.state = null;
  SF.config = null;
  go('storefront', false);
  await persistNow();
  await loadStorefront();
  if (SF.state) {
    SF.config = clone(SF.state.config);
    showEditor();
  }
}

function toggleId(list, id) {
  const index = list.indexOf(id);
  if (index >= 0) list.splice(index, 1);
  else list.push(id);
}

document.addEventListener('input', (event) => {
  const input = event.target;
  if (!document.querySelector('.sfroot') || !input.dataset) return;
  if (input.dataset.path) setPath(SF.config, input.dataset.path, input.value);
  else if (input.dataset.list)
    setPath(
      SF.config,
      input.dataset.list,
      input.value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean),
    );
  else if (input.dataset.repeat) setPath(SF.config, input.dataset.repeat, input.value);
  else return;
  markChanged();
});

/* Remember which panels are open, so choosing a colour does not fold the panel away. */
document.addEventListener(
  'toggle',
  (event) => {
    const panel = event.target;
    if (!panel.matches || !panel.matches('.sfed-sec')) return;
    if (panel.open) SF.openPanels.add(panel.dataset.panel);
    else SF.openPanels.delete(panel.dataset.panel);
  },
  true,
);

/* Do not lose work: warn when leaving with unsaved changes. */
window.addEventListener('beforeunload', (event) => {
  if (document.querySelector('.sfroot') && SF.dirty) {
    event.preventDefault();
    event.returnValue = '';
  }
});
