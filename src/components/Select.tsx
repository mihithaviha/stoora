'use client';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import '../styles/select.css';

export interface SelectOption { value: string; label: string; /** A smaller line under the label. */ hint?: string; disabled?: boolean }

interface Place { left: number; width: number; top?: number; bottom?: number; max: number; up: boolean }

/**
 * A drop-down list that matches the Stoora forms: a rounded button that opens a soft panel with a gentle fade and slide, a tick on the
 * chosen option, and keyboard support (arrows, Home, End, Enter, Space, Escape, and typing the first letters).
 * It is a proper "listbox" for screen readers. The panel is drawn on top of the page (so a dialog or a scrolling card never cuts it off)
 * and opens upwards when there is no room below. Use it where a native <select> was: `value` and `onChange` take the option's value as text.
 */
export function Select({ id, value, onChange, options, placeholder = 'Choose', 'aria-label': ariaLabel, 'aria-invalid': invalid, className = '', style, disabled, size = 'md' }: {
  id?: string; value: string; onChange: (value: string) => void; options: SelectOption[]; placeholder?: string; 'aria-label'?: string; 'aria-invalid'?: boolean;
  className?: string; style?: CSSProperties; disabled?: boolean; size?: 'md' | 'sm';
}) {
  const auto = useId();
  const listId = `${id ?? auto}-list`;
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [place, setPlace] = useState<Place | null>(null);
  const typed = useRef({ text: '', at: 0 });
  const selected = useMemo(() => options.findIndex((o) => o.value === value), [options, value]);
  const current = selected >= 0 ? options[selected] : null;
  useEffect(() => setMounted(true), []);

  const close = useCallback((focus = false) => { setOpen(false); if (focus) button.current?.focus(); }, []);
  const openList = useCallback(() => { if (disabled) return; setActive(selected >= 0 ? selected : options.findIndex((o) => !o.disabled)); setOpen(true); }, [disabled, selected, options]);
  const choose = (i: number) => { const o = options[i]; if (!o || o.disabled) return; onChange(o.value); close(true); };

  // where the panel goes: under the button, or above it when there is more room there
  const measure = useCallback(() => {
    const b = button.current;
    if (!b) return;
    const r = b.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 14;
    const above = r.top - 14;
    const want = Math.min((list.current?.scrollHeight ?? 280) + 12, 280);
    const up = below < want && above > below;
    setPlace(up ? { left: r.left, width: r.width, bottom: window.innerHeight - r.top + 6, max: Math.max(120, Math.min(280, above)), up }
      : { left: r.left, width: r.width, top: r.bottom + 6, max: Math.max(120, Math.min(280, below)), up });
  }, []);
  useLayoutEffect(() => { if (open) measure(); }, [open, measure, options.length]);
  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [open, measure]);

  // keep the active option in view while moving with the keyboard
  useEffect(() => {
    if (!open || active < 0) return;
    list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  // a click or touch outside closes it
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { const n = e.target as Node; if (!root.current?.contains(n) && !list.current?.contains(n)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  const step = (from: number, dir: 1 | -1) => {
    for (let n = 1; n <= options.length; n += 1) {
      const i = (from + dir * n + options.length * 2) % options.length;
      if (!options[i].disabled) return i;
    }
    return from;
  };

  const onKey = (e: KeyboardEvent) => {
    if (disabled) return;
    const k = e.key;
    if (!open) {
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || k === ' ') { e.preventDefault(); openList(); }
      return;
    }
    if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (k === 'Tab') setOpen(false);
    else if (k === 'ArrowDown') { e.preventDefault(); setActive((a) => step(a, 1)); }
    else if (k === 'ArrowUp') { e.preventDefault(); setActive((a) => step(a < 0 ? 0 : a, -1)); }
    else if (k === 'Home') { e.preventDefault(); setActive(options.findIndex((o) => !o.disabled)); }
    else if (k === 'End') { e.preventDefault(); setActive(options.length - 1 - [...options].reverse().findIndex((o) => !o.disabled)); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); if (active >= 0) choose(active); }
    else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // typing the first letters jumps to the matching option
      const now = Date.now();
      typed.current = { text: (now - typed.current.at > 700 ? '' : typed.current.text) + k.toLowerCase(), at: now };
      const hit = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(typed.current.text));
      if (hit >= 0) setActive(hit);
    }
  };

  const panel = (
    <ul ref={list} id={listId} className={`dd-list${open ? ' open' : ''}${place?.up ? ' up' : ''}`} role="listbox" aria-label={ariaLabel} tabIndex={-1}
      style={place ? { left: place.left, minWidth: place.width, top: place.top, bottom: place.bottom, maxHeight: place.max } : undefined} {...(open ? {} : { inert: true, 'aria-hidden': true })}>
      {options.map((o, i) => (
        <li key={o.value + i} id={`${listId}-${i}`} data-i={i} data-value={o.value} role="option" aria-selected={i === selected} aria-disabled={o.disabled || undefined}
          className={`dd-opt${i === selected ? ' on' : ''}${i === active ? ' act' : ''}${o.disabled ? ' off' : ''}`}
          onPointerMove={() => { if (!o.disabled && active !== i) setActive(i); }} onClick={() => choose(i)}>
          <span className="dd-txt"><span>{o.label}</span>{o.hint ? <small>{o.hint}</small> : null}</span>
          <svg className="dd-tick" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </li>
      ))}
    </ul>
  );

  return (
    <div ref={root} className={`dd${open ? ' open' : ''}${size === 'sm' ? ' sm' : ''} ${className}`.trim()} style={style}>
      <button ref={button} id={id} type="button" className="input dd-btn" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}
        aria-label={ariaLabel} aria-invalid={invalid || undefined} aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined} disabled={disabled}
        data-value={value} onClick={() => (open ? close() : openList())} onKeyDown={onKey}>
        <span className={`dd-val${current ? '' : ' ph'}`}>{current ? current.label : placeholder}</span>
        <svg className="dd-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {mounted ? createPortal(panel, document.body) : null}
    </div>
  );
}
