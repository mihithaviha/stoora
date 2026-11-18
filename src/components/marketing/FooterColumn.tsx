'use client';
import { useEffect, useRef, type ReactNode } from 'react';

/**
 * A footer link group. On a phone (under 560px) it is a tap-to-open row, closed at the start.
 * On wider screens it is always open and the title cannot close it.
 */
export function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 559px)');
    const sync = () => { if (ref.current) ref.current.open = !query.matches; };
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  return (
    <details className="sf-col" ref={ref} open onClick={(event) => {
      // wide screens: the title is a heading, not a button
      if ((event.target as HTMLElement).closest('summary') && !window.matchMedia('(max-width: 559px)').matches) event.preventDefault();
    }}>
      <summary>{title}</summary>
      {children}
    </details>
  );
}
