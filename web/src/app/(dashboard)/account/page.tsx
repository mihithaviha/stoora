'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { Avatar, Badge, Button, Card, ConfirmDialog, Icon, PageHeader } from '@/components/ui';

export default function AccountPage() {
  const { db, resetDemo, mode } = useStore(); const auth = useAuth(); const router = useRouter();
  const [reset, setReset] = useState(false);
  const name = auth.user?.name || db.shop.owner || 'You'; const email = auth.user?.email || db.shop.email;
  return (
    <>
      <PageHeader title="Account" lede={mode === 'live' ? 'Your login and your shop.' : 'Your login and this browser’s demo data.'} />
      <div className="detail">
        <div>
          <Card title="Signed in as" icon="person">
            <div className="row"><Avatar name={name} size={48} /><div className="grow"><div className="t-ink" style={{ fontWeight: 500 }}>{name}</div><div className="cap">{email}{auth.user?.phone ? ` · ${auth.user.phone}` : ''}</div></div>{mode === 'live' ? <Badge tone="ok" icon="verified">Signed in</Badge> : <Badge tone="warn" icon="science">Demo</Badge>}</div>
            {mode === 'demo' && <div className="banner warn" style={{ marginTop: 'var(--s3)' }}><Icon name="info" /><span>Supabase isn’t connected, so this is a demo session in this browser, not a real Stoora account. Add the keys from <b>.env.example</b> to turn on real sign-in.</span></div>}
          </Card>
          <Card title="Shop" icon="storefront">
            <div className="kv"><div className="r"><span>Shop</span><span>{db.shop.name}</span></div><div className="r"><span>Link</span><span>stoora.in/{db.shop.handle}</span></div><div className="r"><span>City</span><span>{db.shop.city || '—'}</span></div></div>
            <Link className="link cap" href="/settings/general" style={{ marginTop: 'var(--s2)', display: 'inline-flex' }}>Edit shop details<Icon name="chevron_right" size="xs" /></Link>
          </Card>
        </div>
        <div>
          {mode === 'demo' && <Card title="Demo data" icon="science" className="stack tight">
            <p className="t-soft">Orders, products and settings you change are saved in this browser only.</p>
            <Button kind="danger" icon="restart_alt" onClick={() => setReset(true)}>Reset demo shop</Button>
          </Card>}
          <Card className="stack tight"><Button full icon="logout" onClick={async () => { await auth.signOut(); router.push('/signed-out'); }}>Sign out</Button></Card>
        </div>
      </div>
      <ConfirmDialog open={reset} onClose={() => setReset(false)} title="Reset the demo shop?" body="All sample orders, products and settings go back to how they started. This can’t be undone." yes="Reset" danger onYes={resetDemo} />
    </>
  );
}
