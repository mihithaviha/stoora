'use client';
import { useEffect, useRef, useState } from 'react';
import { Button, Chips, Dialog, Icon } from '../ui';
import { GALLERY_FILTERS, TEMPLATES, isPremium, themeById, type TemplateInfo } from '@/lib/storefront/shared';

/** A small live picture of a template with sample content: the real page in a frame, scaled down to fit the card. */
function Thumb({ template }: { template: TemplateInfo }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const fit = () => box.current && setScale(box.current.clientWidth / 1200);
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div className="sfg-thumb" ref={box}>
      <iframe title={`${template.name} preview`} src={`/store-preview?sample=${template.id}&theme=${template.theme}`} loading="lazy" tabIndex={-1} aria-hidden="true" style={{ transform: `scale(${scale})` }} />
    </div>
  );
}

/** The template gallery: filters, a live thumbnail for each template, "Use this template" and a full preview. */
export function Gallery({ current, onUse }: { current?: string; onUse: (id: string) => void }) {
  const [filter, setFilter] = useState('all');
  const [full, setFull] = useState<TemplateInfo | null>(null);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const list = TEMPLATES.filter((t) => filter === 'all' || t.categories.includes(filter));
  return (
    <div className="stack">
      <Chips label="Template category" value={filter} onChange={setFilter} options={GALLERY_FILTERS.map(([value, label]) => ({ value, label }))} />
      <div className="sfg-grid">
        {list.map((t) => (
          <article className="sfg-card" key={t.id}>
            <Thumb template={t} />
            <div className="sfg-body">
              <div className="row"><h3 className="ct grow">{t.name}</h3>{t.premium ? <span className="bdg offer"><Icon name="workspace_premium" />Premium</span> : current === t.id ? <span className="bdg ok"><Icon name="check_circle" />In use</span> : null}</div>
              <p className="t-body">{t.blurb}</p>
              <p className="cap">Suits: {t.suits}</p>
              <span className="sfg-swatches" aria-label={`${themeById(t.theme).name} colours`}>{[themeById(t.theme).background, themeById(t.theme).primary, themeById(t.theme).secondary, themeById(t.theme).accent].map((c, n) => <i key={n} style={{ background: c }} />)}</span>
              <div className="btns">
                {isPremium(t.id)
                  ? <Button kind="line" disabled title="Premium templates are not switched on for this account yet">Premium · coming soon</Button>
                  : <Button kind="primary" onClick={() => onUse(t.id)}>{current === t.id ? 'Keep editing' : 'Use this template'}</Button>}
                <Button onClick={() => { setDevice('desktop'); setFull(t); }}>Full preview</Button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <Dialog open={!!full} onClose={() => setFull(null)} title={full ? `${full.name} preview` : ''} full
        footer={full ? <>{isPremium(full.id) ? null : <Button kind="primary" onClick={() => { onUse(full.id); setFull(null); }}>Use this template</Button>}<Button onClick={() => setFull(null)}>Close</Button></> : undefined}>
        {full && (
          <div className="stack tight">
            <div className="seg" role="group" aria-label="Device"><button className={device === 'desktop' ? 'on' : ''} onClick={() => setDevice('desktop')}>Desktop</button><button className={device === 'mobile' ? 'on' : ''} onClick={() => setDevice('mobile')}>Mobile</button></div>
            <div className={`sfpv-device ${device}`} style={{ height: '68vh' }}><iframe title={`${full.name} full preview`} src={`/store-preview?sample=${full.id}&theme=${full.theme}`} /></div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
