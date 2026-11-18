'use client';
// "Leave without saving?" (PRD 5.3). While `dirty`, three ways out of the page are held back and reported through `ask`,
// so the screen can show its own dialog:
//   - a click on any link that leaves the page      -> ask(the address)
//   - the browser's Back button                       -> ask('')   (a spare history entry keeps us on this page first)
//   - closing the tab or reloading                    -> the browser's own warning
// The screen then calls `leave(address)` for "Leave", or `stay()` for "Not now". After saving a new product or deleting one,
// `release()` lets the screen go on purpose without being asked.
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

export function useLeaveGuard(dirty: boolean, ask: (href: string) => void) {
  const router = useRouter();
  const askRef = useRef(ask); askRef.current = ask;
  const armed = useRef(false); // the spare history entry is in place
  const skip = useRef(false); // the next popstate is our own clean-up, not the person pressing Back
  const off = useRef(false); // leaving on purpose: stop asking
  const backAsked = useRef(false);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => { if (off.current) return; e.preventDefault(); e.returnValue = ''; };
    const click = (e: MouseEvent) => {
      if (off.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return;
      e.preventDefault(); e.stopPropagation();
      askRef.current(url.pathname + url.search + url.hash);
    };
    const pop = () => {
      if (skip.current) { skip.current = false; return; }
      if (off.current || !armed.current) return;
      armed.current = false; backAsked.current = true; // that Back used up the spare entry; we are still on this page
      askRef.current('');
    };
    if (!armed.current) { window.history.pushState(window.history.state, '', window.location.href); armed.current = true; }
    document.documentElement.dataset.leaveGuard = '1'; // other click handlers (the section fade) stand aside while a page has unsaved changes
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', click, true);
    window.addEventListener('popstate', pop);
    return () => { delete document.documentElement.dataset.leaveGuard; window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', click, true); window.removeEventListener('popstate', pop); };
  }, [dirty]);

  // saved or discarded: take the spare entry out again, so Back works normally
  useEffect(() => {
    if (dirty || !armed.current || off.current) return;
    armed.current = false; skip.current = true;
    window.history.back();
  }, [dirty]);

  /** "Not now": stay on the page. If it was the Back button, put the spare entry back. */
  const stay = useCallback(() => {
    if (backAsked.current && !off.current) { window.history.pushState(window.history.state, '', window.location.href); armed.current = true; }
    backAsked.current = false;
  }, []);
  /** "Leave": go where the person was going (an address), or one step back for the Back button (''). */
  const leave = useCallback((href: string) => {
    off.current = true; armed.current = false; backAsked.current = false;
    if (href) router.push(href); else window.history.go(-1);
  }, [router]);
  /** Call before going somewhere on purpose (after adding a product, or deleting one). Resolves when it is safe to go. */
  const release = useCallback(() => new Promise<void>((res) => {
    off.current = true;
    if (!armed.current) { res(); return; }
    armed.current = false; skip.current = true;
    const done = () => { window.removeEventListener('popstate', done); res(); };
    window.addEventListener('popstate', done);
    window.history.back();
    setTimeout(done, 400);
  }), []);
  return { stay, leave, release };
}
