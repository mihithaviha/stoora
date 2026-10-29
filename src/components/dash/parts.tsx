'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import { ICON_PATHS } from './iconPaths';
import type { Order, Source } from '@/lib/types';

/** A line icon from the dashboard's icon set. */
export function DI({ n, s = 20, w = 1.8 }: { n: string; s?: number; w?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON_PATHS[n] ?? ICON_PATHS.box} />
    </svg>
  );
}

/** A Material Symbols icon by name (for product and service pictures). */
export const Ms = ({ n }: { n: string }) => <span className="ms" aria-hidden="true">{n}</span>;

/** The sticky row at the top of a list screen: an icon, the screen's name and its actions on the right. */
export function TopRow({ icon, title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return (
    <div className="dtop">
      <div className="title sp">{icon ? <DI n={icon} s={18} /> : null}<span>{title}</span></div>
      <div className="acts">{children}</div>
    </div>
  );
}

/** The sticky row on a detail screen: a back button, where it goes back to, and the actions. */
export function BackRow({ to, icon, title, children }: { to?: string; icon: string; title: string; children?: ReactNode }) {
  const router = useRouter();
  return (
    <div className="dtop">
      {to
        ? <Link className="ibtn sm" href={to} aria-label={`Back to ${title}`}><DI n="back" s={16} /></Link>
        : <button className="ibtn sm" type="button" aria-label={`Back to ${title}`} onClick={() => router.back()}><DI n="back" s={16} /></button>}
      <div className="title crumb sp"><DI n={icon} s={16} /> {title}</div>
      <div className="acts">{children}</div>
    </div>
  );
}

/** Takes the place of the top row while a form has changes that are not saved yet. */
export function SaveRow({ what, onDiscard, onSave, busy }: { what: string; onDiscard: () => void; onSave: () => void; busy?: boolean }) {
  return (
    <div className="dtop savebar" role="region" aria-label="Unsaved changes">
      <b className="sp">Unsaved {what}</b>
      <button className="btn sm dk" type="button" onClick={onDiscard}>Discard</button>
      <button className="btn sm main" type="button" onClick={onSave} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
    </div>
  );
}

const AV = ['#EA5B1E', '#8B3A9E', '#0FA05C', '#303652', '#DC4A3A', '#5F3BA8'];
export function DAv({ name, i = 0 }: { name: string; i?: number }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('');
  return <div className="av" style={{ background: AV[(name.charCodeAt(0) + i) % AV.length] }} aria-hidden="true">{initials}</div>;
}

export function SrcTag({ s }: { s: Source | string }) {
  const icon = s === 'WhatsApp' ? 'wa' : s === 'Instagram' ? 'insta' : s === 'Shop link' ? 'link' : 'store';
  return <span className="tag src"><DI n={icon} s={13} /> {s}</span>;
}
export const PayTag = ({ o }: { o: Pick<Order, 'paid' | 'method'> }) =>
  o.paid ? <span className="tag ok">Paid</span> : o.method === 'cod' ? <span className="tag neutral">Cash on delivery</span> : <span className="tag warn">Unpaid</span>;
export const ShipTag = ({ shipped }: { shipped: boolean }) => (shipped ? <span className="tag neutral">Shipped</span> : <span className="tag warn">To ship</span>);
export const PaidTag = ({ paid }: { paid: boolean }) => (paid ? <span className="tag ok">Paid</span> : <span className="tag warn">Unpaid</span>);

/** A tiny line that shows how a number moved over a week. */
export function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 64, h = 22;
  const mx = Math.max(...values), mn = Math.min(...values);
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 3 - ((v - mn) / (mx - mn || 1)) * (h - 6)).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pts} fill="none" style={{ stroke: 'var(--primary)' }} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The strip of headline numbers across the top of a list: a date chip, up to four numbers with a sparkline each, and a tail. */
export function MStrip({ lead, items, tail }: { lead: ReactNode; items: [string, ReactNode, number[]?][]; tail?: ReactNode }) {
  return (
    <div className="mstrip">
      <div className="m lead">{lead}</div>
      {items.map(([k, v, s]) => (
        <div className="m" key={k}>
          <div className="k">{k}</div>
          <div className="row" style={{ gap: 10 }}><span className="v">{v}</span>{s ? <Spark values={s} /> : null}</div>
        </div>
      ))}
      {tail ? <div className="m tail">{tail}</div> : null}
    </div>
  );
}

export function DateChip({ label, onClick }: { label: string; onClick?: () => void }) {
  return <button className="chip on" type="button" onClick={onClick}><DI n="cal" s={15} /> {label}</button>;
}

/** A tick box, drawn like the prototype's. */
export function Chk({ on, onChange, label }: { on: boolean; onChange?: (v: boolean) => void; label?: string }) {
  return (
    <span className={`chk${on ? ' on' : ''}`} role="checkbox" aria-checked={on} aria-label={label} tabIndex={onChange ? 0 : -1}
      onClick={(e) => { e.stopPropagation(); onChange?.(!on); }}
      onKeyDown={(e) => { if (onChange && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); e.stopPropagation(); onChange(!on); } }}>
      {on ? <DI n="check" s={13} w={2.5} /> : null}
    </span>
  );
}

/** A switch in the prototype's look. */
export function DSwitch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch${on ? ' on' : ''}`} onClick={() => onChange(!on)} />;
}

/** A group of choices that look like pills; one is on. */
export function DSeg<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {options.map((o) => <button key={o.value} type="button" role="tab" aria-selected={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>)}
    </div>
  );
}

export const plural = (n: number, word: string, many = word + 's') => `${n} ${n === 1 ? word : many}`;

/** Blurs whatever it wraps and lays a "Coming soon" tag over it; the content can't be focused or clicked. */
export function ComingSoon({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`csoon ${className}`} style={style}>
      <div className="csoon-body" aria-hidden inert>{children}</div>
      <span className="csoon-tag">Coming soon</span>
    </div>
  );
}

