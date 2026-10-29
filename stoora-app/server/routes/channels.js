/**
 * WhatsApp and Instagram chats: webhooks from Meta bring buyer messages in,
 * and `/api/chats/:id/send` sends the seller's reply out.
 */
'use strict';

const { sql, listRecords, getRecord, saveRecord } = require('../db');
const { HttpError } = require('../http');
const { cleanText } = require('../auth');
const meta = require('../services/meta');
const ai = require('../services/ai');
const { dateLabel } = require('../orders');

const CHANNELS = {
  whatsapp: { label: 'WhatsApp', read: meta.readWhatsAppMessages, send: meta.sendWhatsApp, cfgKey: 'waPhoneId' },
  instagram: { label: 'Instagram', read: meta.readInstagramMessages, send: meta.sendInstagram, cfgKey: 'igAccountId' },
};

/** Add one incoming message to the right chat, creating the chat on the first message. */
async function receiveMessage(channel, message) {
  const row = sql.channelOwner.get(channel, String(message.accountId));
  const owner = row && sql.userById.get(row.user_id);
  if (!owner) return; // a number nobody has claimed: ignore

  const chatId = `${channel}-${message.contactId}`; // no ":" : the dashboard uses it to split routes
  const existing = getRecord(owner.id, 'chats', chatId);
  const who =
    (existing && existing.who) ||
    message.name ||
    (channel === 'whatsapp' ? `+${message.contactId}` : 'Instagram buyer');
  const mood = ai.classifyMessage(message.text);

  const chat = existing || {
    id: chatId,
    channel,
    contact: message.contactId,
    who,
    src: CHANNELS[channel].label,
    msgs: [],
  };
  // Meta may deliver the same message twice: a message id is handled once.
  if (message.messageId && chat.msgs.some((entry) => entry[3] === message.messageId)) return;
  chat.msgs = [...chat.msgs, ['them', message.text, message.ts, message.messageId || null, null]].slice(-100);
  chat.last = message.text.slice(0, 120);
  chat.time = dateLabel(message.ts);
  chat.ts = message.ts;
  chat.unread = true;
  chat.mood = mood;
  chat.draft = await ai.draftReply(owner, who, message.text, mood);

  // Newest chats first.
  saveRecord(owner.id, 'chats', chat, -(message.ts % 1_000_000));
}

/** A delivery update (sent, delivered, read, failed) for a message we sent earlier. */
function applyStatus(channel, update) {
  const row = sql.channelOwner.get(channel, String(update.accountId));
  if (!row) return;
  const chat = getRecord(row.user_id, 'chats', `${channel}-${update.contactId}`);
  if (!chat) return;
  let changed = false;
  chat.msgs = chat.msgs.map((entry) => {
    if (entry[3] !== update.messageId || entry[4] === update.status) return entry;
    changed = true;
    return [entry[0], entry[1], entry[2], entry[3], update.status];
  });
  if (changed) saveRecord(row.user_id, 'chats', chat, 0);
}

function registerWebhook(router, channel) {
  const path = `/api/webhooks/${channel}`;

  // Meta calls this once, when you save the webhook address in the Meta dashboard.
  router.add('GET', path, {}, ({ res, url }) => {
    const challenge = meta.answerVerification(url.searchParams);
    if (challenge === null) throw new HttpError(403, 'Verification failed');
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(challenge);
    return undefined;
  });

  router.add('POST', path, { raw: true }, async ({ req, raw }) => {
    if (!meta.isSignatureValid(raw, req.headers['x-hub-signature-256'])) throw new HttpError(403, 'Bad signature');
    let payload;
    try {
      payload = JSON.parse(raw.toString('utf8'));
    } catch (_) {
      throw new HttpError(400, 'Bad JSON');
    }
    for (const message of CHANNELS[channel].read(payload)) await receiveMessage(channel, message);
    if (channel === 'whatsapp') meta.readWhatsAppStatuses(payload).forEach((update) => applyStatus(channel, update));
    return { ok: true };
  });
}

module.exports = function registerChannelRoutes(router) {
  registerWebhook(router, 'whatsapp');
  registerWebhook(router, 'instagram');

  /** Send the seller's reply to the buyer, then record it in the chat. */
  router.add('POST', '/api/chats/:id/send', { auth: true }, async ({ user, owner, params, body }) => {
    if (!['owner', 'chat'].includes(user.role)) throw new HttpError(403, 'You cannot send messages');
    if (owner.demo) throw new HttpError(403, 'The sample shop is read-only');

    const chat = getRecord(owner.id, 'chats', params.id);
    if (!chat || !CHANNELS[chat.channel]) throw new HttpError(404, 'Chat not found');
    const text = cleanText(body.text, 1000);
    if (!text) throw new HttpError(400, 'Type a message first');

    const channel = CHANNELS[chat.channel];
    const cfg = JSON.parse(owner.settings).cfg || {};
    const accountId = cfg[channel.cfgKey];
    if (!accountId) throw new HttpError(400, `Add your ${channel.label} account in Settings > Apps first`);

    let sent;
    try {
      sent = await channel.send(accountId, chat.contact, text);
    } catch (error) {
      throw new HttpError(502, `${channel.label} did not accept the message: ${error.message}`);
    }

    const position = listRecords(owner.id, 'chats').findIndex((item) => item.id === chat.id);
    const messageId =
      (sent && sent.messages && sent.messages[0] && sent.messages[0].id) || (sent && sent.message_id) || null;
    chat.msgs = [...chat.msgs, ['me', text, Date.now(), messageId, 'sent']].slice(-100);
    chat.last = `You: ${text.slice(0, 110)}`;
    chat.draft = null;
    chat.unread = false;
    saveRecord(owner.id, 'chats', chat, position < 0 ? 0 : position);
    return { chat };
  });
};
