'use client';
// Admin > Blogs > Carousel: the 6 stories in the moving ring at the top of /blogs, in order, each with an optional picture of its own.
// Every other story is listed under the carousel on the public page.
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PhotoPicker } from './PhotoPicker';
import { Button, ConfirmDialog, DemoBar, Icon, Skeleton, useToast } from '../ui';
import { getCarousel, listPosts, saveCarousel } from '@/lib/journal/admin-store';
import { CAROUSEL_SIZE, RING, buildJournal, mergeArticles, wordCount, type CarouselItem } from '@/lib/journal/posts';
import type { Article } from '@/lib/journal';
import { useLeaveGuard } from '@/lib/leave-guard';
import { getSupabase } from '@/lib/supabase/client';

interface Slot { slug: string; photo: string; title: string; text: string }
const blank = (): Slot => ({ slug: '', photo: '', title: '', text: '' });
const pad = (list: Slot[]): Slot[] => [...list, ...Array.from({ length: Math.max(0, CAROUSEL_SIZE - list.length) }, blank)].slice(0, CAROUSEL_SIZE);
const fromItem = (x: CarouselItem): Slot => ({ slug: x.slug, photo: x.photo ?? '', title: x.title ?? '', text: x.text ?? '' });

export function CarouselAdmin() {
  const toast = useToast();
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [slots, setSlots] = useState<Slot[]>(pad([]));
  const [saved, setSaved] = useState('');
  const [custom, setCustom] = useState(false);
  const [lost, setLost] = useState(0);
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const live = Boolean(getSupabase());

  useEffect(() => {
    let off = false;
    Promise.all([listPosts(), getCarousel()]).then(([posts, ring]) => {
      if (off) return;
      const list = mergeArticles(posts);
      const have = new Set(list.map((a) => a.slug));
      const mine = (ring ?? []).filter((x) => have.has(x.slug));
      // until the team chooses, the slots start from the default carousel (its cards already hold a short text)
      const start = pad((mine.length ? mine.map(fromItem) : buildJournal(list).carousel.map((a) => ({ slug: a.slug, photo: '', title: '', text: a.excerpt }))).slice(0, CAROUSEL_SIZE));
      setArticles(list); setSlots(start); setSaved(JSON.stringify(start)); setCustom(Boolean(ring)); setLost((ring ?? []).length - mine.length);
    }).catch((e: Error) => { if (!off) { toast(`Couldn’t open the carousel: ${e.message}`, { icon: 'error' }); setArticles([]); } });
    return () => { off = true; };
  }, [toast]);

  const dirty = articles !== null && JSON.stringify(slots) !== saved;
  const guard = useLeaveGuard(dirty, (href) => setLeaveTo(href));
  const bySlug = useMemo(() => new Map((articles ?? []).map((a) => [a.slug, a])), [articles]);
  const chosen = slots.map((s) => s.slug).filter(Boolean);
  const wordsProblem = (): string => {
    for (let i = 0; i < slots.length; i += 1) {
      const s = slots[i];
      if (!s.slug) continue;
      if (wordCount(s.title) > RING.titleWords) return `Slide ${i + 1}: keep the headline to ${RING.titleWords} words or fewer.`;
      const w = wordCount(s.text);
      if (w < RING.minTextWords) return `Slide ${i + 1}: write a short description (at least ${RING.minTextWords} words).`;
      if (w > RING.textWords) return `Slide ${i + 1}: keep the description to ${RING.textWords} words or fewer.`;
    }
    return '';
  };
  const problem = chosen.length < CAROUSEL_SIZE ? `Choose ${CAROUSEL_SIZE - chosen.length} more ${CAROUSEL_SIZE - chosen.length === 1 ? 'story' : 'stories'}: the carousel needs exactly ${CAROUSEL_SIZE}.` : new Set(chosen).size < chosen.length ? 'A story can be in the carousel only once.' : wordsProblem();
  const set = (i: number, patch: Partial<Slot>) => setSlots((l) => l.map((s, n) => (n === i ? { ...s, ...patch } : s)));
  const move = (i: number, by: -1 | 1) => setSlots((l) => { const j = i + by; if (j < 0 || j >= l.length) return l; const next = [...l]; [next[i], next[j]] = [next[j], next[i]]; return next; });

  const save = async () => {
    if (problem) { toast(problem, { icon: 'error' }); return; }
    setBusy(true);
    try {
      await saveCarousel(slots.map((s) => ({ slug: s.slug, ...(s.photo ? { photo: s.photo } : {}), ...(s.title.trim() ? { title: s.title.trim() } : {}), text: s.text.trim() })));
      setSaved(JSON.stringify(slots)); setCustom(true); setLost(0);
      toast('Carousel saved. Blogs now shows these 6 stories.', { icon: 'public' });
    } catch (e) { toast(`Couldn’t save: ${(e as Error).message}`, { icon: 'error' }); } finally { setBusy(false); }
  };
  const reset = async () => {
    setBusy(true);
    try {
      await saveCarousel(null);
      const start = pad(buildJournal(articles ?? []).carousel.slice(0, CAROUSEL_SIZE).map((a) => ({ slug: a.slug, photo: '', title: '', text: a.excerpt })));
      setSlots(start); setSaved(JSON.stringify(start)); setCustom(false); setLost(0);
      toast('Back to the default carousel.', { icon: 'undo' });
    } catch (e) { toast(`Couldn’t do that: ${(e as Error).message}`, { icon: 'error' }); } finally { setBusy(false); }
  };

  if (!articles) return <Skeleton rows={4} height={96} />;
  return (
    <>
      {!live && <DemoBar>Demo mode: the carousel you set up here is kept in this browser only.</DemoBar>}
      <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--s2)', marginBottom: 'var(--s3)' }}>
        <Link className="btn line sm" href="/admin/blogs"><Icon name="arrow_back" size="sm" />All stories</Link>
        <h1 className="h2 grow" style={{ margin: 0, minWidth: 180 }}>Carousel</h1>
        <span className="cap" role="status">{dirty ? 'Unsaved changes' : custom ? 'Saved' : 'Using the default'}</span>
      </div>
      <p className="t-soft" style={{ maxWidth: 720 }}>Choose the {CAROUSEL_SIZE} stories in the moving carousel at the top of Blogs, and a picture for each. Every other story is listed under the carousel.</p>
      {lost > 0 ? <p className="err" role="alert" style={{ maxWidth: 720 }}><Icon name="error" size="xs" />{lost === 1 ? 'A story in the carousel was taken down' : `${lost} stories in the carousel were taken down`}. Choose {lost === 1 ? 'another' : 'others'} and save.</p> : null}

      <div className="stack" style={{ maxWidth: 860, marginTop: 'var(--s3)' }}>
        {slots.map((slot, i) => {
          const story = bySlug.get(slot.slug);
          const options = (articles ?? []).filter((a) => a.slug === slot.slug || !chosen.includes(a.slug));
          return (
            <div className="card stack tight" key={i} data-slot={i + 1}>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                <b className="t-ink">Slide {i + 1}</b><span className="grow" />
                <button type="button" className="ibtn sm" aria-label={`Move slide ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}><Icon name="arrow_upward" size="sm" /></button>
                <button type="button" className="ibtn sm" aria-label={`Move slide ${i + 1} down`} disabled={i === slots.length - 1} onClick={() => move(i, 1)}><Icon name="arrow_downward" size="sm" /></button>
              </div>
              <label className="flabel" htmlFor={`ring-text-${i}`}>Short description</label>
              <textarea id={`ring-text-${i}`} className={`input${slot.slug && wordCount(slot.text) > RING.textWords ? ' bad' : ''}`} rows={2} maxLength={RING.textChars} value={slot.text} placeholder="One or two short lines that make people want to read the story"
                aria-describedby={`ring-text-hint-${i}`} onChange={(e) => set(i, { text: e.target.value })} />
              <span className={`hint${wordCount(slot.text) > RING.textWords ? ' err' : ''}`} id={`ring-text-hint-${i}`}>{wordCount(slot.text)} of {RING.textWords} words. Keep it short so the card stays tidy.</span>
              <label className="flabel" htmlFor={`ring-title-${i}`}>Card headline <span className="cap">(optional)</span></label>
              <input id={`ring-title-${i}`} className="input" maxLength={RING.titleChars} value={slot.title} placeholder={story ? story.title : 'The story’s own title is used'} onChange={(e) => set(i, { title: e.target.value })} />
              <span className="hint">{wordCount(slot.title)} of {RING.titleWords} words. Leave empty to use the story’s title.</span>
              <label className="flabel" htmlFor={`ring-story-${i}`}>Opens this story</label>
              <select id={`ring-story-${i}`} className="input" value={slot.slug} onChange={(e) => set(i, { slug: e.target.value })}>
                <option value="">Choose the story the card opens</option>
                {options.map((a) => <option key={a.slug} value={a.slug}>{a.title}</option>)}
              </select>
              <span className="flabel">Picture</span>
              <PhotoPicker id={`ring-photo-${i}`} value={slot.photo} fallback={story?.photo ?? ''} empty="Choose a story first" removeLabel="Use the story’s cover"
                onChange={(v) => set(i, { photo: v })} onError={(m) => toast(m, { icon: 'error' })} />
              <span className="hint">{slot.photo ? 'This picture shows in the carousel. The story keeps its own cover.' : story ? 'Showing the story’s cover. Pick or upload another picture to change it.' : ''}</span>
            </div>
          );
        })}
        {problem ? <p className="err" role="alert" data-testid="carousel-problem"><Icon name="error" size="xs" />{problem}</p> : null}
        <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--s2)' }}>
          <Button kind="primary" icon="save" busy={busy} busyLabel="Saving…" disabled={!dirty && custom} onClick={() => void save()}>Save carousel</Button>
          {custom ? <Button kind="quiet" icon="undo" disabled={busy} onClick={() => setResetOpen(true)}>Back to default</Button> : null}
          <Link className="btn quiet" href="/blogs" target="_blank" rel="noopener noreferrer"><Icon name="open_in_new" size="sm" />View Blogs</Link>
        </div>
      </div>

      <ConfirmDialog open={resetOpen} onClose={() => setResetOpen(false)} danger title="Go back to the default carousel?" yes="Back to default"
        body="Your chosen stories and pictures are removed, and Blogs shows the default carousel again." onYes={() => void reset()} />
      <ConfirmDialog open={leaveTo !== null} onClose={() => { setLeaveTo(null); guard.stay(); }} title="Leave without saving?" body="Your changes to the carousel won’t be saved." yes="Leave" danger onYes={() => { if (leaveTo !== null) guard.leave(leaveTo); }} />
    </>
  );
}
