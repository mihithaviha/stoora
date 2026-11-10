'use client';
// Admin overview: the shops on the platform.
// API_TODO: GET /api/admin/shops (admin role only).
import { Avatar, Badge, Card, DemoBar, PageHeader } from '@/components/ui';

const SHOPS: [string, string, string, 'ok' | 'warn' | 'bad', string, string][] = [
  ['Meera Studio', 'Jaipur', 'Active', 'ok', '₹1,28,460', '2 min ago'],
  ['Clay & Co', 'Pondicherry', 'Active', 'ok', '₹64,210', '1 hr ago'],
  ['Tara Bakes', 'Pune', 'Identity check', 'warn', '₹0', 'Today'],
  ['Zen Yoga Hall', 'Bengaluru', 'Active', 'ok', '₹38,900', '3 hr ago'],
  ['Loom & Thread', 'Surat', 'Paused', 'bad', '₹12,040', '9 days ago'],
  ['Kavya Jewels', 'Hyderabad', 'Active', 'ok', '₹91,330', 'Yesterday'],
];

export default function AdminOverview() {
  return (
    <>
      <DemoBar>Sample admin data: these shops are made up to show the layout.</DemoBar>
      <PageHeader title="Overview" lede="The shops on Stoora." />
      <Card className="shop-card" title="Shops" icon="storefront" aside={<span className="cap">Last 30 days</span>} flush>
        <div className="shop-list" role="table" aria-label="Shops">
          <div className="shop-row shop-head" role="row"><span role="columnheader">Shop</span><span role="columnheader">Status</span><span role="columnheader" className="r">Sales</span><span role="columnheader">Last order</span></div>
          {SHOPS.map(([name, city, status, tone, sales, last]) => (
            <div className="shop-row" role="row" key={name}>
              <span className="shop-who" role="cell"><Avatar name={name} size={40} /><span className="shop-name"><b>{name}</b><span className="cap">{city}</span></span></span>
              <span role="cell"><Badge tone={tone} icon={tone === 'ok' ? 'check_circle' : tone === 'warn' ? 'schedule' : 'pause_circle'}>{status}</Badge></span>
              <span role="cell" className="shop-sales"><span className="shop-lbl">Sales</span><b className="num">{sales}</b></span>
              <span role="cell" className="shop-last"><span className="shop-lbl">Last order</span>{last}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
