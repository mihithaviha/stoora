'use client';
// Add or change a product (the dashboard prototype's Add product screen). Changes show an "Unsaved product" bar with Discard and Save.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, use } from 'react';
import { BackRow, DI, DSeg, Ms, SaveRow } from '@/components/dash/parts';
import { ConfirmDialog, EmptyState, Skeleton, useToast } from '@/components/ui';
import { describeProduct } from '@/lib/ask';
import { rs } from '@/lib/format';
import { useStore } from '@/lib/store';
import type { Product } from '@/lib/types';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
type Form = { name: string; description: string; category: Product['category']; color: string; price: string; comparePrice: string; cost: string; stock: string; status: Product['status']; sizes: string[]; photos: string[] };
const toForm = (p?: Product): Form => ({ name: p?.name ?? '', description: p?.description ?? '', category: p?.category ?? 'Kurtas', color: p?.color ?? '', price: p ? String(p.price) : '', comparePrice: p?.comparePrice ? String(p.comparePrice) : '', cost: p?.cost ? String(p.cost) : '', stock: p ? String(p.stock) : '1', status: p?.status ?? 'Active', sizes: p?.sizes ?? [], photos: p?.photos ?? [] });
const num = (s: string) => Number(s.replace(/,/g, ''));

/** Shrink a photo in the browser so it fits in demo storage. Production uploads go to file storage instead. */
function shrink(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, 640 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
    img.src = url;
  });
}

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
  const [del, setDel] = useState(false);
  const [photoErr, setPhotoErr] = useState('');
  useEffect(() => { if (ready && !loaded) { setF(toForm(p)); setLoaded(true); } }, [ready, loaded, p]);
  const base = useMemo(() => JSON.stringify(toForm(p)), [p]);
  const dirty = loaded && JSON.stringify(f) !== base;
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  if (!ready) return <div className="dpad" style={{ paddingTop: 20 }}><Skeleton rows={4} height={110} /></div>;
  if (!isNew && !p) {
    return (
      <>
        <BackRow to="/products" icon="tag" title="Products" />
        <div className="dpad"><div className="card"><EmptyState icon="search_off" title="We couldn’t find that product" text="It may have been deleted." action={<Link className="btn line sm" href="/products">Back to products</Link>} /></div></div>
      </>
    );
  }

  const errors: Record<string, string> = {};
  if (!f.name.trim()) errors.name = 'Add a name buyers will recognise.';
  if (!/^\d+$/.test(f.price.replace(/,/g, '')) || num(f.price) < 1) errors.price = 'Add a price in rupees, like 1499.';
  if (f.comparePrice && (!/^\d+$/.test(f.comparePrice.replace(/,/g, '')) || num(f.comparePrice) <= num(f.price))) errors.comparePrice = 'This should be higher than the price.';
  if (f.cost && !/^\d+$/.test(f.cost.replace(/,/g, ''))) errors.cost = 'Use rupees, like 600.';
  if (!/^\d+$/.test(f.stock)) errors.stock = 'Use a whole number, like 5.';
  const e = (k: string) => (tried ? errors[k] : undefined);
  const set = (patch: Partial<Form>) => setF((x) => ({ ...x, ...patch }));

  const addPhotos = async (files: FileList | null) => {
    setPhotoErr('');
    const list = [...(files ?? [])].filter((x) => x.type.startsWith('image/'));
    if (!list.length) { if (files?.length) setPhotoErr('Only photos (JPG, PNG, WebP) can be added.'); return; }
    try { const out = await Promise.all(list.slice(0, 6 - f.photos.length).map(shrink)); set({ photos: [...f.photos, ...out].slice(0, 6) }); }
    catch { setPhotoErr('One of those photos couldn’t be read. Try a different file.'); }
  };
  const save = () => {
    setTried(true);
    if (Object.keys(errors).length) { toast('Fix the highlighted fields.', { icon: 'error' }); setTimeout(() => (document.querySelector('.input.bad, .affix.bad input') as HTMLElement | null)?.focus(), 30); return; }
    setBusy(true);
    const next: Product = { ...(p ?? { id: 'p' + Date.now().toString(36), soldLast30Days: 0, icon: f.category === 'Dupattas' ? 'dry_cleaning' : 'checkroom' }),
      name: f.name.trim(), description: f.description.trim() || undefined, category: f.category, color: f.color.trim() || undefined, price: num(f.price),
      comparePrice: f.comparePrice ? num(f.comparePrice) : undefined, cost: f.cost ? num(f.cost) : undefined, stock: Number(f.stock), status: f.status, sizes: f.sizes, photos: f.photos } as Product;
    setTimeout(() => {
      try { saveProduct(next); } catch { setBusy(false); toast('Couldn’t save. Your browser storage may be full — remove a photo and try again.', { icon: 'error' }); return; }
      setBusy(false); toast(isNew ? `${next.name} added.` : 'Saved.');
      if (isNew) router.replace(`/products/${next.id}`); else setF(toForm(next));
    }, 250);
  };
  const writeIt = () => {
    const sample = { ...(p ?? { id: 'x', soldLast30Days: 0, icon: 'checkroom', stock: 1, status: 'Active' }), name: f.name.trim() || 'This piece', category: f.category, color: f.color.trim() || undefined, sizes: f.sizes, price: num(f.price) || 0 } as Product;
    set({ description: describeProduct(sample) });
  };
  const nextStock = (d: number) => set({ stock: String(Math.max(0, (Number(f.stock) || 0) + d)) });

  return (
    <>
      {dirty
        ? <SaveRow what="product" busy={busy} onSave={save} onDiscard={() => { setF(toForm(p)); setTried(false); setPhotoErr(''); }} />
        : <BackRow to="/products" icon="tag" title="Products" />}
      <div className="dpad">
        <h1 className="h1" style={{ margin: '0 0 16px' }}>{isNew ? 'Add product' : p!.name}</h1>
        <form className="cols" noValidate onSubmit={(ev) => { ev.preventDefault(); save(); }}>
          <div>
            <div className="card">
              <div className="field"><label htmlFor="pf-name">Title</label><input id="pf-name" className={`input${e('name') ? ' bad' : ''}`} placeholder="e.g. Handblock cotton kurta" value={f.name} onChange={(x) => set({ name: x.target.value })} />{e('name') ? <span className="err" role="alert">{e('name')}</span> : null}</div>
              <div className="field"><label htmlFor="pf-desc">Description</label><textarea id="pf-desc" className="input" placeholder="What is it made of? Who is it for?" value={f.description} onChange={(x) => set({ description: x.target.value })} /><button className="mini ai" type="button" style={{ justifySelf: 'start' }} onClick={writeIt}><DI n="spark" s={14} /> Write it for me</button></div>
              <div className="field">
                <label htmlFor="pf-photos">Photos</label>
                {f.photos.length > 0 ? <div className="photos" style={{ marginBottom: 8 }}>{f.photos.map((s, n) => (
                  <span key={n} style={{ position: 'relative', display: 'inline-block' }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={s} alt={`Product photo ${n + 1}`} />
                    <button type="button" className="ibtn" style={{ position: 'absolute', top: 4, right: 4, width: 28, height: 28 }} aria-label={`Remove photo ${n + 1}`} onClick={() => set({ photos: f.photos.filter((_, i) => i !== n) })}><DI n="x" s={14} /></button></span>))}</div> : null}
                {f.photos.length < 6 ? (
                  <label className="drop" htmlFor="pf-photos" onDragOver={(x) => x.preventDefault()} onDrop={(x) => { x.preventDefault(); addPhotos(x.dataTransfer.files); }}>
                    <span className="btn grey sm"><DI n="img" s={16} /> Add photos</span><span className="tiny muted">Up to 6. The first one is the cover. In this demo, photos stay in this browser.</span>
                    <input type="file" id="pf-photos" accept="image/*" multiple onChange={(x) => addPhotos(x.target.files)} />
                  </label>
                ) : null}
                {photoErr ? <span className="err" role="alert">{photoErr}</span> : null}
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="pf-cat">Category</label>
                <select id="pf-cat" className="input" value={f.category} onChange={(x) => set({ category: x.target.value as Product['category'] })}>{['Kurtas', 'Dupattas', 'Other'].map((c) => <option key={c}>{c}</option>)}</select>
              </div>
            </div>

            <div className="card">
              <div className="box-h"><span className="box-t">Price</span></div>
              <div className="row" style={{ gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {([['pf-price', 'Price', 'price', '1499'], ['pf-was', 'Compare-at price', 'comparePrice', '1899'], ['pf-cost', 'Cost per item', 'cost', '600']] as const).map(([id2, label, key, ph]) => (
                  <div className="field sp" key={id2} style={{ flex: '1 1 130px' }}>
                    <label htmlFor={id2}>{label}</label>
                    <div className={`money-in${e(key) ? ' bad' : ''}`} style={e(key) ? { borderColor: 'var(--negative)' } : undefined}><span>₹</span><input id={id2} inputMode="numeric" placeholder={ph} value={f[key]} onChange={(x) => set({ [key]: x.target.value } as Partial<Form>)} /></div>
                    {e(key) ? <span className="err" role="alert">{e(key)}</span> : null}
                  </div>
                ))}
              </div>
              {f.cost && f.price && !e('cost') && num(f.price) > num(f.cost) ? <p className="small muted" style={{ margin: 0 }}>You keep about {rs(num(f.price) - num(f.cost))} on each sale ({Math.round(((num(f.price) - num(f.cost)) / num(f.price)) * 100)}%). Only you see the cost.</p> : null}
            </div>

            <div className="card">
              <div className="box-h"><span className="box-t">Stock</span></div>
              <div className="row"><span className="sp">{db.shop.name}{db.shop.city ? `, ${db.shop.city}` : ''}</span>
                <div className="dstep"><button type="button" aria-label="Less" onClick={() => nextStock(-1)}>−</button><input id="pf-stock" inputMode="numeric" value={f.stock} aria-label="Quantity" onChange={(x) => set({ stock: x.target.value.replace(/\D/g, '') })} /><button type="button" aria-label="More" onClick={() => nextStock(1)}>+</button></div>
              </div>
              {e('stock') ? <span className="err" role="alert">{e('stock')}</span> : null}
            </div>

            <div className="card">
              <div className="box-h"><span className="box-t">Sizes and colours</span></div>
              <div className="field"><label htmlFor="pf-color">Colour</label><input id="pf-color" className="input" placeholder="Indigo blue" value={f.color} onChange={(x) => set({ color: x.target.value })} /></div>
              <div className="chips wrap" role="group" aria-label="Sizes">{SIZES.map((z) => <button key={z} type="button" className={`chip${f.sizes.includes(z) ? ' on' : ''}`} aria-pressed={f.sizes.includes(z)} onClick={() => set({ sizes: f.sizes.includes(z) ? f.sizes.filter((s) => s !== z) : SIZES.filter((s) => s === z || f.sizes.includes(s)) })}>{z}</button>)}</div>
              <p className="tiny muted" style={{ margin: '10px 0 0' }}>{f.sizes.length ? `Buyers pick one of: ${f.sizes.join(', ')}.` : 'No sizes. Good for dupattas and one-size items.'}</p>
            </div>

            <div className="card small">
              <div className="box-h"><span className="box-t">Google preview</span></div>
              <div className="muted">stoora.in › {db.shop.handle}</div>
              <div style={{ color: 'var(--ink)', fontSize: 16, fontWeight: 600 }}>{f.name.trim() || 'Your product'} – {db.shop.name}</div>
              <div className="muted">{f.price ? `${rs(num(f.price) || 0)} · ` : ''}{f.description.trim().slice(0, 110) || 'Add a description to see how it shows in search.'}</div>
            </div>
          </div>

          <div>
            <div className="card"><div className="box-h"><span className="box-t">Status</span></div>
              <DSeg label="Status" value={f.status} onChange={(v) => set({ status: v })} options={[{ value: 'Active', label: 'Active' }, { value: 'Draft', label: 'Draft' }]} />
              <p className="tiny muted" style={{ margin: '10px 0 0' }}>{f.status === 'Active' ? 'Buyers can see and order it.' : 'Draft: only you can see it.'}</p>
              {!isNew ? <button className="btn line sm" type="button" style={{ marginTop: 12 }} onClick={() => setDel(true)}>Delete product</button> : null}
            </div>
            {!isNew ? (
              <div className="card"><div className="box-h"><span className="box-t">Last 30 days</span></div>
                <div className="tiles"><div className="tile static"><div className="k">Sold</div><div className="v">{p!.soldLast30Days}</div></div><div className="tile static"><div className="k">Looked yesterday</div><div className="v">{p!.viewsYesterday ?? '—'}</div></div></div>
                <div className="row" style={{ marginTop: 12 }}><span className="thumb"><Ms n={p!.icon} /></span><span className="sp small muted">Shown on your shop as “{p!.category}”.</span></div>
              </div>
            ) : null}
            <button className="btn main full" type="submit" disabled={busy || (!isNew && !dirty)}>{busy ? 'Saving…' : isNew ? 'Add product' : dirty ? 'Save changes' : 'Saved'}</button>
          </div>
        </form>
      </div>
      {!isNew && <ConfirmDialog open={del} onClose={() => setDel(false)} title={`Delete ${p!.name}?`} body="Buyers won’t see it any more. Past orders keep their details. You can undo for a few seconds." yes="Delete" danger
        onYes={() => { const gone = deleteProduct(p!.id); router.push('/products'); toast(`${p!.name} deleted.`, { icon: 'delete', undo: () => gone && restoreProduct(gone) }); }} />}
    </>
  );
}
