'use client';
import Link from 'next/link';
import { DI } from '@/components/dash/parts';
import { SettingsShell } from '@/components/dash/SettingsShell';
import { deliveryRule } from '@/lib/delivery';
import { rs } from '@/lib/format';
import { useStore } from '@/lib/store';

export default function SettingsPage() {
  const { db } = useStore();
  const rule = deliveryRule(db.shop);
  const pays = [db.shop.online !== false && db.shop.upi ? 'UPI' : '', db.shop.cod ? 'Cash on delivery' : ''].filter(Boolean).join(' and ');
  const cards: [string, string, string, string, string][] = [
    ['Shop details', 'store', 'shop-details', db.shop.open ? 'Your shop is open' : 'Your shop is paused', 'Name, link, contact details and pausing your shop'],
    ['Getting paid', 'card', 'getting-paid', pays || 'No way to pay is on yet', 'UPI and cash on delivery'],
    ['Delivery', 'cart', 'delivery', rule.fee === 0 ? 'Free delivery' : `${rs(rule.fee)} delivery${rule.freeOver ? `, free over ${rs(rule.freeOver)}` : ''}`, 'Delivery charge, area and order limits'],
    ['WhatsApp', 'wa', 'whatsapp', db.shop.whatsappVerified ? 'Number verified' : 'Not verified yet', 'Show a “Chat on WhatsApp” button on your shop'],
  ];
  return (
    <SettingsShell title="Settings">
      <p className="muted" style={{ margin: '0 0 16px' }}>Choose what you want to change.</p>
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
