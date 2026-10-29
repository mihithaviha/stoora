// Extra storefront details for the demo products (the seller's products come from the store; these add copy and colours).
import type { Product } from './types';

export interface ShopMeta { blurb: string; details: string[]; hex: string; rating: number; reviews: number; badge?: string }
export const META: Record<string, ShopMeta> = {
  p1: { blurb: 'Soft, breathable cotton, block-printed by hand in Jaipur. A relaxed straight fit for every day.', details: ['100% cotton', 'Hand block-printed', 'Machine wash cold, dry in shade', 'Model is 5′6″ and wears M'], hex: '#EFE6D6', rating: 4.8, reviews: 31, badge: 'Bestseller' },
  p2: { blurb: 'A light silk dupatta with a woven border. Drapes beautifully over a plain kurta.', details: ['Pure silk', 'Length 2.25 m', 'Dry clean only'], hex: '#8E2B3C', rating: 4.9, reviews: 12 },
  p3: { blurb: 'Kurta and trousers in deep indigo, printed in small batches so each set is slightly different.', details: ['Cotton kurta + trousers', 'Natural indigo dye', 'Wash separately the first time'], hex: '#2F3B7A', rating: 4.9, reviews: 22, badge: 'Only a few left' },
  p4: { blurb: 'A cotton dupatta in warm mustard. Easy to style, easy to wash.', details: ['Cotton', 'Length 2.25 m', 'Machine wash cold'], hex: '#D9A21B', rating: 4.6, reviews: 18 },
  p5: { blurb: 'Breezy linen kurta in sage green.', details: ['Linen blend', 'Relaxed fit'], hex: '#A9B79A', rating: 4.5, reviews: 6 },
  p6: { blurb: 'The same hand-blocked kurta in a soft sky blue.', details: ['100% cotton', 'Hand block-printed', 'Machine wash cold'], hex: '#9CC3E6', rating: 4.7, reviews: 14, badge: 'New' },
};
export const metaOf = (p: Product): ShopMeta => META[p.id] ?? { blurb: p.description || 'Made by hand, shipped from our studio.', details: [], hex: '#EFE6D6', rating: 4.6, reviews: 0 };

export const SHOP_TAGLINE = 'Hand block-printed kurtas, dupattas and yoga classes from Jaipur.';
export const REVIEWS = [
  { who: 'Anjali R.', city: 'Bengaluru', stars: 5, text: 'The indigo set looks even better in person. Arrived in 3 days.', when: '2 weeks ago' },
  { who: 'Kavya I.', city: 'Jaipur', stars: 5, text: 'Soft cotton and the print has not faded after four washes.', when: '1 month ago' },
  { who: 'Neha J.', city: 'Mumbai', stars: 4, text: 'Lovely colours. Size M runs slightly roomy, so go one down if you like a fitted look.', when: '1 month ago' },
];
