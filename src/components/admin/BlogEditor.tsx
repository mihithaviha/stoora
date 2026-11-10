'use client';
// Admin > Blogs > one story: write it, preview it, save it as a draft, publish it, unpublish it, delete it.
// Opening a built-in story edits it (the changes are saved as an edit of that story; Reset in the list brings the original back).
import '../../styles/brand/journal.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArticleView } from '../marketing/journal/ArticleView';
import { PhotoPicker } from './PhotoPicker';
import { Badge, Button, ConfirmDialog, DemoBar, EmptyState, Field, Icon, Segmented, Skeleton, Switch, useToast } from '../ui';
import { TOPICS } from '@/lib/journal';
import { deletePost, listPosts, savePost } from '@/lib/journal/admin-store';
import {
  LIMITS, articleToPost, blankPost, builtinBySlug, cleanBody, estimateMinutes, postToArticle, problemsOf, slugify,
  type BlogPost,
} from '@/lib/journal/posts';
import type { Block } from '@/lib/journal';
import { useLeaveGuard } from '@/lib/leave-guard';
import { getSupabase } from '@/lib/supabase/client';

type Kind = 'p' | 'h2' | 'h3' | 'ul' | 'ol' | 'callout' | 'image' | 'table';
const KINDS: [Kind, string, string][] = [['p', 'Paragraph', 'notes'], ['h2', 'Heading', 'title'], ['h3', 'Subheading', 'text_fields'], ['ul', 'Bullet list', 'format_list_bulleted'], ['ol', 'Numbered list', 'format_list_numbered'], ['callout', 'Tip box', 'lightbulb'], ['image', 'Picture', 'image']];
const kindOf = (b: Block): Kind => (b.h2 !== undefined ? 'h2' : b.h3 !== undefined ? 'h3' : b.ul ? 'ul' : b.ol ? 'ol' : b.callout ? 'callout' : b.image !== undefined ? 'image' : b.table ? 'table' : 'p');
const textOf = (b: Block) => (b.h2 ?? b.h3 ?? b.p ?? (b.ul ?? b.ol)?.join('\n') ?? b.callout?.[1] ?? '');
const blockOf = (kind: Kind, text = ''): Block => {
  switch (kind) {
    case 'h2': return { h2: text };
    case 'h3': return { h3: text };
    case 'ul': return { ul: text ? text.split('\n') : [''] };
    case 'ol': return { ol: text ? text.split('\n') : [''] };
    case 'callout': return { callout: ['Tip', text] };
    case 'image': return { image: '', caption: '' };
    default: return { p: text };
  }
};
function BlockEditor({ block, index, count, onChange, onMove, onRemove, onError }: { block: Block; index: number; count: number; onChange: (b: Block) => void; onMove: (by: -1 | 1) => void; onRemove: () => void; onError: (m: string) => void }) {
  const kind = kindOf(block);
  const n = index + 1;
  const switchTo = (k: Kind) => { if (k === kind) return; onChange(blockOf(k, k === 'image' ? '' : textOf(block))); };
  return (
    <div className="card stack tight" data-block={kind} style={{ padding: 'var(--s3)' }}>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        <label className="sr" htmlFor={`bk-kind-${index}`}>Type of block {n}</label>
        {kind === 'table'
          ? <span className="cap grow">Table (kept as it is)</span>
          : <select id={`bk-kind-${index}`} className="input" style={{ width: 'auto', minWidth: 160 }} value={kind} onChange={(e) => switchTo(e.target.value as Kind)}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}
        <span className="grow" />
        <button type="button" className="ibtn sm" aria-label={`Move block ${n} up`} disabled={index === 0} onClick={() => onMove(-1)}><Icon name="arrow_upward" size="sm" /></button>
        <button type="button" className="ibtn sm" aria-label={`Move block ${n} down`} disabled={index === count - 1} onClick={() => onMove(1)}><Icon name="arrow_downward" size="sm" /></button>
        <button type="button" className="ibtn sm" aria-label={`Delete block ${n}`} onClick={onRemove}><Icon name="delete" size="sm" /></button>
      </div>
      {(kind === 'p' || kind === 'h2' || kind === 'h3') && (
        <textarea className="input" rows={kind === 'p' ? 5 : 2} maxLength={LIMITS.text} aria-label={`${KINDS.find((k) => k[0] === kind)?.[1]} ${n}`} value={textOf(block)}
          placeholder={kind === 'p' ? 'Write the paragraph' : kind === 'h2' ? 'Heading' : 'Subheading'}
          onChange={(e) => onChange(kind === 'h2' ? { h2: e.target.value.replace(/\n/g, ' ') } : kind === 'h3' ? { h3: e.target.value.replace(/\n/g, ' ') } : { p: e.target.value })} />
      )}
      {(kind === 'ul' || kind === 'ol') && (
        <>
          <textarea className="input" rows={5} maxLength={LIMITS.text} aria-label={`${kind === 'ul' ? 'Bullet' : 'Numbered'} list ${n}`} value={textOf(block)} placeholder="One item on each line"
            onChange={(e) => { const items = e.target.value.split('\n').slice(0, LIMITS.items); onChange(kind === 'ul' ? { ul: items } : { ol: items }); }} />
          <span className="hint">One item on each line.</span>
        </>
      )}
      {kind === 'callout' && (
        <>
          <input className="input" maxLength={80} aria-label={`Tip box title ${n}`} placeholder="Title, for example Tip" value={block.callout?.[0] ?? ''} onChange={(e) => onChange({ callout: [e.target.value, block.callout?.[1] ?? ''] })} />
          <textarea className="input" rows={3} maxLength={LIMITS.text} aria-label={`Tip box text ${n}`} placeholder="What the reader should remember" value={block.callout?.[1] ?? ''} onChange={(e) => onChange({ callout: [block.callout?.[0] ?? '', e.target.value] })} />
        </>
      )}
      {kind === 'image' && (
        <>
          <PhotoPicker id={`bk-photo-${index}`} value={block.image ?? ''} onChange={(v) => onChange({ ...block, image: v })} onError={onError} />
          <input className="input" maxLength={200} aria-label={`Picture caption ${n}`} placeholder="Caption (optional)" value={block.caption ?? ''} onChange={(e) => onChange({ ...block, caption: e.target.value })} />
        </>
      )}
    </div>
  );
}

export function BlogEditor({ slug }: { slug: string }) {
  const router = useRouter();
  const toast = useToast();
  const isNew = slug === 'new';
  const [loaded, setLoaded] = useState(false);
  const [all, setAll] = useState<BlogPost[]>([]);
  const [post, setPost] = useState<BlogPost>(blankPost);
  const [saved, setSaved] = useState('');
  const [missing, setMissing] = useState(false);
  const [view, setView] = useState<'write' | 'preview'>('write');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState<'' | 'draft' | 'publish' | 'delete'>('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [confirm, setConfirm] = useState<'' | 'delete' | 'unpublish'>('');
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const live = Boolean(getSupabase());

  // open the story: a story written here, an edit of a built-in story, or a built-in story to start editing
  useEffect(() => {
    let off = false;
    listPosts().then((list) => {
      if (off) return;
      setAll(list);
      let start: BlogPost | null = null;
      if (isNew) start = blankPost();
      else {
        const found = list.find((p) => p.slug === slug) ?? null;
        if (found?.status === 'removed') start = null; // deleted for good
        else {
          start = found;
          const base = builtinBySlug(slug);
          if (!start && base) start = articleToPost(base);
        }
      }
      if (!start) setMissing(true); else { setPost(start); setSaved(JSON.stringify(start)); setSlugTouched(!isNew); }
      setLoaded(true);
    }).catch((e: Error) => { if (!off) { toast(`Couldn’t open the story: ${e.message}`, { icon: 'error' }); setMissing(true); setLoaded(true); } });
    return () => { off = true; };
  }, [slug, isNew, toast]);

  const dirty = loaded && !missing && JSON.stringify(post) !== saved;
  const guard = useLeaveGuard(dirty, (href) => setLeaveTo(href));
  const set = (patch: Partial<BlogPost>) => setPost((p) => ({ ...p, ...patch }));
  const setBody = (body: Block[]) => set({ body });
  const taken = useMemo(() => all.filter((p) => p.id !== post.id).map((p) => p.slug), [all, post.id]);
  const errors = useMemo(() => problemsOf(post, taken, post.status === 'published' || tried), [post, taken, tried]);
  const shownError = (k: string) => (tried ? errors[k] : undefined);
  const minutes = estimateMinutes(cleanBody(post.body), post.summary);
  const builtin = post.builtin;

  const save = async (status: 'draft' | 'published') => {
    setTried(true);
    const next: BlogPost = { ...post, status, body: cleanBody(post.body), minutes: estimateMinutes(cleanBody(post.body), post.summary), faq: post.faq.filter((f) => f.q.trim() || f.a.trim()).map((f) => ({ q: f.q.trim(), a: f.a.trim() })), carousel: post.carousel ?? null, pick: post.pick?.trim() || null };
    const found = problemsOf(next, taken, status === 'published');
    if (Object.keys(found).length) {
      toast(status === 'published' ? 'Fix the highlighted parts first.' : 'Fix the highlighted parts to save.', { icon: 'error' });
      document.querySelector<HTMLElement>('[aria-invalid="true"], .err')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setBusy(status === 'published' ? 'publish' : 'draft');
    try {
      const stored = await savePost(next);
      setPost(stored); setSaved(JSON.stringify(stored)); setAll((l) => (l.some((x) => x.id === stored.id) ? l.map((x) => (x.id === stored.id ? stored : x)) : [stored, ...l]));
      toast(status === 'published' ? (post.status === 'published' ? 'Story updated. Visitors see the changes now.' : builtin ? 'Story is back on Blogs.' : 'Story published.') : (builtin ? 'Story deleted from Blogs. You can restore it from the list.' : 'Draft saved.'), { icon: status === 'published' ? 'public' : 'save' });
      if (stored.slug !== slug) { await guard.release(); router.replace(`/admin/blogs/${stored.slug}`); }
    } catch (e) { toast(`Couldn’t save: ${(e as Error).message}`, { icon: 'error' }); } finally { setBusy(''); }
  };

  const remove = async () => {
    if (!post.id) { await guard.release(); router.push('/admin/blogs'); return; }
    setBusy('delete');
    try { await deletePost(post.id); toast(builtin ? 'Back to the original story.' : 'Story deleted.', { icon: 'delete' }); await guard.release(); router.push('/admin/blogs'); }
    catch (e) { toast(`Couldn’t do that: ${(e as Error).message}`, { icon: 'error' }); setBusy(''); }
  };

  if (!loaded) return <Skeleton rows={4} height={72} />;
  if (missing) return <EmptyState icon="search_off" title="We couldn’t find that story" text="It may have been deleted." action={<Link className="btn primary" href="/admin/blogs">Back to Blogs</Link>} />;

  const published = post.status === 'published';
  const previewArticle = postToArticle({ ...post, body: cleanBody(post.body), minutes });
  const move = (i: number, by: -1 | 1) => { const next = [...post.body]; const j = i + by; if (j < 0 || j >= next.length) return; [next[i], next[j]] = [next[j], next[i]]; setBody(next); };

  return (
    <>
      {!live && <DemoBar>Demo mode: this story is kept in this browser only.</DemoBar>}
      <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--s2)', marginBottom: 'var(--s3)' }}>
        <Link className="btn line sm" href="/admin/blogs"><Icon name="arrow_back" size="sm" />All stories</Link>
        <h1 className="h2 grow" style={{ margin: 0, minWidth: 180 }}>{isNew && !post.title ? 'New story' : post.title || 'Untitled story'}</h1>
        <Badge tone={published ? 'ok' : 'warn'} icon={published ? 'check_circle' : builtin ? 'visibility_off' : 'edit_note'}>{published ? 'Published' : builtin ? 'Hidden' : 'Draft'}</Badge>
        {dirty ? <span className="cap" role="status">Unsaved changes</span> : <span className="cap" role="status">All changes saved</span>}
      </div>

      <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--s2)', marginBottom: 'var(--s3)' }}>
        <Segmented label="Write or preview" value={view} onChange={setView} options={[{ value: 'write', label: 'Write' }, { value: 'preview', label: 'Preview' }]} />
        <span className="grow" />
        {published
          ? <><Button kind="primary" icon="public" busy={busy === 'publish'} busyLabel="Saving…" onClick={() => save('published')}>Update story</Button><Button icon="visibility_off" disabled={!!busy} onClick={() => setConfirm('unpublish')}>{builtin ? 'Delete from Blogs' : 'Unpublish'}</Button></>
          : <><Button icon="save" busy={busy === 'draft'} busyLabel="Saving…" onClick={() => save('draft')}>Save draft</Button><Button kind="primary" icon="public" busy={busy === 'publish'} busyLabel={builtin ? 'Restoring…' : 'Publishing…'} onClick={() => save('published')}>{builtin ? 'Restore' : 'Publish'}</Button></>}
        {published && !dirty ? <Link className="btn quiet" href={`/blogs/${post.slug}`} target="_blank" rel="noopener noreferrer"><Icon name="open_in_new" size="sm" />View</Link> : null}
        {post.id ? <Button kind="quiet" icon="delete" disabled={!!busy} onClick={() => setConfirm('delete')}>{builtin ? 'Reset to original' : 'Delete'}</Button> : null}
      </div>

      {view === 'preview' ? (
        <div className="card flush" style={{ overflow: 'hidden' }}>
          <p className="cap" style={{ padding: 'var(--s3)', margin: 0 }}>This is how the story will look. {published ? 'It is live.' : 'It is not live yet.'}</p>
          <div className="jr" data-testid="blog-preview" style={{ pointerEvents: 'none' }}><ArticleView article={previewArticle} origin="https://stoora.in" related={[]} /></div>
        </div>
      ) : (
        <div className="stack" style={{ maxWidth: 860 }}>
          <div className="card stack">
            <Field id="bl-title" label="Title" required hint={`${post.title.length}/${LIMITS.title}`} error={shownError('title')}>
              <input id="bl-title" className={`input${shownError('title') ? ' bad' : ''}`} maxLength={LIMITS.title} value={post.title} aria-invalid={shownError('title') ? true : undefined}
                onChange={(e) => { const title = e.target.value; set({ title, ...(!slugTouched && !builtin ? { slug: slugify(title) } : {}) }); }} />
            </Field>
            <Field id="bl-slug" label="Web address" hint={builtin ? 'A built-in story keeps its address.' : `stoora.in/blogs/${post.slug || 'your-story'}`} error={shownError('slug')}>
              <input id="bl-slug" className={`input${shownError('slug') ? ' bad' : ''}`} maxLength={LIMITS.slug} value={post.slug} disabled={builtin} aria-invalid={shownError('slug') ? true : undefined}
                onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }); }} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              <Field id="bl-topic" label="Topic"><select id="bl-topic" className="input" value={post.topic} onChange={(e) => set({ topic: e.target.value })}>{TOPICS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
              <Field id="bl-date" label="Published on" error={shownError('published')}><input id="bl-date" className="input" type="date" value={post.published} onChange={(e) => set({ published: e.target.value })} /></Field>
            </div>
            <Field id="bl-photo" label="Cover picture" required={published || tried} error={shownError('photo')}>
              <PhotoPicker id="bl-photo" value={post.photo} onChange={(v) => set({ photo: v })} onError={(m) => toast(m, { icon: 'error' })} />
            </Field>
          </div>

          <div className="card stack">
            <Field id="bl-excerpt" label="Teaser" hint={`${post.excerpt.length}/${LIMITS.excerpt}. Shown on the cards and when the story is shared.`} error={shownError('excerpt')}>
              <textarea id="bl-excerpt" className={`input${shownError('excerpt') ? ' bad' : ''}`} rows={2} maxLength={LIMITS.excerpt} value={post.excerpt} aria-invalid={shownError('excerpt') ? true : undefined} onChange={(e) => set({ excerpt: e.target.value })} />
            </Field>
            <Field id="bl-summary" label="The short answer" hint={`${post.summary.length}/${LIMITS.summary}. A sentence or two at the top of the story.`} error={shownError('summary')}>
              <textarea id="bl-summary" className={`input${shownError('summary') ? ' bad' : ''}`} rows={3} maxLength={LIMITS.summary} value={post.summary} aria-invalid={shownError('summary') ? true : undefined} onChange={(e) => set({ summary: e.target.value })} />
            </Field>
          </div>

          <div className="stack tight">
            <h2 className="h3" style={{ margin: 0 }}>The story</h2>
            {shownError('body') ? <span className="err" role="alert"><Icon name="error" size="xs" />{shownError('body')}</span> : null}
            {post.body.map((b, i) => (
              <BlockEditor key={i} block={b} index={i} count={post.body.length}
                onChange={(nb) => setBody(post.body.map((x, n) => (n === i ? nb : x)))} onMove={(by) => move(i, by)} onRemove={() => setBody(post.body.filter((_, n) => n !== i))} onError={(m) => toast(m, { icon: 'error' })} />
            ))}
            {post.body.length < LIMITS.blocks ? (
              <div className="card" style={{ padding: 'var(--s3)' }}>
                <span className="cap" style={{ display: 'block', marginBottom: 8 }}>Add to the story</span>
                <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>{KINDS.map(([k, l, icon]) => <Button key={k} small icon={icon} onClick={() => setBody([...post.body, blockOf(k)])}>{l}</Button>)}</div>
              </div>
            ) : <p className="cap">That is the most blocks a story can have.</p>}
            <p className="cap">About {minutes} min read. {cleanBody(post.body).length} blocks.</p>
          </div>

          <div className="card stack">
            <h2 className="h3" style={{ margin: 0 }}>Questions sellers ask</h2>
            {post.faq.map((f, i) => (
              <div className="stack tight" key={i}>
                <Field id={`faq-q-${i}`} label={`Question ${i + 1}`} error={shownError(`faq${i}`)}><input id={`faq-q-${i}`} className="input" maxLength={200} value={f.q} onChange={(e) => set({ faq: post.faq.map((x, n) => (n === i ? { ...x, q: e.target.value } : x)) })} /></Field>
                <Field id={`faq-a-${i}`} label="Answer"><textarea id={`faq-a-${i}`} className="input" rows={3} maxLength={1000} value={f.a} onChange={(e) => set({ faq: post.faq.map((x, n) => (n === i ? { ...x, a: e.target.value } : x)) })} /></Field>
                <div><Button small kind="quiet" icon="delete" onClick={() => set({ faq: post.faq.filter((_, n) => n !== i) })}>Remove question</Button></div>
              </div>
            ))}
            {post.faq.length < LIMITS.faq ? <div><Button small icon="add" onClick={() => set({ faq: [...post.faq, { q: '', a: '' }] })}>Add a question</Button></div> : <p className="cap">That is the most questions a story can have.</p>}
          </div>

          <div className="card stack">
            <h2 className="h3" style={{ margin: 0 }}>Where it shows</h2>
            <p className="cap" style={{ margin: 0 }}>The moving carousel at the top of Blogs is set up in <Link className="link" href="/admin/blogs/carousel">Blogs &gt; Carousel</Link>: choose 6 stories and a picture for each.</p>
            <div className="toggle-row"><span className="grow"><span className="t-ink" style={{ fontWeight: 500, display: 'block' }}>Editor’s pick</span><span className="cap">Make this the story in the Editor’s pick section (the newest pick wins).</span></span>
              <Switch label="Editor’s pick" checked={post.pick != null} onChange={(v) => set({ pick: v ? post.pick || 'A story worth your time this week.' : null })} /></div>
            {post.pick != null ? <Field id="bl-pick" label="Why it was picked"><input id="bl-pick" className="input" maxLength={LIMITS.pick} value={post.pick} onChange={(e) => set({ pick: e.target.value })} /></Field> : null}
          </div>
        </div>
      )}

      <ConfirmDialog open={confirm === 'delete'} onClose={() => setConfirm('')} danger
        title={builtin ? 'Go back to the original story?' : 'Delete this story?'} yes={builtin ? 'Reset story' : 'Delete story'}
        body={builtin ? 'Your changes to this built-in story are removed and the original comes back.' : 'It is removed from Blogs and cannot be brought back.'} onYes={() => void remove()} />
      <ConfirmDialog open={confirm === 'unpublish'} onClose={() => setConfirm('')}
        title={builtin ? 'Delete this story from Blogs?' : 'Unpublish this story?'} yes={builtin ? 'Delete story' : 'Unpublish'}
        body={builtin ? 'Visitors will no longer see it. It stays in the list as Hidden, so you can restore it any time.' : 'Visitors will no longer see it. It stays here as a draft.'} onYes={() => void save('draft')} />
      <ConfirmDialog open={leaveTo !== null} onClose={() => { setLeaveTo(null); guard.stay(); }} title="Leave without saving?" body="Your changes to this story won’t be saved." yes="Leave" danger onYes={() => { if (leaveTo !== null) guard.leave(leaveTo); }} />
    </>
  );
}
