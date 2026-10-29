'use client';
import { useStore } from '@/lib/store';
import { Card, Chips, DemoBar, Icon, PageHeader, Skeleton, Switch, useToast } from '@/components/ui';
import { CopyButton } from '@/components/CopyButton';
import { rs } from '@/lib/format';
import type { Shop } from '@/lib/types';

export default function StorefrontPage() {
  const { db, ready, setShop } = useStore(); const toast = useToast();
  if (!ready) return <Skeleton rows={3} height={120} />;
  const s = db.shop; const link = `https://stoora.in/${s.handle}`;
  const hd = { Warm: 'var(--gradient-soft)', Indigo: 'var(--ink)', Plain: 'var(--card)' }[s.look];
  const dark = s.look === 'Indigo';
  const toggle = (k: 'open' | 'showPrices' | 'cod', label: string) => (v: boolean) => { setShop({ [k]: v } as Partial<Shop>); toast(`${label}: ${v ? 'on' : 'off'}.`, { undo: () => setShop({ [k]: !v } as Partial<Shop>) }); };
  return (
    <>
      <DemoBar>Demo shop: changes here are saved in this browser only. The public shop page isn’t live yet.</DemoBar>
      <PageHeader title="Storefront" lede="What buyers see at your shop link." actions={<CopyButton text={link} label="Copy shop link" done="Shop link copied." />} />
      <div className="detail">
        <div>
          <Card style={{ background: 'var(--inner)' }}>
            <div className="shopprev" aria-label="Preview of your shop on a phone">
              <div className="hd" style={{ background: hd }}><span className="shop-av" aria-hidden="true">{s.name[0]}</span>
                <b style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: dark ? '#FFFFFF' : 'var(--ink)', letterSpacing: '-.02em' }}>{s.name}</b>
                <span style={{ fontSize: 12, color: dark ? 'var(--on-ink-soft)' : 'var(--ink-65)' }}>Hand block prints and yoga, {s.city}</span></div>
              <div className="gridp">{db.products.filter((p) => p.status === 'Active').slice(0, 4).map((p) => (
                <div key={p.id}><span className="ph" style={p.photos?.[0] ? { backgroundImage: `url(${p.photos[0]})`, backgroundSize: 'cover' } : undefined}>{!p.photos?.[0] && <Icon name={p.icon} />}</span><span>{p.name}</span>{s.showPrices && <b className="t-ink num">{rs(p.price)}</b>}{p.stock === 0 && <span style={{ color: 'var(--negative-deep)' }}>Sold out</span>}</div>))}</div>
            </div>
            {!s.open && <div className="banner warn" style={{ marginTop: 'var(--s3)' }}><Icon name="storefront" /><span>Your shop is closed. Buyers see a “back soon” page.</span></div>}
          </Card>
        </div>
        <div>
          <Card className="stack tight" title="Your shop link"><div className="row"><span className="grow t-ink" style={{ fontWeight: 500, overflowWrap: 'anywhere' }}>stoora.in/{s.handle}</span><CopyButton small text={link} done="Shop link copied." /></div><p className="cap">Put it in your Instagram bio and WhatsApp status.</p></Card>
          <Card title="Shop settings">
            {([['open', 'Shop is open', 'Buyers can order right now'], ['showPrices', 'Show prices', 'Turn off to take orders on chat only'], ['cod', 'Cash on delivery', 'Let buyers pay when the parcel arrives']] as const).map(([k, l, sub]) => (
              <div key={k} className="toggle-row"><span className="grow"><span className="t-ink" style={{ fontWeight: 500, display: 'block' }}>{l}</span><span className="cap">{sub}</span></span><Switch checked={s[k]} onChange={toggle(k, l)} label={l} /></div>))}
          </Card>
          <Card className="stack tight" title="Look"><Chips label="Shop look" value={s.look} onChange={(v) => setShop({ look: v })} options={(['Warm', 'Indigo', 'Plain'] as const).map((v) => ({ value: v, label: v }))} /><p className="cap">Changes the top of your shop. Products stay the same.</p></Card>
        </div>
      </div>
    </>
  );
}
