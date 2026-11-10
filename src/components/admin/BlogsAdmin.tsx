'use client';
// Admin > Blogs: every story on the public Blogs, with its status, and the way into the editor.
// Built-in stories (written in code) can be edited, hidden and reset; new stories can be written, published, unpublished and deleted.
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Chips, ConfirmDialog, DemoBar, Dialog, EmptyState, Icon, PageHeader, SearchBox, Skeleton, useToast } from '../ui';
import { ARTICLES, formatDate, topicOf } from '@/lib/journal';
import { deletePost, listPosts, savePost } from '@/lib/journal/admin-store';
import { articleToPost, builtinBySlug, type BlogPost } from '@/lib/journal/posts';
import { getSupabase } from '@/lib/supabase/client';

type Filter = 'all' | 'published' | 'draft';
interface Row { slug: string; title: string; topic: string; date: string; status: 'published' | 'draft'; kind: 'built-in' | 'edited' | 'new'; post?: BlogPost }

/** One row for every story: the built-in ones (with the team's edit, if any) and the stories written in the admin. */
export function rowsOf(posts: BlogPost[]): Row[] {
  const bySlug = new Map(posts.filter((p) => p.builtin).map((p) => [p.slug, p]));
  const rows: Row[] = ARTICLES.filter((a) => bySlug.get(a.slug)?.status !== 'removed').map((a) => {
    const edit = bySlug.get(a.slug);
    return edit
      ? { slug: a.slug, title: edit.title, topic: edit.topic, date: edit.published, status: edit.status === 'published' ? 'published' : 'draft', kind: 'edited', post: edit }
      : { slug: a.slug, title: a.title, topic: a.topic, date: a.published, status: 'published', kind: 'built-in' };
  });
  for (const p of posts) if (!p.builtin && p.status !== 'removed') rows.push({ slug: p.slug, title: p.title, topic: p.topic, date: p.published, status: p.status === 'published' ? 'published' : 'draft', kind: 'new', post: p });
  return rows.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

export function BlogsAdmin() {
  const toast = useToast();
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [del, setDel] = useState<Row | null>(null);
  const [reset, setReset] = useState<Row | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busyAll, setBusyAll] = useState(false);
  const [foreverOpen, setForeverOpen] = useState(false);
  const [foreverTyped, setForeverTyped] = useState('');
  const [busyForever, setBusyForever] = useState(false);
  const live = Boolean(getSupabase());

  const load = useCallback(() => { listPosts().then(setPosts).catch((e: Error) => { toast(`Couldn’t load the stories: ${e.message}`, { icon: 'error' }); setPosts([]); }); }, [toast]);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => rowsOf(posts ?? []), [posts]);
  const shown = useMemo(() => rows.filter((r) => (filter === 'all' || r.status === filter) && (!q.trim() || `${r.title} ${r.slug} ${topicOf(r.topic).name}`.toLowerCase().includes(q.trim().toLowerCase()))), [rows, filter, q]);
  const count = (s: Filter) => (s === 'all' ? rows.length : rows.filter((r) => r.status === s).length);

  /** Delete a story. One you wrote is removed for good. A built-in story is taken off Blogs and kept here as Hidden, so it can be restored. */
  const remove = async (row: Row) => {
    try {
      if (row.kind === 'new' && row.post) { await deletePost(row.post.id); toast('Story deleted.', { icon: 'delete' }); }
      else {
        const base = row.post ?? (builtinBySlug(row.slug) ? articleToPost(builtinBySlug(row.slug)!) : null);
        if (!base) return;
        await savePost({ ...base, status: 'draft' });
        toast('Story deleted from Blogs. You can restore it from this list.', { icon: 'delete' });
      }
      load();
    } catch (e) { toast(`Couldn’t do that: ${(e as Error).message}`, { icon: 'error' }); }
  };
  /** Delete every story that is on Blogs or written here: new stories for good, built-in ones off Blogs (kept as Hidden). */
  const removeAll = async () => {
    const targets = rows.filter((r) => r.kind === 'new' || r.status === 'published');
    setBusyAll(true);
    let done = 0;
    try {
      for (const r of targets) {
        if (r.kind === 'new' && r.post) await deletePost(r.post.id);
        else {
          const base = r.post ?? (builtinBySlug(r.slug) ? articleToPost(builtinBySlug(r.slug)!) : null);
          if (base) await savePost({ ...base, status: 'draft' });
        }
        done += 1;
      }
      toast(`Deleted ${done} ${done === 1 ? 'story' : 'stories'}. Built-in ones are kept as Hidden, so you can restore them.`, { icon: 'delete' });
      setAllOpen(false); setTyped('');
    } catch (e) { toast(`Stopped after ${done} of ${targets.length}: ${(e as Error).message}`, { icon: 'error' }); }
    finally { setBusyAll(false); load(); }
  };
  /** Delete every draft and hidden story for good. Stories written here are removed; a built-in one is marked removed so it never comes back. */
  const removeDrafts = async () => {
    const targets = rows.filter((r) => r.status === 'draft');
    setBusyForever(true);
    let done = 0;
    try {
      for (const r of targets) {
        if (r.kind === 'new' && r.post) await deletePost(r.post.id);
        else if (r.post) await savePost({ ...r.post, status: 'removed' });
        done += 1;
      }
      toast(`Deleted ${done} ${done === 1 ? 'story' : 'stories'} for good.`, { icon: 'delete_forever' });
      setForeverOpen(false); setForeverTyped(''); setFilter('all');
    } catch (e) { toast(`Stopped after ${done} of ${targets.length}: ${(e as Error).message}`, { icon: 'error' }); }
    finally { setBusyForever(false); load(); }
  };
  const draftCount = rows.filter((r) => r.status === 'draft').length;
  const deletable = rows.filter((r) => r.kind === 'new' || r.status === 'published').length;
  /** Put a hidden built-in story back on Blogs (keeping any edits). */
  const restore = async (row: Row) => {
    if (!row.post) return;
    try { await savePost({ ...row.post, status: 'published' }); toast('Story is back on Blogs.', { icon: 'public' }); load(); }
    catch (e) { toast(`Couldn’t do that: ${(e as Error).message}`, { icon: 'error' }); }
  };
  /** Throw away the team's edit of a built-in story: the original comes back. */
  const resetOriginal = async (row: Row) => {
    if (!row.post) return;
    try { await deletePost(row.post.id); toast('Back to the original story.', { icon: 'undo' }); load(); }
    catch (e) { toast(`Couldn’t do that: ${(e as Error).message}`, { icon: 'error' }); }
  };

  if (!posts) return <Skeleton rows={5} height={56} />;
  return (
    <>
      {!live && <DemoBar>Demo mode: stories you write here are kept in this browser only. With a real database they are saved for everyone.</DemoBar>}
      <PageHeader title="Blogs" lede="Write, edit and publish the stories on stoora.in/blogs."
        actions={<><Link className="btn primary" href="/admin/blogs/new"><Icon name="edit" />New story</Link><Link className="btn line" href="/admin/blogs/carousel"><Icon name="view_carousel" />Carousel</Link>{deletable > 0 ? <Button kind="danger" icon="delete_forever" onClick={() => { setTyped(''); setAllOpen(true); }}>Delete all</Button> : null}<Link className="btn line" href="/blogs" target="_blank" rel="noopener noreferrer"><Icon name="open_in_new" />View Blogs</Link></>} />
      <div className="stack">
        <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--s2)' }}>
          <div className="grow" style={{ minWidth: 220 }}><SearchBox id="blog-q" value={q} onChange={setQ} placeholder="Search stories" /></div>
          <Chips label="Status" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All', count: count('all') }, { value: 'published', label: 'Published', count: count('published') }, { value: 'draft', label: 'Draft or hidden', count: count('draft') }]} />
        </div>
        {filter === 'draft' && draftCount > 0 ? (
          <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'space-between', gap: 'var(--s2)' }}>
            <span className="cap">{draftCount} {draftCount === 1 ? 'story is' : 'stories are'} in drafts or hidden.</span>
            <Button kind="danger" icon="delete_forever" onClick={() => { setForeverTyped(''); setForeverOpen(true); }}>Delete all permanently</Button>
          </div>
        ) : null}
        {shown.length === 0 ? <EmptyState icon="search_off" title="No stories here" text="Try another filter, or write a new story." action={<Button small onClick={() => { setQ(''); setFilter('all'); }}>Show all</Button>} /> : (
          <div className="card flush blog-list" data-testid="blogs-table">
            {shown.map((r) => (
              <div className="blog-row" key={r.slug} data-slug={r.slug}>
                <div className="blog-main">
                  <Link className="link blog-title" href={`/admin/blogs/${r.slug}`}>{r.title}</Link>
                  <span className="cap">/blogs/{r.slug} · {topicOf(r.topic).name} · {formatDate(r.date)}{r.kind === 'built-in' ? ' · built-in' : r.kind === 'edited' ? ' · built-in, edited' : ''}</span>
                </div>
                <Badge tone={r.status === 'published' ? 'ok' : 'warn'} icon={r.status === 'published' ? 'check_circle' : r.kind === 'new' ? 'edit_note' : 'visibility_off'}>{r.status === 'published' ? 'Published' : r.kind === 'new' ? 'Draft' : 'Hidden'}</Badge>
                <span className="blog-acts">
                  <Link className="btn line sm" href={`/admin/blogs/${r.slug}`}>Edit</Link>
                  {r.status === 'published' ? <Link className="btn quiet sm" href={`/blogs/${r.slug}`} target="_blank" rel="noopener noreferrer">View</Link> : null}
                  {r.kind === 'edited' && r.status === 'draft' ? <Button small kind="quiet" onClick={() => void restore(r)}>Restore</Button> : null}
                  {r.kind === 'edited' ? <Button small kind="quiet" onClick={() => setReset(r)}>Reset</Button> : null}
                  {r.status === 'published' || r.kind === 'new' ? <Button small kind="quiet" onClick={() => setDel(r)}>Delete</Button> : null}
                </span>
              </div>))}
          </div>
        )}
      </div>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} danger title="Delete this story?"
        body={del?.kind === 'new' ? 'It is removed from Blogs and cannot be brought back.' : 'It is removed from Blogs. It stays in this list as Hidden, so you can restore it.'}
        yes="Delete story" onYes={() => { if (del) void remove(del); }} />
      <Dialog open={allOpen} onClose={() => { if (!busyAll) setAllOpen(false); }} title="Delete all stories?"
        footer={<><Button onClick={() => setAllOpen(false)} disabled={busyAll}>Not now</Button><Button kind="danger" icon="delete_forever" disabled={typed.trim().toLowerCase() !== 'delete all'} busy={busyAll} busyLabel="Deleting…" onClick={() => void removeAll()}>Delete {deletable} {deletable === 1 ? 'story' : 'stories'}</Button></>}>
        <div className="stack tight">
          <p className="t-soft">This takes {deletable} {deletable === 1 ? 'story' : 'stories'} off Blogs. Stories you wrote are removed for good. Built-in stories stay in the list as Hidden, so you can restore them one by one.</p>
          <label className="flabel" htmlFor="blog-delall">Type <b>delete all</b> to confirm</label>
          <input id="blog-delall" className="input" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
        </div>
      </Dialog>
      <Dialog open={foreverOpen} onClose={() => { if (!busyForever) setForeverOpen(false); }} title="Delete all drafts for good?"
        footer={<><Button onClick={() => setForeverOpen(false)} disabled={busyForever}>Not now</Button><Button kind="danger" icon="delete_forever" disabled={foreverTyped.trim().toLowerCase() !== 'delete forever'} busy={busyForever} busyLabel="Deleting…" onClick={() => void removeDrafts()}>Delete {draftCount} {draftCount === 1 ? 'story' : 'stories'} for good</Button></>}>
        <div className="stack tight">
          <p className="t-soft">This permanently deletes the {draftCount} {draftCount === 1 ? 'story' : 'stories'} in Draft or hidden. They cannot be brought back, and built-in stories deleted this way never return to Blogs.</p>
          <label className="flabel" htmlFor="blog-delforever">Type <b>delete forever</b> to confirm</label>
          <input id="blog-delforever" className="input" autoComplete="off" value={foreverTyped} onChange={(e) => setForeverTyped(e.target.value)} />
        </div>
      </Dialog>
      <ConfirmDialog open={!!reset} onClose={() => setReset(null)} danger title="Go back to the original story?"
        body="Your changes to this built-in story are removed and the original comes back." yes="Reset story" onYes={() => { if (reset) void resetOriginal(reset); }} />
    </>
  );
}
