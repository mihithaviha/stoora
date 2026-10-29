/**
 * "Write it for me" and "Read a chat into an order draft" in the dashboard.
 */
'use strict';

const { HttpError, isRateLimited } = require('../http');
const { cleanText } = require('../auth');
const ai = require('../services/ai');

module.exports = function registerAiRoutes(router) {
  /** Turn a pasted chat into an order DRAFT. Nothing is created: the seller reviews and approves it in the dashboard. */
  router.add('POST', '/api/ai/draft-order', { auth: true, ownerOnly: true }, async ({ owner, body }) => {
    if (owner.demo) throw new HttpError(403, 'Log in to your own shop first');
    if (isRateLimited(`draft:${owner.id}`, 30, 60 * 60 * 1000)) throw new HttpError(429, 'Try again later.');
    const text = cleanText(body.text, 6000);
    if (text.length < 10) throw new HttpError(400, 'Paste the chat or message first');
    return { draft: await ai.draftOrderFromText(owner, text) };
  });

  router.add('POST', '/api/ai/describe', { auth: true, ownerOnly: true }, async ({ owner, body }) => {
    if (owner.demo) throw new HttpError(403, 'Log in to your own shop first');
    if (isRateLimited(`describe:${owner.id}`, 30, 60 * 60 * 1000)) throw new HttpError(429, 'Try again later.');
    const title = cleanText(body.title, 80);
    if (!title) throw new HttpError(400, 'Type the title first');

    try {
      const text = await ai.describeProduct({
        title,
        category: cleanText(body.category, 40),
        sizes: cleanText(body.sizes, 120),
        shop: owner.shop,
      });
      return { text };
    } catch (error) {
      throw new HttpError(502, `The assistant could not write it: ${error.message}`);
    }
  });
};
