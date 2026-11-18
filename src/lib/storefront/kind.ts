'use client';
import { useCallback, useEffect, useState } from 'react';
import { useIsAdmin } from '../auth';
import { shopKind } from '../shopstate';
import type { Db } from '../types';
import { productItem, serviceItem } from './map';
import { sampleData } from './sample';
import type { StoreData } from './shared';

/** The two storefronts: the shop window for physical products, and the painted shopfront for classes, sessions and digital products. */
export type SfKind = 'physical' | 'digital';
export const KIND_LABEL: Record<SfKind, string> = { physical: 'Physical storefront', digital: 'Digital storefront' };
const KEY = 'stoora.admin.sfkind';

/** Which of the two a shop really is (a shop that sells both shows the physical one). */
export const realKind = (db: Pick<Db, 'shop'>): SfKind => (shopKind(db.shop) === 'digital' ? 'digital' : 'physical');

/**
 * The shop's catalogue as one of the two storefronts shows it, for an admin looking at both. The shop's own products (or services) are used;
 * a shop that has none of that kind gets clearly labelled sample content, so the layout can still be seen.
 */
export function kindData(db: Db, kind: SfKind): { data: StoreData; sample: boolean } {
  const shop = { name: db.shop.name, city: db.shop.city, handle: db.shop.handle };
  if (kind === 'physical') {
    const live = db.products.filter((p) => p.status === 'Active');
    if (live.length) {
      const best = [...live].sort((a, b) => b.soldLast30Days - a.soldLast30Days).filter((p) => p.soldLast30Days > 0).slice(0, 4).map((p) => p.id);
      return { data: { shop, products: live.map(productItem), services: [], bestsellerIds: best, ratings: {}, reviews: [], reviewSummary: { count: 0, average: 0 } }, sample: false };
    }
    const s = sampleData('standard').data;
    return { data: { ...s, shop: { ...shop, city: shop.city || s.shop.city }, services: [] }, sample: true };
  }
  if (db.services.length) return { data: { shop, products: [], services: db.services.map(serviceItem), bestsellerIds: [], ratings: {}, reviews: [], reviewSummary: { count: 0, average: 0 } }, sample: false };
  const s = sampleData('services').data;
  return { data: { ...s, shop: { ...shop, city: shop.city || s.shop.city }, products: [] }, sample: true };
}

/**
 * An admin's choice of storefront to look at, remembered in this browser. `override` is null until they choose (then the shop shows as it really is);
 * `active` is the one the buttons show as pressed.
 */
export function useAdminKind(db: Pick<Db, 'shop'>) {
  const admin = useIsAdmin();
  const [saved, setSaved] = useState<SfKind | null>(null);
  useEffect(() => { try { const v = localStorage.getItem(KEY); if (v === 'physical' || v === 'digital') setSaved(v); } catch { /* ignore */ } }, []);
  const choose = useCallback((k: SfKind | null) => { setSaved(k); try { if (k) localStorage.setItem(KEY, k); else localStorage.removeItem(KEY); } catch { /* ignore */ } }, []);
  const effective: SfKind = saved ?? realKind(db);
  return { admin, override: admin ? saved : null, active: effective, choose };
}
