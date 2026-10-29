/**
 * The Stoora assistant.
 *
 *  - answerQuestion: answers questions about one shop. The model can only call the tools in
 *    assistant-tools.js, which read that seller's own records. Charts and cards are built
 *    here from the tools' real numbers, never from the model's words.
 *  - describeProduct: writes a product description.
 *  - draftOrderFromText: turns a pasted chat into an editable order DRAFT. It never creates an order.
 *  - classifyMessage / draftReply: sort buyer messages and draft a reply for the seller to check.
 *
 * With ANTHROPIC_API_KEY set in `.env` these use Claude (model: AI_MODEL). Without a key the answers
 * are plain summaries worked out from the shop's numbers, and the reply says so (`source: 'data'`).
 */
'use strict';

const { config } = require('../config');
const { listRecords } = require('../db');
const tools = require('./assistant-tools');

const isConfigured = () => Boolean(config.ai.apiKey);
const rupees = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const NOT_CONNECTED = 'The AI assistant is not connected, so this is a plain summary worked out from your numbers.';

/* ---------- one call to the Claude Messages API ---------- */

async function callClaude({ system, messages, maxTokens = 500, toolDefinitions }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': config.ai.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: config.ai.model,
      max_tokens: maxTokens,
      system,
      messages,
      ...(toolDefinitions ? { tools: toolDefinitions } : {}),
    }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data.error && data.error.message) || `Claude replied ${response.status}`);
  return data;
}

const textOf = (data) =>
  (data.content || [])
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')
    .trim();

/* ---------- answering questions ---------- */

const ASSISTANT_RULES =
  "You are Stoora, a calm assistant for a small shop owner in India. Use the tools to look up the shop's real numbers before answering. " +
  'Answer in plain, short sentences (under 80 words). Use only numbers the tools returned: never invent or estimate. ' +
  'If a tool returns nothing or the answer is not in the data, say so. You can only suggest: never say you sent, changed, refunded or created anything. ' +
  'Use the ₹ sign for money.';

/** Cards, a chart and links built from the tools' real results. */
function presentation(results) {
  const cards = [];
  const links = [];
  let chart = null;

  for (const { name, result } of results) {
    if (name === 'get_sales_summary') {
      const label = result.days === 1 ? 'Today' : `Last ${result.days} days`;
      cards.push({
        label: `Sales · ${label}`,
        value: rupees(result.sales),
        note:
          result.salesChangePercent == null
            ? 'No earlier sales to compare'
            : `${result.salesChangePercent >= 0 ? '+' : ''}${result.salesChangePercent}% vs before`,
      });
      cards.push({
        label: 'Orders',
        value: String(result.orders),
        note: result.averageOrder ? `Average ${rupees(result.averageOrder)}` : '',
      });
      if (result.days > 1 && result.bars.some((bar) => bar.value > 0))
        chart = { title: `Sales per day · ${label}`, bars: result.bars };
      links.push({ label: 'Open analytics', route: 'analytics' });
    }
    if (name === 'get_orders_needing_attention') {
      cards.push({ label: 'Paid, waiting to ship', value: String(result.paidWaitingToShip.length), note: '' });
      cards.push({ label: 'Not paid yet', value: String(result.notPaidYet.length), note: '' });
      links.push({ label: 'Open orders', route: 'orders' });
    }
    if (name === 'get_online_payments') {
      cards.push({
        label: 'Online payments received',
        value: rupees(result.paid.amount),
        note: `${result.paid.count} payment${result.paid.count === 1 ? '' : 's'}`,
      });
      if (result.failed.count) cards.push({ label: 'Failed attempts', value: String(result.failed.count), note: '' });
      links.push({ label: 'Open payments', route: 'payments' });
    }
    if (name === 'get_low_stock' && result.items.length) links.push({ label: 'Open products', route: 'products' });
  }
  const seen = new Set();
  return { cards, chart, links: links.filter((link) => !seen.has(link.route) && seen.add(link.route)) };
}

/** Let the model call tools (at most 4 rounds), then return its final text with the real results. */
async function askWithClaude(owner, question, history) {
  const messages = [
    ...history.slice(-6).map((turn) => ({
      role: turn.role === 'assistant' ? 'assistant' : 'user',
      content: String(turn.text).slice(0, 1000),
    })),
    { role: 'user', content: question },
  ];
  const results = [];

  for (let round = 0; round < 4; round++) {
    const data = await callClaude({ system: ASSISTANT_RULES, messages, toolDefinitions: tools.TOOL_DEFINITIONS });
    const calls = (data.content || []).filter((part) => part.type === 'tool_use');
    if (data.stop_reason !== 'tool_use' || !calls.length) return { text: textOf(data), ...presentation(results) };

    messages.push({ role: 'assistant', content: data.content });
    messages.push({
      role: 'user',
      content: calls.map((call) => {
        let output;
        try {
          const result = tools.runTool(call.name, call.input, owner.id); // always this seller's data
          results.push({ name: call.name, result });
          output = JSON.stringify(result);
        } catch (error) {
          output = JSON.stringify({ error: error.message });
        }
        return { type: 'tool_result', tool_use_id: call.id, content: output };
      }),
    });
  }
  return { text: 'I could not finish looking that up. Please ask in a simpler way.', ...presentation(results) };
}

/** Without a key: choose the tools by keywords and write a plain sentence. */
function askWithoutAi(owner, question) {
  const q = question.toLowerCase();
  const results = [];
  const run = (name, input) => {
    const result = tools.runTool(name, input, owner.id);
    results.push({ name, result });
    return result;
  };
  const days = /today/.test(q) ? 1 : /month|30/.test(q) ? 30 : 7;
  let text;

  if (/ship|attention|order|first|focus/.test(q)) {
    const result = run('get_orders_needing_attention');
    const ship = result.paidWaitingToShip.map((order) => `#${order.id} (${order.buyer})`).join(', ');
    text =
      `${ship ? `Ship ${ship} first.` : 'No paid orders are waiting to ship.'} ${result.notPaidYet.length ? `${result.notPaidYet.length} order${result.notPaidYet.length === 1 ? ' is' : 's are'} not paid yet.` : ''}`.trim();
  } else if (/stock|restock|low/.test(q)) {
    const result = run('get_low_stock');
    text = result.items.length
      ? `Running low: ${result.items.map((item) => `${item.name} (${item.left} left)`).join(', ')}.`
      : 'Nothing is running low.';
  } else if (/payment|pending|paid|money|received/.test(q)) {
    const result = run('get_online_payments');
    text = `Online payments: ${rupees(result.paid.amount)} received from ${result.paid.count}, ${result.waiting.count} waiting, ${result.failed.count} failed.`;
  } else if (/rating|review/.test(q)) {
    const result = run('get_ratings');
    text = result.reviewCount
      ? `Ratings: ${result.items.map((item) => `${item.name} ${item.average}/5 (${item.reviews})`).join(', ')}.`
      : 'No buyer reviews yet. Ratings appear after genuine reviews.';
  } else if (/best|top|product|sell/.test(q)) {
    const result = run('get_top_products', { days });
    text = result.products.length
      ? `Best sellers: ${result.products.map((product) => `${product.name} (${rupees(product.earned)})`).join(', ')}.`
      : 'No paid orders in this period yet.';
  } else {
    const result = run('get_sales_summary', { days });
    const change =
      result.salesChangePercent == null
        ? ''
        : ` That is ${Math.abs(result.salesChangePercent)}% ${result.salesChangePercent >= 0 ? 'more' : 'less'} than the period before.`;
    text = result.orders
      ? `${days === 1 ? 'Today' : `In the last ${days} days`} you sold ${rupees(result.sales)} from ${result.orders} order${result.orders === 1 ? '' : 's'}.${change}`
      : 'There are no orders in this period yet. Share your shop link to get your first one.';
  }
  return { text, ...presentation(results) };
}

async function answerQuestion(owner, question, history = []) {
  if (isConfigured()) return { ...(await askWithClaude(owner, question, history)), source: 'ai' };
  return { ...askWithoutAi(owner, question), source: 'data', notice: NOT_CONNECTED };
}

/* ---------- product descriptions ---------- */

async function describeProduct({ title, category, sizes, shop }) {
  if (isConfigured()) {
    const data = await callClaude({
      system:
        'Write a product description for an Indian small-shop seller: 2 or 3 plain sentences, warm, no hype, no emojis. Use only the facts given.',
      messages: [
        {
          role: 'user',
          content: `Shop: ${shop}\nProduct: ${title}\nCategory: ${category || 'n/a'}\nSizes or colours: ${sizes || 'n/a'}`,
        },
      ],
      maxTokens: 220,
    });
    return textOf(data);
  }
  return `${title}${category ? ` (${category})` : ''}. ${sizes ? `Available in ${sizes}. ` : ''}Ordered straight from ${shop}. Message us to order.`;
}

/* ---------- order drafts from pasted chats ---------- */

const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, a: 1, an: 1 };

/** Match a name the buyer wrote to a product the seller really has. */
function matchProduct(name, catalogue) {
  const wanted = String(name || '').toLowerCase();
  if (!wanted) return null;
  const words = wanted.split(/[^a-z0-9]+/).filter((word) => word.length > 2);
  let best = null;
  let bestScore = 0;
  for (const item of catalogue) {
    const itemName = item.name.toLowerCase();
    const score =
      itemName.includes(wanted) || wanted.includes(itemName)
        ? 10
        : words.filter((word) => itemName.includes(word)).length;
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

/** Without AI: look for a phone number, a name, an address line and product names with a quantity. */
function readDraftWithoutAi(text, catalogue) {
  const phone = (text.match(/(?:\+?91[\s-]?)?([6-9]\d{4}[\s-]?\d{5})/) || [])[1] || '';
  const name = (
    (text.match(/(?:my name is|i am|this is|name[:\s]+)\s*([A-Za-z]+(?: [A-Za-z]+)?)/i) || [])[1] || ''
  ).trim();
  const address = (text.split(/\n/).find((line) => /deliver|address|pin ?code|\b\d{6}\b/i.test(line)) || '')
    .replace(/^.*?(?:deliver to|address[:\s]*)/i, '')
    .trim();
  const lines = [];
  for (const item of catalogue) {
    const words = item.name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3);
    const lower = text.toLowerCase();
    if (!words.some((word) => lower.includes(word))) continue;
    const near = lower.match(new RegExp(`(\\d+|one|two|three|four|five|six|an?)\\s+(?:\\w+\\s+){0,3}?${words[0]}`));
    const quantity = near ? Number(near[1]) || NUMBER_WORDS[near[1]] || 1 : 1;
    lines.push({ productName: item.name, quantity });
  }
  return { buyerName: name, phone: phone.replace(/\D/g, ''), address, items: lines, notes: '' };
}

/** Returns a draft the seller must review. Nothing is saved. */
async function draftOrderFromText(owner, text) {
  const catalogue = [
    ...listRecords(owner.id, 'products').filter((p) => p.status === 'Active'),
    ...listRecords(owner.id, 'services'),
  ];
  let raw;
  let source = 'data';

  if (isConfigured()) {
    try {
      const data = await callClaude({
        system:
          'Read a chat between a seller and a buyer. Reply with ONLY a JSON object: {"buyerName":"","phone":"","address":"","items":[{"productName":"","quantity":1}],"notes":""}. Use only what the chat says; leave a field empty when it is not there. Never invent a phone number or address.',
        messages: [
          {
            role: 'user',
            content: `Products the seller has: ${catalogue.map((item) => item.name).join('; ')}\n\nChat:\n${text.slice(0, 6000)}`,
          },
        ],
        maxTokens: 500,
      });
      raw = JSON.parse((textOf(data).match(/\{[\s\S]*\}/) || ['{}'])[0]);
      source = 'ai';
    } catch (error) {
      console.error('[stoora] AI order draft failed, using plain reading:', error.message);
    }
  }
  if (!raw) raw = readDraftWithoutAi(text, catalogue);

  const lines = [];
  const unmatched = [];
  for (const entry of Array.isArray(raw.items) ? raw.items : []) {
    const item = matchProduct(entry.productName, catalogue);
    const quantity = Math.min(20, Math.max(1, Math.floor(Number(entry.quantity)) || 1));
    if (item) lines.push({ id: item.id, name: item.name, price: item.price, quantity });
    else if (entry.productName) unmatched.push(String(entry.productName).slice(0, 80));
  }
  return {
    buyerName: String(raw.buyerName || '').slice(0, 80),
    phone: String(raw.phone || '')
      .replace(/\D/g, '')
      .slice(-10),
    address: String(raw.address || '').slice(0, 300),
    notes: String(raw.notes || '').slice(0, 300),
    lines,
    unmatched,
    source,
  };
}

/* ---------- buyer messages ---------- */

/** Sort a buyer's message into a mood the dashboard can group by. */
function classifyMessage(text) {
  const t = text.toLowerCase();
  if (/not (received|delivered|come|arrived)|refund|return|complain|wrong|damaged|worst|cheat|bad|late/.test(t))
    return 'upset';
  if (/price|cost|how much|available|stock|size|buy|order|book|pay|upi|cod|deliver|color|colour/.test(t))
    return 'ready';
  return 'look';
}

/** A reply the seller can check and send. Mentions a product when the buyer's text names one. */
async function draftReply(owner, buyerName, text, mood) {
  const products = listRecords(owner.id, 'products').filter((p) => p.status === 'Active');
  const mentioned = products.find((p) =>
    p.name
      .toLowerCase()
      .split(/[ ,]+/)
      .some((word) => word.length > 3 && text.toLowerCase().includes(word)),
  );

  if (isConfigured()) {
    try {
      const data = await callClaude({
        system: `You write short, polite WhatsApp replies for ${owner.shop}, a small shop in India. Under 50 words. Use only the product facts given. Never promise delivery dates. The seller will read it before sending.`,
        messages: [
          {
            role: 'user',
            content: `Products: ${JSON.stringify(products.map((p) => ({ name: p.name, price: p.price, left: p.stock })))}\nBuyer ${buyerName} wrote: ${text}\nMood: ${mood}`,
          },
        ],
        maxTokens: 160,
      });
      return textOf(data);
    } catch (error) {
      console.error('[stoora] AI draft failed, using template:', error.message);
    }
  }

  const first = (buyerName || 'there').split(' ')[0];
  if (mood === 'upset')
    return `So sorry, ${first}. Thank you for telling us. Could you share your order number so I can check it right away?`;
  if (mentioned) {
    const left = mentioned.stock != null && mentioned.stock <= 5 ? ` Only ${mentioned.stock} left.` : '';
    return `Hi ${first}! ${mentioned.name} is ${rupees(mentioned.price)}.${left} Shall I send you a payment link?`;
  }
  return `Hi ${first}! Thanks for writing to ${owner.shop}. How can I help?`;
}

module.exports = { isConfigured, answerQuestion, describeProduct, draftOrderFromText, classifyMessage, draftReply };
