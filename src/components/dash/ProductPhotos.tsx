'use client';
// Many photos at once (PRD 5.3): pick or drag several, up to 8, each prepared on its own with its own progress.
// One that fails shows "Try again" and does not stop the others. The first photo is the cover; drag to reorder.
import { useEffect, useRef, useState } from 'react';
import { DI } from './parts';

export const MAX_PHOTOS = 8;

/** Shrink a phone photo in the browser. Returns the small copy that is saved and the ~1000 px copy AI reads. */
export async function prepare(file: File, onStep?: (pct: number) => void): Promise<{ src: string; ai: string }> {
  onStep?.(15);
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('bad image')); i.src = url; });
    onStep?.(45);
    const draw = (max: number, q: number) => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
      c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', q);
    };
    const src = draw(720, 0.78); onStep?.(75);
    const ai = draw(1000, 0.7); onStep?.(100);
    return { src, ai };
  } finally { URL.revokeObjectURL(url); }
}

interface Pending { key: number; name: string; pct: number; failed: boolean; file: File }

export function ProductPhotos({ photos, onChange, onAdded, onBusyChange, disabled }: {
  photos: string[];
  onChange: (next: string[]) => void;
  /** Called with the AI-sized copies of newly added photos, keyed by the saved copy. */
  onAdded?: (copies: Record<string, string>) => void;
  /** True while photos are still being prepared (so the screen can wait for all of them before reading them). */
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState<Pending[]>([]);
  const [note, setNote] = useState('');
  const [over, setOver] = useState(false);
  const [from, setFrom] = useState<number | null>(null);
  const keys = useRef(0);
  const current = useRef(photos); current.current = photos;
  const pendingNow = useRef<Pending[]>([]); pendingNow.current = pending;
  const working = pending.some((x) => !x.failed);
  useEffect(() => { onBusyChange?.(working); }, [working]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (item: Pending) => {
    setPending((p) => p.map((x) => (x.key === item.key ? { ...x, failed: false, pct: 5 } : x)));
    try {
      const out = await prepare(item.file, (pct) => setPending((p) => p.map((x) => (x.key === item.key ? { ...x, pct } : x))));
      const next = [...current.current, out.src].slice(0, MAX_PHOTOS);
      current.current = next; onChange(next);
      onAdded?.({ [out.src]: out.ai });
      setPending((p) => p.filter((x) => x.key !== item.key));
    } catch {
      setPending((p) => p.map((x) => (x.key === item.key ? { ...x, failed: true } : x)));
    }
  };

  const add = (files: FileList | File[] | null) => {
    setNote('');
    const all = [...(files ?? [])];
    if (!all.length) return;
    const images = all.filter((f) => f.type.startsWith('image/'));
    const notes: string[] = [];
    if (images.length < all.length) notes.push(images.length ? 'Some files were not photos, so we left them out.' : 'Only photos (JPG, PNG, WebP) can be added.');
    const room = Math.max(0, MAX_PHOTOS - current.current.length - pendingNow.current.length);
    const take = images.slice(0, room);
    if (images.length > room) notes.push(room ? `You can add up to ${MAX_PHOTOS} photos. We added the first ${room}.` : `You already have ${MAX_PHOTOS} photos, the most you can add.`);
    setNote(notes.join(' '));
    const items = take.map((file) => ({ key: ++keys.current, name: file.name, pct: 0, failed: false, file }));
    setPending((p) => [...p, ...items]);
    items.forEach((it) => { void run(it); });
  };

  const move = (a: number, b: number) => {
    if (a === b || a < 0 || b < 0 || a >= photos.length || b >= photos.length) return;
    const next = photos.slice(); const [x] = next.splice(a, 1); next.splice(b, 0, x); onChange(next);
  };
  const full = photos.length + pending.length >= MAX_PHOTOS;

  return (
    <div className="stack tight">
      {(photos.length > 0 || pending.length > 0) && (
        <div className="photos" style={{ marginBottom: 4 }}>
          {photos.map((s, n) => (
            <span key={s.slice(-40) + n} className="phot" draggable={!disabled} onDragStart={() => setFrom(n)} onDragEnd={() => setFrom(null)}
              onDragOver={(e) => { if (from !== null) e.preventDefault(); }} onDrop={(e) => { if (from !== null) { e.preventDefault(); move(from, n); setFrom(null); } }}
              style={{ position: 'relative', display: 'inline-block', outline: n === 0 ? '2px solid var(--ink)' : undefined, borderRadius: 8, opacity: from === n ? 0.5 : 1 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s} alt={`Product photo ${n + 1}${n === 0 ? ' (cover)' : ''}`} />
              {n === 0 ? <span className="tiny" style={{ position: 'absolute', left: 4, bottom: 4, background: 'var(--ink)', color: 'var(--on-ink)', borderRadius: 6, padding: '1px 6px' }}>Cover</span>
                : <button type="button" className="tiny" style={{ position: 'absolute', left: 4, bottom: 4, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 6, padding: '1px 6px', cursor: 'pointer' }} onClick={() => move(n, 0)} aria-label={`Make photo ${n + 1} the cover`}>Make cover</button>}
              <button type="button" className="ibtn" style={{ position: 'absolute', top: 4, right: 4, width: 28, height: 28 }} aria-label={`Remove photo ${n + 1}`} onClick={() => onChange(photos.filter((_, i) => i !== n))}><DI n="x" s={14} /></button>
            </span>
          ))}
          {pending.map((p) => (
            <span key={p.key} className="phot" style={{ display: 'inline-grid', placeItems: 'center', alignContent: 'center', gap: 6, padding: 8, textAlign: 'center', background: 'var(--inner, #f7f7f7)', borderRadius: 8, minWidth: 96, minHeight: 96 }} role="status" aria-label={p.failed ? `${p.name} failed` : `${p.name}: ${p.pct}%`}>
              {p.failed
                ? <><span className="tiny" style={{ color: 'var(--negative-deep)' }}>Couldn’t read this photo</span><button type="button" className="btn grey sm" onClick={() => run(p)}>Try again</button><button type="button" className="link tiny" onClick={() => setPending((x) => x.filter((y) => y.key !== p.key))}>Remove</button></>
                : <><span className="tiny muted">Adding…</span><progress max={100} value={p.pct} style={{ width: 72 }} aria-label={`Adding ${p.name}`} /></>}
            </span>
          ))}
        </div>
      )}
      {!full && !disabled ? (
        <label className="drop" htmlFor="pf-photos" style={over ? { borderColor: 'var(--ink)' } : undefined}
          onDragOver={(x) => { if (from === null) { x.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)}
          onDrop={(x) => { x.preventDefault(); setOver(false); if (from === null) add(x.dataTransfer.files); }}>
          <span className="btn grey sm"><DI n="img" s={16} /> {photos.length ? 'Add more photos' : 'Add photos'}</span>
          <span className="tiny muted">Pick or drag as many as you like at once, up to {MAX_PHOTOS}. The first is the cover; drag to reorder.</span>
          <input type="file" id="pf-photos" accept="image/*" multiple onChange={(x) => { add(x.target.files); x.target.value = ''; }} />
        </label>
      ) : null}
      {note ? <span className="err" role="status" style={{ color: 'var(--ink-soft)' }}>{note}</span> : null}
    </div>
  );
}
