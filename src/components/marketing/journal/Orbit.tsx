'use client';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Ic } from '../bits';
import { Picture, TopicTag } from './parts';
import { formatDate, readTime, topicOf, type Article } from '@/lib/journal';

const SECONDS_PER_STORY = 3.2; // how long each story takes to pass by

const wrap = (n: number, size: number) => ((n % size) + size) % size;

/**
 * The story cards stand on the inside of a big ring (a cylinder seen from the middle): the card at the back faces you,
 * the cards beside it curve toward you, and the ring turns by itself without ever stopping.
 *
 *   ring turn `rot` (degrees)  ->  card i faces you when  rot = i * step
 *   position of card i         ->  rotateY(-i * step), pushed back by the ring's radius R
 *
 * Dragging (mouse or finger) turns the ring, and when you let go it carries on from the speed of your flick and eases back
 * to its own pace. Arrow keys turn it one story at a time. Without JavaScript the cards are a plain row you can scroll sideways.
 */
function useRing(root: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = root.current;
    if (!el || !enabled) return;
    const list = el.querySelector<HTMLElement>('.jr-orbit-list');
    const dragger = el.querySelector<HTMLElement>('[data-dragger]');
    const cards = Array.from(el.querySelectorAll<HTMLElement>('.jr-ocard'));
    const total = cards.length;
    if (total < 3 || !list || !dragger) return;
    gsap.registerPlugin(Draggable);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const step = 360 / total; // degrees between two cards
    const AUTO = step / SECONDS_PER_STORY; // the ring's own speed, in degrees per second
    let rot = 0; // how far the ring has turned
    let speed = reducedMotion.matches ? 0 : AUTO; // degrees per second right now
    let goal = speed; // the speed it is easing toward
    const nudge = { v: 0 }; // extra turn from the arrow keys
    let dragging = false;
    let onScreen = true;
    let shown = -1; // the card in front, for screen readers
    let degreesPerPixel = 0.2;
    let cardWidth = 420;
    let lastTime = performance.now();
    let dragEndedAt = 0;

    el.classList.add('is-ring');

    /** Card size, ring radius and perspective for this screen width. */
    const measure = () => {
      const width = el.clientWidth;
      let cw: number;
      let ch: number;
      if (width >= 1000) [cw, ch] = [420, 500];
      else if (width >= 640) [cw, ch] = [340, 440];
      else [cw, ch] = [Math.min(280, width * 0.7), Math.min(280, width * 0.7) * 1.5];
      cardWidth = cw;
      const gap = cw * 0.16;
      const radius = (cw + gap) / (2 * Math.sin(Math.PI / total)); // cards just clear each other around the ring
      el.style.setProperty('--cw', `${cw}px`);
      el.style.setProperty('--ch', `${ch}px`);
      el.style.perspective = `${Math.round(radius * 3.4)}px`;
      cards.forEach((card, i) => gsap.set(card, { rotateY: -i * step, transformOrigin: `50% 50% ${radius}px`, z: -radius, backfaceVisibility: 'hidden' }));
      gsap.set(list, { z: radius * 0.55 }); // bring the whole ring forward so the card at the back is nearly full size
      degreesPerPixel = step / (cw + gap) / 0.9;
    };

    /** Only the card in front is reachable by keyboard and screen reader. */
    const setShown = (index: number) => {
      shown = index;
      cards.forEach((card, i) => {
        card.setAttribute('aria-hidden', String(i !== index));
        const link = card.querySelector('a');
        if (link) link.tabIndex = i === index ? 0 : -1;
      });
    };

    /** Turn the ring and slide each photo a little the other way, for a feeling of depth. */
    const draw = () => {
      const turn = rot + nudge.v;
      gsap.set(list, { rotationY: turn });
      cards.forEach((card, i) => {
        const away = wrap(turn - i * step + 180, 360) - 180; // degrees from facing you: -180 to 180
        const image = card.querySelector('img');
        if (image) gsap.set(image, { x: Math.max(-1, Math.min(1, -away / (step * 1.5))) * cardWidth * 0.08 });
      });
      const front = wrap(Math.round(turn / step), total);
      if (front !== shown) setShown(front);
    };

    /** One tick per frame: speed eases toward its goal (so changes of pace are smooth), then the ring turns. */
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000); // a long pause (hidden tab) must not make the ring jump
      lastTime = now;
      if (!onScreen) return;
      if (!dragging) {
        speed += (goal - speed) * (1 - Math.exp(-dt * 1.8));
        rot += speed * dt;
      }
      draw();
    };
    gsap.ticker.add(tick);

    // dragging with the mouse or a finger
    let flick = 0;
    let lastDragAt = 0;
    const [drag] = Draggable.create(dragger, {
      trigger: el,
      type: 'x',
      dragClickables: true, // the cards are links: a drag that starts on one must still turn the ring
      minimumMovement: 6,
      onDragStart() { dragging = true; flick = 0; lastDragAt = performance.now(); },
      onDrag() {
        const now = performance.now();
        const turned = -this.deltaX * degreesPerPixel; // dragging right pulls the cards right
        rot += turned;
        const seconds = Math.max(0.008, (now - lastDragAt) / 1000);
        flick = flick * 0.6 + (turned / seconds) * 0.4;
        lastDragAt = now;
      },
      onDragEnd() {
        gsap.set(dragger, { x: 0 }); // the drag layer only measures; reset it
        dragging = false;
        dragEndedAt = performance.now();
        const idle = performance.now() - lastDragAt > 120; // let go while holding still: no flick
        speed = idle ? 0 : Math.max(-260, Math.min(260, flick));
      },
    });
    // a drag must not also open the story it ended on
    const swallowClick = (event: Event) => {
      if (performance.now() - dragEndedAt < 250) { event.preventDefault(); event.stopPropagation(); }
    };
    el.addEventListener('click', swallowClick, true);

    // keyboard: one story at a time
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      gsap.to(nudge, { v: nudge.v + (event.key === 'ArrowRight' ? step : -step), duration: 0.9, ease: 'power3.inOut' });
    };
    el.addEventListener('keydown', onKey);

    // it only works when it can be seen
    const watch = 'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => { onScreen = entries[0].isIntersecting; lastTime = performance.now(); }, { threshold: 0.05 })
      : null;
    watch?.observe(el);
    const onMotion = () => { goal = reducedMotion.matches ? 0 : AUTO; };
    reducedMotion.addEventListener('change', onMotion);
    let resizing = 0;
    const onResize = () => { clearTimeout(resizing); resizing = window.setTimeout(() => { measure(); draw(); }, 100); };
    window.addEventListener('resize', onResize);

    measure();
    draw();
    // the cards rise into place one after another; with reduced motion they simply appear
    const rise = reducedMotion.matches ? null : gsap.from(cards, { duration: 1.4, y: 160, opacity: 0, stagger: 0.09, ease: 'expo.out' });

    return () => {
      gsap.ticker.remove(tick);
      rise?.kill();
      drag.kill();
      el.removeEventListener('click', swallowClick, true);
      el.removeEventListener('keydown', onKey);
      watch?.disconnect();
      reducedMotion.removeEventListener('change', onMotion);
      window.removeEventListener('resize', onResize);
      clearTimeout(resizing);
      el.classList.remove('is-ring');
      el.style.removeProperty('perspective');
      gsap.set([list, ...cards, ...cards.map((c) => c.querySelector('img')).filter(Boolean) as Element[]], { clearProps: 'all' });
    };
  }, [root, enabled]);
}

/** One card on the ring. */
function OrbitCard({ article, n, total }: { article: Article; n: number; total: number }) {
  const topic = topicOf(article.topic);
  return (
    <li className="jr-ocard" data-i={n} role="group" aria-roledescription="slide" aria-label={`Story ${n + 1} of ${total}`}>
      <Link className="jr-ocard-link" href={`/journal/${article.slug}`}>
        <span className="jr-ocard-img"><Picture name={article.photo} sizes="(min-width: 1000px) 430px, 80vw" eager={n < 2} soon={n >= 2} /></span>
        <span className="jr-ocard-body">
          <TopicTag topic={topic} />
          <h3 className="jr-ocard-title">{article.title}</h3>
          <span className="jr-ocard-ex">{article.excerpt}</span>
          <span className="jr-ocard-foot">
            <span><span className="jr-d">{formatDate(article.published)} · </span>{readTime(article)}</span>
            <span className="jr-more">Read story<Ic n="arrow_forward" c="xs" /></span>
          </span>
        </span>
      </Link>
    </li>
  );
}

export function Orbit({ stories }: { stories: Article[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useRing(rootRef, mounted);
  return (
    <section className="jr-orbit-wrap" aria-label="Featured stories">
      <div className="jr-orbit" ref={rootRef} role="region" aria-roledescription="carousel" aria-label="Featured stories" tabIndex={0}>
        <ol className="jr-orbit-list">{stories.map((article, n) => <OrbitCard key={article.slug} article={article} n={n} total={stories.length} />)}</ol>
        <div className="jr-vignette" aria-hidden="true" />
        <div className="jr-dragger" data-dragger aria-hidden="true" />
      </div>
      <p className="sr" aria-live="off" />
    </section>
  );
}
