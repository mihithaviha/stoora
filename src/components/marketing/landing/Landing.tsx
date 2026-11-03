'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion, useReveal } from '../hooks';
import { SiteFooter } from '../SiteFooter';
import { SECTIONS } from '../sections';
import { SiteNav } from '../SiteNav';
import { ClaimProvider } from './LandingContext';
import { Audience, CoFounder, Last, Plans, Product, Steady, Steps, Stories, Top } from './Sections';

/**
 * The public home page. It is one long page; About, How it works, Who it's for and Features are sections of it, and each has
 * its own address (/about, /how-it-works, ...). Moving between them scrolls the page and updates the address without reloading.
 */
export function Landing({ initialSection }: { initialSection?: string }) {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);
  useReveal(rootRef, reduced);

  const goTo = useCallback((id: string) => {
    const target = document.getElementById(id);
    target?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    const path = SECTIONS.find((s) => s.id === id)?.path ?? '/';
    window.history.pushState(null, '', path);
  }, [reduced]);

  // open at the section named by the address
  useEffect(() => {
    if (!initialSection) return;
    const target = document.getElementById(initialSection);
    if (!target) return;
    const wait = window.setTimeout(() => target.scrollIntoView({ behavior: 'auto', block: 'start' }), 60);
    return () => clearTimeout(wait);
  }, [initialSection]);

  // which section is in the middle of the screen (for the highlighted link)
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.4;
      let found: string | null = null;
      SECTIONS.forEach(({ id }) => {
        const box = document.getElementById(id)?.getBoundingClientRect();
        if (box && box.top < line && box.bottom > line) found = id;
      });
      setActive(found);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(frame); };
  }, []);

  return (
    <ClaimProvider>
      <div id="site" ref={rootRef}>
                <SiteNav onHome page="home" activeSection={active} onSection={goTo} />
        <main id="lmain" className="lp">
          <Top />
          <Product />
          <CoFounder />
          <Audience />
          <Steps />
          <Stories />
          <Steady />
          <Plans />
          <Last />
        </main>
        <SiteFooter />
      </div>
    </ClaimProvider>
  );
}
