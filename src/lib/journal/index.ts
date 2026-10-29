import { ARTICLES, PHOTOS, TOPICS, type Article, type Topic } from './articles';

export { ARTICLES, AUTHOR, PHOTOS, TOPICS, type Article, type Block, type Topic } from './articles';

export const SORTED: Article[] = [...ARTICLES].sort((a, b) => b.published.localeCompare(a.published));
/** The stories on the Journal home's ring, in the order set in articles.ts, and the Editor's Pick. */
export const CAROUSEL: Article[] = ARTICLES.filter((a) => a.carousel).sort((a, b) => (a.carousel ?? 0) - (b.carousel ?? 0));
export const PICK: Article = ARTICLES.find((a) => a.pick) || SORTED[0];
export const LATEST_FIRST = 6; // stories shown before "View all"

export const topicOf = (id: string): Topic => TOPICS.find((t) => t.id === id) || TOPICS[0];
export const articleBySlug = (slug: string) => ARTICLES.find((a) => a.slug === slug);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const formatDate = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
};
export const readTime = (a: Article) => `${a.minutes} min read`;

/** Everything a visitor might search for in a story. */
export const searchText = (a: Article) =>
  [a.title, a.excerpt, a.summary, topicOf(a.topic).name, a.slug.replace(/-/g, ' ')].join(' ').toLowerCase();

export const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const photoAlt = (key: string) => PHOTOS[key] || '';

/** Stories to read next: the same topic first, then the rest. */
export const relatedTo = (article: Article): Article[] =>
  [...SORTED.filter((a) => a !== article && a.topic === article.topic), ...SORTED.filter((a) => a !== article && a.topic !== article.topic)].slice(0, 3);
