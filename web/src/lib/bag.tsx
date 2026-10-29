'use client';
// Bag and wishlist for the buyer storefront. Kept in this browser (localStorage) in demo mode.
// API_TODO: POST /api/public/:shop/cart (prices, stock and delivery are always worked out on the server).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useStore } from './store';
import type { Product } from './types';

export interface BagLine { productId: string; size?: string; qty: number }
const KEY = 'stoora.bag.v1';
export const FREE_DELIVERY_OVER = 1500;
export const DELIVERY_FEE = 60;

interface BagCtx {
  lines: BagLine[]; wish: string[]; ready: boolean;
  add: (productId: string, size?: string, qty?: number) => void;
  setQty: (index: number, qty: number) => void;
  remove: (index: number) => void;
  clear: () => void;
  toggleWish: (productId: string) => void;
  detailed: { line: BagLine; product: Product; index: number }[];
  count: number; subtotal: number; delivery: number; total: number;
}
const Ctx = createContext<BagCtx | null>(null);

export function BagProvider({ children }: { children: React.ReactNode }) {
  const { db } = useStore();
  const [lines, setLines] = useState<BagLine[]>([]);
  const [wish, setWish] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) { setLines(s.lines ?? []); setWish(s.wish ?? []); } } catch { /* ignore */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(KEY, JSON.stringify({ lines, wish })); } catch { /* ignore */ } }, [lines, wish, ready]);

  const add = useCallback((productId: string, size?: string, qty = 1) => setLines((l) => {
    const i = l.findIndex((x) => x.productId === productId && x.size === size);
    return i >= 0 ? l.map((x, n) => (n === i ? { ...x, qty: Math.min(10, x.qty + qty) } : x)) : [...l, { productId, size, qty }];
  }), []);
  const setQty = useCallback((index: number, qty: number) => setLines((l) => l.map((x, n) => (n === index ? { ...x, qty: Math.max(1, Math.min(10, qty)) } : x))), []);
  const remove = useCallback((index: number) => setLines((l) => l.filter((_, n) => n !== index)), []);
  const clear = useCallback(() => setLines([]), []);
  const toggleWish = useCallback((id: string) => setWish((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id])), []);

  const value = useMemo<BagCtx>(() => {
    const detailed = lines
      .map((line, index) => ({ line, index, product: db.products.find((p) => p.id === line.productId) }))
      .filter((x): x is { line: BagLine; index: number; product: Product } => !!x.product);
    const subtotal = detailed.reduce((a, d) => a + d.product.price * d.line.qty, 0);
    const delivery = subtotal === 0 || subtotal >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE;
    return { lines, wish, ready, add, setQty, remove, clear, toggleWish, detailed, count: detailed.reduce((a, d) => a + d.line.qty, 0), subtotal, delivery, total: subtotal + delivery };
  }, [lines, wish, ready, db.products, add, setQty, remove, clear, toggleWish]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useBag() { const c = useContext(Ctx); if (!c) throw new Error('useBag must be used inside <BagProvider>'); return c; }
