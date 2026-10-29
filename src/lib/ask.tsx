// Ask Stoora: answers a seller's question from the shop's own numbers. No guessing: if the shop has no data for it, it says so.
import type { ReactNode } from 'react';
import { rs } from './format';
import { orderFilters } from './derive';
import type { Db, Product } from './types';

export interface AskTools {
  go: (href: string) => void;
  copy: (text: string) => void;
}

const bestSeller = (db: Db) => [...db.products].filter((p) => p.status === 'Active').sort((a, b) => b.soldLast30Days - a.soldLast30Days)[0];
const lowest = (db: Db) => db.products.filter((p) => p.status === 'Active' && p.stock > 0 && p.stock <= 3).sort((a, b) => (b.viewsYesterday ?? 0) - (a.viewsYesterday ?? 0))[0];

/** A short product description from what the seller already entered (name, colour, category, sizes). */
export function describeProduct(p: Product): string {
  const bits = [p.color ? `${p.color} ${p.name.toLowerCase()}` : p.name, p.sizes.length ? `Available in ${p.sizes.join(', ')}.` : 'One size.', p.category === 'Kurtas' ? 'Soft, breathable and easy to wear every day.' : 'A small piece that finishes an outfit.'];
  return `${bits[0].charAt(0).toUpperCase()}${bits[0].slice(1)}. ${bits[1]} ${bits[2]} ${rs(p.price)}.`;
}

export const SUGGESTIONS = ['How did I do this week?', 'Which orders should I ship first?', 'Write a post for my best seller'];

export function Answer({ q, db, tools }: { q: string; db: Db; tools: AskTools }): ReactNode {
  const t = q.toLowerCase();

  if (/descri|write|post|caption/.test(t)) {
    const p = lowest(db) ?? bestSeller(db);
    if (!p) return <p>Add a product first and I can write about it.</p>;
    const isPost = /post|caption/.test(t);
    const text = isPost
      ? `${p.stock > 0 && p.stock <= 3 ? `Only ${p.stock} left! ` : ''}${p.name}, ${rs(p.price)}. ${p.sizes.length ? `Sizes ${p.sizes.join(', ')}. ` : ''}Message us to order.`
      : describeProduct(p);
    return (
      <>
        <p style={{ margin: '6px 0 10px' }}>Here’s a {isPost ? 'post' : 'description'} for <b>{p.name}</b>, written from what you’ve entered:</p>
        <div className="idea small">{text}<div className="row" style={{ gap: 8 }}><button className="btn ink sm" type="button" onClick={() => tools.copy(text)}>Copy</button><button className="btn grey sm" type="button" onClick={() => tools.go(`/products/${p.id}`)}>Open product</button></div></div>
      </>
    );
  }

  if (/ship|order|first/.test(t)) {
    const toShip = db.orders.filter(orderFilters['To ship']);
    const unpaid = db.orders.find((o) => !o.paid && o.method === 'upi');
    if (!toShip.length && !unpaid) return <p style={{ margin: '6px 0' }}>Nothing is waiting. Every paid order has been shipped.</p>;
    const first = toShip[0];
    return (
      <>
        <p style={{ margin: '6px 0 10px' }}>
          {first ? <>Ship <b>#{first.id}</b> first — {first.buyer} {first.paid ? `paid ${rs(first.total)}` : 'ordered cash on delivery'}. </> : null}
          {unpaid ? <><b>#{unpaid.id}</b> ({unpaid.buyer.split(' ')[0]}, {rs(unpaid.total)}) isn’t paid yet, so send a UPI reminder before packing.</> : null}
        </p>
        <div className="row" style={{ gap: 8 }}>
          {first ? <button className="btn ink sm" type="button" onClick={() => tools.go(`/orders/${first.id}`)}>Open #{first.id}</button> : null}
          {unpaid ? <button className="btn grey sm" type="button" onClick={() => tools.go(`/orders/${unpaid.id}`)}>Remind {unpaid.buyer.split(' ')[0]}</button> : null}
        </div>
      </>
    );
  }

  if (/yoga|class|service|session/.test(t)) {
    return (
      <>
        <p style={{ margin: '6px 0 10px' }}>Let’s set up a class or session. I’ll need the price, the days and times, and how many seats.</p>
        <button className="btn ink sm" type="button" onClick={() => tools.go('/products/service/new')}>Open Add service</button>
      </>
    );
  }

  if (/upi|pay/.test(t)) {
    return (
      <>
        <p style={{ margin: '6px 0 10px' }}>Go to <b>Settings › Payments</b> to see how buyers pay you. Orders are marked paid only when you confirm the money has arrived.</p>
        <button className="btn ink sm" type="button" onClick={() => tools.go('/settings/payments')}>Open Payments</button>
      </>
    );
  }

  // the default: how the week went, from the shop's own numbers
  const days = db.stats.salesByDay;
  const week = days.reduce((a, d) => a + d.sales, 0);
  if (!week) return <p style={{ margin: '6px 0' }}>There are no sales in the last 7 days yet, so there is nothing to compare. Share your shop link and ask me again after your first orders.</p>;
  const weeks = db.stats.salesByWeek;
  const prev = weeks.length >= 2 ? weeks[weeks.length - 2].sales : 0;
  const change = prev ? Math.round(((week - prev) / prev) * 100) : null;
  const bestDay = [...days].sort((a, b) => b.sales - a.sales)[0];
  const top = Object.entries(db.stats.sourcesPercent).sort((a, b) => b[1] - a[1])[0];
  const max = Math.max(...days.map((d) => d.sales), 1);
  const low = lowest(db);
  return (
    <>
      <p style={{ margin: '6px 0 10px' }}>
        You sold <b>{rs(week)}</b> in the last 7 days{change != null ? <> — <b>{change >= 0 ? 'up' : 'down'} {Math.abs(change)}%</b> from the week before</> : null}.
        {' '}{bestDay.day === 'Today' ? 'Today' : bestDay.day} was your best day{top ? <>, and most orders came from {top[0]}</> : null}.
      </p>
      <div className="bars" style={{ height: 60 }} role="img" aria-label={`Sales by day: ${days.map((d) => `${d.day} ${rs(d.sales)}`).join(', ')}`}>{days.map((d) => <i key={d.day} style={{ height: `${Math.max(6, (d.sales / max) * 100)}%` }} />)}</div>
      {low ? (
        <div className="idea" style={{ marginTop: 12 }}>
          <div className="small"><b>One idea:</b> {low.name} has only {low.stock} left{low.viewsYesterday ? ` and ${low.viewsYesterday} people looked at it yesterday` : ''}. Restock it soon.</div>
          <button className="btn ink sm" style={{ justifySelf: 'start' }} type="button" onClick={() => tools.go(`/products/${low.id}`)}>Open product</button>
        </div>
      ) : null}
    </>
  );
}
