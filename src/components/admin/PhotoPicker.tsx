'use client';
import { useRef, useState } from 'react';
import { Button } from '../ui';
import { PHOTOS } from '@/lib/journal';
import { uploadImage } from '@/lib/journal/admin-store';
import { isUrlPhoto } from '@/lib/journal/posts';

/** The picture a story (or a carousel place) shows: a library photo key, or the address of one the team uploaded. */
export const photoSrc = (key: string) => (isUrlPhoto(key) ? key : key ? `/assets/journal/${key}-720.webp` : '');

/** A picture slot: shows the picture, lets the team pick one from the library or upload their own, and remove it. */
export function PhotoPicker({ id, value, onChange, onError, empty = 'No picture yet', removeLabel = 'Remove', fallback = '' }: { id: string; value: string; onChange: (v: string) => void; onError: (m: string) => void; empty?: string; removeLabel?: string; /** A picture to show (dimmed) while none is chosen. */ fallback?: string }) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const inLibrary = value in PHOTOS;
  return (
    <div className="stack tight">
      <div className="row" style={{ alignItems: 'flex-start', gap: 'var(--s3)', flexWrap: 'wrap' }}>
        <div style={{ width: 160, aspectRatio: '4 / 3', borderRadius: 12, overflow: 'hidden', background: 'var(--card)', border: '1px solid var(--line-soft)', display: 'grid', placeItems: 'center', flex: 'none' }}>
          {value || fallback
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={photoSrc(value || fallback)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: value ? 1 : 0.8 }} />
            : <span className="cap" style={{ padding: 8, textAlign: 'center' }}>{empty}</span>}
        </div>
        <div className="stack tight grow" style={{ minWidth: 200 }}>
          <label className="flabel" htmlFor={id}>From the library</label>
          <select id={id} className="input" value={inLibrary ? value : ''} onChange={(e) => onChange(e.target.value)}>
            <option value="">{value && !inLibrary ? 'Your own picture' : 'Choose a picture'}</option>
            {Object.entries(PHOTOS).map(([key, alt]) => <option key={key} value={key}>{alt.length > 58 ? alt.slice(0, 57) + '…' : alt}</option>)}
          </select>
          <div className="btns">
            <Button small icon="upload" busy={busy} busyLabel="Uploading…" onClick={() => file.current?.click()}>Upload your own</Button>
            {value ? <Button small kind="quiet" onClick={() => onChange('')}>{removeLabel}</Button> : null}
          </div>
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="Upload a picture"
            onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = '';
              if (!f) return;
              setBusy(true);
              try { onChange(await uploadImage(f)); } catch (err) { onError((err as Error).message); } finally { setBusy(false); }
            }} />
        </div>
      </div>
    </div>
  );
}
