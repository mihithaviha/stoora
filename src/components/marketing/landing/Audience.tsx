'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Bdg, Ic, type BadgeKind } from '../bits';
import { useOnScreen, usePageVisible, useReducedMotion } from '../hooks';

type Audience = {
  accent: string;
  photo: string;
  position: string;
  alt: string;
  title: string;
  sub: string;
  headline: string;
  how: string;
  snippets: [BadgeKind, string, string][];
};

const AUDIENCES: Audience[] = [
  {
    accent: 'shop', photo: 'shop', position: '50% 42%', alt: 'Garments neatly arranged on rails in a bright boutique',
    title: 'Shops that sell things', sub: 'Clothes, crafts, home bakes', headline: 'You make things and ship them.',
    how: 'Every order in one list — paid or not, shipped or not.',
    snippets: [['ok', 'check_circle', 'Paid'], ['warn', 'local_shipping', 'To ship'], ['bad', 'block', 'Sold out']],
  },
  {
    accent: 'pay', photo: 'classes', position: '50% 45%', alt: 'A tutor and a student working together at a wooden table with a laptop',
    title: 'Teachers and creators', sub: 'Classes, sessions, downloads', headline: 'You teach, coach or sell downloads.',
    how: 'Bookings sit next to orders, with who has paid before the class.',
    snippets: [['offer', 'event_upcoming', 'Wed 7:00 am'], ['ok', 'check_circle', 'Paid'], ['warn', 'schedule', 'Unpaid']],
  },
  {
    accent: 'chat', photo: 'chat', position: '50% 48%', alt: 'A shop owner smiling as she reads customer messages on her phone',
    title: 'Sellers who live on chat', sub: 'Most sales happen in DMs', headline: 'Your shop is your inbox.',
    how: 'Buyers ready to pay come first, with a reply drafted for you to check.',
    snippets: [['ok', 'shopping_bag', 'Ready to buy'], ['bad', 'sentiment_dissatisfied', 'Upset'], ['neutral', 'visibility', 'Just looking']],
  },
];

const AUTO_MS = 5200;
const k = (n: number) => ({ '--k': n }) as CSSProperties;

function Body({ item, enter, leave }: { item: Audience; enter: boolean; leave: boolean }) {
  return (
    <div className={`aud-body aud-photo${enter ? ' enter2' : ''}${leave ? ' leave' : ''}`}>
      <figure className="aphoto" style={k(1)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/assets/home/${item.photo}.jpg`} style={{ objectPosition: item.position }} alt={item.alt} width={1200} height={800} loading="lazy" decoding="async" />
        <figcaption>Illustrative photo</figcaption>
      </figure>
      <div className="atext">
        <span className="ey" style={k(2)}>{item.title}</span>
        <h3 className="l-h3" style={k(3)}>{item.headline}</h3>
        <p className="t-soft" style={k(4)}>{item.how}</p>
        <div className="aud-snip" style={k(5)}>{item.snippets.map(([kind, icon, text]) => <Bdg key={text} k={kind} i={icon}>{text}</Bdg>)}</div>
      </div>
    </div>
  );
}

/**
 * "Who it's for": three seller types. It turns to the next one every few seconds, rests while the pointer or keyboard is on it,
 * and stops for good once anyone presses, taps or types in it (they are looking closely).
 */
export function Audience() {
  const reduced = useReducedMotion();
  const pageVisible = usePageVisible();
  const boxRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const indRef = useRef<HTMLSpanElement>(null);
  const visible = useOnScreen(boxRef, 0.4);
  const [selected, setSelected] = useState(0); // the tab that is on
  const [shown, setShown] = useState(0); // the panel that is displayed (follows after a short fade)
  const [phase, setPhase] = useState<'idle' | 'leave' | 'enter'>('idle');
  const [stopped, setStopped] = useState(false);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const fade = useRef(0);

  const moveIndicator = useCallback(() => {
    const on = tabRefs.current[selected];
    const ind = indRef.current;
    if (!on || !ind) return;
    ind.style.transform = `translate(${on.offsetLeft}px,${on.offsetTop}px)`;
    ind.style.width = `${on.offsetWidth}px`;
    ind.style.height = `${on.offsetHeight}px`;
    ind.style.opacity = '1';
  }, [selected]);

  useEffect(() => {
    moveIndicator();
    window.addEventListener('resize', moveIndicator);
    document.fonts?.ready.then(moveIndicator);
    return () => window.removeEventListener('resize', moveIndicator);
  }, [moveIndicator]);

  const select = useCallback((index: number, focusTab = false) => {
    setSelected(index);
    if (focusTab) tabRefs.current[index]?.focus();
    clearTimeout(fade.current);
    if (reduced) { setShown(index); setPhase('idle'); return; }
    setPhase('leave');
    fade.current = window.setTimeout(() => { setShown(index); setPhase('enter'); }, 140);
  }, [reduced]);

  useEffect(() => () => clearTimeout(fade.current), []);

  const resting = stopped || hover || focus || !visible || reduced || !pageVisible;
  useEffect(() => {
    if (resting) return;
    const timer = setTimeout(() => select((selected + 1) % AUDIENCES.length), AUTO_MS);
    return () => clearTimeout(timer);
  }, [resting, selected, select]);

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!/^(Arrow(Left|Right|Up|Down)|Home|End)$/.test(event.key)) return;
    event.preventDefault();
    const n = AUDIENCES.length;
    select(event.key === 'Home' ? 0 : event.key === 'End' ? n - 1 : (index + (/Right|Down/.test(event.key) ? 1 : -1) + n) % n, true);
  };

  const item = AUDIENCES[shown];
  return (
    <section className="sec" id="l-for" aria-labelledby="for-h">
      <div className="wrap">
        <div className="sec-open rv">
          <span className="eyebrow">Who it’s for</span>
          <h2 className="l-h2" id="for-h">Made for people who sell from their phone.</h2>
          <p className="aud-hint"><Ic n="touch_app" c="sm" />Choose your selling style to see how Stoora fits.</p>
        </div>
        <div
          className="aud rv"
          ref={boxRef}
          onPointerDown={(event) => { if (!(event.target as Element).closest('#aud-pp')) setStopped(true); }}
          onKeyDown={(event) => { if (/^(Arrow|Home|End|Enter| )/.test(event.key) && !(event.target as Element).closest('#aud-pp')) setStopped(true); }}
          onPointerEnter={() => setHover(true)}
          onPointerLeave={() => setHover(false)}
          onFocus={(event) => { if (event.target.matches(':focus-visible')) setFocus(true); }}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocus(false); }}
        >
          <div className="aud-tabs" role="tablist" aria-label="Kinds of sellers" aria-orientation="vertical">
            <span className="aud-ind" ref={indRef} aria-hidden="true" />
            {AUDIENCES.map((a, i) => (
              <button
                key={a.title}
                ref={(el) => { tabRefs.current[i] = el; }}
                className="aud-tab"
                role="tab"
                id={`aud-t${i}`}
                type="button"
                aria-selected={i === selected}
                aria-controls="aud-p"
                tabIndex={i === selected ? 0 : -1}
                data-accent={a.accent}
                onClick={() => select(i)}
                onKeyDown={(event) => onKey(event, i)}
              >
                <span className="sw2" aria-hidden="true" />
                <span className="tt">{a.title}<small>{a.sub}</small></span>
                <span className="go2" aria-hidden="true"><Ic n="arrow_forward" c="sm" /></span>
              </button>
            ))}
          </div>
          <div className="aud-panel" data-accent={item.accent} role="tabpanel" id="aud-p" aria-labelledby={`aud-t${shown}`} tabIndex={0}>
            <Body key={shown} item={item} enter={phase === 'enter'} leave={phase === 'leave'} />
          </div>
        </div>
      </div>
    </section>
  );
}
