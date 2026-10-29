'use client';
// The app's data. Two modes, chosen by whether Supabase keys are set (see lib/supabase/config.ts):
//   demo - a made-up shop ("Meera Studio") in this browser's localStorage. Nothing leaves the browser.
//   live - the signed-in seller's shop, the public shop page (/s/<handle>) or the buyer's orders, read and written in Supabase.
// Screens only call the functions below, so they work the same in both modes.
import { usePathname } from 'next/navigation';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from './auth';
import { demoDb } from './demo-data';
import { deriveStats } from './stats';
import { getSupabase } from './supabase/client';
import * as remote from './supabase/data';
import { useToast } from '@/components/ui';
import type { StoreConfig } from './storefront/shared';
import type { Chat, Db, Order, OrderLine, PayMethod, Product, Refund, Service, Source, Offer, Shop } from './types';

const KEY = 'stoora.demo.v1';

export interface NewOrderInput {
  buyer: string; phone?: string; city?: string; address?: string; source: Source;
  lines: { productId: string; qty: number; size?: string }[]; shipping: number; notes?: string;
  pay: 'paid' | 'upi' | 'cod'; createdBy: 'manual' | 'ai' | 'buyer';
}
export interface BuyerOrderInput { handle: string; name: string; phone: string; city: string; address: string; note?: string; pay: 'upi' | 'card' | 'cod'; lines: { productId: string; qty: number; size?: string }[]; shipping?: number }
export interface NewShopInput { name: string; handle: string; city: string; category: string; cod: boolean; online: boolean; open: boolean; look: Shop['look']; upi?: string; minimum?: string; firstProduct?: { name: string; price: number; stock: number } }

interface Store {
  mode: 'demo' | 'live';
  ready: boolean;
  /** live mode only: signed in, but no shop yet, so the person should go through store setup */
  needsShop: boolean;
  db: Db;
  product: (id: string) => Product | undefined;
  createOrder: (o: NewOrderInput) => Order;
  /** A buyer checking out on a shop page. Prices and stock are checked again by the database in live mode. */
  placeBuyerOrder: (o: BuyerOrderInput) => Promise<{ id: number }>;
  createShop: (s: NewShopInput) => Promise<string | null>;
  updateOrder: (id: number, patch: Partial<Order>) => void;
  saveProduct: (p: Product) => void;
  deleteProduct: (id: string) => Product | undefined;
  restoreProduct: (p: Product) => void;
  /** Add or change a class, session or download. */
  saveService: (s: Service) => void;
  deleteService: (id: string) => Service | undefined;
  /** Conversations (demo shop only: live shops have no chats until WhatsApp or Instagram is connected). */
  sendChatReply: (id: string, text?: string) => void;
  dismissChatDraft: (id: string) => void;
  markChatRead: (id: string) => void;
  refundOrder: (id: number, refund: Refund) => void;
  dismissIdea: (id: string) => void;
  restoreIdea: (id: string) => void;
  dismissedIdeas: string[];
  saveOffer: (o: Offer) => void;
  toggleOffer: (code: string) => void;
  setShop: (patch: Partial<Shop>) => void;
  /** Put the storefront design live (or take it offline with null). Resolves to an error message, or null when it worked. */
  publishStorefront: (config: StoreConfig | null) => Promise<string | null>;
  markBookingPaid: (id: string) => void;
  completeBooking: (id: string) => void;
  resetDemo: () => void;
  reload: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);
const PLACEHOLDER: Shop = { name: 'Your shop', owner: '', handle: '', email: '', phone: '', city: '', open: true, showPrices: true, cod: true, look: 'Warm' };
const emptyDb = (): Db => ({ shop: PLACEHOLDER, products: [], services: [], orders: [], bookings: [], chats: [], customers: [], offers: [], ideas: [], alerts: [], stats: deriveStats([]), nextOrderId: 1001 });

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const sb = getSupabase(); const live = !!sb;
  const auth = useAuth(); const toast = useToast(); const path = usePathname() || '';
  const view: 'owner' | 'public' | 'buyer' = path.startsWith('/s/') ? 'public' : path.startsWith('/buyer/') ? 'buyer' : 'owner';
  const handle = view === 'public' ? (path.split('/')[2] ?? '').toLowerCase() : '';
  const userId = auth.user?.id;

  // demo state
  const [demo, setDemo] = useState<Db>(demoDb);
  const [demoReady, setDemoReady] = useState(false);
  const [dismissedIdeas, setDismissed] = useState<string[]>([]);
  const first = useRef(true);
  // live state
  const [owner, setOwner] = useState<Db | null>(null); const [ownerLoaded, setOwnerLoaded] = useState(false);
  const [pub, setPub] = useState<Db | null>(null); const [pubHandle, setPubHandle] = useState('');
  const [buyer, setBuyer] = useState<Db | null>(null); const [buyerLoaded, setBuyerLoaded] = useState(false);

  useEffect(() => {
    if (live) return;
    try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); if (s.db?.shop) setDemo({ ...demoDb(), ...s.db }); /* keys added in later versions fall back to the sample */ if (Array.isArray(s.dismissedIdeas)) setDismissed(s.dismissedIdeas); } } catch { /* ignore */ }
    setDemoReady(true);
  }, [live]);
  useEffect(() => {
    if (live) return; if (first.current) { first.current = false; return; }
    try { localStorage.setItem(KEY, JSON.stringify({ db: demo, dismissedIdeas })); } catch { /* ignore */ }
  }, [demo, dismissedIdeas, live]);

  /* ----- live loading ----- */
  const loadOwnerNow = useCallback(async () => { if (!sb || !userId) return; try { setOwner(await remote.loadOwner(sb, userId)); } catch (e) { toast((e as Error).message, { icon: 'error' }); } finally { setOwnerLoaded(true); } }, [sb, userId, toast]);
  const loadPublicNow = useCallback(async (h: string) => { if (!sb || !h) return; try { setPub(await remote.loadPublic(sb, h)); } catch (e) { toast((e as Error).message, { icon: 'error' }); setPub(null); } finally { setPubHandle(h); } }, [sb, toast]);
  const loadBuyerNow = useCallback(async () => { if (!sb || !userId) return; try { setBuyer(await remote.loadBuyer(sb)); } catch (e) { toast((e as Error).message, { icon: 'error' }); } finally { setBuyerLoaded(true); } }, [sb, userId, toast]);

  useEffect(() => { if (live && auth.ready && !userId) { setOwner(null); setOwnerLoaded(false); setBuyer(null); setBuyerLoaded(false); } }, [live, auth.ready, userId]);
  useEffect(() => { if (live && view === 'owner' && userId) loadOwnerNow(); }, [live, view, userId, loadOwnerNow]);
  useEffect(() => { if (live && view === 'public' && handle) loadPublicNow(handle); }, [live, view, handle, loadPublicNow]);
  useEffect(() => { if (live && view === 'buyer' && userId) loadBuyerNow(); }, [live, view, userId, loadBuyerNow]);

  const db: Db = !live ? demo : view === 'public' ? pub ?? emptyDb() : view === 'buyer' ? buyer ?? emptyDb() : owner ?? emptyDb();
  const ready = !live ? demoReady : view === 'public' ? pubHandle === handle : view === 'buyer' ? (auth.ready && (!userId || buyerLoaded)) : (auth.ready && (!userId || ownerLoaded));
  const needsShop = live && view === 'owner' && !!userId && ownerLoaded && !owner;

  // every write: change the screen first, then save; if saving fails, say so and reload what is really stored
  const setDb = useCallback((fn: (d: Db) => Db) => { if (live) setOwner((o) => (o ? fn(o) : o)); else setDemo(fn); }, [live]);
  const shopId = owner?.shop.id;
  const save = useCallback((work: (client: SupabaseClient, shopId: string) => Promise<unknown>, thenReload = false) => {
    if (!sb || !shopId) return;
    work(sb, shopId).then(() => { if (thenReload) loadOwnerNow(); }).catch((e: Error) => { toast(`Couldn’t save: ${e.message}`, { icon: 'error' }); loadOwnerNow(); });
  }, [sb, shopId, toast, loadOwnerNow]);

  const dbRef = useRef(db); dbRef.current = db;
  const product = useCallback((id: string) => db.products.find((p) => p.id === id), [db.products]);

  const createOrder = useCallback((o: NewOrderInput): Order => {
    const d = dbRef.current;
    const lines: OrderLine[] = o.lines.map((l) => ({ ...l, price: d.products.find((p) => p.id === l.productId)?.price ?? 0 }));
    const total = lines.reduce((a, l) => a + l.price * l.qty, 0) + o.shipping;
    const method: PayMethod = o.pay === 'cod' ? 'cod' : 'upi';
    const created: Order = { id: d.nextOrderId, buyer: o.buyer, phone: o.phone, city: o.city, address: o.address, lines, shipping: o.shipping, total,
      paid: o.pay === 'paid', method, shipped: false, source: o.source, createdAt: 'Just now', createdIso: new Date().toISOString(), notes: o.notes, createdBy: o.createdBy };
    // Stock goes down exactly once, here.
    const products = d.products.map((p) => { const used = o.lines.filter((l) => l.productId === p.id).reduce((a, l) => a + l.qty, 0); return used ? { ...p, stock: Math.max(0, p.stock - used) } : p; });
    const next = { ...d, products, orders: [created, ...d.orders], nextOrderId: d.nextOrderId + 1 };
    dbRef.current = next; setDb(() => next);
    save((c, sid) => remote.createOwnerOrder(c, sid, created, products.filter((p, i) => p.stock !== d.products[i].stock).map((p) => ({ id: p.id, stock: p.stock }))), true);
    return created;
  }, [setDb, save]);

  const placeBuyerOrder = useCallback(async (o: BuyerOrderInput): Promise<{ id: number }> => {
    if (sb) { const r = await remote.placeOrder(sb, o); loadPublicNow(o.handle); return { id: r.orderNo }; }
    const made = createOrder({ buyer: o.name, phone: o.phone, city: o.city, address: o.address, source: 'Shop link', lines: o.lines, shipping: o.shipping ?? 0, notes: o.note, pay: o.pay === 'cod' ? 'cod' : 'upi', createdBy: 'buyer' });
    return { id: made.id };
  }, [sb, createOrder, loadPublicNow]);

  const createShop = useCallback(async (s: NewShopInput): Promise<string | null> => {
    if (!sb) {
      setDemo((d) => ({ ...d, shop: { ...d.shop, name: s.name, handle: s.handle, city: s.city, look: s.look, open: s.open, cod: s.cod },
        products: s.firstProduct ? [{ id: 'p' + Date.now(), name: s.firstProduct.name, category: 'Other', sizes: [], price: s.firstProduct.price, stock: s.firstProduct.stock, status: 'Active', soldLast30Days: 0, icon: 'sell' }, ...d.products] : d.products }));
      return null;
    }
    if (!userId) return 'Please sign in first.';
    try {
      await sb.rpc('become_seller');
      const shop = await remote.createShop(sb, userId, { name: s.name, handle: s.handle, city: s.city, category: s.category, cod: s.cod, online: s.online, open: s.open, look: s.look, upi: s.upi, ownerName: auth.user?.name, email: auth.user?.email, orderSettings: s.minimum ? { minimum: s.minimum.replace(/\D/g, '') } : {} });
      if (s.firstProduct) await remote.saveProduct(sb, shop.id!, { id: 'new', name: s.firstProduct.name, category: 'Other', sizes: [], price: s.firstProduct.price, stock: s.firstProduct.stock, status: 'Active', soldLast30Days: 0, icon: 'sell' });
      await loadOwnerNow();
      return null;
    } catch (e) { return (e as Error).message; }
  }, [sb, userId, auth.user, loadOwnerNow]);

  const value: Store = useMemo(() => ({
    mode: live ? 'live' : 'demo', ready, needsShop, db, product, createOrder, placeBuyerOrder, createShop, dismissedIdeas,
    updateOrder: (id, patch) => { setDb((d) => ({ ...d, orders: d.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) })); save((c, sid) => remote.patchOrder(c, sid, id, patch), 'paid' in patch); },
    saveProduct: (p) => {
      setDb((d) => ({ ...d, products: d.products.some((x) => x.id === p.id) ? d.products.map((x) => (x.id === p.id ? p : x)) : [p, ...d.products] }));
      save(async (c, sid) => { const saved = await remote.saveProduct(c, sid, p); setDb((d) => ({ ...d, products: d.products.map((x) => (x.id === p.id ? saved : x)) })); });
    },
    deleteProduct: (id) => { const p = db.products.find((x) => x.id === id); setDb((d) => ({ ...d, products: d.products.filter((x) => x.id !== id) })); save((c) => remote.deleteProduct(c, id)); return p; },
    saveService: (s) => {
      setDb((d) => ({ ...d, services: d.services.some((x) => x.id === s.id) ? d.services.map((x) => (x.id === s.id ? s : x)) : [...d.services, s] }));
      save(async (c, sid) => { const saved = await remote.saveService(c, sid, s); setDb((d) => ({ ...d, services: d.services.map((x) => (x.id === s.id ? saved : x)) })); });
    },
    deleteService: (id) => { const s = db.services.find((x) => x.id === id); setDb((d) => ({ ...d, services: d.services.filter((x) => x.id !== id) })); save((c) => remote.deleteService(c, id)); return s; },
    sendChatReply: (id, text) => setDb((d) => ({ ...d, chats: d.chats.map((c: Chat) => { if (c.id !== id) return c; const say = text ?? c.draft; if (!say) return c; return { ...c, msgs: [...c.msgs, ['me', say]], draft: null, last: 'You: ' + say, unread: false }; }) })),
    dismissChatDraft: (id) => setDb((d) => ({ ...d, chats: d.chats.map((c: Chat) => (c.id === id ? { ...c, draft: null } : c)) })),
    markChatRead: (id) => setDb((d) => (d.chats.some((c) => c.id === id && c.unread) ? { ...d, chats: d.chats.map((c: Chat) => (c.id === id ? { ...c, unread: false } : c)) } : d)),
    restoreProduct: (p) => { setDb((d) => ({ ...d, products: [p, ...d.products] })); save((c, sid) => remote.saveProduct(c, sid, p, true)); },
    refundOrder: (id, refund) => { setDb((d) => ({ ...d, orders: d.orders.map((o) => (o.id === id ? { ...o, refunds: [...(o.refunds ?? []), refund] } : o)) })); save((c, sid) => remote.addRefund(c, sid, id, refund), true); },
    dismissIdea: (id) => setDismissed((x) => [...x, id]),
    restoreIdea: (id) => setDismissed((x) => x.filter((y) => y !== id)),
    saveOffer: (o) => { setDb((d) => ({ ...d, offers: [o, ...d.offers.filter((x) => x.code !== o.code)] })); save((c, sid) => remote.saveOffer(c, sid, o)); },
    toggleOffer: (code) => { const on = !db.offers.find((o) => o.code === code)?.on; setDb((d) => ({ ...d, offers: d.offers.map((o) => (o.code === code ? { ...o, on: !o.on } : o)) })); save((c, sid) => remote.setOfferOn(c, sid, code, on)); },
    publishStorefront: async (config) => {
      if (!live) { setDb((d) => ({ ...d, shop: { ...d.shop, storefront: config } })); return null; }
      if (!shopId || !sb) return 'Your shop is not loaded yet.';
      try {
        const stored = await remote.publishStorefront(sb, shopId, config);
        setDb((d) => ({ ...d, shop: { ...d.shop, storefront: stored } }));
        return null;
      } catch (e) { return (e as Error).message; }
    },
    setShop: (patch) => { setDb((d) => ({ ...d, shop: { ...d.shop, ...patch } })); save((c, sid) => remote.updateShop(c, sid, patch)); },
    completeBooking: (id) => { setDb((d) => ({ ...d, bookings: d.bookings.map((b) => (b.id === id ? { ...b, status: 'Done' } : b)) })); save((c, sid) => remote.completeBooking(c, sid, id)); },
    markBookingPaid: (id) => { setDb((d) => ({ ...d, bookings: d.bookings.map((b) => (b.id === id ? { ...b, paid: true } : b)) })); save((c, sid) => remote.markBookingPaid(c, sid, id)); },
    resetDemo: () => { if (!live) { setDemo(demoDb()); setDismissed([]); } },
    reload: async () => { if (view === 'owner') await loadOwnerNow(); else if (view === 'public') await loadPublicNow(handle); else await loadBuyerNow(); },
  }), [live, ready, needsShop, db, product, createOrder, placeBuyerOrder, createShop, dismissedIdeas, setDb, save, view, handle, loadOwnerNow, loadPublicNow, loadBuyerNow]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside <StoreProvider>');
  return s;
}

export { orderFilters, moneyWaiting, type OrderFilter } from './derive';
