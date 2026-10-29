import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Stoora — seller dashboard',
  description: 'Run your shop from one place: orders, products, chats, money and an AI assistant.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#FFFFFF' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <head>
        {/* Brand fonts (Brand Kit v2): Bricolage Grotesque headings, Lexend body, Fraunces logo, Material Symbols Rounded icons. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Fraunces:opsz,wght@9..144,900&family=Lexend:wght@400;500;600;700&display=swap" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400,0..1,0&display=block" />
      </head>
      <body>
        <a className="sr" href="#main">Skip to content</a>
        <Suspense fallback={null}>
          <Providers>{children}</Providers>
        </Suspense>
      </body>
    </html>
  );
}
