import Link from 'next/link';
import type { Metadata } from 'next';
import screens from '@/lib/screens.json';
import { Icon } from '@/components/ui';
import { Logo } from '@/components/bits';

export const metadata: Metadata = { title: 'Design preview', robots: { index: false } };
type S = { group: string; name: string; path: string; auth?: string; mobileOnly?: boolean };

export default function DesignIndex() {
  const groups = (screens as S[]).reduce<Record<string, S[]>>((a, s) => { (a[s.group] ??= []).push(s); return a; }, {});
  return (
    <div className="site">
      <header className="sitebar"><div className="wrap"><Logo /><span className="bdg offer" style={{ marginLeft: 8 }}>Design preview</span></div></header>
      <main id="main" className="wrap" style={{ padding: 'var(--s5) 16px var(--s6)', display: 'grid', gap: 'var(--s4)' }}>
        <div className="sec-h"><span className="eyebrow">Handoff</span><h1 className="display" style={{ fontSize: 'clamp(30px,5vw,46px)' }}>Every screen, in one place</h1>
          <p className="lede">{(screens as S[]).length} screens across {Object.keys(groups).length} areas. Open a screen full size, or in a phone or laptop frame. Seller and buyer pages use a demo login, which the preview frames set for you.</p></div>
        <div className="demo-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}>
          {Object.entries(groups).map(([g, list]) => (
            <section className="demo-card" key={g} aria-labelledby={`g-${g}`}><h2 className="ct" id={`g-${g}`}>{g}</h2>
              <ul className="rows" style={{ margin: 0, padding: 0, listStyle: 'none' }}>{list.map((s) => (
                <li key={s.path + s.name} className="li" style={{ minHeight: 52, padding: 'var(--s1) var(--s2)' }}>
                  <span className="grow"><span className="t" style={{ fontWeight: 500 }}>{s.name}</span><span className="s"><code>{s.path}</code>{s.auth && s.auth !== 'bag' ? ` · ${s.auth} login` : ''}</span></span>
                  <Link className="btn line sm" href={`/design/preview?path=${encodeURIComponent(s.path)}&device=mobile${s.auth ? `&as=${s.auth}` : ''}`} aria-label={`${s.name} on a phone`}><Icon name="smartphone" size="sm" /></Link>
                  <Link className="btn line sm" href={`/design/preview?path=${encodeURIComponent(s.path)}&device=desktop${s.auth ? `&as=${s.auth}` : ''}`} aria-label={`${s.name} on a laptop`}><Icon name="laptop" size="sm" /></Link>
                </li>))}</ul></section>))}
        </div>
      </main>
    </div>
  );
}
