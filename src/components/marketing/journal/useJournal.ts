'use client';
import { useEffect, useMemo, useState } from 'react';
import type { Article } from '@/lib/journal';
import { buildJournal, mergeArticles, readLocalCarousel, readLocalPosts, type CarouselItem } from '@/lib/journal/posts';
import { isSupabaseConfigured } from '@/lib/supabase/config';

/**
 * The stories and the carousel for the Blogs pages. Live mode: the server already sent the right ones. Demo mode: the stories and carousel
 * the team set up in this browser (Admin > Blogs) are added after the page loads, and the page follows later changes.
 */
export function useJournal(initial: Article[], initialCarousel: CarouselItem[] | null = null) {
  const [articles, setArticles] = useState(initial);
  const [chosen, setChosen] = useState<CarouselItem[] | null>(initialCarousel);
  useEffect(() => { setArticles(initial); }, [initial]);
  useEffect(() => { setChosen(initialCarousel); }, [initialCarousel]);
  useEffect(() => {
    if (isSupabaseConfigured) return;
    const sync = () => {
      const posts = readLocalPosts();
      if (posts.length) setArticles(mergeArticles(posts));
      setChosen(readLocalCarousel());
    };
    sync();
    window.addEventListener('stoora-blogs', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('stoora-blogs', sync); window.removeEventListener('storage', sync); };
  }, []);
  return useMemo(() => buildJournal(articles, chosen), [articles, chosen]);
}
