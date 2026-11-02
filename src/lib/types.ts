import type { StoreConfig } from './storefront/shared';

// Data shapes the UI needs. The real Stoora API should return these (or be mapped to them in api.ts).

export type Source = 'WhatsApp' | 'Instagram' | 'Shop link' | 'In person' | 'Phone call' | 'Other';
export type PayMethod = 'upi' | 'cod' | 'cash';

export interface Product {
  id: string;
  name: string;
  /** The shop's own category name (picked from the shop's categories, or a new short name). */
  category: string;
  color?: string;
  /** Sizes the buyer can pick. Stock for each one is in `optionStock`. */
  sizes: string[];
  /** Other colours the product comes in (the main colour stays in `color`). */
  colors?: string[];
  /** Stock for each size (or, when there are no sizes, each colour). When set, `stock` is their total. */
  optionStock?: Record<string, number>;
  material?: string;
  /** Grams. Used for shipping. */
  weightGrams?: number;
  /** Box size in cm, worked out by AI and used for shipping. Never shown on the form. */
  boxCm?: { l: number; w: number; h: number };
  /** Search words from AI. Never shown on the form. */
  tags?: string[];
  /** Set by Stoora (shop handle + running number, like SHAURYA-0001). Read-only. */
  productNumber?: string;
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
  /** What the seller chose to add. A workshop and a class are both type 'Class'; a session is '1-on-1'. */
  kind?: 'workshop' | 'class' | 'session' | 'digital';
  /** A workshop's date (YYYY-MM-DD). */
  date?: string;
  /** Classes and sessions: the weekdays they run. */
  days?: string[];
  /** The time slots, like '7:00 am'. A workshop has one. */
  times?: string[];
  /** Seats in a workshop or a class. */
  seats?: number;
  /** Online, At my studio, At buyer's home. */
  place?: string;
  /** A download: the file buyers receive (kept privately; never shown on the shop page). */
  fileName?: string;
  filePath?: string;
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
  /** UPI ID buyers pay to (private: the public shop page only learns that one is set). */
  upi?: string;
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
