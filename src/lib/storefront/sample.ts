import { defaultConfig, templateById, type StoreConfig, type StoreData, type StoreItem, type TemplateId } from './shared';

/**
 * Sample content for the template gallery and the "Preview website" button. The photos are local files in
 * public/assets/templates (credits in CREDITS.md there), so previews never depend on an outside website.
 * They appear only in labelled previews: a real storefront always shows the seller's own products and images.
 */
export const PHOTO: Record<string, string> = {
  kurtaPink: '/assets/templates/kurta-pink.jpg', suitMaroon: '/assets/templates/suit-maroon.jpg', suitFloral: '/assets/templates/suit-floral.jpg',
  rack: '/assets/templates/boutique-rack.jpg', bottles: '/assets/templates/bottles.jpg', cups: '/assets/templates/ceramic-cups.jpg',
  bowls: '/assets/templates/ceramic-bowls.jpg', stack: '/assets/templates/ceramic-stack.jpg', necklace: '/assets/templates/necklace.jpg',
  earrings: '/assets/templates/earrings.jpg', loom: '/assets/templates/loom.jpg', blazer: '/assets/templates/portrait-blazer.jpg',
  portrait: '/assets/templates/portrait-long.jpg', tutor: '/assets/templates/tutor.jpg', interior: '/assets/templates/interior.jpg',
};

/** Products are [name, price, collection, photo, focus point]. The focus point keeps the subject in view when cropped. */
type Row = [string, number, string, string, string];
type ServiceRow = [string, number, string, string, string];
interface Sample {
  shop: string; tagline: string; hero: string; focus: string; title: string; about: string; aboutImage?: string; story?: string;
  process?: [string, string][]; items?: Row[]; services?: ServiceRow[];
  subjects?: string[]; levels?: string[]; modes?: string[]; sessions?: string; credentials?: string[]; faqs?: [string, string][];
}

const SAMPLE: Record<TemplateId, Sample> = {
  boutique: {
    shop: 'Indigo & Thread', tagline: 'Contemporary Indian wear, made in small batches', hero: 'suitMaroon', focus: '50% 38%',
    title: 'Wear the craft, keep the story', about: 'Every piece is block-printed and finished by hand in small batches, then styled for everyday life.',
    items: [
      ['Rose block-print kurta set', 2899, 'Kurtas', 'kurtaPink', '50% 30%'], ['Floral suit with dupatta', 3499, 'Kurtas', 'suitFloral', '50% 30%'],
      ['Banarasi suit set, maroon', 5299, 'Suit sets', 'suitMaroon', '50% 40%'], ['Linen co-ord set', 2199, 'Suit sets', 'rack', '60% 45%'],
      ['Ruby drop earrings', 1299, 'Jewellery', 'earrings', '50% 40%'], ['Gold temple necklace', 4599, 'Jewellery', 'necklace', '50% 50%'],
    ],
  },
  minimal: {
    shop: 'Plain Home', tagline: 'Considered everyday essentials for the home', hero: 'cups', focus: '40% 60%', title: 'Simple things, made well',
    about: 'We choose a small range of everyday pieces that are made to last and delivered in plastic-free packaging.',
    items: [
      ['Amber oil bottle', 699, 'Care', 'bottles', '50% 40%'], ['Stoneware cup set', 1199, 'Kitchen', 'cups', '45% 60%'], ['Stacking planters', 899, 'Home', 'stack', '50% 60%'],
      ['Glazed bowl set', 1599, 'Kitchen', 'bowls', '50% 50%'], ['Ruby drop earrings', 1299, 'Gifts', 'earrings', '50% 40%'],
    ],
  },
  studio: {
    shop: 'Rangoli Studio', tagline: 'Handmade in Jaipur', hero: 'bowls', focus: '50% 50%', title: 'Made by hand, one at a time',
    story: 'I started shaping clay for my family at Diwali. Today every piece still leaves my table in Jaipur, wrapped by hand.',
    process: [['Shape', 'Every piece starts as a handful of clay.'], ['Glaze', 'Mixed and brushed on by hand.'], ['Pack', 'Wrapped in recycled paper.']],
    about: 'A one-person studio making small things for the home and for gifting.',
    items: [
      ['Speckled cup set', 1199, 'Home', 'cups', '45% 60%'], ['Stacking planters', 899, 'Home', 'stack', '50% 60%'], ['Glazed bowl set', 1599, 'Home', 'bowls', '50% 50%'],
      ['Ruby drop earrings', 1299, 'Jewellery', 'earrings', '50% 40%'], ['Gold temple necklace', 4599, 'Jewellery', 'necklace', '50% 50%'], ['Handwoven thread wall piece', 2499, 'Wall', 'loom', '50% 50%'],
    ],
  },
  services: {
    shop: 'Meera Maths & Study Coaching', tagline: 'Patient, personal teaching for every age', hero: 'tutor', focus: '50% 45%',
    title: 'Learn at your own pace, with someone who cares', aboutImage: 'tutor',
    about: 'I teach Class 8 to 10 maths and study skills. Small groups, patient teaching, no rushing.',
    services: [
      ['Class 10 maths tuition', 800, 'Class', '90 min', 'Online'], ['1-on-1 study coaching', 1200, '1-on-1', '60 min', 'At my studio'],
      ['Exam preparation batch', 999, 'Class', '90 min', 'Online'], ['Maths worksheets pack', 299, 'Digital', '', 'Instant download'],
    ],
    subjects: ['Maths', 'Study skills'], levels: ['Class 8 to 10', 'Beginners'], modes: ['Online', 'At my studio'], sessions: 'Weekday mornings and evenings',
    credentials: ['B.Ed. in Mathematics', 'M.Sc. in Mathematics', '8 years of teaching'],
    faqs: [['How do I book?', 'Choose a service and press Book. I confirm on WhatsApp.'], ['Can I try a class first?', 'Yes, the first class is a trial.']],
  },
  signature: {
    shop: 'Aanya Home', tagline: 'Slow design, considered gifting', hero: 'interior', focus: '50% 50%', title: 'Aanya Home',
    story: 'We keep the range short so every piece gets our full attention, from the first sketch to the last wrap.',
    about: 'A small studio making ceramics and gifts for calm, light-filled homes.',
    items: [
      ['Amber oil bottle', 699, 'Care', 'bottles', '50% 40%'], ['Speckled cup set', 1199, 'Ceramics', 'cups', '45% 60%'], ['Stacking planters', 899, 'Ceramics', 'stack', '50% 60%'],
      ['Glazed bowl set', 1599, 'Ceramics', 'bowls', '50% 50%'], ['Ruby drop earrings', 1299, 'Gifts', 'earrings', '50% 40%'], ['Gold temple necklace', 4599, 'Gifts', 'necklace', '50% 50%'],
    ],
  },
  atelier: {
    shop: 'Ira Atelier', tagline: 'Contemporary Indian wear', hero: 'rack', focus: '55% 40%', title: 'Quietly considered clothes',
    about: 'We make a small collection each season, cut and finished by hand, and keep each piece in the range for years.',
    items: [
      ['Banarasi suit set, maroon', 5299, 'Suit sets', 'suitMaroon', '50% 40%'], ['Floral suit with dupatta', 3499, 'Suit sets', 'suitFloral', '50% 30%'],
      ['Rose block-print kurta set', 2899, 'Kurtas', 'kurtaPink', '50% 30%'], ['Gold temple necklace', 4599, 'Jewellery', 'necklace', '50% 50%'],
      ['Ruby drop earrings', 1299, 'Jewellery', 'earrings', '50% 40%'], ['Linen co-ord set', 2199, 'Kurtas', 'rack', '60% 45%'],
    ],
  },
  heritage: {
    shop: 'Rangrez Heritage', tagline: 'Textiles and crafts from Rajasthan', hero: 'loom', focus: '50% 50%', title: 'Crafts with a long memory',
    story: 'Our families have woven, dyed and set jewellery for generations. We work with the same hands and the same methods, for people who want something that lasts.',
    process: [['Dye', 'Natural dyes, mixed in small pots.'], ['Weave', 'Threads set on the loom by hand.'], ['Finish', 'Stitched and checked one by one.']],
    about: 'A family workshop in Jaipur.', aboutImage: 'suitFloral',
    items: [
      ['Gold temple necklace', 4599, 'Jewellery', 'necklace', '50% 50%'], ['Ruby drop earrings', 1299, 'Jewellery', 'earrings', '50% 40%'],
      ['Banarasi suit set, maroon', 5299, 'Textiles', 'suitMaroon', '50% 40%'], ['Block-print suit set', 3499, 'Textiles', 'suitFloral', '50% 30%'],
      ['Glazed bowl set', 1599, 'Pottery', 'bowls', '50% 50%'], ['Stacking planters', 899, 'Pottery', 'stack', '50% 60%'],
    ],
  },
  signaturestudio: {
    shop: 'Meera Rao', tagline: 'Maths and study coach', hero: 'blazer', focus: '50% 30%', title: 'Meera Rao',
    about: 'I help students find confidence in maths, and busy adults rebuild their study habits. My classes are small and unhurried.',
    services: [
      ['Maths tuition, Class 8 to 10', 800, 'Class', '90 min', 'Online'], ['Study skills workshop', 499, 'Class', '60 min', 'Online'], ['1-on-1 coaching session', 1500, '1-on-1', '60 min', 'At my studio'],
    ],
    subjects: ['Maths', 'Study skills'], levels: ['Class 8 to 10', 'Adults'], modes: ['Online', 'At my studio'], sessions: 'Weekday evenings and Saturday mornings',
    credentials: ['B.Ed. in Mathematics', 'M.Sc. in Mathematics', '8 years of teaching'],
    faqs: [['How do I book?', 'Choose a service and press Book. I confirm on WhatsApp.'], ['What if I need to reschedule?', 'Message me a day before and we will find another slot.']],
  },
};

/** Clearly labelled sample content for a template (used only in the gallery and previews, never on a real store). */
export function sampleData(templateId: string): { config: StoreConfig; data: StoreData } {
  const template = templateById(templateId);
  const s = SAMPLE[template.id];
  const config = defaultConfig(template.id, { name: s.shop });
  config.brand.tagline = s.tagline;
  config.hero.title = s.title;
  config.hero.subtitle = s.tagline;
  config.hero.image = PHOTO[s.hero] ?? '';
  config.hero.focus = s.focus || '50% 50%';
  config.about.text = s.about || 'This is sample text. Your own story goes here.';
  if (s.aboutImage) config.about.image = PHOTO[s.aboutImage];
  config.contact = { email: '', phone: '', whatsapp: '9876543210', address: 'Your address here', hours: 'Mon to Sat, 10 am to 7 pm' };
  if (s.story) config.story.text = s.story;
  if (s.process) config.process = s.process.map(([title, text]) => ({ title, text }));
  if (s.subjects) config.services = { subjects: s.subjects, levels: s.levels ?? [], modes: s.modes ?? [], sessions: s.sessions ?? '', credentials: s.credentials ?? [] };
  if (s.faqs) config.faqs = s.faqs.map(([q, a]) => ({ q, a }));

  const products: StoreItem[] = (s.items ?? []).map(([name, price, cat, photoKey, pos], n) => ({
    id: 's' + n, name, price, cat, stock: n === 3 ? 2 : 10, img: PHOTO[photoKey], crop: { pos, zoom: 1 }, desc: 'Sample product description.', sizes: '', tags: '',
  }));
  const services: StoreItem[] = (s.services ?? []).map(([name, price, type, duration, where], n) => ({ id: 'v' + n, name, price, type, duration, where, next: '', img: '' }));
  return {
    config,
    data: {
      shop: { name: s.shop, city: 'Jaipur', handle: 'sample' },
      products: template.kind === 'services' ? [] : products,
      services, bestsellerIds: ['s0', 's1'], ratings: {}, reviews: [], reviewSummary: { count: 0, average: 0 },
    },
  };
}
