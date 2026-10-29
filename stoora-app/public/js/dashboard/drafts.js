/**
 * Orders from a pasted chat. The seller pastes a WhatsApp chat or message, Stoora reads it into an
 * editable DRAFT (buyer, phone, address, items), and the seller reviews and approves it.
 * Nothing is created until the seller presses "Create order". Prices come from the shop's own
 * products at that moment, never from the chat.
 */

const START_BUTTON = `<button class="btn line sm" data-act="chatdraft">${I('spark', 16)} Read a chat or message</button>`;

/** Put the button on the Create order screen (laptop and phone). */
live(V, 'create', (original) =>
  original().replace(
    /(<h1 class="h1"[^>]*>Create order<\/h1>)/,
    `$1<div style="margin:0 0 14px">${START_BUTTON}</div>`,
  ),
);

function openChatDraft() {
  dlg(
    'Create an order from a chat',
    `<p class="muted small" style="margin:0 0 12px">Paste the buyer's WhatsApp chat or message. Stoora reads the name, phone, address and items into a draft. You check it before anything is created.</p>${area('f1', 'The chat', '', 'Hi, I want 2 cotton kurtas. My name is Asha. Please deliver to...')}`,
    async () => {
      const text = gv('f1');
      if (text.length < 10) return toast('Paste the chat or message first');
      try {
        const result = await dapi('POST', '/api/ai/draft-order', { text });
        showDraft(result.draft);
      } catch (error) {
        toast(error.message);
      }
    },
    '<button class="btn line" data-act="close">Cancel</button><button class="btn main" data-act="dlgok">Read it</button>',
  );
}

function showDraft(draft) {
  const catalogue = [...D.products.filter((product) => product.status === 'Active'), ...D.services];
  const lines = draft.lines.map((line) => ({ ...line }));

  const linesHtml = lines.length
    ? lines
        .map(
          (line, index) =>
            `<div class="row" style="gap:10px;padding:6px 0;border-top:1px solid var(--line-soft)"><b class="sp small">${esc(line.name)}<br><span class="muted">${rs(line.price)} each</span></b><input class="input" style="width:70px;margin:0" inputmode="numeric" value="${line.quantity}" data-draft-qty="${index}" aria-label="Quantity of ${esc(line.name)}"><label class="small"><input type="checkbox" data-draft-remove="${index}"> Remove</label></div>`,
        )
        .join('')
    : '<p class="small muted" style="margin:0">No items were matched to your products. Add one below.</p>';
  const unmatched = draft.unmatched.length
    ? `<div class="banner" style="margin:8px 0;background:var(--marigold-tint);color:var(--marigold-deep)">${I('shield', 18)}<div>Not found in your products: <b>${draft.unmatched.map(esc).join(', ')}</b>. Add them below or create them first.</div></div>`
    : '';
  const source =
    draft.source === 'ai'
      ? 'Read by the AI assistant.'
      : 'Read by simple matching (the AI assistant is not connected). Please check carefully.';

  dlg(
    'Check the order',
    `<p class="tiny muted" style="margin:0 0 10px">${source} Nothing is created until you press Create order.</p>
     ${fld('dr-name', 'Buyer name', draft.buyerName, 'Name')}${fld('dr-phone', 'Phone number', draft.phone, '98765 43210', 'tel')}${area('dr-address', 'Delivery address', draft.address, '')}
     <div class="field"><label>Items</label>${linesHtml}${unmatched}</div>
     ${sel('dr-add', 'Add another item', ['—', ...catalogue.map((item) => item.name)], '—')}
     ${draft.notes ? `<p class="small muted">Note from the chat: ${esc(draft.notes)}</p>` : ''}`,
    () => approveDraft(lines, catalogue, draft),
    '<button class="btn line" data-act="close">Cancel</button><button class="btn main" data-act="dlgok">Create order</button>',
  );
}

/** The seller pressed "Create order": check the form, then create the order from the shop's own prices. */
function approveDraft(lines, catalogue, draft) {
  const items = [];
  lines.forEach((line, index) => {
    const removed = document.querySelector(`[data-draft-remove="${index}"]`);
    const quantity = Math.floor(Number((document.querySelector(`[data-draft-qty="${index}"]`) || {}).value));
    if (!(removed && removed.checked) && quantity >= 1 && quantity <= 20) items.push([line.id, quantity]);
  });
  const extra = catalogue.find((item) => item.name === gv('dr-add'));
  if (extra && !items.some(([id]) => id === extra.id)) items.push([extra.id, 1]);

  const name = gv('dr-name');
  const phone = gv('dr-phone').replace(/\D/g, '').slice(-10);
  if (name.length < 2) return toast("Add the buyer's name");
  if (gv('dr-phone') && phone.length !== 10) return toast('The phone number should have 10 digits');
  if (!items.length) return toast('Add at least one item');

  let total = 0;
  for (const [id, quantity] of items) {
    const item = catalogue.find((entry) => entry.id === id);
    if (!item) return toast('One item is no longer available');
    if (item.stock != null && item.stock < quantity) return toast(`${item.name} has only ${item.stock} left`);
    total += item.price * quantity;
  }

  const id = D.orders.reduce((max, order) => Math.max(max, Number(order.id) || 0), 1000) + 1;
  const order = {
    id,
    who: name,
    phone,
    address: gv('dr-address'),
    items,
    total,
    paid: false,
    shipped: false,
    src: 'Chat',
    when: nowLabel(),
    ts: Date.now(),
    notes: draft.notes ? [draft.notes] : [],
  };
  D.orders.unshift(order);
  afterOrder(order);
  overlay = null;
  go('order:' + id);
  toast('Order #' + id + ' created from the draft');
}

document.addEventListener(
  'click',
  (event) => {
    if (!event.target.closest('[data-act="chatdraft"]') || !D.live) return;
    event.stopImmediatePropagation();
    event.preventDefault();
    openChatDraft();
  },
  true,
);

/** The Orders screen gets the same button next to "Create order" on laptops. */
live(V, 'orders', (original) =>
  !DESK
    ? original()
    : original().replace(
        '<button class="btn ink sm" data-go="create">Create order</button>',
        `${START_BUTTON}<button class="btn ink sm" data-go="create">Create order</button>`,
      ),
);
