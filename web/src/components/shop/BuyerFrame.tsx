'use client';
// Frame for the buyer's own pages. Shows a signed-out screen until the buyer has signed in.
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React from 'react';
import { ButtonLink, Icon, Skeleton, Button } from '../ui';
import { Logo, StateScreen } from '../bits';
import { useAuth } from '@/lib/auth';

export function BuyerFrame({ children }: { children: React.ReactNode }) {
  const path = usePathname() || ''; const router = useRouter(); const auth = useAuth();
  const signed = auth.ready ? !!auth.user : null;
  const tabs: [string, string, string][] = [['/buyer/orders', 'My orders', 'receipt_long'], ['/buyer/account', 'Account', 'person']];
  const out = async () => { await auth.signOut(); router.push('/signed-out'); };
  return (
    <div className="shopwrap">
      <header className="shopbar"><div className="wrap"><Logo /><span className="grow" /><div className="right"><Link className="btn quiet sm" href="/s/meera"><Icon name="storefront" size="sm" />Back to shop</Link>{signed && <Button small kind="quiet" icon="logout" onClick={out}>Log out</Button>}</div></div></header>
      <main id="main" className="grow-main">
        {signed === null ? <div className="wrap" style={{ padding: 'var(--s4) 16px' }}><Skeleton rows={3} height={96} /></div>
          : !signed ? <StateScreen kind="signedout" title="Sign in to see your orders" text="Your orders and saved details are private. Sign in to see them." actions={<><ButtonLink href={`/buyer/login?next=${encodeURIComponent(path)}`} kind="primary" icon="login">Sign in</ButtonLink><ButtonLink href="/s/meera">Continue shopping</ButtonLink></>} />
          : <div className="wrap" style={{ paddingBottom: 'var(--s6)' }}><nav className="buyer-tabs" aria-label="My account">{tabs.map(([h, l, i]) => <Link key={h} href={h} className={path.startsWith(h) ? 'on' : ''}><Icon name={i} size="sm" />{l}</Link>)}</nav>{children}</div>}
      </main>
    </div>
  );
}
