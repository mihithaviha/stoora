'use client';
// A row of cards that you can swipe by hand and that also moves by itself, like a carousel (phones and small screens only).
//   - every few seconds it glides to the next card, and from the last card back to the first
//   - it stops as soon as a finger, mouse or keyboard touches it, and starts again a few seconds after the person lets go
//   - it only moves while it is on screen and the tab is open, and never when "reduce motion" is switched on
//   - on wide screens the cards are a plain grid, so nothing moves and the dots are hidden
import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

const EVERY_MS = 3400; // how long each card stays
const IDLE_MS = 6000; // how long it waits after the person touched it

export function AutoSwipe({ children, className, label }: { children: ReactNode; className: string; label: string }) {
  const row = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const count = Children.count(children);
  const resumeAt = useRef(0); // autoplay stays quiet until this time
  const visible = useRef(false);

  const cards = useCallback(() => Array.from(row.current?.children ?? []) as HTMLElement[], []);
  /** How far to scroll so card `i` sits where the first card sits. */
  const leftOf = useCallback((i: number) => { const c = cards(); return c[i] && c[0] ? c[i].getBoundingClientRect().left - c[0].getBoundingClientRect().left : 0; }, [cards]);
  const nearest = useCallback(() => {
    const el = row.current; if (!el) return 0;
    let best = 0; let gap = Infinity;
    for (let i = 0; i < count; i++) { const d = Math.abs(leftOf(i) - el.scrollLeft); if (d < gap) { gap = d; best = i; } }
    return best;
  }, [count, leftOf]);
  const goTo = useCallback((i: number, smooth = true) => {
    const el = row.current; if (!el) return;
    el.scrollTo({ left: leftOf(i), behavior: smooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' });
  }, [leftOf]);
  const hold = useCallback((ms = IDLE_MS) => { resumeAt.current = Date.now() + ms; }, []);

  useEffect(() => {
    const el = row.current; if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    // the dots follow the card that is in front, whether it got there by itself or by a swipe
    let raf = 0;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setActive(nearest())); };
    // anything the person does with it pauses it
    const touch = () => hold();
    const events: (keyof HTMLElementEventMap)[] = ['pointerdown', 'touchstart', 'wheel', 'keydown', 'focusin', 'mouseenter'];
    events.forEach((e) => el.addEventListener(e, touch, { passive: true }));
    const leave = () => hold(2500); // a mouse leaving only waits a moment
    el.addEventListener('mouseleave', leave);
    el.addEventListener('scroll', onScroll, { passive: true });
    const io = 'IntersectionObserver' in window ? new IntersectionObserver((e) => { visible.current = e[0].isIntersecting; }, { threshold: 0.45 }) : null;
    io?.observe(el); if (!io) visible.current = true;
    const timer = window.setInterval(() => {
      const scrollable = el.scrollWidth > el.clientWidth + 8; // false on wide screens, where the cards are a grid
      if (reduce.matches || document.hidden || !visible.current || !scrollable || Date.now() < resumeAt.current) return;
      goTo((nearest() + 1) % count); // after the last card it glides back to the first
    }, EVERY_MS);
    return () => { clearInterval(timer); cancelAnimationFrame(raf); io?.disconnect(); events.forEach((e) => el.removeEventListener(e, touch)); el.removeEventListener('mouseleave', leave); el.removeEventListener('scroll', onScroll); };
  }, [count, goTo, hold, nearest]);

  return (
    <>
      <div ref={row} className={className} role="group" aria-roledescription="carousel" aria-label={label}>{children}</div>
      <div className="lp-carousel-dots" role="group" aria-label={`${label}: choose a card`}>
        {Array.from({ length: count }, (_, i) => (
          <button key={i} type="button" aria-label={`Show card ${i + 1} of ${count}`} aria-current={i === active ? 'true' : undefined} onClick={() => { hold(); goTo(i); }} />
        ))}
      </div>
    </>
  );
}
