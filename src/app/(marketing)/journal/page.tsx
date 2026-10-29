import type { Metadata } from 'next';
import { Suspense } from 'react';
import { JournalHome } from '@/components/marketing/journal/JournalHome';
import { CAROUSEL, SORTED } from '@/lib/journal';

const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://stoora.in';
const TITLE = 'The Stoora Journal: guides for small sellers in India';
const DESCRIPTION = 'Practical guides on product photos, pricing, packing, WhatsApp orders and customer care, written for small sellers in India.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/journal' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/journal', siteName: 'Stoora', type: 'website', images: [`/assets/journal/${CAROUSEL[0].photo}-1400.jpg`] },
};

export default function JournalPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'The Stoora Journal',
    url: `${ORIGIN}/journal`,
    publisher: { '@type': 'Organization', name: 'Stoora' },
    blogPost: SORTED.map((a) => ({ '@type': 'BlogPosting', headline: a.title, url: `${ORIGIN}/journal/${a.slug}`, datePublished: a.published })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <Suspense fallback={null}><JournalHome /></Suspense>
    </>
  );
}
