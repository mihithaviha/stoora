'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Ic } from '../bits';

/**
 * Stand-ins for the real app screens A to H of the page plan. They are drawn in code from a made-up demo shop
 * (shop "Meera", odd real-looking prices) and every one carries a small "Sample shop" tag.
 * Replace each with a real capture from the demo shop when Midhun has them.
 */

function Frame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="lp-scr" role="img" aria-label={label}>
      <span className="lp-sample">Sample shop</span>
      <div className="lp-scr-in" aria-hidden="true">{children}</div>
    </div>
  );
}

const TONES = ['var(--primary-tint)', 'var(--marigold-tint)', 'var(--positive-tint)', 'var(--negative-tint)'];

function Tile({ i, name, price }: { i: number; name: string; price: string }) {
  return (
    <div className="lp-tile">
      <span className="lp-tile-img" style={{ background: TONES[i % TONES.length] }} />
      <b>{name}</b>
      <small>{price}</small>
    </div>
  );
}

/** Screen A: the finished demo shop on a phone. */
export function ScreenShop() {
  return (
    <Frame label="A finished sample shop on a phone, with four products and a Pay by UPI button">
      <div className="lp-bar"><b>Meera Handlooms</b><small>stoora.in/meera</small></div>
      <div className="lp-tiles">
        <Tile i={0} name="Indigo kurta set" price="₹2,899" />
        <Tile i={1} name="Block-print dupatta" price="₹649" />
        <Tile i={2} name="Jute tote, large" price="₹1,275" />
        <Tile i={3} name="Cotton stole" price="₹1,849" />
      </div>
      <span className="lp-pay"><Ic n="payments" c="sm" />Pay by UPI</span>
    </Frame>
  );
}

/** Screen B: the shop as it was built. */
export function ScreenBuilt() {
  return (
    <Frame label="A sample shop that has been built, with products and prices">
      <div className="lp-bar"><b>Meera Handlooms</b><small>Handloom from Pochampally</small></div>
      <div className="lp-rows">
        {[['Indigo kurta set', '₹2,899'], ['Block-print dupatta', '₹649'], ['Jute tote, large', '₹1,275']].map(([n, p], i) => (
          <div className="lp-row" key={n}><span className="lp-dot" style={{ background: TONES[i] }} /><b>{n}</b><span>{p}</span></div>
        ))}
      </div>
    </Frame>
  );
}

/** Screen C: a product page with the written name and description. */
export function ScreenProduct() {
  return (
    <Frame label="A sample product page with a written name and description">
      <span className="lp-hero-img" style={{ background: TONES[3] }} />
      <div className="lp-copy">
        <b>Cotton stole</b>
        <p>Soft hand-woven cotton, about two metres long. Washes well and gets softer with use.</p>
        <span className="lp-price">₹1,849</span>
      </div>
    </Frame>
  );
}

/** Screen D: UPI payment set-up with a pay link. */
export function ScreenUpi() {
  return (
    <Frame label="A sample UPI payment set-up with a pay link ready">
      <div className="lp-rows">
        <div className="lp-field"><small>UPI ID</small><b>meera@okbank</b></div>
        <div className="lp-field"><small>Pay link</small><b>stoora.in/meera/pay</b></div>
        <span className="lp-ready"><Ic n="check_circle" c="sm" />Ready to take payments</span>
      </div>
    </Frame>
  );
}

/** Screen E: a buyer's message, three dots, then the drafted reply. Plays once when it scrolls into view. */
export function ScreenChat() {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { setSeen(true); return; }
    const watch = new IntersectionObserver((e) => { if (e[0].isIntersecting) { setSeen(true); watch.disconnect(); } }, { threshold: 0.4 });
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  return (
    <div ref={ref} className={seen ? 'lp-chatcard lp-go' : 'lp-chatcard'}>
      <Frame label="A sample buyer message on WhatsApp with a drafted reply">
        <div className="lp-msg them">Hi, is the cotton stole in stock? Can you deliver to Pune?</div>
        <span className="lp-dots"><i /><i /><i /></span>
        <div className="lp-msg lp-draft">Yes, 3 left at ₹1,849. Delivery to Pune takes 3 to 4 days.</div>
      </Frame>
    </div>
  );
}

/** Screen F: the orders list. */
export function ScreenOrders() {
  const rows: [string, string, string, string][] = [
    ['#1013', '₹2,899', 'Paid', 'WhatsApp'],
    ['#1012', '₹649', 'To ship', 'Instagram'],
    ['#1011', '₹1,275', 'Shipped', 'Your link'],
  ];
  return (
    <Frame label="A sample list of orders: paid, to ship and shipped, with where each came from">
      <div className="lp-rows">
        {rows.map(([id, amt, st, from]) => (
          <div className="lp-row two" key={id}><b>{id} · {amt}</b><span className="lp-badge">{st}</span><small>{from}</small></div>
        ))}
      </div>
    </Frame>
  );
}

/** Screen G: the weekly summary. */
export function ScreenWeek() {
  const bars = [38, 52, 30, 64, 48, 72, 58];
  return (
    <Frame label="A sample weekly summary: two lines, a small chart and one idea">
      <div className="lp-copy">
        <b>Your week</b>
        <p>You took 9 orders. Most came from WhatsApp.</p>
      </div>
      <div className="lp-bars">{bars.map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
      <div className="lp-idea"><Ic n="lightbulb" c="sm" />Idea: share the stole on your status this weekend.</div>
    </Frame>
  );
}

/** Screen H: sign-up with a shop name typed. */
export function ScreenSignup() {
  return (
    <Frame label="A sample sign-up screen with a shop name typed in">
      <div className="lp-copy"><b>Pick your shop name</b></div>
      <div className="lp-input"><small>stoora.in/</small><b>meera</b></div>
      <span className="lp-pay"><Ic n="arrow_forward" c="sm" />Continue</span>
    </Frame>
  );
}
