import type { Db, Product, Service } from '../types';
import { defaultConfig, type StoreConfig, type StoreData, type StoreItem } from './shared';

const productItem = (p: Product): StoreItem => ({
  id: p.id, name: p.name, price: p.price, cat: p.category === 'Other' ? '' : p.category, stock: p.stock, img: p.photos?.[0] ?? '',
  desc: p.description ?? '', sizes: p.sizes.join(', '), tags: p.color ?? '',
});
const serviceItem = (s: Service): StoreItem => ({ id: s.id, name: s.name, price: s.price, type: s.type, duration: s.minutes ? `${s.minutes} min` : '', where: '', next: s.next });

/** The shop's catalogue as a storefront shows it: only active products, and only public fields. */
export function toStoreData(db: Db): StoreData {
  const live = db.products.filter((p) => p.status === 'Active');
  const best = [...live].sort((a, b) => b.soldLast30Days - a.soldLast30Days).filter((p) => p.soldLast30Days > 0).slice(0, 4).map((p) => p.id);
  return {
    shop: { name: db.shop.name, city: db.shop.city, handle: db.shop.handle },
    products: live.map(productItem), services: db.services.map(serviceItem),
    bestsellerIds: best, ratings: {}, reviews: [], reviewSummary: { count: 0, average: 0 },
  };
}

/** The template that suits what the shop sells, before the seller has chosen one. */
export const suggestedTemplate = (db: Db) => (db.products.length === 0 && db.services.length > 0 ? 'services' : 'boutique');

/** A starting design filled from the shop's own details (nothing invented). */
export function startingConfig(db: Db, templateId: string = suggestedTemplate(db)): StoreConfig {
  const config = defaultConfig(templateId, { name: db.shop.name, tagline: db.shop.tagline });
  config.contact.whatsapp = (db.shop.whatsappNumber || '').replace(/\D/g, '').slice(-10);
  return config;
}

/** The design to draw for a shop: its published one, with the WhatsApp number filled from the shop where the seller left it blank. */
export function publishedConfig(db: Db): StoreConfig | null {
  const saved = db.shop.storefront;
  if (!saved) return null;
  const whatsapp = db.shop.showWhatsapp === false ? '' : (db.shop.whatsappNumber || '').replace(/\D/g, '').slice(-10);
  return { ...saved, contact: { ...saved.contact, whatsapp: saved.contact.whatsapp || whatsapp } };
}
