/**
 * Storefront builder: validating a storefront configuration, deciding what the public may see,
 * and storing uploaded images.
 *
 * A seller's storefront is one versioned configuration object (template, theme, texts, images,
 * which products to show). The seller edits a DRAFT; publishing copies it to the PUBLISHED version
 * that buyers see. Products and services are NOT copied: they always come from the seller's real
 * catalogue, so the storefront and the dashboard can never disagree.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const shared = require('../public/js/storefront/shared');
const { sql, listRecords } = require('./db');
const { config: appConfig } = require('./config');
const { HttpError } = require('./http');
const { ratingsByProduct } = require('./stats');

const { LIMITS } = shared;
const UPLOAD_ROOT = path.join(path.dirname(appConfig.dbPath), 'uploads');
const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;
const MAX_IMAGES_PER_SELLER = 300;

/* ---------- cleaning what the browser sends ---------- */

const text = (value, max) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const paragraph = (value, max) => (typeof value === 'string' ? value.replace(/\r/g, '').trim().slice(0, max) : '');
const digits10 = (value) =>
  String(value || '')
    .replace(/\D/g, '')
    .slice(-10);

function stringList(value, max = LIMITS.listItems, itemMax = 60) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => text(item, itemMax))
    .filter(Boolean)
    .slice(0, max);
}

function idList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((id) => text(String(id), 40)).filter(Boolean))].slice(0, LIMITS.ids);
}

/** An image must be one this seller uploaded to Stoora. Outside addresses are refused. */
function imageUrl(value, ownerId) {
  const url = typeof value === 'string' ? value.trim() : '';
  if (!url) return '';
  if (!new RegExp(`^/uploads/${ownerId}/[a-f0-9]{16}\\.(jpg|png|webp)$`).test(url)) {
    throw new HttpError(400, 'Images must be uploaded through Stoora');
  }
  return url;
}

function checkEmail(value) {
  const email = text(value, 120).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    throw new HttpError(400, 'That contact email does not look right');
  return email;
}

function checkPhone(value, label) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const number = digits10(raw);
  if (number.length !== 10) throw new HttpError(400, `${label} should be a 10-digit number`);
  return number;
}

/**
 * Turn whatever the browser sent into a clean configuration. Unknown keys are dropped, texts are
 * trimmed and limited, images must be the seller's own uploads, and anything missing gets its default.
 */
function cleanConfig(input, owner) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new HttpError(400, 'Bad storefront settings');
  const template = shared.TEMPLATES.find((item) => item.id === input.template);
  if (!template) throw new HttpError(400, 'Pick one of the available templates');
  if (!shared.THEMES.some((theme) => theme.id === input.theme))
    throw new HttpError(400, 'Pick one of the colour themes');
  if (input.accent != null && input.accent !== '' && !shared.ACCENTS.includes(input.accent))
    throw new HttpError(400, 'Pick one of the approved accent colours');

  const base = shared.defaultConfig(template.id, { name: owner.shop });
  const pick = (name) => (input[name] && typeof input[name] === 'object' ? input[name] : {});
  const brand = pick('brand');
  const hero = pick('hero');
  const about = pick('about');
  const story = pick('story');
  const contact = pick('contact');
  const social = pick('social');
  const services = pick('services');
  const sections = pick('sections');
  const footer = pick('footer');

  const instagram = text(social.instagram, 30).replace(/^@/, '');
  if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram))
    throw new HttpError(400, 'The Instagram name does not look right');

  return {
    version: 1,
    template: template.id,
    theme: input.theme,
    accent: input.accent || null,
    brand: {
      name: text(brand.name, 80) || base.brand.name,
      tagline: text(brand.tagline, LIMITS.short),
      logo: imageUrl(brand.logo, owner.id),
    },
    hero: {
      title: text(hero.title, 100),
      subtitle: text(hero.subtitle, 220),
      image: imageUrl(hero.image, owner.id),
      focus: shared.FOCUS_OPTIONS.includes(hero.focus) ? hero.focus : '50% 50%',
      cta: text(hero.cta, 30) || base.hero.cta,
    },
    about: {
      title: text(about.title, 60) || base.about.title,
      text: paragraph(about.text, LIMITS.text * 2),
      image: imageUrl(about.image, owner.id),
    },
    story: { title: text(story.title, 60) || base.story.title, text: paragraph(story.text, LIMITS.text * 2) },
    process: (Array.isArray(input.process) ? input.process : [])
      .slice(0, LIMITS.process)
      .map((step) => ({ title: text(step && step.title, 60), text: text(step && step.text, 240) }))
      .filter((step) => step.title || step.text),
    contact: {
      email: checkEmail(contact.email),
      phone: checkPhone(contact.phone, 'The phone number'),
      whatsapp: checkPhone(contact.whatsapp, 'The WhatsApp number'),
      address: paragraph(contact.address, 300),
      hours: text(contact.hours, 120),
    },
    social: { instagram },
    services: {
      subjects: stringList(services.subjects),
      levels: stringList(services.levels),
      modes: stringList(services.modes),
      sessions: paragraph(services.sessions, 300),
      credentials: stringList(services.credentials, LIMITS.listItems, 120),
    },
    faqs: (Array.isArray(input.faqs) ? input.faqs : [])
      .slice(0, LIMITS.faqs)
      .map((item) => ({ q: text(item && item.q, 140), a: paragraph(item && item.a, 500) }))
      .filter((item) => item.q && item.a),
    sections: Object.fromEntries(
      Object.keys(base.sections).map((key) => [
        key,
        sections[key] == null ? base.sections[key] : Boolean(sections[key]),
      ]),
    ),
    featuredIds: idList(input.featuredIds),
    hiddenIds: idList(input.hiddenIds),
    footer: { note: text(footer.note, 160) },
  };
}

/* ---------- saved storefronts ---------- */

const rowOf = (ownerId) => sql.storefront.get(ownerId);

/** What would stop publishing (errors), and what is worth fixing (warnings). */
function readinessIssues(owner, config) {
  const issues = [];
  const { products, services } = visibleCatalogue(owner, config);
  const template = shared.templateById(config.template);
  if (!config.brand.name) issues.push({ level: 'error', text: 'Add your store name.' });
  if (template.kind === 'services' ? !services.length && !products.length : !products.length && !services.length) {
    issues.push({
      level: 'error',
      text:
        template.kind === 'services'
          ? 'Add your first service to start building your storefront.'
          : 'Add your first product to start building your storefront.',
    });
  }
  if (!config.contact.email && !config.contact.phone && !config.contact.whatsapp)
    issues.push({ level: 'warning', text: 'Add a way for customers to contact you.' });
  if (!config.hero.image && template.id !== 'minimal' && template.id !== 'services')
    issues.push({ level: 'warning', text: 'A hero image makes the top of your store look better.' });
  return issues;
}

/** none, draft, ready, published or changes (published, with edits not yet published). */
function statusOf(row, issues) {
  if (!row) return 'none';
  if (!row.published) return issues.some((issue) => issue.level === 'error') ? 'draft' : 'ready';
  return row.published === row.draft ? 'published' : 'changes';
}

function saveDraft(owner, config) {
  const json = JSON.stringify(config);
  const row = rowOf(owner.id);
  // Always strictly newer than the last save, so the revision changes even for two saves in one millisecond.
  const at = Math.max(Date.now(), row ? row.updated_at + 1 : 0);
  if (row) sql.updateStorefrontDraft.run(json, at, owner.id);
  else sql.insertStorefront.run(owner.id, json, at, at);
}

function publish(owner) {
  const row = rowOf(owner.id);
  if (!row) throw new HttpError(400, 'Choose a template first');
  const config = JSON.parse(row.draft);
  const errors = readinessIssues(owner, config).filter((issue) => issue.level === 'error');
  if (errors.length) throw new HttpError(400, errors.map((issue) => issue.text).join(' '));
  // One statement: the old published version stays until this one succeeds.
  sql.publishStorefront.run(row.draft, Date.now(), owner.id);
}

/* ---------- what buyers and the editor see ---------- */

/** Products and services this storefront shows: active ones the seller has not hidden. */
function visibleCatalogue(owner, config) {
  const hidden = new Set(config.hiddenIds);
  return {
    products: listRecords(owner.id, 'products').filter(
      (product) => product.status === 'Active' && !hidden.has(product.id),
    ),
    services: listRecords(owner.id, 'services').filter((service) => !hidden.has(service.id)),
  };
}

const publicProduct = (item) => ({
  id: item.id,
  name: item.name,
  price: item.price,
  stock: item.stock == null ? null : item.stock,
  img: item.img || '',
  desc: String(item.desc || '').slice(0, 400),
  cat: item.cat || '',
  sizes: item.sizes || '',
  tags: item.tags || '',
});
const publicService = (item) => ({
  id: item.id,
  name: item.name,
  type: item.type || '',
  price: item.price,
  next: item.next || '',
  duration: item.duration || '',
  where: item.where || '',
  img: item.img || '',
  days: item.days || [],
  time: item.time || '',
});

/** Only things that are safe to show: no customers, no orders, no private settings. */
function storefrontData(owner, config) {
  const { products, services } = visibleCatalogue(owner, config);
  const reviews = listRecords(owner.id, 'reviews');
  const visibleIds = new Set([...products, ...services].map((item) => item.id));

  const sold = {};
  for (const order of listRecords(owner.id, 'orders')) {
    if (!order.paid) continue;
    for (const [id, quantity] of order.items || []) if (visibleIds.has(id)) sold[id] = (sold[id] || 0) + quantity;
  }
  const bestsellerIds = Object.entries(sold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id);

  const average = reviews.length ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length : 0;
  return {
    shop: { name: config.brand.name || owner.shop, city: owner.city || '', handle: owner.handle },
    products: products.map(publicProduct),
    services: services.map(publicService),
    bestsellerIds,
    ratings: ratingsByProduct(reviews),
    reviews: reviews
      .filter((review) => review.comment)
      .slice(0, 6)
      .map(({ who, rating, comment, productId }) => ({ who, rating, comment, productId })),
    reviewSummary: { count: reviews.length, average: Math.round(average * 10) / 10 },
  };
}

/** The published storefront for the public page, or null when the seller has not published one. */
function publishedStorefront(owner) {
  const row = rowOf(owner.id);
  if (!row || !row.published) return null;
  const config = JSON.parse(row.published);
  return { config, data: storefrontData(owner, config) };
}

/* ---------- images ---------- */

/** Look at the first bytes: only real JPEG, PNG and WebP files are accepted, whatever the name says. */
function imageType(buffer) {
  if (buffer.length > 12 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.length > 12 && buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return 'png';
  if (buffer.length > 12 && buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP')
    return 'webp';
  return null;
}

function saveImage(owner, buffer) {
  if (!buffer.length) throw new HttpError(400, 'No image was sent');
  if (buffer.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'That image is too large. Use one under 2.5 MB.');
  const type = imageType(buffer);
  if (!type) throw new HttpError(400, 'Use a JPG, PNG or WebP image');

  const folder = path.join(UPLOAD_ROOT, owner.id);
  fs.mkdirSync(folder, { recursive: true });
  if (fs.readdirSync(folder).length >= MAX_IMAGES_PER_SELLER)
    throw new HttpError(400, 'You have reached the image limit. Remove some first.');

  const name = `${crypto.randomBytes(8).toString('hex')}.${type}`;
  fs.writeFileSync(path.join(folder, name), buffer);
  return `/uploads/${owner.id}/${name}`;
}

function deleteImage(owner, name) {
  if (!/^[a-f0-9]{16}\.(jpg|png|webp)$/.test(name)) throw new HttpError(400, 'Not an image name');
  fs.rmSync(path.join(UPLOAD_ROOT, owner.id, name), { force: true });
}

/** Absolute path of an uploaded image, or null when the address is not a valid upload path. */
function uploadFile(pathname) {
  const match = pathname.match(/^\/uploads\/(u_[a-f0-9]+)\/([a-f0-9]{16}\.(jpg|png|webp))$/);
  if (!match) return null;
  const file = path.join(UPLOAD_ROOT, match[1], match[2]);
  return file.startsWith(UPLOAD_ROOT + path.sep) ? file : null;
}

module.exports = {
  cleanConfig,
  rowOf,
  readinessIssues,
  statusOf,
  saveDraft,
  publish,
  storefrontData,
  publishedStorefront,
  saveImage,
  deleteImage,
  uploadFile,
  MAX_IMAGE_BYTES,
};
