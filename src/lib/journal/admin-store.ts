'use client';
// What the Blogs admin reads and writes. Live mode: the blog_posts table and the blog-images bucket in Supabase (admins only, enforced by
// row level security). Demo mode: this browser's storage, so every screen can be tried without a login.
import { getSupabase } from '../supabase/client';
import { shrinkImage } from '../storefront/draft';
import { carouselFrom, postFromRow, readLocalCarousel, readLocalPosts, writeLocalCarousel, writeLocalPosts, type BlogPost, type CarouselItem } from './posts';

const fail = (e: { message: string; code?: string } | null) => {
  if (!e) return;
  if (e.code === '23505') throw new Error('Another story already has this address. Change it a little.');
  if (e.code === '42501' || /row-level security/i.test(e.message)) throw new Error('Only admins can change stories. Ask an admin to switch your account on.');
  throw new Error(e.message);
};

/** Ask the public Blogs pages to refresh now (live mode). A failure is harmless: they refresh by themselves within a minute. */
async function refreshPublic() {
  if (!getSupabase()) return;
  try { await fetch('/api/blogs/revalidate', { method: 'POST' }); } catch { /* ignore */ }
}

export async function listPosts(): Promise<BlogPost[]> {
  const sb = getSupabase();
  if (!sb) return readLocalPosts();
  const { data, error } = await sb.from('blog_posts').select('*').order('updated_at', { ascending: false }).limit(500);
  fail(error);
  return (data ?? []).map(postFromRow);
}

const rowOf = (p: BlogPost) => ({
  slug: p.slug, title: p.title.trim(), excerpt: p.excerpt.trim(), summary: p.summary.trim(), topic: p.topic, photo: p.photo, published: p.published, minutes: p.minutes,
  body: p.body, faq: p.faq, carousel: p.carousel ?? null, pick: p.pick?.trim() || null, status: p.status, builtin: p.builtin,
});

/** Save a new post (no id yet) or changes to an existing one. Returns what was stored. */
export async function savePost(post: BlogPost): Promise<BlogPost> {
  const sb = getSupabase();
  if (!sb) {
    const list = readLocalPosts();
    const stored: BlogPost = { ...post, id: post.id || crypto.randomUUID(), updatedAt: new Date().toISOString() };
    if (list.some((x) => x.slug === stored.slug && x.id !== stored.id)) throw new Error('Another story already has this address. Change it a little.');
    const next = post.id ? list.map((x) => (x.id === stored.id ? stored : x)) : [stored, ...list];
    if (!writeLocalPosts(next)) throw new Error('This browser has no room left for more pictures. Use smaller pictures, or delete an old draft.');
    return stored;
  }
  const row = rowOf(post);
  const q = post.id ? sb.from('blog_posts').update(row).eq('id', post.id) : sb.from('blog_posts').insert(row);
  const { data, error } = await q.select('*').single();
  fail(error);
  await refreshPublic();
  return postFromRow(data!);
}

export async function deletePost(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) { writeLocalPosts(readLocalPosts().filter((x) => x.id !== id)); return; }
  const { error } = await sb.from('blog_posts').delete().eq('id', id);
  fail(error);
  await refreshPublic();
}

/** Upload a picture for a story and return the address to store. Demo mode keeps a small copy inside the post itself. */
export async function uploadImage(file: File): Promise<string> {
  if (file.size > 12 * 1024 * 1024) throw new Error('That picture is too big. Use one under 12 MB.');
  const dataUrl = await shrinkImage(file); // checks the type, shrinks the longest side to 1600px
  const sb = getSupabase();
  if (!sb) return dataUrl;
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await sb.storage.from('blog-images').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  fail(error);
  return sb.storage.from('blog-images').getPublicUrl(path).data.publicUrl;
}

/** The carousel the team chose, or null while it is still the default. */
export async function getCarousel(): Promise<CarouselItem[] | null> {
  const sb = getSupabase();
  if (!sb) return readLocalCarousel();
  const { data, error } = await sb.from('blog_settings').select('value').eq('key', 'carousel').maybeSingle();
  fail(error);
  const list = data ? carouselFrom(data.value) : [];
  return list.length ? list : null;
}

/** Save the carousel (the stories in order, each with an optional picture of its own). null puts it back to the default. */
export async function saveCarousel(items: CarouselItem[] | null): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    if (!writeLocalCarousel(items)) throw new Error('This browser has no room left for more pictures. Use smaller pictures.');
    return;
  }
  const { error } = items
    ? await sb.from('blog_settings').upsert({ key: 'carousel', value: items, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    : await sb.from('blog_settings').delete().eq('key', 'carousel');
  fail(error);
  await refreshPublic();
}
