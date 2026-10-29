'use client';
import { useEffect, useState } from 'react';
import { CopyButton } from '@/components/CopyButton';
import { Editor } from '@/components/storefront/Editor';
import { Gallery } from '@/components/storefront/Gallery';
import { Card, Chips, DemoBar, Icon, PageHeader, Skeleton, Switch, useToast } from '@/components/ui';
import { rs } from '@/lib/format';
import { useStore } from '@/lib/store';
import { loadDraft, saveDraft } from '@/lib/storefront/draft';
import { startingConfig } from '@/lib/storefront/map';
import { TEMPLATES, defaultConfig, templateById, type StoreConfig } from '@/lib/storefront/shared';
import type { Shop } from '@/lib/types';

type Tab = 'templates' | 'editor' | 'settings';

/** The shop's own link, and its design: pick a template, edit it beside a live preview, publish it at stoora.in/<shop>. */
export default function StorefrontPage() {
  const { db, ready, setShop } = useStore();
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

  const hd = { Warm: 'var(--gradient-soft)', Indigo: 'var(--ink)', Plain: 'var(--card)' }[s.look];
  const dark = s.look === 'Indigo';
  const toggle = (k: 'open' | 'showPrices' | 'cod', label: string) => (v: boolean) => { setShop({ [k]: v } as Partial<Shop>); toast(`${label}: ${v ? 'on' : 'off'}.`, { undo: () => setShop({ [k]: !v } as Partial<Shop>) }); };

  return (
    <>
      <DemoBar>Demo shop: changes here are saved in this browser only.</DemoBar>
      <PageHeader title="Storefront" lede="Your shop page and how it looks. Choose a template, make it yours, and publish it at your own link."
        actions={<><a className="btn primary" href={`/s/${s.handle}`} target="_blank" rel="noopener noreferrer"><Icon name="open_in_new" />View storefront</a><CopyButton text={link} label="Copy shop link" done="Shop link copied." /></>} />
      <div className="seg" role="tablist" aria-label="Storefront" style={{ marginBottom: 'var(--s3)', maxWidth: 520 }}>
        {([['templates', 'Templates'], ['editor', 'Editor'], ['settings', 'Shop settings']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => (id === 'editor' ? edit() : setTab(id))}>{label}</button>
        ))}
      </div>

      {tab === 'templates' && (
        <div className="stack">
          <p className="t-body">{TEMPLATES.length} templates, drawn with sample shops. Pick one to open it in the editor. Your real products replace the sample ones. {live ? `You are live with ${templateById(s.storefront!.template).name}.` : 'Until you publish, buyers see the simple shop page.'}</p>
          <Gallery current={(working ?? s.storefront)?.template} onUse={use} />
        </div>
      )}

      {tab === 'editor' && (working
        ? <Editor key={working.template} initial={working} onBack={() => setTab('templates')} />
        : <Card><p className="t-body">Pick a template to start.</p><button className="btn primary" onClick={() => setTab('templates')}>Choose a template</button></Card>)}

      {tab === 'settings' && (
        <div className="detail">
          <div>
            <Card style={{ background: 'var(--inner)' }}>
              <div className="shopprev" aria-label="Preview of your simple shop page on a phone">
                <div className="hd" style={{ background: hd }}><span className="shop-av" aria-hidden="true">{s.name[0]}</span>
                  <b style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: dark ? '#FFFFFF' : 'var(--ink)', letterSpacing: '-.02em' }}>{s.name}</b>
                  <span style={{ fontSize: 12, color: dark ? 'var(--on-ink-soft)' : 'var(--ink-65)' }}>Hand block prints and yoga, {s.city}</span></div>
                <div className="gridp">{db.products.filter((p) => p.status === 'Active').slice(0, 4).map((p) => (
                  <div key={p.id}><span className="ph" style={p.photos?.[0] ? { backgroundImage: `url(${p.photos[0]})`, backgroundSize: 'cover' } : undefined}>{!p.photos?.[0] && <Icon name={p.icon} />}</span><span>{p.name}</span>{s.showPrices && <b className="t-ink num">{rs(p.price)}</b>}{p.stock === 0 && <span className="cap">Sold out</span>}</div>
                ))}</div>
              </div>
              {!s.open && <div className="banner warn" style={{ marginTop: 'var(--s3)' }}><Icon name="storefront" /><span>Your shop is closed. Buyers see a “back soon” page.</span></div>}
            </Card>
          </div>
          <div>
            <Card className="stack tight" title="Your shop link"><div className="row"><span className="grow t-ink" style={{ fontWeight: 500, overflowWrap: 'anywhere' }}>stoora.in/{s.handle}</span><CopyButton small text={link} done="Shop link copied." /></div><p className="cap">Put it in your Instagram bio and your WhatsApp status.</p></Card>
            <Card title="Shop settings">
              {([['open', 'Shop is open', 'Buyers can order right now'], ['showPrices', 'Show prices', 'Turn off to show products without prices'], ['cod', 'Cash on delivery', 'Let buyers pay when the parcel arrives']] as const).map(([k, l, sub]) => (
                <div key={k} className="toggle-row"><span className="grow"><span className="t-ink" style={{ fontWeight: 500, display: 'block' }}>{l}</span><span className="cap">{sub}</span></span><Switch checked={s[k]} onChange={toggle(k, l)} label={l} /></div>))}
            </Card>
            <Card className="stack tight" title="Look of the simple shop page"><Chips label="Shop look" value={s.look} onChange={(v) => setShop({ look: v })} options={(['Warm', 'Indigo', 'Plain'] as const).map((v) => ({ value: v, label: v }))} /><p className="cap">Used until you publish a template. Products stay the same.</p></Card>
          </div>
        </div>
      )}
    </>
  );
}
