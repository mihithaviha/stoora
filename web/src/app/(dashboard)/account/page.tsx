'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Avatar, Badge, Button, Card, ConfirmDialog, Icon, PageHeader } from '@/components/ui';

export default function AccountPage() {
  const { db, resetDemo } = useStore(); const router = useRouter();
  const [reset, setReset] = useState(false);
  return (
    <>
      <PageHeader title="Account" lede="Your login and this browser’s demo data." />
      <div className="detail">
        <div>
          <Card title="Signed in as" icon="person">
            <div className="row"><Avatar name={db.shop.owner} size={48} /><div className="grow"><div className="t-ink" style={{ fontWeight: 500 }}>{db.shop.owner}</div><div className="cap">{db.shop.email}</div></div><Badge tone="neutral" icon="science">Demo session</Badge></div>
            <div className="banner warn" style={{ marginTop: 'var(--s3)' }}><Icon name="info" /><span>Sign-in isn’t connected yet. This is a demo session in this browser, not a real Stoora account. Password, phone login and two-step verification will live here.</span></div>
          </Card>
          <Card title="Shop" icon="storefront">
            <div className="kv"><div className="r"><span>Shop</span><span>{db.shop.name}</span></div><div className="r"><span>Link</span><span>stoora.in/{db.shop.handle}</span></div><div className="r"><span>Plan</span><span>Not set up</span></div></div>
            <Link className="link cap" href="/settings/general" style={{ marginTop: 'var(--s2)', display: 'inline-flex' }}>Edit shop details<Icon name="chevron_right" size="xs" /></Link>
          </Card>
        </div>
        <div>
          <Card title="Demo data" icon="science" className="stack tight">
            <p className="t-soft">Orders, products and settings you change are saved in this browser only.</p>
            <Button kind="danger" icon="restart_alt" onClick={() => setReset(true)}>Reset demo shop</Button>
          </Card>
          <Card className="stack tight"><Button full icon="logout" onClick={() => { try { localStorage.removeItem('stoora.session'); } catch { /* ignore */ } router.push('/login'); }}>Sign out</Button></Card>
        </div>
      </div>
      <ConfirmDialog open={reset} onClose={() => setReset(false)} title="Reset the demo shop?" body="All sample orders, products and settings go back to how they started. This can’t be undone." yes="Reset" danger onYes={() => { resetDemo(); router.push('/'); }} />
    </>
  );
}
