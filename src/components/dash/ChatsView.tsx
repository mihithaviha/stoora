'use client';
// Chats: buyers' conversations sorted by how ready they are to buy, with a reply drafted for the seller to check
// (the dashboard prototype's Chats screens). Replies stay in this demo shop: nothing is sent to WhatsApp or Instagram.
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Art } from './Art';
import { DAv, DI, SrcTag, TopRow } from './parts';
import { Skeleton, useToast } from '../ui';
import { useStore } from '@/lib/store';
import type { Chat } from '@/lib/types';

const TABS = [['ready', 'Ready to buy'], ['upset', 'Upset'], ['look', 'Just looking'], ['all', 'All']] as const;
const moodTag = (c: Chat) => (c.mood === 'ready' ? <span className="tag ok">Ready to buy</span> : c.mood === 'upset' ? <span className="tag bad">Upset</span> : <span className="tag neutral">Just looking</span>);

export function ChatsView({ selectedId }: { selectedId?: string }) {
  const { db, ready, mode, sendChatReply, dismissChatDraft, markChatRead } = useStore();
  const router = useRouter();
  const toast = useToast();
  const src = useSearchParams().get('src');
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('ready');
  const [q, setQ] = useState('');
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  const sel = db.chats.find((c) => c.id === selectedId) ?? null;
  useEffect(() => { if (sel?.unread) markChatRead(sel.id); }, [sel?.id, sel?.unread, markChatRead]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setEditing(null); setText(''); }, [selectedId]);
  // opening a chat from elsewhere shows the tab it belongs to
  useEffect(() => { if (sel && tab !== 'all' && sel.mood !== tab) setTab(sel.mood); }, [sel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => db.chats
    .filter((c) => (tab === 'all' || c.mood === tab) && (!src || c.src === src) && (!q.trim() || `${c.who} ${c.last}`.toLowerCase().includes(q.trim().toLowerCase()))), [db.chats, tab, src, q]);
  if (!ready) return <div className="dpad" style={{ paddingTop: 20 }}><Skeleton rows={4} height={70} /></div>;

  const readyCount = db.chats.filter((c) => c.mood === 'ready').length;
  const sent = (c: Chat, say?: string) => { sendChatReply(c.id, say); setEditing(null); setText(''); toast(`Reply added to the chat. Nothing is sent to ${c.src} from this demo.`, { icon: 'send' }); };

  if (!db.chats.length) {
    return (
      <>
        <TopRow icon="chat" title="Chats" />
        <div className="dpad">
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px', maxWidth: 640, margin: '20px auto 0' }}>
            <Art k="chat" height={110} />
            <div className="h2" style={{ margin: '10px 0 6px' }}>No chats yet</div>
            <p className="muted small" style={{ margin: '0 0 16px' }}>Connect WhatsApp or Instagram and buyers’ messages will appear here, with the ready-to-buy ones on top.</p>
            <div className="row" style={{ justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}><Link className="btn main" href="/settings/whatsapp-verification">Connect WhatsApp</Link><Link className="btn line" href="/settings/sales-channels">Sales channels</Link></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopRow icon="chat" title={src ? `${src} chats` : 'Chats'}>
        {src ? <Link className="btn line sm" href="/chats">All chats</Link> : <Link className="btn line sm" href="/settings/sales-channels">Connect another account</Link>}
      </TopRow>
      <div className="dpad">
        <div className="aibox" style={{ marginBottom: 12 }}>
          <div className="who"><DI n="spark" s={14} /> Stoora sorted your chats</div>
          <div className="small" style={{ marginTop: 4 }}>{readyCount ? `${readyCount} ${readyCount === 1 ? 'buyer is' : 'buyers are'} ready to buy. Replies are drafted — just check and send.` : 'Nobody is ready to buy right now.'}{mode === 'demo' ? ' These are sample chats: nothing leaves this browser.' : ''}</div>
        </div>
        <div className="dsplit">
          <div className="box ctl clist" style={{ margin: 0 }}>
            <label className="search"><DI n="search" s={16} /><span className="sr">Search chats</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats" style={{ border: 0, background: 'none', outline: 'none', flex: 1, minWidth: 0 }} /></label>
            <div className="chips">{TABS.map(([k, l]) => <button key={k} className={`chip${tab === k ? ' on' : ''}`} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>{l} <span className="n">{k === 'all' ? db.chats.length : db.chats.filter((c) => c.mood === k).length}</span></button>)}</div>
            <div className="list">
              {list.map((c, i) => (
                <Link key={c.id} className={`li${sel?.id === c.id ? ' sel' : ''}`} href={`/chats/${c.id}${src ? `?src=${src}` : ''}`}>
                  <DAv name={c.who} i={i} />
                  <div className="sp"><div className="row"><b className="sp">{c.who}</b><span className="tiny muted">{c.time}</span></div><div className="small muted" style={{ margin: '2px 0 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.last}</div><div className="row" style={{ gap: 6 }}><SrcTag s={c.src} /></div></div>
                  {c.unread ? <span className="unread" /> : null}
                </Link>
              ))}
              {!list.length ? <p className="small muted" style={{ padding: 8 }}>No chats here.</p> : null}
            </div>
          </div>

          <div className="box convo">
            {sel ? (
              <>
                <div className="cv-h">
                  <DAv name={sel.who} />
                  <div className="sp"><b>{sel.who}</b><div className="row" style={{ gap: 6, marginTop: 4 }}><SrcTag s={sel.src} />{moodTag(sel)}</div></div>
                  {db.customers.find((c) => c.name === sel.who) ? <Link className="ibtn sm" href={`/customers/${db.customers.find((c) => c.name === sel.who)!.id}`} aria-label="Buyer details"><DI n="user" s={16} /></Link> : null}
                </div>
                <div className="cv-b">
                  <div style={{ display: 'grid', gap: 8 }}>{sel.msgs.map(([w, t], i) => <div key={i} className={`bubble ${w}`}>{t}</div>)}</div>
                  {sel.draft ? (
                    <div className="aibox">
                      <div className="who"><DI n="spark" s={14} /> Stoora drafted a reply</div>
                      {editing === sel.id
                        ? <textarea className="input" rows={3} style={{ margin: '8px 0 12px' }} aria-label="Edit the reply" value={text} onChange={(e) => setText(e.target.value)} />
                        : <p style={{ margin: '8px 0 12px' }}>{sel.draft}</p>}
                      <div className="row" style={{ gap: 8 }}>
                        <button className="btn main sm" type="button" onClick={() => sent(sel, editing === sel.id ? text.trim() || undefined : undefined)}>Send</button>
                        {editing === sel.id ? <button className="btn line sm" type="button" onClick={() => setEditing(null)}>Cancel edit</button> : <button className="btn line sm" type="button" onClick={() => { setEditing(sel.id); setText(sel.draft ?? ''); }}>Edit</button>}
                        <button className="btn sm" type="button" onClick={() => dismissChatDraft(sel.id)}>Dismiss</button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="cv-q">
                  <div className="chips">
                    <Link className="chip" href="/orders/new"><DI n="cart" s={15} /> Create order</Link>
                    <Link className="chip" href="/orders/new">₹ Send UPI link</Link>
                    <Link className="chip" href="/orders?tab=bookings"><DI n="cal" s={15} /> Book a slot</Link>
                  </div>
                  <form className="cv-in" onSubmit={(e) => { e.preventDefault(); const say = text.trim(); if (say && editing !== sel.id) sent(sel, say); }}>
                    <input value={editing === sel.id ? '' : text} onChange={(e) => { if (editing !== sel.id) setText(e.target.value); }} placeholder="Type a message" aria-label="Message" />
                    <button className="ibtn dark sm" type="submit" style={{ boxShadow: 'none' }} aria-label="Send"><DI n="send" s={16} /></button>
                  </form>
                </div>
              </>
            ) : (
              <div className="cv-empty"><Art k="chat" height={110} /><b style={{ color: 'var(--ink)' }}>Pick a chat</b><span className="small">Ready-to-buy buyers are at the top. Replies are drafted for you.</span>
                {list[0] ? <button className="btn grey sm" type="button" onClick={() => router.push(`/chats/${list[0].id}`)}>Open {list[0].who.split(' ')[0]}’s chat</button> : null}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
