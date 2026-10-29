'use client';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { Av, Bdg, Ic, Src, rs } from '../bits';

/** A scaled-down picture of a real dashboard screen, with a sample shop. It is for looking at, not for using. */
function Frame({ crumb, children }: { crumb: string; children: ReactNode }) {
  const viewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fit = () => {
      const view = viewRef.current;
      const inner = view?.firstElementChild as HTMLElement | null;
      if (!view || !inner) return;
      const scale = Math.min(1, view.clientWidth / 900);
      inner.style.transform = `scale(${scale})`;
      view.style.height = `${Math.min(inner.offsetHeight * scale, window.innerWidth < 760 ? 380 : 560)}px`;
    };
    fit();
    window.addEventListener('resize', fit);
    document.fonts?.ready.then(fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div className="frame rv">
      <div className="bar2">
        <span className="appicon" style={{ width: 22, height: 22, fontSize: 12, borderRadius: 7 }}>S</span>
        <span className="wordmark">stoora<i>.in</i></span><span>›</span><span>{crumb}</span>
      </div>
      <div className="vp" ref={viewRef}><div className="in2 force-wide" inert aria-hidden="true">{children}</div></div>
      <span className="note">Sample shop</span>
    </div>
  );
}

const ORDERS = [
  { id: 1012, when: 'Today, 10:42 am', who: 'Priya Sharma', src: 'WhatsApp', total: 3798, paid: true, shipped: false, items: 2 },
  { id: 1011, when: 'Yesterday, 6:15 pm', who: 'Rahul Verma', src: 'Instagram', total: 1499, paid: false, shipped: false, items: 1 },
  { id: 1010, when: '25 Oct, 2:05 pm', who: 'Anjali Rao', src: 'Shop link', total: 2899, paid: true, shipped: true, items: 1 },
  { id: 1009, when: '22 Oct, 11:30 am', who: 'Walk-in buyer', src: 'In person', total: 699, paid: true, shipped: true, items: 1 },
];

function OrdersPreview() {
  return (
    <div className="stack">
      <section className="card" aria-label="This week">
        <div className="tiles four">
          {[['Orders', '4'], ['Items ordered', '5'], ['Sales', '₹8,895'], ['Shipped', '2']].map(([k, v]) => (
            <div className="tile" key={k}><span className="k">{k}</span><span className="v big">{v}</span><span className="d">This week</span></div>
          ))}
        </div>
      </section>
      <section className="card stack tight" aria-label="Filter orders">
        <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--s2)' }}>
          <div className="seg inline"><button className="on" tabIndex={-1}>Orders</button><button tabIndex={-1}>Bookings</button></div>
          <label className="search" style={{ flex: '1 1 220px' }}><Ic n="search" c="sm" /><input placeholder="Search by name or order number" tabIndex={-1} readOnly /></label>
        </div>
        <div className="chips">
          {[['All', 4, true], ['To ship', 2, false], ['Unpaid', 1, false], ['Done', 2, false]].map(([name, n, on]) => (
            <button key={String(name)} className={`chip${on ? ' on' : ''}`} tabIndex={-1}>{name}<span className="n">{n}</span></button>
          ))}
        </div>
      </section>
      <div className="tbl-wrap only-wide">
        <table className="tbl">
          <thead><tr><th>Order</th><th>Date</th><th>Buyer</th><th>Came from</th><th className="r">Total</th><th>Payment</th><th>Shipping</th><th>Items</th></tr></thead>
          <tbody>
            {ORDERS.map((o) => (
              <tr key={o.id}>
                <td><b>#{o.id}</b></td><td>{o.when}</td><td>{o.who}</td><td><Src s={o.src} /></td>
                <td className="r"><b className="num">{rs(o.total)}</b></td>
                <td>{o.paid ? <Bdg k="ok" i="check_circle">Paid</Bdg> : <Bdg k="warn" i="schedule">Unpaid</Bdg>}</td>
                <td>{o.shipped ? <Bdg k="neutral" i="done_all">Shipped</Bdg> : <Bdg k="warn" i="local_shipping">To ship</Bdg>}</td>
                <td>{o.items} {o.items === 1 ? 'item' : 'items'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChatsPreview() {
  return (
    <>
      <div className="banner info" style={{ marginBottom: 'var(--s3)', alignItems: 'center' }}>
        <span className="smark xs">S</span>
        <span><b className="t-ink">2 buyers are ready to buy.</b> Replies are drafted. Check them and send.</span>
      </div>
      <div className="card flush" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="row" style={{ padding: 'var(--s3)', borderBottom: '1px solid var(--line-soft)' }}>
          <Av name="Priya Sharma" />
          <div className="grow">
            <div className="t-ink" style={{ fontWeight: 500 }}>Priya Sharma</div>
            <div className="row" style={{ gap: 'var(--s1)', flexWrap: 'wrap', marginTop: 2 }}><Src s="WhatsApp" /><Bdg k="ok" i="shopping_bag">Ready to buy</Bdg></div>
          </div>
          <a className="btn line sm"><Ic n="person" />Buyer</a>
        </div>
        <div className="thread" style={{ flex: 1 }}>
          <div className="bubble them">Hi, loved the kurta I got last week<small>10:38 am</small></div>
          <div className="bubble them">Is the indigo set there in size M?<small>10:41 am</small></div>
          <div className="draft" style={{ marginTop: 'var(--s2)' }}>
            <div className="who"><span className="smark xs" aria-hidden="true">S</span>Stoora drafted a reply</div>
            <p className="t-soft">Hi Priya, yes — the indigo kurta set is in stock in M, only 3 left. It is ₹2,899. Shall I send you a UPI link to book it?</p>
            <div className="btns"><button className="btn primary sm" tabIndex={-1}><Ic n="send" />Send on WhatsApp</button><button className="btn line sm" tabIndex={-1}><Ic n="edit" />Edit</button><button className="btn quiet sm" tabIndex={-1}>Dismiss</button></div>
          </div>
        </div>
        <div style={{ padding: '0 var(--s3)' }}>
          <div className="chips">
            <button className="chip" tabIndex={-1}><Ic n="currency_rupee" c="xs" />Send UPI link</button>
            <button className="chip" tabIndex={-1}><Ic n="receipt_long" c="xs" />Create order</button>
            <button className="chip" tabIndex={-1}><Ic n="event" c="xs" />Book a slot</button>
          </div>
        </div>
        <div className="composer"><label className="search"><Ic n="chat" c="sm" /><input placeholder="Type a message" tabIndex={-1} readOnly /></label><button className="go" tabIndex={-1} aria-label="Send"><Ic n="arrow_upward" c="sm" /></button></div>
      </div>
    </>
  );
}

const DAYS = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'];
const SALES = [5200, 3100, 6900, 9400, 5900, 6940, 8195];

function AskPreview() {
  const top = Math.ceil(Math.max(...SALES) / 2000) * 2000;
  const total = SALES.reduce((a, b) => a + b, 0);
  return (
    <div className="ans" style={{ maxWidth: 640, marginLeft: 'auto' }}>
      <div className="qbubble">How did I do this week?</div>
      <div className="abox">
        <div className="who"><span className="smark xs">S</span>Stoora</div>
        <p className="t-ink">You made <b className="num">{rs(total)}</b> in the last 7 days, 18% more than the week before.</p>
        <p className="t-soft">Saturday was your best day. Almost half the orders came from WhatsApp.</p>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: 'var(--s2)' }}>
          <div className="chart" role="img" aria-label="Sales by day, last 7 days">
            <div style={{ display: 'flex', gap: 'var(--s2)' }}>
              <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 150, paddingTop: 'var(--s2)', fontSize: 12, color: 'var(--ink-65)', textAlign: 'right', minWidth: 52 }}>
                <span>{rs(top)}</span><span>{rs(top / 2)}</span><span>₹0</span>
              </div>
              <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 'calc(var(--s2) + (150px - var(--s2))/2)', borderTop: '1px dashed var(--line-soft)' }} />
                <div className="bars">
                  {SALES.map((v, n) => (
                    <div className="b" key={DAYS[n]} style={{ '--b': n } as CSSProperties} aria-label={`${DAYS[n]}: ${rs(v)}`}>
                      <span className="tip">{DAYS[n]} · {rs(v)}</span>
                      <i style={{ height: `${(v / top) * 100}%`, opacity: n === SALES.length - 1 ? undefined : 0.55 }} />
                    </div>
                  ))}
                </div>
                <div className="xlab" aria-hidden="true">{DAYS.map((d) => <span key={d}>{d}</span>)}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="inner stack tight">
          <span className="label" style={{ fontSize: 11 }}>One idea</span>
          <p className="t-soft">The indigo kurta set sold fastest and has 3 left. Make 10 more before Friday, when your new prints go up.</p>
          <div className="btns"><button className="btn ink sm" tabIndex={-1}>Remind me Thursday</button></div>
        </div>
      </div>
    </div>
  );
}

const FEATURES: { crumb: string; title: string; text: string; points: string[]; preview: ReactNode }[] = [
  {
    crumb: 'Orders', title: 'Four places, one list of orders',
    text: 'WhatsApp, Instagram, your shop link and in person. Each order shows where it came from, whether it’s paid and whether it’s shipped.',
    points: ['Filter to what needs you: to ship, unpaid, done', 'Mark an order paid or shipped from its page', 'Take an order by hand and send a UPI link'],
    preview: <OrdersPreview />,
  },
  {
    crumb: 'Chats', title: 'Buyers ready to pay, first',
    text: 'Chats from WhatsApp and Instagram in one place, sorted into ready to buy, upset and just looking. Each one has a reply drafted for you to check.',
    points: ['Change any reply before it goes', 'Send a UPI link or start an order from the chat', 'Upset buyers don’t get buried'],
    preview: <ChatsPreview />,
  },
  {
    crumb: 'Ask Stoora', title: 'Ask about your sales in plain words',
    text: 'Ask “How did I do this week?” and get two lines, a small chart and one idea. No reports to read.',
    points: ['Answers come from your own numbers', 'If Stoora doesn’t know, it says so'],
    preview: <AskPreview />,
  },
];

export function Features() {
  return (
    <section className="sec" id="l-features" aria-labelledby="ft-h" style={{ paddingBottom: 'var(--s5)' }}>
      <div className="wrap">
        <div className="sec-open rv">
          <span className="eyebrow">Features</span>
          <h2 className="l-h2" id="ft-h">The dashboard, screen by screen.</h2>
          <p className="lede">Real screens from the new dashboard, with a sample shop.</p>
        </div>
        {FEATURES.map((feature, i) => (
          <div className={`feat${i % 2 ? ' flip' : ''}`} key={feature.crumb}>
            <div className="ftx rv">
              <span className="status live"><Ic n="check_circle" />Ready today</span>
              <h3 className="l-h3">{feature.title}</h3>
              <p className="t-body">{feature.text}</p>
              <ul>{feature.points.map((point) => <li key={point}><Ic n="check" c="sm" />{point}</li>)}</ul>
            </div>
            <div className="frame-wrap"><Frame crumb={feature.crumb}>{feature.preview}</Frame></div>
          </div>
        ))}
      </div>
    </section>
  );
}
