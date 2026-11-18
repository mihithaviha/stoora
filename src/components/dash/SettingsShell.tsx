'use client';
// The Settings frame: the four settings on the left (above on a phone), the chosen one on the right.
import Link from 'next/link';
import type { ReactNode } from 'react';
import { DI, Ms } from './parts';
import { useStore } from '@/lib/store';
import { SETTINGS, slug } from '@/lib/settings';

export function SettingsShell({ current, title, children }: { current?: string; title: string; children: ReactNode }) {
  const { db } = useStore();
  return (
    <div className="setwrap">
      <div className="setnav">
        <div className="row" style={{ padding: '2px 4px 4px' }}>
          <div className="smark sq">{(db.shop.name || 'S')[0].toUpperCase()}</div>
          <div className="sp"><b>{db.shop.name}</b><div className="tiny muted">stoora.in/{db.shop.handle}</div></div>
        </div>
        <div>
          {SETTINGS.map(([name, icon]) => (
            <Link key={name} className={`srow${current === name ? ' on' : ''}`} href={`/settings/${slug(name)}`} aria-current={current === name ? 'page' : undefined}><Ms n={icon} /><span>{name}</span></Link>
          ))}
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
