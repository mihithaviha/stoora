'use client';
// Chats inbox, used by /chats, /whatsapp and /instagram. Sending through WhatsApp / Instagram is not
// connected, so replies are copied and sent by the seller, then logged here by the seller.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { Avatar, Button, Card, EmptyState, Icon, MOOD, MoodBadge, SourceTag, useToast } from './ui';
import { useWide } from './Assistant';
import { plural } from '@/lib/format';
import type { Chat } from '@/lib/types';

type Mood = Chat['mood'];

export function ChatsView({ src, openId, basePath }: { src: 'WhatsApp' | 'Instagram' | null; openId: string | null; basePath: string }) {
  const { db, ready } = useStore(); const router = useRouter(); const wide = useWide(760);
  const all = db.chats.filter((c) => !src || c.source === src);
  const picked = openId ? db.chats.find((c) => c.id === openId) ?? null : null;
  const [tab, setTab] = useState<Mood>(picked?.mood ?? 'ready');
  useEffect(() => { if (picked) setTab(picked.mood); }, [picked?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = all.filter((c) => c.mood === tab);
  const open = picked ?? (wide ? list[0] ?? null : null);
  const readyN = all.filter((c) => c.mood === 'ready' && c.unread).length;
  const href = (id: string) => `${basePath}${basePath.includes('?') ? '&' : '?'}c=${id}`;

  if (ready && openId && !picked) return <Card><EmptyState icon="search_off" title="We couldn’t find that chat" text="It may have been closed." action={<Link className="btn line sm" href={basePath}>Back to chats</Link>} /></Card>;
  return (
    <>
      {(!picked || wide) && <div className="banner info" style={{ marginBottom: 'var(--s3)', alignItems: 'center' }}><span className="smark xs" aria-hidden="true">S</span><span>{readyN ? <><b className="t-ink">{plural(readyN, 'buyer is', 'buyers are')} ready to buy.</b> Replies are drafted. Check them, then send from {src ?? 'WhatsApp or Instagram'}.</> : 'Every ready-to-buy buyer has a reply.'}</span></div>}
      <div className={`chatwrap ${picked ? 'has-open' : ''}`}>
        <section className="card stack tight chatlist" style={{ alignSelf: 'start' }} aria-label="Chat list">
          <div className="chips" role="tablist">{(Object.keys(MOOD) as Mood[]).map((m) => <button key={m} role="tab" aria-selected={tab === m} className={`chip ${tab === m ? 'on' : ''}`} onClick={() => { setTab(m); if (picked) router.replace(basePath, { scroll: false }); }}>{MOOD[m][2]}<span className="n">{all.filter((c) => c.mood === m).length}</span></button>)}</div>
          <div className="rows">{list.length ? list.map((c) => {
            const on = open?.id === c.id && wide;
            return (
              <Link key={c.id} className="li" href={href(c.id)} scroll={false} aria-current={on ? 'true' : undefined} style={{ alignItems: 'flex-start', ...(on ? { borderColor: 'var(--ink)', background: 'var(--surface)' } : {}) }}>
                <Avatar name={c.buyer} />
                <span className="grow" style={{ minWidth: 0 }}><span className="row" style={{ gap: 'var(--s1)' }}><span className="t grow">{c.buyer}</span><span className="cap">{c.time}</span></span>
                  <span className="s" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{c.last}</span><span style={{ marginTop: 6, display: 'block' }}><SourceTag source={c.source} /></span></span>
                {c.unread && <span className="unread" style={{ marginTop: 6 }} aria-label="Unread" />}
              </Link>);
          }) : <p className="cap" style={{ padding: 'var(--s3)' }}>No chats here right now.</p>}</div>
        </section>
        <section className="card flush chatconv" style={{ display: 'flex', flexDirection: 'column' }} aria-label="Conversation">
          {open ? <Conversation c={open} key={open.id} basePath={basePath} /> : <EmptyState icon="chat" title="Pick a chat" text="Messages from WhatsApp and Instagram show up here." />}
        </section>
      </div>
    </>
  );
}

function Conversation({ c, basePath }: { c: Chat; basePath: string }) {
  const { db, sendMessage, setDraft } = useStore(); const toast = useToast();
  const [editing, setEditing] = useState(false); const [draft, setDraftText] = useState(c.draft ?? '');
  const [text, setText] = useState(''); const [copied, setCopied] = useState<string | null>(null);
  const cust = db.customers.find((x) => x.name === c.buyer);
  const copy = async (t: string) => {
    try { await navigator.clipboard.writeText(t); setCopied(t); toast(`Copied. Paste it in ${c.source} to send, then tap “I sent it”.`, { icon: 'content_copy' }); }
    catch { toast('Couldn’t copy automatically. Select the text and copy it yourself.', { icon: 'error' }); setCopied(t); }
  };
  const logSent = (t: string, fromDraft: boolean) => { sendMessage(c.id, t); if (fromDraft) setDraft(c.id, undefined); setCopied(null); setText(''); toast('Logged in this chat as sent by you.'); };

  return (
    <>
      <div className="row" style={{ padding: 'var(--s3)', borderBottom: '1px solid var(--line-soft)' }}>
        <Link className="ibtn flat only-narrow" href={basePath} aria-label="Back to chats"><Icon name="arrow_back" /></Link>
        <Avatar name={c.buyer} />
        <div className="grow"><div className="t-ink" style={{ fontWeight: 500 }}>{c.buyer}</div><div className="row" style={{ gap: 'var(--s1)', flexWrap: 'wrap', marginTop: 2 }}><SourceTag source={c.source} /><MoodBadge mood={c.mood} /></div></div>
        {cust && <Link className="btn line sm" href={`/customers/${cust.id}`}><Icon name="person" />Buyer</Link>}
      </div>
      <div className="thread" style={{ flex: 1 }} aria-live="polite">
        {c.messages.map((m, i) => <div key={i} className={`bubble ${m.from}`}>{m.text}<small>{m.time}{m.from === 'me' ? ' · logged by you' : ''}</small></div>)}
        {c.draft && (
          <div className="draft" style={{ marginTop: 'var(--s2)' }}>
            <div className="who"><span className="smark xs" aria-hidden="true">S</span>Stoora drafted a reply</div>
            {editing ? <><label className="sr" htmlFor={`dr-${c.id}`}>Edit reply</label><textarea id={`dr-${c.id}`} value={draft} onChange={(e) => setDraftText(e.target.value)} /></> : <p className="t-soft">{c.draft}</p>}
            <div className="btns">
              {editing ? <Button kind="ink" small onClick={() => { setDraft(c.id, draft.trim() || undefined); setEditing(false); }}>Save reply</Button>
                : copied === c.draft ? <Button kind="primary" small icon="done" onClick={() => logSent(c.draft!, true)}>I sent it</Button>
                : <Button kind="primary" small icon="content_copy" onClick={() => copy(c.draft!)}>Copy reply</Button>}
              {!editing && <Button small icon="edit" onClick={() => { setDraftText(c.draft ?? ''); setEditing(true); }}>Edit</Button>}
              <Button kind="quiet" small onClick={() => { const d = c.draft; setDraft(c.id, undefined); toast('Draft dismissed.', { undo: () => setDraft(c.id, d) }); }}>Dismiss</Button>
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: '0 var(--s3)' }}><div className="chips">
        {c.mood !== 'upset' && <Link className="chip" href="/orders/new/ai"><Icon name="receipt_long" size="xs" />Create order from this chat</Link>}
        <Link className="chip" href={`/orders?q=${encodeURIComponent(c.buyer.split(' ')[0])}`}><Icon name="inbox" size="xs" />Their orders</Link>
      </div></div>
      <p className="cap" style={{ padding: 'var(--s1) var(--s3) 0' }}><Icon name="info" size="xs" />{c.source} sending isn’t connected yet. Copy your reply, send it in {c.source}, then log it here.</p>
      <form className="composer" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; if (copied === text) logSent(text.trim(), false); else copy(text.trim()); }}>
        <label className="search"><Icon name="chat" size="sm" /><span className="sr">Message {c.buyer}</span><input placeholder="Type a reply to copy" value={text} onChange={(e) => { setText(e.target.value); setCopied(null); }} autoComplete="off" /></label>
        <button className="go" type="submit" aria-label={copied === text && text ? 'Log as sent' : 'Copy typed message'} disabled={!text.trim()}><Icon name={copied === text && text ? 'done' : 'content_copy'} size="sm" /></button>
      </form>
    </>
  );
}
