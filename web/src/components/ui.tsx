'use client';
// Shared building blocks. Class names map to the Brand Kit v2 styles in app/globals.css.
import Link from 'next/link';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { avatarTone, initials, rs } from '@/lib/format';
import type { Order, Source, Chat } from '@/lib/types';

/* ---------- icon (Material Symbols Rounded, brand rule R7) ---------- */
export function Icon({ name, size, className = '' }: { name: string; size?: 'xs' | 'sm' | 'lg'; className?: string }) {
  return <span className={`ms ${size ?? ''} ${className}`} aria-hidden="true">{name}</span>;
}

/* ---------- buttons ---------- */
type BtnKind = 'primary' | 'ink' | 'line' | 'quiet' | 'danger';
type BtnProps = { kind?: BtnKind; small?: boolean; full?: boolean; icon?: string; busy?: boolean; busyLabel?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>;
export function Button({ kind = 'line', small, full, icon, busy, busyLabel, children, className = '', disabled, ...rest }: BtnProps) {
  return (
    <button className={`btn ${kind} ${small ? 'sm' : ''} ${full ? 'full' : ''} ${className}`} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
      {busy ? <span className={`spin ${kind === 'line' || kind === 'quiet' ? 'dark' : ''}`} aria-hidden="true" /> : icon ? <Icon name={icon} /> : null}
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
}
export function ButtonLink({ href, kind = 'line', small, full, icon, children }: { href: string; kind?: BtnKind; small?: boolean; full?: boolean; icon?: string; children: React.ReactNode }) {
  return <Link href={href} className={`btn ${kind} ${small ? 'sm' : ''} ${full ? 'full' : ''}`}>{icon && <Icon name={icon} />}{children}</Link>;
}

/* ---------- badges: deep text on tint + icon + word (rule R6) ---------- */
export type Tone = 'ok' | 'warn' | 'bad' | 'offer' | 'neutral';
export function Badge({ tone, icon, children }: { tone: Tone; icon: string; children: React.ReactNode }) {
  return <span className={`bdg ${tone}`}><Icon name={icon} />{children}</span>;
}
const SRC_ICON: Record<string, string> = { WhatsApp: 'chat', Instagram: 'photo_camera', 'Shop link': 'link', 'In person': 'storefront', 'Phone call': 'call', Other: 'more_horiz' };
export function SourceTag({ source }: { source: Source | string }) {
  return <span className="src"><Icon name={SRC_ICON[source] ?? 'link'} />{source}</span>;
}
export function PayBadge({ o }: { o: Order }) {
  if (o.method === 'cod' && !o.paid) return <Badge tone="neutral" icon="payments">Cash on delivery</Badge>;
  return o.paid ? <Badge tone="ok" icon="check_circle">Paid</Badge> : <Badge tone="warn" icon="schedule">Unpaid</Badge>;
}
export function ShipBadge({ o }: { o: Order }) {
  return o.shipped ? <Badge tone="neutral" icon="done_all">Shipped</Badge> : <Badge tone="warn" icon="local_shipping">To ship</Badge>;
}
export const MOOD: Record<Chat['mood'], [Tone, string, string]> = { ready: ['ok', 'shopping_bag', 'Ready to buy'], upset: ['bad', 'sentiment_dissatisfied', 'Upset'], look: ['neutral', 'visibility', 'Just looking'] };
export function MoodBadge({ mood }: { mood: Chat['mood'] }) { const [t, i, l] = MOOD[mood]; return <Badge tone={t} icon={i}>{l}</Badge>; }

export function Avatar({ name, size }: { name: string; size?: number }) {
  return <span className={`av ${avatarTone(name)}`} aria-hidden="true" style={size ? { width: size, height: size, fontSize: size * 0.32 } : undefined}>{initials(name)}</span>;
}

/* ---------- layout pieces ---------- */
export function PageHeader({ title, lede, eyebrow, actions }: { title: React.ReactNode; lede?: React.ReactNode; eyebrow?: string; actions?: React.ReactNode }) {
  return (
    <div className="phead anim">
      <div className="l">{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1 className="h1">{title}</h1>{lede && <p className="t-body">{lede}</p>}</div>
      {actions && <div className="r">{actions}</div>}
    </div>
  );
}
export function Card({ title, icon, aside, children, className = '', flush, style }: { title?: React.ReactNode; icon?: string; aside?: React.ReactNode; children: React.ReactNode; className?: string; flush?: boolean; style?: React.CSSProperties }) {
  return (
    <section className={`card ${flush ? 'flush' : ''} ${className}`} style={style}>
      {(title || aside) && <div className="card-h"><h2 className="ct">{icon && <Icon name={icon} />}{title}</h2>{aside}</div>}
      {children}
    </section>
  );
}
export function EmptyState({ icon = 'inbox', title, text, action }: { icon?: string; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <span className="thumb" style={{ width: 56, height: 56, borderRadius: '50%' }}><Icon name={icon} /></span>
      <div className="ct">{title}</div><p className="t-body">{text}</p>{action}
    </div>
  );
}
export function Skeleton({ rows = 3, height = 64 }: { rows?: number; height?: number }) {
  return <div className="stack tight" aria-busy="true" aria-label="Loading">{Array.from({ length: rows }, (_, i) => <div key={i} className="skel" style={{ height }} />)}</div>;
}
export function DemoBar({ children }: { children?: React.ReactNode }) {
  return <p className="demo-bar" role="note"><Icon name="science" />{children ?? 'Demo shop: this page shows sample data, not your real business. The real Stoora API is not connected yet.'}</p>;
}

/* ---------- form fields ---------- */
export function Field({ id, label, required, optional, hint, error, children }: { id: string; label: string; required?: boolean; optional?: boolean; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label} {required && <span className="req">Required</span>}{optional && <span className="opt">Optional</span>}</label>
      {children}
      {hint && !error && <span className="hint" id={`${id}-h`}>{hint}</span>}
      {error && <span className="err" id={`${id}-e`} role="alert"><Icon name="error" size="xs" />{error}</span>}
    </div>
  );
}
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" className="switch" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />;
}
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string; count?: number }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg inline" role="tablist" aria-label={label}>
      {options.map((o) => <button key={o.value} type="button" role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}{o.count != null && <span className="n">{o.count}</span>}</button>)}
    </div>
  );
}
export function Chips<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string; count?: number; icon?: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="chips wrap" role="group" aria-label={label}>
      {options.map((o) => <button key={o.value} type="button" className={`chip ${value === o.value ? 'on' : ''}`} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.icon && <Icon name={o.icon} size="xs" />}{o.label}{o.count != null && <span className="n">{o.count}</span>}</button>)}
    </div>
  );
}
export function SearchBox({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return <label className="search" htmlFor={id}><Icon name="search" size="sm" /><span className="sr">{placeholder}</span><input id={id} type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></label>;
}

/* ---------- dialog (bottom sheet on phones, centred modal on wider screens) ---------- */
export function Dialog({ open, onClose, title, children, footer, full }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; full?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const last = useRef<Element | null>(null);
  useEffect(() => {
    if (!open) return;
    last.current = document.activeElement;
    const t = setTimeout(() => (box.current?.querySelector<HTMLElement>('input,textarea,select,button.btn.primary,button.btn.ink') ?? box.current?.querySelector<HTMLElement>('button'))?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && box.current) {
        const f = [...box.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea')].filter((x) => x.offsetParent !== null);
        if (!f.length) return; const first = f[0], end = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); end.focus(); } else if (!e.shiftKey && document.activeElement === end) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden';
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; (last.current as HTMLElement | null)?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div ref={box} className={`sheet ${full ? 'full' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="grab" aria-hidden="true" />
        <div className="sheet-h"><h2 className="h2">{title}</h2><button className="ibtn flat" onClick={onClose} aria-label="Close"><Icon name="close" /></button></div>
        <div className="sheet-b">{children}</div>
        {footer && <div className="sheet-f">{footer}</div>}
      </div>
    </>
  );
}
export function ConfirmDialog({ open, title, body, yes, danger, onYes, onClose }: { open: boolean; title: string; body: string; yes: string; danger?: boolean; onYes: () => void; onClose: () => void }) {
  return <Dialog open={open} onClose={onClose} title={title} footer={<><Button onClick={onClose}>Not now</Button><Button kind={danger ? 'danger' : 'ink'} onClick={() => { onYes(); onClose(); }}>{yes}</Button></>}><p className="t-soft">{body}</p></Dialog>;
}

/* ---------- toasts ---------- */
type ToastT = { msg: string; icon: string; undo?: () => void; id: number };
const ToastCtx = createContext<(msg: string, opts?: { icon?: string; undo?: () => void }) => void>(() => {});
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [t, setT] = useState<ToastT | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const show = useCallback((msg: string, opts?: { icon?: string; undo?: () => void }) => {
    clearTimeout(timer.current); const id = Date.now();
    setT({ msg, icon: opts?.icon ?? 'check_circle', undo: opts?.undo, id });
    timer.current = setTimeout(() => setT((x) => (x?.id === id ? null : x)), opts?.undo ? 6000 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite">{t && <div className="toast" role="status"><Icon name={t.icon} /><span>{t.msg}</span>{t.undo && <button onClick={() => { t.undo?.(); setT(null); }}>Undo</button>}</div>}</div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ---------- charts (always drawn from real data passed in) ---------- */
export function LineChart({ labels, values, label, money = true }: { labels: string[]; values: number[]; label: string; money?: boolean }) {
  if (!values.length) return <EmptyState icon="show_chart" title="No data yet" text="This chart fills in once your shop has a few days of sales." />;
  const fmt = (v: number) => (money ? rs(v) : String(Math.round(v)));
  const W = 600, H = 210, pl = 56, pr = 18, pt = 16, pb = 30;
  const step = money ? 2000 : 50; const max = Math.max(step, Math.ceil(Math.max(...values) / step) * step);
  const X = (i: number) => pl + (i * (W - pl - pr)) / Math.max(1, values.length - 1); const Y = (v: number) => pt + (H - pt - pb) * (1 - v / max);
  const pts = values.map((v, i) => [X(i), Y(v)] as const);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const end = pts[pts.length - 1];
  return (
    <figure className="lchart" role="img" aria-label={`${label}: ${labels.map((l, i) => `${l} ${fmt(values[i])}`).join(', ')}`}>
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {[0, 0.5, 1].map((f) => <g key={f}><line x1={pl} x2={W - pr} y1={Y(max * f)} y2={Y(max * f)} className="g" /><text x={pl - 8} y={Y(max * f) + 4} textAnchor="end" className="yl">{fmt(max * f)}</text></g>)}
        <path d={`${line} L${X(values.length - 1)} ${H - pb} L${pl} ${H - pb} Z`} className="ar" /><path d={line} className="ln" />
        {pts.map((p, i) => <g key={i} className={`pt ${i === pts.length - 1 ? 'end' : ''}`}><circle cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 5 : 3.5} /><title>{`${labels[i]}: ${fmt(values[i])}`}</title></g>)}
        {labels.map((l, i) => <text key={l + i} x={X(i)} y={H - 8} textAnchor="middle" className={`xl ${i === labels.length - 1 ? 'now' : ''}`}>{l}</text>)}
        <text x={end[0] - 8} y={end[1] - 12} textAnchor="end" className="vl">{fmt(values[values.length - 1])}</text>
      </svg>
    </figure>
  );
}
export function BarChart({ labels, values, label, money = true }: { labels: string[]; values: number[]; label: string; money?: boolean }) {
  if (!values.length) return <EmptyState icon="bar_chart" title="No data yet" text="Bars appear once there are orders to count." />;
  const fmt = (v: number) => (money ? rs(v) : String(v));
  const max = Math.max(...values, 1);
  return (
    <div className="chart" role="img" aria-label={`${label}: ${labels.map((l, i) => `${l} ${fmt(values[i])}`).join(', ')}`}>
      <div className="bars">{values.map((v, i) => <div className="b" key={i} tabIndex={0} aria-label={`${labels[i]}: ${fmt(v)}`}><span className="tip">{labels[i]} · {fmt(v)}</span><i style={{ height: `${(v / max) * 100}%`, opacity: i === values.length - 1 ? 1 : 0.55 }} /></div>)}</div>
      <div className="xlab" aria-hidden="true">{labels.map((l, i) => <span key={i}>{l}</span>)}</div>
    </div>
  );
}
export function HBars({ rows, fmt = String }: { rows: [string, number][]; fmt?: (v: number) => string }) {
  if (!rows.length) return <p className="t-body">Nothing to show yet.</p>;
  const m = Math.max(...rows.map((r) => r[1]), 1);
  return <div className="stack tight" role="list">{rows.map(([l, v]) => <div className="hbar" role="listitem" key={l}><div className="top2"><span>{l}</span><span className="num t-ink">{fmt(v)}</span></div><div className="trk"><i style={{ width: `${(v / m) * 100}%` }} /></div></div>)}</div>;
}
export function SplitBar({ parts, fmt = rs }: { parts: [string, number, 'ok' | 'warn' | 'neutral'][]; fmt?: (v: number) => string }) {
  return (
    <div className="split" role="img" aria-label={parts.map((p) => `${p[0]} ${fmt(p[1])}`).join(', ')}>
      <div className="sbar">{parts.filter((p) => p[1]).map(([l, v, k]) => <i key={l} className={k} style={{ flex: v }} />)}</div>
      <div className="slg">{parts.map(([l, v, k]) => <span key={l}><i className={k} />{l} <b className="num">{fmt(v)}</b></span>)}</div>
    </div>
  );
}
