'use client';
// "Ask Stoora" — the assistant. One conversation, shown three ways:
// docked beside the page (≥1280px), as a full sheet on smaller screens, or as the /assistant page.
import Link from 'next/link';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ACTIONS, SUGGESTIONS, demoAnswer, shopSnapshot } from '@/lib/assistant';
import { useStore, moneyWaiting, orderFilters } from '@/lib/store';
import type { AssistantAnswer, ChartKey, Db } from '@/lib/types';
import { Button, HBars, Icon, LineChart, BarChart, SplitBar } from './ui';

type Msg = { q: string; status: 'thinking' | 'done' | 'error'; res?: AssistantAnswer; err?: string };
interface AssistantCtx { open: (q?: string) => void; close: () => void; isOpen: boolean; log: Msg[]; ask: (q: string) => void; stop: () => void; clear: () => void; busy: boolean }
const Ctx = createContext<AssistantCtx | null>(null);
export const useAssistant = () => { const c = useContext(Ctx); if (!c) throw new Error('useAssistant outside provider'); return c; };

export function useGreeting() {
  const [g, setG] = useState('Hello');
  useEffect(() => { const h = new Date().getHours(); setG(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'); }, []);
  return g;
}
export function useWide(min = 1280) {
  const [w, setW] = useState(false);
  useEffect(() => { const m = matchMedia(`(min-width:${min}px)`); const f = () => setW(m.matches); f(); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, [min]);
  return w;
}

export function chartFor(key: ChartKey, db: Db) {
  const d = db.stats.salesByDay;
  switch (key) {
    case 'sales_7d': return { title: 'Sales, last 7 days', node: <LineChart labels={d.map((x) => x.day)} values={d.map((x) => x.sales)} label="Sales over the last 7 days" /> };
    case 'orders_7d': return { title: 'Orders, last 7 days', node: <BarChart labels={d.map((x) => x.day)} values={d.map((x) => x.orders)} label="Orders per day" money={false} /> };
    case 'best_sellers': return { title: 'Best sellers, last 30 days (units)', node: <HBars rows={[...db.products].sort((a, b) => b.soldLast30Days - a.soldLast30Days).slice(0, 4).map((p) => [p.name, p.soldLast30Days])} /> };
    case 'product_views': return { title: 'People who looked at each product yesterday', node: <HBars rows={db.products.filter((p) => p.viewsYesterday).sort((a, b) => (b.viewsYesterday ?? 0) - (a.viewsYesterday ?? 0)).slice(0, 5).map((p) => [p.name, p.viewsYesterday ?? 0])} /> };
    case 'money_status': return { title: 'Money: received today vs still waiting', node: <SplitBar parts={[['Received today', db.stats.receivedToday, 'ok'], ['Still waiting', moneyWaiting(db).reduce((a, x) => a + x.amount, 0), 'warn']]} /> };
    case 'order_status': return { title: 'Your orders right now', node: <SplitBar fmt={String} parts={[['Done', db.orders.filter(orderFilters.Done).length, 'ok'], ['To ship', db.orders.filter(orderFilters['To ship']).length, 'neutral'], ['Not paid yet', db.orders.filter(orderFilters.Unpaid).length, 'warn']]} /> };
    case 'order_sources': return { title: 'Where orders came from, last 30 days', node: <HBars rows={Object.entries(db.stats.sourcesPercent)} fmt={(v) => v + '%'} /> };
  }
}

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const { db } = useStore();
  const [isOpen, setOpen] = useState(false);
  const [log, setLog] = useState<Msg[]>([]);
  const ctl = useRef<AbortController | null>(null);
  const logRef = useRef(log); logRef.current = log;
  const dbRef = useRef(db); dbRef.current = db;

  const ask = useCallback(async (raw: string) => {
    const q = raw.trim(); if (!q || logRef.current.some((m) => m.status === 'thinking')) return;
    setLog((l) => [...l, { q, status: 'thinking' }]);
    ctl.current = new AbortController();
    const finish = (m: Partial<Msg>) => setLog((l) => l.map((x, i) => (i === l.length - 1 ? { ...x, ...m } : x)));
    try {
      const history = logRef.current.filter((m) => m.status === 'done' && m.res?.mode === 'ai').slice(-3).map((m) => ({ q: m.q, a: m.res?.answer }));
      const r = await fetch('/api/assistant', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: q, history, snapshot: shopSnapshot(dbRef.current) }), signal: ctl.current.signal });
      if (r.status === 503) { finish({ status: 'done', res: demoAnswer(q, dbRef.current) }); return; } // live AI not configured → labelled demo answer
      const j = await r.json().catch(() => null);
      if (!r.ok || !j) throw new Error(j?.error ?? 'failed');
      finish({ status: 'done', res: j as AssistantAnswer });
    } catch (e) {
      if ((e as Error).name === 'AbortError') { finish({ status: 'error', err: 'You stopped this answer.' }); return; }
      finish({ status: 'error', err: 'Stoora couldn’t answer just now. Check your connection and try again.' });
    }
  }, []);

  const open = useCallback((q?: string) => { setOpen(true); if (q) ask(q); else setTimeout(() => document.getElementById('ask-q')?.focus(), 60); }, [ask]);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') { e.preventDefault(); setOpen((o) => !o); } };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, []);
  const busy = log.some((m) => m.status === 'thinking');
  return <Ctx.Provider value={{ open, close, isOpen, log, ask, busy, stop: () => ctl.current?.abort(), clear: () => setLog([]) }}>{children}</Ctx.Provider>;
}

/** Docked panel (wide) or full sheet (narrow). Hidden on the /assistant page, which shows the chat itself. */
export function AssistantPanel({ onPage }: { onPage: boolean }) {
  const a = useAssistant(); const wide = useWide();
  useEffect(() => { document.body.classList.toggle('docked', a.isOpen && wide && !onPage); return () => document.body.classList.remove('docked'); }, [a.isOpen, wide, onPage]);
  useEffect(() => {
    if (!a.isOpen || wide) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') a.close(); };
    document.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [a, wide]);
  if (!a.isOpen || onPage) return null;
  if (wide) return <aside className="askdock" aria-label="Ask Stoora"><AssistantChat /></aside>;
  return (<><div className="scrim" onClick={a.close} /><div className="sheet full" role="dialog" aria-modal="true" aria-label="Ask Stoora"><AssistantChat /></div></>);
}

export function AssistantChat({ page }: { page?: boolean }) {
  const a = useAssistant(); const { db } = useStore(); const greet = useGreeting();
  const [text, setText] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' }); }, [a.log]);
  return (
    <div className="askpanel">
      <div className="sheet-h" style={{ borderBottom: '1px solid var(--line-soft)' }}>
        <span className="smark" aria-hidden="true">S</span>
        <div className="grow"><h2 className="ct">Stoora</h2><p className="cap">Answers from {db.shop.name}’s data</p></div>
        {a.log.length > 0 && <Button kind="quiet" small onClick={a.clear} disabled={a.busy}>New chat</Button>}
        {!page && <><Link className="ibtn flat only-wide" href="/assistant" aria-label="Open full page" title="Open full page"><Icon name="open_in_full" size="sm" /></Link>
          <button className="ibtn flat" onClick={a.close} aria-label="Close assistant"><Icon name="close" /></button></>}
      </div>
      <div className="sheet-b" ref={box} aria-live="polite" style={{ paddingTop: 'var(--s3)', display: 'grid', gap: 'var(--s3)', alignContent: 'start' }}>
        {!a.log.length && (
          <>
            <div className="stack tight"><p className="t-ink" style={{ fontWeight: 500 }}>{greet}, {db.shop.owner}. What would you like to know?</p><p className="t-soft">Ask in your own words. I answer from your shop’s orders, payments, products and chats, and I tell you when I don’t have the numbers.</p></div>
            <div className="stack tight">{SUGGESTIONS.map((s) => <button key={s} className="trow" onClick={() => a.ask(s)}><span className="grow t-soft">{s}</span><Icon name="arrow_forward" size="sm" className="t-cap" /></button>)}</div>
          </>
        )}
        {a.log.map((m, i) => (
          <div className="ans" key={i}>
            <div className="qbubble">{m.q}</div>
            <div className="abox">
              <div className="who"><span className="smark xs" aria-hidden="true">S</span>Stoora</div>
              {m.status === 'thinking' && <div className="row"><span className="typing" aria-label="Stoora is working"><i /><i /><i /></span><span className="cap grow">Reading your shop data…</span><Button kind="quiet" small onClick={a.stop}>Stop</Button></div>}
              {m.status === 'error' && <><div className="banner warn"><Icon name="error" /><span>{m.err}</span></div><div><Button small icon="refresh" onClick={() => a.ask(m.q)}>Try again</Button></div></>}
              {m.status === 'done' && m.res && <Answer res={m.res} db={db} onNav={() => { if (!page && window.innerWidth < 1280) a.close(); }} />}
            </div>
          </div>
        ))}
      </div>
      <form className="askbox" style={{ margin: 'var(--s2) var(--s3) var(--s3)' }} onSubmit={(e) => { e.preventDefault(); if (!text.trim() || a.busy) return; const q = text; setText(''); a.ask(q); }}>
        <label className="sr" htmlFor="ask-q">Ask Stoora</label>
        <textarea id="ask-q" rows={1} placeholder="Ask about sales, orders, payments…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
        <div className="tools"><span className="cap grow">Stoora suggests. You decide.</span><button className="go" type="submit" aria-label="Ask" disabled={a.busy || !text.trim()}><Icon name="arrow_upward" size="sm" /></button></div>
      </form>
    </div>
  );
}

function Answer({ res, db, onNav }: { res: AssistantAnswer; db: Db; onNav: () => void }) {
  const chart = res.chart ? chartFor(res.chart, db) : null;
  return (
    <>
      <p className="a-main">{res.answer}</p>
      {res.facts.length > 0 && <ul className="a-facts">{res.facts.map((f) => <li key={f}>{f}</li>)}</ul>}
      {chart && <div className="a-chart"><p className="label">{chart.title}</p>{chart.node}{res.chartNote && <p className="cap">{res.chartNote}</p>}</div>}
      {(res.next || res.action) && <div className="a-next"><span className="label"><Icon name="arrow_forward" size="xs" />Next step</span>{res.next && <p className="t-soft">{res.next}</p>}{res.action && <Link className="btn ink sm" href={ACTIONS[res.action].href} onClick={onNav}>{ACTIONS[res.action].label}</Link>}</div>}
      <p className="a-src">{res.mode === 'demo'
        ? <><Icon name="science" size="xs" />Demo answer, worked out from the sample shop’s numbers. Live AI isn’t connected yet.</>
        : <><Icon name="auto_awesome" size="xs" />Written by Stoora from your shop’s data. Check important numbers before acting.</>}</p>
    </>
  );
}
