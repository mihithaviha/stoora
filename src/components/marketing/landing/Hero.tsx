'use client';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { AppIcon, Av, Bdg, Ic, Src } from '../bits';
import { useOnScreen, usePageVisible, useReducedMotion } from '../hooks';
import { ShopFront } from '../ShopFront';
import { ClaimForm } from './ClaimForm';
import { useClaim } from './LandingContext';

const SCENES = ['A buyer asks', 'Reply drafted', 'Paid by UPI', 'Money in'];
const SLIDE_MS = 2000;
const delay = (d: number) => ({ '--d': d }) as CSSProperties;

function WaHead({ name, sub, who }: { name: string; sub: string; who?: string }) {
  return (
    <div className="wa-h">
      <span className="wa-b"><Ic n="arrow_back" c="sm" /></span>
      {who ? <Av name={who} /> : <span className="smark" style={{ width: 30, height: 30, fontSize: 13 }}>S</span>}
      <div className="wa-n"><b>{name}</b><small>{sub}</small></div>
      <span className="wa-i"><Ic n="call" c="sm" /><Ic n="more_vert" c="sm" /></span>
    </div>
  );
}

function WaInput() {
  return <div className="wa-in"><span className="wa-f"><Ic n="add" c="sm" /></span><span className="wa-t">Message</span><span className="wa-f"><Ic n="mic" c="sm" /></span></div>;
}

function WaMsg({ time, me, children }: { time: string; me?: boolean; children: ReactNode }) {
  return <div className={`wa-m ${me ? 'me' : 'them'}`}>{children}<span className="tm">{time}{me ? <Ic n="done_all" c="xs" /> : null}</span></div>;
}

/** A phone showing a WhatsApp chat, in four slides that follow one sale from question to money. */
function HeroPhone({ scene, previous }: { scene: number; previous: number }) {
  const cls = (i: number) => `scene wa${i === scene ? ' on' : ''}${i === previous && i !== scene ? ' out' : ''}`;
  return (
    <div className="dev" aria-hidden="true">
      <div className="scr">
        <span className="notch" />
        <div className="stat"><b>10:42</b><span><Ic n="signal_cellular_alt" c="xs" /><Ic n="wifi" c="xs" /><Ic n="battery_full" c="xs" /></span></div>
        <div className={cls(0)}>
          <WaHead name="Priya Sharma" sub="online" who="Priya Sharma" />
          <div className="wa-b2">
            <span className="wa-day">Today</span>
            <WaMsg time="10:41">Hi di, indigo kurta set M size mein hai kya?</WaMsg>
            <WaMsg time="10:41">Pune delivery ho jayegi?</WaMsg>
            <div className="wa-tag"><Src s="Instagram" /><Bdg k="ok" i="shopping_bag">Ready to buy</Bdg></div>
          </div>
          <WaInput />
        </div>
        <div className={cls(1)}>
          <WaHead name="Priya Sharma" sub="online" who="Priya Sharma" />
          <div className="wa-b2">
            <WaMsg time="10:41">Hi di, indigo kurta set M size mein hai kya? Pune delivery ho jayegi?</WaMsg>
            <div className="wa-draft">
              <span className="dh"><span className="smark xs" style={{ width: 16, height: 16, fontSize: 9 }}>S</span>Stoora drafted a reply</span>
              Yes, M is in stock (3 left). ₹2,899, delivery to Pune in 3–4 days. Shall I send a UPI link?
              <span className="sbtn"><Ic n="send" c="xs" />Send</span>
            </div>
          </div>
          <WaInput />
        </div>
        <div className={cls(2)}>
          <WaHead name="Priya Sharma" sub="online" who="Priya Sharma" />
          <div className="wa-b2">
            <WaMsg time="10:43" me>Shall I send a UPI link?</WaMsg>
            <WaMsg time="10:44">Haan please, send kar do</WaMsg>
            <WaMsg time="10:45">Paid ✔ ₹2,899</WaMsg>
            <div className="wa-card"><Ic n="check_circle" c="sm" /><div><b>#1013 · ₹2,899 paid by UPI</b><small>Indigo kurta set · M · Pune</small></div></div>
          </div>
          <WaInput />
        </div>
        <div className={cls(3)}>
          <WaHead name="Stoora" sub="Money" />
          <div className="wa-b2">
            <div className="mini"><span>Received today</span><span className="bignum">₹4,398</span><span style={{ color: 'var(--positive-deep)' }}>+₹2,899 from Priya, by UPI</span></div>
            <div className="mini"><span>Next payout</span><b>₹8,120 to your bank · Tue</b></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero({ onSeeHow }: { onSeeHow: () => void }) {
  const reduced = useReducedMotion();
  const pageVisible = usePageVisible();
  const heroRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stageVisible = useOnScreen(stageRef, 0.25);
  const { handle } = useClaim();

  const [scene, setScene] = useState(0);
  const [previous, setPrevious] = useState(-1);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const paused = reduced || !stageVisible || !pageVisible || hover || focus;

  // The slideshow keeps moving. It rests only for people who ask for less motion, while the pointer or keyboard is on it,
  // while it is off screen, or while the tab is hidden.
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => {
      setPrevious(scene);
      setScene((scene + 1) % SCENES.length);
    }, SLIDE_MS);
    return () => clearTimeout(timer);
  }, [scene, paused]);

  // pointer parallax on the painted shop, the phone and the two chips
  const onMove = (event: PointerEvent<HTMLElement>) => {
    const hero = heroRef.current;
    const stage = stageRef.current;
    if (!hero || !stage || reduced || event.pointerType !== 'mouse') return;
    const box = hero.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    stage.querySelectorAll<HTMLElement>('.layer').forEach((layer) => {
      const depth = Number(layer.dataset.depth);
      layer.style.transform = `translate(${(-x * depth).toFixed(1)}px,${(-y * depth).toFixed(1)}px)`;
    });
  };

  return (
    <section className="hero" aria-labelledby="hero-h" ref={heroRef} onPointerMove={onMove}>
      <div className="wrap grid">
        <div>
          <span className="eyebrow ent" style={delay(0)}>For sellers in India on WhatsApp and Instagram</span>
          <h1 id="hero-h">
            <span className="ln"><span className="ent" style={delay(1)}>One link for every order,</span></span>
            <span className="ln"><span className="ent" style={delay(2)}>every chat and</span></span>
            <span className="ln"><span className="ent" style={delay(3)}><em className="em">every rupee.</em></span></span>
          </h1>
          <p className="lede ent" style={delay(4)}>Your own shop at stoora.in/yourname, and one place for every order, chat and UPI payment — wherever it came from.</p>
          <div className="ent" style={delay(5)}><ClaimForm id="claim-hero" /></div>
          <div className="sub ent" style={delay(6)}>
            <button className="btn line sm" type="button" onClick={onSeeHow}>See how it works<Ic n="arrow_downward" c="sm" /></button>
            <span className="admit"><i aria-hidden="true" />The new dashboard is opening to a first group of sellers, a few at a time.</span>
          </div>
        </div>
        <div className="ent" style={delay(3)}>
          <div
            className={`stage${paused ? ' paused' : ''}`}
            id="stage"
            ref={stageRef}
            onPointerEnter={(event) => event.pointerType === 'mouse' && setHover(true)}
            onPointerLeave={() => setHover(false)}
            onFocus={(event) => event.target.matches(':focus-visible') && setFocus(true)}
            onBlur={(event) => !event.currentTarget.contains(event.relatedTarget as Node | null) && setFocus(false)}
          >
            <div className="shop layer paint-in" data-depth="6"><ShopFront boardId="board-hero" handle={handle} /></div>
            <div className="phone layer" data-depth="14"><HeroPhone scene={scene} previous={previous} /></div>
            <div className={`float layer${scene <= 1 ? ' lit' : ''}`} data-depth="22" style={{ left: '44%', top: '56%' }}>
              <span className="chipf drift">
                <span className="ic chat" style={{ background: 'color-mix(in srgb,var(--seg-chat-a) 13%,var(--surface))', color: 'var(--negative-deep)' }}><Ic n="photo_camera" c="xs" /></span>
                Instagram DM, 10:31 am
              </span>
            </div>
            <div className={`float layer${scene >= 2 ? ' lit' : ''}`} data-depth="26" style={{ right: '2%', top: '78%' }}>
              <span className="chipf drift d2">
                <span className="ic" style={{ background: 'var(--positive-tint)', color: 'var(--positive-deep)' }}><Ic n="check_circle" c="xs" /></span>
                Paid ₹2,899 by UPI
              </span>
            </div>
            <span className="cap2">Illustration · sample shop</span>
          </div>
        </div>
      </div>
    </section>
  );
}
