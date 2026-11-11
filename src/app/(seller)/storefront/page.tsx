'use client';
import { useEffect, useState } from 'react';
import { CopyButton } from '@/components/CopyButton';
import { Editor } from '@/components/storefront/Editor';
import { Gallery, Thumb } from '@/components/storefront/Gallery';
import { Button, Card, Chips, DemoBar, Icon, PageHeader, Skeleton, Switch, useToast } from '@/components/ui';
import { rs } from '@/lib/format';
import { useStore } from '@/lib/store';
import { loadDraft, saveDraft } from '@/lib/storefront/draft';
import { startingConfig } from '@/lib/storefront/map';
import { defaultConfig, templateById, type StoreConfig } from '@/lib/storefront/shared';
import type { Shop } from '@/lib/types';

type Tab = 'templates' | 'editor' | 'settings';

/** The shop's own link, and its design: pick a template, edit it beside a live preview, publish it at stoora.in/<shop>. */
export default function StorefrontPage() {
  const { db, ready, setShop, mode } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('templates');
  const [working, setWorking] = useState<StoreConfig | null>(null);
  const handle = db.shop.handle;

  // coming back to a draft: open it where the seller left off
  useEffect(() => {
    if (!ready || working) return;
    const draft = loadDraft(handle);
    if (draft) setWorking(draft);
  }, [ready, handle, working]);

  if (!ready) return <Skeleton rows={3} height={120} />;
  const s = db.shop;
  const link = `https://stoora.in/${s.handle}`;
  const live = Boolean(s.storefront);

  /** Start (or keep) editing with a template. The shop's own details fill the blanks. */
  const use = (id: string) => {
    const base = working ?? s.storefront ?? startingConfig(db, id);
    const target = templateById(id);
    const next: StoreConfig = base.template === id ? base : { ...base, template: target.id, theme: target.theme, hero: { ...base.hero, cta: templateById(base.template).kind === target.kind ? base.hero.cta : defaultConfig(id).hero.cta } };
    saveDraft(handle, next);
    setWorking(next);
    setTab('editor');
  };
  const edit = () => { setWorking((w) => w ?? s.storefront ?? startingConfig(db)); setTab('editor'); };

  const toggle = (k: 'showPrices' | 'cod', label: string) => (v: boolean) => { setShop({ [k]: v } as Partial<Shop>); toast(`${label}: ${v ? 'on' : 'off'}.`, { undo: () => setShop({ [k]: !v } as Partial<Shop>) }); };

  return (
    <>
      {mode === 'demo' && <DemoBar>Demo shop: changes here are saved in this browser only.</DemoBar>}
      <PageHeader title="Storefront" lede="Your shop page and how it looks. Choose a template, make it yours, and publish it at your own link."
        actions={<><a className="btn primary" href={`/s/${s.handle}`} target="_blank" rel="noopener noreferrer"><Icon name="open_in_new" />View storefront</a><CopyButton text={link} label="Copy shop link" done="Shop link copied." /></>} />
      <div className="seg" role="tablist" aria-label="Storefront" style={{ marginBottom: 'var(--s3)', maxWidth: 520 }}>
        {([['templates', 'Templates'], ['editor', 'Editor'], ['settings', 'Shop settings']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => (id === 'editor' ? edit() : setTab(id))}>{label}</button>
        ))}
      </div>

      {tab === 'templates' && (
        <div className="stack">
          <article className="sfcur sfg-current" aria-label="Stoora Standard">
            <div className="sfcur-view"><div className="sfcur-bar" aria-hidden="true"><i /><i /><i /></div><Thumb template={templateById('standard')} /></div>
            <div className="sfcur-body">
              <span className="bdg ok"><Icon name="check_circle" />Your layout</span>
              <h3>Stoora Standard</h3>
              <p>A painted shopfront, a clean product grid and the sections your shop needs. Every shop uses it from the first day, filled from your own products. {live ? 'Your changes are published.' : 'Edit it to make it yours.'}</p>
              <ul className="sfcur-list">
                <li><Icon name="check" size="sm" />Your products and photos</li>
                <li><Icon name="check" size="sm" />Sections you can switch on or off</li>
                <li><Icon name="check" size="sm" />Looks right on phones</li>
              </ul>
              <div className="sfcur-btns">
                <Button kind="primary" onClick={edit}>Edit your storefront</Button>
                {live ? <a className="btn line" href={`/s/${s.handle}`} target="_blank" rel="noopener noreferrer">View live</a> : null}
              </div>
            </div>
          </article>
          <div className="sf-soon-wrap">
            {/* More templates are coming soon: the gallery stays visible but blurred and cannot be used */}
            <div className="stack sf-soon-blur" aria-hidden="true" inert>
              <Gallery current={(working ?? s.storefront)?.template} onUse={use} />
            </div>
            <div className="sf-soon-card" role="status">
              <Icon name="schedule" />
              <h3 className="ct">More templates are coming soon</h3>
              <p className="t-body">Every shop uses the Standard layout for now. More looks will follow.</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'editor' && (working
        ? <Editor key={working.template} initial={working} onBack={() => setTab('templates')} />
        : <Card><p className="t-body">Pick a template to start.</p><button className="btn primary" onClick={() => setTab('templates')}>Choose a template</button></Card>)}

      {tab === 'settings' && (
        <div className="detail">
          <div>
            <Card style={{ background: 'var(--inner)' }} className="stack tight">
              {/* the real shop, exactly as a buyer sees it (not a drawing of it) */}
              <iframe key={`${s.handle}-${s.open}-${db.products.length}-${s.look}-${live}`} title="Your shop as buyers see it" src={`/s/${s.handle}`} loading="lazy" style={{ width: '100%', maxWidth: 420, height: 600, border: '1px solid var(--line)', borderRadius: 16, background: '#fff', margin: '0 auto', display: 'block' }} />
              <a className="link cap" href={`/s/${s.handle}`} target="_blank" rel="noopener noreferrer" style={{ justifySelf: 'center' }}>Open your shop in a new tab</a>
              {!s.open && <div className="banner warn"><Icon name="storefront" /><span>Your shop is paused. Buyers can look but can’t order.</span></div>}
            </Card>
          </div>
          <div>
            <Card className="stack tight" title="Your shop link"><div className="row"><span className="grow t-ink" style={{ fontWeight: 500, overflowWrap: 'anywhere' }}>stoora.in/{s.handle}</span><CopyButton small text={link} done="Shop link copied." /></div><p className="cap">Put it in your Instagram bio and your WhatsApp status.</p></Card>
            <Card title="Shop settings">
              <div className="toggle-row"><span className="grow"><span className="t-ink" style={{ fontWeight: 500, display: 'block' }}>Pause my shop</span><span className="cap" role="status">{s.open ? 'Shop is open. Buyers can order.' : 'Shop is paused. Buyers can look but can’t order.'}</span></span><Switch checked={!s.open} onChange={(paused) => { setShop({ open: !paused }); toast(paused ? 'Shop paused. Buyers can look but can’t order.' : 'Shop is open. Buyers can order.', { undo: () => setShop({ open: paused }) }); }} label="Pause my shop" /></div>
              {([['showPrices', 'Show prices', 'Turn off to show products without prices'], ['cod', 'Cash on delivery', 'Let buyers pay when the parcel arrives']] as const).map(([k, l, sub]) => (
                <div key={k} className="toggle-row"><span className="grow"><span className="t-ink" style={{ fontWeight: 500, display: 'block' }}>{l}</span><span className="cap">{sub}</span></span><Switch checked={s[k]} onChange={toggle(k, l)} label={l} /></div>))}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
