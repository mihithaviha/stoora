/**
 * Settings for real accounts. Every page is built from a small description (SETTINGS_PAGES):
 * sections made of fields, and each field saves to the shop's settings (D.cfg) on the server.
 * Pages that need more than fields (Users, Apps, Payments, Policies, Domains) have their own builders.
 *
 * Settings that change what buyers see or pay are used by the public shop page:
 * delivery fee, policies, GST, address, WhatsApp, Instagram, UPI, tracking ids.
 */

const BUSINESS_TYPES = [
  ['retail', 'Retail and product selling'],
  ['online', 'Online and social commerce'],
  ['tutoring', 'Tutoring and education'],
  ['fitness', 'Fitness and wellness'],
  ['professional', 'Professional services'],
  ['beauty', 'Beauty and personal care'],
  ['food', 'Food and homemade products'],
  ['digital', 'Digital products and services'],
  ['other', 'Other'],
];
const META_LINKS = { apps: 'https://developers.facebook.com/apps' };
const COURIERS_DEFAULT = 'Delhivery, India Post, Shiprocket, Hand delivery';

/* ---------- field builders ---------- */

const cfgValue = (field) => {
  if (field.profile) return USER[field.profile] || '';
  return D.cfg[field.key] == null ? '' : D.cfg[field.key];
};

const hint = (text) => (text ? `<span class="tiny muted">${text}</span>` : '');

function fieldHtml(field) {
  const id = 'cfg-' + (field.key || field.profile);
  const attributes = `id="${id}" class="input" ${field.profile ? `data-profile="${field.profile}"` : `data-cfg="${field.key}"`} data-type="${field.type}" maxlength="${field.max || 200}" placeholder="${esc(field.placeholder || '')}"`;
  if (field.type === 'switch') {
    const on = D.cfg[field.key] == null ? field.default !== false : Boolean(D.cfg[field.key]);
    return `<div class="row" style="padding:10px 0"><span class="sp"><b>${field.label}</b><br>${hint(field.hint)}</span><button class="switch ${on ? 'on' : ''}" data-act="cfgswitch" data-key="${field.key}" data-default="${field.default !== false}" aria-label="${esc(field.label)}"></button></div>`;
  }
  if (field.type === 'select') {
    const current = cfgValue(field);
    return `<div class="field"><label for="${id}">${field.label}</label><select ${attributes}>${field.options.map(([value, label]) => `<option value="${value}" ${value === current ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select>${hint(field.hint)}</div>`;
  }
  if (field.type === 'area') {
    return `<div class="field"><label for="${id}">${field.label}</label><textarea ${attributes} rows="4">${esc(cfgValue(field))}</textarea>${hint(field.hint)}</div>`;
  }
  if (field.type === 'number') {
    return `<div class="field"><label for="${id}">${field.label}</label><div class="money-in"><span>₹</span><input ${attributes} inputmode="numeric" value="${esc(cfgValue(field))}"></div>${hint(field.hint)}</div>`;
  }
  if (field.type === 'info') return `<div class="small muted" style="padding:8px 0">${field.html}</div>`;
  return `<div class="field"><label for="${id}">${field.label}</label><input ${attributes} value="${esc(cfgValue(field))}">${hint(field.hint)}</div>`;
}

function sectionHtml(section) {
  return `<div class="sec-t">${section.title}</div>${section.help ? `<p class="small muted" style="margin:-4px 4px 8px">${section.help}</p>` : ''}<div class="card">${section.fields.map(fieldHtml).join('<div class="hr"></div>')}</div>`;
}

/* ---------- what each page contains ---------- */

const SETTINGS_PAGES = {
  General: [
    {
      title: 'Business details',
      help: 'Your shop name and where you are. Buyers see these on your shop page.',
      fields: [
        { type: 'text', profile: 'shop', label: 'Shop name', max: 80 },
        {
          type: 'select',
          profile: 'category',
          label: 'Business type',
          options: BUSINESS_TYPES,
          hint: 'Changes the words used for your menu, for example Classes and Students for a tutor.',
        },
        { type: 'text', profile: 'city', label: 'City', max: 60 },
        { type: 'text', profile: 'bizPhone', label: 'Business phone', max: 20, placeholder: '98765 43210' },
      ],
    },
  ],
  Plan: [
    {
      title: 'Your plan',
      help: 'There is one plan.',
      fields: [
        {
          type: 'info',
          html: '<b>Free.</b> Everything in Stoora is included: products and services, orders and bookings, your shop page, payments, chats, the assistant and helpers. Stoora does not charge you.',
        },
      ],
    },
  ],
  Billing: [
    {
      title: 'Bills',
      help: 'What you pay.',
      fields: [
        {
          type: 'info',
          html: 'Stoora sends you no bills. Razorpay charges its own fee on online payments, and it bills you directly. See its pricing on razorpay.com/pricing.',
        },
      ],
    },
  ],
  Checkout: [
    {
      title: 'What buyers fill in',
      help: 'Name and a 10-digit phone number are always asked.',
      fields: [
        {
          type: 'switch',
          key: 'requireAddress',
          label: 'Ask for a delivery address',
          hint: 'Only asked when the order has products that ship.',
          default: true,
        },
      ],
    },
  ],
  'Customer accounts': [
    {
      title: 'How buyers shop',
      fields: [
        {
          type: 'info',
          html: 'Buyers do not need an account or a password. They check out with a name and phone number, and later find their order on your shop page with the order number and that phone number.',
        },
      ],
    },
  ],
  'Shipping and delivery': [
    {
      title: 'Delivery fee',
      help: 'Charged on orders that have products. Services and classes never pay delivery.',
      fields: [
        { type: 'number', key: 'shipFee', label: 'Delivery fee', hint: 'Leave empty or 0 for free delivery.' },
        {
          type: 'number',
          key: 'freeShipAbove',
          label: 'Free delivery above',
          hint: 'Orders at or above this amount pay no delivery fee. Leave empty to always charge the fee.',
        },
      ],
    },
    {
      title: 'Couriers',
      help: 'Shown when you mark an order as shipped.',
      fields: [
        {
          type: 'text',
          key: 'couriers',
          label: 'Courier names, separated by commas',
          placeholder: COURIERS_DEFAULT,
          max: 200,
        },
      ],
    },
  ],
  'Taxes and duties': [
    {
      title: 'GST',
      help: 'Shown on your shop page.',
      fields: [
        { type: 'text', key: 'gstin', label: 'GSTIN', placeholder: '29ABCDE1234F1Z5', max: 15 },
        {
          type: 'switch',
          key: 'pricesIncludeGst',
          label: 'Prices include GST',
          hint: 'Buyers are told the price they see is the price they pay.',
          default: true,
        },
      ],
    },
  ],
  Locations: [
    {
      title: 'Shop address',
      help: 'Shown on your shop page.',
      fields: [
        { type: 'area', key: 'address', label: 'Address', max: 300, hint: 'Leave empty for an online-only shop.' },
      ],
    },
  ],
  'Sales channels': [
    {
      title: 'Where buyers find you',
      help: 'Every order shows where it came from.',
      fields: [
        {
          type: 'text',
          key: 'whatsapp',
          label: 'WhatsApp number',
          placeholder: '98765 43210',
          max: 14,
          hint: 'Your shop page gets a "Chat on WhatsApp" button.',
        },
        {
          type: 'text',
          key: 'instagram',
          label: 'Instagram username',
          placeholder: 'yourshop',
          max: 30,
          hint: 'Your shop page links to this profile.',
        },
      ],
    },
  ],
  'Customer events': [
    {
      title: 'Tracking on your shop page',
      help: 'Stoora already counts visits. These two are optional: paste an id and your shop page reports to them.',
      fields: [
        {
          type: 'text',
          key: 'metaPixelId',
          label: 'Meta Pixel id',
          placeholder: '1234567890',
          max: 20,
          hint: 'From Meta Events Manager. Digits only.',
        },
        {
          type: 'text',
          key: 'googleAnalyticsId',
          label: 'Google Analytics 4 id',
          placeholder: 'G-XXXXXXXXXX',
          max: 14,
          hint: 'From Google Analytics. Starts with G-.',
        },
      ],
    },
  ],
  Notifications: [
    {
      title: 'Email',
      fields: [
        {
          type: 'switch',
          key: 'notifyEmail',
          label: 'Email me when an order arrives',
          hint: 'Sent to your login email.',
          default: true,
        },
        { type: 'info', html: 'Email sending is <b data-email-status></b>.' },
      ],
    },
  ],
  Languages: [
    { title: 'Language', fields: [{ type: 'info', html: 'Stoora and your shop page are in <b>English</b>.' }] },
  ],
  'Customer privacy': [
    {
      title: "Your buyers' details",
      help: "You hold your buyers' names and phone numbers. Use them only for their orders.",
      fields: [
        {
          type: 'info',
          html: 'To remove a buyer, open them in <b>Customers</b> and choose <b>More actions › Delete customer</b>.',
        },
      ],
    },
  ],
};

const POLICY_FIELDS = [
  { key: 'policyRefund', title: 'Refund policy' },
  { key: 'policyShipping', title: 'Shipping policy' },
  { key: 'policyPrivacy', title: 'Privacy policy' },
  { key: 'policyTerms', title: 'Terms of service' },
];

/** Plain starting texts a seller can edit. They are filled in with the shop's own name. */
function policyTemplate(key) {
  const shop = USER.shop;
  const texts = {
    policyRefund: `If something is wrong with your order, tell ${shop} within 7 days of receiving it. We will replace the item or refund the amount paid.`,
    policyShipping: `${shop} ships after payment is confirmed. We share the courier name and tracking number once your order leaves.`,
    policyPrivacy: `${shop} keeps your name, phone number and address only to complete your order and to contact you about it. We never sell them.`,
    policyTerms: `By placing an order with ${shop} you agree to pay the price shown and to give correct delivery details.`,
  };
  return texts[key];
}

/* ---------- pages with their own builders ---------- */

function policiesPage() {
  const fields = POLICY_FIELDS.map((policy) => ({ type: 'area', key: policy.key, label: policy.title, max: 2000 }));
  return `${sectionHtml({ title: 'Your policies', help: 'Buyers can read these on your shop page before they pay.', fields })}<button class="btn grey sm" style="margin-top:12px" data-act="writepolicies">Fill empty policies with a starting text</button>`;
}

function domainsPage() {
  const handle = USER.handle;
  const link = `${location.host}/s/${handle}`;
  return `${sectionHtml({ title: 'Your shop address', help: 'Buyers type this to find you.', fields: [{ type: 'info', html: `<b>${link}</b>` }] })}
  ${sectionHtml({
    title: 'Your own web address',
    help: 'Optional, like shop.yourname.com.',
    fields: [
      { type: 'text', key: 'customDomain', label: 'Web address', placeholder: 'shop.yourname.com', max: 100 },
      {
        type: 'info',
        html: `At your domain provider, point this address to the server that runs Stoora (a CNAME record to <b>${esc(location.hostname)}</b>, or an A record to its IP address). The server must also have a certificate for it if you want https.`,
      },
    ],
  })}`;
}

function appsPage() {
  const int = D.int || {};
  const tag = (on) => (on ? '<span class="tag ok">On</span>' : '<span class="tag warn">Off</span>');
  const addr = D.addr || {};
  const copyBox = (label, value) =>
    `<div class="field"><label>${label}</label><div class="row" style="gap:8px"><input class="input sp" readonly value="${esc(value || '')}" style="margin:0"><button class="btn grey sm" data-act="copyvalue" data-value="${esc(value || '')}">Copy</button></div></div>`;

  const meta = (key, label, idKey, idLabel, webhook, tokenName) => {
    const status = int[key] || {};
    return `<div class="sec-t">${label}</div><div class="card">
      <div class="row" style="padding:6px 0"><span class="sp"><b>Server connection</b><br>${hint(status.configured ? 'The keys are in .env.' : `Add ${tokenName}, META_APP_SECRET and META_VERIFY_TOKEN to the .env file on the server, then restart it.`)}</span>${tag(status.configured)}</div><div class="hr"></div>
      ${fieldHtml({ type: 'text', key: idKey, label: idLabel, max: 20, placeholder: '1234567890', hint: 'Digits only. Not a secret.' })}<div class="hr"></div>
      ${copyBox('Callback URL (paste into Meta)', webhook)}
      <p class="small muted" style="margin:0 0 8px">In Meta, subscribe to <b>${key === 'whatsapp' ? 'messages' : 'messages'}</b>. The verify token is the META_VERIFY_TOKEN from .env. Create the app at <a class="link" href="${META_LINKS.apps}" target="_blank" rel="noopener noreferrer">developers.facebook.com</a>.</p></div>`;
  };

  return `${sectionHtml({
    title: 'Connected on the server',
    help: 'These are switched on with keys in the .env file. The keys never reach your browser.',
    fields: [
      {
        type: 'info',
        html: `<div class="row"><span class="sp">Razorpay payments</span>${tag((int.razorpay || {}).configured)}</div>`,
      },
      {
        type: 'info',
        html: `<div class="row"><span class="sp">Email</span>${tag((int.email || {}).configured)}</div>`,
      },
      {
        type: 'info',
        html: `<div class="row"><span class="sp">Assistant (${esc((int.ai || {}).model || '')})</span>${tag((int.ai || {}).configured)}</div>`,
      },
    ],
  })}
  ${meta('whatsapp', 'WhatsApp chats', 'waPhoneId', 'WhatsApp Phone number ID', addr.whatsappWebhook, 'WHATSAPP_TOKEN')}
  ${meta('instagram', 'Instagram chats', 'igAccountId', 'Instagram account ID', addr.instagramWebhook, 'INSTAGRAM_TOKEN')}`;
}

function paymentsPage() {
  const fields = [
    {
      type: 'text',
      key: 'upi',
      label: 'Your UPI ID',
      placeholder: 'yourname@okhdfc',
      max: 60,
      hint: 'Buyers can pay it from their UPI app. You mark the order paid.',
    },
  ];
  return `${payoutSection()}${sectionHtml({ title: 'Pay by UPI', fields })}${rzpGuideLive('4px')}`;
}

/** Helpers who can sign in to your shop with limited access. */
function usersPage() {
  if (!D.team) loadTeam();
  const roleName = { packing: 'Packing: orders only', chat: 'Chats: chats and customers' };
  const helpers = D.team || [];
  return `<div class="sec-t">You</div><div class="card"><div class="row"><span class="sp"><b>${esc(USER.name)}</b><br>${hint(esc(USER.email))}</span><span class="mini">Owner</span></div></div>
  <div class="sec-t">Helpers</div><p class="small muted" style="margin:-4px 4px 8px">A helper logs in with their own email and password and sees only what their role allows.</p>
  <div class="card">${helpers.length ? helpers.map((helper) => `<div class="row" style="padding:10px 0"><span class="sp"><b>${esc(helper.name)}</b><br>${hint(esc(helper.email) + ' · ' + roleName[helper.role])}</span><button class="btn line sm" data-act="removehelper" data-id="${esc(helper.id)}">Remove</button></div>`).join('<div class="hr"></div>') : '<p class="small muted" style="margin:10px 0">No helpers yet.</p>'}
  <div class="hr"></div><button class="btn ink sm" data-act="addhelper" style="margin:10px 0">Add a helper</button></div>`;
}

async function loadTeam() {
  try {
    D.team = (await dapi('GET', '/api/team')).helpers;
    if (route.name === 'setting' && route.arg === 'Users') render();
  } catch (_) {
    D.team = [];
  }
}

function addHelper() {
  dlg(
    'Add a helper',
    fld('f1', 'Name', '', 'Ravi') +
      fld('f2', 'Email', '', 'ravi@example.com', 'email') +
      fld('f3', 'Password', '', 'At least 8 characters', 'password') +
      sel('f4', 'What can they do?', ['Packing: orders only', 'Chats: chats and customers'], 'Packing: orders only'),
    async () => {
      try {
        await dapi('POST', '/api/team', {
          name: gv('f1'),
          email: gv('f2'),
          password: gv('f3'),
          role: gv('f4').startsWith('Packing') ? 'packing' : 'chat',
        });
        D.team = null;
        overlay = null;
        render();
        toast('Helper added');
      } catch (error) {
        toast(error.message);
      }
    },
  );
}

/* ---------- settings screens ---------- */

/** The laptop layout has a settings menu on the left; the phone layout shows one page with a back button. */
const settingsShell = (selected, title, body) =>
  typeof setShell === 'function' ? setShell(selected, title, body) : backRow(title) + `<div class="pad">${body}</div>`;

const PAGE_BUILDERS = {
  Policies: policiesPage,
  Domains: domainsPage,
  Apps: appsPage,
  Payments: paymentsPage,
  Users: usersPage,
};

function settingsPageHtml(name) {
  if (PAGE_BUILDERS[name]) return PAGE_BUILDERS[name]();
  const html = (SETTINGS_PAGES[name] || []).map(sectionHtml).join('');
  const emailOn = D.int && D.int.email && D.int.email.configured;
  return html.replace(
    '<b data-email-status></b>',
    emailOn ? '<b>on</b>' : '<b>off</b>. Add the EMAIL lines to the .env file on the server to switch it on',
  );
}

function settingsSummary(name) {
  const cfg = D.cfg;
  const summaries = {
    General: USER.shop + (USER.city ? ' · ' + USER.city : ''),
    Plan: 'Free, everything included',
    Payments: (D.rz && D.rz.configured ? 'Razorpay on' : 'Razorpay off') + (cfg.upi ? ' · UPI ' + cfg.upi : ''),
    'Shipping and delivery': cfg.shipFee
      ? `₹${cfg.shipFee} fee${cfg.freeShipAbove ? ', free above ₹' + cfg.freeShipAbove : ''}`
      : 'Free delivery',
    Domains: location.host + '/s/' + USER.handle,
    Notifications: cfg.notifyEmail === false ? 'Email off' : 'Email on',
    Users: 'You and your helpers',
  };
  return summaries[name] || 'Open';
}

live(V, 'settings', () =>
  settingsShell(
    '',
    'Settings',
    `<div class="grid2">${['Payments', 'Shipping and delivery', 'Domains', 'Notifications', 'Users', 'Plan']
      .map((name) => {
        const icon = (SETTINGS.find((row) => row[0] === name) || [0, 'doc'])[1];
        return `<button class="box tapbox" style="text-align:left;width:100%" data-go="setting:${name}"><div class="box-h"><span class="box-t">${I(icon, 16)} ${name}</span>${I('right', 16)}</div><b>${esc(settingsSummary(name))}</b></button>`;
      })
      .join('')}</div>`,
  ),
);

live(V, 'setting', () => {
  const name = route.arg || 'General';
  return settingsShell(name, name, settingsPageHtml(name));
});

/* ---------- saving fields ---------- */

/** Text and number fields save as you type; profile fields (shop name, city, phone) save when you leave them. */
document.addEventListener('input', (event) => {
  const input = event.target;
  if (!D.live || !input.dataset || !input.dataset.cfg) return;
  const value =
    input.dataset.type === 'number'
      ? input.value === ''
        ? ''
        : Number(input.value.replace(/[^\d.]/g, ''))
      : input.value.trim();
  D.cfg[input.dataset.cfg] = value;
});

document.addEventListener('change', async (event) => {
  const input = event.target;
  if (!D.live || !input.dataset || !input.dataset.profile) return;
  const field = input.dataset.profile;
  try {
    const result = await dapi('PATCH', '/api/me', { [field]: input.value.trim() });
    USER[field] = result.user[field];
    if (field === 'category') render(); // the menu words follow the business type
    toast('Saved');
  } catch (error) {
    toast(error.message);
  }
});

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

    if (act === 'cfgswitch') {
      handled();
      const key = element.dataset.key;
      const current = D.cfg[key] == null ? element.dataset.default === 'true' : Boolean(D.cfg[key]);
      D.cfg[key] = !current;
      element.classList.toggle('on', !current);
    } else if (act === 'writepolicies') {
      handled();
      POLICY_FIELDS.forEach((policy) => {
        if (!D.cfg[policy.key]) D.cfg[policy.key] = policyTemplate(policy.key);
      });
      render();
      toast('Starting texts added. Edit them to fit your shop.');
    } else if (act === 'addhelper') {
      handled();
      addHelper();
    } else if (act === 'removehelper') {
      handled();
      try {
        await dapi('DELETE', '/api/team/' + encodeURIComponent(element.dataset.id));
        D.team = null;
        render();
        toast('Helper removed');
      } catch (error) {
        toast(error.message);
      }
    } else if (act === 'copyvalue') {
      handled();
      copyText(element.dataset.value, 'Copied');
    }
  },
  true,
);
