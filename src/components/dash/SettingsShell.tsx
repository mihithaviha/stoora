'use client';
// The Settings frame: a list of settings on the left, the chosen one on the right (the dashboard prototype's Settings screens).
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { DI, Ms } from './parts';
import { useStore } from '@/lib/store';
import { SETTINGS, slug } from '@/lib/settings';

export function SettingsShell({ current, title, children }: { current?: string; title: string; children: ReactNode }) {
  const { db } = useStore();
  const [q, setQ] = useState('');
  const list = SETTINGS.filter(([name, , desc]) => !q.trim() || `${name} ${desc}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="setwrap">
      <div className="setnav">
        <div className="row" style={{ padding: '2px 4px 4px' }}>
          <div className="smark sq">{(db.shop.name || 'S')[0].toUpperCase()}</div>
          <div className="sp"><b>{db.shop.name}</b><div className="tiny muted">stoora.in/{db.shop.handle}</div></div>
        </div>
        <label className="search" style={{ height: 38, fontSize: 14 }}><DI n="search" s={16} /><span className="sr">Search settings</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search settings" style={{ border: 0, background: 'none', outline: 'none', flex: 1, minWidth: 0 }} /></label>
        <div>
          {list.map(([name, icon]) => (
            <Link key={name} className={`srow${current === name ? ' on' : ''}`} href={`/settings/${slug(name)}`} aria-current={current === name ? 'page' : undefined}><Ms n={icon} /><span>{name}</span></Link>
          ))}
          {!list.length ? <p className="tiny muted" style={{ padding: '6px 10px' }}>No setting matches.</p> : null}
        </div>
      </div>
      <div className="setbody">
        <div className="in">
          <div className="row" style={{ marginBottom: 8 }}>
            <h1 className="h1 sp" style={{ margin: 0 }}>{title}</h1>
            <Link className="ibtn sm" href="/dashboard" aria-label="Close settings"><DI n="x" s={16} /></Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
