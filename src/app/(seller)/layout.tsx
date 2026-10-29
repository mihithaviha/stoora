import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import '../../styles/fonts.css'; // brand fonts, self-hosted from public/fonts
import '../(app)/globals.css';
import '../../styles/site.css';
import '../../styles/dash-proto.css'; // the dashboard prototype's own rules
import '../../styles/dash.css'; // what the app adds around them
import '../../styles/storefront-editor.css';
import { DashShell } from '@/components/dash/DashShell';
import { Providers } from '@/components/Providers';
import { SellerGate } from '@/components/SellerGate';

/**
 * The seller dashboard. It is its own root layout so the dashboard's stylesheet (from the Stoora dashboard prototype)
 * never mixes with the public site's or the shop's.
 */
export const metadata: Metadata = {
  title: { default: 'Stoora', template: '%s · Stoora' },
  description: 'Run your shop from one place: orders, products, customers and money.',
  icons: { icon: '/images/logo.svg' },
  robots: { index: false },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#171C3C' };

export default function SellerRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>
        <a className="sr" href="#main">Skip to content</a>
        <Suspense fallback={null}>
          <Providers>
            <DashShell><SellerGate>{children}</SellerGate></DashShell>
          </Providers>
        </Suspense>
      </body>
    </html>
  );
}
