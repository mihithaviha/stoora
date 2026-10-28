'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { Button, ButtonLink, Card, ConfirmDialog, EmptyState, Field, Icon, PageHeader, Skeleton, Switch, useToast } from '@/components/ui';
import { StatusBadge, StockText } from '@/components/ProductBits';
import type { Product } from '@/lib/types';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
type Form = { name: string; description: string; category: Product['category']; color: string; price: string; comparePrice: string; stock: string; status: Product['status']; sizes: string[]; photos: string[] };
const toForm = (p?: Product): Form => ({ name: p?.name ?? '', description: p?.description ?? '', category: p?.category ?? 'Kurtas', color: p?.color ?? '', price: p ? String(p.price) : '', comparePrice: p?.comparePrice ? String(p.comparePrice) : '', stock: p ? String(p.stock) : '1', status: p?.status ?? 'Active', sizes: p?.sizes ?? [], photos: p?.photos ?? [] });

/** Shrink a photo in the browser so it fits in demo storage. Production uploads go to file storage instead. */
function shrink(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => { const s = Math.min(1, 640 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.78)); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
    img.src = url;
  });
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const { db, ready, saveProduct, deleteProduct, restoreProduct } = useStore(); const router = useRouter(); const toast = useToast();
  const isNew = params.id === 'new';
  const p = db.products.find((x) => x.id === params.id);
  const [f, setF] = useState<Form>(() => toForm(p));
  const [loaded, setLoaded] = useState(false);
  const [tried, setTried] = useState(false); const [busy, setBusy] = useState(false); const [del, setDel] = useState(false); const [photoErr, setPhotoErr] = useState('');
  useEffect(() => { if (ready && !loaded) { setF(toForm(p)); setLoaded(true); } }, [ready, loaded, p]);
  const base = useMemo(() => JSON.stringify(toForm(p)), [p]);
  const dirty = loaded && JSON.stringify(f) !== base;
  useEffect(() => { if (!dirty) return; const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; }; window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h); }, [dirty]);

  if (!ready) return <Skeleton rows={4} height={110} />;
  if (!isNew && !p) return <Card><EmptyState icon="search_off" title="We couldn’t find that product" text="It may have been deleted." action={<ButtonLink href="/products" small>Back to products</ButtonLink>} /></Card>;

  const errors: Record<string, string> = {};
  if (!f.name.trim()) errors.name = 'Add a name buyers will recognise.';
  if (!/^\d+$/.test(f.price.replace(/,/g, '')) || Number(f.price.replace(/,/g, '')) < 1) errors.price = 'Add a price in rupees, like 1499.';
  if (f.comparePrice && (!/^\d+$/.test(f.comparePrice.replace(/,/g, '')) || Number(f.comparePrice.replace(/,/g, '')) <= Number(f.price.replace(/,/g, '')))) errors.comparePrice = 'This should be higher than the price.';
  if (!/^\d+$/.test(f.stock)) errors.stock = 'Use a whole number, like 5.';
  const e = (k: string) => (tried ? errors[k] : undefined);
  const set = (patch: Partial<Form>) => setF((x) => ({ ...x, ...patch }));

  const addPhotos = async (files: FileList | null) => {
    setPhotoErr(''); const list = [...(files ?? [])].filter((x) => x.type.startsWith('image/'));
    if (!list.length) { if (files?.length) setPhotoErr('Only photos (JPG, PNG, WebP) can be added.'); return; }
    try { const out = await Promise.all(list.slice(0, 6 - f.photos.length).map(shrink)); set({ photos: [...f.photos, ...out].slice(0, 6) }); }
    catch { setPhotoErr('One of those photos couldn’t be read. Try a different file.'); }
  };
  const save = (ev?: React.FormEvent) => {
    ev?.preventDefault(); setTried(true);
    if (Object.keys(errors).length) { toast('Fix the highlighted fields.', { icon: 'error' }); setTimeout(() => (document.querySelector('.input.bad, .affix.bad input') as HTMLElement | null)?.focus(), 30); return; }
    setBusy(true);
    const next: Product = { ...(p ?? { id: 'p' + Date.now().toString(36), soldLast30Days: 0, icon: f.category === 'Dupattas' ? 'dry_cleaning' : 'checkroom' }),
      name: f.name.trim(), description: f.description.trim() || undefined, category: f.category, color: f.color.trim() || undefined, price: Number(f.price.replace(/,/g, '')),
      comparePrice: f.comparePrice ? Number(f.comparePrice.replace(/,/g, '')) : undefined, stock: Number(f.stock), status: f.status, sizes: f.sizes, photos: f.photos } as Product;
    setTimeout(() => {
      try { saveProduct(next); } catch { setBusy(false); toast('Couldn’t save. Your browser storage may be full — remove a photo and try again.', { icon: 'error' }); return; }
      setBusy(false); toast(isNew ? `${next.name} added.` : 'Changes saved.');
      if (isNew) router.replace(`/products/${next.id}`); else setF(toForm(next));
    }, 300);
  };

  return (
    <>
      <PageHeader title={isNew ? 'Add product' : p!.name} lede={isNew ? 'Start with a photo, a name and a price. Everything else can wait.' : <span className="row" style={{ gap: 'var(--s1)' }}><StatusBadge p={p!} /><StockText p={p!} /></span>} />
      <form className="form2" onSubmit={save} noValidate>
        <div>
          <Card title="Photos">
            {f.photos.length > 0 && <div className="photos" style={{ marginBottom: 'var(--s2)' }}>{f.photos.map((s, n) => (
              <span key={n} style={{ position: 'relative', display: 'inline-block' }}><img src={s} alt={`Product photo ${n + 1}`} />
                <button type="button" className="ibtn" style={{ position: 'absolute', top: 4, right: 4, width: 32, height: 32 }} aria-label={`Remove photo ${n + 1}`} onClick={() => set({ photos: f.photos.filter((_, i) => i !== n) })}><Icon name="close" size="xs" /></button></span>))}</div>}
            {f.photos.length < 6 && <label className="drop" htmlFor="pf-photos" onDragOver={(x) => x.preventDefault()} onDrop={(x) => { x.preventDefault(); addPhotos(x.dataTransfer.files); }}>
              <Icon name="add_photo_alternate" size="lg" className="t-soft" /><span className="t-ink" style={{ fontWeight: 500 }}>Add photos</span>
              <span className="cap">Drag them here, or tap to pick. Up to 6. In this demo, photos stay in this browser only.</span>
              <input type="file" id="pf-photos" accept="image/*" multiple onChange={(x) => addPhotos(x.target.files)} /></label>}
            {photoErr && <p className="err" role="alert"><Icon name="error" size="xs" />{photoErr}</p>}
          </Card>
          <Card className="stack">
            <Field id="pf-name" label="Name" required error={e('name')}><input className={`input ${e('name') ? 'bad' : ''}`} id="pf-name" value={f.name} onChange={(x) => set({ name: x.target.value })} placeholder="Handblock cotton kurta" /></Field>
            <Field id="pf-desc" label="Description" optional><textarea className="input" id="pf-desc" rows={3} value={f.description} onChange={(x) => set({ description: x.target.value })} placeholder="Fabric, fit, how to wash it" /></Field>
            <div className="grid2">
              <Field id="pf-cat" label="Category"><select className="input" id="pf-cat" value={f.category} onChange={(x) => set({ category: x.target.value as Product['category'] })}>{['Kurtas', 'Dupattas', 'Other'].map((c) => <option key={c}>{c}</option>)}</select></Field>
              <Field id="pf-color" label="Colour" optional><input className="input" id="pf-color" value={f.color} onChange={(x) => set({ color: x.target.value })} placeholder="Indigo blue" /></Field>
            </div>
          </Card>
          <Card title="Price and stock">
            <div className="grid2">
              <Field id="pf-price" label="Price" required error={e('price')}><div className={`affix ${e('price') ? 'bad' : ''}`}><span aria-hidden="true">₹</span><input id="pf-price" inputMode="numeric" value={f.price} onChange={(x) => set({ price: x.target.value })} placeholder="1499" /></div></Field>
              <Field id="pf-was" label="Price before discount" optional error={e('comparePrice')}><div className={`affix ${e('comparePrice') ? 'bad' : ''}`}><span aria-hidden="true">₹</span><input id="pf-was" inputMode="numeric" value={f.comparePrice} onChange={(x) => set({ comparePrice: x.target.value })} placeholder="1899" /></div></Field>
              <Field id="pf-stock" label="How many you have" required error={e('stock')}><input className={`input ${e('stock') ? 'bad' : ''}`} id="pf-stock" inputMode="numeric" value={f.stock} onChange={(x) => set({ stock: x.target.value })} /></Field>
            </div>
          </Card>
          <Card title="Sizes" aside={<span className="cap">Variants buyers choose from</span>}>
            <div className="chips wrap" role="group" aria-label="Sizes">{SIZES.map((z) => <button key={z} type="button" className={`chip ${f.sizes.includes(z) ? 'on' : ''}`} aria-pressed={f.sizes.includes(z)} onClick={() => set({ sizes: f.sizes.includes(z) ? f.sizes.filter((s) => s !== z) : SIZES.filter((s) => s === z || f.sizes.includes(s)) })}>{z}</button>)}</div>
            <p className="cap" style={{ marginTop: 'var(--s2)' }}>{f.sizes.length ? `Buyers pick one of: ${f.sizes.join(', ')}.` : 'No sizes. Good for dupattas and one-size items.'}</p>
          </Card>
        </div>
        <div>
          <Card className="stack tight" title="Status">
            <div className="toggle-row"><span className="grow"><span className="t-ink" style={{ fontWeight: 500, display: 'block' }}>Show on my shop</span><span className="cap">{f.status === 'Active' ? 'Buyers can see and order it.' : 'Draft: only you can see it.'}</span></span>
              <Switch checked={f.status === 'Active'} onChange={(v) => set({ status: v ? 'Active' : 'Draft' })} label="Show on my shop" /></div>
          </Card>
          {!isNew && <Card title="Last 30 days"><div className="tiles"><div className="tile"><span className="k">Sold</span><span className="v">{p!.soldLast30Days}</span></div><div className="tile"><span className="k">Looked yesterday</span><span className="v">{p!.viewsYesterday ?? '—'}</span></div></div></Card>}
          <div className="stack tight">
            <Button kind="primary" full type="submit" busy={busy} busyLabel="Saving…" disabled={!isNew && !dirty}>{isNew ? 'Add product' : dirty ? 'Save changes' : 'Saved'}</Button>
            {!isNew && <Button kind="danger" full icon="delete" type="button" onClick={() => setDel(true)}>Delete product</Button>}
          </div>
        </div>
      </form>
      {!isNew && <ConfirmDialog open={del} onClose={() => setDel(false)} title={`Delete ${p!.name}?`} body="Buyers won’t see it any more. Past orders keep their details. You can undo for a few seconds." yes="Delete" danger
        onYes={() => { const gone = deleteProduct(p!.id); router.push('/products'); toast(`${p!.name} deleted.`, { icon: 'delete', undo: () => gone && restoreProduct(gone) }); }} />}
    </>
  );
}
