import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import '../../styles/fonts.css'; // brand fonts, self-hosted from public/fonts
import './globals.css';
import '../../styles/site.css';
import '../../styles/shop.css';
import '../../styles/admin.css';
import '../../styles/storefront.css';
import '../../styles/storefront-editor.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: { default: 'Stoora: your shop, your link, your money', template: '%s · Stoora' },
  description: 'Stoora helps small sellers in India take orders, get paid and run their shop from one place.',
  icons: { icon: '/images/logo.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#FFFFFF' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>
        <a className="sr" href="#main">Skip to content</a>
        <Suspense fallback={null}><Providers>{children}</Providers></Suspense>
      </body>
    </html>
  );
}
