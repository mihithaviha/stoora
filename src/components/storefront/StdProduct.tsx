'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { I, cx, rupees } from './sx';
import { useToast } from '../ui';
import { useBag } from '@/lib/bag';
import { metaOf } from '@/lib/catalog';
import { deliveryLine } from '@/lib/delivery';
import { PAUSED_LINE } from '@/lib/shopstate';
import { useStore } from '@/lib/store';
import type { Product } from '@/lib/types';
import '../../styles/standard-store.css';

const isDark = (hex: string) => { const n = parseInt(hex.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 140; };

/** A product's own picture, or (until the seller adds one) its colour and icon. */
function Pic({ p, className = '' }: { p: Product; className?: string }) {
  const photo = p.photos?.[0];
  const tint = metaOf(p).hex;
  // eslint-disable-next-line @next/next/no-img-element
  if (photo) return <img src={photo} alt={p.name} className={className} />;
  return <span className={`${cx('ph-fill')} ${className}`} role="img" aria-label={`${p.name} (picture)`} style={{ background: tint, color: isDark(tint) ? '#fff' : '#171C3C', position: 'relative', aspectRatio: '4/5', width: '100%' }}><span className="ms" style={{ fontSize: 64 }}>{p.icon}</span></span>;
}

/** The product page of a shop that uses the Standard storefront: gallery, options, a sticky buy column, delivery check and more from the shop. */
export function StdProduct({ product: p, base }: { product: Product; base: string }) {
  const router = useRouter();
  const { db } = useStore();
  const bag = useBag();
  const toast = useToast();
  const [size, setSize] = useState('');
  const [err, setErr] = useState(false);
  const [qty, setQty] = useState(1);
  const [pin, setPin] = useState('');
  const [pinMsg, setPinMsg] = useState('');
  const [open, setOpen] = useState<number>(0);
  const [slide, setSlide] = useState(0);
  const gm = useRef<HTMLDivElement>(null);

  const m = metaOf(p);
  const out = p.stock <= 0;
  const orderable = db.shop.open;
  const wished = bag.wish.includes(p.id);
  const pictures = p.photos && p.photos.length ? p.photos : [''];
  const soldSize = (z: string) => p.optionStock?.[z] !== undefined && p.optionStock[z] <= 0;
  const left = size && p.optionStock?.[size] !== undefined ? p.optionStock[size] : p.stock;
  const off = p.comparePrice && p.comparePrice > p.price ? Math.round((1 - p.price / p.comparePrice) * 100) : 0;
  const more = db.products.filter((x) => x.status === 'Active' && x.id !== p.id).slice(0, 4);
  const tag = out ? 'Sold out' : p.stock <= 3 ? `Only ${p.stock} left` : m.badge || '';
  const details = m.details.length ? m.details : p.material ? [`Made of ${p.material.toLowerCase()}`] : [];

  const add = (go?: boolean) => {
    if (p.sizes.length && !size) { setErr(true); document.getElementById('sx-size')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    bag.add(p.id, size || undefined, qty);
    toast(`${p.name} added to your bag.`, { icon: 'shopping_bag' });
    if (go) router.push(`${base}/checkout`);
  };
  const check = () => {
    if (!/^\d{6}$/.test(pin)) { setPinMsg('bad'); return; }
    setPinMsg(pin.startsWith('3') ? 'Delivers in 2 to 3 days.' : 'Delivers in 4 to 6 days.');
  };
  const scrollTo = (i: number) => gm.current?.scrollTo({ left: gm.current.clientWidth * i, behavior: 'smooth' });

  return (
    <div className="sx">
      <div className={cx('wrap')}>
        <nav className={cx('crumb')} aria-label="Breadcrumb">
          <Link href={base}>{db.shop.name}</Link><I n="chevron_right" />
          <Link href={`${base}#sx-products`}>{p.category}</Link><I n="chevron_right" /><span aria-current="page">{p.name}</span>
        </nav>
        <div className={cx('pdp')}>
          <div className={`${cx('gal')}${pictures.length > 1 ? '' : ' ' + cx('single')}`}>
            <div className={cx('gmain')} ref={gm} onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}>
              {pictures.map((src, i) => (
                src
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img key={i} src={src} alt={p.name} />
                  : <Pic key={i} p={p} className={cx('slide')} />
              ))}
            </div>
            {pictures.length > 1 ? (
              <>
                <div className={cx('gthumbs')}>{pictures.map((src, i) => (
                  <button key={i} type="button" aria-current={slide === i} aria-label={`Photo ${i + 1}`} onClick={() => scrollTo(i)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" />
                  </button>
                ))}</div>
                <div className={cx('dots')}>{pictures.map((_, i) => <i key={i} className={slide === i ? cx('on') : ''} />)}</div>
              </>
            ) : null}
          </div>

          <div className={cx('pinfo')}>
            <div className={cx('row')} style={{ gap: 10, flexWrap: 'wrap' }}>
              {tag ? <span className={`${cx('tag')} ${cx(out ? '' : 'hot')}`}>{tag}</span> : null}
              {m.reviews > 0 ? <span className={cx('rt')} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', font: '600 14px var(--f-sans)', color: 'var(--ink)' }}><I n="star" c="s" />{m.rating.toFixed(1)}<span className={cx('t-cap')} style={{ fontWeight: 400 }}>· {m.reviews} reviews</span></span> : null}
            </div>
            <h1>{p.name}</h1>
            <div className={cx('pprice')}>
              <span className={cx('num')}>{rupees(p.price)}</span>
              {off ? <><s>{rupees(p.comparePrice!)}</s><span className={cx('tag ok')}>{off}% off</span></> : null}
              <span className={cx('t-cap')} style={{ width: '100%' }}>Inclusive of taxes. Delivery is worked out at checkout.</span>
            </div>
            {m.blurb || p.description ? <p style={{ margin: 0 }}>{m.blurb || p.description}</p> : null}

            {p.sizes.length > 0 ? (
              <div className={cx('og')} id="sx-size">
                <label>Size{size ? <>: <b>{size}</b></> : null}</label>
                <div className={cx('sw')} role="group" aria-label="Size">
                  {p.sizes.map((z) => (
                    <button key={z} type="button" className={cx('chip')} aria-pressed={size === z} disabled={soldSize(z)} title={soldSize(z) ? 'Sold out' : undefined} style={{ width: 'auto', height: 44, borderRadius: 99, padding: '0 20px', font: '500 14px var(--f-sans)' }} onClick={() => { setSize(z); setQty(1); setErr(false); }}>{z}{soldSize(z) ? ' (sold out)' : ''}</button>
                  ))}
                </div>
                {err ? <span role="alert" style={{ color: 'var(--negative)', fontSize: 13.5 }}>Choose a size to continue.</span> : null}
              </div>
            ) : null}

            {orderable ? (
              <div className={cx('buyrow')}>
                <div className={cx('qty')} style={{ height: 48 }} role="group" aria-label="Quantity">
                  <button type="button" aria-label="One less" style={{ height: 48, width: 44 }} onClick={() => setQty(Math.max(1, qty - 1))}><I n="remove" c="s" /></button>
                  <span aria-live="polite">{qty}</span>
                  <button type="button" aria-label="One more" style={{ height: 48, width: 44 }} onClick={() => setQty(Math.min(Math.min(10, left || 1), qty + 1))}><I n="add" c="s" /></button>
                </div>
                <button className={cx('btn btn-ink')} type="button" disabled={out} onClick={() => add()}><I n="shopping_bag" c="s" />{out ? 'Sold out' : 'Add to bag'}</button>
                <button className={cx('btn btn-go')} type="button" disabled={out} onClick={() => add(true)}>Buy now</button>
              </div>
            ) : <p className={cx('t-cap')} role="status">{PAUSED_LINE}</p>}
            <button className={cx('btn btn-ghost')} type="button" aria-pressed={wished} onClick={() => { bag.toggleWish(p.id); toast(wished ? 'Removed from wishlist.' : 'Saved to wishlist.', { icon: 'favorite' }); }}><I n="favorite" c="s" />{wished ? 'Saved' : 'Save for later'}</button>

            <div className={cx('og')}>
              <label htmlFor="sx-pin">Delivery</label>
              <div className={cx('pin')}>
                <input id="sx-pin" className={cx('input')} inputMode="numeric" maxLength={6} placeholder="Enter pincode" value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setPinMsg(''); }} aria-invalid={pinMsg === 'bad' || undefined} />
                <button className={cx('btn btn-ghost')} type="button" onClick={check}>Check</button>
              </div>
              <div className={cx('pinmsg')} role="status" style={pinMsg === 'bad' ? { color: 'var(--negative)' } : undefined}>{pinMsg === 'bad' ? 'Enter a 6 digit pincode.' : pinMsg}</div>
            </div>

            <div className={cx('trust')}>
              <div><span className={cx('ic')}><I n="local_shipping" /></span><span><b>{bag.rule.fee === 0 ? 'Free delivery' : bag.rule.freeOver > 0 ? `Free over ${rupees(bag.rule.freeOver)}` : `Delivery ${rupees(bag.rule.fee)}`}</b><br /><span className={cx('t-cap')}>{deliveryLine(bag.rule)}</span></span></div>
              <div><span className={cx('ic')}><I n="verified_user" /></span><span><b>Secure payment</b><br /><span className={cx('t-cap')}>{db.shop.online !== false ? 'UPI, cards and netbanking' : 'Pay by UPI'}{db.shop.cod ? ' and cash on delivery' : ''}</span></span></div>
            </div>

            <div className={cx('acc')}>
              {details.length ? (
                <div className={cx('q')} data-open={open === 0}>
                  <button type="button" aria-expanded={open === 0} onClick={() => setOpen(open === 0 ? -1 : 0)}>Details<I n="add" /></button>
                  <div className={cx('a')}><div><ul>{details.map((d) => <li key={d}>{d}</li>)}</ul></div></div>
                </div>
              ) : null}
              <div className={cx('q')} data-open={open === 1}>
                <button type="button" aria-expanded={open === 1} onClick={() => setOpen(open === 1 ? -1 : 1)}>Shipping<I n="add" /></button>
                <div className={cx('a')}><div><p>{db.shop.city ? `Ships from ${db.shop.city}. ` : ''}{deliveryLine(bag.rule)}.</p></div></div>
              </div>
            </div>

            <div className={cx('seller')}>
              <span className={cx('av mono')} style={{ width: 56, height: 56, borderRadius: '50%' }} aria-hidden="true">{db.shop.name[0]}</span>
              <div><b>{db.shop.name}</b><span className={cx('t-cap')}>{db.shop.city || 'Seller'}</span></div>
              <Link className={cx('btn btn-ghost btn-sm')} href={base}>Visit shop</Link>
            </div>
          </div>
        </div>

        {more.length ? (
          <section className={cx('sec sec-grey')} style={{ marginInline: 'calc(var(--gut) * -1)', paddingInline: 'var(--gut)' }}>
            <div className={cx('wrap')} style={{ padding: 0 }}>
              <div className={cx('shead')}><div><span className={cx('eyebrow')}>More</span><h2 className={cx('h-sec')}>You may also like</h2></div></div>
              <div className={cx('pgrid')} style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))' }}>
                {more.map((x) => (
                  <article className={cx('pc')} key={x.id}>
                    <div className={cx('m')}><Link className={cx('lk')} href={`${base}/p/${x.id}`} aria-label={x.name} /><Pic p={x} /></div>
                    <div><div className={cx('pr')}><Link className={cx('nm')} href={`${base}/p/${x.id}`}>{x.name}</Link></div></div>
                    <div className={cx('pr')}><span className={cx('num')}>{rupees(x.price)}</span></div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </div>

      {orderable && !out ? (
        <div className={cx('buybar')}>
          <span className={cx('num')}>{rupees(p.price)}</span>
          <button className={cx('btn btn-ink')} type="button" onClick={() => add()}>Add to bag</button>
          <button className={cx('btn btn-go')} type="button" onClick={() => add(true)}>Buy now</button>
        </div>
      ) : null}
    </div>
  );
}
