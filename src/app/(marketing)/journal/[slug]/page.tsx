import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleView } from '@/components/marketing/journal/ArticleView';
import { ARTICLES, AUTHOR, articleBySlug } from '@/lib/journal';

const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://stoora.in';

export const dynamicParams = false;
export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const article = articleBySlug((await params).slug);
  if (!article) return { title: 'Story not found', robots: { index: false } };
  const image = `/assets/journal/${article.photo}-1400.jpg`;
  return {
    title: `${article.title} · Stoora Journal`,
    description: article.excerpt,
    alternates: { canonical: `/journal/${article.slug}` },
    openGraph: { title: article.title, description: article.excerpt, url: `/journal/${article.slug}`, siteName: 'Stoora', type: 'article', publishedTime: article.published, images: [image] },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const article = articleBySlug((await params).slug);
  if (!article) notFound();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    image: `${ORIGIN}/assets/journal/${article.photo}-1400.jpg`,
    datePublished: article.published,
    author: { '@type': 'Organization', name: AUTHOR },
    publisher: { '@type': 'Organization', name: 'Stoora' },
    mainEntityOfPage: `${ORIGIN}/journal/${article.slug}`,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <ArticleView article={article} origin={ORIGIN} />
    </>
  );
}
