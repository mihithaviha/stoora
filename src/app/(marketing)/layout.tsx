import type { Metadata, Viewport } from 'next';
import '../../styles/brand/main.css';
import '../../styles/brand/features.css';
import '../../styles/brand/touch.css';
import '../../styles/brand/auth-extra.css';
import { FONT_LINKS } from '@/components/marketing/fontLinks';

/**
 * The public site (home, sign-in, sign-up, Journal). It is its own root layout, so it carries the brand's
 * original stylesheet on its own and never mixes with the seller dashboard's styles.
 */
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://stoora.in'),
  title: { default: 'Stoora.in · One link for your shop', template: '%s · Stoora.in' },
  description: 'One link for every order, every chat and every rupee. Your own shop at stoora.in/yourname, and one place for every order and UPI payment.',
  icons: { icon: '/assets/favicon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#FFFFFF' };

export default function MarketingRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {FONT_LINKS.map((href) => <link key={href} rel="stylesheet" href={href} />)}
      </head>
      <body className="mode-public">{children}</body>
    </html>
  );
}
