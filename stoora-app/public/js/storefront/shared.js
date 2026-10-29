/**
 * Storefront definitions shared by the server (validation, tests) and the browser (editor, templates).
 * It is a plain script that works in both places: in the browser it sets `window.StoreShared`,
 * in Node it is `require`d.
 *
 * Colours: every colour below is copied verbatim from Stoora Brand Kit v2 (AGENTS.md section 1:
 * the page, card, ink and accent tokens, their deep/tint shades, and the --gradient-warm stops).
 * No colour is invented. The test suite checks this list and the contrast of every theme.
 */
(function (root, factory) {
  const shared = factory();
  if (typeof module === 'object' && module.exports) module.exports = shared;
  else root.StoreShared = shared;
})(typeof self !== 'undefined' ? self : this, function () {
  /** Every colour a storefront theme may use. */
  const PALETTE = [
    '#FFFFFF',
    '#F7F7F7',
    '#FFFAEF',
    '#F2EADD',
    '#E0D6CA',
    '#EBE3DA', // surface, card, inner, muted, line, line-soft
    '#171C3C',
    '#303652',
    '#725F54',
    '#938378', // ink, ink-soft, ink-65, ink-45
    '#EA5B1E',
    '#FFB407',
    '#0FA05C',
    '#DE3C37', // primary, marigold, positive, negative
    '#9A3412',
    '#FFE4D3',
    '#6E4A00',
    '#FFE9B0',
    '#065F37',
    '#DCEFDF',
    '#951F27',
    '#F8D6D5', // deep and tint shades
    '#FBE0A8',
    '#F4A24A',
    '#EF7F3D',
    '#DC4A3A',
    '#D13A5B',
    '#8B3A9E',
    '#5F3BA8',
    '#262A7A', // gradient-warm stops
  ];

  /** Decorative accent colours a seller may pick (never used for small text). */
  const ACCENTS = ['#EA5B1E', '#FFB407', '#D13A5B', '#8B3A9E', '#5F3BA8', '#0FA05C'];

  /**
   * Curated themes. Each one lists the tokens the templates read as CSS variables (--store-<token>).
   * Text on background and button text on button always reach WCAG AA (4.5:1); the tests check it.
   */
  const THEMES = [
    {
      id: 'signature',
      name: 'Stoora Signature',
      note: 'Indigo and orange on white',
      primary: '#EA5B1E',
      secondary: '#171C3C',
      accent: '#FFB407',
      background: '#FFFFFF',
      surface: '#FFFAEF',
      text: '#171C3C',
      muted: '#725F54',
      border: '#E0D6CA',
      button: '#171C3C',
      buttonText: '#FFFFFF',
    },
    {
      id: 'warm',
      name: 'Warm & Welcoming',
      note: 'Cream, terracotta and gold',
      primary: '#9A3412',
      secondary: '#303652',
      accent: '#F4A24A',
      background: '#FFFAEF',
      surface: '#F2EADD',
      text: '#171C3C',
      muted: '#725F54',
      border: '#E0D6CA',
      button: '#9A3412',
      buttonText: '#FFFFFF',
    },
    {
      id: 'minimal',
      name: 'Modern & Minimal',
      note: 'White, grey and indigo',
      primary: '#171C3C',
      secondary: '#303652',
      accent: '#EA5B1E',
      background: '#FFFFFF',
      surface: '#F7F7F7',
      text: '#171C3C',
      muted: '#725F54',
      border: '#E0D6CA',
      button: '#171C3C',
      buttonText: '#FFFFFF',
    },
    {
      id: 'premium',
      name: 'Premium Contrast',
      note: 'Deep indigo with marigold',
      primary: '#FFB407',
      secondary: '#F2EADD',
      accent: '#FFB407',
      background: '#171C3C',
      surface: '#303652',
      text: '#FFFFFF',
      muted: '#EBE3DA',
      border: '#725F54',
      button: '#FFB407',
      buttonText: '#171C3C',
    },
    {
      id: 'elegant',
      name: 'Soft & Elegant',
      note: 'Cream with rose and plum',
      primary: '#D13A5B',
      secondary: '#303652',
      accent: '#8B3A9E',
      background: '#FFFAEF',
      surface: '#FFFFFF',
      text: '#171C3C',
      muted: '#725F54',
      border: '#E0D6CA',
      button: '#8B3A9E',
      buttonText: '#FFFFFF',
    },
    {
      id: 'vibrant',
      name: 'Vibrant & Creative',
      note: 'Violet, tangerine and sun',
      primary: '#5F3BA8',
      secondary: '#171C3C',
      accent: '#EF7F3D',
      background: '#FFFFFF',
      surface: '#FFE9B0',
      text: '#171C3C',
      muted: '#303652',
      border: '#E0D6CA',
      button: '#5F3BA8',
      buttonText: '#FFFFFF',
    },
  ];

  /** The five templates. `categories` are the filters in the gallery; `kind` decides products or services. */
  const TEMPLATES = [
    {
      id: 'boutique',
      name: 'Stoora Boutique',
      kind: 'products',
      theme: 'warm',
      categories: ['fashion', 'products'],
      suits: 'Boutiques, sarees, ethnic wear, jewellery, accessories, home décor',
      blurb: 'Editorial and premium, with a large hero image, collections and new arrivals.',
    },
    {
      id: 'minimal',
      name: 'Stoora Minimal',
      kind: 'products',
      theme: 'minimal',
      categories: ['products'],
      suits: 'Everyday products, beauty, skincare, accessories, general retail',
      blurb: 'Clean and modern. The product grid is the star, with search and category filters.',
    },
    {
      id: 'studio',
      name: 'Stoora Studio',
      kind: 'products',
      theme: 'vibrant',
      categories: ['handmade', 'products'],
      suits: 'Artists, handmade makers, gifts, home businesses, designers',
      blurb: 'Warm and personal, with your story, an image-led gallery and your process.',
    },
    {
      id: 'services',
      name: 'Stoora Services',
      kind: 'services',
      theme: 'signature',
      categories: ['education', 'services'],
      suits: 'Tutors, coaches, yoga and fitness teachers, consultants, freelancers',
      blurb: 'Trustworthy and structured, with service cards, credentials, FAQs and contact.',
    },
    {
      id: 'signature',
      name: 'Stoora Signature',
      kind: 'products',
      theme: 'premium',
      categories: ['fashion', 'products'],
      suits: 'Established small brands, premium boutiques, lifestyle and multi-category sellers',
      blurb: 'Premium and brand-focused, with bold typography and editorial sections.',
    },
    // ----- Premium templates: anyone can preview them; applying one needs access (see server/premium.js) -----
    {
      id: 'atelier',
      name: 'Atelier Luxe',
      premium: true,
      kind: 'products',
      theme: 'elegant',
      categories: ['fashion', 'products'],
      suits: 'Premium boutiques, fashion brands, jewellery, ethnic wear, lifestyle products',
      blurb: 'Editorial and refined: a split hero, a lookbook of large images, and unhurried whitespace.',
    },
    {
      id: 'heritage',
      name: 'Heritage Craft',
      premium: true,
      kind: 'products',
      theme: 'warm',
      categories: ['handmade', 'products'],
      suits: 'Handcrafted products, Indian textiles, handmade gifts, home décor, artisan businesses',
      blurb: 'Warm storytelling: an arched hero, the maker\'s story, and products shown with their descriptions.',
    },
    {
      id: 'signaturestudio',
      name: 'Signature Studio',
      premium: true,
      kind: 'services',
      theme: 'signature',
      categories: ['education', 'services'],
      suits: 'Independent professionals, consultants, coaches, creative and premium service providers',
      blurb: 'Personal branding: a profile column that stays in view, services as clear rows, credentials and FAQs.',
    },
  ];

  const GALLERY_FILTERS = [
    ['all', 'All templates'],
    ['products', 'Products'],
    ['fashion', 'Fashion and lifestyle'],
    ['handmade', 'Handmade and creative'],
    ['education', 'Education and tutoring'],
    ['services', 'Services'],
  ];

  /** Sections a seller can switch on or off. */
  const SECTIONS = {
    featured: 'Featured products',
    newArrivals: 'New arrivals',
    bestsellers: 'Bestsellers',
    collections: 'Collections',
    about: 'About',
    reviews: 'Customer reviews',
    faqs: 'Questions and answers',
    contact: 'Contact',
  };

  const LIMITS = { text: 600, short: 120, faqs: 8, process: 4, listItems: 12, ids: 60 };

  /** WCAG contrast ratio between two #RRGGBB colours. */
  function contrast(a, b) {
    const channel = (value) => {
      const v = value / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const luminance = (hex) => {
      const n = parseInt(hex.slice(1), 16);
      return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
    };
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }

  const FOCUS_OPTIONS = ['50% 20%', '50% 50%', '50% 80%'];
  const isPremium = (id) => Boolean(TEMPLATES.find((template) => template.id === id && template.premium));
  const themeById = (id) => THEMES.find((theme) => theme.id === id) || THEMES[0];
  const templateById = (id) => TEMPLATES.find((template) => template.id === id) || TEMPLATES[0];

  /** The CSS variables for a theme (and an optional approved accent). */
  function themeVariables(themeId, accent) {
    const theme = themeById(themeId);
    const colour = ACCENTS.includes(accent) ? accent : theme.accent;
    return {
      '--store-primary': theme.primary,
      '--store-secondary': theme.secondary,
      '--store-accent': colour,
      '--store-background': theme.background,
      '--store-surface': theme.surface,
      '--store-text': theme.text,
      '--store-muted': theme.muted,
      '--store-border': theme.border,
      '--store-button': theme.button,
      '--store-button-text': theme.buttonText,
    };
  }

  /** A fresh storefront configuration. The shop's own details fill the blanks; nothing is invented. */
  function defaultConfig(templateId, shop = {}) {
    const template = templateById(templateId);
    return {
      version: 1,
      template: template.id,
      theme: template.theme,
      accent: null,
      brand: { name: shop.name || '', tagline: shop.tagline || '', logo: '' },
      hero: { title: '', subtitle: '', image: '', focus: '50% 50%', cta: template.kind === 'services' ? 'Book a session' : 'Shop now' },
      about: { title: 'About us', text: '', image: '' },
      story: { title: 'Our story', text: '' },
      process: [],
      contact: { email: '', phone: '', whatsapp: '', address: '', hours: '' },
      social: { instagram: '' },
      services: { subjects: [], levels: [], modes: [], sessions: '', credentials: [] },
      faqs: [],
      sections: {
        featured: true,
        newArrivals: true,
        bestsellers: true,
        collections: true,
        about: true,
        reviews: true,
        faqs: true,
        contact: true,
      },
      featuredIds: [],
      hiddenIds: [],
      footer: { note: '' },
    };
  }

  /** The catalogue as the storefront shows it: products and services the seller has not hidden. */
  function visibleData(data, config) {
    const hidden = new Set(config.hiddenIds || []);
    const keep = (item) => !hidden.has(item.id);
    return {
      ...data,
      products: data.products.filter(keep),
      services: data.services.filter(keep),
      bestsellerIds: (data.bestsellerIds || []).filter((id) => !hidden.has(id)),
    };
  }

  return {
    PALETTE,
    FOCUS_OPTIONS,
    isPremium,
    visibleData,
    ACCENTS,
    THEMES,
    TEMPLATES,
    GALLERY_FILTERS,
    SECTIONS,
    LIMITS,
    contrast,
    themeById,
    templateById,
    themeVariables,
    defaultConfig,
  };
});
