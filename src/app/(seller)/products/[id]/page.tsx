'use client';
// Add or change a product (PRD part 1, section 5). The seller adds photos and answers five questions; AI and Stoora fill in the rest.
//   photos (many at once) -> AI reads them (one call) -> a summary card, tap any line to fix -> price, sale, stock, sizes, weight -> Save
// Nothing here blocks on AI: if it is off, slow (over 15 s) or fails, the boxes stay empty and the seller types.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, use } from 'react';
import { BackRow, DSeg, Ms, SaveRow } from '@/components/dash/parts';
import { ProductPhotos, prepare } from '@/components/dash/ProductPhotos';
import { ConfirmDialog, EmptyState, Skeleton, Switch, useToast } from '@/components/ui';
import { rs } from '@/lib/format';
import { useLeaveGuard } from '@/lib/leave-guard';
import { DEFAULT_BOX, KINDS, kindFor, weightNote, type Draft, type SizeKind } from '@/lib/product-ai';
import { useStore } from '@/lib/store';
import type { Product } from '@/lib/types';

const AI_DAILY = 20;
const AI_WAIT_MS = 15_000;
const ICONS: Record<SizeKind, string> = { clothes: 'checkroom', shoes: 'steps', bangles: 'diamond', freesize: 'dry_cleaning', capacity: 'local_cafe', food: 'bakery_dining', decor: 'chair', none: 'sell' };

type Form = {
  name: string; description: string; category: string; color: string; material: string; tags: string[]; box?: { l: number; w: number; h: number };
  price: string; onSale: boolean; comparePrice: string; cost: string; stock: string;
  hasOptions: boolean; kind: SizeKind; sizes: string[]; colors: string[]; optionStock: Record<string, string>;
  weight: string; photos: string[]; show: boolean;
};
const num = (s: string) => Number(String(s).replace(/,/g, ''));
const uniq = (a: string[]) => [...new Set(a.filter(Boolean))];

const toForm = (p?: Product): Form => {
  const kind = p ? kindFor(p.category, p.name) : 'none';
  return {
    name: p?.name ?? '', description: p?.description ?? '', category: p?.category ?? '', color: p?.color ?? '', material: p?.material ?? '', tags: p?.tags ?? [], box: p?.boxCm,
    price: p ? String(p.price) : '', onSale: !!p?.comparePrice, comparePrice: p?.comparePrice ? String(p.comparePrice) : '', cost: p?.cost ? String(p.cost) : '',
    stock: p ? String(p.stock) : '', // a new product starts empty, not 1
    hasOptions: !!p && (p.sizes.length > 0 || (p.colors?.length ?? 0) > 0), kind, sizes: p?.sizes ?? [], colors: p?.colors ?? [],
    optionStock: Object.fromEntries(Object.entries(p?.optionStock ?? {}).map(([k, v]) => [k, String(v)])),
    weight: p?.weightGrams ? String(p.weightGrams) : '', photos: p?.photos ?? [], show: p ? p.status === 'Active' : true,
  };
};

/** The things that get a stock count: each size, or (with no sizes) each colour. */
const optionKeys = (f: Form) => (f.hasOptions ? (f.sizes.length ? f.sizes : uniq([f.color, ...f.colors])) : []);
const totalStock = (f: Form) => { const keys = optionKeys(f); return keys.length ? keys.reduce((a, k) => a + (Number(f.optionStock[k]) || 0), 0) : Number(f.stock) || 0; };

/** A line in the summary card: shows its value, tap to fix. An empty line shows its box straight away. */
function Line({ id, label, value, onChange, placeholder, area }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder: string; area?: boolean }) {
  const [open, setOpen] = useState(false);
  const editing = open || !value;
  return (
    <div className="field" style={{ margin: 0, paddingBottom: 12 }}>
      <label htmlFor={id}>{label}</label>
      {editing
        ? (area
          ? <textarea id={id} className="input" autoFocus={open} placeholder={placeholder} value={value} onChange={(x) => onChange(x.target.value)} onBlur={() => setOpen(false)} />
          : <input id={id} className="input" autoFocus={open} placeholder={placeholder} value={value} onChange={(x) => onChange(x.target.value)} onBlur={() => setOpen(false)} onKeyDown={(x) => { if (x.key === 'Enter') { x.preventDefault(); setOpen(false); } }} />)
        : <button type="button" id={id} className="t-ink" aria-label={`${label}: ${value}. Tap to change`} onClick={() => setOpen(true)} style={{ textAlign: 'left', background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'text', whiteSpace: 'pre-wrap' }}>{value} <span className="tiny muted">· Change</span></button>}
    </div>
  );
}

const countToday = () => { try { const v = JSON.parse(localStorage.getItem('stoora.ai.drafts') || 'null') as { day: string; n: number } | null; return v && v.day === new Date().toDateString() ? v.n : 0; } catch { return 0; } };
const bump = () => { try { localStorage.setItem('stoora.ai.drafts', JSON.stringify({ day: new Date().toDateString(), n: countToday() + 1 })); } catch { /* ignore */ } };

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { db, ready, saveProduct, deleteProduct, restoreProduct } = useStore();
  const router = useRouter();
  const toast = useToast();
  const isNew = id === 'new';
  const p = db.products.find((x) => x.id === id);
  const [f, setF] = useState<Form>(() => toForm(p));
  const [loaded, setLoaded] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newCat, setNewCat] = useState(false);
  const [custom, setCustom] = useState({ size: '', colour: '' });
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const [ai, setAi] = useState<'idle' | 'working' | 'done' | 'unavailable' | 'failed' | 'limit'>('idle');
  const [photosBusy, setPhotosBusy] = useState(false);
  const aiImgs = useRef<Record<string, string>>({});
  const drafted = useRef(false);
  const touchedOptions = useRef(false);
  useEffect(() => { if (ready && !loaded) { const s = toForm(p); setF(s); setNewCat(false); touchedOptions.current = !!p; setLoaded(true); } }, [ready, loaded, p]);
  const base = useMemo(() => JSON.stringify(toForm(p)), [p]);
  const dirty = loaded && JSON.stringify(f) !== base;
  const categories = useMemo(() => uniq(db.products.map((x) => x.category)).sort((a, b) => a.localeCompare(b)), [db.products]);
  const guard = useLeaveGuard(dirty, (href) => setLeaveTo(href));

  const set = (patch: Partial<Form>) => setF((x) => ({ ...x, ...patch }));

  /** Put an AI draft into the form. Only what AI actually found is filled; the seller can fix any line. */
  const applyDraft = (d: Draft) => {
    const colourOk = KINDS[d.sizeKind].colour;
    const sizes = d.sizes.length ? d.sizes : KINDS[d.sizeKind].preset;
    touchedOptions.current = true;
    setNewCat(d.categoryIsNew);
    setF((x) => ({
      ...x,
      name: d.title || x.name, description: d.description || x.description, category: d.category || x.category,
      color: colourOk ? d.color || x.color : '', material: d.material || x.material, tags: d.tags.length ? d.tags : x.tags, box: d.boxCm ?? x.box,
      weight: d.weightGrams ? String(d.weightGrams) : x.weight,
      kind: d.sizeKind, hasOptions: d.sizeKind !== 'none' || sizes.length > 0, sizes, optionStock: Object.fromEntries(sizes.map((s) => [s, x.optionStock[s] ?? ''])),
    }));
  };

  /** One AI call for the whole product. Never blocks: on any trouble the boxes stay empty. */
  const runAi = async () => {
    if (f.photos.length === 0) return;
    if (countToday() >= AI_DAILY) { setAi('limit'); return; }
    setAi('working');
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), AI_WAIT_MS);
    try {
      // at most 3 photos, about 1000 px each
      const shots = await Promise.all(f.photos.slice(0, 3).map(async (src) => {
        if (aiImgs.current[src]) return aiImgs.current[src];
        try { const blob = await (await fetch(src, { signal: ctl.signal })).blob(); const out = await prepare(new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' })); aiImgs.current[src] = out.ai; return out.ai; } catch { return ''; }
      }));
      const photos = shots.filter(Boolean);
      if (!photos.length) { setAi('failed'); return; }
      const r = await fetch('/api/v1/products/ai-draft', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ photos, categories, shopName: db.shop.name }), signal: ctl.signal });
      if (r.status === 503) { setAi('unavailable'); return; }
      if (r.status === 429) { setAi('limit'); return; }
      if (!r.ok) { setAi('failed'); return; }
      const { draft } = (await r.json()) as { draft?: Draft };
      if (!draft || (!draft.title && !draft.description)) { setAi('failed'); return; }
      bump(); applyDraft(draft); setAi('done');
    } catch { setAi('failed'); }
    finally { clearTimeout(timer); }
  };

  // The first time photos are in, read them once. Waits until the picked photos have all arrived, and never overwrites a title already typed.
  useEffect(() => {
    if (!loaded || !isNew || drafted.current || photosBusy || f.photos.length === 0 || f.name.trim()) return;
    const t = setTimeout(() => { drafted.current = true; void runAi(); }, 400);
    return () => clearTimeout(t);
  }, [loaded, isNew, photosBusy, f.photos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // With AI off, a title or category typed by the seller still points to the right sizes (until they choose themselves).
  const guessKind = () => {
    if (touchedOptions.current) return;
    const kind = kindFor(f.category, f.name);
    if (kind === f.kind) return;
    const info = KINDS[kind];
    setF((x) => ({ ...x, kind, hasOptions: kind !== 'none', sizes: info.preset, optionStock: Object.fromEntries(info.preset.map((s) => [s, ''])), color: info.colour ? x.color : '' }));
  };

  if (!ready) return <div className="dpad" style={{ paddingTop: 20 }}><Skeleton rows={4} height={110} /></div>;
  if (!isNew && !p) {
    return (
      <>
        <BackRow to="/products" icon="tag" title="Products" />
        <div className="dpad"><div className="card"><EmptyState icon="search_off" title="We couldn’t find that product" text="It may have been deleted." action={<Link className="btn line sm" href="/products">Back to products</Link>} /></div></div>
      </>
    );
  }

  const keys = optionKeys(f);
  const info = KINDS[f.kind];
  const chips = uniq([...info.options, ...f.sizes]);
  const errors: Record<string, string> = {};
  if (!f.name.trim()) errors.name = 'Add a name buyers will recognise.';
  if (!/^\d+$/.test(f.price.replace(/,/g, '')) || num(f.price) < 1) errors.price = 'Add a price in rupees, like 1499.';
  if (f.onSale && (!/^\d+$/.test(f.comparePrice.replace(/,/g, '')) || num(f.comparePrice) <= num(f.price))) errors.comparePrice = 'The old price should be higher than the price.';
  if (f.cost && !/^\d+$/.test(f.cost.replace(/,/g, ''))) errors.cost = 'Use rupees, like 600.';
  if (!keys.length && !/^\d+$/.test(f.stock)) errors.stock = 'How many do you have? Enter 0 if none.';
  if (keys.some((k) => f.optionStock[k] && !/^\d+$/.test(f.optionStock[k]))) errors.optionStock = 'Use whole numbers for stock, like 5.';
  if (f.hasOptions && f.sizes.length === 0 && !uniq([f.color, ...f.colors]).length) errors.options = 'Pick at least one size or colour, or choose No.';
  if (f.weight && !/^\d+$/.test(f.weight)) errors.weight = 'Use whole grams, like 250.';
  const e = (k: string) => (tried ? errors[k] : undefined);
  const hasPhoto = f.photos.length > 0;
  const shown = f.show && hasPhoto;

  const save = () => {
    setTried(true);
    if (Object.keys(errors).length) { toast('Fix the highlighted fields.', { icon: 'error' }); setTimeout(() => (document.querySelector('.input.bad, .affix.bad input, .money-in.bad input, [data-bad="1"]') as HTMLElement | null)?.focus(), 30); return; }
    setBusy(true);
    const sizes = f.hasOptions ? f.sizes : [];
    const colors = f.hasOptions ? f.colors : [];
    const optionStock = f.hasOptions && keys.length ? Object.fromEntries(keys.map((k) => [k, Number(f.optionStock[k]) || 0])) : undefined;
    const maxNo = Math.max(0, ...db.products.map((x) => Number(/-(\d+)$/.exec(x.productNumber ?? '')?.[1] ?? 0)));
    const prefix = (db.shop.handle.split('-')[0] || 'shop').replace(/[^a-z0-9]/gi, '').toUpperCase() || 'SHOP';
    const next: Product = { ...(p ?? { id: 'p' + Date.now().toString(36), soldLast30Days: 0, icon: ICONS[f.kind], productNumber: `${prefix}-${String(maxNo + 1).padStart(4, '0')}` }),
      name: f.name.trim(), description: f.description.trim() || undefined, category: f.category.trim() || 'Other', color: f.color.trim() || undefined, material: f.material.trim() || undefined,
      price: num(f.price), comparePrice: f.onSale && f.comparePrice ? num(f.comparePrice) : undefined, cost: f.cost ? num(f.cost) : undefined,
      stock: totalStock(f), sizes, colors: colors.length ? colors : undefined, optionStock,
      country: p?.country ?? 'India', tax: p?.tax ?? 'Shop default', googleText: `${f.name.trim()}. ${f.description.trim()}`.slice(0, 300),
      weightGrams: f.weight ? Number(f.weight) : undefined, boxCm: f.box ?? p?.boxCm ?? DEFAULT_BOX, tags: f.tags.length ? f.tags : undefined,
      status: shown ? 'Active' : 'Draft', // no photo: saved hidden
      photos: f.photos } as Product;
    setTimeout(() => {
      try { saveProduct(next); } catch { setBusy(false); toast('Couldn’t save. Your browser storage may be full — remove a photo and try again.', { icon: 'error' }); return; }
      setBusy(false);
      toast(!hasPhoto ? `${next.name} saved, hidden. Add a photo to show it in your shop.` : isNew ? `${next.name} added.` : 'Saved.');
      if (isNew) void guard.release().then(() => router.replace(`/products/${next.id}`)); else setF(toForm(next));
    }, 250);
  };

  const toggleSize = (z: string) => { touchedOptions.current = true; set({ sizes: f.sizes.includes(z) ? f.sizes.filter((s) => s !== z) : chips.filter((s) => s === z || f.sizes.includes(s)), optionStock: { ...f.optionStock, [z]: f.optionStock[z] ?? '' } }); };
  const addSize = () => { const z = custom.size.trim().slice(0, 24); if (!z) return; touchedOptions.current = true; setCustom((c) => ({ ...c, size: '' })); if (!f.sizes.includes(z)) set({ sizes: [...f.sizes, z], optionStock: { ...f.optionStock, [z]: '' } }); };
  const addColour = () => { const z = custom.colour.trim().slice(0, 24); if (!z) return; touchedOptions.current = true; setCustom((c) => ({ ...c, colour: '' })); if (!f.colors.includes(z) && z.toLowerCase() !== f.color.trim().toLowerCase()) set({ colors: [...f.colors, z], optionStock: { ...f.optionStock, [z]: '' } }); };
  const aiNote = ai === 'working' ? 'Reading your photos… you can keep typing.'
    : ai === 'unavailable' ? 'AI is not switched on here, so type the details yourself.'
    : ai === 'failed' ? 'We couldn’t read the photos in time. Type the details yourself.'
    : ai === 'limit' ? `You’ve used today’s ${AI_DAILY} AI drafts. Type the details yourself.` : '';
  const inList = categories.includes(f.category);
  const catValue = newCat || (f.category && !inList) ? '__new' : f.category;

  return (
    <>
      <BackRow to="/products" icon="tag" title="Products" />
      {dirty ? <SaveRow what="product" busy={busy} onSave={save} onDiscard={() => { setF(toForm(p)); setTried(false); setNewCat(false); }} /> : null}
      <div className="dpad" style={{ paddingBottom: dirty ? 90 : undefined }}>
        <h1 className="h1" style={{ margin: '0 0 16px' }}>{isNew ? 'Add product' : p!.name}</h1>
        <form className="cols" noValidate onSubmit={(ev) => { ev.preventDefault(); save(); }}>
          <div>
            <div className="card">
              <div className="box-h"><span className="box-t">Photos</span></div>
              <ProductPhotos photos={f.photos} onChange={(photos) => set({ photos })} onAdded={(c) => { aiImgs.current = { ...aiImgs.current, ...c }; }} onBusyChange={setPhotosBusy} />
            </div>

            <div className="card" aria-busy={ai === 'working'}>
              <div className="box-h"><span className="box-t">About this product</span>
                {hasPhoto && ai !== 'unavailable' ? <button className="mini ai" type="button" disabled={ai === 'working'} onClick={() => { drafted.current = true; void runAi(); }}>{ai === 'working' ? 'Reading photos…' : 'Write it for me'}</button> : null}
              </div>
              {aiNote ? <p className="small muted" role="status" style={{ margin: '0 0 10px' }}>{aiNote}</p> : null}
              <Line id="pf-name" label="Title" value={f.name} onChange={(v) => set({ name: v })} placeholder="e.g. Handblock cotton kurta" />
              {e('name') ? <span className="err" role="alert" data-bad="1">{e('name')}</span> : null}
              <Line id="pf-desc" label="Description" value={f.description} onChange={(v) => set({ description: v })} placeholder="What is it made of? Who is it for?" area />
              <div className="field" style={{ margin: 0, paddingBottom: 12 }}>
                <label htmlFor="pf-cat">Category</label>
                <select id="pf-cat" className="input" value={catValue} onChange={(x) => { if (x.target.value === '__new') { setNewCat(true); set({ category: inList ? '' : f.category }); } else { setNewCat(false); set({ category: x.target.value }); } }} onBlur={guessKind}>
                  {!catValue ? <option value="">Choose a category</option> : null}
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value="__new">+ New category</option>
                </select>
                {catValue === '__new' ? <input id="pf-newcat" className="input" style={{ marginTop: 8 }} aria-label="New category name" placeholder="e.g. Kurtas" maxLength={40} value={f.category} onChange={(x) => set({ category: x.target.value })} onBlur={guessKind} /> : null}
              </div>
              {info.colour ? <Line id="pf-color" label="Colour" value={f.color} onChange={(v) => set({ color: v })} placeholder="e.g. Indigo blue" /> : null}
              <Line id="pf-mat" label="Material" value={f.material} onChange={(v) => set({ material: v })} placeholder="e.g. Cotton" />
            </div>

            <div className="card">
              <div className="box-h"><span className="box-t">Your answers</span></div>
              <div className="stack">
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor="pf-price">1. What is the price?</label>
                  <div className={`money-in${e('price') ? ' bad' : ''}`} style={e('price') ? { borderColor: 'var(--negative)' } : undefined}><span>₹</span><input id="pf-price" inputMode="numeric" placeholder="1499" value={f.price} onChange={(x) => set({ price: x.target.value })} /></div>
                  {e('price') ? <span className="err" role="alert">{e('price')}</span> : null}
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <span className="flabel" id="pf-sale-l">2. Is it on sale?</span>
                  <DSeg label="Is it on sale" value={f.onSale ? 'yes' : 'no'} onChange={(v) => set({ onSale: v === 'yes' })} options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} />
                  {f.onSale ? (
                    <div style={{ marginTop: 8 }}>
                      <label htmlFor="pf-was">Old price (shown crossed out)</label>
                      <div className={`money-in${e('comparePrice') ? ' bad' : ''}`} style={e('comparePrice') ? { borderColor: 'var(--negative)' } : undefined}><span>₹</span><input id="pf-was" inputMode="numeric" placeholder="1899" value={f.comparePrice} onChange={(x) => set({ comparePrice: x.target.value })} /></div>
                      {e('comparePrice') ? <span className="err" role="alert">{e('comparePrice')}</span> : null}
                    </div>
                  ) : null}
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor="pf-stock">3. How many do you have?</label>
                  {keys.length
                    ? <p className="small muted" style={{ margin: 0 }}>Adds up from your {f.sizes.length ? 'sizes' : 'colours'} below: <b className="t-ink">{totalStock(f)}</b></p>
                    : <input id="pf-stock" className={`input${e('stock') ? ' bad' : ''}`} style={{ maxWidth: 160 }} inputMode="numeric" placeholder="0" value={f.stock} onChange={(x) => set({ stock: x.target.value.replace(/\D/g, '') })} />}
                  {e('stock') ? <span className="err" role="alert">{e('stock')}</span> : null}
                  {!keys.length && f.stock === '0' ? <span className="tiny muted">Buyers will see “Sold out”.</span> : null}
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <span className="flabel">4. Does it come in sizes or colours?</span>
                  <DSeg label="Sizes or colours" value={f.hasOptions ? 'yes' : 'no'} onChange={(v) => { touchedOptions.current = true; set(v === 'yes' ? { hasOptions: true, sizes: f.sizes.length ? f.sizes : info.preset, optionStock: { ...Object.fromEntries(info.preset.map((s) => [s, ''])), ...f.optionStock } } : { hasOptions: false }); }} options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} />
                  {f.hasOptions ? (
                    <div className="stack tight" style={{ marginTop: 10 }}>
                      <span className="small muted">Sizes {info.noun !== 'sizes' ? `(${info.noun.replace(/^sizes \(?|\)$/g, '')})` : ''}</span>
                      <div className="chips wrap" role="group" aria-label="Sizes">{chips.map((z) => <button key={z} type="button" className={`chip${f.sizes.includes(z) ? ' on' : ''}`} aria-pressed={f.sizes.includes(z)} onClick={() => toggleSize(z)}>{z}</button>)}</div>
                      <div className="row" style={{ gap: 8 }}>
                        <input className="input" style={{ maxWidth: 220 }} aria-label="Add your own size" placeholder={info.placeholder} value={custom.size} onChange={(x) => setCustom((c) => ({ ...c, size: x.target.value }))} onKeyDown={(x) => { if (x.key === 'Enter') { x.preventDefault(); addSize(); } }} />
                        <button type="button" className="btn grey sm" onClick={addSize}>+ Add your own</button>
                      </div>
                      {info.colour ? (
                        <>
                          <span className="small muted" style={{ marginTop: 6 }}>Other colours {f.color ? `(besides ${f.color})` : ''}</span>
                          {f.colors.length ? <div className="chips wrap" role="group" aria-label="Colours">{f.colors.map((z) => <button key={z} type="button" className="chip on" aria-label={`Remove ${z}`} onClick={() => set({ colors: f.colors.filter((c) => c !== z) })}>{z} ✕</button>)}</div> : null}
                          <div className="row" style={{ gap: 8 }}>
                            <input className="input" style={{ maxWidth: 220 }} aria-label="Add your own colour" placeholder="e.g. Sky blue" value={custom.colour} onChange={(x) => setCustom((c) => ({ ...c, colour: x.target.value }))} onKeyDown={(x) => { if (x.key === 'Enter') { x.preventDefault(); addColour(); } }} />
                            <button type="button" className="btn grey sm" onClick={addColour}>+ Add your own</button>
                          </div>
                        </>
                      ) : null}
                      {keys.length ? (
                        <div className="stack tight" style={{ marginTop: 6 }}>
                          <span className="small muted">Stock for each {f.sizes.length ? 'size' : 'colour'}</span>
                          {keys.map((k) => (
                            <div className="row" key={k}><span className="sp">{k}</span>
                              <div className="dstep"><button type="button" aria-label={`Less ${k}`} onClick={() => set({ optionStock: { ...f.optionStock, [k]: String(Math.max(0, (Number(f.optionStock[k]) || 0) - 1)) } })}>−</button><input inputMode="numeric" value={f.optionStock[k] ?? ''} placeholder="0" aria-label={`Stock for ${k}`} onChange={(x) => set({ optionStock: { ...f.optionStock, [k]: x.target.value.replace(/\D/g, '') } })} /><button type="button" aria-label={`More ${k}`} onClick={() => set({ optionStock: { ...f.optionStock, [k]: String((Number(f.optionStock[k]) || 0) + 1) } })}>+</button></div>
                            </div>
                          ))}
                          <div className="row"><b className="sp">Total</b><b className="num" aria-live="polite">{totalStock(f)}</b></div>
                        </div>
                      ) : null}
                      {e('options') ? <span className="err" role="alert">{e('options')}</span> : null}
                      {e('optionStock') ? <span className="err" role="alert">{e('optionStock')}</span> : null}
                    </div>
                  ) : null}
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor="pf-weight">5. How much does it weigh?</label>
                  <div className={`affix${e('weight') ? ' bad' : ''}`} style={{ maxWidth: 220 }}><input id="pf-weight" type="text" inputMode="numeric" placeholder="250" value={f.weight} onChange={(x) => set({ weight: x.target.value.replace(/\D/g, '').slice(0, 6) })} aria-describedby="pf-weight-h" /><span aria-hidden="true">grams</span></div>
                  <span className="tiny muted" id="pf-weight-h">{weightNote(Number(f.weight)) || 'We use this to work out delivery. A guess is fine.'}</span>
                  {e('weight') ? <span className="err" role="alert">{e('weight')}</span> : null}
                </div>
              </div>
              <details style={{ marginTop: 14 }}>
                <summary className="small muted" style={{ cursor: 'pointer' }}>What it costs you (optional, only you see this)</summary>
                <div className="field" style={{ marginTop: 8 }}>
                  <label htmlFor="pf-cost">Cost per item</label>
                  <div className={`money-in${e('cost') ? ' bad' : ''}`} style={{ maxWidth: 220, ...(e('cost') ? { borderColor: 'var(--negative)' } : {}) }}><span>₹</span><input id="pf-cost" inputMode="numeric" placeholder="600" value={f.cost} onChange={(x) => set({ cost: x.target.value })} /></div>
                  {e('cost') ? <span className="err" role="alert">{e('cost')}</span> : null}
                  {f.cost && f.price && !e('cost') && num(f.price) > num(f.cost) ? <p className="small muted" style={{ margin: '6px 0 0' }}>You keep about {rs(num(f.price) - num(f.cost))} on each sale ({Math.round(((num(f.price) - num(f.cost)) / num(f.price)) * 100)}%).</p> : null}
                </div>
              </details>
            </div>
          </div>

          <div>
            <div className="card">
              <div className="box-h"><span className="box-t">Show in shop</span>
                <Switch checked={shown} onChange={(v) => set({ show: v })} label="Show in shop" />
              </div>
              <p className="tiny muted" style={{ margin: 0 }} role="status">{!hasPhoto ? 'Add a photo to show it in your shop.' : shown ? 'Buyers can see and order it.' : 'Hidden: only you can see it.'}</p>
              {!isNew ? <div className="small muted" style={{ marginTop: 10 }}>Product number <b className="t-ink">{p!.productNumber ?? '—'}</b></div> : null}
            </div>
            {!isNew ? (
              <div className="card"><div className="box-h"><span className="box-t">Last 30 days</span></div>
                <div className="tiles"><div className="tile static"><div className="k">Sold</div><div className="v">{p!.soldLast30Days}</div></div><div className="tile static"><div className="k">Looked yesterday</div><div className="v">{p!.viewsYesterday ?? '—'}</div></div></div>
                <div className="row" style={{ marginTop: 12 }}><span className="thumb"><Ms n={p!.icon} /></span><span className="sp small muted">Shown on your shop under “{p!.category}”.</span></div>
              </div>
            ) : null}
            <button className="btn main full" type="submit" disabled={busy || (!isNew && !dirty)}>{busy ? 'Saving…' : isNew ? 'Add product' : dirty ? 'Save changes' : 'Saved'}</button>
            {!isNew ? (
              <details className="more" style={{ marginTop: 12 }}>
                <summary className="btn line sm" style={{ display: 'inline-flex', cursor: 'pointer' }}>More</summary>
                <div className="card" style={{ marginTop: 8 }}>
                  <button type="button" className="btn line sm" style={{ color: 'var(--negative-deep)' }} onClick={() => {
                    const gone = deleteProduct(p!.id);
                    void guard.release().then(() => router.push('/products'));
                    toast(`${p!.name} deleted.`, { icon: 'delete', undo: () => gone && restoreProduct(gone) });
                  }}>Delete product</button>
                  <p className="tiny muted" style={{ margin: '8px 0 0' }}>You can undo for 5 seconds. Past orders keep their details.</p>
                </div>
              </details>
            ) : null}
          </div>
        </form>
      </div>
      <ConfirmDialog open={leaveTo !== null} onClose={() => { setLeaveTo(null); guard.stay(); }} title="Leave without saving?" body="Your changes to this product won’t be saved." yes="Leave" danger onYes={() => { if (leaveTo !== null) guard.leave(leaveTo); }} />
    </>
  );
}
