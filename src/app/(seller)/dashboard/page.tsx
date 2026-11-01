'use client';
// Home: the day at a glance, with the setup list on top until a new shop has done its first steps.
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Art, type ArtKey } from '@/components/dash/Art';
import { DI, DateChip, MStrip, Ms, PaidTag } from '@/components/dash/parts';
import { Button, Dialog, Skeleton, useToast } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { firstName, rs } from '@/lib/format';
import { moneyWaiting, useStore } from '@/lib/store';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

const LINK_KEY = 'stoora.setup.linkcopied';
interface Step { art: ArtKey; title: string; text: string; cta: string; href?: string; copy?: boolean; done: boolean }

export default function Home() {
  const { db, ready, mode, dismissedIdeas, dismissIdea } = useStore();
  const auth = useAuth();
  const toast = useToast();
  const sp = useSearchParams();
  const [ideas, setIdeas] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  useEffect(() => { try { setLinkCopied(localStorage.getItem(LINK_KEY) === '1'); } catch { /* ignore */ } }, []);

  if (!ready) return <div className="dpad" style={{ paddingTop: 20 }}><Skeleton rows={1} height={70} /><div style={{ height: 16 }} /><Skeleton rows={3} height={120} /></div>;

  const empty = !db.products.length && !db.services.length && !db.orders.length;
  const link = `stoora.in/${db.shop.handle}`;
  const copyLink = () => navigator.clipboard?.writeText(`https://${link}`).then(() => { toast('Shop link copied.'); setLinkCopied(true); try { localStorage.setItem(LINK_KEY, '1'); } catch { /* ignore */ } }).catch(() => toast(`Your shop link is ${link}`, { icon: 'info' }));
  // what a new shop does first, each with whether it is already done (one list, one count)
  const steps: Step[] = [
    { art: 'product', title: 'Add your first product or service', text: 'Add a photo, a name and a price. Stoora fills the rest.', cta: 'Add product', href: '/products/new', done: db.products.length + db.services.length > 0 },
    { art: 'upi', title: 'Choose how you get paid', text: 'Add your UPI ID so buyers can pay you.', cta: 'Set up', href: '/settings/getting-paid', done: !!db.shop.upi },
    { art: 'look', title: 'Choose your shop look', text: 'Pick colours and a cover photo for your shop page.', cta: 'Choose look', href: '/storefront', done: !!db.shop.storefront },
    { art: 'link', title: 'Share your shop link', text: `${link} — share it anywhere.`, cta: 'Copy link', copy: true, done: linkCopied },
    ...(mode === 'live' && auth.user && auth.user.hasPhone && !auth.user.hasGoogle ? [{ art: 'link' as ArtKey, title: 'Add Google login', text: 'Log in with Google as well as your number. It is the same shop.', cta: 'Add Google', href: '/account', done: false }] : []),
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const setupCards = (list: Step[]) => (
    <div className="grid3">
      {list.filter((s) => !hidden.includes(s.title)).map((s) => (
        <div className="card setup" key={s.title}>
          <div className="art"><Art k={s.art} height={96} />{s.done ? <button className="x" type="button" aria-label={`Hide ${s.title}`} onClick={() => setHidden((h) => [...h, s.title])}><DI n="x" s={14} /></button> : null}</div>
          <div className="body">
            <b>{s.title}</b><span className="muted small">{s.text}</span>
            {s.href
              ? <Link className="btn grey sm" style={{ justifySelf: 'start' }} href={s.href}>{s.done ? 'Done · open' : s.cta}</Link>
              : <button className="btn grey sm" style={{ justifySelf: 'start' }} type="button" onClick={copyLink}>{s.done ? 'Done · copy again' : s.cta}</button>}
          </div>
        </div>
      ))}
    </div>
  );

  if (empty || sp.get('setup') === '1') {
    return (
      <div className="dpad" style={{ paddingTop: 40 }}>
        <h1 className="h1 big">Welcome to Stoora.<br />Let’s set up <u style={{ textDecorationStyle: 'dotted', textUnderlineOffset: 6 }}>{db.shop.name}</u></h1>
        {!db.products.length && !db.services.length ? (
          <div className="banner info" role="status" style={{ marginTop: 20 }}><DI n="store" s={18} /><div>Your shop is live. Add your first product so buyers can see it.<div style={{ marginTop: 10 }}><Link className="btn main sm" href="/products/new">Add product</Link></div></div></div>
        ) : null}
        <div style={{ marginTop: 20 }}>{setupCards(steps)}</div>
        <p className="muted small" style={{ textAlign: 'center', marginTop: 18 }}>○ {doneCount} of {steps.length} done{!empty ? <> · <Link className="link" href="/dashboard">See active shop view</Link></> : null}</p>
      </div>
    );
  }

  const day = db.stats.salesByDay;
  const todayOrders = day[day.length - 1]?.orders ?? 0;
  const bookingsToday = db.bookings.filter((b) => b.day === 'Today').length;
  const waiting = moneyWaiting(db);
  const waitingTotal = waiting.reduce((a, w) => a + w.amount, 0);
  const next = db.bookings.filter((b) => b.status === 'Upcoming');
  const left = db.ideas.filter((i) => !dismissedIdeas.includes(i.id) && !done.includes(i.id));
  const earn = left.reduce((a, i) => a + i.earn, 0);
  const strip = (pick: 'visits' | 'sales' | 'orders') => day.map((d) => d[pick]);

  return (
    <div className="dpad" style={{ paddingTop: 20 }}>
      {!allDone ? (
        <div className="box" style={{ marginBottom: 16 }} aria-label="Setup">
          <div className="box-h"><span className="box-t"><DI n="box" s={16} /> Let’s get your shop ready</span><span className="tiny muted">{doneCount} of {steps.length} done</span></div>
          <div className="dmeter"><i style={{ width: `${Math.round((doneCount / steps.length) * 100)}%` }} /></div>
          <div style={{ marginTop: 14 }}>{setupCards(steps.filter((s) => !s.done))}</div>
        </div>
      ) : null}
      <MStrip lead={<DateChip label="Today" />}
        items={[['Visits', String(db.stats.visitsToday), strip('visits')], ['Sales', rs(db.stats.salesToday), strip('sales')], ['Orders', String(todayOrders), strip('orders')], ['Bookings', String(bookingsToday)]]}
        tail={mode === 'demo' ? <span className="dlive"><i /> 2 on your shop now</span> : undefined} />
      <div className="box dhero">
        <h1 className="h1 big">{greeting()}, {firstName(db.shop.owner) || 'there'}!</h1>
        <p className="muted" style={{ margin: 0 }}>Here’s how {db.shop.name} is doing today.</p>
      </div>

      <div className="grid2" style={{ marginTop: 16 }}>
        <div style={{ display: 'grid', gap: 16 }}>
          {db.ideas.length > 0 ? (
            <div className="box ai">
              <div className="box-h"><span className="box-t" style={{ color: 'var(--ink-soft)' }}><DI n="spark" s={16} /> Your morning message</span><span className="tiny" style={{ color: 'var(--ink-soft)' }}>{left.length} of {db.ideas.length} left</span></div>
              <p style={{ margin: '0 0 12px' }}>{left.length ? <>{left.length} {left.length === 1 ? 'idea' : 'ideas'} ready to approve.{earn ? <> Together they could earn about <b>{rs(earn)}</b> this week.</> : null}</> : 'All done for today. Nice work!'}</p>
              {left.length ? <button className="btn main" type="button" onClick={() => setIdeas(true)}>See today’s ideas</button> : null}
            </div>
          ) : null}
          <div className="box">
            <div className="box-h"><span className="box-t"><DI n="cal" s={16} /> Coming up</span><Link className="link small" href="/orders?tab=bookings">See all ›</Link></div>
            <div className="todo">
              {next.length ? next.map((b) => {
                const s = db.services.find((x) => x.id === b.serviceId);
                return (
                  <Link className="trow" key={b.id} href={`/bookings/${b.id}`}>
                    <span className="ic" style={{ background: 'color-mix(in srgb,var(--positive) 12%,var(--card))', fontSize: 18 }}><Ms n={s?.icon ?? 'event'} /></span>
                    <span className="sp"><b>{s?.name ?? 'Booking'}</b><span className="tiny muted">{b.when} · {b.buyer}</span></span><PaidTag paid={b.paid} />
                  </Link>
                );
              }) : <p className="small muted" style={{ margin: 0 }}>No bookings coming up.</p>}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 16 }}>
          <Link className="box tapbox" href="/money" style={{ textAlign: 'left', width: '100%' }}>
            <div className="box-h"><span className="box-t"><DI n="wallet" s={16} /> Money</span><span className="link small">See all ›</span></div>
            <div className="tiles"><div className="tile static"><div className="k">Received today</div><div className="v">{rs(db.stats.receivedToday)}</div></div><div className="tile static"><div className="k">Pending UPI</div><div className="v">{rs(waitingTotal)}</div></div></div>
            {db.stats.payout.amount ? <div className="small muted" style={{ marginTop: 10 }}>Next payout <b style={{ color: 'var(--ink)' }}>{rs(db.stats.payout.amount)}</b> to {db.stats.payout.to} on {db.stats.payout.date}</div> : null}
          </Link>
        </div>
      </div>

      <Dialog open={ideas} onClose={() => setIdeas(false)} title="Today’s ideas">
        <div className="stack tight">
          {db.ideas.map((i) => (done.includes(i.id) || dismissedIdeas.includes(i.id))
            ? <div className="idea" key={i.id}><div className="row"><span style={{ color: 'var(--positive)' }}><DI n="check" /></span><span className="sp small">{done.includes(i.id) ? i.done : 'Skipped for now.'}</span></div></div>
            : (
              <div className="idea" key={i.id}>
                <div>{i.text}</div>
                <div className="earn"><span className="g">Could earn {rs(i.earn)}</span><span>Costs {rs(i.cost)}</span></div>
                <div className="row" style={{ gap: 8 }}>
                  <Button kind="ink" small className="sp" onClick={() => { setDone((d) => [...d, i.id]); toast(`Done — ${i.done}`, { icon: i.icon }); }}>{i.action}</Button>
                  <Button small className="sp" onClick={() => dismissIdea(i.id)}>Not now</Button>
                </div>
              </div>
            ))}
        </div>
      </Dialog>
    </div>
  );
}
