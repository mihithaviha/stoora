'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion, useReveal } from '../hooks';
import { ShopFront, WatercolorDefs } from '../ShopFront';
import { SiteFooter } from '../SiteFooter';
import { SECTIONS } from '../sections';
import { SiteNav } from '../SiteNav';
import { About } from './About';
import { Audience } from './Audience';
import { ClaimForm } from './ClaimForm';
import { Features } from './Features';
import { Hero } from './Hero';
import { How } from './How';
import { ClaimProvider, useClaim } from './LandingContext';

const PROMISES: [string, string, string][] = [
  ['0', 'Actions without your tap', 'Stoora never sends, posts, changes prices or spends money by itself.'],
  ['0', 'Made-up numbers', 'Every number comes from your own shop. If Stoora doesn’t know, it says so.'],
  ['1', 'Tap to switch any feature off', 'Every helper has its own on and off switch.'],
  ['1', 'Flat price', 'No credits or coins that run out. No hidden prices, no sales calls.'],
];

function Trust() {
  return (
    <section className="sec" id="l-trust" aria-labelledby="tr-h">
      <div className="wrap">
        <div className="sec-open rv">
          <span className="eyebrow">What you can count on</span>
          <h2 className="l-h2" id="tr-h">Four promises we test.</h2>
          <p className="lede">You only ever see your own shop’s data — never another seller’s.</p>
        </div>
        <div className="prom">
          {PROMISES.map(([n, title, text], i) => (
            <div className="rv" style={{ '--d': i } as CSSProperties} key={title}><span className="n">{n}</span><h3>{title}</h3><p className="cap">{text}</p></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  const { handle } = useClaim();
  return (
    <section className="sec" aria-labelledby="fin-h">
      <div className="wrap">
        <div className="final rv">
          <div className="stack">
            <span className="eyebrow">Get started</span>
            <h2 className="l-h2" id="fin-h">Your shop is one link away.</h2>
            <p className="lede">Type the name you want. It takes a name, an email and a password.</p>
            <ClaimForm id="claim-final" button="Open my shop" />
            <p className="cap">Already selling with Stoora? <Link href="/login" className="link">Log in</Link></p>
          </div>
          <div className="shop paint-in"><ShopFront boardId="board-final" handle={handle} /></div>
        </div>
      </div>
    </section>
  );
}

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
        <WatercolorDefs />
        <SiteNav onHome page="home" activeSection={active} onSection={goTo} />
        <main id="lmain">
          <Hero onSeeHow={() => goTo('l-how')} />
          <About />
          <Audience />
          <How />
          <Features />
          <Trust />
          <FinalCta />
        </main>
        <SiteFooter />
      </div>
    </ClaimProvider>
  );
}
