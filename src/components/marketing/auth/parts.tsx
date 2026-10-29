'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Ic } from '../bits';

/** Google's own colours for the "G". */
export function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3.1-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

/** A labelled form field with an optional hint and an error line. The error is read out when it appears. */
export function FormField({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error ? <span className="hint" id={`${id}-h`}>{hint}</span> : null}
      {error ? <span className="err" id={`${id}-e`} role="alert"><Ic n="error" c="xs" />{error}</span> : null}
    </div>
  );
}

/** Six boxes for a one-time code. Typing moves on, backspace moves back, and a pasted code fills them all. */
export function OtpBoxes({ value, onChange, error, length = 6 }: { value: string; onChange: (v: string) => void; error?: boolean; length?: number }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? '');
  const set = (i: number, d: string) => { const next = chars.slice(); next[i] = d; onChange(next.join('').slice(0, length)); };
  return (
    <div className="otp" role="group" aria-label="One-time code">
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className={`otp-box${error ? ' bad' : ''}`}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={c}
          aria-label={`One-time code, digit ${i + 1}`}
          onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(-1); if (!d) return; set(i, d); refs.current[i + 1]?.focus(); }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') { e.preventDefault(); if (chars[i]) set(i, ''); else { set(Math.max(0, i - 1), ''); refs.current[i - 1]?.focus(); } }
            if (e.key === 'ArrowLeft') refs.current[i - 1]?.focus();
            if (e.key === 'ArrowRight') refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => { const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length); if (t) { e.preventDefault(); onChange(t); refs.current[Math.min(t.length, length - 1)]?.focus(); } }}
        />
      ))}
    </div>
  );
}

/** Counts down from `seconds`; `again()` starts it over. */
export function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return { left, again: () => setLeft(seconds) };
}
