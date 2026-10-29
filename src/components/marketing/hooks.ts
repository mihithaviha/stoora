'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';

/** True when the visitor asked for less motion. Animations rest, and content simply appears. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  return reduced;
}

/** True while the element is on screen (by at least `threshold`). */
export function useOnScreen<T extends Element>(ref: RefObject<T | null>, threshold = 0.25): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const watch = new IntersectionObserver((entries) => setVisible(entries[0].isIntersecting), { threshold });
    watch.observe(el);
    return () => watch.disconnect();
  }, [ref, threshold]);
  return visible;
}

/** True while the browser tab is in front. */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const sync = () => setVisible(!document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  return visible;
}

/**
 * Scroll-in reveal: elements with the `rv` class start hidden (`pre`) when they are below the fold and
 * lose `pre` once seen. Runs once for a container, after it has mounted.
 */
export function useReveal(containerRef: RefObject<HTMLElement | null>, off: boolean) {
  useEffect(() => {
    const root = containerRef.current;
    if (!root || off) return;
    const seen = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.remove('pre');
          seen.unobserve(e.target);
        }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    root.querySelectorAll<HTMLElement>('.rv').forEach((el) => {
      if (el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add('pre');
        seen.observe(el);
      }
    });
    return () => seen.disconnect();
  }, [containerRef, off]);
}

/** Runs `fn` on every animation frame while `active`, with the seconds since the last frame (capped). */
export function useFrame(fn: (dt: number) => void, active: boolean) {
  const latest = useRef(fn);
  latest.current = fn;
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      latest.current(Math.min(0.05, (now - last) / 1000));
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}
