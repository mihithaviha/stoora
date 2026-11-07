import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { Ic } from '../bits';
import { AutoSwipe } from './AutoSwipe';
import {
  ScreenBuilt, ScreenChat, ScreenOrders, ScreenProduct, ScreenShop, ScreenSignup, ScreenUpi, ScreenWeek,
} from './Screens';

/** Section 6 (customer stories) is built but stays off the page until there are real sellers who said yes in writing. */
const SHOW_STORIES = false;

/**
 * The pictures of the page plan (landing-page-wireframe, "All images"). Each is a file already in the project (WebP, saved small):
 * photos under the Unsplash licence (credits in public/assets/home/CREDITS.md and public/assets/journal/CREDITS.md) and
 * Stoora's own watercolour illustrations. When a better-matching photo is bought, swap the file in the slot below.
 * While a slot is null it shows a plain cream block with no text, so nothing is made up.
 * Photos carry no name, quote or "customer" caption.
 */
type PhotoSlot = { src: string; width: number; height: number; alt: string } | null;
const PHOTOS: Record<'top' | 'chat' | 'sell' | 'workshop' | 'sessions' | 'add' | 'share' | 'phone' | 'last', PhotoSlot> = {
  // Image 1: the top of the page. A woman packing a parcel at a table at home, in warm window light
  top: { src: '/assets/home/hero-packing-v2.webp', width: 900, height: 1118, alt: 'A woman taping up a parcel at a wooden table at home, with boxes and bubble wrap around her' },
  // Image 2: a hand holding a phone with a chat open, a cup of tea behind
  chat: { src: '/assets/home/hero-chat-phone-v2.webp', width: 1100, height: 614, alt: 'A hand holding a phone with a WhatsApp chat about an order, and a glass of tea on the table' },
  // Images 3, 4, 5: who it is for
  sell: { src: '/assets/home/audience-sell.webp', width: 824, height: 1024, alt: 'A seller browsing handloom kurtas on a clothing rack' },
  workshop: { src: '/assets/home/audience-workshop.webp', width: 824, height: 1024, alt: 'Students learning pottery and shaping clay at a workshop table' },
  sessions: { src: '/assets/home/audience-sessions.webp', width: 824, height: 1024, alt: 'A calm consultation room with armchairs and a laptop open for a session' },
  // Images 6, 7: two of the three steps
  add: { src: '/assets/home/step-add.webp', width: 1024, height: 1024, alt: 'A person taking a photo of a handmade bowl with a phone' },
  share: { src: '/assets/home/step-share.webp', width: 1024, height: 1024, alt: 'A seller sharing their shop link in their Instagram bio' },
  // Image 8: a phone showing a shop page (Stoora's own illustration of the shop on a phone)
  phone: { src: '/assets/home/steady-phone.webp', width: 1024, height: 571, alt: 'A customer browsing a Stoora shop on a mobile phone on a packing desk' },
  // Image 9: the calm end-of-day banner: a seller smiling at her phone, parcels packed on the table
  last: { src: '/assets/home/banner-end-of-day.webp', width: 1400, height: 593, alt: 'A woman smiling at her phone at a wooden table, with packed parcels, tape and a laptop around her in warm evening light' },
};

/** A tiny copy of each picture is the soft fill behind it, so a picture is always shown whole and never cropped. */
const tinyOf = (src: string) => src.replace(/-(720|1400)\.webp$/, '-tiny.webp').replace(/(?<!-tiny)\.webp$/, '-tiny.webp');

const delay = (d: number) => ({ '--d': d }) as CSSProperties;

function Photo({ slot, shape, art, priority = false }: { slot: PhotoSlot; shape: 'portrait' | 'wide' | 'square' | 'banner'; art: string; priority?: boolean }) {
  return (
    <div className={`lp-photo ${shape}`} style={slot ? ({ ['--photo' as string]: `url(${tinyOf(slot.src)})` } as CSSProperties) : undefined}>
      {slot ? (
        // already small WebP files, so they are served as they are (no extra resizing step on the way)
        <Image src={slot.src} width={slot.width} height={slot.height} alt={slot.alt} priority={priority} loading={priority ? undefined : 'lazy'} sizes="(min-width: 760px) 520px, 90vw" unoptimized />
      ) : (
        // Placeholder drawing until the licensed photo is added. It is decoration only: no name, quote or caption.
        <div className="lp-art" aria-hidden="true"><i className="a" /><i className="b" /><Ic n={art} /></div>
      )}
    </div>
  );
}

function StartButton({ className = '' }: { className?: string }) {
  return <Link className={`btn primary ${className}`.trim()} href="/shop/start">Start for Free</Link>;
}

/** The headline, with the words rising in one by one. */
function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(' ').map((w, i) => (
        <span className="lp-w" style={{ '--i': i } as CSSProperties} key={i}>{w}</span>
      ))}
    </>
  );
}

/** Section 1 */
export function Top() {
  return (
    <section className="lp-top" aria-labelledby="lp-top-h">
      <div className="wrap lp-top-grid">
        <div className="lp-top-text">
          <h1 id="lp-top-h"><Words text="Your business, open in 10 minutes." /></h1>
          <p className="lede">Tell Stoora what you sell. Your AI co-founder builds the shop and helps run it.</p>
          <StartButton />
        </div>
        <Photo art="inventory_2" slot={PHOTOS.top} shape="portrait" priority />
      </div>
    </section>
  );
}

/** Section 2 */
export function Product() {
  return (
    <section className="sec" id="l-about" aria-labelledby="lp-prod-h">
      <div className="wrap">
        <div className="lp-frame center">
          <h2 className="l-h2 rv" id="lp-prod-h">This is what your shop looks like.</h2>
          <div className="lp-phone-wrap rv">
            <div className="lp-float"><div className="lp-phone"><ScreenShop /></div></div>
            <span className="lp-paid"><Ic n="check_circle" c="xs" />Paid · ₹1,849 by UPI</span>
          </div>
          <div className="lp-grid three stack-phone">
            {([['One link', 'stoora.in/yourname. Share it anywhere.'], ['Pay by UPI', 'Buyers pay at your link.'], ['One list of orders', 'Every order, in one place.']] as const).map(([t, d], i) => (
              <div className="lp-item rv" style={delay(i)} key={t}><h3>{t}</h3><p>{d}</p></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const COFOUNDER: { screen: ReactNode; title: string; text: string }[] = [
  { screen: <ScreenBuilt />, title: 'Builds your shop', text: 'From what you tell it. Words, photos and prices set up for you.' },
  { screen: <ScreenProduct />, title: 'Writes your product pages', text: 'Names and descriptions in plain words. You can change any of them.' },
  { screen: <ScreenUpi />, title: 'Gets you paid', text: 'UPI payment ready from day one.' },
  { screen: <ScreenChat />, title: 'Replies to your buyers', text: 'It drafts the answer. You tap to send.' },
  { screen: <ScreenOrders />, title: 'Keeps your orders in order', text: 'Every order from WhatsApp, Instagram and your link, in one list.' },
  { screen: <ScreenWeek />, title: 'Tells you how the week went', text: 'Two plain lines and one idea. No reports.' },
];

/** Section 3 */
export function CoFounder() {
  return (
    <section className="sec" id="l-features" aria-labelledby="lp-co-h">
      <div className="wrap">
        <div className="lp-frame">
          <div className="lp-two">
            <div className="lp-stack">
              <h2 className="l-h2 rv" id="lp-co-h">It builds your shop. Then it helps run it.</h2>
              <p className="lede rv" style={delay(1)}>Your AI co-founder does the work. You look, and you say yes.</p>
            </div>
            <Photo art="chat" slot={PHOTOS.chat} shape="wide" />
          </div>
          {/* on a phone these six cards also move by themselves, one after another (AutoSwipe); on a laptop they are a plain grid */}
          <AutoSwipe className="lp-grid three swipe" label="What your AI co-founder does">
            {COFOUNDER.map((c, i) => (
              <div className="lp-item rv" style={delay(i)} key={c.title}>
                {c.screen}
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </div>
            ))}
          </AutoSwipe>
        </div>
      </div>
    </section>
  );
}

const AUDIENCE: { art: string; slot: PhotoSlot; title: string; text: string }[] = [
  { art: 'checkroom', slot: PHOTOS.sell, title: 'You sell things', text: 'Clothes, crafts, home bakes, anything you can ship. Your own shop, and every order in one list.' },
  { art: 'groups', slot: PHOTOS.workshop, title: 'You run workshops and classes', text: 'Set the date, take bookings and get paid before anyone arrives.' },
  { art: 'self_improvement', slot: PHOTOS.sessions, title: 'You take one-on-one sessions', text: 'Therapists, psychologists, tutors and coaches. People pick a time and pay to book.' },
];

/** Section 4 */
export function Audience() {
  return (
    <section className="sec" id="l-for" aria-labelledby="lp-aud-h">
      <div className="wrap">
        <div className="lp-frame">
          <h2 className="l-h3 rv" id="lp-aud-h">For solo entrepreneurs and independent artists who want to grow.</h2>
          {/* on a phone the cards also move by themselves, one after another (AutoSwipe); on a laptop they are a plain grid */}
          <AutoSwipe className="lp-grid three swipe" label="Who Stoora is for">
            {AUDIENCE.map((a, i) => (
              <div className="lp-item rv" style={delay(i)} key={a.title}>
                <Photo art={a.art} slot={a.slot} shape="portrait" />
                <h3>{a.title}</h3>
                <p>{a.text}</p>
              </div>
            ))}
          </AutoSwipe>
        </div>
      </div>
    </section>
  );
}

/** Section 5. The steps are separate cards, with no bar or line between them. */
export function Steps() {
  const steps: { visual: ReactNode; title: string; text: string }[] = [
    { visual: <ScreenSignup />, title: 'Sign up', text: 'Pick your shop name and link.' },
    { visual: <Photo art="photo_camera" slot={PHOTOS.add} shape="square" />, title: 'Add what you sell', text: 'A photo, a name and a price. That is all it needs.' },
    { visual: <Photo art="link" slot={PHOTOS.share} shape="square" />, title: 'Share your link', text: 'Put it in your bio and your status. Orders come in.' },
  ];
  return (
    <section className="sec" id="l-how" aria-labelledby="lp-steps-h">
      <div className="wrap">
        <div className="lp-frame center">
          <h2 className="l-h3 rv" id="lp-steps-h">Three steps. Ten minutes.</h2>
          <ol className="lp-grid three stack-phone lp-steps">
            {steps.map((s, i) => (
              <li className="lp-item rv" style={delay(i)} key={s.title}>
                {s.visual}
                <span className="lp-step-n">Step {i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="rv" style={delay(3)}><StartButton /></div>
        </div>
      </div>
    </section>
  );
}

/** Section 6. Real sellers only: fill STORIES with a photo, name, what they sell, city and one real result, each with their written yes. */
const STORIES: { photo: PhotoSlot; name: string; sells: string; city: string; result: string }[] = [];

export function Stories() {
  if (!SHOW_STORIES || STORIES.length === 0) return null;
  return (
    <section className="sec" aria-labelledby="lp-story-h">
      <div className="wrap">
        <div className="lp-frame">
          <h2 className="l-h3 rv" id="lp-story-h">Sellers who opened a shop on Stoora.</h2>
          <div className="lp-grid three swipe">
            {STORIES.map((s, i) => (
              <div className="lp-item rv" style={delay(i)} key={s.name}>
                <Photo art="storefront" slot={s.photo} shape="wide" />
                <h3>{s.name}, {s.sells}</h3>
                <p>{s.city}. {s.result}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Section 7 */
export function Steady() {
  return (
    <section className="sec" aria-labelledby="lp-steady-h">
      <div className="wrap">
        <div className="lp-frame">
          <div className="lp-two">
            <div className="lp-stack">
              <h2 className="l-h2 rv" id="lp-steady-h">Steady on busy days. Fast on any phone.</h2>
              <p className="lede rv" style={delay(1)}>Your shop stays up when many buyers arrive at once.</p>
              <p className="lede rv" style={delay(2)}>It loads quickly on a cheap phone and a slow network.</p>
            </div>
            <Photo art="wifi" slot={PHOTOS.phone} shape="wide" />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Section 8. Goes to the separate Plans page. */
export function Plans() {
  return (
    <section className="sec" aria-labelledby="lp-plans-h">
      <div className="wrap">
        <div className="lp-frame center">
          <h2 className="l-h3 rv" id="lp-plans-h">Free for 10 days. Then pick the plan that fits.</h2>
          <div className="rv" style={delay(1)}>
            <Link className="btn line lp-plans-btn" href="/plans">See plans<span className="arr" aria-hidden="true"><Ic n="arrow_forward" c="sm" /></span></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Section 9 */
export function Last() {
  return (
    <section className="sec" aria-labelledby="lp-last-h">
      <div className="wrap">
        <div className="lp-frame center">
          <Photo art="storefront" slot={PHOTOS.last} shape="banner" />
          <h2 className="l-h2 rv" id="lp-last-h">Your business, open in 10 minutes.</h2>
          <div className="rv" style={delay(1)}><StartButton /></div>
        </div>
      </div>
    </section>
  );
}
