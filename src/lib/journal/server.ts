import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '../supabase/config';
import { carouselFrom, mergeArticles, postFromRow, type BlogPost, type CarouselItem } from './posts';
import type { Article } from './articles';

/** The stories visitors can see right now (live mode): the built-in ones with the team's edits, plus new published ones. Demo mode has none to add here. */
export async function fetchPublicArticles(): Promise<{ articles: Article[]; posts: BlogPost[]; carousel: CarouselItem[] | null }> {
  if (!isSupabaseConfigured) return { articles: mergeArticles([]), posts: [], carousel: null };
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const [rows, hidden, ring] = await Promise.all([
      sb.from('blog_posts').select('*').eq('status', 'published').limit(500),
      sb.rpc('hidden_blog_slugs'),
      sb.from('blog_settings').select('value').eq('key', 'carousel').maybeSingle(),
    ]);
    if (rows.error) throw rows.error;
    const posts = (rows.data ?? []).map(postFromRow);
    const carousel = ring.data ? carouselFrom(ring.data.value) : null;
    return { articles: mergeArticles(posts, (hidden.data as string[] | null) ?? []), posts, carousel: carousel && carousel.length ? carousel : null };
  } catch {
    // if the database cannot be reached, the built-in stories still show
    return { articles: mergeArticles([]), posts: [], carousel: null };
  }
}
