'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { I, ShopfrontArt, cx, rupees } from './sx';
import { useBag } from '@/lib/bag';
import { metaOf } from '@/lib/catalog';
import { useStore } from '@/lib/store';
import '../../styles/standard-store.css';

/** The bag as a slide-in drawer: lines with quantity, a free-delivery meter, and the way on to the real checkout. */
export function StdCartDrawer({ open, onClose, base }: { open: boolean; onClose: () => void; base: string }) {
  const bag = useBag();
  const { db } = useStore();
  const panel = useRef<HTMLElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  // Escape closes it, the page behind does not scroll, and focus goes into the drawer and back again
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !panel.current) return;
      const f = [...panel.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')];
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    document.documentElement.style.overflow = 'hidden';
    closeBtn.current?.focus();
    return () => { document.removeEventListener('keydown', key); document.documentElement.style.overflow = ''; before?.focus?.(); };
  }, [open, onClose]);

  const { freeOver, fee } = bag.rule;
  const goal = fee > 0 && freeOver > 0 ? freeOver : 0;
  const left = goal ? Math.max(0, goal - bag.subtotal) : 0;
  const pct = goal ? Math.min(100, Math.round((bag.subtotal / goal) * 100)) : 0;

  return (
    <div className="sx">
      <div className={`${cx('scrim')}${open ? ' ' + cx('on') : ''}`} onClick={onClose} aria-hidden="true" />
      <aside ref={panel} className={`${cx('drawer')}${open ? ' ' + cx('on') : ''}`} role="dialog" aria-modal="true" aria-label="Your bag" data-stage="1" aria-hidden={!open}>
        <div className={cx('grab')} />
        <div className={cx('dh')}><h3>Your bag{bag.count ? ` (${bag.count})` : ''}</h3><button ref={closeBtn} className={cx('ibtn line x')} type="button" aria-label="Close" onClick={onClose}><I n="close" /></button></div>
        <div className={cx('db')}>
          {bag.detailed.length === 0 ? (
            <div className={cx('empty')}><ShopfrontArt name={db.shop.name} /><h3>Your bag is empty</h3><p style={{ margin: 0, maxWidth: '30ch' }}>Pieces you add show up here, ready for checkout.</p>
              <button className={cx('btn btn-ink')} type="button" style={{ marginTop: 10 }} onClick={onClose}>Keep shopping</button></div>
          ) : (
            <>
              {goal ? <div className={cx('ship')}><span>{left ? <>Add <b>{rupees(left)}</b> more for free delivery</> : <b>Free delivery unlocked</b>}</span><div className={cx('bar')}><i style={{ width: `${pct}%` }} /></div></div> : null}
              <div>
                {bag.detailed.map(({ line, product, index }) => {
                  const photo = product.photos?.[0];
                  const tint = metaOf(product).hex;
                  return (
                    <div className={cx('ci')} key={index}>
                      {photo
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={photo} alt="" />
                        : <span className={cx('ci-art')} style={{ background: tint }} aria-hidden="true"><span className="ms">{product.icon}</span></span>}
                      <div className={cx('cm')}>
                        <b>{product.name}</b>
                        <small>{line.size ? `Size ${line.size}` : product.category}</small>
                        <div className={cx('cr')}>
                          <div className={cx('qty')} role="group" aria-label={`Quantity of ${product.name}`}>
                            <button type="button" aria-label="One less" onClick={() => (line.qty <= 1 ? bag.remove(index) : bag.setQty(index, line.qty - 1))}><I n="remove" c="s" /></button>
                            <span>{line.qty}</span>
                            <button type="button" aria-label="One more" onClick={() => bag.setQty(index, line.qty + 1)}><I n="add" c="s" /></button>
                          </div>
                          <span className={cx('num')} style={{ fontSize: 18 }}>{rupees(product.price * line.qty)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        {bag.detailed.length > 0 ? (
          <div className={cx('df')}>
            <div className={cx('sumr')}>
              <div><span>Subtotal</span><b style={{ color: 'var(--ink)', fontWeight: 600 }}>{rupees(bag.subtotal)}</b></div>
              <div><span>Delivery</span><span>{bag.delivery ? rupees(bag.delivery) : 'Free'}</span></div>
            </div>
            <Link className={cx('btn btn-go btn-block')} href={`${base}/checkout`} onClick={onClose}>Checkout · {rupees(bag.total)}<I n="arrow_forward" c="s" /></Link>
            <Link className={cx('btn btn-ghost btn-block')} href={`${base}/bag`} onClick={onClose}>View bag</Link>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
