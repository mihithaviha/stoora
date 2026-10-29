import Link from 'next/link';
import type { ReactNode } from 'react';
import { Ic } from './bits';

export interface Section { id: string; title: string; body: ReactNode }

/** Shared layout for legal pages: title, "last updated", a sticky contents list and numbered sections. */
export function LegalPage({ title, intro, updated = '29 October 2026', sections }: { title: string; intro: string; updated?: string; sections: Section[] }) {
  return (
    <div className="wrap legal">
      <aside className="toc" aria-label="On this page">
        <b className="label" style={{ padding: '0 var(--s2) var(--s1)' }}>On this page</b>
        {sections.map((s, i) => <a key={s.id} href={`#${s.id}`}>{i + 1}. {s.title}</a>)}
      </aside>
      <article className="prose">
        <span className="eyebrow">Legal</span>
        <h1>{title}</h1>
        <span className="updated"><Ic n="history" c="xs" />Last updated {updated} · Draft for legal review</span>
        <p style={{ fontSize: 17 }}>{intro}</p>
        {sections.map((s, i) => <section key={s.id} id={s.id}><h2>{i + 1}. {s.title}</h2><div style={{ display: 'grid', gap: 'var(--s2)' }}>{s.body}</div></section>)}
        <p className="cap">Questions about this page? <Link className="link" href="/data-requests">Make a data request</Link> or write to privacy@stoora.in.</p>
      </article>
    </div>
  );
}
