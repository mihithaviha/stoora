'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Ic } from '../bits';
import { useReducedMotion } from '../hooks';
import { Orbit } from './Orbit';
import { Picture, StoryCard, TopicTag } from './parts';
import { ARTICLES, CAROUSEL, LATEST_FIRST, PICK, SORTED, TOPICS, readTime, searchText, topicOf } from '@/lib/journal';

const validTopic = (id: string | null) => (TOPICS.some((t) => t.id === id) ? (id as string) : '');
const COUNTS = Object.fromEntries(TOPICS.map((t) => [t.id, ARTICLES.filter((a) => a.topic === t.id).length]));
const HAYSTACK = new Map(SORTED.map((a) => [a.slug, searchText(a)]));

/**
 * The Journal home: the story ring, topics with search, the latest stories, the Editor's Pick and a closing invitation.
 * Choosing a topic or typing in the search filters the list at once and updates the address, so any view can be shared.
 */
export function JournalHome() {
  const reduced = useReducedMotion();
  const params = useSearchParams();
  const [topic, setTopic] = useState(() => validTopic(params.get('topic')));
  const [typed, setTyped] = useState(() => params.get('q') ?? '');
  const [expanded, setExpanded] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const listHeadRef = useRef<HTMLHeadingElement>(null);
  const focusCard = useRef<string | null>(null);

  const q = typed.trim().toLowerCase();
  const filtering = Boolean(topic || q);

  // the back and forward buttons change the address; follow them
  const addressTopic = validTopic(params.get('topic'));
  const addressQ = params.get('q') ?? '';
  useEffect(() => { setTopic(addressTopic); setTyped(addressQ); }, [addressTopic, addressQ]);

  const publish = useCallback((nextTopic: string, nextQ: string, push: boolean) => {
    const search = new URLSearchParams();
    if (nextTopic) search.set('topic', nextTopic);
    if (nextQ.trim()) search.set('q', nextQ.trim().toLowerCase());
    const url = window.location.pathname + (search.toString() ? `?${search}` : '');
    if (push) window.history.pushState(null, '', url); else window.history.replaceState(null, '', url);
  }, []);

  const scrollToList = () => listHeadRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });

  const { cards, shownCount, inGridCount, collapsedCount } = useMemo(() => {
    let listed = 0;
    let inGrid = 0;
    let shown = 0;
    let collapsedTotal = 0;
    const rows = SORTED.map((article) => {
      const fits = (!topic || article.topic === topic) && (!q || (HAYSTACK.get(article.slug) ?? '').includes(q));
      // With no filter the Editor's Pick has its own feature, so its card stays out of the grid.
      const inList = fits && (filtering || article !== PICK);
      // Without a filter the grid starts with the latest few; "View all" shows the rest.
      const collapsed = inList && !filtering && !expanded && ++listed > LATEST_FIRST;
      if (inList) { inGrid += 1; shown += 1; }
      if (collapsed) collapsedTotal += 1;
      return { article, hidden: !inList, collapsed: Boolean(collapsed) };
    });
    return { cards: rows, shownCount: shown, inGridCount: inGrid, collapsedCount: collapsedTotal };
  }, [topic, q, expanded, filtering]);

  // after "View all", focus the first story that was hidden
  useEffect(() => {
    if (!expanded || !focusCard.current) return;
    gridRef.current?.querySelector<HTMLAnchorElement>(`[data-slug="${focusCard.current}"] a`)?.focus();
    focusCard.current = null;
  }, [expanded]);

  const label = topic ? ` in ${topicOf(topic).name}` : '';
  const search = q ? ` matching “${q}”` : '';
  const countText = `${shownCount} ${shownCount === 1 ? 'story' : 'stories'}${label}${search}`;
  const pickTopic = topicOf(PICK.topic);

  const reset = () => { setTopic(''); setTyped(''); setExpanded(false); publish('', '', true); };
  const choose = (id: string) => {
    const next = topic === id ? '' : id; // choosing the open topic again goes back to all stories
    setTopic(next); setExpanded(false); publish(next, typed, true);
    if (next) scrollToList();
  };
  const submit = (event: FormEvent) => { event.preventDefault(); publish(topic, typed, true); scrollToList(); };

  return (
    <>
      <Orbit stories={CAROUSEL} />

      <section className="jr-topics" aria-labelledby="jr-topics-h">
        <div className="wrap">
          <div className="jr-sec-head">
            <div><span className="jr-kicker">Explore</span><h2 id="jr-topics-h">By topic</h2></div>
            <form className="jr-search" role="search" onSubmit={submit}>
              <Ic n="search" />
              <label className="sr" htmlFor="jr-q">Search the Journal</label>
              <input id="jr-q" name="q" type="search" value={typed} placeholder="Search stories" autoComplete="off" maxLength={80}
                onChange={(e) => { setTyped(e.target.value); publish(topic, e.target.value, false); }} />
              <button className="btn primary sm" type="submit">Search</button>
            </form>
          </div>
          <nav className="jr-topic-grid" aria-label="Topics">
            {TOPICS.map((item) => (
              <Link key={item.id} className="jr-topic" href={`/journal?topic=${item.id}`} aria-current={item.id === topic ? 'true' : undefined}
                onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); choose(item.id); }}>
                <span className={`jr-topic-ic t-${item.id}`}><Ic n={item.icon} /></span>
                <b>{item.name}</b>
                <small>{item.blurb}</small>
                <span className="jr-topic-n">{COUNTS[item.id]} {COUNTS[item.id] === 1 ? 'story' : 'stories'}</span>
              </Link>
            ))}
          </nav>
          <p className="jr-allrow">
            <Link className="jr-allstories" href="/journal" hidden={!filtering} onClick={(e) => { e.preventDefault(); reset(); }}><Ic n="arrow_back" c="xs" />Show all stories</Link>
          </p>
        </div>
      </section>

      <section className="jr-list" aria-labelledby="jr-list-h">
        <div className="wrap">
          <div className="jr-list-head">
            <h2 className="l-h2" id="jr-list-h" ref={listHeadRef}>{filtering ? 'Stories' : 'Latest stories'}</h2>
            <p className="jr-count" role="status" aria-live="polite">{countText}</p>
          </div>
          <div className="jr-grid" ref={gridRef}>
            {cards.map(({ article, hidden, collapsed }) => <StoryCard key={article.slug} article={article} hidden={hidden} collapsed={collapsed} />)}
          </div>
          <p className="jr-morerow">
            <button className="btn line" type="button" hidden={!collapsedCount}
              onClick={() => { focusCard.current = cards.find((c) => c.collapsed)?.article.slug ?? null; setExpanded(true); }}>View all {inGridCount} stories</button>
          </p>
          <div className="jr-empty" hidden={shownCount > 0}>
            <h3>No stories match that yet.</h3>
            <p>Try another word, or look at everything we have.</p>
            <Link className="btn line" href="/journal" onClick={(e) => { e.preventDefault(); reset(); }}>Show all stories</Link>
          </div>
        </div>
      </section>

      <section className="jr-pick" hidden={filtering} aria-labelledby="jr-pick-h">
        <div className="wrap">
          <div className="jr-pick-in">
            <Link className="jr-pick-img" href={`/journal/${PICK.slug}`} tabIndex={-1} aria-hidden="true"><Picture name={PICK.photo} sizes="(min-width: 900px) 520px, 92vw" /></Link>
            <div className="jr-pick-copy">
              <span className="jr-kicker">Editor’s pick</span>
              <h2 id="jr-pick-h"><Link href={`/journal/${PICK.slug}`}>{PICK.title}</Link></h2>
              <p className="jr-pick-why">{PICK.pick}</p>
              <p className="jr-pick-short"><b>The short answer</b>{PICK.summary}</p>
              <div className="jr-pick-foot">
                <Link className="btn primary" href={`/journal/${PICK.slug}`}>Read story<Ic n="arrow_forward" c="xs" /></Link>
                <span className="jr-meta"><TopicTag topic={pickTopic} /><span>{readTime(PICK)}</span></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="jr-close" aria-labelledby="jr-close-h">
        <div className="wrap">
          <div className="jr-close-in">
            <div className="jr-close-circles" aria-hidden="true">
              {['suit-floral', 'loom', 'bowls'].map((key) => (
                // eslint-disable-next-line @next/next/no-img-element
                <span key={key}><img src={`/assets/journal/${key}-720.jpg`} alt="" loading="lazy" decoding="async" /></span>
              ))}
            </div>
            <div className="jr-close-copy">
              <h2 id="jr-close-h">From reading to selling.</h2>
              <p>Stoora gives you a shop page, your orders and your payments in one place, so what you learn here goes straight into your own storefront.</p>
              <div className="jr-close-actions"><Link className="btn primary" href="/signup">Open your shop<Ic n="arrow_forward" c="xs" /></Link><Link className="jr-textlink" href="/how-it-works">See how it works</Link></div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
