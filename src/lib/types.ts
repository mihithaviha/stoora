import type { StoreConfig } from './storefront/shared';

// Data shapes the UI needs. The real Stoora API should return these (or be mapped to them in api.ts).

export type Source = 'WhatsApp' | 'Instagram' | 'Shop link' | 'In person' | 'Phone call' | 'Other';
export type PayMethod = 'upi' | 'cod' | 'cash';

export interface Product {
  id: string;
  name: string;
  category: 'Kurtas' | 'Dupattas' | 'Other';
  color?: string;
  sizes: string[];
  price: number;
  comparePrice?: number;
  stock: number;
  status: 'Active' | 'Draft';
  soldLast30Days: number;
  viewsYesterday?: number;
  icon: string;
  description?: string;
  photos?: string[]; // data URLs in demo mode; storage URLs in production
  /** What one item costs the seller to make or buy (optional, only the seller sees it). */
  cost?: number;
}

export interface Service {
  id: string;
  name: string;
  type: 'Class' | '1-on-1' | 'Digital';
  price: number;
  minutes: number;
  next: string;
  icon: string;
}

export interface OrderLine { productId: string; qty: number; size?: string; price: number }

export interface Order {
  id: number;
  buyer: string;
  phone?: string;
  city?: string;
  address?: string;
  lines: OrderLine[];
  shipping: number;
  total: number;
  paid: boolean;
  method: PayMethod;
  shipped: boolean;
  courier?: string;
  tracking?: string;
  source: Source;
  createdAt: string; // display string in demo mode; ISO in production
  notes?: string;
  createdBy: 'buyer' | 'manual' | 'ai';
  refunds?: Refund[];
  createdIso?: string; // live mode: the real timestamp behind createdAt
  shopName?: string; shopHandle?: string; // live mode, buyer view: which shop it was bought from
}

export interface Refund { amount: number; reason: string; when: string; notified: boolean; createdIso?: string }

export interface Booking { id: string; buyer: string; serviceId: string; when: string; day: string; paid: boolean; status: 'Upcoming' | 'Done' }

export interface Customer { id: string; name: string; phone: string; city: string; source: Source; orders: number; spent: number; lastOrder: string }

export interface Offer { code: string; what: string; used: number; ends: string; on: boolean }

export interface Idea { id: string; text: string; earn: number; cost: number; action: string; done: string; icon: string }

export interface Alert { id: string; icon: string; title: string; detail: string; when: string; href: string }

export interface Shop {
  name: string; owner: string; handle: string; email: string; phone: string; city: string; open: boolean; showPrices: boolean; cod: boolean; look: 'Warm' | 'Indigo' | 'Plain';
  // live mode only
  id?: string; online?: boolean; tagline?: string; orderSettings?: Record<string, string>;
  whatsappNumber?: string; whatsappVerified?: boolean; showWhatsapp?: boolean;
  /** The storefront design the seller chose (template, theme, texts, sections). Empty until they pick one. */
  storefront?: StoreConfig | null;
}

export interface Stats {
  salesToday: number; salesYesterday: number; ordersYesterday: number;
  visitsToday: number; visitsYesterday: number;
  receivedToday: number; receivedWeek: number; receivedMonth: number;
  refundsWeek: number; refundsMonth: number;
  salesByDay: { day: string; sales: number; orders: number; visits: number }[];
  salesByWeek: { week: string; sales: number; orders: number }[];
  sourcesPercent: Record<string, number>;
  payout: { amount: number; date: string; to: string };
  pastPayouts: { date: string; amount: number }[];
}

/** A buyer's conversation on WhatsApp or Instagram, with the reply Stoora drafted (if any) for the seller to check. */
export interface Chat {
  id: string; who: string; mood: 'ready' | 'upset' | 'look'; src: Source; last: string; time: string; unread: boolean;
  msgs: ['them' | 'me', string][]; draft: string | null;
}

export interface Db {
  shop: Shop; products: Product[]; services: Service[]; orders: Order[]; bookings: Booking[]; chats: Chat[];
  customers: Customer[]; offers: Offer[]; ideas: Idea[]; alerts: Alert[]; stats: Stats;
  nextOrderId: number;
}

// AI assistant answer shape (returned by /api/assistant, or computed in demo mode)
export type ChartKey = 'sales_7d' | 'orders_7d' | 'best_sellers' | 'product_views' | 'money_status' | 'order_status' | 'order_sources';
export type ActionKey = 'open_orders_to_ship' | 'open_unpaid' | 'review_messages' | 'open_money' | 'open_products' | 'create_order' | 'open_analytics' | 'open_bookings';
export interface AssistantAnswer { answer: string; facts: string[]; chart: ChartKey | null; chartNote: string | null; next: string | null; action: ActionKey | null; mode: 'ai' | 'demo' }

// AI order extraction shape (returned by /api/extract-order)
export interface ExtractedOrder {
  customer: { name: string | null; phone: string | null };
  items: { said: string; matches: string[]; sure: boolean; size: string | null; qty: number | null }[];
  delivery: { city: string | null; address: string | null };
  payment: { method: 'upi' | 'cod' | 'cash' | null; buyerSaysPaid: boolean; said: string | null };
  notes: string | null;
  questions: string[];
  excerpts: string[];
}
