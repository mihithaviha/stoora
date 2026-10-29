'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { rs } from '@/lib/format';
import { Dialog, Icon, SearchBox } from './ui';

/** Pick an active product from the catalog. Sold-out products are shown but can't be picked. */
export function ProductPicker({ open, onClose, onPick, taken = [] }: { open: boolean; onClose: () => void; onPick: (id: string) => void; taken?: string[] }) {
  const { db } = useStore(); const [q, setQ] = useState('');
  const list = db.products.filter((p) => p.status === 'Active' && (!q || (p.name + ' ' + p.category).toLowerCase().includes(q.toLowerCase())));
  return (
    <Dialog open={open} onClose={onClose} title="Add products">
      <SearchBox id="pick-q" value={q} onChange={setQ} placeholder="Search products" />
      <div className="rows" style={{ marginTop: 'var(--s2)' }}>
        {list.map((p) => {
          const out = p.stock === 0; const has = taken.includes(p.id);
          return (
            <button key={p.id} className="li" disabled={out} onClick={() => { onPick(p.id); onClose(); }} style={out ? { opacity: 0.55 } : undefined}>
              <span className="thumb sm"><Icon name={p.icon} size="sm" /></span>
              <span className="grow"><span className="t">{p.name}</span><span className="s num">{rs(p.price)} · {out ? 'Sold out' : `${p.stock} in stock`}</span></span>
              {has ? <span className="cap">Added · add 1 more</span> : !out && <Icon name="add" className="t-cap" />}
            </button>
          );
        })}
        {!list.length && <p className="t-body">No active products match. Drafts and hidden products can’t be ordered.</p>}
      </div>
    </Dialog>
  );
}
