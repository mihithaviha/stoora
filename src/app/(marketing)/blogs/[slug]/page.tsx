import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleLoader } from '@/components/marketing/journal/ArticleLoader';
import { ARTICLES, AUTHOR } from '@/lib/journal';
import { relatedIn } from '@/lib/journal/posts';
import { fetchPublicArticles } from '@/lib/journal/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://stoora.in';

// new stories the team publishes are rendered on first visit and refreshed within a minute (at once when they press Publish)
export const revalidate = 60;
export const dynamicParams = true;
export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

/** A story's picture for sharing: a library photo, or the address of one the team uploaded (a stored copy is too big to share). */
const shareImage = (photo: string) => (photo.startsWith('data:') ? undefined : /^(https?:\/\/|\/)/.test(photo) ? photo : `/assets/journal/${photo}-1400.jpg`);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;
  const { articles } = await fetchPublicArticles();
  const article = articles.find((a) => a.slug === slug);
  if (!article) return { title: 'Story not found', robots: { index: false } };
  const image = shareImage(article.photo);
  return {
    title: `${article.title} · Stoora Blogs`,
    description: article.excerpt,
    alternates: { canonical: `/blogs/${article.slug}` },
    openGraph: { title: article.title, description: article.excerpt, url: `/blogs/${article.slug}`, siteName: 'Stoora', type: 'article', publishedTime: article.published, ...(image ? { images: [image] } : {}) },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const { articles } = await fetchPublicArticles();
  const article = articles.find((a) => a.slug === slug) ?? null;
  // demo mode keeps the team's own stories in their browser, so an unknown address is looked up there; live mode knows them all
  if (!article && isSupabaseConfigured) notFound();
  const image = article ? shareImage(article.photo) : undefined;
  const jsonLd = article && {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    ...(image ? { image: image.startsWith('http') ? image : `${ORIGIN}${image}` } : {}),
    datePublished: article.published,
    author: { '@type': 'Organization', name: AUTHOR },
    publisher: { '@type': 'Organization', name: 'Stoora' },
    mainEntityOfPage: `${ORIGIN}/blogs/${article.slug}`,
  };
  return (
    <>
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\u003c') }} /> : null}
      <ArticleLoader slug={slug} initial={article} all={articles} origin={ORIGIN} />
    </>
  );
}
