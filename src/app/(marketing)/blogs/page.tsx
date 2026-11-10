import type { Metadata } from 'next';
import { Suspense } from 'react';
import { JournalHome } from '@/components/marketing/journal/JournalHome';
import { buildJournal } from '@/lib/journal/posts';
import { fetchPublicArticles } from '@/lib/journal/server';

const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://stoora.in';
const TITLE = 'Stoora Blogs: guides for small sellers in India';
const DESCRIPTION = 'Practical guides on product photos, pricing, packing, WhatsApp orders and customer care, written for small sellers in India.';

// stories the team publishes in Admin > Blogs show up here within a minute (at once when they press Publish)
export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/blogs' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/blogs', siteName: 'Stoora', type: 'website' },
};

export default async function BlogsPage() {
  const { articles, carousel } = await fetchPublicArticles();
  const { sorted } = buildJournal(articles);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Stoora Blogs',
    url: `${ORIGIN}/blogs`,
    publisher: { '@type': 'Organization', name: 'Stoora' },
    blogPost: sorted.map((a) => ({ '@type': 'BlogPosting', headline: a.title, url: `${ORIGIN}/blogs/${a.slug}`, datePublished: a.published })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\u003c') }} />
      <Suspense fallback={null}><JournalHome articles={articles} carousel={carousel} /></Suspense>
    </>
  );
}
