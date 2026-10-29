/**
 * The storefront builder API (for the signed-in shop owner):
 * choose a template, save a draft, preview it, publish it, upload images.
 * Everything is limited to the owner's own storefront; the sample shop is read-only.
 */
'use strict';

const shared = require('../../public/js/storefront/shared');
const { sql, listRecords } = require('../db');
const { HttpError } = require('../http');
const store = require('../storefront');
const premium = require('../premium');

const refuseDemo = (owner) => {
  if (owner.demo) throw new HttpError(403, 'The sample shop is read-only. Create your own shop to build a storefront.');
};

/** Everything the editor and the draft preview need in one reply. */
function editorState(owner) {
  const row = store.rowOf(owner.id);
  const draft = row ? JSON.parse(row.draft) : null;
  const config = draft || shared.defaultConfig('boutique', { name: owner.shop });
  const issues = store.readinessIssues(owner, config);
  return {
    status: store.statusOf(row, issues),
    config,
    published: row && row.published ? JSON.parse(row.published) : null,
    publishedAt: row ? row.published_at : null,
    version: row ? row.version : 0,
    // Changes with every draft save. The editor sends it back so an out-of-date tab cannot overwrite newer work.
    revision: row ? row.updated_at : 0,
    issues,
    // All active products and services. The editor and the preview page hide the ones turned off with visibleData().
    data: store.storefrontData(owner, { ...config, hiddenIds: [] }),
    // Every product and service, so the seller can choose what to show (hidden ones included).
    catalogue: {
      products: listRecords(owner.id, 'products').map(({ id, name, price, status, img, cat }) => ({
        id,
        name,
        price,
        status,
        img: img || '',
        cat: cat || '',
      })),
      services: listRecords(owner.id, 'services').map(({ id, name, price, type, img }) => ({
        id,
        name,
        price,
        type: type || '',
        img: img || '',
      })),
    },
    url: `/s/${owner.handle}`,
  };
}

module.exports = function registerStorefrontRoutes(router) {
  router.add('GET', '/api/storefront', { auth: true, ownerOnly: true }, ({ owner }) => editorState(owner));

  /** Save the draft. Nothing here changes what buyers see until the seller publishes. */
  router.add('PUT', '/api/storefront', { auth: true, ownerOnly: true }, ({ owner, body }) => {
    refuseDemo(owner);
    const config = store.cleanConfig(body.config, owner);
    premium.requireAccess(owner, config.template); // a locked premium template can be previewed, never applied
    const current = store.rowOf(owner.id);
    if (current && body.baseRevision != null && Number(body.baseRevision) !== current.updated_at)
      throw new HttpError(409, 'This storefront was changed somewhere else (another tab or device). Reload to see the latest version before saving.');
    store.saveDraft(owner, config);
    const issues = store.readinessIssues(owner, config);
    const row = store.rowOf(owner.id);
    return { ok: true, status: store.statusOf(row, issues), issues, config, revision: row.updated_at, savedAt: row.updated_at };
  });

  router.add('POST', '/api/storefront/publish', { auth: true, ownerOnly: true }, ({ owner }) => {
    refuseDemo(owner);
    const draft = store.rowOf(owner.id);
    if (draft) premium.requireAccess(owner, JSON.parse(draft.draft).template);
    store.publish(owner);
    return { ok: true, status: 'published', url: `/s/${owner.handle}`, publishedAt: Date.now() };
  });

  router.add('POST', '/api/storefront/unpublish', { auth: true, ownerOnly: true }, ({ owner }) => {
    refuseDemo(owner);
    sql.unpublishStorefront.run(owner.id);
    return { ok: true };
  });

  /** An image goes up as the raw file body. Type and size are checked on the server. */
  router.add(
    'POST',
    '/api/storefront/images',
    { auth: true, ownerOnly: true, raw: true, rawLimit: store.MAX_IMAGE_BYTES + 1024 },
    ({ owner, raw }) => {
      refuseDemo(owner);
      return { url: store.saveImage(owner, raw) };
    },
  );

  router.add('DELETE', '/api/storefront/images/:name', { auth: true, ownerOnly: true }, ({ owner, params }) => {
    refuseDemo(owner);
    store.deleteImage(owner, params.name);
    return { ok: true };
  });

  /* ---------- premium templates: what is for sale, buying, and confirming ---------- */

  /** The premium templates, whether this seller has each one, and the operator's pricing (no made-up amounts). */
  router.add('GET', '/api/storefront/premium', { auth: true, ownerOnly: true }, ({ owner }) => ({
    templates: premium.catalogue(owner),
    pricing: premium.pricing(),
  }));

  /** Start buying one template. The server sets the price; the browser only opens Razorpay Checkout. */
  router.add('POST', '/api/storefront/premium/:id/order', { auth: true, ownerOnly: true }, async ({ owner, params }) => {
    refuseDemo(owner);
    return premium.startPurchase(owner, params.id);
  });

  /** After paying: the browser sends Razorpay's proof. Access is granted only when its signature checks out. */
  router.add('POST', '/api/storefront/premium/verify', { auth: true, ownerOnly: true }, ({ owner, body }) => {
    refuseDemo(owner);
    return {
      ok: true,
      ...premium.confirmFromBrowser(owner, {
        orderId: String(body.razorpay_order_id || ''),
        paymentId: String(body.razorpay_payment_id || ''),
        signature: String(body.razorpay_signature || ''),
      }),
    };
  });
};
