'use client';
import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { ShopFrame } from '@/components/shop/ShopChrome';
import { StateScreen, HomeLink, Logo } from '@/components/bits';
import { Skeleton } from '@/components/ui';
import { useStore } from '@/lib/store';

/** Every page under /s/<shop> is wrapped in the shop's header and footer. A shop link nobody owns shows "not found". */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const { handle } = useParams<{ handle: string }>(); const { db, ready } = useStore();
  const bare = (body: React.ReactNode) => <div className="shopwrap"><header className="shopbar"><div className="wrap"><Logo /></div></header><main id="main" className="grow-main">{body}</main></div>;
  if (!ready) return bare(<div className="wrap" style={{ padding: 'var(--s4) 16px' }}><Skeleton rows={3} height={140} /></div>);
  if (handle !== db.shop.handle) return bare(<StateScreen kind="notfound" title="We couldn’t find that shop" text={`There is no shop at stoora.in/${handle}. Check the link, or ask the seller to send it again.`} actions={<HomeLink to="/" label="Go to Stoora" />} />);
  return <Suspense fallback={null}><ShopFrame handle={handle}>{children}</ShopFrame></Suspense>;
}
