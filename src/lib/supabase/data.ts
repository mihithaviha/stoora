'use client';
// Reads and writes shop data in Supabase, in the same shapes the screens already use (src/lib/types.ts).
// Table and column names are defined in supabase/migrations/*_init.sql.
import type { StoreConfig } from '../storefront/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import { deriveStats, labelOf } from '../stats';
import type { Booking, Customer, Db, Offer, Order, Product, Refund, Service, Shop } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID.test(s);
const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message); };

/* ---------- row <-> app shapes ---------- */
export const shopFromRow = (r: Row): Shop => ({ id: r.id, name: r.name, owner: r.owner_name ?? '', handle: r.handle, email: r.email ?? '', phone: r.phone ?? '', city: r.city ?? '', open: r.is_open, showPrices: r.show_prices, cod: r.accepts_cod, online: r.accepts_online, look: r.look, tagline: r.tagline ?? '', orderSettings: r.order_settings ?? {}, whatsappNumber: r.whatsapp_number ?? '', whatsappVerified: !!r.whatsapp_verified, showWhatsapp: r.show_whatsapp_button, storefront: r.storefront ?? null });
const publicShopFromRow = (r: Row): Shop => ({ id: r.id, name: r.name, owner: '', handle: r.handle, email: '', phone: '', city: r.city ?? '', open: r.is_open, showPrices: r.show_prices, cod: r.accepts_cod, online: r.accepts_online, look: r.look, tagline: r.tagline ?? '', orderSettings: r.closed_note ? { closedNote: r.closed_note } : {}, whatsappNumber: r.whatsapp_number ?? '', whatsappVerified: !!r.whatsapp_number, showWhatsapp: !!r.whatsapp_number, storefront: r.storefront ?? null });
export const productFromRow = (r: Row): Product => ({ id: r.id, name: r.name, category: r.category, color: r.color ?? undefined, sizes: r.sizes ?? [], price: r.price, comparePrice: r.compare_price ?? undefined, stock: r.stock, status: r.status, soldLast30Days: r.sold_last_30 ?? 0, viewsYesterday: r.views_yesterday ?? 0, icon: r.icon ?? 'sell', description: r.description ?? undefined, photos: r.photos ?? [], cost: r.cost ?? undefined });
const serviceFromRow = (r: Row): Service => ({ id: r.id, name: r.name, type: r.type, price: r.price, minutes: r.minutes, next: r.next_slot ?? '', icon: r.icon });
const customerFromRow = (r: Row): Customer => ({ id: r.id, name: r.name, phone: r.phone ?? '—', city: r.city ?? '', source: r.source, orders: r.orders_count, spent: r.spent, lastOrder: r.last_order_at ? labelOf(r.last_order_at).split(',')[0] : '—' });
const bookingFromRow = (r: Row): Booking => ({ id: r.ref, buyer: r.buyer_name, serviceId: r.service_id ?? '', when: r.when_label, day: r.day_label ?? r.when_label, paid: r.paid, status: r.status });
const offerFromRow = (r: Row): Offer => ({ code: r.code, what: r.what, used: r.used, ends: r.ends_label, on: r.is_on });
export const orderFromRow = (r: Row): Order => ({
  id: r.order_no, buyer: r.buyer_name, phone: r.phone ?? undefined, city: r.city ?? undefined, address: r.address ?? undefined,
  lines: (r.order_lines ?? []).map((l: Row) => ({ productId: l.product_id ?? '', qty: l.qty, size: l.size ?? undefined, price: l.price })),
  shipping: r.shipping, total: r.total, paid: r.paid, method: r.method === 'card' ? 'upi' : r.method, shipped: r.shipped, courier: r.courier ?? undefined, tracking: r.tracking ?? undefined,
  source: r.source, createdAt: labelOf(r.created_at), createdIso: r.created_at, notes: r.notes ?? undefined, createdBy: r.created_by,
  refunds: (r.refunds ?? []).map((f: Row): Refund => ({ amount: f.amount, reason: f.reason, when: labelOf(f.created_at), notified: f.notified, createdIso: f.created_at })),
});

const emptyDb = (shop: Shop, parts: Partial<Db> = {}): Db => ({
  shop, products: [], services: [], orders: [], bookings: [], chats: [], customers: [], offers: [], ideas: [], alerts: [], stats: deriveStats([]), nextOrderId: 1001, ...parts,
});

/* ---------- loading ---------- */
/** Everything the seller dashboard needs for the signed-in person's shop. null = they have no shop yet (send them to setup). */
export async function loadOwner(sb: SupabaseClient, userId: string): Promise<Db | null> {
  let { data: shop } = await sb.from('shops').select('*').eq('owner_id', userId).maybeSingle();
  if (!shop) {
    const { data: m } = await sb.from('shop_members').select('shop_id').eq('user_id', userId).maybeSingle();
    if (m) ({ data: shop } = await sb.from('shops').select('*').eq('id', m.shop_id).maybeSingle());
  }
  if (!shop) return null;
  const id = shop.id;
  const [products, services, orders, bookings, customers, offers] = await Promise.all([
    sb.from('products').select('*').eq('shop_id', id).order('created_at', { ascending: false }),
    sb.from('services').select('*').eq('shop_id', id).order('created_at'),
    sb.from('orders').select('*, order_lines(*), refunds(*)').eq('shop_id', id).order('created_at', { ascending: false }).limit(500),
    sb.from('bookings').select('*').eq('shop_id', id).order('created_at'),
    sb.from('customers').select('*').eq('shop_id', id).order('last_order_at', { ascending: false, nullsFirst: false }),
    sb.from('offers').select('*').eq('shop_id', id).order('code'),
  ]);
  [products, services, orders, bookings, customers, offers].forEach((r) => fail(r.error));
  const orderList = (orders.data ?? []).map(orderFromRow);
  return emptyDb(shopFromRow(shop), {
    products: (products.data ?? []).map(productFromRow), services: (services.data ?? []).map(serviceFromRow), orders: orderList, bookings: (bookings.data ?? []).map(bookingFromRow),
    customers: (customers.data ?? []).map(customerFromRow), offers: (offers.data ?? []).map(offerFromRow), stats: deriveStats(orderList), nextOrderId: shop.next_order_no,
  });
}

/** What a buyer sees at /s/<handle>: the public shop row, live products and services. null = no such shop. */
export async function loadPublic(sb: SupabaseClient, handle: string): Promise<Db | null> {
  const { data: shop } = await sb.from('public_shops').select('*').eq('handle', handle.toLowerCase()).maybeSingle();
  if (!shop) return null;
  const [products, services] = await Promise.all([sb.from('products').select('*').eq('shop_id', shop.id).eq('status', 'Active').order('created_at', { ascending: false }), sb.from('services').select('*').eq('shop_id', shop.id)]);
  fail(products.error); fail(services.error);
  return emptyDb(publicShopFromRow(shop), { products: (products.data ?? []).map(productFromRow), services: (services.data ?? []).map(serviceFromRow) });
}

/** The signed-in buyer's own orders (row level security limits the rows), with the products they bought. */
export async function loadBuyer(sb: SupabaseClient): Promise<Db> {
  const { data, error } = await sb.from('orders').select('*, order_lines(*), refunds(*)').order('created_at', { ascending: false }).limit(200);
  fail(error);
  const rows = data ?? [];
  const shopIds = Array.from(new Set(rows.map((r) => r.shop_id)));
  const productIds = Array.from(new Set(rows.flatMap((r) => (r.order_lines ?? []).map((l: Row) => l.product_id).filter(Boolean))));
  const [shops, products] = await Promise.all([
    shopIds.length ? sb.from('public_shops').select('id, name, handle, city').in('id', shopIds) : Promise.resolve({ data: [] as Row[], error: null }),
    productIds.length ? sb.from('products').select('*').in('id', productIds) : Promise.resolve({ data: [] as Row[], error: null }),
  ]);
  const byShop = new Map((shops.data ?? []).map((s: Row) => [s.id, s]));
  const orders = rows.map((r) => ({ ...orderFromRow(r), shopName: byShop.get(r.shop_id)?.name as string | undefined, shopHandle: byShop.get(r.shop_id)?.handle as string | undefined }));
  const first = rows[0] ? byShop.get(rows[0].shop_id) : null;
  return emptyDb({ name: first?.name ?? 'your shop', owner: '', handle: first?.handle ?? '', email: '', phone: '', city: first?.city ?? '', open: true, showPrices: true, cod: true, look: 'Warm' }, { orders, products: (products.data ?? []).map(productFromRow) });
}

/* ---------- shop owner writes ---------- */
async function uploadPhotos(sb: SupabaseClient, shopId: string, photos: string[]): Promise<string[]> {
  return Promise.all(photos.map(async (src) => {
    if (!src.startsWith('data:')) return src;
    const blob = await (await fetch(src)).blob();
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${shopId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from('product-images').upload(path, blob, { contentType: blob.type, upsert: false });
    fail(error);
    return sb.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  }));
}
/** Publish the storefront design (photos are uploaded first), or take it offline with null. Returns what was stored. */
export async function publishStorefront(sb: SupabaseClient, shopId: string, config: StoreConfig | null): Promise<StoreConfig | null> {
  let stored = config;
  if (config) {
    const [logo, hero, about] = await uploadPhotos(sb, shopId, [config.brand.logo, config.hero.image, config.about.image].map((x) => x || ''));
    stored = { ...config, brand: { ...config.brand, logo }, hero: { ...config.hero, image: hero }, about: { ...config.about, image: about } };
  }
  fail((await sb.from('shops').update({ storefront: stored }).eq('id', shopId)).error);
  return stored;
}
const productRow = (p: Product, shopId: string, photos: string[]): Row => ({ shop_id: shopId, name: p.name, category: p.category, color: p.color ?? null, sizes: p.sizes, price: p.price, compare_price: p.comparePrice ?? null, stock: p.stock, status: p.status, icon: p.icon, description: p.description ?? null, cost: p.cost ?? null, photos, updated_at: new Date().toISOString() });

/** Insert or update a product. Returns it with its real id (new products get one from the database). */
export async function saveProduct(sb: SupabaseClient, shopId: string, p: Product, restore = false): Promise<Product> {
  const photos = await uploadPhotos(sb, shopId, p.photos ?? []);
  const row = productRow(p, shopId, photos);
  const q = isUuid(p.id) && !restore ? sb.from('products').update(row).eq('id', p.id).select().single() : sb.from('products').insert(restore && isUuid(p.id) ? { id: p.id, ...row } : row).select().single();
  const { data, error } = await q; fail(error);
  return productFromRow(data!);
}
const serviceRow = (s: Service, shopId: string): Row => ({ shop_id: shopId, name: s.name, type: s.type, price: s.price, minutes: s.minutes, next_slot: s.next || null, icon: s.icon });

/** Insert or update a service. Returns it with its real id (new services get one from the database). */
export async function saveService(sb: SupabaseClient, shopId: string, s: Service): Promise<Service> {
  const row = serviceRow(s, shopId);
  const q = isUuid(s.id) ? sb.from('services').update(row).eq('id', s.id).select().single() : sb.from('services').insert(row).select().single();
  const { data, error } = await q; fail(error);
  return serviceFromRow(data!);
}
export async function deleteService(sb: SupabaseClient, id: string) { if (isUuid(id)) fail((await sb.from('services').delete().eq('id', id)).error); }
export async function deleteProduct(sb: SupabaseClient, id: string) { if (isUuid(id)) fail((await sb.from('products').delete().eq('id', id)).error); }

export async function updateShop(sb: SupabaseClient, shopId: string, patch: Partial<Shop>) {
  const row: Row = {};
  const map: [keyof Shop, string][] = [['name', 'name'], ['handle', 'handle'], ['owner', 'owner_name'], ['email', 'email'], ['phone', 'phone'], ['city', 'city'], ['open', 'is_open'], ['showPrices', 'show_prices'], ['cod', 'accepts_cod'], ['online', 'accepts_online'], ['look', 'look'], ['tagline', 'tagline'], ['orderSettings', 'order_settings'], ['whatsappNumber', 'whatsapp_number'], ['showWhatsapp', 'show_whatsapp_button'], ['storefront', 'storefront']];
  map.forEach(([k, col]) => { if (k in patch) row[col] = patch[k]; });
  if (Object.keys(row).length) fail((await sb.from('shops').update(row).eq('id', shopId)).error);
}

export async function createShop(sb: SupabaseClient, ownerId: string, s: { name: string; handle: string; city: string; category: string; cod: boolean; online: boolean; open: boolean; look: Shop['look']; upi?: string; ownerName?: string; email?: string; orderSettings?: Record<string, string> }): Promise<Shop> {
  const { data, error } = await sb.from('shops').insert({ owner_id: ownerId, name: s.name, handle: s.handle, city: s.city, category: s.category, accepts_cod: s.cod, accepts_online: s.online, is_open: s.open, look: s.look, upi_id: s.upi || null, owner_name: s.ownerName ?? null, email: s.email ?? null, order_settings: s.orderSettings ?? {} }).select().single();
  if (error) throw new Error(/duplicate key|unique/i.test(error.message) ? 'That shop link is already taken. Try another.' : error.message);
  return shopFromRow(data!);
}

async function orderUuid(sb: SupabaseClient, shopId: string, orderNo: number): Promise<string> {
  const { data, error } = await sb.from('orders').select('id').eq('shop_id', shopId).eq('order_no', orderNo).single(); fail(error); return data!.id;
}
export async function createOwnerOrder(sb: SupabaseClient, shopId: string, o: Order, stock: { id: string; stock: number }[]) {
  const { data, error } = await sb.from('orders').insert({ shop_id: shopId, buyer_name: o.buyer, phone: o.phone ?? null, city: o.city ?? null, address: o.address ?? null, shipping: o.shipping, total: o.total, paid: o.paid, method: o.method, source: o.source, notes: o.notes ?? null, created_by: o.createdBy }).select('id, order_no').single(); fail(error);
  const lines = o.lines.map((l) => ({ order_id: data!.id, product_id: isUuid(l.productId) ? l.productId : null, name: '', size: l.size ?? null, qty: l.qty, price: l.price }));
  const names = await sb.from('products').select('id, name').in('id', lines.map((l) => l.product_id).filter(Boolean) as string[]);
  lines.forEach((l) => { l.name = names.data?.find((p) => p.id === l.product_id)?.name ?? 'Item'; });
  fail((await sb.from('order_lines').insert(lines)).error);
  await Promise.all(stock.filter((s) => isUuid(s.id)).map((s) => sb.from('products').update({ stock: s.stock }).eq('id', s.id)));
  if (o.phone) {
    const { data: c } = await sb.from('customers').select('id, orders_count, spent').eq('shop_id', shopId).eq('phone', o.phone).maybeSingle();
    if (c) await sb.from('customers').update({ orders_count: c.orders_count + 1, spent: c.spent + (o.paid ? o.total : 0), last_order_at: new Date().toISOString() }).eq('id', c.id);
    else await sb.from('customers').insert({ shop_id: shopId, name: o.buyer, phone: o.phone, city: o.city ?? null, source: o.source, orders_count: 1, spent: o.paid ? o.total : 0, last_order_at: new Date().toISOString() });
  }
  return data!.order_no as number;
}
export async function patchOrder(sb: SupabaseClient, shopId: string, orderNo: number, patch: Partial<Order>) {
  const id = await orderUuid(sb, shopId, orderNo);
  if (patch.paid === true) fail((await sb.rpc('mark_order_paid', { p_order: id })).error);
  const row: Row = {};
  if (patch.paid === false) row.paid = false;
  if ('shipped' in patch) row.shipped = patch.shipped;
  if ('courier' in patch) row.courier = patch.courier ?? null;
  if ('tracking' in patch) row.tracking = patch.tracking ?? null;
  if ('address' in patch) row.address = patch.address ?? null;
  if ('city' in patch) row.city = patch.city ?? null;
  if ('notes' in patch) row.notes = patch.notes ?? null;
  if (Object.keys(row).length) fail((await sb.from('orders').update(row).eq('id', id)).error);
}
export async function addRefund(sb: SupabaseClient, shopId: string, orderNo: number, r: Refund) {
  fail((await sb.from('refunds').insert({ order_id: await orderUuid(sb, shopId, orderNo), amount: r.amount, reason: r.reason, notified: r.notified })).error);
}
export async function saveOffer(sb: SupabaseClient, shopId: string, o: Offer) {
  fail((await sb.from('offers').upsert({ shop_id: shopId, code: o.code, what: o.what, used: o.used, ends_label: o.ends, is_on: o.on }, { onConflict: 'shop_id,code' })).error);
}
export async function setOfferOn(sb: SupabaseClient, shopId: string, code: string, on: boolean) { fail((await sb.from('offers').update({ is_on: on }).eq('shop_id', shopId).eq('code', code)).error); }
export async function completeBooking(sb: SupabaseClient, shopId: string, ref: string) { fail((await sb.from('bookings').update({ status: 'Done' }).eq('shop_id', shopId).eq('ref', ref)).error); }
export async function markBookingPaid(sb: SupabaseClient, shopId: string, ref: string) { fail((await sb.from('bookings').update({ paid: true }).eq('shop_id', shopId).eq('ref', ref)).error); }

/* ---------- buyer checkout (works for guests too) ---------- */
export interface PlaceOrderInput { handle: string; name: string; phone: string; city: string; address: string; note?: string; pay: 'upi' | 'card' | 'cod'; lines: { productId: string; qty: number; size?: string }[] }
export async function placeOrder(sb: SupabaseClient, i: PlaceOrderInput): Promise<{ id: string; orderNo: number; total: number; shipping: number; paid: boolean }> {
  const { data, error } = await sb.rpc('place_order', { p_handle: i.handle, p_name: i.name, p_phone: i.phone, p_city: i.city, p_address: i.address, p_note: i.note ?? null, p_pay: i.pay, p_lines: i.lines });
  if (error) throw new Error(error.message);
  return data;
}

/* ---------- site forms ---------- */
export async function sendEnquiry(sb: SupabaseClient, e: { name: string; contact: string; topic: string; message: string }) { fail((await sb.from('enquiries').insert({ ...e, source: 'Landing page' })).error); }
export async function sendDataRequest(sb: SupabaseClient, r: { kind: string; name: string; contact: string; details?: string }, userId?: string): Promise<string> {
  const { data, error } = await sb.from('data_requests').insert({ ...r, requester_id: userId ?? null }).select('ref').single().then((x) => x, (e) => ({ data: null, error: e }));
  if (error) {
    // anonymous visitors may insert but not read the row back: that is fine, make a reference from the time instead
    const { error: e2 } = await sb.from('data_requests').insert({ ...r, requester_id: userId ?? null });
    fail(e2); return 'DR-' + String(Date.now()).slice(-6);
  }
  return data!.ref;
}
export async function recordConsent(sb: SupabaseClient, userId: string, items: string[]) { fail((await sb.from('seller_consents').insert({ user_id: userId, version: '2026-10-29', items })).error); }

export async function listAddresses(sb: SupabaseClient): Promise<{ id: string; label: string; line: string; city: string; pin: string; main?: boolean }[]> {
  const { data, error } = await sb.from('buyer_addresses').select('*').order('created_at'); fail(error);
  return (data ?? []).map((a) => ({ id: a.id, label: a.label, line: a.line, city: a.city, pin: a.pin, main: a.is_default }));
}
export async function saveAddress(sb: SupabaseClient, userId: string, a: { id: string; label: string; line: string; city: string; pin: string }) {
  const row = { user_id: userId, label: a.label, line: a.line, city: a.city, pin: a.pin };
  fail((isUuid(a.id) ? await sb.from('buyer_addresses').update(row).eq('id', a.id) : await sb.from('buyer_addresses').insert(row)).error);
}
export async function deleteAddress(sb: SupabaseClient, id: string) { if (isUuid(id)) fail((await sb.from('buyer_addresses').delete().eq('id', id)).error); }

export async function listEnquiries(sb: SupabaseClient) {
  const { data, error } = await sb.from('enquiries').select('*').order('created_at', { ascending: false }).limit(200); fail(error);
  return (data ?? []).map((e) => ({ id: e.id as string, name: e.name as string, contact: e.contact as string, topic: e.topic as string, message: e.message as string, when: labelOf(e.created_at), status: e.status as 'New' | 'Open' | 'Answered' | 'Closed', from: e.source as 'Landing page' | 'Storefront' | 'Seller help' }));
}
export async function setEnquiryStatus(sb: SupabaseClient, id: string, status: string) { fail((await sb.from('enquiries').update({ status }).eq('id', id)).error); }
export async function replyToEnquiry(sb: SupabaseClient, id: string, adminId: string, body: string) {
  fail((await sb.from('enquiry_replies').insert({ enquiry_id: id, admin_id: adminId, body })).error);
  await setEnquiryStatus(sb, id, 'Answered');
}
