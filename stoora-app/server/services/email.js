/**
 * Sending email. Two providers are supported; pick one in `.env`:
 *   EMAIL_PROVIDER=resend   needs RESEND_API_KEY and EMAIL_FROM        (https://resend.com)
 *   EMAIL_PROVIDER=smtp     needs SMTP_HOST, SMTP_USER, SMTP_PASSWORD and EMAIL_FROM
 *                           (SMTP over TLS, usually port 465: Gmail, Zoho, your host ...)
 *
 * With no provider nothing is sent and nothing is printed: the links in these emails are
 * secrets, so they are never written to a log. The server only reports that an email was skipped.
 */
'use strict';

const tls = require('node:tls');
const { config, integrationStatus } = require('../config');

let warnedUnconfigured = false;
const isConfigured = () => integrationStatus().email.configured;

/** Send one email. Returns { sent: boolean }. Never throws: a failed email must not break a sign-up. */
async function sendEmail({ to, subject, html }) {
  if (!isConfigured()) {
    // Nothing from the email is printed, in any mode: the links inside are secrets and must never reach a log.
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.warn('[stoora] Email is not set up, so emails (order alerts, password reset, confirmations) are not sent. Set EMAIL_PROVIDER in .env.');
    }
    return { sent: false };
  }
  try {
    if (config.email.provider === 'resend') await sendWithResend({ to, subject, html });
    else await sendWithSmtp({ to, subject, html });
    return { sent: true };
  } catch (error) {
    console.error('[stoora] Email failed:', error.message);
    return { sent: false };
  }
}


async function sendWithResend({ to, subject, html }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.email.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: config.email.from, to: [to], subject, html }),
  });
  if (!response.ok) throw new Error(`Resend replied ${response.status}`);
}

/** A minimal SMTP client: implicit TLS, AUTH LOGIN, one HTML message. */
function sendWithSmtp({ to, subject, html }) {
  const { host, port, user, password } = config.email.smtp;
  const from = config.email.from;
  const fromAddress = (from.match(/<([^>]+)>/) || [null, from])[1];

  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host });
    socket.setTimeout(15000, () => fail(new Error('SMTP timed out')));
    let buffer = '';
    let waiting = null;

    const fail = (error) => {
      socket.destroy();
      reject(error);
    };

    // Collect lines; a reply is finished when a line looks like "250 text" (code, then a space).
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r\n/);
      const last = lines.filter((line) => /^\d{3} /.test(line)).pop();
      if (last && waiting) {
        const done = waiting;
        waiting = null;
        buffer = '';
        done(last);
      }
    });
    socket.on('error', fail);

    const expect = (code) =>
      new Promise((ok, no) => {
        waiting = (line) => (line.startsWith(code) ? ok(line) : no(new Error(`SMTP expected ${code}, got: ${line}`)));
      });
    const say = (line, code) => {
      const answer = expect(code);
      socket.write(line + '\r\n');
      return answer;
    };

    (async () => {
      await expect('220');
      await say('EHLO stoora', '250');
      await say('AUTH LOGIN', '334');
      await say(Buffer.from(user).toString('base64'), '334');
      await say(Buffer.from(password).toString('base64'), '235');
      await say(`MAIL FROM:<${fromAddress}>`, '250');
      await say(`RCPT TO:<${to}>`, '250');
      await say('DATA', '354');
      const message = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        html.replace(/^\./gm, '..'),
      ].join('\r\n');
      await say(message + '\r\n.', '250');
      socket.write('QUIT\r\n');
      socket.end();
      resolve();
    })().catch(fail);
  });
}

/* ---------- the emails Stoora sends ---------- */

const baseUrl = (fallbackPort) => config.appUrl || `http://localhost:${fallbackPort}`;

const button = (href, label) =>
  `<p><a href="${href}" style="background:#171C3C;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">${label}</a></p>`;

const layout = (body) =>
  `<div style="font-family:Arial,sans-serif;font-size:15px;color:#171C3C;max-width:480px">${body}<p style="color:#725F54;font-size:13px">Stoora.in</p></div>`;

const sendVerification = (user, token) =>
  sendEmail({
    to: user.email,
    subject: 'Confirm your email for Stoora',
    html: layout(
      `<p>Hi ${escapeHtml(user.name.split(' ')[0])}, confirm your email to finish setting up ${escapeHtml(user.shop)}.</p>${button(`${baseUrl(config.port)}/#verify=${token}`, 'Confirm my email')}<p>The link works for 48 hours.</p>`,
    ),
  });

const sendPasswordReset = (user, token) =>
  sendEmail({
    to: user.email,
    subject: 'Reset your Stoora password',
    html: layout(
      `<p>Someone asked to reset the password for this email. If it was you, choose a new one here:</p>${button(`${baseUrl(config.port)}/#reset=${token}`, 'Choose a new password')}<p>The link works for 1 hour. If it was not you, ignore this email.</p>`,
    ),
  });

const sendNewOrder = (owner, order, amount) =>
  sendEmail({
    to: owner.email,
    subject: `New order #${order.id} · ₹${amount.toLocaleString('en-IN')}`,
    html: layout(
      `<p>${escapeHtml(order.who)} placed order <b>#${order.id}</b> for <b>₹${amount.toLocaleString('en-IN')}</b> (${order.paid ? 'paid' : 'not paid yet'}).</p>${button(`${baseUrl(config.port)}/dashboard#order:${order.id}`, 'Open the order')}`,
    ),
  });

function escapeHtml(text) {
  return String(text).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

module.exports = { sendEmail, sendVerification, sendPasswordReset, sendNewOrder, isConfigured };
