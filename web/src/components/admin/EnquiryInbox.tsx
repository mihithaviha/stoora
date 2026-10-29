'use client';
// Enquiry inbox: list on the left, the open enquiry on the right (on phones, one at a time).
// API_TODO: GET /api/admin/enquiries, PATCH /api/admin/enquiries/:id {status}, POST /api/admin/enquiries/:id/reply.
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Avatar, Badge, Button, Chips, DemoBar, EmptyState, Field, Icon, PageHeader, SearchBox, Skeleton, useToast } from '../ui';
import { SAMPLE_ENQUIRIES, readSent, type Enquiry, type EnquiryStatus } from '@/lib/enquiries';
import { useAuth } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase/client';
import { listEnquiries, replyToEnquiry, setEnquiryStatus } from '@/lib/supabase/data';

const TONE: Record<EnquiryStatus, 'ok' | 'warn' | 'bad' | 'neutral'> = { New: 'bad', Open: 'warn', Answered: 'ok', Closed: 'neutral' };
const ICON: Record<EnquiryStatus, string> = { New: 'mark_email_unread', Open: 'schedule', Answered: 'check_circle', Closed: 'inventory_2' };
const CANNED = ['Thanks for writing. Opening a shop is free and takes a few minutes: start at stoora.in/onboarding.', 'You can import a spreadsheet from Products › Import. We’ll check each row before anything is added.', 'Sorry about that. Could you share your shop link and a screenshot so we can look into it?'];

export function EnquiryInbox({ selectedId }: { selectedId?: string }) {
  const toast = useToast(); const auth = useAuth(); const sb = getSupabase();
  const [items, setItems] = useState<Enquiry[] | null>(null); const [status, setStatus] = useState<'All' | EnquiryStatus>('All'); const [q, setQ] = useState(''); const [reply, setReply] = useState(''); const [tried, setTried] = useState(false);
  const OVERRIDES = 'stoora.enquiry-status.v1';
  useEffect(() => {
    if (sb) { listEnquiries(sb).then(setItems).catch((e) => { toast(`Couldn’t load enquiries: ${e.message}`, { icon: 'error' }); setItems([]); }); return; }
    let o: Record<string, EnquiryStatus> = {}; try { o = JSON.parse(localStorage.getItem(OVERRIDES) || '{}'); } catch { /* ignore */ }
    setItems([...readSent(), ...SAMPLE_ENQUIRIES].map((e) => (o[e.id] ? { ...e, status: o[e.id] } : e)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const list = useMemo(() => (items ?? []).filter((e) => (status === 'All' || e.status === status) && (!q.trim() || `${e.name} ${e.topic} ${e.message}`.toLowerCase().includes(q.trim().toLowerCase()))), [items, status, q]);
  const open = items?.find((e) => e.id === selectedId);
  useEffect(() => { setReply(''); setTried(false); }, [selectedId]);
  const setS = (id: string, s: EnquiryStatus) => {
    setItems((l) => (l ?? []).map((e) => (e.id === id ? { ...e, status: s } : e)));
    if (sb) { setEnquiryStatus(sb, id, s).catch((e) => toast(`Couldn’t save: ${e.message}`, { icon: 'error' })); return; }
    try { const o = JSON.parse(localStorage.getItem(OVERRIDES) || '{}'); o[id] = s; localStorage.setItem(OVERRIDES, JSON.stringify(o)); } catch { /* ignore */ }
  };
  if (!items) return <Skeleton rows={4} height={72} />;
  const count = (s: EnquiryStatus) => items.filter((e) => e.status === s).length;

  return (
    <>
      {!sb && <DemoBar>Sample enquiries. Ones sent from the landing page in this browser show at the top.</DemoBar>}
      <PageHeader title="Enquiries" lede="Questions from visitors and sellers." />
      <div className={`chatwrap ${open ? 'has-open' : ''}`}>
        <div className="card chatlist stack tight">
          <SearchBox id="enq-q" value={q} onChange={setQ} placeholder="Search enquiries" />
          <Chips label="Status" value={status} onChange={setStatus} options={[{ value: 'All', label: 'All', count: items.length }, ...(['New', 'Open', 'Answered', 'Closed'] as EnquiryStatus[]).map((s) => ({ value: s, label: s, count: count(s) }))]} />
          <div className="rows">{list.length === 0 ? <EmptyState icon="search_off" title="No enquiries here" text="Try another status or clear the search." action={<Button small onClick={() => { setStatus('All'); setQ(''); }}>Show all</Button>} /> : list.map((e) => (
            <Link key={e.id} href={`/admin/enquiries/${e.id}`} className={`li inbox-row ${e.id === selectedId ? 'sel' : ''}`} style={{ alignItems: 'flex-start' }}>
              <Avatar name={e.name} /><span className="grow"><span className="row"><span className="t grow">{e.name}</span><span className="cap">{e.when}</span></span><span className="s" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.topic}</span><span className="s" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.message}</span><span style={{ marginTop: 6, display: 'inline-flex' }}><Badge tone={TONE[e.status]} icon={ICON[e.status]}>{e.status}</Badge></span></span></Link>))}</div>
        </div>
        <div className="card chatconv flush">
          {!open ? <EmptyState icon="mail" title="Pick an enquiry" text="Choose one from the list to read it and reply." /> : (
            <div className="enq-body">
              <Link className="link only-narrow" href="/admin/enquiries" style={{ justifySelf: 'start' }}><Icon name="arrow_back" size="xs" />All enquiries</Link>
              <div className="row" style={{ flexWrap: 'wrap' }}><Avatar name={open.name} size={48} /><div className="grow"><h2 className="ct">{open.name}</h2><span className="cap">{open.contact}</span></div><Badge tone={TONE[open.status]} icon={ICON[open.status]}>{open.status}</Badge></div>
              <div className="enq-meta"><span className="src"><Icon name="topic" />{open.topic}</span><span className="src"><Icon name="inbox" />{open.from}</span><span className="cap">{open.when}</span></div>
              <p className="enq-msg">{open.message}</p>
              <div className="stack tight"><b className="t-ink">Reply</b>
                <div className="sugg2">{CANNED.map((c, i) => <button key={i} type="button" onClick={() => setReply(c)}>{['Opening a shop', 'Importing products', 'Ask for details'][i]}</button>)}</div>
                <Field id="enq-reply" label="Your reply" error={tried && reply.trim().length < 5 ? 'Write a reply first.' : undefined}><textarea id="enq-reply" className={`input ${tried && reply.trim().length < 5 ? 'bad' : ''}`} rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Hi ${open.name.split(' ')[0]}, …`} /></Field>
                <div className="btns"><Button kind="primary" icon="send" onClick={() => { setTried(true); if (reply.trim().length < 5) return; if (sb && auth.user) replyToEnquiry(sb, open.id, auth.user.id, reply.trim()).then(() => setItems((l) => (l ?? []).map((e) => (e.id === open.id ? { ...e, status: 'Answered' } : e)))).catch((e) => toast(`Couldn’t save: ${e.message}`, { icon: 'error' })); else setS(open.id, 'Answered'); setReply(''); setTried(false); toast(sb ? `Reply saved for ${open.name}.` : `Reply sent to ${open.name}.`, { icon: 'send' }); }}>{sb ? 'Save reply' : 'Send reply'}</Button>
                  {open.status !== 'Closed' ? <Button icon="inventory_2" onClick={() => { setS(open.id, 'Closed'); toast('Enquiry closed.', { icon: 'inventory_2', undo: () => setS(open.id, open.status) }); }}>Close enquiry</Button> : <Button icon="undo" onClick={() => setS(open.id, 'Open')}>Reopen</Button>}</div></div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
