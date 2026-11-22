'use client';
// Meta Pixel base code (every page) plus a PageView on every client-side navigation, since the base script's own
// PageView only fires once, on the first load. Used in all three root layouts: (app), (marketing) and (seller).
import Script from 'next/script';
import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { META_PIXEL_ID, trackPixel } from '@/lib/pixel';

function RouteChangeTracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => { trackPixel('PageView'); }, [pathname, search]);
  return null;
}

export function MetaPixel() {
  return (
    <>
      <Script id="meta-pixel-base" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img height="1" width="1" style={{ display: 'none' }} src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} alt="" />
      </noscript>
      <Suspense fallback={null}><RouteChangeTracker /></Suspense>
    </>
  );
}
