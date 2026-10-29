'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Bdg, Ic, type BadgeKind } from '../bits';
import { useReducedMotion } from '../hooks';

type Mess = {
  icon: string;
  messy: [string, string];
  tidy: [string, string];
  badge: [BadgeKind, string, string];
  /** where the card lies when everything is a mess: x and y as a share of the stage, and a tilt in degrees */
  at: [number, number, number];
};

const MESS: Mess[] = [
  { icon: 'image', messy: ['Screenshot_20261026-214512.jpg', 'GPay payment — is this Rahul?'], tidy: ['#1011 · Rahul Verma', '₹1,499 · paid by UPI'], badge: ['ok', 'check_circle', 'Paid'], at: [0.02, 0.03, -7] },
  { icon: 'photo_camera', messy: ['COD hoga?', 'Instagram DM · 2:14 am'], tidy: ['Ananya · Instagram', 'Asked about COD · reply ready'], badge: ['ok', 'shopping_bag', 'Ready to buy'], at: [0.47, 0, 5] },
  { icon: 'chat', messy: ['Didi size chart bhej do', 'WhatsApp · 11:52 pm'], tidy: ['Kiran · WhatsApp', 'Size chart sent'], badge: ['neutral', 'done_all', 'Replied'], at: [0.08, 0.34, 4] },
  { icon: 'edit_note', messy: ['Priya 2 kurta M, GPay aaya?', 'Notes app'], tidy: ['#1012 · Priya Sharma', '₹3,798 · paid by UPI'], badge: ['ok', 'check_circle', 'Paid'], at: [0.5, 0.3, -5] },
  { icon: 'event', messy: ['Wed yoga: Sneha, Pooja unpaid', 'Reminder · 12:00 am'], tidy: ['Morning yoga · Wed 7 am', '4 booked · 2 not paid'], badge: ['warn', 'schedule', 'Unpaid'], at: [0, 0.66, -3] },
  { icon: 'photo_camera', messy: ['price pls dm', 'Instagram comment'], tidy: ['Neha · Instagram', 'Just looking · reply ready'], badge: ['neutral', 'visibility', 'Just looking'], at: [0.45, 0.64, 7] },
];
const RANK = [3, 0, 4, 2, 1, 5]; // tidy order: ready to buy, unpaid, then handled items
const ROW = 66; // height of a card in the tidy list
const LABEL = 30; // height of a "Needs you / Handled" label
const SAY = [
  'Before Stoora: six messages spread across the gallery, DMs, WhatsApp and notes, with nothing marked.',
  'With Stoora: one list. Ananya is ready to buy and the yoga booking is unpaid, so they come first. Four items are handled and marked.',
];

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * "Before / With Stoora": six scattered messages that sort themselves into one list. `t` runs from 0 (a mess)
 * to 1 (sorted). The cards are moved directly on the DOM every frame so a long animation never re-renders React.
 */
function Mess() {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const labelA = useRef<HTMLSpanElement>(null);
  const labelB = useRef<HTMLSpanElement>(null);
  const radios = useRef<(HTMLButtonElement | null)[]>([]);
  const progress = useRef(0);
  const raf = useRef(0);
  const touched = useRef(false);
  const [mode, setMode] = useState<0 | 1>(0);

  const layout = useCallback((t: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const width = stage.clientWidth;
    const height = MESS.length * ROW + LABEL * 2;
    stage.style.height = `${height}px`;
    const cardWidth = Math.min(300, Math.max(width * 0.6, 230));
    cardRefs.current.forEach((card, i) => {
      if (!card) return;
      const rank = RANK[i];
      const local = clamp01((t - rank * 0.07) / 0.6);
      const e = ease(local);
      const [x, y, tilt] = MESS[i].at;
      const fromX = x * (width - cardWidth);
      const fromY = y * (height - 70) + 4;
      const toY = rank * ROW + (rank >= 2 ? LABEL * 2 : LABEL);
      card.style.width = `${(cardWidth + (width - cardWidth) * e).toFixed(1)}px`;
      card.style.transform = `translate(${(fromX * (1 - e)).toFixed(1)}px,${(fromY * (1 - e) + toY * e).toFixed(1)}px) rotate(${(tilt * (1 - e)).toFixed(2)}deg)`;
      card.style.zIndex = String(t > 0.5 ? 20 - rank : 10 + i);
      const reveal = clamp01((local - 0.35) / 0.35);
      const messy = card.querySelector<HTMLElement>('.messy');
      const tidy = card.querySelector<HTMLElement>('.tidy');
      const badge = card.querySelector<HTMLElement>('.bdg');
      if (messy) messy.style.opacity = (1 - reveal).toFixed(3);
      if (tidy) tidy.style.opacity = reveal.toFixed(3);
      if (badge) {
        const showBadge = clamp01((local - 0.7) / 0.3);
        badge.style.opacity = showBadge.toFixed(3);
        badge.style.transform = `scale(${(0.88 + 0.12 * showBadge).toFixed(3)})`;
      }
      card.classList.toggle('lit', t > 0.98 && rank < 2);
    });
    const label = clamp01((t - 0.55) / 0.35);
    [labelA.current, labelB.current].forEach((el) => {
      if (!el) return;
      el.style.opacity = label.toFixed(3);
      el.style.transform = `translateY(${((1 - label) * 6).toFixed(1)}px)`;
    });
    if (labelB.current) labelB.current.style.top = `${2 * ROW + LABEL + 4}px`;
  }, []);

  const moveThumb = useCallback(() => {
    const thumb = thumbRef.current;
    const on = radios.current.find((radio) => radio?.getAttribute('aria-checked') === 'true');
    if (!thumb || !on) return;
    thumb.style.width = `${on.offsetWidth}px`;
    thumb.style.transform = `translateX(${on.offsetLeft - 4}px)`;
  }, []);

  const animateTo = useCallback((to: 0 | 1) => {
    cancelAnimationFrame(raf.current);
    const from = progress.current;
    if (reduced) {
      progress.current = to;
      layout(to);
      return;
    }
    const duration = to ? 1150 : 800;
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / duration);
      progress.current = from + (to - from) * k;
      layout(progress.current);
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, [layout, reduced]);

  const choose = (next: 0 | 1, byUser: boolean) => {
    if (byUser) touched.current = true;
    if (next === mode) return;
    setMode(next);
    animateTo(next);
  };

  useEffect(() => { moveThumb(); }, [mode, moveThumb]);

  // first layout, on resize, and once fonts have loaded
  useEffect(() => {
    layout(progress.current);
    moveThumb();
    const again = () => { layout(progress.current); moveThumb(); };
    window.addEventListener('resize', again);
    document.fonts?.ready.then(again);
    return () => window.removeEventListener('resize', again);
  }, [layout, moveThumb]);

  // it sorts itself once when first seen, unless the visitor has already used the control
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !('IntersectionObserver' in window)) return;
    let wait = 0;
    const watch = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      watch.disconnect();
      wait = window.setTimeout(() => { if (!touched.current) { setMode(1); animateTo(1); } }, reduced ? 0 : 500);
    }, { threshold: 0.55 });
    watch.observe(root);
    return () => { watch.disconnect(); clearTimeout(wait); };
  }, [animateTo, reduced]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const onKey = (event: KeyboardEvent) => {
    if (!/^Arrow(Left|Right|Up|Down)$/.test(event.key)) return;
    event.preventDefault();
    const next = mode ? 0 : 1;
    choose(next, true);
    radios.current[next]?.focus();
  };

  return (
    <div className={`mess rv${mode ? ' with' : ''}`} id="mess" ref={rootRef}>
      <div className="top3">
        <div className="cmp" role="radiogroup" aria-label="Compare" onKeyDown={onKey}>
          <span className="cmp-thumb" aria-hidden="true" ref={thumbRef} />
          <button ref={(el) => { radios.current[0] = el; }} role="radio" aria-checked={mode === 0} tabIndex={mode === 0 ? 0 : -1} type="button" onClick={() => choose(0, true)}>Before</button>
          <button ref={(el) => { radios.current[1] = el; }} role="radio" aria-checked={mode === 1} tabIndex={mode === 1 ? 0 : -1} type="button" onClick={() => choose(1, true)}><Ic n="auto_awesome" c="xs" />With Stoora</button>
        </div>
        <span className="cmp-cap" aria-hidden="true"><span className="c0">6 messages · 4 apps · nothing marked</span><span className="c1">One list · ready to buy first</span></span>
      </div>
      <p className="sr" aria-live="polite">{SAY[mode]}</p>
      <div className="mstage" id="mstage" ref={stageRef} aria-hidden="true">
        <span className="mlbl" ref={labelA}><Ic n="flag" c="xs" />Needs you · 2</span>
        <span className="mlbl" ref={labelB}><Ic n="done_all" c="xs" />Handled · 4</span>
        {MESS.map((card, i) => (
          <div key={card.icon + i} className={`mcard${RANK[i] < 2 ? ' need' : ''}`} ref={(el) => { cardRefs.current[i] = el; }}>
            <span className="ic"><Ic n={card.icon} c="sm" /></span>
            <div className="tx">
              <div className="messy"><b>{card.messy[0]}</b><span>{card.messy[1]}</span></div>
              <div className="tidy"><b>{card.tidy[0]}</b><span>{card.tidy[1]}</span></div>
            </div>
            <Bdg k={card.badge[0]} i={card.badge[1]}>{card.badge[2]}</Bdg>
          </div>
        ))}
      </div>
    </div>
  );
}

export function About() {
  return (
    <section className="sec" id="l-about" aria-labelledby="ab-h">
      <div className="wrap what">
        <div className="stick">
          <div className="sec-open rv" style={{ marginBottom: 0 }}>
            <span className="eyebrow">About Stoora</span>
            <h2 className="l-h2" id="ab-h">Your business already works. The plumbing doesn’t.</h2>
            <p className="lede">You have buyers and a phone full of messages. Stoora.in is the system behind them.</p>
          </div>
          <div className="pain rv" style={{ '--d': 1 } as CSSProperties}>
            <p><Ic n="close" />Payment screenshots in your gallery.</p>
            <p><Ic n="close" />Orders lost in 2 am DMs.</p>
            <p><Ic n="close" />“COD hoga?” — again and again.</p>
          </div>
        </div>
        <div><Mess /></div>
      </div>
    </section>
  );
}
