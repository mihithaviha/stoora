/**
 * The Stoora writing helpers.
 *
 *  - describeProduct: writes a product description.
 *  - draftOrderFromText: turns a pasted chat into an editable order DRAFT. It never creates an order.
 *
 * With ANTHROPIC_API_KEY set in `.env` these use Claude (model: AI_MODEL). Without a key they use a plain
 * template or a simple reader, and the reply says so (`source: 'data'`).
 */
'use strict';

const { config } = require('../config');
const { listRecords } = require('../db');

const isConfigured = () => Boolean(config.ai.apiKey);

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

module.exports = { isConfigured, describeProduct, draftOrderFromText };
