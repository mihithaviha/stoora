'use client';
import { useEffect, useState } from 'react';
import { CopyButton } from '@/components/CopyButton';
import { Editor } from '@/components/storefront/Editor';
import { ShopSign } from '@/components/storefront/ShopSign';
import { Card, DemoBar, Icon, Skeleton, Switch, useToast } from '@/components/ui';
import { useStore } from '@/lib/store';
import { loadDraft, saveDraft } from '@/lib/storefront/draft';
import { startingConfig } from '@/lib/storefront/map';
import type { StoreConfig } from '@/lib/storefront/shared';
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

  const edit = () => { setWorking((w) => w ?? s.storefront ?? startingConfig(db)); setTab('editor'); };

  const toggle = (k: 'showPrices' | 'cod', label: string) => (v: boolean) => { setShop({ [k]: v } as Partial<Shop>); toast(`${label}: ${v ? 'on' : 'off'}.`, { undo: () => setShop({ [k]: !v } as Partial<Shop>) }); };

  return (
    <>
      {mode === 'demo' && <DemoBar>Demo shop: changes here are saved in this browser only.</DemoBar>}
      <header className="sfx-head">
        <div>
          <h1>Storefront</h1>
          <p>Your shop page and how it looks. Choose a template, make it yours, and publish it at your own link.</p>
        </div>
        <div className="sfx-acts">
          <a className="sfx-btn sfx-go" href={`/s/${s.handle}`} target="_blank" rel="noopener noreferrer"><Icon name="open_in_new" />View storefront</a>
          <CopyButton text={link} label="Copy shop link" done="Shop link copied." />
        </div>
      </header>
      <div className="sfx-tabs" role="tablist" aria-label="Storefront">
        {([['templates', 'Templates'], ['editor', 'Editor'], ['settings', 'Shop settings']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className="sfx-tab" onClick={() => (id === 'editor' ? edit() : setTab(id))}>{label}</button>
        ))}
      </div>

      {tab === 'templates' && (
        <article className="sfx-card sfg-current" aria-label="Stoora Standard">
          <div className="sfx-art"><ShopSign handle={s.handle} name={s.name} /></div>
          <div className="sfx-body">
            <span className="sfx-badge"><Icon name="check_circle" size="sm" />Your layout</span>
            <h2>Stoora Standard</h2>
            <p>A painted shopfront, a clean product grid and the sections your shop needs. Every shop uses it from the first day, filled from your own products. {live ? 'Your changes are published.' : 'Edit it to make it yours.'}</p>
            <ul className="sfx-list">
              <li><Icon name="check" size="sm" />Your products and photos</li>
              <li><Icon name="check" size="sm" />Sections you can switch on or off</li>
              <li><Icon name="check" size="sm" />Looks right on phones</li>
            </ul>
            <div className="sfx-cta">
              <button type="button" className="sfx-btn sfx-go big" onClick={edit}>Edit your storefront</button>
              {live ? <a className="sfx-btn big" href={`/s/${s.handle}`} target="_blank" rel="noopener noreferrer">View live</a> : null}
            </div>
          </div>
        </article>
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
