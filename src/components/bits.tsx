'use client';
// Small shared pieces used by the public site, the storefront, buyer pages and admin.
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { Button, ButtonLink, Icon } from './ui';
import { metaOf } from '@/lib/catalog';
import type { Product } from '@/lib/types';

export function Logo({ href = '/', light, label = 'Stoora home' }: { href?: string; light?: boolean; label?: string }) {
  return (
    <Link className="logo" href={href} aria-label={label}>
      <span className="appicon" aria-hidden="true">S</span>
      <span className="wordmark" style={light ? { color: 'var(--on-ink)' } : undefined}>stoora<i>.in</i></span>
    </Link>
  );
}

/** Six boxes for a one-time code. Handles typing, backspace, arrow keys and pasting the whole code. */
export function OtpInput({ value, onChange, length = 6, error, label = 'One-time code' }: { value: string; onChange: (v: string) => void; length?: number; error?: boolean; label?: string }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? '');
  const set = (i: number, d: string) => { const next = chars.slice(); next[i] = d; onChange(next.join('').slice(0, length)); };
  return (
    <div className="otp" role="group" aria-label={label}>
      {chars.map((c, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} className={`otp-box ${error ? 'bad' : ''}`} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={1} value={c} aria-label={`${label}, digit ${i + 1}`}
          onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(-1); if (!d) return; set(i, d); refs.current[i + 1]?.focus(); }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') { e.preventDefault(); if (chars[i]) set(i, ''); else { set(Math.max(0, i - 1), ''); refs.current[i - 1]?.focus(); } }
            if (e.key === 'ArrowLeft') refs.current[i - 1]?.focus();
            if (e.key === 'ArrowRight') refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => { const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length); if (t) { e.preventDefault(); onChange(t); refs.current[Math.min(t.length, length - 1)]?.focus(); } }} />
      ))}
    </div>
  );
}

/** Counts down from `seconds`; `again()` restarts it. */
export function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => { if (left <= 0) return; const t = setTimeout(() => setLeft((x) => x - 1), 1000); return () => clearTimeout(t); }, [left]);
  return { left, again: () => setLeft(seconds) };
}

export function Stars({ value, count }: { value: number; count?: number }) {
  return (
    <span className="stars" role="img" aria-label={`${value} out of 5${count != null ? `, ${count} reviews` : ''}`}>
      {[1, 2, 3, 4, 5].map((n) => <span key={n} className="ms xs" aria-hidden="true" style={{ fontVariationSettings: `"FILL" ${value >= n - 0.25 ? 1 : 0}, "wght" 400, "GRAD" 0, "opsz" 20` }}>star</span>)}
      <b className="num">{value.toFixed(1)}</b>{count != null && <span className="cap">({count})</span>}
    </span>
  );
}

const isDark = (hex: string) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 140; };
/** A product picture drawn in the brand style: the product's colour, a soft pattern and its icon. */
export function ProductArt({ product, big, className = '' }: { product: Product; big?: boolean; className?: string }) {
  const hex = metaOf(product).hex;
  return (
    <div className={`part ${big ? 'big' : ''} ${className}`} role="img" aria-label={`${product.name} (picture)`} style={{ ['--tint' as string]: hex, color: isDark(hex) ? '#FFFFFF' : 'var(--ink)' }}>
      <span className="pat" aria-hidden="true" /><span className="ms" aria-hidden="true">{product.icon}</span>
    </div>
  );
}

export function Accordion({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return <details className="acc" open={open}><summary>{title}<Icon name="expand_more" /></summary><div className="acc-b">{children}</div></details>;
}

/** Wizard progress: "Step 2 of 5" with a bar and the step names. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="stepper" aria-label={`Step ${current + 1} of ${steps.length}`}>
      <div className="meter" aria-hidden="true"><i style={{ width: `${((current + 1) / steps.length) * 100}%` }} /></div>
      <ol className="flow" style={{ margin: 'var(--s2) 0 0' }}>{steps.map((s, i) => <li key={s} className={i < current ? 'done' : i === current ? 'on' : ''} aria-current={i === current ? 'step' : undefined}><span>{i < current ? <Icon name="check" size="xs" /> : i + 1}</span>{s}</li>)}</ol>
    </div>
  );
}

type StateKind = 'loading' | 'empty' | 'error' | 'notfound' | 'signedout' | 'offline';
const STATE_ICON: Record<StateKind, string> = { loading: 'hourglass_top', empty: 'inbox', error: 'error', notfound: 'search_off', signedout: 'logout', offline: 'wifi_off' };
/** Full-page state: loading, empty, error, not found, signed out. */
export function StateScreen({ kind, title, text, actions, compact }: { kind: StateKind; title: string; text: string; actions?: React.ReactNode; compact?: boolean }) {
  return (
    <section className={`state ${kind} ${compact ? 'compact' : ''}`} aria-live={kind === 'loading' ? 'polite' : undefined} aria-busy={kind === 'loading' || undefined}>
      <span className="state-ic">{kind === 'loading' ? <span className="spin dark" aria-hidden="true" style={{ width: 28, height: 28, borderWidth: 3 }} /> : <Icon name={STATE_ICON[kind]} size="lg" />}</span>
      {kind === 'notfound' && <span className="state-code" aria-hidden="true">404</span>}
      <h1 className="h2">{title}</h1><p className="t-body">{text}</p>
      {actions && <div className="btns" style={{ justifyContent: 'center' }}>{actions}</div>}
    </section>
  );
}
export const HomeLink = ({ to = '/', label = 'Go to the home page' }: { to?: string; label?: string }) => <ButtonLink href={to} kind="primary" icon="home">{label}</ButtonLink>;
export const RetryButton = ({ onClick }: { onClick: () => void }) => <Button kind="ink" icon="refresh" onClick={onClick}>Try again</Button>;

/** Pretend-demo helper: remembers who is "signed in" in this browser. */
export const SESSION_KEY = 'stoora.session';
export const BUYER_KEY = 'stoora.buyer';
export function readBuyer(): { name: string; phone: string } {
  try { const s = JSON.parse(localStorage.getItem(BUYER_KEY) || 'null'); if (s?.name) return s; } catch { /* ignore */ }
  return { name: 'Priya Sharma', phone: '+91 98765 43210' };
}
