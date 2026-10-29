'use client';
// App state for DEMO MODE. Every write goes through one function here, so each can be
// swapped for the matching real API call (see API_TODO below) without touching the screens.
//
// API_TODO (endpoints the real backend must provide — none are assumed to exist yet):
//   GET  /api/shop                 PATCH /api/shop
//   GET  /api/orders?status=&q=    GET /api/orders/:id     POST /api/orders     PATCH /api/orders/:id
//   GET  /api/products             POST /api/products      PATCH /api/products/:id   DELETE /api/products/:id
//   GET  /api/chats                POST /api/chats/:id/messages   (WhatsApp / Instagram send)
//   GET  /api/customers            GET /api/bookings       GET /api/money/summary    GET /api/analytics
//   GET  /api/offers               POST /api/offers        PATCH /api/offers/:code
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { demoDb } from './demo-data';
import type { Db, Order, OrderLine, PayMethod, Product, Source, Offer, Shop } from './types';

const KEY = 'stoora.demo.v1';

export interface NewOrderInput {
  buyer: string; phone?: string; city?: string; address?: string; source: Source;
  lines: { productId: string; qty: number; size?: string }[]; shipping: number; notes?: string;
  pay: 'paid' | 'upi' | 'cod'; createdBy: 'manual' | 'ai';
}

interface Store {
  ready: boolean;
  db: Db;
  product: (id: string) => Product | undefined;
  createOrder: (o: NewOrderInput) => Order;
  updateOrder: (id: number, patch: Partial<Order>) => void;
  saveProduct: (p: Product) => void;
  deleteProduct: (id: string) => Product | undefined;
  restoreProduct: (p: Product) => void;
  sendMessage: (chatId: string, text: string) => void;
  setDraft: (chatId: string, draft: string | undefined) => void;
  dismissIdea: (id: string) => void;
  restoreIdea: (id: string) => void;
  dismissedIdeas: string[];
  saveOffer: (o: Offer) => void;
  toggleOffer: (code: string) => void;
  setShop: (patch: Partial<Shop>) => void;
  markBookingPaid: (id: string) => void;
  resetDemo: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Db>(demoDb);
  const [dismissedIdeas, setDismissed] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const first = useRef(true);

  // Load the saved demo state (this browser only). Shows loading skeletons until done.
  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); if (s.db?.shop) setDb(s.db); if (Array.isArray(s.dismissedIdeas)) setDismissed(s.dismissedIdeas); } } catch { /* storage blocked: keep defaults */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    try { localStorage.setItem(KEY, JSON.stringify({ db, dismissedIdeas })); } catch { /* ignore */ }
  }, [db, dismissedIdeas]);

  const product = useCallback((id: string) => db.products.find((p) => p.id === id), [db.products]);

  const dbRef = useRef(db);
  dbRef.current = db;
  const createOrder = useCallback((o: NewOrderInput): Order => {
    const d = dbRef.current;
    const lines: OrderLine[] = o.lines.map((l) => ({ ...l, price: d.products.find((p) => p.id === l.productId)?.price ?? 0 }));
    const total = lines.reduce((a, l) => a + l.price * l.qty, 0) + o.shipping;
    const method: PayMethod = o.pay === 'cod' ? 'cod' : 'upi';
    const created: Order = { id: d.nextOrderId, buyer: o.buyer, phone: o.phone, city: o.city, address: o.address, lines, shipping: o.shipping, total,
      paid: o.pay === 'paid', method, shipped: false, source: o.source, createdAt: 'Just now', notes: o.notes, createdBy: o.createdBy };
    // Stock goes down exactly once, here. (If the real API adjusts stock itself, remove this.)
    const products = d.products.map((p) => { const used = o.lines.filter((l) => l.productId === p.id).reduce((a, l) => a + l.qty, 0); return used ? { ...p, stock: Math.max(0, p.stock - used) } : p; });
    const next = { ...d, products, orders: [created, ...d.orders], nextOrderId: d.nextOrderId + 1 };
    dbRef.current = next;
    setDb(next);
    return created;
  }, []);

  const value: Store = useMemo(() => ({
    ready, db, product, createOrder, dismissedIdeas,
    updateOrder: (id, patch) => setDb((d) => ({ ...d, orders: d.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
    saveProduct: (p) => setDb((d) => ({ ...d, products: d.products.some((x) => x.id === p.id) ? d.products.map((x) => (x.id === p.id ? p : x)) : [p, ...d.products] })),
    deleteProduct: (id) => { const p = db.products.find((x) => x.id === id); setDb((d) => ({ ...d, products: d.products.filter((x) => x.id !== id) })); return p; },
    restoreProduct: (p) => setDb((d) => ({ ...d, products: [p, ...d.products] })),
    sendMessage: (chatId, text) => setDb((d) => ({ ...d, chats: d.chats.map((c) => (c.id === chatId ? { ...c, unread: false, last: text, messages: [...c.messages, { from: 'me', text, time: 'Now' }] } : c)) })),
    setDraft: (chatId, draft) => setDb((d) => ({ ...d, chats: d.chats.map((c) => (c.id === chatId ? { ...c, draft } : c)) })),
    dismissIdea: (id) => setDismissed((x) => [...x, id]),
    restoreIdea: (id) => setDismissed((x) => x.filter((y) => y !== id)),
    saveOffer: (o) => setDb((d) => ({ ...d, offers: [o, ...d.offers.filter((x) => x.code !== o.code)] })),
    toggleOffer: (code) => setDb((d) => ({ ...d, offers: d.offers.map((o) => (o.code === code ? { ...o, on: !o.on } : o)) })),
    setShop: (patch) => setDb((d) => ({ ...d, shop: { ...d.shop, ...patch } })),
    markBookingPaid: (id) => setDb((d) => ({ ...d, bookings: d.bookings.map((b) => (b.id === id ? { ...b, paid: true } : b)) })),
    resetDemo: () => { setDb(demoDb()); setDismissed([]); },
  }), [ready, db, product, createOrder, dismissedIdeas]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside <StoreProvider>');
  return s;
}

export { orderFilters, moneyWaiting, type OrderFilter } from './derive';
