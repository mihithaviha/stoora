// Stories written in /admin/blogs, and how they join the built-in stories in articles.ts.
//   - a post with the slug of a built-in story and builtin = true is an EDIT of that story (status 'draft' hides it)
//   - any other published post is a new story
// Live mode keeps posts in Supabase (table blog_posts); demo mode keeps them in this browser (localStorage).
import { ARTICLES, TOPICS, type Article, type Block } from './articles';

/** 'removed' is a built-in story the team deleted for good: it stays off the site and out of the admin list. */
export type PostStatus = 'draft' | 'published' | 'removed';
export interface BlogPost {
  id: string; slug: string; title: string; excerpt: string; summary: string; topic: string; /** A photo key from the Journal library, or the address of an uploaded picture. */ photo: string;
  published: string; minutes: number; body: Block[]; faq: { q: string; a: string }[];
  carousel?: number | null; pick?: string | null; status: PostStatus; builtin: boolean; updatedAt?: string;
}

export const LIMITS = { title: 160, excerpt: 400, summary: 800, slug: 90, pick: 300, blocks: 120, items: 30, faq: 20, text: 4000 };
export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Addresses the admin screens use themselves. */
export const RESERVED_SLUGS = ['new', 'carousel'];
export const BUILTIN_SLUGS = new Set(ARTICLES.map((a) => a.slug));
export const builtinBySlug = (slug: string) => ARTICLES.find((a) => a.slug === slug);

/* ---------- conversions ---------- */

export const postToArticle = (p: BlogPost): Article => ({
  slug: p.slug, title: p.title, excerpt: p.excerpt, topic: p.topic, photo: p.photo, published: p.published, minutes: p.minutes, summary: p.summary,
  body: p.body, faq: p.faq, ...(p.carousel != null ? { carousel: p.carousel } : {}), ...(p.pick ? { pick: p.pick } : {}),
});

/** A built-in story as an editable post (the starting point for editing it). */
export const articleToPost = (a: Article): BlogPost => ({
  id: '', slug: a.slug, title: a.title, excerpt: a.excerpt, summary: a.summary, topic: a.topic, photo: a.photo, published: a.published, minutes: a.minutes,
  body: JSON.parse(JSON.stringify(a.body)), faq: JSON.parse(JSON.stringify(a.faq)), carousel: a.carousel ?? null, pick: a.pick ?? null, status: 'published', builtin: true,
});

export const blankPost = (): BlogPost => ({
  id: '', slug: '', title: '', excerpt: '', summary: '', topic: TOPICS[0].id, photo: '', published: new Date().toISOString().slice(0, 10), minutes: 3,
  body: [{ p: '' }], faq: [], carousel: null, pick: null, status: 'draft', builtin: false,
});

/** The stories visitors see: the built-in ones, with admin edits applied, hidden ones removed and new published ones added. */
export function mergeArticles(posts: BlogPost[], hiddenSlugs: string[] = []): Article[] {
  const edits = new Map(posts.filter((p) => p.builtin).map((p) => [p.slug, p]));
  const hidden = new Set([...hiddenSlugs, ...posts.filter((p) => p.builtin && p.status !== 'published').map((p) => p.slug)]);
  const out: Article[] = [];
  for (const a of ARTICLES) {
    const edit = edits.get(a.slug);
    if (hidden.has(a.slug)) continue;
    out.push(edit && edit.status === 'published' ? postToArticle(edit) : a);
  }
  for (const p of posts) if (!p.builtin && p.status === 'published' && !BUILTIN_SLUGS.has(p.slug)) out.push(postToArticle(p));
  return out;
}

/** One place in the carousel: the story it opens, a picture, and the few words written for the card. */
export interface CarouselItem { slug: string; photo?: string; /** A short headline for the card (optional). */ title?: string; /** The short description under it. */ text?: string }
export const CAROUSEL_SIZE = 6;
/** The card is small, so its words are few: this keeps the moving carousel tidy whatever is written. */
export const RING = { titleWords: 8, titleChars: 60, textWords: 15, textChars: 110, minTextWords: 3 };
export const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
/** The first `n` words of a text, with an ellipsis when it was cut. */
export const clipWords = (text: string, n: number) => { const w = text.trim().split(/\s+/).filter(Boolean); return w.length <= n ? w.join(' ') : w.slice(0, n).join(' ').replace(/[,;:.\-–—]+$/, '') + '…'; };

/** A carousel list from stored data (anything unexpected is dropped). */
export function carouselFrom(raw: unknown): CarouselItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: CarouselItem[] = [];
  for (const x of raw) {
    const slug = typeof x?.slug === 'string' ? x.slug : '';
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const title = typeof x.title === 'string' ? x.title.trim().slice(0, RING.titleChars) : '';
    const text = typeof x.text === 'string' ? x.text.trim().slice(0, RING.textChars) : '';
    out.push({ slug, ...(typeof x.photo === 'string' && x.photo ? { photo: x.photo } : {}), ...(title ? { title } : {}), ...(text ? { text } : {}) });
  }
  return out.slice(0, 12);
}

/**
 * Everything the Blogs pages need from a list of stories. The carousel is the stories the team chose (in their order, with the picture
 * they chose for each); until they choose, it is the stories marked in the code, or the newest five. Every other story goes in the list under it.
 */
export function buildJournal(articles: Article[], chosen?: CarouselItem[] | null) {
  const sorted = [...articles].sort((a, b) => b.published.localeCompare(a.published) || a.title.localeCompare(b.title));
  // a carousel card shows only a few words: what the team wrote for it, or the start of the story's own teaser
  const card = (a: Article, item?: CarouselItem): Article => ({ ...a, ...(item?.photo ? { photo: item.photo } : {}), title: item?.title || clipWords(a.title, 14), excerpt: item?.text || clipWords(a.excerpt, RING.textWords) });
  const fromTeam: Article[] = (chosen ?? []).flatMap((item) => { const a = articles.find((x) => x.slug === item.slug); return a ? [card(a, item)] : []; });
  const marked = articles.filter((a) => a.carousel != null).sort((a, b) => (a.carousel ?? 0) - (b.carousel ?? 0));
  const carousel = fromTeam.length ? fromTeam : (marked.length ? marked : sorted.slice(0, 5)).map((a) => card(a));
  const picks = sorted.filter((a) => a.pick);
  const pick: Article | undefined = picks[0] ?? sorted[0];
  const counts: Record<string, number> = Object.fromEntries(TOPICS.map((t) => [t.id, articles.filter((a) => a.topic === t.id).length]));
  return { articles, sorted, carousel, ringSlugs: new Set(carousel.map((a) => a.slug)), pick, counts };
}
export type Journal = ReturnType<typeof buildJournal>;

/** Stories to read next: the same topic first, then the rest. */
export const relatedIn = (list: Article[], article: Article): Article[] => {
  const others = [...list].sort((a, b) => b.published.localeCompare(a.published)).filter((a) => a.slug !== article.slug);
  return [...others.filter((a) => a.topic === article.topic), ...others.filter((a) => a.topic !== article.topic)].slice(0, 3);
};

/* ---------- checking ---------- */

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
export function blockText(b: Block): string {
  return [b.p, b.h2, b.h3, ...(b.ul ?? []), ...(b.ol ?? []), ...(b.callout ?? []), b.caption, ...(b.table ? [...b.table.head, ...b.table.rows.flat()] : [])].filter(Boolean).join(' ');
}
/** About 200 words a minute, never less than one. */
export const estimateMinutes = (body: Block[], summary = '') => Math.max(1, Math.round((words(summary) + body.reduce((n, b) => n + words(blockText(b)), 0)) / 200));

export const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, LIMITS.slug).replace(/-+$/, '');

/** An empty block (no words) is dropped when saving. */
export const blockIsEmpty = (b: Block) => !(b.image || b.table) && !blockText(b).trim();

export const cleanBody = (body: Block[]): Block[] => body.filter((b) => !blockIsEmpty(b)).map((b) => {
  if (b.ul) return { ul: b.ul.map((x) => x.trim()).filter(Boolean) };
  if (b.ol) return { ol: b.ol.map((x) => x.trim()).filter(Boolean) };
  if (b.callout) return { callout: [b.callout[0].trim(), b.callout[1].trim()] as [string, string] };
  if (b.image) return { image: b.image, ...(b.caption?.trim() ? { caption: b.caption.trim() } : {}) };
  if (b.table) return b;
  if (b.h2) return { h2: b.h2.trim() };
  if (b.h3) return { h3: b.h3.trim() };
  return { p: (b.p ?? '').trim() };
}).filter((b) => !blockIsEmpty(b));

export const isUrlPhoto = (photo: string) => /^(https?:\/\/|\/|data:image\/)/.test(photo);

/** What stops a post from being saved (as a draft) or published. */
export function problemsOf(p: BlogPost, existingSlugs: string[], publishing: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  if (p.title.trim().length < 5) e.title = 'Give the story a title of at least 5 letters.';
  if (p.title.length > LIMITS.title) e.title = `Keep the title under ${LIMITS.title} letters.`;
  if (!SLUG.test(p.slug)) e.slug = 'Use small letters, numbers and single dashes, like my-first-story.';
  else if (RESERVED_SLUGS.includes(p.slug)) e.slug = 'Choose a different address.';
  else if (existingSlugs.includes(p.slug)) e.slug = 'Another story already has this address. Change it a little.';
  else if (!p.builtin && BUILTIN_SLUGS.has(p.slug)) e.slug = 'This address belongs to a built-in story. Edit that story instead.';
  if (p.excerpt.length > LIMITS.excerpt) e.excerpt = `Keep this under ${LIMITS.excerpt} letters.`;
  if (p.summary.length > LIMITS.summary) e.summary = `Keep this under ${LIMITS.summary} letters.`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.published)) e.published = 'Choose a date.';
  if (publishing) {
    if (p.excerpt.trim().length < 20) e.excerpt = 'Write a line or two that makes people want to read it (at least 20 letters).';
    if (p.summary.trim().length < 20) e.summary = 'Write the short answer, a sentence or two (at least 20 letters).';
    if (!p.photo) e.photo = 'Choose a cover picture.';
    if (cleanBody(p.body).length === 0) e.body = 'Write something in the story first.';
    p.faq.forEach((f, i) => { if (!f.q.trim() !== !f.a.trim()) e[`faq${i}`] = 'A question needs an answer, and an answer needs a question.'; });
  }
  return e;
}

/** Posts from a database row (or a stored copy) in the shape the screens use. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function postFromRow(r: Record<string, any>): BlogPost {
  return {
    id: String(r.id), slug: r.slug, title: r.title, excerpt: r.excerpt ?? '', summary: r.summary ?? '', topic: r.topic ?? TOPICS[0].id, photo: r.photo ?? '',
    published: String(r.published).slice(0, 10), minutes: r.minutes ?? 3, body: Array.isArray(r.body) ? r.body : [], faq: Array.isArray(r.faq) ? r.faq : [],
    carousel: r.carousel ?? null, pick: r.pick ?? null, status: r.status === 'published' ? 'published' : r.status === 'removed' ? 'removed' : 'draft', builtin: Boolean(r.builtin), updatedAt: r.updated_at ?? r.updatedAt,
  };
}

/* ---------- demo mode: posts kept in this browser ---------- */

const KEY = 'stoora.blogs.v1';
export function readLocalPosts(): BlogPost[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.map(postFromRow) : []; } catch { return []; }
}
const KEY_RING = 'stoora.blogs.carousel.v1';
export function readLocalCarousel(): CarouselItem[] | null {
  try { const v = localStorage.getItem(KEY_RING); return v ? carouselFrom(JSON.parse(v)) : null; } catch { return null; }
}
/** null puts the carousel back to its default. Returns false when the browser has no room left. */
export function writeLocalCarousel(list: CarouselItem[] | null): boolean {
  try { if (list) localStorage.setItem(KEY_RING, JSON.stringify(list)); else localStorage.removeItem(KEY_RING); window.dispatchEvent(new Event('stoora-blogs')); return true; } catch { return false; }
}

/** Returns false when the browser has no room left (long stories with big pictures). */
export function writeLocalPosts(list: BlogPost[]): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(list)); window.dispatchEvent(new Event('stoora-blogs')); return true; } catch { return false; }
}
