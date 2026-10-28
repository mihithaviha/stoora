// AI order drafts: prompt, catalog matching and the checks the seller must clear before approving.
import type { ExtractedOrder, Product } from './types';
import { plural } from './format';

export const EXAMPLE_CHAT = `[27/10/26, 9:12 am] Priya Sharma: Hi, I need two blue kurtas in size M
[27/10/26, 9:12 am] Priya Sharma: Can you deliver to Hyderabad? Banjara Hills
[27/10/26, 9:13 am] Priya Sharma: My name is Priya Sharma. Please tell me the total price
[27/10/26, 9:20 am] Meera Studio: Hi Priya, sure. Checking stock now
[27/10/26, 9:21 am] Priya Sharma: I can pay by UPI once you confirm`;

/** A fixed, hand-written extraction of EXAMPLE_CHAT. Used only for the clearly labelled "example draft". */
export const EXAMPLE_EXTRACTION: ExtractedOrder = {
  customer: { name: 'Priya Sharma', phone: null },
  items: [{ said: 'two blue kurtas in size M', matches: ['p6', 'p3'], sure: false, size: 'M', qty: 2 }],
  delivery: { city: 'Hyderabad', address: 'Banjara Hills' },
  payment: { method: 'upi', buyerSaysPaid: false, said: 'I can pay by UPI once you confirm' },
  notes: null,
  questions: ['Which blue kurta does she mean — sky blue or indigo?', 'Ask for the full delivery address.'],
  excerpts: ['I need two blue kurtas in size M', 'Can you deliver to Hyderabad? Banjara Hills', 'I can pay by UPI once you confirm'],
};

export type CatalogItem = { id: string; name: string; color: string | null; sizes: string[]; price: number; stock: number };
export const catalogFor = (products: Product[]): CatalogItem[] => products.filter((p) => p.status === 'Active').map((p) => ({ id: p.id, name: p.name, color: p.color ?? null, sizes: p.sizes, price: p.price, stock: p.stock }));

export function extractPrompt(catalog: CatalogItem[], text: string, source: string, hasImages: boolean) {
  return `You help a small Indian seller turn a buyer conversation into an ORDER DRAFT for the seller to check. Read the conversation${hasImages ? ' in the attached screenshot(s)' : ''} and the seller's CATALOG.
Rules: extract only what the buyer actually said. Use null for anything not stated — never guess names, phone numbers, addresses, prices or delivery fees. Match products ONLY to catalog ids; list every catalog id that could fit (best first) and set "sure" false when more than one fits or the match is a guess. If nothing fits, give an empty list. If a quantity or size is unclear, set it null and add a plain question for the seller. A buyer saying they will pay or have paid is NOT proof of payment.
CATALOG: ${JSON.stringify(catalog)}
${text ? `CONVERSATION (source: ${source}):\n${text}` : ''}
Reply with only JSON:
{"customer":{"name":string|null,"phone":string|null},
 "items":[{"said":"the buyer's words for this item","matches":["catalog id",...],"sure":boolean,"size":string|null,"qty":number|null}],
 "delivery":{"city":string|null,"address":string|null},
 "payment":{"method":"upi"|"cod"|"cash"|null,"buyerSaysPaid":boolean,"said":string|null},
 "notes":string|null,
 "questions":["short plain questions for the seller about anything unclear"],
 "excerpts":["up to 4 exact short quotes from the conversation that support the details"]}`;
}

export interface DraftItem { said: string; cands: string[]; productId: string; size: string; saidSize: string; qty: string }
export interface Draft { name: string; phone: string; city: string; address: string; items: DraftItem[]; pay: 'upi' | 'cod' | 'paid'; buyerSaysPaid: boolean; paySaid: string; ship: string; notes: string; questions: string[]; excerpts: string[] }

/** Turn the AI's answer into an editable draft, keeping only ids that really exist in this catalog. */
export function toDraft(r: ExtractedOrder, products: Product[]): Draft {
  const ids = new Set(products.map((p) => p.id));
  const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');
  const items = (Array.isArray(r.items) ? r.items : []).slice(0, 8).map((it) => {
    const cands = (Array.isArray(it.matches) ? it.matches : []).map(String).filter((id) => ids.has(id));
    const first = products.find((p) => p.id === cands[0]);
    const size = s(it.size).toUpperCase(); const q = Number(it.qty);
    return { said: s(it.said) || '(not quoted)', cands, productId: cands.length === 1 && it.sure !== false ? cands[0] : '', size: first?.sizes.includes(size) && cands.length === 1 ? size : '', saidSize: size, qty: Number.isFinite(q) && q > 0 ? String(Math.round(q)) : '' };
  });
  const pm = r.payment ?? ({} as ExtractedOrder['payment']);
  return { name: s(r.customer?.name), phone: s(r.customer?.phone), city: s(r.delivery?.city), address: s(r.delivery?.address), items,
    pay: pm.method === 'cod' ? 'cod' : 'upi', buyerSaysPaid: !!pm.buyerSaysPaid, paySaid: s(pm.said), ship: '', notes: s(r.notes),
    questions: (Array.isArray(r.questions) ? r.questions : []).map(s).filter(Boolean).slice(0, 5), excerpts: (Array.isArray(r.excerpts) ? r.excerpts : []).map(s).filter(Boolean).slice(0, 4) };
}

export function draftIssues(d: Draft, products: Product[]) {
  const out: { field: string; text: string }[] = [];
  if (!d.name.trim()) out.push({ field: 'ai-name', text: 'Add the buyer’s name — it wasn’t in the chat.' });
  if (!d.items.length) out.push({ field: 'ai-add', text: 'No products were found in the chat. Add the product the buyer wants.' });
  d.items.forEach((it, n) => {
    const p = products.find((x) => x.id === it.productId);
    if (!p) { out.push({ field: `ai-p-${n}`, text: it.cands.length > 1 ? `Choose which product “${it.said}” means — ${it.cands.length} could match.` : `Choose the product for “${it.said}”. It didn’t match your catalog for sure.` }); return; }
    if (p.sizes.length && !it.size) out.push({ field: `ai-s-${n}`, text: it.saidSize && !p.sizes.includes(it.saidSize) ? `Size ${it.saidSize} isn’t available for ${p.name}. Pick a size.` : `Pick a size for ${p.name}.` });
    const q = Number(it.qty);
    if (!it.qty || !Number.isInteger(q) || q < 1) out.push({ field: `ai-q-${n}`, text: `Confirm how many ${p.name} the buyer wants.` });
    else if (q > p.stock) out.push({ field: `ai-q-${n}`, text: `Only ${p.stock} ${p.name} in stock. Lower the quantity or restock first.` });
  });
  if (d.ship && !/^\d+$/.test(d.ship.trim())) out.push({ field: 'ai-ship', text: 'Delivery charge: use numbers only.' });
  return out;
}
export const issuesTitle = (n: number) => `${plural(n, 'thing needs', 'things need')} your attention`;
