'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Bdg, Ic, rs, titleCase } from '../bits';
import { useReducedMotion } from '../hooks';
import { useClaim } from './LandingContext';

const STEPS: [string, string][] = [
  ['Sign up with Google or email', 'Pick a shop name and link. Your shop is live at stoora.in/yourname from day one, and a short setup list tells you what to do next.'],
  ['Add what you sell', 'A product needs a photo, a name and a price. A class or 1-on-1 session also needs days and times. Everything else can wait.'],
  ['Choose a look, turn on payments', 'Pick how the top of your shop looks. Turn on UPI so buyers can pay you at your link.'],
  ['Share your link', 'Put it in your Instagram bio and your WhatsApp status. When orders come in, they land in one list.'],
];
const STEP_LABELS = ['Sign up', 'Add what you sell', 'Choose a look', 'Share your link'];
const PRODUCTS: [string, string, number][] = [
  ['checkroom', 'Cotton kurta', 1499],
  ['apparel', 'Indigo kurta set', 2899],
  ['dry_cleaning', 'Silk dupatta', 2299],
  ['self_improvement', 'Morning yoga', 499],
];

/** A phone that builds a storefront as the four steps go by. */
function StepPhone({ step }: { step: number }) {
  const { handle } = useClaim();
  const link = handle || 'meera';
  const name = handle ? titleCase(handle) : 'Meera Studio';
  return (
    <div className="dev" aria-hidden="true">
      <div className="scr">
        <span className="notch" />
        <div className="sf" id="sf">
          <div className={`shd${step >= 2 ? ' warm' : ''}`} id="sf-hd">
            <span className="shop-av">{name[0].toUpperCase()}</span>
            <b>{name}</b>
            <small>Hand block prints and yoga</small>
            <span className="url">stoora.in/{link}</span>
          </div>
          <div className={`ghost${step >= 1 ? ' gone' : ''}`}><Ic n="add" c="xs" /><br />Add your first product</div>
          <div className={`gp${step < 1 ? ' empty' : ''}`}>
            {PRODUCTS.map(([icon, label, price], i) => (
              <div key={label} style={{ transitionDelay: `${i * 80}ms` }}><span className="ph2"><Ic n={icon} c="sm" /></span><span>{label}</span><b className="num">{rs(price)}</b></div>
            ))}
          </div>
          <div className={`pay${step < 2 ? ' hide-o' : ''}`}><Ic n="currency_rupee" c="xs" />Pay by UPI</div>
          <div className={`bio${step < 3 ? ' hide-o' : ''}`}><b>@{link}</b><span>Hand block prints · Jaipur</span><a>stoora.in/{link}</a></div>
        </div>
      </div>
    </div>
  );
}

const TUESDAY: { time: string; title: string; text: string; visual: ReactNode }[] = [
  { time: '7:30 am', title: 'Your morning message', text: 'Up to three ideas, each showing what it could earn and what it costs.', visual: <><Bdg k="ok" i="trending_up">Could earn ₹8,600</Bdg><Bdg k="neutral" i="money_off">Costs nothing</Bdg></> },
  { time: '10:31 am', title: 'A buyer asks on Instagram', text: 'Stoora sorts the chat as ready to buy and drafts a reply.', visual: <><span>“Is the indigo set there in size M?”</span><Bdg k="ok" i="shopping_bag">Ready to buy</Bdg></> },
  { time: '10:33 am', title: 'You check, and send', text: 'Change the words if you like. Nothing goes out until you tap.', visual: <><span>“Yes — only 3 left in M. ₹2,899.”</span><span className="row" style={{ gap: 6 }}><Ic n="send" c="xs" />Sent with a UPI link</span></> },
  { time: '10:42 am', title: 'Paid by UPI', text: 'The order lands in your list, marked paid, with where it came from.', visual: <span className="row"><b className="t-ink grow">#1013 · ₹2,899</b><Bdg k="ok" i="check_circle">Paid</Bdg></span> },
  { time: '4:00 pm', title: 'Ship it', text: 'Add the courier and the tracking number to the order.', visual: <span className="row"><span className="grow">Delhivery · DL4482190</span><Bdg k="neutral" i="done_all">Shipped</Bdg></span> },
  { time: 'Payout day', title: 'Money to your bank', text: 'Your Money page shows what came in, what’s pending and the next payout.', visual: <span className="row"><span className="grow">Next payout</span><b className="t-ink num">₹8,120</b></span> },
];

/**
 * "A Tuesday with Stoora". Wide screens: the section pins and vertical scrolling moves the cards sideways; it is exactly
 * (pinned height + sideways distance) tall, so the pin lets go on the last card. Narrow screens and reduced motion: a plain
 * vertical timeline. Nothing listens to the wheel.
 */
function Day() {
  const reduced = useReducedMotion();
  const dayRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const distance = useRef(0);

  const layout = useCallback(() => {
    const day = dayRef.current, pin = pinRef.current, view = viewRef.current, track = trackRef.current;
    if (!day || !pin || !view || !track) return;
    const pinned = window.innerWidth >= 980 && !reduced;
    day.classList.toggle('pinned', pinned);
    if (!pinned) {
      day.style.height = '';
      track.style.transform = '';
      pin.style.top = '';
      distance.current = 0;
      track.querySelectorAll<HTMLElement>('.dcard').forEach((card) => { card.style.opacity = ''; card.classList.remove('now'); });
      return;
    }
    const style = getComputedStyle(view);
    const inner = view.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    distance.current = Math.max(0, track.scrollWidth - inner);
    pin.style.top = `${Math.max(88, (window.innerHeight - pin.offsetHeight) / 2)}px`;
    day.style.height = `${pin.offsetHeight + distance.current}px`;
  }, [reduced]);

  const scroll = useCallback(() => {
    const day = dayRef.current, pin = pinRef.current, view = viewRef.current, track = trackRef.current;
    if (!day || !pin || !view || !track || !distance.current) return;
    const top = parseFloat(getComputedStyle(pin).top) || 0;
    const p = Math.min(1, Math.max(0, (top - day.getBoundingClientRect().top) / distance.current));
    track.style.transform = `translate3d(${(-p * distance.current).toFixed(1)}px,0,0)`;
    day.style.setProperty('--p', p.toFixed(4));
    const width = view.clientWidth;
    const lineX = p * track.scrollWidth;
    track.querySelectorAll<HTMLElement>('.dcard').forEach((card) => {
      const x = card.offsetLeft - p * distance.current;
      const seen = 1 - Math.min(1, Math.max(0, (x - width * 0.78) / (width * 0.3)));
      card.style.opacity = (0.4 + 0.6 * seen).toFixed(3);
      card.classList.toggle('now', card.offsetLeft + 20 <= lineX);
    });
  }, []);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; scroll(); }); };
    const onResize = () => { layout(); scroll(); };
    layout();
    scroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    document.fonts?.ready.then(onResize);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize); cancelAnimationFrame(frame); };
  }, [layout, scroll]);

  return (
    <div className="day" id="day" ref={dayRef} style={{ marginTop: 'var(--s7)' }}>
      <div className="day-pin" id="daypin" ref={pinRef}>
        <div className="sec-open rv" style={{ marginBottom: 'var(--s4)' }}>
          <h3 className="l-h3">A Tuesday with Stoora</h3>
          <p className="cap">The times are an example. The new dashboard is in early access.<span className="day-hint"> Keep scrolling to follow the day.</span></p>
        </div>
        <div className="day-view" id="dayview" ref={viewRef}>
          <div className="day-track" id="daytrack" ref={trackRef}>
            <div className="day-line" aria-hidden="true"><i /></div>
            {TUESDAY.map((card) => (
              <article className="dcard" key={card.title}>
                <time>{card.time}</time>
                <h3>{card.title}</h3>
                <p className="cap">{card.text}</p>
                <div className="vis">{card.visual}</div>
              </article>
            ))}
          </div>
        </div>
        <div className="day-prog" aria-hidden="true"><i /></div>
      </div>
    </div>
  );
}

export function How() {
  const reduced = useReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const current = useRef(0);

  // The step follows scroll position with a 12% hysteresis band, so a small scroll back never flips it.
  // Step text dims continuously with its distance from the reading line instead of jumping.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>('.step-i') ?? []);
      if (!items.length) return;
      const vh = window.innerHeight;
      const wide = window.innerWidth >= 980;
      const top0 = wide ? 0 : phoneRef.current?.getBoundingClientRect().bottom ?? 0;
      const line = top0 + (vh - top0) * (wide ? 0.5 : 0.4);
      const tops = items.map((item) => item.getBoundingClientRect().top);
      let n = current.current;
      while (n < 3 && tops[n + 1] < line - vh * 0.04) n++;
      while (n > 0 && tops[n] > line + vh * 0.08) n--;
      if (n !== current.current) { current.current = n; setStep(n); }
      items.forEach((item) => {
        if (wide && !reduced) {
          const box = item.getBoundingClientRect();
          const away = Math.abs((box.top + box.bottom) / 2 - vh * 0.5) / (vh * 0.6);
          item.style.opacity = (1 - Math.min(1, away) * 0.5).toFixed(3);
        } else item.style.opacity = '';
      });
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(frame); };
  }, [reduced]);

  const jump = (index: number) => {
    current.current = index;
    setStep(index);
    const target = listRef.current?.querySelectorAll('.step-i')[index];
    target?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  };

  return (
    <section className="sec" id="l-how" aria-labelledby="how-h">
      <div className="wrap">
        <div className="sec-open rv">
          <span className="eyebrow">How it works</span>
          <h2 className="l-h2" id="how-h">Open your shop in four steps.</h2>
          <p className="lede">Your shop page is made from what you sell. Pick a look, share one link.</p>
        </div>
        <div className="steps">
          <div className="step-list" ref={listRef}>
            {STEPS.map(([title, text], i) => (
              <div key={title} className={`step-i${i === step ? ' on' : ''}`} data-step={i}>
                <span className="no" aria-hidden="true">0{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
          <div className="ph" ref={phoneRef}>
            <StepPhone step={step} />
            <div className="stepper">
              <span className="label">{STEP_LABELS[step]}</span>
              <div className="bts" role="group" aria-label="Steps">
                {[1, 2, 3, 4].map((n, i) => (
                  <button key={n} type="button" className={i === step ? 'on' : ''} aria-pressed={i === step} aria-label={`Step ${n}`} onClick={() => jump(i)}>{n}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Day />
      </div>
    </section>
  );
}
