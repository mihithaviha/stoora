'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button, Dialog, Icon, Switch, useToast } from '../ui';
import { useStore } from '@/lib/store';
import { clearDraft, saveDraft, shrinkImage } from '@/lib/storefront/draft';
import { toStoreData } from '@/lib/storefront/map';
import {
  ACCENTS, FOCUS_OPTIONS, LIMITS, SECTIONS, TEMPLATES, THEMES, defaultConfig, isPremium, templateById, themeById, visibleData,
  type SectionKey, type StoreConfig,
} from '@/lib/storefront/shared';

type Save = 'saved' | 'unsaved' | 'failed';
const FOCUS_LABEL: Record<string, string> = { '50% 20%': 'Top', '50% 50%': 'Middle', '50% 80%': 'Bottom' };
const lines = (list: string[]) => list.join('\n');
const parts = (text: string) => text.split(',').map((x) => x.trim()).filter(Boolean).slice(0, LIMITS.listItems);

/** One folding group of controls. */
function Section({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return <details className="sfed-sec" open={open}><summary>{title}</summary><div className="sfed-sec-body">{children}</div></details>;
}

function Text({ id, label, value, onChange, max = LIMITS.short, area = false, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; max?: number; area?: boolean; hint?: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {area ? <textarea id={id} className="input" rows={4} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} />
        : <input id={id} className="input" maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} />}
      {hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

/** A photo slot: shows the picture, and lets the seller pick or remove one. */
function ImageSlot({ label, value, onChange, onError }: { label: string; value: string; onChange: (v: string) => void; onError: (m: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="field">
      <span className="flabel">{label}</span>
      <div className="sfed-image">{value ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={value} alt="" /> : <span className="cap">No photo yet</span>}</div>
      <div className="btns">
        <Button small onClick={() => input.current?.click()}>{value ? 'Change photo' : 'Add a photo'}</Button>
        {value ? <Button small kind="quiet" onClick={() => onChange('')}>Remove</Button> : null}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          try { onChange(await shrinkImage(file)); } catch (error) { onError((error as Error).message); }
        }} />
    </div>
  );
}

/**
 * The storefront editor: a panel of controls beside a live preview of the real shop page (in a frame, so the seller's colours
 * never touch the dashboard). Changes save to this browser as a draft; Publish puts them on the shop's own address.
 */
export function Editor({ initial, onBack }: { initial: StoreConfig; onBack: () => void }) {
  const { db, publishStorefront } = useStore();
  const toast = useToast();
  const [config, setConfig] = useState<StoreConfig>(initial);
  const [save, setSave] = useState<Save>('saved');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const configRef = useRef(config);
  const hist = useRef({ list: [JSON.stringify(initial)], at: 0 });
  const [, redraw] = useState(0);
  const [issues, setIssues] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const handle = db.shop.handle;
  const live = Boolean(db.shop.storefront);

  const data = useMemo(() => visibleData(toStoreData(db), config), [db, config]);
  const template = templateById(config.template);

  /** Change the working copy: remember it for undo and save it soon. */
  const change = useCallback((fn: (c: StoreConfig) => StoreConfig) => {
    const next = fn(configRef.current);
    configRef.current = next;
    setConfig(next);
    const h = hist.current;
    h.list = [...h.list.slice(0, h.at + 1), JSON.stringify(next)].slice(-40);
    h.at = h.list.length - 1;
    setSave('unsaved');
    redraw((n) => n + 1);
  }, []);
  const set = <K extends keyof StoreConfig>(key: K, patch: Partial<StoreConfig[K]>) => change((c) => ({ ...c, [key]: { ...(c[key] as object), ...patch } as StoreConfig[K] }));

  const jump = (to: number) => {
    const h = hist.current;
    if (to < 0 || to >= h.list.length) return;
    h.at = to;
    const next = JSON.parse(h.list[to]) as StoreConfig;
    configRef.current = next;
    setConfig(next);
    setSave('unsaved');
    redraw((n) => n + 1);
  };

  // save the draft a moment after the last change
  useEffect(() => {
    if (save !== 'unsaved') return;
    const timer = setTimeout(() => setSave(saveDraft(handle, config) ? 'saved' : 'failed'), 400);
    return () => clearTimeout(timer);
  }, [config, save, handle]);

  // send the working copy to the preview frame whenever it changes, and when the frame says it is ready
  const push = useCallback(() => {
    frame.current?.contentWindow?.postMessage({ type: 'render', config, data, extras: { payments: { online: db.shop.online !== false, upi: true } } }, window.location.origin);
  }, [config, data, db.shop.online]);
  useEffect(() => { push(); }, [push]);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => { if (event.origin === window.location.origin && event.data?.type === 'ready') push(); };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [push]);

  /** Things to fix before the shop can go live. */
  const problems = (): string[] => {
    const found: string[] = [];
    if (!(config.brand.name || db.shop.name).trim()) found.push('Give your shop a name (Shop name and logo).');
    if (!data.products.length && !data.services.length) found.push(`Show at least one ${template.kind === 'services' ? 'service' : 'product'}. Add one in your dashboard, or switch one back on under Products and services.`);
    return found;
  };

  const publish = async () => {
    const found = problems();
    if (found.length) { setIssues(found); return; }
    setBusy(true);
    const failed = await publishStorefront(config);
    setBusy(false);
    if (failed) { toast(`Couldn’t publish: ${failed}`, { icon: 'error' }); return; }
    clearDraft(handle);
    setSave('saved');
    toast(live ? 'Your storefront is updated.' : 'Your storefront is live.', { icon: 'storefront' });
  };
  const unpublish = async () => {
    setBusy(true);
    const failed = await publishStorefront(null);
    setBusy(false);
    toast(failed ? `Couldn’t take it offline: ${failed}` : 'Your storefront is offline. Buyers see the simple shop page.', { icon: failed ? 'error' : 'storefront' });
  };

  const applyTemplate = (id: string) => {
    if (isPremium(id)) return;
    const target = templateById(id);
    change((c) => ({ ...c, template: target.id, theme: target.theme, hero: { ...c.hero, cta: target.kind === templateById(c.template).kind ? c.hero.cta : defaultConfig(id).hero.cta } }));
    toast('Template changed. Your products and details stay.', { icon: 'palette' });
  };
  const reset = () => change(() => ({ ...defaultConfig(config.template, { name: db.shop.name, tagline: db.shop.tagline }), contact: config.contact }));

  const toggleId = (list: 'featuredIds' | 'hiddenIds', id: string) => change((c) => ({ ...c, [list]: c[list].includes(id) ? c[list].filter((x) => x !== id) : [...c[list], id] }));
  const imageError = (message: string) => toast(message, { icon: 'error' });
  const items = template.kind === 'services' ? db.services : db.products.filter((p) => p.status === 'Active');

  const saveLabel = { saved: 'All changes saved', unsaved: 'Saving…', failed: 'Could not save: your browser’s storage is full' }[save];

  return (
    <div className="sfin-wrap">
      <div className="sfed-bar" style={{ borderRadius: 18, border: '1px solid var(--line-soft)', marginBottom: 12 }}>
        <Button small icon="arrow_back" onClick={onBack}>Templates</Button>
        <b className="sfed-name">{config.brand.name || db.shop.name}</b>
        <span className={`tag ${live ? 'ok' : 'neutral'}`}>{live ? 'Live' : 'Draft'}</span>
        <span className={`sfed-save ${save}`} role="status">{saveLabel}</span>
        <span className="sp" />
        <button className="ibtn sm" type="button" aria-label="Undo" disabled={hist.current.at <= 0} onClick={() => jump(hist.current.at - 1)}><Icon name="undo" size="sm" /></button>
        <button className="ibtn sm" type="button" aria-label="Redo" disabled={hist.current.at >= hist.current.list.length - 1} onClick={() => jump(hist.current.at + 1)}><Icon name="redo" size="sm" /></button>
        <div className="seg sfed-device" role="group" aria-label="Preview size">
          <button className={device === 'desktop' ? 'on' : ''} onClick={() => setDevice('desktop')}>Desktop</button>
          <button className={device === 'mobile' ? 'on' : ''} onClick={() => setDevice('mobile')}>Mobile</button>
        </div>
        <a className="btn line sm" href="/store-preview?draft=1" target="_blank" rel="noopener noreferrer" onClick={() => saveDraft(handle, config)}>Preview storefront</a>
        {live ? <Button small kind="quiet" onClick={unpublish} disabled={busy}>Take offline</Button> : null}
        <Button small kind="primary" busy={busy} busyLabel="Publishing…" onClick={publish}>{live ? 'Update storefront' : 'Publish'}</Button>
      </div>

      <div className="sfed-tabs" role="tablist" aria-label="Editor view">
        <button className={mobileTab === 'edit' ? 'on' : ''} role="tab" aria-selected={mobileTab === 'edit'} onClick={() => setMobileTab('edit')}>Edit</button>
        <button className={mobileTab === 'preview' ? 'on' : ''} role="tab" aria-selected={mobileTab === 'preview'} onClick={() => setMobileTab('preview')}>Preview</button>
      </div>

      <div className={`sfin tab-${mobileTab}`}>
        <aside className="sfin-controls" aria-label="Editing controls">
          <div className="sfed-panel">
            <Section title="Template" open>
              <div className="sfed-templates">
                {TEMPLATES.map((t) => (
                  <button key={t.id} type="button" className={`sfed-tpl${t.id === config.template ? ' on' : ''}`} disabled={isPremium(t.id)} onClick={() => applyTemplate(t.id)} aria-pressed={t.id === config.template}>
                    <b>{t.name}{t.premium ? ' · premium' : ''}</b><small>{t.premium ? 'Premium templates are not switched on yet.' : t.blurb}</small>
                  </button>
                ))}
              </div>
            </Section>
            <Section title="Colours" open>
              <div className="sfed-themes">
                {THEMES.map((t) => (
                  <button key={t.id} type="button" className={`sfed-theme${t.id === config.theme ? ' on' : ''}`} onClick={() => change((c) => ({ ...c, theme: t.id }))} aria-pressed={t.id === config.theme}>
                    <span className="sfed-swatch">{[t.background, t.primary, t.secondary, t.accent].map((c, n) => <i key={n} style={{ background: c }} />)}</span><b>{t.name}</b><small>{t.note}</small>
                  </button>
                ))}
              </div>
              <div className="field" style={{ marginTop: 12 }}>
                <span className="flabel">Accent colour</span>
                <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <button type="button" className={`sfed-dot default${!config.accent ? ' on' : ''}`} onClick={() => change((c) => ({ ...c, accent: null }))}>Theme’s own</button>
                  {ACCENTS.map((c) => <button key={c} type="button" className={`sfed-dot${config.accent === c ? ' on' : ''}`} style={{ background: c }} aria-label={`Accent ${c}`} aria-pressed={config.accent === c} onClick={() => change((x) => ({ ...x, accent: c }))} />)}
                </div>
                <span className="hint">Only the colours in the Stoora palette are offered, so text stays easy to read. The {themeById(config.theme).name} look is the base.</span>
              </div>
            </Section>
            <Section title="Shop name and logo">
              <Text id="sf-name" label="Shop name" value={config.brand.name} onChange={(v) => set('brand', { name: v })} hint={`Shown at the top. Leave blank to use “${db.shop.name}”.`} />
              <Text id="sf-tag" label="Tagline" value={config.brand.tagline} onChange={(v) => set('brand', { tagline: v })} />
              <ImageSlot label="Logo" value={config.brand.logo} onChange={(v) => set('brand', { logo: v })} onError={imageError} />
            </Section>
            <Section title="Top of your shop">
              <Text id="sf-ht" label="Headline" value={config.hero.title} onChange={(v) => set('hero', { title: v })} />
              <Text id="sf-hs" label="Short line under it" value={config.hero.subtitle} onChange={(v) => set('hero', { subtitle: v })} />
              <Text id="sf-hc" label="Button words" value={config.hero.cta} onChange={(v) => set('hero', { cta: v })} max={30} />
              <ImageSlot label="Main photo" value={config.hero.image} onChange={(v) => set('hero', { image: v })} onError={imageError} />
              <div className="field"><span className="flabel">Which part of the photo stays in view</span>
                <div className="seg" role="group" aria-label="Photo focus">{FOCUS_OPTIONS.map((f) => <button key={f} type="button" className={config.hero.focus === f ? 'on' : ''} aria-pressed={config.hero.focus === f} onClick={() => set('hero', { focus: f })}>{FOCUS_LABEL[f]}</button>)}</div></div>
            </Section>
            <Section title="Sections to show">
              {(Object.keys(SECTIONS) as SectionKey[]).map((key) => (
                <div className="toggle-row" key={key}><span className="grow t-ink">{SECTIONS[key]}</span><Switch label={SECTIONS[key]} checked={config.sections[key]} onChange={(v) => change((c) => ({ ...c, sections: { ...c.sections, [key]: v } }))} /></div>
              ))}
              <p className="cap">Some sections only appear in templates that have room for them.</p>
            </Section>
            <Section title="About you">
              <Text id="sf-at" label="Title" value={config.about.title} onChange={(v) => set('about', { title: v })} />
              <Text id="sf-ax" label="About text" value={config.about.text} onChange={(v) => set('about', { text: v })} max={LIMITS.text} area />
              <ImageSlot label="Photo" value={config.about.image} onChange={(v) => set('about', { image: v })} onError={imageError} />
            </Section>
            {template.kind === 'products' ? (
              <Section title="Your story and process">
                <Text id="sf-st" label="Story title" value={config.story.title} onChange={(v) => set('story', { title: v })} />
                <Text id="sf-sx" label="Story" value={config.story.text} onChange={(v) => set('story', { text: v })} max={LIMITS.text} area hint="Shown by Studio, Signature and Heritage Craft." />
                {config.process.map((step, i) => (
                  <div className="sfed-repeat" key={i}>
                    <Text id={`sf-pt${i}`} label={`Step ${i + 1}`} value={step.title} onChange={(v) => change((c) => ({ ...c, process: c.process.map((p, n) => (n === i ? { ...p, title: v } : p)) }))} max={40} />
                    <Text id={`sf-px${i}`} label="What happens" value={step.text} onChange={(v) => change((c) => ({ ...c, process: c.process.map((p, n) => (n === i ? { ...p, text: v } : p)) }))} />
                    <Button small kind="quiet" onClick={() => change((c) => ({ ...c, process: c.process.filter((_, n) => n !== i) }))}>Remove step</Button>
                  </div>
                ))}
                {config.process.length < LIMITS.process ? <Button small onClick={() => change((c) => ({ ...c, process: [...c.process, { title: '', text: '' }] }))}>Add a step</Button> : null}
              </Section>
            ) : (
              <Section title="About your services">
                <Text id="sf-sub" label="Subjects (separate with commas)" value={config.services.subjects.join(', ')} onChange={(v) => set('services', { subjects: parts(v) })} />
                <Text id="sf-lev" label="Levels" value={config.services.levels.join(', ')} onChange={(v) => set('services', { levels: parts(v) })} />
                <Text id="sf-mod" label="Mode (online, at my studio…)" value={config.services.modes.join(', ')} onChange={(v) => set('services', { modes: parts(v) })} />
                <Text id="sf-ses" label="When you teach" value={config.services.sessions} onChange={(v) => set('services', { sessions: v })} />
                <Text id="sf-cre" label="Credentials (one per line)" value={lines(config.services.credentials)} onChange={(v) => set('services', { credentials: v.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, LIMITS.listItems) })} area max={LIMITS.text} />
              </Section>
            )}
            <Section title="Questions and answers">
              {config.faqs.map((f, i) => (
                <div className="sfed-repeat" key={i}>
                  <Text id={`sf-fq${i}`} label="Question" value={f.q} onChange={(v) => change((c) => ({ ...c, faqs: c.faqs.map((x, n) => (n === i ? { ...x, q: v } : x)) }))} />
                  <Text id={`sf-fa${i}`} label="Answer" value={f.a} area max={LIMITS.text} onChange={(v) => change((c) => ({ ...c, faqs: c.faqs.map((x, n) => (n === i ? { ...x, a: v } : x)) }))} />
                  <Button small kind="quiet" onClick={() => change((c) => ({ ...c, faqs: c.faqs.filter((_, n) => n !== i) }))}>Remove</Button>
                </div>
              ))}
              {config.faqs.length < LIMITS.faqs ? <Button small onClick={() => change((c) => ({ ...c, faqs: [...c.faqs, { q: '', a: '' }] }))}>Add a question</Button> : <p className="cap">That is the most questions a shop can show.</p>}
            </Section>
            <Section title="Contact">
              <Text id="sf-wa" label="WhatsApp number (10 digits)" value={config.contact.whatsapp} onChange={(v) => set('contact', { whatsapp: v.replace(/\D/g, '').slice(0, 10) })} max={10} />
              <Text id="sf-ph" label="Phone number" value={config.contact.phone} onChange={(v) => set('contact', { phone: v.replace(/\D/g, '').slice(0, 10) })} max={10} />
              <Text id="sf-em" label="Email" value={config.contact.email} onChange={(v) => set('contact', { email: v })} />
              <Text id="sf-ad" label="Address" value={config.contact.address} onChange={(v) => set('contact', { address: v })} area />
              <Text id="sf-ho" label="Opening hours" value={config.contact.hours} onChange={(v) => set('contact', { hours: v })} />
              <Text id="sf-ig" label="Instagram name" value={config.social.instagram} onChange={(v) => set('social', { instagram: v.replace(/[^a-zA-Z0-9._]/g, '') })} max={30} hint="Just the name, without the @." />
            </Section>
            <Section title="Footer">
              <Text id="sf-fn" label="A line at the bottom of the page" value={config.footer.note} onChange={(v) => set('footer', { note: v })} />
            </Section>
            <Section title={template.kind === 'services' ? 'Services to show' : 'Products to show'} open>
              {items.length === 0 ? (
                <div className="sfed-empty"><p><b>Add your first {template.kind === 'services' ? 'service' : 'product'} to start building your storefront.</b></p><Link className="btn ink sm" href={template.kind === 'services' ? '/products' : '/products/new'}>{template.kind === 'services' ? 'Open Products' : 'Add a product'}</Link></div>
              ) : (
                <>
                  <p className="cap">Your real products appear here as soon as you add them. Switch one off to hide it from this page{template.kind === 'products' ? '; the ★ puts it in Featured' : ''}.</p>
                  {items.map((item) => (
                    <div className="sfed-item row" key={item.id}>
                      <span className="grow t-ink">{item.name}</span>
                      {template.kind === 'products' ? <button type="button" className={`sfed-star${config.featuredIds.includes(item.id) ? ' on' : ''}`} aria-pressed={config.featuredIds.includes(item.id)} aria-label={`Feature ${item.name}`} onClick={() => toggleId('featuredIds', item.id)}>★</button> : null}
                      <Switch label={`Show ${item.name}`} checked={!config.hiddenIds.includes(item.id)} onChange={() => toggleId('hiddenIds', item.id)} />
                    </div>
                  ))}
                  <Link className="btn line sm" href="/products" style={{ marginTop: 8 }}>Add or edit products</Link>
                </>
              )}
            </Section>
            <div style={{ padding: 16 }}><Button small kind="quiet" onClick={reset}>Start this template again</Button></div>
          </div>
        </aside>

        <div className="sfin-stage">
          <div className={`sfed-device-frame ${device}`}>
            <iframe ref={frame} title="Live preview of your storefront" src="/store-preview" />
          </div>
        </div>
      </div>

      <Dialog open={!!issues} onClose={() => setIssues(null)} title="Not ready to publish yet" footer={<Button kind="primary" onClick={() => setIssues(null)}>Got it</Button>}>
        <ul className="sfed-plain">{issues?.map((x) => <li key={x}>{x}</li>)}</ul>
      </Dialog>
    </div>
  );
}
