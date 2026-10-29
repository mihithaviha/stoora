import Link from 'next/link';
import { Ic } from '../bits';
import { CopyLink } from './CopyLink';
import { CtaBand, Picture, StoryCard, TopicTag } from './parts';
import { AUTHOR, formatDate, readTime, relatedTo, slugify, topicOf, type Article, type Block } from '@/lib/journal';

/** One piece of an article's body. Everything is plain text: React escapes it. */
function BlockView({ block }: { block: Block }) {
  if (block.h2) return <h2 id={slugify(block.h2)}>{block.h2}</h2>;
  if (block.h3) return <h3>{block.h3}</h3>;
  if (block.p) return <p>{block.p}</p>;
  if (block.ul) return <ul>{block.ul.map((item) => <li key={item}>{item}</li>)}</ul>;
  if (block.ol) return <ol className="jr-steps">{block.ol.map((item) => <li key={item}>{item}</li>)}</ol>;
  if (block.callout) return <aside className="jr-callout"><Ic n="lightbulb" /><div><b>{block.callout[0]}</b><p>{block.callout[1]}</p></div></aside>;
  if (block.image) {
    return (
      <figure className="jr-fig">
        <Picture name={block.image} sizes="(min-width: 900px) 700px, 92vw" />
        {block.caption ? <figcaption>{block.caption}</figcaption> : null}
      </figure>
    );
  }
  if (block.table) {
    return (
      <div className="jr-table">
        <table>
          <thead><tr>{block.table.head.map((cell) => <th scope="col" key={cell}>{cell}</th>)}</tr></thead>
          <tbody>{block.table.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
  }
  return null;
}

export function ArticleView({ article, origin }: { article: Article; origin: string }) {
  const topic = topicOf(article.topic);
  const url = `${origin}/journal/${article.slug}`;
  const headings = article.body.filter((b) => b.h2).map((b) => b.h2 as string);
  const share = `https://wa.me/?text=${encodeURIComponent(`${article.title} ${url}`)}`;
  return (
    <>
      <div className="jr-article-top">
        <div className="wrap jr-narrow">
          <nav className="jr-crumbs" aria-label="Breadcrumb">
            <Link href="/journal">Journal</Link><Ic n="chevron_right" c="xs" />
            <Link href={`/journal?topic=${topic.id}`}>{topic.name}</Link><Ic n="chevron_right" c="xs" />
            <span aria-current="page">{article.title}</span>
          </nav>
          <div className="jr-meta jr-meta-lg"><TopicTag topic={topic} /><span><Ic n="schedule" c="xs" />{readTime(article)}</span></div>
          <h1>{article.title}</h1>
          <p className="lede">{article.excerpt}</p>
          <div className="jr-byline">
            <span className="appicon" aria-hidden="true">S</span>
            <span className="who"><b>{AUTHOR}</b><span>Published {formatDate(article.published)}</span></span>
            <span className="jr-share">
              <a className="btn line sm" href={share} target="_blank" rel="noopener noreferrer"><Ic n="chat" c="xs" />Share on WhatsApp</a>
              <CopyLink url={url} />
            </span>
          </div>
        </div>
      </div>
      <div className="wrap jr-narrow-wide"><figure className="jr-cover"><Picture name={article.photo} sizes="(min-width: 1000px) 1100px, 100vw" eager /></figure></div>
      <div className="wrap jr-article-grid">
        {headings.length > 2 && (
          <aside className="jr-toc" aria-label="In this story">
            <details open>
              <summary>In this story</summary>
              <ol>{headings.map((text) => <li key={text}><a href={`#${slugify(text)}`}>{text}</a></li>)}</ol>
            </details>
          </aside>
        )}
        <article className="jr-body">
          <section className="jr-short" aria-label="The short answer"><span className="k"><Ic n="lightbulb" c="xs" />The short answer</span><p>{article.summary}</p></section>
          {article.body.map((block, i) => <BlockView key={i} block={block} />)}
          {article.faq.length > 0 && (
            <>
              <h2 id="questions">Questions sellers ask</h2>
              <div className="jr-faq">{article.faq.map((item) => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}</div>
            </>
          )}
          <p className="jr-note">This is general guidance for small sellers. Check prices, rules and costs for your own business before you act on it.</p>
          <p><Link className="jr-back" href="/journal"><Ic n="arrow_back" c="xs" />Back to the Journal</Link></p>
        </article>
      </div>
      <section className="jr-list jr-related" aria-labelledby="jr-rel-h">
        <div className="wrap">
          <div className="jr-list-head"><h2 className="l-h2" id="jr-rel-h">Keep reading</h2><Link className="jr-all" href="/journal">All stories<Ic n="arrow_forward" c="xs" /></Link></div>
          <div className="jr-grid">{relatedTo(article).map((item) => <StoryCard key={item.slug} article={item} />)}</div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
