'use client';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import '../styles/select.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parse = (v: string): { y: number; m: number; d: number } | null => {
  const x = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!x) return null;
  const y = Number(x[1]), m = Number(x[2]) - 1, d = Number(x[3]);
  const t = new Date(y, m, d);
  return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d ? { y, m, d } : null;
};
const localToday = () => { const t = new Date(); return iso(t.getFullYear(), t.getMonth(), t.getDate()); };
const show = (v: string) => { const p = parse(v); return p ? `${p.d} ${MONTHS[p.m].slice(0, 3)} ${p.y}` : ''; };
const addDays = (v: string, n: number) => { const p = parse(v)!; const t = new Date(p.y, p.m, p.d + n); return iso(t.getFullYear(), t.getMonth(), t.getDate()); };

interface Place { left: number; top?: number; bottom?: number; up: boolean }

/**
 * A date box that matches the Stoora forms: a rounded button that opens a calendar with the same soft fade and slide as the drop-downs.
 * `value` and `onChange` use the date as text, like "2026-11-15" (the same as the browser's date box), so it replaces <input type="date"> directly.
 * Days before `min` (or after `max`) are greyed out. Keyboard: arrows move by a day or a week, Page Up and Page Down change the month,
 * Enter picks, Escape closes.
 */
export function DatePicker({ id, value, onChange, min, max, placeholder = 'Choose a date', 'aria-invalid': invalid, 'aria-label': ariaLabel, className = '', style, disabled, clearable = false }: {
  id?: string; value: string; onChange: (value: string) => void; min?: string; max?: string; placeholder?: string; 'aria-invalid'?: boolean; 'aria-label'?: string;
  className?: string; style?: CSSProperties; disabled?: boolean; /** Show a "Clear" button (for a date that is optional). */ clearable?: boolean;
}) {
  const auto = useId();
  const popId = `${id ?? auto}-cal`;
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const start = parse(value) ?? parse(localToday())!;
  const [view, setView] = useState({ y: start.y, m: start.m });
  const [focusDay, setFocusDay] = useState(value || localToday());
  useEffect(() => setMounted(true), []);

  const blocked = useCallback((v: string) => (!!min && v < min) || (!!max && v > max), [min, max]);
  const close = useCallback((focus = false) => { setOpen(false); if (focus) button.current?.focus(); }, []);
  const openCal = () => {
    if (disabled) return;
    const p = parse(value) ?? parse(localToday())!;
    setView({ y: p.y, m: p.m });
    setFocusDay(value || localToday());
    setOpen(true);
  };
  const pick = (v: string) => { if (blocked(v)) return; onChange(v); close(true); };

  const measure = useCallback(() => {
    const b = button.current;
    if (!b) return;
    const r = b.getBoundingClientRect();
    const h = (pop.current?.offsetHeight ?? 360) + 12;
    const below = window.innerHeight - r.bottom - 10;
    const above = r.top - 10;
    const up = below < h && above > below;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - 308));
    setPlace(up ? { left, bottom: window.innerHeight - r.top + 6, up } : { left, top: r.bottom + 6, up });
  }, []);
  useLayoutEffect(() => { if (open) measure(); }, [open, measure, view]);
  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [open, measure]);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { const n = e.target as Node; if (!root.current?.contains(n) && !pop.current?.contains(n)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  // keep the keyboard focus on the day that is being moved to
  useEffect(() => {
    if (open) pop.current?.querySelector<HTMLElement>(`[data-day="${focusDay}"]`)?.focus({ preventScroll: true });
  }, [open, focusDay, view]);
  useEffect(() => { if (open) { const t = window.setTimeout(() => pop.current?.querySelector<HTMLElement>(`[data-day="${focusDay}"]`)?.focus({ preventScroll: true }), 40); return () => window.clearTimeout(t); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (dm: number) => setView((v) => { const t = new Date(v.y, v.m + dm, 1); return { y: t.getFullYear(), m: t.getMonth() }; });
  const moveTo = (v: string) => { const p = parse(v)!; setFocusDay(v); setView({ y: p.y, m: p.m }); };

  const onDayKey = (e: KeyboardEvent) => {
    const k = e.key;
    const map: Record<string, () => void> = {
      ArrowLeft: () => moveTo(addDays(focusDay, -1)), ArrowRight: () => moveTo(addDays(focusDay, 1)),
      ArrowUp: () => moveTo(addDays(focusDay, -7)), ArrowDown: () => moveTo(addDays(focusDay, 7)),
      PageUp: () => { const p = parse(focusDay)!; const t = new Date(p.y, p.m - 1, Math.min(p.d, 28)); moveTo(iso(t.getFullYear(), t.getMonth(), t.getDate())); },
      PageDown: () => { const p = parse(focusDay)!; const t = new Date(p.y, p.m + 1, Math.min(p.d, 28)); moveTo(iso(t.getFullYear(), t.getMonth(), t.getDate())); },
      Home: () => { const p = parse(focusDay)!; const dow = (new Date(p.y, p.m, p.d).getDay() + 6) % 7; moveTo(addDays(focusDay, -dow)); },
      End: () => { const p = parse(focusDay)!; const dow = (new Date(p.y, p.m, p.d).getDay() + 6) % 7; moveTo(addDays(focusDay, 6 - dow)); },
      Enter: () => pick(focusDay), ' ': () => pick(focusDay),
      Escape: () => close(true),
    };
    if (map[k]) { e.preventDefault(); e.stopPropagation(); map[k](); }
    if (k === 'Tab') setOpen(false);
  };
  const onButtonKey = (e: KeyboardEvent) => { if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openCal(); } };

  // the month as weeks (Monday first), with the days of the neighbouring months greyed out
  const first = new Date(view.y, view.m, 1);
  const lead = (first.getDay() + 6) % 7;
  const cells: { v: string; d: number; out: boolean }[] = [];
  for (let i = 0; i < 42; i += 1) {
    const t = new Date(view.y, view.m, 1 - lead + i);
    cells.push({ v: iso(t.getFullYear(), t.getMonth(), t.getDate()), d: t.getDate(), out: t.getMonth() !== view.m });
  }
  const rows = cells.slice(35).every((c) => c.out) ? cells.slice(0, 35) : cells;
  const today = localToday();

  const panel = (
    <div ref={pop} id={popId} className={`dd-list dp-pop${open ? ' open' : ''}${place?.up ? ' up' : ''}`} role="dialog" aria-label="Choose a date"
      style={place ? { left: place.left, top: place.top, bottom: place.bottom } : undefined} onKeyDown={onDayKey} {...(open ? {} : { inert: true, 'aria-hidden': true })}>
      <div className="dp-head">
        <button type="button" className="dp-nav" aria-label="Previous month" onClick={() => go(-1)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></button>
        <b className="dp-title" aria-live="polite">{MONTHS[view.m]} {view.y}</b>
        <button type="button" className="dp-nav" aria-label="Next month" onClick={() => go(1)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg></button>
      </div>
      <div className="dp-grid" role="grid" aria-label={`${MONTHS[view.m]} ${view.y}`}>
        {DAYS.map((d) => <span key={d} className="dp-dow" role="columnheader">{d}</span>)}
        {rows.map((c) => (
          <button key={c.v} type="button" role="gridcell" data-day={c.v} tabIndex={c.v === focusDay ? 0 : -1} disabled={blocked(c.v)} aria-selected={c.v === value} aria-current={c.v === today ? 'date' : undefined}
            className={`dp-day${c.out ? ' out' : ''}${c.v === value ? ' on' : ''}${c.v === today ? ' today' : ''}`} onClick={() => pick(c.v)}>{c.d}</button>
        ))}
      </div>
      <div className="dp-foot">
        <button type="button" className="dp-link" disabled={blocked(today)} onClick={() => pick(today)}>Today</button>
        {clearable && value ? <button type="button" className="dp-link" onClick={() => { onChange(''); close(true); }}>Clear</button> : null}
      </div>
    </div>
  );

  return (
    <div ref={root} className={`dd dp${open ? ' open' : ''} ${className}`.trim()} style={style}>
      <button ref={button} id={id} type="button" className="input dd-btn" aria-haspopup="dialog" aria-expanded={open} aria-controls={popId} aria-label={ariaLabel} aria-invalid={invalid || undefined}
        disabled={disabled} data-value={value} onClick={() => (open ? close() : openCal())} onKeyDown={onButtonKey}>
        <span className={`dd-val${value ? '' : ' ph'}`}>{value ? show(value) : placeholder}</span>
        <svg className="dp-ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></svg>
      </button>
      {mounted ? createPortal(panel, document.body) : null}
    </div>
  );
}
