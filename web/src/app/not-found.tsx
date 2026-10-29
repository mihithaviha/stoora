import { Suspense } from 'react';
import { ButtonLink } from '@/components/ui';
import { StateScreen } from '@/components/bits';
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome';

export default function NotFound() {
  return (
    <div className="site"><Suspense fallback={null}><SiteHeader /></Suspense>
      <main id="main" className="grow-main"><StateScreen kind="notfound" title="We couldn’t find that page" text="The link may be old or mistyped. Here are some places that will help." actions={<><ButtonLink href="/" kind="primary" icon="home">Go to the home page</ButtonLink><ButtonLink href="/demo" icon="play_circle">See the demo</ButtonLink><ButtonLink href="/login">Log in</ButtonLink></>} /></main>
      <SiteFooter /></div>
  );
}
