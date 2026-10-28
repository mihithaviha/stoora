'use client';
// Home: a calm summary. What needs you, today at a glance, the week, ideas and what is coming up.
import Link from 'next/link';
import { useState } from 'react';
import { useStore, moneyWaiting, orderFilters } from '@/lib/store';
import { useAssistant, useGreeting } from '@/components/Assistant';
import { Badge, Card, DemoBar, Icon, LineChart, Avatar, Skeleton, Button, useToast } from '@/components/ui';
import { MessageDialog } from '@/components/MessageDialog';
import { plural, rs } from '@/lib/format';

const SUGG = ['Give me today’s shop update', 'Show my pending payments', 'Which products need attention?', 'What should I do first today?'];

export default function Home() {
  const { db, ready, dismissedIdeas, dismissIdea, restoreIdea } = useStore();
  const a = useAssistant(); const greet = useGreeting(); const toast = useToast();
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState<null | { to: string; text: string; phone?: string }>(null);
  if (!ready) return <><Skeleton rows={1} height={90} /><div style={{ height: 16 }} /><Skeleton rows={3} height={120} /></>;

  const w = moneyWaiting(db); const wt = w.reduce((s, x) => s + x.amount, 0);
  const toShip = db.orders.filter(orderFilters['To ship']);
  const ready2 = db.chats.filter((c) => c.mood === 'ready' && c.unread); const upset = db.chats.filter((c) => c.mood === 'upset' && c.unread);
  const unpaid = db.orders.find((o) => !o.paid && o.method === 'upi');
  const low = db.products.filter((p) => p.status === 'Active' && p.stock > 0 && p.stock <= 3).sort((x, y) => (y.viewsYesterday ?? 0) - (x.viewsYesterday ?? 0))[0];
  const att: { icon: string; k: string; text: string; cta: React.ReactNode }[] = [];
  if (unpaid) att.push({ icon: 'currency_rupee', k: 'pay', text: `${unpaid.buyer.split(' ')[0]} hasn’t paid ${rs(unpaid.total)} for order #${unpaid.id} yet.`, cta: <Button small onClick={() => setMsg({ to: unpaid.buyer, phone: unpaid.phone, text: `Hi ${unpaid.buyer.split(' ')[0]}, a gentle reminder about your ${db.shop.name} order #${unpaid.id} for ${rs(unpaid.total)}. You can pay by UPI whenever it suits you. Thank you.` })}>Send reminder</Button> });
  if (ready2.length) att.push({ icon: 'forum', k: 'chat', text: `${plural(ready2.length, 'buyer is', 'buyers are')} ready to buy. Replies are drafted for you.`, cta: <Link className="btn line sm" href="/chats">Review messages</Link> });
  if (upset.length) att.push({ icon: 'sentiment_dissatisfied', k: 'chat', text: `${upset[0].buyer.split(' ')[0]} is upset: “${upset[0].last}”`, cta: <Link className="btn line sm" href={`/chats?c=${upset[0].id}`}>Reply now</Link> });
  if (toShip.length) att.push({ icon: 'local_shipping', k: 'shop', text: `${plural(toShip.length, 'order is', 'orders are')} waiting to be shipped.`, cta: <Link className="btn line sm" href="/orders?filter=To%20ship">Ship it</Link> });
  if (low) att.push({ icon: 'inventory_2', k: 'reel', text: `${low.name}: ${low.viewsYesterday ? low.viewsYesterday + ' people looked yesterday and ' : ''}only ${low.stock} left.`, cta: <Link className="btn line sm" href={`/products/${low.id}`}>See product</Link> });

  const d = db.stats.salesByDay; const best = d.slice(0, -1).reduce((b, x, i, arr) => (x.sales > arr[b].sales ? i : b), 0);
  const ideas = db.ideas.filter((i) => !dismissedIdeas.includes(i.id));
  const upcoming = db.bookings.filter((b) => b.status === 'Upcoming');
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <DemoBar />
      <div className="phead anim home-head">
        <div className="l"><span className="eyebrow">{today} · {db.shop.name}</span><h1 className="h1">{greet}, {db.shop.owner}</h1><p className="t-body">Here’s what is happening in your shop today.</p></div>
      </div>

      <section className="card assist anim" style={{ ['--i' as string]: 1 }} aria-labelledby="as-h">
        <div className="as-grid">
          <div className="as-l">
            <div className="as-who"><span className="smark" aria-hidden="true">S</span><div><h2 className="ct" id="as-h">Your shop today</h2><p className="cap">Summary worked out from your shop’s numbers</p></div></div>
            <p className="brief">Yesterday you made <b className="num">{rs(db.stats.salesYesterday)}</b> from {plural(db.stats.ordersYesterday, 'order')}. Today you’ve made <b className="num">{rs(db.stats.salesToday)}</b> so far{db.stats.salesToday > db.stats.salesYesterday ? ' — already more than all of yesterday' : ''}.</p>
            <h3 className="label as-lbl">Needs your attention · {Math.min(att.length, 4)}</h3>
            {att.length ? <ul className="attn">{att.slice(0, 4).map((x, n) => <li key={n}><span className={`ic ${x.k}`}><Icon name={x.icon} size="sm" /></span><span className="grow">{x.text}</span>{x.cta}</li>)}</ul>
              : <p className="t-soft">Nothing needs you right now.</p>}
          </div>
          <div className="as-r">
            <form className="askbox" onSubmit={(e) => { e.preventDefault(); if (q.trim()) { a.open(q); setQ(''); } }}>
              <label className="flabel" htmlFor="home-q" style={{ display: 'block', marginBottom: 'var(--s1)' }}>Ask Stoora anything about your shop</label>
              <textarea id="home-q" rows={2} placeholder="How did I do this week?" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
              <div className="tools"><span className="cap grow">Answers come from your shop’s numbers</span><button className="go" type="submit" aria-label="Ask" disabled={!q.trim()}><Icon name="arrow_upward" size="sm" /></button></div>
            </form>
            <div className="sugg2">{SUGG.map((s) => <button key={s} onClick={() => a.open(s)}>{s}</button>)}</div>
            <p className="cap as-note"><Icon name="verified_user" size="xs" />Stoora suggests. Nothing is sent, posted or changed until you tap.</p>
          </div>
        </div>
      </section>

      <div className="home-row">
        <Card title="Today at a glance">
          <dl className="glance">
            <div><dt>Sales today</dt><dd className="big num">{rs(db.stats.salesToday)}</dd><dd className="cap">Orders placed today, paid or not. Yesterday: {rs(db.stats.salesYesterday)}.</dd></div>
            <div><dt>Waiting for payment</dt><dd className="big num">{rs(wt)}</dd><dd className="cap">{plural(w.length, 'buyer hasn’t', 'buyers haven’t')} paid yet. <Link className="link" href="/money">See who</Link></dd></div>
            <div><dt>Orders to ship</dt><dd className="big num">{toShip.length}</dd><dd className="cap">Ready to pack. <Link className="link" href="/orders?filter=To%20ship">Open</Link></dd></div>
          </dl>
        </Card>
        <Card title="Your sales this week" aside={<Link className="link cap" href="/analytics">More<Icon name="chevron_right" size="xs" /></Link>}>
          <LineChart labels={d.map((x) => x.day)} values={d.map((x) => x.sales)} label="Sales over the last 7 days" />
          <p className="cap">{d[best].day} was your best full day ({rs(d[best].sales)}). Today is still going.</p>
        </Card>
      </div>

      <div className="home-row">
        <Card title="Ideas from Stoora" icon="lightbulb" aside={<span className="cap">{ideas.length ? plural(ideas.length, 'idea') + ' to approve' : 'All done'}</span>}>
          {ideas.length ? (
            <div className="stack tight">
              {ideas.map((i) => (
                <div className="idea" key={i.id}>
                  <p>{i.text}</p>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--s1)' }}>
                    <Badge tone="ok" icon="trending_up">Could earn {rs(i.earn)}</Badge>
                    {i.cost ? <Badge tone="neutral" icon="payments">Costs {rs(i.cost)}</Badge> : <Badge tone="neutral" icon="money_off">Costs nothing</Badge>}
                    <span className="grow" />
                    <Button kind="quiet" small onClick={() => { dismissIdea(i.id); toast('Idea hidden.', { icon: 'visibility_off', undo: () => restoreIdea(i.id) }); }}>Not now</Button>
                    <Button kind="ink" small onClick={() => {
                      if (i.id === 'i2') setMsg({ to: 'Rahul Verma', text: `Hi Rahul, a gentle reminder about your ${db.shop.name} order #1011 for ₹1,499. You can pay by UPI whenever it suits you. Thank you.` });
                      else if (i.id === 'i3') setMsg({ to: 'past students', text: 'Hi, Wednesday’s morning yoga has a few seats free. Book this week and get ₹100 off. Reply here to book.' });
                      else setMsg({ to: 'your Instagram followers', text: 'Only 3 left: our indigo kurta set (₹2,899). DM us “INDIGO” to book yours.' });
                    }}>{i.action}</Button>
                  </div>
                </div>
              ))}
              <p className="cap">“Could earn” is an estimate, not a promise.</p>
            </div>
          ) : <p className="t-soft">You’ve handled today’s ideas.</p>}
        </Card>
        <Card title="Coming up" icon="event" aside={<Link className="link cap" href="/orders?tab=bookings">All bookings<Icon name="chevron_right" size="xs" /></Link>}>
          {upcoming.length ? <div className="rows">{upcoming.map((b) => (
            <Link key={b.id} className="li" href="/orders?tab=bookings" style={{ background: 'var(--inner)' }}>
              <Avatar name={b.buyer} /><span className="grow"><span className="t">{db.services.find((s) => s.id === b.serviceId)?.name}</span><span className="s">{b.when} · {b.buyer}</span></span>
              {b.paid ? <Badge tone="ok" icon="check_circle">Paid</Badge> : <Badge tone="warn" icon="schedule">Unpaid</Badge>}
            </Link>))}</div> : <p className="t-soft">No bookings coming up.</p>}
        </Card>
      </div>
      {msg && <MessageDialog open onClose={() => setMsg(null)} title="Message ready to send" to={msg.to} phone={msg.phone} text={msg.text} channel={msg.to.includes('Instagram') ? 'Instagram' : 'WhatsApp'} />}
    </>
  );
}
