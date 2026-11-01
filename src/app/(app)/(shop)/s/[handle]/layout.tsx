'use client';
import { Suspense } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { ShopFrame } from '@/components/shop/ShopChrome';
import { StateScreen, HomeLink, Logo } from '@/components/bits';
import { Skeleton } from '@/components/ui';
import { useStore } from '@/lib/store';

/** Every page under /s/<shop> is wrapped in the shop's header and footer. A shop link nobody owns shows "not found". */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const { handle } = useParams<{ handle: string }>(); const { db, ready } = useStore(); const path = usePathname() || '';
  const bare = (body: React.ReactNode) => <div className="shopwrap"><header className="shopbar"><div className="wrap"><Logo /></div></header><main id="main" className="grow-main">{body}</main></div>;
  if (!ready) return bare(<div className="wrap" style={{ padding: 'var(--s4) 16px' }}><Skeleton rows={3} height={140} /></div>);
  if (handle !== db.shop.handle) return bare(<StateScreen kind="notfound" title="We couldn’t find that shop" text={`There is no shop at stoora.in/${handle}. Check the link, or ask the seller to send it again.`} actions={<HomeLink to="/" label="Go to Stoora" />} />);
  // no products or services yet: just the shop's name and logo, and "Coming soon"
  if (!db.products.some((p) => p.status === 'Active') && db.services.length === 0) {
    const logo = db.shop.storefront?.brand?.logo;
    return bare(<div className="wrap" style={{ padding: 'var(--s6) 16px', textAlign: 'center' }} data-testid="coming-soon"><div className="stack" style={{ justifyItems: 'center' }}>{logo ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={logo} alt={`${db.shop.name} logo`} style={{ width: 88, height: 88, borderRadius: 24, objectFit: 'cover' }} /> : <span className="shop-av" aria-hidden="true" style={{ width: 88, height: 88, fontSize: 40, borderRadius: 24 }}>{db.shop.name[0]}</span>}<h1 className="h1">{db.shop.name}</h1><p className="t-body" style={{ margin: 0 }}>Coming soon</p></div></div>);
  }
  // a shop with its own storefront design draws its own header and footer on its home page
  if (db.shop.storefront && path === `/s/${handle}`) return <Suspense fallback={null}>{children}</Suspense>;
  return <Suspense fallback={null}><ShopFrame handle={handle}>{children}</ShopFrame></Suspense>;
}
