/**
 * WhatsApp Business (Cloud API) and Instagram messaging, both through Meta's Graph API.
 *
 * Set these in `.env`:
 *   META_APP_SECRET      Meta app > App settings > Basic > App secret   (checks webhook signatures)
 *   META_VERIFY_TOKEN    any text you choose; paste the same text into Meta's webhook setup
 *   WHATSAPP_TOKEN       a permanent access token with WhatsApp permissions
 *   INSTAGRAM_TOKEN      a long-lived access token with Instagram messaging permissions
 *
 * Each seller then adds their own WhatsApp "Phone number ID" or Instagram account id in
 * Settings > Apps. Those ids are not secret.
 */
'use strict';

const crypto = require('node:crypto');
const { config } = require('../config');

const graph = (path) => `https://graph.facebook.com/${config.meta.graphVersion}/${path}`;

/** Meta signs every webhook body with the app secret: "sha256=<hex>". */
function isSignatureValid(rawBody, header) {
  if (!config.meta.appSecret) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', config.meta.appSecret).update(rawBody).digest('hex');
  const left = Buffer.from(expected);
  const right = Buffer.from(String(header || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

/** Meta calls this once when you save the webhook address. Returns the challenge to echo, or null. */
function answerVerification(query) {
  const ok =
    query.get('hub.mode') === 'subscribe' &&
    config.meta.verifyToken &&
    query.get('hub.verify_token') === config.meta.verifyToken;
  return ok ? query.get('hub.challenge') : null;
}

/** Pull the text messages out of a WhatsApp webhook body. */
function readWhatsAppMessages(payload) {
  const messages = [];
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const phoneNumberId = value.metadata && value.metadata.phone_number_id;
      for (const message of value.messages || []) {
        if (message.type !== 'text' || !message.text) continue;
        const contact = (value.contacts || []).find((c) => c.wa_id === message.from);
        messages.push({
          accountId: phoneNumberId,
          contactId: message.from,
          name: contact && contact.profile && contact.profile.name,
          text: message.text.body,
          messageId: message.id,
          ts: Number(message.timestamp) * 1000 || Date.now(),
        });
      }
    }
  }
  return messages;
}

/** Delivery updates for messages we sent: sent, delivered, read or failed. */
function readWhatsAppStatuses(payload) {
  const statuses = [];
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      for (const status of value.statuses || []) {
        statuses.push({
          accountId: value.metadata && value.metadata.phone_number_id,
          contactId: status.recipient_id,
          messageId: status.id,
          status: status.status,
        });
      }
    }
  }
  return statuses;
}

/** Pull the text direct messages out of an Instagram webhook body. */
function readInstagramMessages(payload) {
  const messages = [];
  for (const entry of payload.entry || []) {
    for (const event of entry.messaging || []) {
      if (!event.message || !event.message.text || event.message.is_echo) continue;
      messages.push({
        accountId: entry.id,
        contactId: event.sender && event.sender.id,
        name: null,
        text: event.message.text,
        messageId: event.message.mid,
        ts: event.timestamp || Date.now(),
      });
    }
  }
  return messages;
}

async function post(url, token, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data.error && data.error.message) || `Meta replied ${response.status}`);
  return data;
}

const sendWhatsApp = (phoneNumberId, to, text) =>
  post(graph(`${phoneNumberId}/messages`), config.meta.whatsappToken, {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  });

const sendInstagram = (accountId, recipientId, text) =>
  post(graph(`${accountId}/messages`), config.meta.instagramToken, {
    recipient: { id: recipientId },
    message: { text },
  });

module.exports = {
  isSignatureValid,
  answerVerification,
  readWhatsAppMessages,
  readWhatsAppStatuses,
  readInstagramMessages,
  sendWhatsApp,
  sendInstagram,
};
