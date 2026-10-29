'use client';
import Link from 'next/link';
import { DI } from '@/components/dash/parts';
import { SettingsShell } from '@/components/dash/SettingsShell';
import { rs } from '@/lib/format';
import { useStore } from '@/lib/store';

export default function SettingsPage() {
  const { db } = useStore();
  const cards: [string, string, string, string, string][] = [
    ['Plan', 'box', 'plan', 'Free while you start', 'Upgrade when you sell more'],
    ['Payments', 'card', 'payments', db.shop.cod ? 'UPI and cash on delivery' : 'UPI', db.stats.payout.amount ? `Next payout ${rs(db.stats.payout.amount)} to ${db.stats.payout.to}` : 'Payouts are not set up yet'],
    ['Order-taking', 'cart', 'order-taking', db.shop.open ? 'Taking orders' : 'Orders paused', 'Opening hours, limits and delivery area'],
    ['WhatsApp verification', 'wa', 'whatsapp-verification', db.shop.whatsappVerified ? 'Number verified' : 'Not verified yet', 'Show a “Chat on WhatsApp” button on your shop'],
    ['Notifications', 'bell', 'notifications', 'Alerts inside Stoora', 'Order, payment and stock alerts'],
    ['Domains', 'globe', 'domains', `stoora.in/${db.shop.handle}`, 'Add your own .com any time'],
  ];
  return (
    <SettingsShell title="Settings">
      <p className="muted" style={{ margin: '0 0 16px' }}>Pick a setting on the left, or start with these.</p>
      <div className="grid2">
        {cards.map(([name, icon, href, a, b]) => (
          <Link key={name} className="box tapbox" href={`/settings/${href}`} style={{ textAlign: 'left', width: '100%' }}>
            <div className="box-h"><span className="box-t"><DI n={icon} s={16} /> {name}</span><DI n="right" s={16} /></div>
            <b>{a}</b><div className="small muted">{b}</div>
          </Link>
        ))}
      </div>
    </SettingsShell>
  );
}
