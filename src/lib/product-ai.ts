// What the "Add product" screen knows about a product before the seller types anything:
//   - which sizes or options suit a category (PRD 5.4, approved as decision D4)
//   - the one prompt AI gets, and how its answer is cleaned (PRD 5.3: no price, no "₹0", no "One size", no emoji)
// Used by the screen and by /api/describe-product, so the same rules apply whether AI answered or the seller typed.

export type SizeKind = 'clothes' | 'shoes' | 'bangles' | 'freesize' | 'capacity' | 'food' | 'decor' | 'none';

export interface KindInfo {
  /** All the options we offer as chips for this kind. */
  options: string[];
  /** Chips switched on to begin with. */
  preset: string[];
  /** Whether "colour" makes sense (cakes and sweets: no colour question). */
  colour: boolean;
  /** Plain words for the question and the "+ Add your own" box. */
  noun: string;
  placeholder: string;
}

export const KINDS: Record<SizeKind, KindInfo> = {
  clothes: { options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], preset: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], colour: true, noun: 'sizes', placeholder: 'e.g. 3XL' },
  shoes: { options: ['UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'], preset: [], colour: true, noun: 'sizes', placeholder: 'e.g. UK 12' },
  bangles: { options: ['Free size', '2.4', '2.6', '2.8', '2.10'], preset: ['2.4', '2.6', '2.8'], colour: true, noun: 'sizes', placeholder: 'e.g. 2.2' },
  freesize: { options: ['Free size'], preset: ['Free size'], colour: true, noun: 'sizes', placeholder: 'e.g. Large' },
  capacity: { options: ['150 ml', '250 ml', '350 ml', '500 ml', '750 ml', '1000 ml'], preset: ['250 ml', '350 ml', '500 ml'], colour: true, noun: 'sizes (capacity in ml)', placeholder: 'e.g. 400 ml' },
  food: { options: ['0.5 kg', '1 kg', '2 kg'], preset: ['0.5 kg', '1 kg', '2 kg'], colour: false, noun: 'sizes (weight in kg)', placeholder: 'e.g. 1.5 kg' },
  decor: { options: [], preset: [], colour: true, noun: 'sizes (in cm, L × W × H)', placeholder: 'e.g. 10 × 10 × 12 cm' },
  none: { options: [], preset: [], colour: true, noun: 'sizes', placeholder: 'e.g. Large' },
};

export const SIZE_KINDS = Object.keys(KINDS) as SizeKind[];

const has = (t: string, words: RegExp) => words.test(t.toLowerCase());
/** The size kind that fits a category or a product name. Used when AI is off and to double-check AI. */
export function kindFor(...texts: (string | undefined)[]): SizeKind {
  const t = texts.filter(Boolean).join(' ').toLowerCase();
  if (!t.trim()) return 'none';
  if (has(t, /\b(shoe|shoes|sandal|sandals|sneaker|sneakers|heel|heels|slipper|slippers|juti|jutti|mojari|kolhapuri|boot|boots|footwear)\b/)) return 'shoes';
  if (has(t, /\b(bangle|bangles|bracelet|bracelets|kada|churi|churiyan)\b/)) return 'bangles';
  if (has(t, /\b(cake|cakes|cupcake|brownie|brownies|sweet|sweets|mithai|laddu|ladoo|cookie|cookies|biscuit|bread|pickle|snack|snacks|chocolate|chocolates|food|bakery|bake|bakes|masala|jam|honey)\b/)) return 'food';
  if (has(t, /\b(cup|cups|mug|mugs|bottle|bottles|tumbler|tumblers|glass|glasses|flask|jug|sipper|bowl|bowls)\b/)) return 'capacity';
  if (has(t, /\b(candle|candles|decor|decoration|art|painting|paintings|poster|posters|frame|frames|vase|vases|sculpture|wall hanging|planter|planters|diya|showpiece)\b/)) return 'decor';
  if (has(t, /\b(cap|caps|hat|hats|scarf|scarves|stole|dupatta|dupattas|bag|bags|tote|totes|pouch|purse|wallet|belt|earring|earrings|necklace|ring|rings|jewellery|jewelry|hair|clip|clips|scrunchie|mask)\b/)) return 'freesize';
  if (has(t, /\b(kurta|kurtas|kurti|kurtis|t-?shirt|t-?shirts|shirt|shirts|dress|dresses|top|tops|saree|blouse|salwar|suit|suits|lehenga|gown|skirt|skirts|pant|pants|trouser|trousers|jeans|hoodie|jacket|sweater|shorts|palazzo|clothes|clothing|apparel|kidswear|nightwear|co-?ord|coord|tee)\b/)) return 'clothes';
  if (has(t, /\b(book|books|card|cards|notebook|notebooks|diary|sticker|stickers|print|prints|stationery|toy|toys|soap|soaps|oil|oils)\b/)) return 'none';
  return 'none';
}

/** "1500 g" is read as "= 1.5 kg" (only above 1000 g). */
export function weightNote(grams: number): string {
  if (!(grams > 1000)) return '';
  const kg = Math.round((grams / 1000) * 100) / 100;
  return `= ${String(kg).replace(/\.0+$/, '')} kg`;
}

/** The box used when nobody knows better: a small padded mailer, in cm. */
export const DEFAULT_BOX = { l: 25, w: 20, h: 5 };

// ---- cleaning what AI writes ---------------------------------------------------------------------------------
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;
/**
 * A description is 2–3 short lines about what it is, what it is made of and who it is for.
 * Never a price, never "₹0", never "One size" unless the product really comes in Free size, never an emoji.
 */
export function cleanDescription(text: unknown, opts: { freeSize?: boolean } = {}): string {
  if (typeof text !== 'string') return '';
  let t = text.replace(EMOJI, '').replace(/\r/g, '');
  t = t.split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
  // drop any sentence that talks about money, or says "one size" for something that isn't free size
  const bad = (s: string) => /₹|\brs\.?\s?\d|\binr\b|\brupees?\b|\bprice[sd]?\b|\bcosts?\b|\bonly\s+\d{2,}\b|\bfor\s+\d{3,}\b/i.test(s) || (!opts.freeSize && /\bone[\s-]?size\b/i.test(s));
  const kept = t.split('\n').flatMap((line) => line.split(/(?<=[.!?])\s+/)).filter((s) => s && !bad(s));
  const lines = kept.slice(0, 3).join(' ').replace(/\s{2,}/g, ' ').trim();
  return lines.slice(0, 600);
}

const str = (v: unknown, max = 80) => (typeof v === 'string' ? v.replace(EMOJI, '').replace(/\s+/g, ' ').trim().slice(0, max) : '');
const int = (v: unknown, lo: number, hi: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= lo && n <= hi ? n : undefined; };

export interface Draft {
  title: string; description: string; category: string; categoryIsNew: boolean; color: string; material: string;
  sizeKind: SizeKind; sizes: string[]; weightGrams?: number; boxCm?: { l: number; w: number; h: number }; tags: string[];
}

/** Turn whatever AI said into a safe draft. Anything odd is dropped, never shown. */
export function normaliseDraft(raw: unknown, shopCategories: string[]): Draft {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const title = str(r.title, 120);
  let category = str(r.category, 40);
  const match = shopCategories.find((c) => c.toLowerCase() === category.toLowerCase());
  if (match) category = match;
  const sizeKind: SizeKind = SIZE_KINDS.includes(r.sizeKind as SizeKind) ? (r.sizeKind as SizeKind) : kindFor(category, title);
  const sizes = (Array.isArray(r.sizes) ? r.sizes : []).map((s) => str(s, 24)).filter(Boolean).slice(0, 12);
  const freeSize = sizeKind === 'freesize' || sizes.some((s) => /free\s*size/i.test(s));
  const b = (r.boxCm && typeof r.boxCm === 'object' ? r.boxCm : {}) as Record<string, unknown>;
  const l = int(b.l, 1, 200), w = int(b.w, 1, 200), h = int(b.h, 1, 200);
  return {
    title,
    description: cleanDescription(r.description, { freeSize }),
    category,
    categoryIsNew: !!category && !match,
    color: KINDS[sizeKind].colour ? str(r.color, 40) : '',
    material: str(r.material, 60),
    sizeKind,
    sizes,
    weightGrams: int(r.weightGrams, 1, 100000),
    boxCm: l && w && h ? { l, w, h } : undefined,
    tags: (Array.isArray(r.tags) ? r.tags : []).map((t) => str(t, 24).toLowerCase()).filter(Boolean).slice(0, 10),
  };
}

/** The single prompt for a product. One call fills everything (PRD 5.3, "AI cost rules"). */
export function productPrompt(shopCategories: string[], shopName: string): string {
  return `You help a small Indian online seller list one product from its photos${shopName ? ` (shop: ${shopName})` : ''}.
Look at the photos and reply with ONE JSON object only, no other text:
{
  "title": "short product name a buyer would search for, max 8 words",
  "description": "2 to 3 short sentences: what it is, what it is made of, who it is for. Plain words.",
  "category": "one of the shop's categories if one fits, otherwise a new short category name",
  "color": "main colour, one or two words, or empty if not clear",
  "material": "main material if you can tell, otherwise empty",
  "sizeKind": "one of: clothes, shoes, bangles, freesize, capacity, food, decor, none",
  "sizes": ["suggested options the buyer picks from, matching sizeKind"],
  "weightGrams": 0,
  "boxCm": { "l": 0, "w": 0, "h": 0 },
  "tags": ["up to 8 search words"]
}
Rules:
- The description NEVER mentions a price, money, "₹0", or "One size" (unless sizeKind is "freesize"). No emoji.
- sizeKind: clothes (kurta, t-shirt, dress), shoes, bangles (bracelets, bangles), freesize (caps, scarves, dupattas, bags), capacity (cups, mugs, bottles: sizes in ml like "250 ml"), food (cakes, sweets: sizes like "0.5 kg", "1 kg"), decor (candles, decor, art: sizes in cm like "10 × 10 × 12 cm"), none (books, cards, anything else).
- For clothes use sizes from XS, S, M, L, XL, XXL. For shoes "UK 5" to "UK 11". For food use "0.5 kg", "1 kg", "2 kg" and leave color empty.
- weightGrams: your best guess for the packed item in grams. boxCm: a shipping box in cm that fits it.
- Shop's categories: ${shopCategories.length ? JSON.stringify(shopCategories) : 'none yet'}. Pick one of these when it fits. Do not invent a "Kurtas" default.
- If you cannot tell what it is, leave the text fields empty rather than guessing.`;
}
