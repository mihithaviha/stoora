/**
 * The five storefront templates. One renderer is used everywhere: the public shop page, the draft
 * preview, the editor's live preview and the gallery thumbnails. So what a seller previews is exactly
 * what buyers get.
 *
 *   StoreTemplates.render(templateId, { config, data, cart, extras, preview })  ->  HTML string
 *   StoreTemplates.bind(rootElement)                                           ->  search and filters
 *   StoreTemplates.sampleData(templateId)                                      ->  clearly labelled sample content
 *
 * `config` is the seller's storefront configuration, `data` is the public catalogue the server built
 * (only safe fields), `cart` is { productId: quantity }. Nothing here reads private data.
 * Styling lives in /css/storefront.css and reads the --store-* variables set from the chosen theme.
 */
(function () {
  const shared = window.StoreShared;

  /* ---------- small helpers ---------- */

  const esc = (value) =>
    String(value == null ? '' : value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const rupees = (n) => '₹' + Number(n).toLocaleString('en-IN');
  const stars = (rating) => '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  const paragraphs = (value) =>
    String(value || '')
      .split(/\n{2,}/)
      .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
      .join('');
  const initial = (name) => esc((name || '?').trim()[0].toUpperCase());

  const themeStyle = (config) =>
    Object.entries(shared.themeVariables(config.theme, config.accent))
      .map(([name, value]) => `${name}:${value}`)
      .join(';');

  /** An image. `focus` is the point that stays in view when it is cropped (for example a face). Hero images load first. */
  const img = (src, alt = '', eager = false, focus = '', zoom = 1) => {
    const style = [
      focus ? `object-position:${esc(focus)}` : '',
      zoom > 1 ? `transform:scale(${zoom});transform-origin:${esc(focus || '50% 50%')}` : '',
    ]
      .filter(Boolean)
      .join(';');
    return `<img src="${esc(src)}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high" ' : 'loading="lazy" '}decoding="async"${style ? ` style="${style}"` : ''}>`;
  };

  /** The saved-for-later list of the shop page being drawn (only the real shop passes one; previews have no hearts). */
  let wishNow = null;
  const heart = (item) =>
    wishNow && !isService(item)
      ? `<button class="sf-heart ${wishNow.includes(item.id) ? 'on' : ''}" type="button" data-wish="${esc(item.id)}" aria-pressed="${wishNow.includes(item.id)}" aria-label="${wishNow.includes(item.id) ? 'Remove' : 'Save'} ${esc(item.name)} ${wishNow.includes(item.id) ? 'from' : 'to'} your saved items">${wishNow.includes(item.id) ? '♥' : '♡'}</button>`
      : '';

  /** A product or service photo, or a designed placeholder with its first letter. */
  const photo = (item, className = '') =>
    `<div class="sf-photo ${className}"${isService(item) ? '' : ` data-view="${esc(item.id)}"`}>${item.img ? img(item.img, item.name, false, item.crop && item.crop.pos, item.crop && item.crop.zoom) : `<span class="sf-initial" aria-hidden="true">${initial(item.name)}</span>`}${heart(item)}</div>`;

  const isService = (item) => Boolean(item.type);
  const soldOut = (item) => !isService(item) && item.stock != null && item.stock <= 0;

  function availability(item) {
    if (isService(item)) return '';
    if (soldOut(item)) return '<span class="sf-stock out">Sold out</span>';
    if (item.stock != null && item.stock <= 3) return `<span class="sf-stock low">Only ${item.stock} left</span>`;
    return '<span class="sf-stock in">In stock</span>';
  }

  function ratingLine(item, ctx) {
    const rating = ctx.data.ratings && ctx.data.ratings[item.id];
    return rating
      ? `<span class="sf-stars" title="${rating.average.toFixed(1)} out of 5">${stars(rating.average)} <small>(${rating.count})</small></span>`
      : '';
  }

  /** The sizes a product comes in (a comma list the seller types in Products). */
  const optionsOf = (item) => [...new Set(String(item.sizes || '').split(',').map((part) => part.trim()).filter(Boolean))];

  /** The Add / quantity control (products) or Book button (services). Buyers' actions are handled by the shop page. */
  function action(item, ctx) {
    if (isService(item))
      return `<button class="sf-btn" data-book="${esc(item.id)}">${esc(ctx.config.hero.cta && ctx.template === 'services' ? ctx.config.hero.cta : 'Book now')}</button>`;
    if (soldOut(item)) return '';
    // A product with sizes needs a choice first, so its button opens the product page.
    if (optionsOf(item).length) return `<button class="sf-btn" data-view="${esc(item.id)}">Choose size</button>`;
    const quantity = (ctx.cart || {})[item.id] || 0;
    return quantity
      ? `<div class="sf-step" role="group" aria-label="Quantity of ${esc(item.name)}"><button data-d="-1" data-id="${esc(item.id)}" aria-label="One less">−</button><span>${quantity}</span><button data-d="1" data-id="${esc(item.id)}" aria-label="One more">+</button></div>`
      : `<button class="sf-btn" data-d="1" data-id="${esc(item.id)}">Add to bag</button>`;
  }

  function card(item, ctx, variant = '') {
    const detail = isService(item) ? [item.type, item.duration, item.where].filter(Boolean).join(' · ') : item.cat;
    return `<article class="sf-card ${variant}" data-cat="${esc(item.cat || '')}" data-name="${esc((item.name + ' ' + (item.tags || '')).toLowerCase())}">
      ${photo(item)}
      <div class="sf-card-body"><h3>${isService(item) ? esc(item.name) : `<a class="sf-viewlink" href="#product-${esc(item.id)}" data-view="${esc(item.id)}">${esc(item.name)}</a>`}</h3>${detail ? `<p class="sf-sub">${esc(detail)}</p>` : ''}${variant === 'describe' && item.desc ? `<p class="sf-desc">${esc(item.desc.slice(0, 120))}</p>` : ''}${ratingLine(item, ctx)}
        <p class="sf-price">${isService(item) ? 'From ' : ''}${rupees(item.price)}</p>${availability(item)}${action(item, ctx)}</div></article>`;
  }

  const grid = (items, ctx, variant = '', className = '') =>
    `<div class="sf-grid ${className}">${items.map((item) => card(item, ctx, variant)).join('')}</div>`;

  /* ---------- pieces shared by the templates ---------- */

  const logoOrName = (config, data) =>
    config.brand.logo
      ? `<span class="sf-logo">${img(config.brand.logo, config.brand.name || data.shop.name, true)}</span>`
      : `<span class="sf-wordmark">${esc(config.brand.name || data.shop.name)}</span>`;

  function collections(data) {
    const groups = {};
    for (const item of data.products) if (item.cat) (groups[item.cat] = groups[item.cat] || []).push(item);
    return Object.entries(groups).map(([name, items]) => ({
      name,
      count: items.length,
      image: (items.find((i) => i.img) || {}).img || '',
    }));
  }

  const byIds = (ids, items) => ids.map((id) => items.find((item) => item.id === id)).filter(Boolean);
  const featured = (ctx) => byIds(ctx.config.featuredIds, ctx.data.products);
  const bestsellers = (ctx) => byIds(ctx.data.bestsellerIds, ctx.data.products).slice(0, 4);
  const newest = (ctx) => ctx.data.products.slice(0, 4);

  /** Customer reviews: only real ones, only when there are some and the seller wants them shown. */
  function reviews(ctx, heading = 'What customers say') {
    const list = ctx.data.reviews || [];
    if (!ctx.config.sections.reviews || !list.length) return '';
    return `<section class="sf-section" id="sf-reviews"><div class="sf-wrap"><h2 class="sf-h2">${esc(heading)}</h2>
      <div class="sf-reviews">${list.map((r) => `<blockquote class="sf-review"><span class="sf-stars">${stars(r.rating)}</span><p>${esc(r.comment)}</p><footer>${esc(r.who)}</footer></blockquote>`).join('')}</div></div></section>`;
  }

  function about(ctx, { split = true } = {}) {
    const { about: block } = ctx.config;
    if (!ctx.config.sections.about || (!block.text && !block.image)) return '';
    return `<section class="sf-section" id="sf-about"><div class="sf-wrap ${split && block.image ? 'sf-split' : ''}">
      ${block.image ? `<div class="sf-about-photo">${img(block.image, block.title)}</div>` : ''}
      <div class="sf-about-text"><h2 class="sf-h2">${esc(block.title)}</h2>${paragraphs(block.text)}</div></div></section>`;
  }

  function faqs(ctx) {
    if (!ctx.config.sections.faqs || !ctx.config.faqs.length) return '';
    return `<section class="sf-section" id="sf-faq"><div class="sf-wrap sf-narrow"><h2 class="sf-h2">Questions and answers</h2>${ctx.config.faqs.map((f) => `<details class="sf-faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div></section>`;
  }

  function contact(ctx) {
    const c = ctx.config.contact;
    const instagram = ctx.config.social.instagram;
    const rows = [
      c.whatsapp
        ? `<a class="sf-btn" href="https://wa.me/91${esc(c.whatsapp)}" target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>`
        : '',
      c.phone ? `<a class="sf-btn ghost" href="tel:+91${esc(c.phone)}">Call ${esc(c.phone)}</a>` : '',
      c.email ? `<a class="sf-btn ghost" href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '',
      instagram
        ? `<a class="sf-btn ghost" href="https://instagram.com/${esc(instagram)}" target="_blank" rel="noopener noreferrer">Instagram</a>`
        : '',
    ].filter(Boolean);
    if (!ctx.config.sections.contact || (!rows.length && !c.address && !c.hours)) return '';
    return `<section class="sf-section" id="sf-contact"><div class="sf-wrap sf-narrow sf-center"><h2 class="sf-h2">Get in touch</h2>
      ${c.address ? `<p class="sf-sub">${esc(c.address).replace(/\n/g, '<br>')}</p>` : ''}${c.hours ? `<p class="sf-sub">${esc(c.hours)}</p>` : ''}
      <div class="sf-actions">${rows.join('')}</div></div></section>`;
  }

  function footer(ctx) {
    const { extras = {}, config, data } = ctx;
    const policies = [
      ['Refund policy', extras.policies && extras.policies.refund],
      ['Shipping policy', extras.policies && extras.policies.shipping],
      ['Privacy policy', extras.policies && extras.policies.privacy],
      ['Terms', extras.policies && extras.policies.terms],
    ].filter(([, text]) => text);
    const facts = [
      extras.gstin ? `GSTIN ${extras.gstin}` : '',
      extras.pricesIncludeGst ? 'Prices include GST.' : '',
    ].filter(Boolean);
    return `<footer class="sf-footer"><div class="sf-wrap">
      <div class="sf-foot-top"><strong class="sf-wordmark">${esc(config.brand.name || data.shop.name)}</strong>${config.footer.note ? `<p class="sf-sub">${esc(config.footer.note)}</p>` : ''}${facts.length ? `<p class="sf-sub">${facts.map(esc).join(' ')}</p>` : ''}</div>
      ${policies.length ? `<div class="sf-policies">${policies.map(([title, text]) => `<details><summary>${title}</summary><p>${esc(text)}</p></details>`).join('')}</div>` : ''}
      <p class="sf-foot-bottom"><button class="sf-link" id="track">Where is my order?</button> · Powered by <a href="/">Stoora</a></p></div></footer>`;
  }

  /** An empty shelf. Sellers see how to fill it (in the editor preview); buyers just see that it is coming. */
  const emptyState = (ctx) => {
    const services = ctx.template === 'services' || ctx.template === 'signaturestudio';
    const what = services ? 'services' : 'products';
    return `<div class="sf-empty"><h3>Coming soon</h3><p class="sf-sub">${
      ctx.preview && !ctx.sample
        ? `You have no ${what} showing yet. Add ${services ? 'a service' : 'a product'} in your dashboard and it appears here.`
        : `New ${what} will appear here soon.`
    }</p></div>`;
  };

  const heroBackground = (config) =>
    config.hero.image
      ? `style="background-image:url('${esc(config.hero.image)}');background-position:${esc(config.hero.focus || '50% 50%')}"`
      : '';
  const heroTitle = (ctx) => esc(ctx.config.hero.title || ctx.config.brand.name || ctx.data.shop.name);
  const heroText = (ctx) => esc(ctx.config.hero.subtitle || ctx.config.brand.tagline || '');

  /* ---------- 1. BOUTIQUE: editorial and premium ---------- */

  function boutique(ctx) {
    const { config, data } = ctx;
    const shown = config.sections;
    const picks = featured(ctx);
    const tiles = collections(data);
    return `
      <header class="sf-top sf-top-center"><div class="sf-wrap">${logoOrName(config, data)}
        <nav class="sf-nav" aria-label="Store"><a href="#sf-shop">Shop</a>${shown.collections && tiles.length ? '<a href="#sf-collections">Collections</a>' : ''}${shown.about && (config.about.text || config.about.image) ? '<a href="#sf-about">About</a>' : ''}<a href="#sf-contact">Contact</a></nav></div></header>
      <section class="sf-hero sf-hero-full ${config.hero.image ? 'has-image' : ''}" ${heroBackground(config)}><div class="sf-hero-shade"></div>
        <div class="sf-wrap sf-hero-copy"><p class="sf-eyebrow">${esc(data.shop.city || 'New season')}</p><h1>${heroTitle(ctx)}</h1><p class="sf-lede">${heroText(ctx)}</p><a class="sf-btn big" href="#sf-shop">${esc(config.hero.cta)}</a></div></section>
      ${
        shown.collections && tiles.length
          ? `<section class="sf-section" id="sf-collections"><div class="sf-wrap"><h2 class="sf-h2">Collections</h2><div class="sf-tiles">${tiles
              .slice(0, 3)
              .map(
                (t) =>
                  `<a class="sf-tile" href="#sf-shop" data-collection="${esc(t.name)}">${t.image ? img(t.image, t.name) : '<span class="sf-tile-fill"></span>'}<span class="sf-tile-label">${esc(t.name)}<small>${t.count} piece${t.count > 1 ? 's' : ''}</small></span></a>`,
              )
              .join('')}</div></div></section>`
          : ''
      }
      ${shown.featured && picks.length ? `<section class="sf-section"><div class="sf-wrap"><h2 class="sf-h2">Featured</h2>${grid(picks, ctx, 'tall')}</div></section>` : ''}
      ${
        shown.newArrivals && data.products.length > 1
          ? `<section class="sf-section sf-tint"><div class="sf-wrap"><h2 class="sf-h2">New arrivals</h2><div class="sf-row">${newest(
              ctx,
            )
              .map((i) => card(i, ctx, 'tall'))
              .join('')}</div></div></section>`
          : ''
      }
      ${shown.bestsellers && bestsellers(ctx).length ? `<section class="sf-section"><div class="sf-wrap"><h2 class="sf-h2">Bestsellers</h2>${grid(bestsellers(ctx), ctx, 'tall')}</div></section>` : ''}
      <section class="sf-section" id="sf-shop"><div class="sf-wrap"><h2 class="sf-h2">The collection</h2>${data.products.length ? grid(data.products, ctx, 'tall', 'sf-grid-3') : emptyState(ctx)}</div></section>
      ${about(ctx)}${reviews(ctx)}${faqs(ctx)}${contact(ctx)}${footer(ctx)}`;
  }

  /* ---------- 2. MINIMAL: the catalogue comes first ---------- */

  function minimal(ctx) {
    const { config, data } = ctx;
    const tiles = collections(data);
    const picks = featured(ctx);
    return `
      <header class="sf-top sf-top-bar"><div class="sf-wrap sf-bar">${logoOrName(config, data)}
        <label class="sf-search"><span class="sf-sr">Search products</span><input type="search" data-search placeholder="Search products" autocomplete="off"></label>
        <a class="sf-link" href="#sf-contact">Contact</a></div>
        ${tiles.length ? `<div class="sf-wrap sf-chips" role="group" aria-label="Categories"><button class="sf-chip on" data-filter="">All</button>${tiles.map((t) => `<button class="sf-chip" data-filter="${esc(t.name)}">${esc(t.name)}</button>`).join('')}</div>` : ''}</header>
      <section class="sf-hero sf-hero-compact"><div class="sf-wrap sf-split"><div class="sf-hero-copy"><h1>${heroTitle(ctx)}</h1><p class="sf-lede">${heroText(ctx)}</p><a class="sf-btn" href="#sf-shop">${esc(config.hero.cta)}</a></div>${config.hero.image ? `<div class="sf-hero-photo">${img(config.hero.image, '', true, config.hero.focus)}</div>` : ''}</div></section>
      ${config.sections.featured && picks.length ? `<section class="sf-section"><div class="sf-wrap"><h2 class="sf-h2">Featured</h2>${grid(picks, ctx, 'square', 'sf-grid-4')}</div></section>` : ''}
      <section class="sf-section" id="sf-shop"><div class="sf-wrap"><h2 class="sf-h2">All products <small data-count>${data.products.length}</small></h2>${data.products.length ? grid(data.products, ctx, 'square', 'sf-grid-4') : emptyState(ctx)}<p class="sf-sub sf-none" hidden>Nothing matches. Try another word or category.</p></div></section>
      ${about(ctx)}${reviews(ctx)}${faqs(ctx)}${contact(ctx)}${footer(ctx)}`;
  }

  /* ---------- 3. STUDIO: warm, personal, image-led ---------- */

  function studio(ctx) {
    const { config, data } = ctx;
    const tiles = collections(data);
    return `
      <header class="sf-top sf-top-left"><div class="sf-wrap sf-bar">${logoOrName(config, data)}<nav class="sf-nav"><a href="#sf-gallery">Work</a>${config.story.text ? '<a href="#sf-story">Story</a>' : ''}${config.process.length ? '<a href="#sf-process">Process</a>' : ''}<a href="#sf-contact">Contact</a></nav></div></header>
      <section class="sf-hero sf-hero-studio"><div class="sf-wrap sf-split">
        <div class="sf-hero-copy"><p class="sf-eyebrow">${esc(config.brand.tagline || data.shop.city || '')}</p><h1>${heroTitle(ctx)}</h1><p class="sf-lede">${heroText(ctx)}</p><a class="sf-btn big" href="#sf-gallery">${esc(config.hero.cta)}</a></div>
        <div class="sf-hero-frame">${config.hero.image ? img(config.hero.image, '', true, config.hero.focus) : `<span class="sf-frame-fill">${initial(config.brand.name || data.shop.name)}</span>`}</div></div></section>
      ${config.story.text ? `<section class="sf-section sf-tint" id="sf-story"><div class="sf-wrap sf-narrow"><h2 class="sf-h2">${esc(config.story.title)}</h2><div class="sf-story">${paragraphs(config.story.text)}</div></div></section>` : ''}
      <section class="sf-section" id="sf-gallery"><div class="sf-wrap"><h2 class="sf-h2">The work</h2>
        ${config.sections.collections && tiles.length ? `<div class="sf-chips">${tiles.map((t) => `<span class="sf-chip" data-collection="${esc(t.name)}">${esc(t.name)}</span>`).join('')}</div>` : ''}
        ${data.products.length ? `<div class="sf-masonry">${data.products.map((i) => card(i, ctx, 'natural')).join('')}</div>` : emptyState(ctx)}</div></section>
      ${config.process.length ? `<section class="sf-section sf-tint" id="sf-process"><div class="sf-wrap"><h2 class="sf-h2">How it is made</h2><ol class="sf-steps">${config.process.map((s, n) => `<li><span class="sf-step-no">${n + 1}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('')}</ol></div></section>` : ''}
      ${about(ctx)}${reviews(ctx, 'Kind words')}${faqs(ctx)}${contact(ctx)}${footer(ctx)}`;
  }

  /* ---------- 4. SERVICES: trust and clarity, no shop shelves ---------- */

  function servicesTemplate(ctx) {
    const { config, data } = ctx;
    const s = config.services;
    const glance = [
      ['Subjects', s.subjects.join(', ')],
      ['Levels', s.levels.join(', ')],
      ['Mode', s.modes.join(', ')],
      ['Sessions', s.sessions],
    ].filter(([, value]) => value);
    return `
      <header class="sf-top sf-top-bar"><div class="sf-wrap sf-bar">${logoOrName(config, data)}<nav class="sf-nav"><a href="#sf-services">Services</a>${config.about.text ? '<a href="#sf-about">About</a>' : ''}${config.faqs.length ? '<a href="#sf-faq">FAQ</a>' : ''}<a href="#sf-contact">Contact</a></nav></div></header>
      <section class="sf-hero sf-hero-services"><div class="sf-wrap sf-split">
        <div class="sf-hero-copy"><h1>${heroTitle(ctx)}</h1><p class="sf-lede">${heroText(ctx)}</p>
          <div class="sf-actions"><a class="sf-btn big" href="#sf-services">${esc(config.hero.cta)}</a>${config.contact.whatsapp ? `<a class="sf-btn big ghost" href="https://wa.me/91${esc(config.contact.whatsapp)}" target="_blank" rel="noopener noreferrer">Ask on WhatsApp</a>` : ''}</div></div>
        ${glance.length ? `<aside class="sf-glance"><h2>At a glance</h2><dl>${glance.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl></aside>` : config.hero.image ? `<div class="sf-hero-photo">${img(config.hero.image, '', true, config.hero.focus)}</div>` : ''}</div></section>
      <section class="sf-section" id="sf-services"><div class="sf-wrap"><h2 class="sf-h2">Services</h2>${data.services.length ? grid(data.services, ctx, 'service', 'sf-grid-3') : emptyState(ctx)}</div></section>
      ${s.credentials.length ? `<section class="sf-section sf-tint"><div class="sf-wrap sf-narrow"><h2 class="sf-h2">Credentials</h2><ul class="sf-checks">${s.credentials.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div></section>` : ''}
      ${about(ctx)}${reviews(ctx, 'What clients say')}${faqs(ctx)}${contact(ctx)}${footer(ctx)}`;
  }

  /* ---------- 5. SIGNATURE: bold brand, editorial rhythm ---------- */

  /** Facts about the shop that are true right now. Nothing here is invented. */
  function trustItems(ctx) {
    const { data, extras = {} } = ctx;
    const items = [];
    if (data.reviewSummary && data.reviewSummary.count)
      items.push(
        `${data.reviewSummary.average.toFixed(1)} ★ from ${data.reviewSummary.count} review${data.reviewSummary.count > 1 ? 's' : ''}`,
      );
    if (data.products.length)
      items.push(`${data.products.length} piece${data.products.length > 1 ? 's' : ''} in store`);
    if (data.shop.city) items.push(`Based in ${data.shop.city}`);
    if (extras.payments && extras.payments.online) items.push('Pay by card, UPI or netbanking');
    else if (extras.payments && extras.payments.upi) items.push('Pay by UPI');
    if (extras.policies && extras.policies.refund) items.push('Refund policy on every order');
    return items;
  }

  function signature(ctx) {
    const { config, data } = ctx;
    const trust = trustItems(ctx);
    const highlights = (
      featured(ctx).length ? featured(ctx) : bestsellers(ctx).length ? bestsellers(ctx) : data.products
    ).slice(0, 3);
    const tiles = collections(data);
    return `
      <header class="sf-top sf-top-bar sf-top-dark"><div class="sf-wrap sf-bar">${logoOrName(config, data)}<nav class="sf-nav"><a href="#sf-shop">Shop</a>${config.story.text ? '<a href="#sf-story">Story</a>' : ''}<a href="#sf-contact">Contact</a></nav></div></header>
      <section class="sf-hero sf-hero-signature"><div class="sf-wrap sf-split">
        <div class="sf-hero-copy"><p class="sf-eyebrow">${esc(config.brand.tagline || data.shop.city || '')}</p><h1 class="sf-giant">${heroTitle(ctx)}</h1><p class="sf-lede">${heroText(ctx)}</p><a class="sf-btn big" href="#sf-shop">${esc(config.hero.cta)}</a></div>
        <div class="sf-hero-photo tall">${config.hero.image ? img(config.hero.image, '', true, config.hero.focus) : `<span class="sf-frame-fill">${initial(config.brand.name || data.shop.name)}</span>`}</div></div></section>
      ${trust.length ? `<div class="sf-trust"><div class="sf-wrap">${trust.map((t) => `<span>${esc(t)}</span>`).join('')}</div></div>` : ''}
      ${highlights.length ? `<section class="sf-section" id="sf-highlights"><div class="sf-wrap"><h2 class="sf-h2">Selected pieces</h2>${highlights.map((item, n) => `<article class="sf-feature ${n % 2 ? 'flip' : ''}">${photo(item, 'big')}<div class="sf-feature-copy"><p class="sf-eyebrow">${String(n + 1).padStart(2, '0')}</p><h3>${esc(item.name)}</h3>${item.desc ? `<p>${esc(item.desc)}</p>` : ''}<p class="sf-price">${rupees(item.price)}</p>${availability(item)}${action(item, ctx)}</div></article>`).join('')}</div></section>` : ''}
      ${config.sections.collections && tiles.length ? `<section class="sf-section sf-tint"><div class="sf-wrap"><h2 class="sf-h2">Collections</h2><ol class="sf-index">${tiles.map((t, n) => `<li><a href="#sf-shop" data-collection="${esc(t.name)}"><span>${String(n + 1).padStart(2, '0')}</span>${esc(t.name)}<small>${t.count}</small></a></li>`).join('')}</ol></div></section>` : ''}
      ${config.story.text ? `<section class="sf-section sf-dark" id="sf-story"><div class="sf-wrap sf-narrow"><h2 class="sf-h2">${esc(config.story.title)}</h2><div class="sf-story">${paragraphs(config.story.text)}</div></div></section>` : ''}
      <section class="sf-section" id="sf-shop"><div class="sf-wrap"><h2 class="sf-h2">Everything</h2>${data.products.length ? grid(data.products, ctx, 'tall', 'sf-grid-3') : emptyState(ctx)}</div></section>
      ${about(ctx)}${reviews(ctx)}${faqs(ctx)}${contact(ctx)}${footer(ctx)}`;
  }

  /* ---------- PREMIUM 1. ATELIER LUXE: refined and editorial ---------- */

  function atelier(ctx) {
    const { config, data } = ctx;
    const tiles = collections(data);
    const lookbook = (featured(ctx).length ? featured(ctx) : data.products).slice(0, 3);
    return `
      <header class="sf-top sf-top-atelier"><div class="sf-wrap">
        <nav class="sf-nav sf-nav-left" aria-label="Store"><a href="#sf-lookbook">Lookbook</a><a href="#sf-shop">Shop</a></nav>${logoOrName(config, data)}
        <nav class="sf-nav sf-nav-right">${config.about.text ? '<a href="#sf-about">Our house</a>' : ''}<a href="#sf-contact">Contact</a></nav></div></header>
      <section class="sf-hero sf-hero-atelier"><div class="sf-wrap sf-atelier-grid">
        <div class="sf-atelier-photo">${config.hero.image ? img(config.hero.image, '', true, config.hero.focus) : `<span class="sf-frame-fill">${initial(config.brand.name || data.shop.name)}</span>`}</div>
        <div class="sf-hero-copy"><p class="sf-eyebrow">${esc(config.brand.tagline || data.shop.city || '')}</p><h1>${heroTitle(ctx)}</h1><p class="sf-lede">${heroText(ctx)}</p>
          <div class="sf-actions"><a class="sf-btn big" href="#sf-shop">${esc(config.hero.cta)}</a>${lookbook.length ? '<a class="sf-btn big ghost" href="#sf-lookbook">View the lookbook</a>' : ''}</div></div></div></section>
      ${
        lookbook.length
          ? `<section class="sf-section" id="sf-lookbook"><div class="sf-wrap"><h2 class="sf-h2 sf-h2-center">The lookbook</h2>
        <div class="sf-lookbook">${lookbook.map((item, n) => `<figure class="sf-look n${n}">${photo(item)}<figcaption><b>${esc(item.name)}</b><span>${rupees(item.price)}</span></figcaption></figure>`).join('')}</div></div></section>`
          : ''
      }
      ${
        config.sections.collections && tiles.length
          ? `<section class="sf-section sf-tint"><div class="sf-wrap"><h2 class="sf-h2 sf-h2-center">Shop by collection</h2><div class="sf-tiles sf-tiles-caption">${tiles
              .slice(0, 3)
              .map(
                (t) =>
                  `<a class="sf-tile" href="#sf-shop" data-collection="${esc(t.name)}"><span class="sf-tile-img">${t.image ? img(t.image, t.name) : '<span class="sf-tile-fill"></span>'}</span><span class="sf-tile-label">${esc(t.name)}<small>${t.count} piece${t.count > 1 ? 's' : ''}</small></span></a>`,
              )
              .join('')}</div></div></section>`
          : ''
      }
      <section class="sf-section" id="sf-shop"><div class="sf-wrap"><h2 class="sf-h2 sf-h2-center">The collection</h2>${data.products.length ? grid(data.products, ctx, 'tall', 'sf-grid-4 sf-quiet') : emptyState(ctx)}</div></section>
      ${config.about.text ? `<section class="sf-section sf-tint" id="sf-about"><div class="sf-wrap sf-narrow sf-center"><p class="sf-eyebrow">${esc(config.about.title)}</p><blockquote class="sf-pull">${esc(config.about.text.split(/\n{2,}/)[0])}</blockquote></div></section>` : ''}
      ${reviews(ctx)}${faqs(ctx)}${contact(ctx)}${footer(ctx)}`;
  }

  /* ---------- PREMIUM 2. HERITAGE CRAFT: warm storytelling ---------- */

  function heritage(ctx) {
    const { config, data } = ctx;
    const tiles = collections(data);
    return `
      <header class="sf-top sf-top-heritage"><div class="sf-wrap sf-bar">${logoOrName(config, data)}<nav class="sf-nav"><a href="#sf-shop">Shop</a>${config.story.text || config.about.text ? '<a href="#sf-maker">The maker</a>' : ''}${config.process.length ? '<a href="#sf-process">How it is made</a>' : ''}<a href="#sf-contact">Contact</a></nav></div><div class="sf-border-line" aria-hidden="true"></div></header>
      <section class="sf-hero sf-hero-heritage"><div class="sf-wrap sf-split">
        <div class="sf-hero-copy"><p class="sf-eyebrow">${esc(config.brand.tagline || (data.shop.city ? `Handmade in ${data.shop.city}` : 'Handmade'))}</p><h1>${heroTitle(ctx)}</h1><p class="sf-lede">${heroText(ctx)}</p><a class="sf-btn big" href="#sf-shop">${esc(config.hero.cta)}</a></div>
        <div class="sf-arch">${config.hero.image ? img(config.hero.image, '', true, config.hero.focus) : `<span class="sf-frame-fill">${initial(config.brand.name || data.shop.name)}</span>`}</div></div></section>
      ${
        config.story.text || config.about.text
          ? `<section class="sf-section sf-tint" id="sf-maker"><div class="sf-wrap sf-split">
        ${config.about.image ? `<div class="sf-about-photo">${img(config.about.image, config.about.title, false, '50% 40%')}</div>` : ''}
        <div class="sf-about-text"><p class="sf-eyebrow">From the maker</p><h2 class="sf-h2">${esc(config.story.text ? config.story.title : config.about.title)}</h2><div class="sf-story">${paragraphs(config.story.text || config.about.text)}</div><p class="sf-sign">${esc(config.brand.name || data.shop.name)}</p></div></div></section>`
          : ''
      }
      ${config.sections.collections && tiles.length ? `<section class="sf-section"><div class="sf-wrap"><h2 class="sf-h2">Collections</h2><div class="sf-hlist">${tiles.map((t) => `<a class="sf-hitem" href="#sf-shop" data-collection="${esc(t.name)}"><span class="sf-hitem-img">${t.image ? img(t.image, t.name) : ''}</span><span><b>${esc(t.name)}</b><small>${t.count} piece${t.count > 1 ? 's' : ''}</small></span></a>`).join('')}</div></div></section>` : ''}
      <section class="sf-section" id="sf-shop"><div class="sf-wrap"><h2 class="sf-h2">The craft</h2>${data.products.length ? grid(data.products, ctx, 'describe', 'sf-grid-3') : emptyState(ctx)}</div></section>
      ${config.process.length ? `<section class="sf-section sf-tint" id="sf-process"><div class="sf-wrap"><h2 class="sf-h2">How it is made</h2><ol class="sf-timeline">${config.process.map((s, n) => `<li><span class="sf-step-no">${n + 1}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('')}</ol></div></section>` : ''}
      ${reviews(ctx, 'Kind words')}${faqs(ctx)}${contact(ctx)}${footer(ctx)}`;
  }

  /* ---------- PREMIUM 3. SIGNATURE STUDIO: a personal brand with a profile column ---------- */

  function signatureStudio(ctx) {
    const { config, data } = ctx;
    const s = config.services;
    const glance = [
      ['Subjects', s.subjects.join(', ')],
      ['Levels', s.levels.join(', ')],
      ['Mode', s.modes.join(', ')],
    ].filter(([, value]) => value);
    const c = config.contact;
    return `
      <div class="sf-ss"><aside class="sf-ss-side"><div class="sf-ss-card">
        ${config.hero.image ? `<div class="sf-ss-photo">${img(config.hero.image, config.brand.name || data.shop.name, true, config.hero.focus)}</div>` : ''}
        <p class="sf-eyebrow">${esc(config.brand.tagline || data.shop.city || '')}</p><h1>${heroTitle(ctx)}</h1><p class="sf-sub">${heroText(ctx)}</p>
        ${glance.length ? `<dl class="sf-ss-glance">${glance.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}
        <div class="sf-actions"><a class="sf-btn" href="#sf-services">${esc(config.hero.cta)}</a>${c.whatsapp ? `<a class="sf-btn ghost" href="https://wa.me/91${esc(c.whatsapp)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : ''}</div>
        <nav class="sf-ss-nav"><a href="#sf-services">Services</a>${config.about.text ? '<a href="#sf-about">About</a>' : ''}${s.credentials.length ? '<a href="#sf-creds">Credentials</a>' : ''}${config.faqs.length ? '<a href="#sf-faq">FAQ</a>' : ''}<a href="#sf-contact">Contact</a></nav></div></aside>
      <main class="sf-ss-main">
        <section class="sf-ss-block" id="sf-services"><h2 class="sf-h2">Work with me</h2>${data.services.length ? `<div class="sf-rows">${data.services.map((item) => `<article class="sf-row-item" data-name="${esc(item.name.toLowerCase())}"><div class="sf-row-copy"><h3>${esc(item.name)}</h3><p class="sf-sub">${esc([item.type, item.duration, item.where, item.next].filter(Boolean).join(' · '))}</p></div><div class="sf-row-price"><b>From ${rupees(item.price)}</b>${action(item, ctx)}</div></article>`).join('')}</div>` : emptyState(ctx)}${s.sessions ? `<p class="sf-sub" style="margin-top:14px"><b>Sessions:</b> ${esc(s.sessions)}</p>` : ''}</section>
        ${about(ctx, { split: false }) ? `<section class="sf-ss-block" id="sf-about"><h2 class="sf-h2">${esc(config.about.title)}</h2>${paragraphs(config.about.text)}</section>` : ''}
        ${s.credentials.length ? `<section class="sf-ss-block" id="sf-creds"><h2 class="sf-h2">Credentials</h2><ul class="sf-checks">${s.credentials.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>` : ''}
        ${(data.reviews || []).length && config.sections.reviews ? `<section class="sf-ss-block"><h2 class="sf-h2">What clients say</h2><div class="sf-reviews">${data.reviews.map((r) => `<blockquote class="sf-review"><span class="sf-stars">${stars(r.rating)}</span><p>${esc(r.comment)}</p><footer>${esc(r.who)}</footer></blockquote>`).join('')}</div></section>` : ''}
        ${config.sections.faqs && config.faqs.length ? `<section class="sf-ss-block" id="sf-faq"><h2 class="sf-h2">Questions and answers</h2>${config.faqs.map((f) => `<details class="sf-faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section>` : ''}
        ${contact(ctx)}</main></div>${footer(ctx)}`;
  }

  /* ---------- public functions ---------- */

  const TEMPLATE_FUNCTIONS = {
    boutique,
    minimal,
    studio,
    services: servicesTemplate,
    signature,
    atelier,
    heritage,
    signaturestudio: signatureStudio,
  };

  function render(templateId, ctx) {
    const template = shared.templateById(templateId);
    const full = { ...ctx, template: template.id, cart: ctx.cart || {} };
    wishNow = Array.isArray(ctx.wish) ? ctx.wish : null;
    return `<div class="sf sf-${template.id}" style="${themeStyle(ctx.config)}" ${ctx.preview ? 'data-preview="1"' : ''}>${TEMPLATE_FUNCTIONS[template.id](full)}</div>`;
  }

  /** Search box and category chips (Minimal) and collection links: show or hide cards, no reload. */
  function bind(root) {
    root.addEventListener(
      'error',
      (event) => {
        const image = event.target;
        if (!image || image.tagName !== 'IMG') return;
        const holder = image.closest('.sf-photo, .sf-tile-img, .sf-hitem-img, .sf-about-photo, .sf-atelier-photo');
        if (holder && !holder.querySelector('.sf-initial')) {
          image.remove();
          holder.insertAdjacentHTML('beforeend', '<span class="sf-initial" aria-hidden="true">·</span>');
        } else image.remove();
      },
      true,
    );
    const input = root.querySelector('[data-search]');
    const cards = [...root.querySelectorAll('#sf-shop .sf-card')];
    if (!cards.length) return;
    let category = '';
    const apply = () => {
      const term = input ? input.value.trim().toLowerCase() : '';
      let visible = 0;
      cards.forEach((cardElement) => {
        const match =
          (!category || cardElement.dataset.cat === category) && (!term || cardElement.dataset.name.includes(term));
        cardElement.hidden = !match;
        if (match) visible += 1;
      });
      const none = root.querySelector('.sf-none');
      if (none) none.hidden = visible > 0;
      const count = root.querySelector('[data-count]');
      if (count) count.textContent = String(visible);
    };
    if (input) input.addEventListener('input', apply);
    root.querySelectorAll('[data-filter]').forEach((chip) =>
      chip.addEventListener('click', () => {
        category = chip.dataset.filter;
        root.querySelectorAll('[data-filter]').forEach((other) => other.classList.toggle('on', other === chip));
        apply();
      }),
    );
    root.querySelectorAll('[data-collection]').forEach((link) =>
      link.addEventListener('click', () => {
        category = link.dataset.collection;
        apply();
      }),
    );
  }

  window.StoreTemplates = { render, bind };
})();
