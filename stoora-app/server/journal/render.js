/**
 * The Stoora Journal pages, rendered on the server so that every page has its own title, description,
 * canonical address and article data, and works before any script loads.
 *
 *   /journal            the Journal home (featured story, topics, all stories)
 *   /journal/<slug>     one article
 *
 * Content comes from ./articles.js. The look comes from /css/main.css (Brand Kit v2 tokens) and /css/journal.css.
 */

const { TOPICS, PHOTOS, AUTHOR, ARTICLES } = require('./articles');

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const SITE = 'Stoora';
const SORTED = [...ARTICLES].sort((a, b) => b.published.localeCompare(a.published));
/** The stories on the Journal home carousel, in the order set in articles.js, and the Editor's Pick. */
const CAROUSEL = ARTICLES.filter((article) => article.carousel).sort((a, b) => a.carousel - b.carousel);
const PICK = ARTICLES.find((article) => article.pick) || SORTED[0];
const LATEST_FIRST = 6; // stories shown before "View all"
const topicOf = (id) => TOPICS.find((topic) => topic.id === id) || TOPICS[0];
const articleBySlug = (slug) => ARTICLES.find((article) => article.slug === slug);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatDate = (iso) => {
  const [year, month, day] = iso.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
};

/** Everything a visitor might search for in a story (also copied onto each card for the instant filter). */
const searchText = (article) =>
  [article.title, article.excerpt, article.summary, topicOf(article.topic).name, article.slug.replace(/-/g, ' ')]
    .join(' ')
    .toLowerCase();
const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const icon = (name, size = '') => `<span class="ms ${size}" aria-hidden="true">${name}</span>`;

/* ---------- pictures ---------- */

/** A photo with a small version for cards and a large one for wide places. Cropped with object-fit, never stretched. */
function picture(key, { sizes, eager = false, soon = false, alt } = {}) {
  const text = alt || PHOTOS[key] || '';
  return `<img src="/assets/journal/${key}-720.jpg" srcset="/assets/journal/${key}-720.jpg 720w, /assets/journal/${key}-1400.jpg 1400w" sizes="${sizes}" alt="${esc(text)}" ${eager ? 'fetchpriority="high"' : soon ? '' : 'loading="lazy"'} decoding="async">`;
}
const CARD_SIZES = '(min-width: 1000px) 400px, (min-width: 640px) 45vw, 92vw';

/* ---------- the page frame ---------- */

const FONTS =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Fraunces:opsz,wght@9..144,900&family=Lexend:wght@400;500;600;700&display=swap';
const ICONS =
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400,0,0&icon_names=arrow_back,arrow_forward,chat,check,chevron_right,close,content_copy,forum,lightbulb,link,menu,menu_book,palette,pause,play_arrow,schedule,search,storefront,trending_up&display=block';

function header() {
  const link = (href, label, current) => `<a href="${href}"${current ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<header class="lnav solid" id="lnav"><div class="wrap in">
    <a class="logo" href="/" aria-label="stoora.in home"><span class="appicon" aria-hidden="true">S</span><span class="wordmark">stoora<i>.in</i></span></a>
    <nav class="links" aria-label="Main">${link('/#l-about', 'About')}${link('/#l-how', 'How it works')}${link('/#l-for', 'Who it’s for')}${link('/#l-features', 'Features')}${link('/journal', 'Journal', true)}</nav>
    <div class="acts"><a class="btn quiet sm login" href="/#login">Log in</a><a class="btn primary sm cta" href="/#signup">Get started<span class="arr" aria-hidden="true">${icon('arrow_forward', 'xs')}</span></a></div>
    <button class="menu-btn" type="button" data-menu aria-label="Open menu" aria-expanded="false" aria-controls="mnav"><span></span><span></span></button></div></header>
  <div class="mnav" id="mnav" role="dialog" aria-modal="true" aria-label="Menu" hidden>
    <div class="hd"><a class="logo" href="/" style="display:flex;align-items:center;gap:var(--s2);text-decoration:none"><span class="appicon" aria-hidden="true">S</span><span class="wordmark">stoora<i>.in</i></span></a><button class="menu-btn" type="button" data-menu-close aria-label="Close menu" style="margin-left:auto">${icon('close')}</button></div>
    <nav aria-label="Main">${[
      ['/#l-about', 'About'],
      ['/#l-how', 'How it works'],
      ['/#l-for', 'Who it’s for'],
      ['/#l-features', 'Features'],
      ['/journal', 'Journal'],
    ]
      .map(
        ([href, label], n) =>
          `<a href="${href}" style="--i:${n}"${label === 'Journal' ? ' aria-current="page"' : ''}><span>${label}</span>${icon('arrow_forward')}</a>`,
      )
      .join('')}</nav>
    <div class="ft"><a class="btn primary full" href="/#signup">Get started</a><a class="btn line full" href="/#login">Log in</a></div></div>`;
}

function footer() {
  return `<footer class="sfoot"><div class="sf-card"><div class="sf-g">
  <div class="sf-brand"><a class="wordmark sf-logo" href="/" aria-label="Stoora.in home">stoora<i>.in</i></a>
  <p>Work for yourself. A complete online business for India’s creators, coaches and micro-sellers.</p>
  <a class="sf-cta" href="/#signup">Create my store <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
  <span class="sf-soon">iOS &amp; Android apps — coming soon</span></div>
  <div class="sf-col"><h4>Product</h4><ul>
    <li><a href="/#l-how">How it works</a></li>
    <li><a href="/s/meera">Example storefront</a></li>
    <li><a href="/dashboard">Seller dashboard</a></li>
    <li><a href="/#signup">Bring your catalogue</a></li></ul></div>
  <div class="sf-col"><h4>Sell</h4><ul>
    <li><a href="/#signup">Sell crafts and products</a></li>
    <li><a href="/#signup">Sell courses and classes</a></li>
    <li><a href="/#signup">Sell mentoring and services</a></li>
    <li><a href="/#signup">Create my store</a></li></ul></div>
  <div class="sf-col"><h4>Company</h4><ul>
    <li><a href="/#login">Log in</a></li>
    <li><a href="/privacy">Privacy</a></li>
    <li><a href="/terms">Terms</a></li>
    <li><a href="mailto:hello@stoora.in">hello@stoora.in</a></li></ul></div>
 </div><div class="sf-bt">© 2026 Stoora.in · Made in India</div></div></footer>`;
}

/** The complete HTML document. `origin` is the site's public address, used for canonical and share links. */
function page({ title, description, path, origin, image, type = 'website', body, jsonLd, noindex = false }) {
  const url = origin + path;
  const ogImage = image ? origin + image : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#FFFFFF">
${noindex ? '<meta name="robots" content="noindex">' : ''}<link rel="canonical" href="${esc(url)}">
<meta property="og:site_name" content="${SITE}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">\n<meta name="twitter:card" content="summary_large_image">` : '<meta name="twitter:card" content="summary">'}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="${ICONS}">
<link rel="stylesheet" href="/css/main.css">
<link rel="stylesheet" href="/css/journal.css">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body class="mode-public jr">
<a class="jr-skip" href="#main">Skip to the content</a>
${header()}
<main id="main" class="jr-main">${body}</main>
${footer()}
<script src="/js/site/journal.js" defer></script>
</body>
</html>`;
}

/* ---------- shared pieces ---------- */

const tag = (topic) => `<span class="jr-tag t-${topic.id}">${icon(topic.icon, 'xs')}${esc(topic.name)}</span>`;
const readTime = (article) => `${article.minutes} min read`;

function card(article, { hidden = false } = {}) {
  const topic = topicOf(article.topic);
  const url = `/journal/${article.slug}`;
  return `<article class="jr-card"${hidden ? ' hidden' : ''} data-topic="${topic.id}" data-slug="${article.slug}" data-text="${esc(searchText(article))}">
    <div class="jr-card-img" aria-hidden="true">${picture(article.photo, { sizes: CARD_SIZES })}</div>
    <div class="jr-meta">${tag(topic)}<span>${formatDate(article.published)} · ${readTime(article)}</span></div>
    <h3><a href="${url}">${esc(article.title)}</a></h3>
    <p>${esc(article.excerpt)}</p>
    <span class="jr-more">Read story${icon('arrow_forward', 'xs')}</span></article>`;
}

function ctaBand() {
  return `<section class="jr-cta"><div class="wrap"><div class="jr-cta-in">
    <div><span class="eyebrow">Ready when you are</span><h2>Open your shop in a few minutes.</h2><p>One link for every order, every chat and every rupee.</p></div>
    <a class="btn primary" href="/#signup">Get started${icon('arrow_forward', 'xs')}</a></div></div></section>`;
}

/* ---------- Journal home ---------- */

function matches(article, topic, query) {
  return (!topic || article.topic === topic) && (!query || searchText(article).includes(query));
}

/** One card on the carousel ring. Without JavaScript the ring is a plain row of cards that scrolls sideways. */
function orbitCard(article, n, total) {
  const topic = topicOf(article.topic);
  return `<li class="jr-ocard" data-i="${n}" role="group" aria-roledescription="slide" aria-label="Story ${n + 1} of ${total}">
    <a class="jr-ocard-link" href="/journal/${article.slug}">
      <span class="jr-ocard-img">${picture(article.photo, { sizes: '(min-width: 900px) 360px, 74vw', eager: n === 0, soon: true })}</span>
      <span class="jr-ocard-body">
        ${tag(topic)}
        <h3 class="jr-ocard-title">${esc(article.title)}</h3>
        <span class="jr-ocard-ex">${esc(article.excerpt)}</span>
        <span class="jr-ocard-foot"><span><span class="jr-d">${formatDate(article.published)} · </span>${readTime(article)}</span><span class="jr-more">Read story${icon('arrow_forward', 'xs')}</span></span>
      </span></a></li>`;
}

function renderIndex({ origin, topic = '', q = '' }) {
  const activeTopic = TOPICS.some((item) => item.id === topic) ? topic : '';
  const query = String(q || '')
    .trim()
    .toLowerCase()
    .slice(0, 80);
  const filtering = Boolean(activeTopic || query);
  const shown = SORTED.filter((article) => matches(article, activeTopic, query));
  const counts = Object.fromEntries(
    TOPICS.map((item) => [item.id, ARTICLES.filter((article) => article.topic === item.id).length]),
  );
  const pickTopic = topicOf(PICK.topic);
  const gridTotal = SORTED.length - (filtering ? 0 : 1);

  const body = `
  <section class="jr-mast"><div class="wrap jr-mast-row">
    <h1>Stories, ideas &amp; inspiration</h1>
    <p>Discover ideas, thoughtful stories and practical insights for building a business that stands out.</p></div></section>

  <section class="jr-orbit-wrap" aria-label="Featured stories">
    <div class="jr-orbit" data-orbit role="region" aria-roledescription="carousel" aria-label="Featured stories" tabindex="0">
      <ol class="jr-orbit-list">${CAROUSEL.map((article, n) => orbitCard(article, n, CAROUSEL.length)).join('')}</ol>
    </div>
    <p class="sr" data-orbit-live aria-live="off"></p>
  </section>

  <section class="jr-topics" aria-labelledby="jr-topics-h"><div class="wrap">
    <div class="jr-sec-head"><div><span class="jr-kicker">Explore</span><h2 id="jr-topics-h">By topic</h2></div>
      <form class="jr-search" role="search" action="/journal" method="get" data-search-form>
        ${icon('search')}<label class="sr" for="jr-q">Search the Journal</label>
        <input id="jr-q" name="q" type="search" value="${esc(q)}" placeholder="Search stories" autocomplete="off" maxlength="80">
        ${activeTopic ? `<input type="hidden" name="topic" value="${activeTopic}">` : ''}<button class="btn primary sm" type="submit">Search</button></form></div>
    <nav class="jr-topic-grid" aria-label="Topics" data-pills>
      ${TOPICS.map((item) => `<a class="jr-topic" href="/journal?topic=${item.id}" data-topic="${item.id}"${item.id === activeTopic ? ' aria-current="true"' : ''}><span class="jr-topic-ic t-${item.id}">${icon(item.icon)}</span><b>${esc(item.name)}</b><small>${esc(item.blurb)}</small><span class="jr-topic-n">${counts[item.id]} ${counts[item.id] === 1 ? 'story' : 'stories'}</span></a>`).join('')}
    </nav>
    <p class="jr-allrow"><a class="jr-allstories" href="/journal" data-reset${filtering ? '' : ' hidden'}>${icon('arrow_back', 'xs')}Show all stories</a></p>
  </div></section>

  <section class="jr-list" aria-labelledby="jr-list-h"><div class="wrap">
    <div class="jr-list-head"><h2 class="l-h2" id="jr-list-h" data-list-title>${filtering ? 'Stories' : 'Latest stories'}</h2>
      <p class="jr-count" role="status" aria-live="polite" data-count>${esc(countText(filtering ? shown.length : gridTotal, activeTopic, query))}</p></div>
    <div class="jr-grid" data-grid>${SORTED.map((article) => card(article, { hidden: !matches(article, activeTopic, query) || (!filtering && article === PICK) })).join('')}</div>
    <p class="jr-morerow"><button class="btn line" type="button" data-more hidden>View all ${gridTotal} stories</button></p>
    <div class="jr-empty" data-empty${shown.length ? ' hidden' : ''}><h3>No stories match that yet.</h3><p>Try another word, or look at everything we have.</p><a class="btn line" href="/journal" data-reset>Show all stories</a></div>
  </div></section>

  <section class="jr-pick" data-pick${filtering ? ' hidden' : ''} aria-labelledby="jr-pick-h"><div class="wrap"><div class="jr-pick-in">
    <a class="jr-pick-img" href="/journal/${PICK.slug}" tabindex="-1" aria-hidden="true">${picture(PICK.photo, { sizes: '(min-width: 900px) 520px, 92vw' })}</a>
    <div class="jr-pick-copy">
      <span class="jr-kicker">Editor’s pick</span>
      <h2 id="jr-pick-h"><a href="/journal/${PICK.slug}">${esc(PICK.title)}</a></h2>
      <p class="jr-pick-why">${esc(PICK.pick)}</p>
      <p class="jr-pick-short"><b>The short answer</b>${esc(PICK.summary)}</p>
      <div class="jr-pick-foot"><a class="btn primary" href="/journal/${PICK.slug}">Read story${icon('arrow_forward', 'xs')}</a><span class="jr-meta">${tag(pickTopic)}<span>${readTime(PICK)}</span></span></div>
    </div></div></div></section>

  <section class="jr-close" aria-labelledby="jr-close-h"><div class="wrap"><div class="jr-close-in">
    <div class="jr-close-circles" aria-hidden="true">${['suit-floral', 'loom', 'bowls'].map((key) => `<span><img src="/assets/journal/${key}-720.jpg" alt="" loading="lazy" decoding="async"></span>`).join('')}</div>
    <div class="jr-close-copy"><h2 id="jr-close-h">From reading to selling.</h2>
      <p>Stoora gives you a shop page, your orders and your payments in one place, so what you learn here goes straight into your own storefront.</p>
      <div class="jr-close-actions"><a class="btn primary" href="/#signup">Open your shop${icon('arrow_forward', 'xs')}</a><a class="jr-textlink" href="/#l-how">See how it works</a></div></div>
  </div></div></section>`;

  return page({
    title: 'The Stoora Journal: guides for small sellers in India',
    description:
      'Practical guides on product photos, pricing, packing, WhatsApp orders and customer care, written for small sellers in India.',
    path: '/journal',
    origin,
    image: `/assets/journal/${CAROUSEL[0].photo}-1400.jpg`,
    body,
    noindex: filtering,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'The Stoora Journal',
      url: origin + '/journal',
      publisher: { '@type': 'Organization', name: SITE },
      blogPost: SORTED.map((article) => ({
        '@type': 'BlogPosting',
        headline: article.title,
        url: `${origin}/journal/${article.slug}`,
        datePublished: article.published,
      })),
    },
  });
}

function countText(total, topic, query) {
  const label = topic ? ` in ${topicOf(topic).name}` : '';
  const search = query ? ` matching “${query}”` : '';
  return `${total} ${total === 1 ? 'story' : 'stories'}${label}${search}`;
}

/* ---------- one article ---------- */

function renderBlock(block) {
  if (block.h2) return `<h2 id="${slugify(block.h2)}">${esc(block.h2)}</h2>`;
  if (block.h3) return `<h3>${esc(block.h3)}</h3>`;
  if (block.p) return `<p>${esc(block.p)}</p>`;
  if (block.ul) return `<ul>${block.ul.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
  if (block.ol) return `<ol class="jr-steps">${block.ol.map((item) => `<li>${esc(item)}</li>`).join('')}</ol>`;
  if (block.callout)
    return `<aside class="jr-callout">${icon('lightbulb')}<div><b>${esc(block.callout[0])}</b><p>${esc(block.callout[1])}</p></div></aside>`;
  if (block.image)
    return `<figure class="jr-fig">${picture(block.image, { sizes: '(min-width: 900px) 700px, 92vw' })}${block.caption ? `<figcaption>${esc(block.caption)}</figcaption>` : ''}</figure>`;
  if (block.table)
    return `<div class="jr-table"><table><thead><tr>${block.table.head.map((cell) => `<th scope="col">${esc(cell)}</th>`).join('')}</tr></thead><tbody>${block.table.rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  return '';
}

function renderArticle({ origin, slug }) {
  const article = articleBySlug(slug);
  if (!article) return null;
  const topic = topicOf(article.topic);
  const url = `${origin}/journal/${article.slug}`;
  const headings = article.body.filter((block) => block.h2).map((block) => block.h2);
  const related = [
    ...SORTED.filter((item) => item !== article && item.topic === article.topic),
    ...SORTED.filter((item) => item !== article && item.topic !== article.topic),
  ].slice(0, 3);
  const share = `https://wa.me/?text=${encodeURIComponent(`${article.title} ${url}`)}`;

  const body = `
  <div class="jr-article-top"><div class="wrap jr-narrow">
    <nav class="jr-crumbs" aria-label="Breadcrumb"><a href="/journal">Journal</a>${icon('chevron_right', 'xs')}<a href="/journal?topic=${topic.id}">${esc(topic.name)}</a>${icon('chevron_right', 'xs')}<span aria-current="page">${esc(article.title)}</span></nav>
    <div class="jr-meta jr-meta-lg">${tag(topic)}<span>${icon('schedule', 'xs')}${readTime(article)}</span></div>
    <h1>${esc(article.title)}</h1>
    <p class="lede">${esc(article.excerpt)}</p>
    <div class="jr-byline"><span class="appicon" aria-hidden="true">S</span><span class="who"><b>${esc(AUTHOR)}</b><span>Published ${formatDate(article.published)}</span></span>
      <span class="jr-share"><a class="btn line sm" href="${share}" target="_blank" rel="noopener noreferrer">${icon('chat', 'xs')}Share on WhatsApp</a><button class="btn line sm" type="button" data-copy="${esc(url)}">${icon('link', 'xs')}<span data-copy-label>Copy link</span></button></span></div>
  </div></div>
  <div class="wrap jr-narrow-wide"><figure class="jr-cover">${picture(article.photo, { sizes: '(min-width: 1000px) 1100px, 100vw', eager: true })}</figure></div>
  <div class="wrap jr-article-grid">
    ${headings.length > 2 ? `<aside class="jr-toc" aria-label="In this story"><details open><summary>In this story</summary><ol>${headings.map((text) => `<li><a href="#${slugify(text)}">${esc(text)}</a></li>`).join('')}</ol></details></aside>` : ''}
    <article class="jr-body">
      <section class="jr-short" aria-label="The short answer"><span class="k">${icon('lightbulb', 'xs')}The short answer</span><p>${esc(article.summary)}</p></section>
      ${article.body.map(renderBlock).join('\n')}
      ${article.faq.length ? `<h2 id="questions">Questions sellers ask</h2><div class="jr-faq">${article.faq.map((item) => `<details><summary>${esc(item.q)}</summary><p>${esc(item.a)}</p></details>`).join('')}</div>` : ''}
      <p class="jr-note">This is general guidance for small sellers. Check prices, rules and costs for your own business before you act on it.</p>
      <p><a class="jr-back" href="/journal">${icon('arrow_back', 'xs')}Back to the Journal</a></p>
    </article>
  </div>
  <section class="jr-list jr-related" aria-labelledby="jr-rel-h"><div class="wrap"><div class="jr-list-head"><h2 class="l-h2" id="jr-rel-h">Keep reading</h2><a class="jr-all" href="/journal">All stories${icon('arrow_forward', 'xs')}</a></div>
    <div class="jr-grid">${related.map((item) => card(item)).join('')}</div></div></section>
  ${ctaBand()}`;

  return page({
    title: `${article.title} · Stoora Journal`,
    description: article.excerpt,
    path: `/journal/${article.slug}`,
    origin,
    image: `/assets/journal/${article.photo}-1400.jpg`,
    type: 'article',
    body,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.excerpt,
      image: `${origin}/assets/journal/${article.photo}-1400.jpg`,
      datePublished: article.published,
      author: { '@type': 'Organization', name: AUTHOR },
      publisher: { '@type': 'Organization', name: SITE },
      mainEntityOfPage: url,
    },
  });
}

function renderNotFound({ origin }) {
  return page({
    title: 'Story not found · Stoora Journal',
    description: 'That Journal story could not be found.',
    path: '/journal',
    origin,
    noindex: true,
    body: `<section class="jr-hero"><div class="wrap jr-narrow"><span class="eyebrow">404</span><h1>We could not find that story.</h1><p class="lede">It may have moved. The Journal has everything we have published.</p><p><a class="btn primary" href="/journal">Go to the Journal${icon('arrow_forward', 'xs')}</a></p></div></section>`,
  });
}

function renderSitemap({ origin }) {
  const urls = ['/', '/journal', ...SORTED.map((article) => `/journal/${article.slug}`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((path) => `<url><loc>${esc(origin + path)}</loc></url>`).join('\n')}\n</urlset>\n`;
}

module.exports = { renderIndex, renderArticle, renderNotFound, renderSitemap };
