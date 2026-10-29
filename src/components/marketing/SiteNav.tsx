'use client';
import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { AppIcon, Ic, Wordmark } from './bits';
import { useReducedMotion } from './hooks';
import { SECTIONS } from './sections';

/** Move a sliding indicator under a button (or hide it). */
function place(indicator: HTMLElement | null, button: HTMLElement | null) {
  if (!indicator) return;
  if (!button) { indicator.style.opacity = '0'; return; }
  indicator.style.opacity = '1';
  indicator.style.width = `${button.offsetWidth}px`;
  indicator.style.transform = `translateX(${button.offsetLeft}px)`;
}

type Props = {
  /** On the home page the section links scroll; elsewhere they are plain links to the home page's addresses. */
  onHome?: boolean;
  /** Which top-level page this is, for the highlighted link. */
  page?: 'home' | 'journal';
  /** Scroll to a section (home page only). */
  onSection?: (id: string) => void;
  /** The section in view (home page only). */
  activeSection?: string | null;
  solidAlways?: boolean;
};

/**
 * The top bar of the public site: logo, section links with a sliding pill, "Log in" and "Get started",
 * and on phones a menu button that opens a full-screen menu.
 */
export function SiteNav({ onHome = false, page = 'home', onSection, activeSection = null, solidAlways = false }: Props) {
  const reduced = useReducedMotion();
  const linksRef = useRef<HTMLElement>(null);
  const indRef = useRef<HTMLSpanElement>(null);
  const hovRef = useRef<HTMLSpanElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const [solid, setSolid] = useState(solidAlways);
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // a soft white bar once the page has moved
  useEffect(() => {
    const update = () => setSolid((was) => (window.scrollY > 40 ? true : window.scrollY < 10 ? solidAlways : was));
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [solidAlways]);

  const slideTo = useCallback(() => {
    const links = linksRef.current;
    if (!links) return;
    const key = page === 'journal' ? 'journal' : activeSection;
    place(indRef.current, key ? links.querySelector<HTMLElement>(`[data-key="${key}"]`) : null);
  }, [activeSection, page]);

  useLayoutEffect(slideTo, [slideTo]);
  useEffect(() => {
    window.addEventListener('resize', slideTo);
    document.fonts?.ready.then(slideTo);
    return () => window.removeEventListener('resize', slideTo);
  }, [slideTo]);

  const closeMenu = useCallback((then?: () => void) => {
    document.body.classList.remove('lmenu-open');
    if (reduced) { setOpen(false); then?.(); menuBtnRef.current?.focus({ preventScroll: true }); return; }
    setLeaving(true);
    window.setTimeout(() => {
      setOpen(false);
      setLeaving(false);
      menuBtnRef.current?.focus({ preventScroll: true });
      then?.();
    }, 200);
  }, [reduced]);

  const toggleMenu = () => {
    if (open) return closeMenu();
    document.body.classList.add('lmenu-open');
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closeMenu(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closeMenu]);
  useEffect(() => () => document.body.classList.remove('lmenu-open'), []);

  const hover = (button: HTMLElement | null) => place(hovRef.current, button);

  const section = (id: string, label: string, path: string) => {
    const on = onHome && activeSection === id;
    return onHome ? (
      <button key={id} type="button" data-key={id} className={on ? 'on' : ''} aria-current={on ? 'true' : undefined} onClick={() => onSection?.(id)} onPointerOver={(e) => hover(e.currentTarget)}>{label}</button>
    ) : (
      <Link key={id} href={path} data-key={id} onPointerOver={(e) => hover(e.currentTarget)}>{label}</Link>
    );
  };

  return (
    <>
      <header className={`lnav${solid ? ' solid' : ''}`} id="lnav">
        <div className="wrap in">
          <Link className="logo" href="/" aria-label="stoora.in home"><AppIcon /><Wordmark /></Link>
          <nav className="links" aria-label="Sections" ref={linksRef} onPointerOut={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hover(null); }}>
            <span className="ind" ref={indRef} aria-hidden="true" />
            <span className="hov" ref={hovRef} aria-hidden="true" />
            {SECTIONS.map((s) => section(s.id, s.label, s.path))}
            <Link href="/journal" data-key="journal" className={page === 'journal' ? 'on' : ''} aria-current={page === 'journal' ? 'page' : undefined}>Journal</Link>
          </nav>
          <div className="acts">
            <Link className="btn quiet sm login" href="/login">Log in</Link>
            <Link className="btn primary sm cta" href="/signup">Get started<span className="arr" aria-hidden="true"><Ic n="arrow_forward" c="xs" /></span></Link>
          </div>
          <button ref={menuBtnRef} className="menu-btn" type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mnav" onClick={toggleMenu}><span /><span /></button>
        </div>
      </header>
      {open && (
        <div className={`mnav${leaving ? ' out' : ''}`} id="mnav" role="dialog" aria-modal="true" aria-label="Menu">
          <nav aria-label="Sections">
            {SECTIONS.map((s, i) => onHome ? (
              <button key={s.id} type="button" style={{ '--i': i } as CSSProperties} aria-current={activeSection === s.id ? 'true' : undefined} onClick={() => closeMenu(() => onSection?.(s.id))} autoFocus={i === 0}>
                <span>{s.label}</span><Ic n="arrow_forward" c="t-cap" />
              </button>
            ) : (
              <Link key={s.id} href={s.path} style={{ '--i': i } as CSSProperties} onClick={() => closeMenu()}>
                <span>{s.label}</span><Ic n="arrow_forward" c="t-cap" />
              </Link>
            ))}
            <Link href="/journal" style={{ '--i': 4 } as CSSProperties} aria-current={page === 'journal' ? 'page' : undefined} onClick={() => closeMenu()}>
              <span>Journal</span><Ic n="arrow_forward" c="t-cap" />
            </Link>
          </nav>
          <div className="ft" style={{ '--i': 5 } as CSSProperties}>
            <Link className="btn primary full" href="/signup" onClick={() => closeMenu()}>Get started</Link>
            <Link className="btn line full" href="/login" onClick={() => closeMenu()}>Log in</Link>
          </div>
        </div>
      )}
    </>
  );
}
