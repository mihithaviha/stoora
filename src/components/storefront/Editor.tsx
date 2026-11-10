'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button, Dialog, Icon, Switch, useToast } from '../ui';
import { shopAnnounce } from '@/lib/storefront/announce';
import { deliveryLine, deliveryRule } from '@/lib/delivery';
import { useStore } from '@/lib/store';
import { clearDraft, saveDraft, shrinkImage } from '@/lib/storefront/draft';
import { toStoreData } from '@/lib/storefront/map';
import {
  AWNINGS, FOCUS_OPTIONS, LIMITS, STD_SECTIONS, defaultConfig, layoutOf, visibleData,
  type StdSection, type StoreConfig,
} from '@/lib/storefront/shared';

type Save = 'saved' | 'unsaved' | 'failed';
const FOCUS_LABEL: Record<string, string> = { '50% 20%': 'Top', '50% 50%': 'Middle', '50% 80%': 'Bottom' };

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
  // every live shop uses the Standard layout; designs saved with an older template move over, keeping their words and photos
  const start = useMemo<StoreConfig>(() => ({ ...initial, template: 'standard' }), [initial]);
  const [config, setConfig] = useState<StoreConfig>(start);
  const [save, setSave] = useState<Save>('saved');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const configRef = useRef(config);
  const hist = useRef({ list: [JSON.stringify(start)], at: 0 });
  const [, redraw] = useState(0);
  const [issues, setIssues] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const handle = db.shop.handle;
  const live = Boolean(db.shop.storefront);

  const data = useMemo(() => visibleData(toStoreData(db), config), [db, config]);
  const layout = layoutOf(config);

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
    const rule = deliveryRule(db.shop);
    frame.current?.contentWindow?.postMessage({ type: 'render', config, data, extras: { payments: { online: db.shop.online !== false, upi: true }, announce: shopAnnounce(db, rule), delivery: deliveryLine(rule), cod: Boolean(db.shop.cod) } }, window.location.origin);
  }, [config, data, db]);
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
    if (!data.products.length && !data.services.length) found.push('Show at least one product or service. Add one in your dashboard, or switch one back on under Products to show.');
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
    toast(failed ? `Couldn’t go back to the default: ${failed}` : 'Back to the default layout. Your changes were removed from the live shop.', { icon: failed ? 'error' : 'storefront' });
  };

  const reset = () => change(() => ({ ...defaultConfig('standard', { name: db.shop.name, tagline: db.shop.tagline }), contact: config.contact }));
  /** Write the layout back in full so the saved design always lists every section. */
  const setLayout = (patch: Partial<ReturnType<typeof layoutOf>>) => change((c) => ({ ...c, layout: { ...layoutOf(c), ...patch } }));
  const moveSection = (i: number, by: -1 | 1) => { const order = [...layout.order]; const j = i + by; if (j < 0 || j >= order.length) return; [order[i], order[j]] = [order[j], order[i]]; setLayout({ order }); };
  const toggleSection = (id: StdSection) => setLayout({ hidden: layout.hidden.includes(id) ? layout.hidden.filter((x) => x !== id) : [...layout.hidden, id] });

  const toggleId = (list: 'featuredIds' | 'hiddenIds', id: string) => change((c) => ({ ...c, [list]: c[list].includes(id) ? c[list].filter((x) => x !== id) : [...c[list], id] }));
  const imageError = (message: string) => toast(message, { icon: 'error' });
  const products = db.products.filter((p) => p.status === 'Active');

  const saveLabel = { saved: 'All changes saved', unsaved: 'Saving…', failed: 'Could not save: your browser’s storage is full' }[save];

  return (
    <div className="sfin-wrap">
      <div className="sfed-bar" style={{ borderRadius: 18, border: '1px solid var(--line-soft)', marginBottom: 12 }}>
        <Button small icon="arrow_back" onClick={onBack}>Templates</Button>
        <b className="sfed-name">{config.brand.name || db.shop.name}</b>
        <span className={`tag ${live ? 'ok' : 'neutral'}`}>{live ? 'Customised' : 'Default layout'}</span>
        <span className={`sfed-save ${save}`} role="status">{saveLabel}</span>
        <span className="sp" />
        <button className="ibtn sm" type="button" aria-label="Undo" disabled={hist.current.at <= 0} onClick={() => jump(hist.current.at - 1)}><Icon name="undo" size="sm" /></button>
        <button className="ibtn sm" type="button" aria-label="Redo" disabled={hist.current.at >= hist.current.list.length - 1} onClick={() => jump(hist.current.at + 1)}><Icon name="redo" size="sm" /></button>
        <div className="seg sfed-device" role="group" aria-label="Preview size">
          <button className={device === 'desktop' ? 'on' : ''} onClick={() => setDevice('desktop')}>Desktop</button>
          <button className={device === 'mobile' ? 'on' : ''} onClick={() => setDevice('mobile')}>Mobile</button>
        </div>
        <a className="btn line sm" href="/store-preview?draft=1" target="_blank" rel="noopener noreferrer" onClick={() => saveDraft(handle, config)}>Preview storefront</a>
        {live ? <Button small kind="quiet" onClick={unpublish} disabled={busy}>Back to default</Button> : null}
        <Button small kind="primary" busy={busy} busyLabel="Publishing…" onClick={publish}>{live ? 'Update storefront' : 'Publish'}</Button>
      </div>

      <div className="sfed-tabs" role="tablist" aria-label="Editor view">
        <button className={mobileTab === 'edit' ? 'on' : ''} role="tab" aria-selected={mobileTab === 'edit'} onClick={() => setMobileTab('edit')}>Edit</button>
        <button className={mobileTab === 'preview' ? 'on' : ''} role="tab" aria-selected={mobileTab === 'preview'} onClick={() => setMobileTab('preview')}>Preview</button>
      </div>

      <div className={`sfin tab-${mobileTab}`}>
        <aside className="sfin-controls" aria-label="Editing controls">
          <div className="sfed-panel">
            <Section title="Sections" open>
              <p className="cap" style={{ margin: 0 }}>Switch a section on or off and move it up or down. A section with nothing to show stays out of the page.</p>
              {layout.order.map((id, i) => (
                <div className="toggle-row sfed-order" key={id}>
                  <button className="ibtn sm" type="button" aria-label={`Move ${STD_SECTIONS[id]} up`} disabled={i === 0} onClick={() => moveSection(i, -1)}><Icon name="arrow_upward" size="sm" /></button>
                  <button className="ibtn sm" type="button" aria-label={`Move ${STD_SECTIONS[id]} down`} disabled={i === layout.order.length - 1} onClick={() => moveSection(i, 1)}><Icon name="arrow_downward" size="sm" /></button>
                  <span className="grow t-ink">{STD_SECTIONS[id]}</span>
                  <Switch label={`Show ${STD_SECTIONS[id]}`} checked={!layout.hidden.includes(id)} onChange={() => toggleSection(id)} />
                </div>
              ))}
            </Section>
            <Section title="Awning colours" open>
              <div className="sfed-awnings" role="group" aria-label="Awning colours">
                {AWNINGS.map((pair, n) => {
                  const on = pair[0] === layout.awning[0] && pair[1] === layout.awning[1];
                  return <button key={n} type="button" className={`sfed-awn${on ? ' on' : ''}`} aria-pressed={on} aria-label={`Colour set ${n + 1}`} style={{ background: `linear-gradient(90deg, ${pair[0]} 50%, ${pair[1]} 50%)` }} onClick={() => setLayout({ awning: pair })} />;
                })}
              </div>
              <span className="hint">The striped awning over your shop window.</span>
            </Section>
            <Section title="Shop name and logo">
              <Text id="sf-name" label="Shop name" value={config.brand.name} onChange={(v) => set('brand', { name: v })} hint={`Shown at the top. Leave blank to use “${db.shop.name}”.`} />
              <Text id="sf-tag" label="Tagline" value={config.brand.tagline} onChange={(v) => set('brand', { tagline: v })} />
              <ImageSlot label="Logo" value={config.brand.logo} onChange={(v) => set('brand', { logo: v })} onError={imageError} />
            </Section>
            <Section title="Top of your shop">
              <Text id="sf-ht" label="Headline" value={config.hero.title} onChange={(v) => set('hero', { title: v })} hint="The last two words get the Stoora gradient." />
              <Text id="sf-hs" label="Intro" max={LIMITS.text} area value={config.hero.subtitle} onChange={(v) => set('hero', { subtitle: v })} />
              <Text id="sf-hc" label="Button words" value={config.hero.cta} onChange={(v) => set('hero', { cta: v })} max={30} />
              <ImageSlot label="Main photo" value={config.hero.image} onChange={(v) => set('hero', { image: v })} onError={imageError} />
              <div className="field"><span className="flabel">Which part of the photo stays in view</span>
                <div className="seg" role="group" aria-label="Photo focus">{FOCUS_OPTIONS.map((f) => <button key={f} type="button" className={config.hero.focus === f ? 'on' : ''} aria-pressed={config.hero.focus === f} onClick={() => set('hero', { focus: f })}>{FOCUS_LABEL[f]}</button>)}</div></div>
            </Section>
            <Section title="Our story">
              <Text id="sf-at" label="Title" value={config.about.title} onChange={(v) => set('about', { title: v })} />
              <Text id="sf-ax" label="About text" value={config.about.text} onChange={(v) => set('about', { text: v })} max={LIMITS.text} area />
              <ImageSlot label="Photo" value={config.about.image} onChange={(v) => set('about', { image: v })} onError={imageError} />
            </Section>
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
              <p className="cap" style={{ margin: 0 }}>Choose which details buyers see under “Get in touch”. Your email stays private unless you switch it on.</p>
              {([['whatsapp', 'WhatsApp', true], ['phone', 'Phone', true], ['email', 'Email', false]] as const).map(([key, label, dflt]) => (
                <div className="toggle-row" key={key}><span className="grow t-ink">Show {label}</span><Switch label={`Show ${label} on my shop`} checked={config.contact.show?.[key] ?? dflt} onChange={(v) => set('contact', { show: { ...config.contact.show, [key]: v } })} /></div>
              ))}
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
            <Section title="Products to show" open>
              {products.length === 0 ? (
                <div className="sfed-empty"><p><b>Add your first product to start building your storefront.</b></p><Link className="btn ink sm" href="/products/new">Add a product</Link></div>
              ) : (
                <>
                  <p className="cap">Your real products appear here as soon as you add them. Switch one off to hide it from this page; the ★ puts it first.</p>
                  {products.map((item) => (
                    <div className="sfed-item row" key={item.id}>
                      <span className="grow t-ink">{item.name}</span>
                      <button type="button" className={`sfed-star${config.featuredIds.includes(item.id) ? ' on' : ''}`} aria-pressed={config.featuredIds.includes(item.id)} aria-label={`Show ${item.name} first`} onClick={() => toggleId('featuredIds', item.id)}>★</button>
                      <Switch label={`Show ${item.name}`} checked={!config.hiddenIds.includes(item.id)} onChange={() => toggleId('hiddenIds', item.id)} />
                    </div>
                  ))}
                  <Link className="btn line sm" href="/products" style={{ marginTop: 8 }}>Add or edit products</Link>
                </>
              )}
              {db.services.length > 0 ? <p className="cap" style={{ marginTop: 8 }}>Your classes and sessions show under “Classes and sessions”.</p> : null}
            </Section>
            <div style={{ padding: 16 }}><Button small kind="quiet" onClick={reset}>Start again</Button></div>
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
