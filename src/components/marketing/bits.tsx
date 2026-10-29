import type { CSSProperties, ReactNode } from 'react';

/** A Material Symbols icon. The icon font only ships the names the design uses (see fontLinks.ts). */
export function Ic({ n, c = '', style }: { n: string; c?: string; style?: CSSProperties }) {
  return <span className={`ms ${c}`.trim()} aria-hidden="true" style={style}>{n}</span>;
}

export type BadgeKind = 'ok' | 'warn' | 'bad' | 'neutral' | 'offer';

/** A small status pill: icon and words, so colour is never the only signal. */
export function Bdg({ k, i, children }: { k: BadgeKind; i: string; children: ReactNode }) {
  return <span className={`bdg ${k}`}><Ic n={i} />{children}</span>;
}

const SRC_ICON: Record<string, string> = {
  WhatsApp: 'chat', Instagram: 'photo_camera', 'Shop link': 'link', 'In person': 'storefront', 'Phone call': 'call', Other: 'more_horiz',
};

/** Where an order or chat came from. */
export function Src({ s }: { s: string }) {
  return <span className="src"><Ic n={SRC_ICON[s] || 'link'} />{s}</span>;
}

const initials = (name: string) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const avatarTone = (name: string) => 'c' + (1 + ([...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 4));

export function Av({ name, cls = '' }: { name: string; cls?: string }) {
  return <span className={`av ${avatarTone(name)} ${cls}`.trim()} aria-hidden="true">{initials(name)}</span>;
}

export const rs = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export const titleCase = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** The Stoora app icon and wordmark used in every top bar. */
export function Wordmark({ className = '' }: { className?: string }) {
  return <span className={`wordmark ${className}`.trim()}>stoora<i>.in</i></span>;
}

export function AppIcon({ style }: { style?: CSSProperties }) {
  return <span className="appicon" aria-hidden="true" style={style}>S</span>;
}
