import Link from 'next/link';
import { Ic } from '../bits';
import { formatDate, photoAlt, readTime, topicOf, type Article, type Topic } from '@/lib/journal';

/** A photo with a small version for cards and a large one for wide places. Cropped with object-fit, never stretched. */
export function Picture({ name, sizes, eager = false, soon = false, alt }: { name: string; sizes: string; eager?: boolean; soon?: boolean; alt?: string }) {
  // a picture the team uploaded (an address or a stored copy) is used as it is; a library photo has a small and a large version
  if (/^(https?:\/\/|\/|data:image\/)/.test(name)) {
    return (
      <span className="jr-pic" style={{ ['--photo' as string]: `url("${encodeURI(name).replace(/["()]/g, (c) => '%' + c.charCodeAt(0).toString(16))}")` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={name} alt={alt ?? ''} fetchPriority={eager ? 'high' : undefined} loading={eager || soon ? undefined : 'lazy'} decoding="async" />
      </span>
    );
  }
  return (
    // the whole photo is always shown, never cropped; a tiny copy of it, scaled up and soft, fills any space around it
    <span className="jr-pic" style={{ ['--photo' as string]: `url(/assets/journal/${name}-tiny.webp)` }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={`/assets/journal/${name}-720.webp`}
      srcSet={`/assets/journal/${name}-720.webp 720w, /assets/journal/${name}-1400.webp 1400w`}
      sizes={sizes}
      alt={alt ?? photoAlt(name)}
      fetchPriority={eager ? 'high' : undefined}
      loading={eager || soon ? undefined : 'lazy'}
      decoding="async"
    />
    </span>
  );
}

export function TopicTag({ topic }: { topic: Topic }) {
  return <span className={`jr-tag t-${topic.id}`}><Ic n={topic.icon} c="xs" />{topic.name}</span>;
}

export const CARD_SIZES = '(min-width: 1000px) 400px, (min-width: 640px) 45vw, 92vw';

/** One story in a grid. The whole card is clickable through the title's link. */
export function StoryCard({ article, hidden = false, collapsed = false }: { article: Article; hidden?: boolean; collapsed?: boolean }) {
  const topic = topicOf(article.topic);
  return (
    <article className={`jr-card${collapsed ? ' is-collapsed' : ''}`} hidden={hidden} data-slug={article.slug}>
      <div className="jr-card-img" aria-hidden="true"><Picture name={article.photo} sizes={CARD_SIZES} /></div>
      <div className="jr-meta"><TopicTag topic={topic} /><span>{formatDate(article.published)} · {readTime(article)}</span></div>
      <h3><Link href={`/blogs/${article.slug}`}>{article.title}</Link></h3>
      <p>{article.excerpt}</p>
      <span className="jr-more">Read story<Ic n="arrow_forward" c="xs" /></span>
    </article>
  );
}

export function CtaBand() {
  return (
    <section className="jr-cta">
      <div className="wrap">
        <div className="jr-cta-in">
          <div><span className="eyebrow">Ready when you are</span><h2>Open your shop in a few minutes.</h2><p>One link for every order, every chat and every rupee.</p></div>
          <Link className="btn primary" href="/shop/start">Start for Free<Ic n="arrow_forward" c="xs" /></Link>
        </div>
      </div>
    </section>
  );
}
