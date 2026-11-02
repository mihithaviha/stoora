'use client';
// "Leave without saving?" (PRD 5.3). While `dirty`, a click on any link that leaves the page is held back and reported through
// `ask`, so the screen can show its own dialog; closing the tab or reloading uses the browser's own warning.
import { useEffect, useRef } from 'react';

export function useLeaveGuard(dirty: boolean, ask: (href: string) => void) {
  const askRef = useRef(ask); askRef.current = ask;
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    const click = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return;
      e.preventDefault(); e.stopPropagation();
      askRef.current(url.pathname + url.search + url.hash);
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', click, true);
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', click, true); };
  }, [dirty]);
}
