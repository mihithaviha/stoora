'use client';
// Demo hub: try the seller dashboard, the storefront and the buyer account with a made-up shop ("Meera Studio").
import { Card, ButtonLink, Icon, Button, useToast } from '@/components/ui';
import { useStore } from '@/lib/store';

const DEMOS: [string, string, string, string, string, string][] = [
  ['dashboard', 'Seller dashboard', 'See orders, products, money and settings the way a seller does.', '/dashboard', 'Open the dashboard', 'shop'],
  ['storefront', 'Storefront', 'Browse the shop page, open a product, fill a bag and check out.', '/s/meera', 'Open the storefront', 'pay'],
  ['person', 'Buyer account', 'Log in with the demo code and follow an order from payment to delivery.', '/buyer/login', 'Open the buyer side', 'reel'],
];

export default function Demo() {
  const { resetDemo } = useStore(); const toast = useToast();
  return (
    <div className="wrap" style={{ padding: 'var(--s5) 16px var(--s6)', display: 'grid', gap: 'var(--s4)' }}>
      <div className="sec-h"><span className="eyebrow">Demo</span><h1 className="display" style={{ fontSize: 'clamp(32px,5.4vw,52px)' }}>Try Stoora with a sample shop</h1><p className="lede">Everything here uses made-up data for “Meera Studio”. Nothing is real, nothing is charged, and you can reset it at any time.</p></div>
      <div className="demo-grid">{DEMOS.map(([icon, t, d, href, cta]) => (
        <article className="demo-card" key={t}><span className="ic" style={{ background: 'var(--inner)' }}><Icon name={icon} /></span><h2 className="ct">{t}</h2><p className="t-body">{d}</p><ButtonLink href={href} kind="primary">{cta}</ButtonLink></article>))}
      </div>
      <div className="grid2">
        <Card title="A 3-minute tour" icon="route"><ol className="tour"><li>Open the <b>dashboard</b> and look at today’s summary.</li><li>Go to <b>Orders</b> and open #1011. Try “Mark as paid”, then “Ship order”.</li><li>Open the <b>storefront</b>, add a kurta to the bag and check out.</li><li>Back in the dashboard, your new order is at the top of Orders.</li></ol></Card>
        <Card title="Good to know" icon="info" className="stack">
          <ul className="notes" style={{ margin: 0, paddingLeft: 18 }}><li>Login codes in the demo are always <b className="num">123456</b>.</li><li>Payments in the demo never move money.</li><li>Your changes stay in this browser only.</li></ul>
          <div><Button icon="restart_alt" onClick={() => { resetDemo(); toast('Demo shop reset.', { icon: 'restart_alt' }); }}>Reset the demo shop</Button></div>
        </Card>
      </div>
    </div>
  );
}
