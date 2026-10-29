import { Suspense } from 'react';
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <Suspense fallback={null}><SiteHeader /></Suspense>
      <main id="main" className="grow-main">{children}</main>
      <SiteFooter />
    </div>
  );
}
