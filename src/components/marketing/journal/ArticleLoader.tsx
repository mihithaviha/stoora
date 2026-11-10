'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArticleView } from './ArticleView';
import type { Article } from '@/lib/journal';
import { mergeArticles, readLocalPosts, relatedIn } from '@/lib/journal/posts';
import { isSupabaseConfigured } from '@/lib/supabase/config';

/**
 * One story. Live mode: the server found it and sent it. Demo mode: a story the team wrote (or edited) in this browser is looked up here,
 * because it exists only in this browser's storage.
 */
export function ArticleLoader({ slug, initial, all, origin }: { slug: string; initial: Article | null; all: Article[]; origin: string }) {
  const demo = !isSupabaseConfigured;
  const [state, setState] = useState<{ article: Article | null; list: Article[]; checked: boolean }>({ article: initial, list: all, checked: !demo });
  useEffect(() => {
    if (!demo) return;
    const sync = () => {
      const merged = mergeArticles(readLocalPosts());
      setState({ article: merged.find((a) => a.slug === slug) ?? null, list: merged, checked: true });
    };
    sync();
    window.addEventListener('stoora-blogs', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('stoora-blogs', sync); window.removeEventListener('storage', sync); };
  }, [demo, slug]);

  if (!state.checked && !state.article) return <div className="wrap jr-narrow" style={{ padding: '120px 16px' }} aria-busy="true" />;
  if (!state.article) {
    return (
      <div className="wrap jr-narrow" style={{ padding: '96px 16px', textAlign: 'center' }}>
        <h1>We couldn’t find that story</h1>
        <p>It may have been moved or taken down.</p>
        <p><Link className="btn primary" href="/blogs">Back to Blogs</Link></p>
      </div>
    );
  }
  return <ArticleView article={state.article} origin={origin} related={relatedIn(state.list, state.article)} />;
}
