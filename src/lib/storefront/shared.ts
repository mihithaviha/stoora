/**
 * Storefront definitions: palette, themes, templates, sections and the default configuration.
 *
 * Colours: every colour below is copied verbatim from Stoora Brand Kit v2 (the page, card, ink and accent tokens,
 * their deep/tint shades and the --gradient-warm stops). No colour is invented.
 */

/** Every colour a storefront theme may use. */
export const PALETTE = [
  '#FFFFFF', '#F7F7F7', '#FFFAEF', '#F2EADD', '#E0D6CA', '#EBE3DA', // surface, card, inner, muted, line, line-soft
  '#171C3C', '#303652', '#725F54', '#938378', // ink, ink-soft, ink-65, ink-45
  '#EA5B1E', '#FFB407', '#0FA05C', '#DE3C37', // primary, marigold, positive, negative
  '#9A3412', '#FFE4D3', '#6E4A00', '#FFE9B0', '#065F37', '#DCEFDF', '#951F27', '#F8D6D5', // deep and tint shades
  '#FBE0A8', '#F4A24A', '#EF7F3D', '#DC4A3A', '#D13A5B', '#8B3A9E', '#5F3BA8', '#262A7A', // gradient-warm stops
];

/** Decorative accent colours a seller may pick (never used for small text). */
export const ACCENTS = ['#EA5B1E', '#FFB407', '#D13A5B', '#8B3A9E', '#5F3BA8', '#0FA05C'];

export interface Theme {
  id: string; name: string; note: string;
  primary: string; secondary: string; accent: string; background: string; surface: string;
  text: string; muted: string; border: string; button: string; buttonText: string;
}

/** Curated themes. Text on background and button text on button always reach WCAG AA (4.5:1). */
export const THEMES: Theme[] = [
  { id: 'signature', name: 'Stoora Signature', note: 'Indigo and orange on white', primary: '#EA5B1E', secondary: '#171C3C', accent: '#FFB407', background: '#FFFFFF', surface: '#FFFAEF', text: '#171C3C', muted: '#725F54', border: '#E0D6CA', button: '#171C3C', buttonText: '#FFFFFF' },
  { id: 'warm', name: 'Warm & Welcoming', note: 'Cream, terracotta and gold', primary: '#9A3412', secondary: '#303652', accent: '#F4A24A', background: '#FFFAEF', surface: '#F2EADD', text: '#171C3C', muted: '#725F54', border: '#E0D6CA', button: '#9A3412', buttonText: '#FFFFFF' },
  { id: 'minimal', name: 'Modern & Minimal', note: 'White, grey and indigo', primary: '#171C3C', secondary: '#303652', accent: '#EA5B1E', background: '#FFFFFF', surface: '#F7F7F7', text: '#171C3C', muted: '#725F54', border: '#E0D6CA', button: '#171C3C', buttonText: '#FFFFFF' },
  { id: 'premium', name: 'Premium Contrast', note: 'Deep indigo with marigold', primary: '#FFB407', secondary: '#F2EADD', accent: '#FFB407', background: '#171C3C', surface: '#303652', text: '#FFFFFF', muted: '#EBE3DA', border: '#725F54', button: '#FFB407', buttonText: '#171C3C' },
  { id: 'elegant', name: 'Soft & Elegant', note: 'Cream with rose and plum', primary: '#D13A5B', secondary: '#303652', accent: '#8B3A9E', background: '#FFFAEF', surface: '#FFFFFF', text: '#171C3C', muted: '#725F54', border: '#E0D6CA', button: '#8B3A9E', buttonText: '#FFFFFF' },
  { id: 'vibrant', name: 'Vibrant & Creative', note: 'Violet, tangerine and sun', primary: '#5F3BA8', secondary: '#171C3C', accent: '#EF7F3D', background: '#FFFFFF', surface: '#FFE9B0', text: '#171C3C', muted: '#303652', border: '#E0D6CA', button: '#5F3BA8', buttonText: '#FFFFFF' },
];

export type TemplateId = 'boutique' | 'minimal' | 'studio' | 'services' | 'signature' | 'atelier' | 'heritage' | 'signaturestudio';

export interface TemplateInfo {
  id: TemplateId; name: string; kind: 'products' | 'services'; theme: string; categories: string[];
  suits: string; blurb: string; premium?: boolean;
}

/** The templates. `categories` are the gallery filters; `kind` decides products or services. */
export const TEMPLATES: TemplateInfo[] = [
  { id: 'boutique', name: 'Stoora Boutique', kind: 'products', theme: 'warm', categories: ['fashion', 'products'], suits: 'Boutiques, sarees, ethnic wear, jewellery, accessories, home décor', blurb: 'Editorial and premium, with a large hero image, collections and new arrivals.' },
  { id: 'minimal', name: 'Stoora Minimal', kind: 'products', theme: 'minimal', categories: ['products'], suits: 'Everyday products, beauty, skincare, accessories, general retail', blurb: 'Clean and modern. The product grid is the star, with search and category filters.' },
  { id: 'studio', name: 'Stoora Studio', kind: 'products', theme: 'vibrant', categories: ['handmade', 'products'], suits: 'Artists, handmade makers, gifts, home businesses, designers', blurb: 'Warm and personal, with your story, an image-led gallery and your process.' },
  { id: 'services', name: 'Stoora Services', kind: 'services', theme: 'signature', categories: ['education', 'services'], suits: 'Tutors, coaches, yoga and fitness teachers, consultants, freelancers', blurb: 'Trustworthy and structured, with service cards, credentials, FAQs and contact.' },
  { id: 'signature', name: 'Stoora Signature', kind: 'products', theme: 'premium', categories: ['fashion', 'products'], suits: 'Established small brands, premium boutiques, lifestyle and multi-category sellers', blurb: 'Premium and brand-focused, with bold typography and editorial sections.' },
  // Premium templates: anyone can preview them; applying one needs access
  { id: 'atelier', name: 'Atelier Luxe', premium: true, kind: 'products', theme: 'elegant', categories: ['fashion', 'products'], suits: 'Premium boutiques, fashion brands, jewellery, ethnic wear, lifestyle products', blurb: 'Editorial and refined: a split hero, a lookbook of large images, and unhurried whitespace.' },
  { id: 'heritage', name: 'Heritage Craft', premium: true, kind: 'products', theme: 'warm', categories: ['handmade', 'products'], suits: 'Handcrafted products, Indian textiles, handmade gifts, home décor, artisan businesses', blurb: 'Warm storytelling: an arched hero, the maker’s story, and products shown with their descriptions.' },
  { id: 'signaturestudio', name: 'Signature Studio', premium: true, kind: 'services', theme: 'signature', categories: ['education', 'services'], suits: 'Independent professionals, consultants, coaches, creative and premium service providers', blurb: 'Personal branding: a profile column that stays in view, services as clear rows, credentials and FAQs.' },
];

export const GALLERY_FILTERS: [string, string][] = [
  ['all', 'All templates'], ['products', 'Products'], ['fashion', 'Fashion and lifestyle'],
  ['handmade', 'Handmade and creative'], ['education', 'Education and tutoring'], ['services', 'Services'],
];

/** Sections a seller can switch on or off. */
export const SECTIONS = {
  featured: 'Featured products', newArrivals: 'New arrivals', bestsellers: 'Bestsellers', collections: 'Collections',
  about: 'About', reviews: 'Customer reviews', faqs: 'Questions and answers', contact: 'Contact',
} as const;
export type SectionKey = keyof typeof SECTIONS;

export const LIMITS = { text: 600, short: 120, faqs: 8, process: 4, listItems: 12, ids: 60 };
export const FOCUS_OPTIONS = ['50% 20%', '50% 50%', '50% 80%'];

/** WCAG contrast ratio between two #RRGGBB colours. */
export function contrast(a: string, b: string): number {
  const channel = (value: number) => { const v = value / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const luminance = (hex: string) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255); };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export const isPremium = (id: string) => Boolean(TEMPLATES.find((t) => t.id === id && t.premium));
export const themeById = (id: string) => THEMES.find((t) => t.id === id) || THEMES[0];
export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];

/** The CSS variables for a theme (and an optional approved accent). */
export function themeVariables(themeId: string, accent?: string | null): Record<string, string> {
  const theme = themeById(themeId);
  const colour = accent && ACCENTS.includes(accent) ? accent : theme.accent;
  return {
    '--store-primary': theme.primary, '--store-secondary': theme.secondary, '--store-accent': colour,
    '--store-background': theme.background, '--store-surface': theme.surface, '--store-text': theme.text,
    '--store-muted': theme.muted, '--store-border': theme.border, '--store-button': theme.button, '--store-button-text': theme.buttonText,
  };
}

export interface StoreConfig {
  version: number; template: TemplateId; theme: string; accent: string | null;
  brand: { name: string; tagline: string; logo: string };
  hero: { title: string; subtitle: string; image: string; focus: string; cta: string };
  about: { title: string; text: string; image: string };
  story: { title: string; text: string };
  process: { title: string; text: string }[];
  contact: { email: string; phone: string; whatsapp: string; address: string; hours: string };
  social: { instagram: string };
  services: { subjects: string[]; levels: string[]; modes: string[]; sessions: string; credentials: string[] };
  faqs: { q: string; a: string }[];
  sections: Record<SectionKey, boolean>;
  featuredIds: string[]; hiddenIds: string[];
  footer: { note: string };
}

/** A fresh storefront configuration. The shop's own details fill the blanks; nothing is invented. */
export function defaultConfig(templateId: string, shop: { name?: string; tagline?: string } = {}): StoreConfig {
  const template = templateById(templateId);
  return {
    version: 1, template: template.id, theme: template.theme, accent: null,
    brand: { name: shop.name || '', tagline: shop.tagline || '', logo: '' },
    hero: { title: '', subtitle: '', image: '', focus: '50% 50%', cta: template.kind === 'services' ? 'Book a session' : 'Shop now' },
    about: { title: 'About us', text: '', image: '' },
    story: { title: 'Our story', text: '' },
    process: [],
    contact: { email: '', phone: '', whatsapp: '', address: '', hours: '' },
    social: { instagram: '' },
    services: { subjects: [], levels: [], modes: [], sessions: '', credentials: [] },
    faqs: [],
    sections: { featured: true, newArrivals: true, bestsellers: true, collections: true, about: true, reviews: true, faqs: true, contact: true },
    featuredIds: [], hiddenIds: [], footer: { note: '' },
  };
}

/** One product or service as a storefront shows it. Only public fields. */
export interface StoreItem {
  id: string; name: string; price: number; cat?: string; stock?: number | null; img?: string;
  crop?: { pos?: string; zoom?: number }; desc?: string; sizes?: string; tags?: string;
  // services only
  type?: string; duration?: string; where?: string; next?: string;
}

export interface StoreData {
  shop: { name: string; city?: string; handle?: string };
  products: StoreItem[]; services: StoreItem[];
  bestsellerIds?: string[];
  ratings?: Record<string, { average: number; count: number }>;
  reviews?: { rating: number; comment: string; who: string }[];
  reviewSummary?: { count: number; average: number };
}

/** The catalogue as the storefront shows it: products and services the seller has not hidden. */
export function visibleData(data: StoreData, config: StoreConfig): StoreData {
  const hidden = new Set(config.hiddenIds || []);
  const keep = (item: StoreItem) => !hidden.has(item.id);
  return { ...data, products: data.products.filter(keep), services: data.services.filter(keep), bestsellerIds: (data.bestsellerIds || []).filter((id) => !hidden.has(id)) };
}
