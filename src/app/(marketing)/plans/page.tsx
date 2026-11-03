import type { Metadata } from 'next';
import Link from 'next/link';
import { Ic } from '@/components/marketing/bits';
import { TalkToUs } from '@/components/marketing/TalkToUs';

export const metadata: Metadata = { title: 'Plans', description: 'Free for 10 days. Start your shop and see how Stoora works.' };

/**
 * The Plans page. Only what is confirmed is written here: the first 10 days are free.
 * Plan names, prices and what happens on day 11 are not decided yet, so they are NOT on this page.
 * Add them to PLANS below once they are confirmed (name, price, what is included), then show the list.
 */
const PLANS: { name: string; price: string; includes: string[] }[] = [];

const FREE_NOW = ['Open your shop and add what you sell.', 'Take UPI payments at your own link.', 'Keep every order in one list.'];

export default function PlansPage() {
  return (
    <div className="wrap pl">
      <section className="pl-card" aria-labelledby="pl-h">
        <h1 id="pl-h">Free for 10 days.</h1>
        <p className="lede">Open your shop first. Look around, add your products and share your link.</p>
        <ul className="pl-list" aria-label="What you can do in the 10 free days">
          {FREE_NOW.map((t) => <li key={t}><Ic n="check_circle" c="sm" />{t}</li>)}
        </ul>
        {PLANS.length > 0 && (
          <ul className="pl-list" aria-label="Plans">
            {PLANS.map((p) => <li key={p.name}><div><b>{p.name} · {p.price}</b><br />{p.includes.join(' · ')}</div></li>)}
          </ul>
        )}
        <div className="pl-actions">
          <Link className="btn primary" href="/shop/start">Start for Free</Link>
          <TalkToUs label="Ask about plans" />
        </div>
      </section>
    </div>
  );
}
