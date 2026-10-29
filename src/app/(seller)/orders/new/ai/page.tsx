'use client';
// Create order with AI: input → Stoora reads it → you review → order created.
// The AI only prepares a DRAFT. Nothing is added to orders until the seller approves it.
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { Badge, Button, Field, Icon, PageHeader, useToast } from '@/components/ui';
import { EXAMPLE_CHAT, EXAMPLE_EXTRACTION, catalogFor, draftIssues, issuesTitle, toDraft, type Draft } from '@/lib/order-draft';
import { plural, rs, toNum } from '@/lib/format';
import type { ExtractedOrder, Source } from '@/lib/types';

type Stage = 'input' | 'reading' | 'review' | 'done';
type Mode = 'paste' | 'file' | 'call';
const AUDIO = /\.(mp3|m4a|aac|ogg|opus|wav|amr|3gp|webm)$/i;
const IMG = /^image\/(png|jpe?g|webp|gif)$/;
const MAX_IMG = 3, MAX_IMG_BYTES = 4 * 1024 * 1024;

export default function AiOrder() {
  const { db, product, createOrder } = useStore(); const toast = useToast();
  const [stage, setStage] = useState<Stage>('input');
  const [mode, setMode] = useState<Mode>('paste');
  const [text, setText] = useState(''); const [source, setSource] = useState<Source>('WhatsApp');
  const [images, setImages] = useState<{ name: string; type: string; data: string }[]>([]);
  const [note, setNote] = useState<null | { kind: 'ok' | 'warn'; text: string }>(null);
  const [err, setErr] = useState<null | { text: string; notConnected?: boolean }>(null);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [example, setExample] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [busy, setBusy] = useState(false); const [created, setCreated] = useState<number | null>(null);
  const ctl = useRef<AbortController | null>(null);
  const [drag, setDrag] = useState(false);

  useEffect(() => { if (stage !== 'review') return; const f = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; }; window.addEventListener('beforeunload', f); return () => window.removeEventListener('beforeunload', f); }, [stage]);

  /* ---------- files ---------- */
  const takeFiles = (list: FileList | null) => {
    const fs = [...(list ?? [])]; setImages([]); setNote(null); setErr(null);
    if (!fs.length) return;
    if (fs.some((f) => AUDIO.test(f.name) || f.type.startsWith('audio/'))) { setNote({ kind: 'warn', text: 'Call recordings can’t be turned into text yet — speech-to-text isn’t connected. Choose “Phone call” and type what the buyer said, or upload a .txt transcript.' }); return; }
    const imgs = fs.filter((f) => IMG.test(f.type)); const txts = fs.filter((f) => /\.txt$/i.test(f.name) || f.type === 'text/plain');
    if (!imgs.length && !txts.length) { setNote({ kind: 'warn', text: 'That file type isn’t supported. Use a WhatsApp export (.txt) or PNG/JPG screenshots. A .zip export must be unzipped first.' }); return; }
    if (imgs.length) {
      const use = imgs.slice(0, MAX_IMG); const big = use.find((f) => f.size > MAX_IMG_BYTES);
      if (big) { setNote({ kind: 'warn', text: `${big.name} is over 4 MB. Crop the screenshot or take a smaller one.` }); return; }
      Promise.all(use.map((f) => new Promise<{ name: string; type: string; data: string }>((res, rej) => { const r = new FileReader(); r.onload = () => res({ name: f.name, type: f.type, data: String(r.result).split(',')[1] }); r.onerror = rej; r.readAsDataURL(f); })))
        .then((x) => { setImages(x); setText(''); setNote({ kind: 'ok', text: `${plural(x.length, 'screenshot')} ready.${imgs.length > MAX_IMG ? ` Only the first ${MAX_IMG} are used.` : ''}` }); })
        .catch(() => setNote({ kind: 'warn', text: 'Those screenshots couldn’t be read. Try again.' }));
      return;
    }
    const f = txts[0];
    if (f.size > 1024 * 1024) { setNote({ kind: 'warn', text: 'That chat file is over 1 MB. Export only this buyer’s chat, or paste the recent messages.' }); return; }
    const r = new FileReader();
    r.onload = () => { const lines = String(r.result).split(/\r?\n/); setText(lines.slice(-120).join('\n')); setNote({ kind: 'ok', text: `Read ${f.name}. Stoora will use the last ${Math.min(120, lines.length)} lines.` }); };
    r.onerror = () => setNote({ kind: 'warn', text: 'That file couldn’t be read. Try exporting the chat again.' });
    r.readAsText(f);
  };

  /* ---------- run ---------- */
  const run = async () => {
    const t = text.trim().slice(-8000);
    if (!t && !images.length) { setErr({ text: mode === 'file' ? 'Choose a chat file first.' : mode === 'call' ? 'Type what the buyer said first.' : 'Paste the conversation first.' }); return; }
    setErr(null); setStage('reading'); setStep(1); setExample(false); setSourceText(t);
    ctl.current = new AbortController();
    try {
      setStep(2);
      const r = await fetch('/api/extract-order', { method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctl.current.signal,
        body: JSON.stringify({ text: t, source, images: images.map(({ type, data }) => ({ type, data })), catalog: catalogFor(db.products) }) });
      const j = await r.json().catch(() => null);
      if (r.status === 503) { setStage('input'); setErr({ text: 'AI reading isn’t connected in this build, so your chat was not read. You can add the order yourself, or look at an example draft to see how review works.', notConnected: true }); return; }
      if (!r.ok || !j) { setStage('input'); setErr({ text: j?.code === 'no_order' ? 'Stoora couldn’t find an order in this chat. Check that it includes what the buyer wants, then try again — or add the order yourself.' : 'Stoora couldn’t read the chat just now. Check your connection and try again.' }); return; }
      setStep(3); setDraft(toDraft(j as ExtractedOrder, db.products)); setStage('review'); window.scrollTo(0, 0);
    } catch (e) {
      setStage('input'); if ((e as Error).name !== 'AbortError') setErr({ text: 'Stoora couldn’t read the chat just now. Check your connection and try again.' });
    }
  };
  const showExample = () => { setText(EXAMPLE_CHAT); setSourceText(EXAMPLE_CHAT); setSource('WhatsApp'); setExample(true); setErr(null); setDraft(toDraft(EXAMPLE_EXTRACTION, db.products)); setStage('review'); window.scrollTo(0, 0); };

  /* ---------- review ---------- */
  const issues = draft ? draftIssues(draft, db.products) : [];
  const upd = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const updItem = (n: number, patch: Partial<Draft['items'][number]>) => setDraft((d) => (d ? { ...d, items: d.items.map((it, i) => (i === n ? { ...it, ...patch } : it)) } : d));
  const approve = () => {
    if (!draft || busy) return;
    if (issues.length) { toast(issuesTitle(issues.length) + ' first.', { icon: 'error' }); document.getElementById(issues[0].field)?.focus(); return; }
    setBusy(true);
    setTimeout(() => {
      const o = createOrder({ buyer: draft.name.trim(), phone: draft.phone.trim() || undefined, city: draft.city.trim() || undefined, address: draft.address.trim() || undefined, source,
        lines: draft.items.map((it) => ({ productId: it.productId, qty: Number(it.qty), size: it.size || undefined })), shipping: toNum(draft.ship), notes: draft.notes.trim() || undefined, pay: draft.pay, createdBy: 'ai' });
      setBusy(false); setCreated(o.id); setStage('done'); toast(`Order #${o.id} created.`); window.scrollTo(0, 0);
    }, 400);
  };
  const reset = () => { setStage('input'); setDraft(null); setText(''); setImages([]); setNote(null); setErr(null); setCreated(null); setExample(false); };

  const cur = { input: 0, reading: 1, review: 2, done: 3 }[stage];
  const lines = draft?.items.filter((it) => it.productId && Number(it.qty) > 0) ?? [];
  const subtotal = lines.reduce((a, it) => a + (product(it.productId)?.price ?? 0) * Number(it.qty), 0);

  return (
    <>
      <PageHeader title={stage === 'review' ? 'Review AI-prepared order' : 'Create order with AI'} lede={stage === 'review' ? 'Stoora has organised the order details. Check them before adding this order to your list.' : 'Got an order through a chat or a call? Let Stoora prepare it for you.'} />
      <ol className="flow" aria-label="Steps">{['Add the chat', 'Stoora reads it', 'You review', 'Order created'].map((l, i) => <li key={l} className={i < cur ? 'done' : i === cur ? 'on' : ''} aria-current={i === cur ? 'step' : undefined}><span>{i < cur ? <Icon name="check" size="xs" /> : i + 1}</span>{l}</li>)}</ol>

      <div className="stack">
        {stage === 'input' && <>
          {err && <div className={`banner ${err.notConnected ? 'warn' : 'bad'}`} role="alert"><Icon name={err.notConnected ? 'info' : 'error'} /><span>{err.text}{err.notConnected && <><br /><span className="cap">For developers: set ANTHROPIC_API_KEY in .env.local and restart the server. The key stays on the server.</span></>}</span></div>}
          {err?.notConnected && <div className="btns"><Link className="btn ink" href="/orders/new"><Icon name="edit_note" />Add it yourself</Link><Button icon="visibility" onClick={showExample}>See an example draft</Button></div>}
          <section className="card stack">
            <h2 className="ct">How did the order come in?</h2>
            <div className="seg ai-seg" role="tablist" aria-label="Input type">{([['paste', 'Paste a chat', 'content_paste'], ['file', 'Upload a file', 'upload_file'], ['call', 'Phone call', 'call']] as const).map(([k, l, i]) => <button key={k} type="button" role="tab" aria-selected={mode === k} className={mode === k ? 'on' : ''} onClick={() => { setMode(k); setNote(null); setErr(null); }}><Icon name={i} size="xs" />{l}</button>)}</div>
            {mode === 'paste' && <Field id="ai-text" label="Paste the conversation" hint="Include the messages about what they want, sizes, and where to deliver.">
              <textarea className="input" id="ai-text" rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder="Copy the messages from WhatsApp or Instagram and paste them here." /></Field>}
            {mode === 'paste' && <div><button type="button" className="link" onClick={() => setText(EXAMPLE_CHAT)}>Fill in an example chat</button></div>}
            {mode === 'file' && <>
              <label className={`drop ${drag ? 'over' : ''}`} htmlFor="ai-file" onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); takeFiles(e.dataTransfer.files); }}>
                <Icon name="upload_file" size="lg" className="t-soft" />
                <span className="t-ink" style={{ fontWeight: 500 }}>{images.length ? images.map((f) => f.name).join(', ') : note?.kind === 'ok' ? 'File ready' : 'Choose or drop a file'}</span>
                <span className="cap">WhatsApp chat export (.txt) or up to {MAX_IMG} chat screenshots (PNG, JPG). In WhatsApp: open the chat › More › Export chat › Without media.</span>
                <input type="file" id="ai-file" accept=".txt,text/plain,image/png,image/jpeg,image/webp,audio/*" multiple onChange={(e) => takeFiles(e.target.files)} />
              </label>
              {note && <div className={`banner ${note.kind}`}><Icon name={note.kind === 'ok' ? 'check_circle' : 'info'} /><span>{note.text}</span></div>}
            </>}
            {mode === 'call' && <>
              <div className="banner info"><Icon name="mic_off" /><span><b>Call recordings can’t be turned into text yet.</b> That needs a speech-to-text service, which isn’t connected. Type what the buyer said, or paste a transcript from your phone’s recorder app.</span></div>
              <Field id="ai-text" label="What did the buyer say?"><textarea className="input" id="ai-text" rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder="Rahul called. Wants 1 silk dupatta, maroon. Lives in Lucknow. Will pay cash on delivery." /></Field>
            </>}
            <Field id="ai-src" label="Where did it come from?"><select className="input" id="ai-src" value={source} onChange={(e) => setSource(e.target.value as Source)}>{(['WhatsApp', 'Instagram', 'Phone call', 'In person', 'Other'] as Source[]).map((s) => <option key={s}>{s}</option>)}</select></Field>
          </section>
          <p className="prev-note"><Icon name="lock" /><span>Share only chats you’re allowed to. Stoora reads this to prepare a draft and doesn’t message the buyer. If you recorded a call, getting the buyer’s consent is your responsibility. In this demo nothing is saved on a server.</span></p>
          <div className="btns"><Button kind="primary" icon="auto_awesome" onClick={run}>Prepare order draft</Button><Link className="btn quiet" href="/orders/new">Back</Link></div>
        </>}

        {stage === 'reading' && (
          <section className="card stack" aria-live="polite">
            <div className="as-who"><span className="smark" aria-hidden="true">S</span><div><h2 className="ct">Stoora is reading the chat</h2><p className="cap">Nothing is added to your orders until you approve it.</p></div></div>
            <ol className="psteps">{['Reading the conversation', 'Finding the buyer, products, quantities and delivery details', 'Checking against your product catalog'].map((l, i) => { const s = i + 1 < step ? 'done' : i + 1 === step ? 'on' : ''; return <li key={l} className={s}><span className="pi">{s === 'done' ? <Icon name="check" size="xs" /> : s === 'on' ? <span className="spin dark" /> : null}</span>{l}{s === 'on' && i === 1 && <span className="cap"> · usually 10–40 seconds</span>}</li>; })}</ol>
            <div><Button small onClick={() => ctl.current?.abort()}>Stop</Button></div>
          </section>
        )}

        {stage === 'review' && draft && <>
          {example && <div className="banner warn"><Icon name="science" /><span><b>Example draft.</b> This was prepared in advance from the example chat to show how review works. No AI read anything.</span></div>}
          <div className="banner info"><Icon name="edit_note" /><span><b className="t-ink">This is a draft.</b> It is not in your orders yet. Nothing is added until you tap “Approve and create order”.</span></div>
          {issues.length > 0 && <section className="card needs" aria-labelledby="nd-h"><h2 className="ct" id="nd-h"><Icon name="flag" />{issuesTitle(issues.length)}</h2><ul>{issues.map((x) => <li key={x.field + x.text}><button className="link" onClick={() => document.getElementById(x.field)?.focus()}>{x.text}</button></li>)}</ul></section>}
          {draft.questions.length > 0 && <section className="card"><h2 className="ct"><Icon name="help" />Questions Stoora noticed</h2><ul className="notes" style={{ marginTop: 'var(--s2)' }}>{draft.questions.map((q) => <li key={q}>{q}</li>)}</ul></section>}
          <div className="form2">
            <div>
              <section className="card stack"><h2 className="ct"><Icon name="person" />Customer</h2>
                <div className="grid2">
                  <Field id="ai-name" label="Buyer’s name" required><input className={`input ${draft.name ? '' : 'flag'}`} id="ai-name" value={draft.name} onChange={(e) => upd({ name: e.target.value })} placeholder="Not in the chat" />{!draft.name && <span className="fl"><Icon name="help" size="xs" />Not found in the chat</span>}</Field>
                  <Field id="ai-phone" label="WhatsApp number" optional><input className="input" id="ai-phone" type="tel" inputMode="tel" value={draft.phone} onChange={(e) => upd({ phone: e.target.value })} placeholder="Not in the chat" /></Field>
                </div>
              </section>
              <section className="card">
                <div className="card-h"><h2 className="ct"><Icon name="shopping_bag" />Products and quantities</h2><Button small icon="add" id="ai-add" onClick={() => upd({ items: [...draft.items, { said: 'Added by you', cands: [], productId: '', size: '', saidSize: '', qty: '1' }] })}>Add product</Button></div>
                {draft.items.length ? <div className="stack tight">{draft.items.map((it, n) => { const p = product(it.productId); return (
                  <div className="ai-item" key={n}>
                    <p className="said"><Icon name="format_quote" size="xs" />Buyer said: “{it.said}”</p>
                    <div className="ai-row">
                      <div className="field grow"><label htmlFor={`ai-p-${n}`}>Product</label>
                        <select className={`input ${p ? '' : 'flag'}`} id={`ai-p-${n}`} value={it.productId} onChange={(e) => updItem(n, { productId: e.target.value, size: product(e.target.value)?.sizes.includes(it.saidSize) ? it.saidSize : '' })}>
                          <option value="">{it.cands.length > 1 ? 'Choose one of the matches…' : 'Choose a product…'}</option>
                          {it.cands.length > 0 && <optgroup label="Matches from the chat">{it.cands.map((id) => <option key={id} value={id}>{product(id)?.name} · {rs(product(id)?.price ?? 0)}</option>)}</optgroup>}
                          <optgroup label="All products">{db.products.filter((x) => x.status === 'Active' && !it.cands.includes(x.id)).map((x) => <option key={x.id} value={x.id}>{x.name} · {rs(x.price)}</option>)}</optgroup>
                        </select></div>
                      {p && p.sizes.length > 0 && <div className="field"><label htmlFor={`ai-s-${n}`}>Size</label><select className={`input ${it.size ? '' : 'flag'}`} id={`ai-s-${n}`} value={it.size} onChange={(e) => updItem(n, { size: e.target.value })}><option value="">Size…</option>{p.sizes.map((z) => <option key={z}>{z}</option>)}</select></div>}
                      <div className="field"><label htmlFor={`ai-q-${n}`}>How many</label><input className={`input qty ${Number(it.qty) > 0 && (!p || Number(it.qty) <= p.stock) ? '' : 'flag'}`} id={`ai-q-${n}`} inputMode="numeric" value={it.qty} onChange={(e) => updItem(n, { qty: e.target.value.replace(/\D/g, '') })} placeholder="?" /></div>
                      <button className="ibtn flat" onClick={() => upd({ items: draft.items.filter((_, i) => i !== n) })} aria-label="Remove this item" style={{ alignSelf: 'end' }}><Icon name="delete" size="sm" /></button>
                    </div>
                    {p ? <p className="cap">{rs(p.price)} each from your catalog · {p.stock} in stock{Number(it.qty) > 0 && <> · line total <b className="t-ink num">{rs(p.price * Number(it.qty))}</b></>}</p>
                      : it.cands.length > 1 ? <p className="cap fl"><Icon name="help" size="xs" />{it.cands.length} products could match. Pick the right one.</p> : null}
                  </div>); })}</div> : <p className="t-soft">No products were found in the chat. Add the product the buyer wants.</p>}
              </section>
              <section className="card stack"><h2 className="ct"><Icon name="local_shipping" />Delivery</h2>
                <div className="grid2">
                  <Field id="ai-city" label="City"><input className={`input ${draft.city ? '' : 'flag'}`} id="ai-city" value={draft.city} onChange={(e) => upd({ city: e.target.value })} placeholder="Not in the chat" /></Field>
                  <Field id="ai-addr" label="Full address" hint={draft.address ? undefined : 'Ask the buyer before shipping.'}><input className={`input ${draft.address ? '' : 'flag'}`} id="ai-addr" value={draft.address} onChange={(e) => upd({ address: e.target.value })} placeholder="Not in the chat" /></Field>
                </div>
                <Field id="ai-ship" label="Delivery charge" optional hint="Stoora doesn’t guess delivery charges. Leave empty for free delivery."><div className="affix"><span aria-hidden="true">₹</span><input id="ai-ship" inputMode="numeric" value={draft.ship} onChange={(e) => upd({ ship: e.target.value })} placeholder="0" /></div></Field>
                <Field id="ai-notes" label="Notes" optional><input className="input" id="ai-notes" value={draft.notes} onChange={(e) => upd({ notes: e.target.value })} /></Field>
              </section>
              <section className="card stack"><h2 className="ct" id="ai-pay-l"><Icon name="payments" />Payment</h2>
                {draft.buyerSaysPaid ? <div className="banner warn"><Icon name="info" /><span>The buyer says they’ve paid{draft.paySaid ? `: “${draft.paySaid}”` : ''}. Check your UPI app before choosing “Paid already”.</span></div>
                  : draft.paySaid ? <p className="cap"><Icon name="format_quote" size="xs" />About payment, the buyer said: “{draft.paySaid}”</p> : null}
                <div className="stack tight" role="radiogroup" aria-labelledby="ai-pay-l">{([['upi', 'Not paid yet (UPI)', 'Mark it paid once the money arrives.'], ['cod', 'Cash on delivery', 'Collect the money when the parcel arrives.'], ['paid', 'Paid already', 'Only if you’ve seen the money in your account.']] as const).map(([k, l, s]) => (
                  <button key={k} type="button" role="radio" aria-checked={draft.pay === k} className={`trow radio ${draft.pay === k ? 'on' : ''}`} onClick={() => upd({ pay: k })}><span className="rdot" aria-hidden="true">{draft.pay === k && <Icon name="check" size="xs" />}</span><span className="grow"><span className="t">{l}</span><span className="s">{s}</span></span></button>))}</div>
              </section>
              <details className="card src-box"><summary><Icon name="forum" size="sm" />Compare with the original {sourceText ? 'conversation' : 'screenshots'}</summary>
                {draft.excerpts.length > 0 && <><p className="label" style={{ margin: 'var(--s2) 0 var(--s1)' }}>What Stoora used</p><ul className="quotes">{draft.excerpts.map((q) => <li key={q}>“{q}”</li>)}</ul></>}
                {sourceText ? <><p className="label" style={{ margin: 'var(--s3) 0 var(--s1)' }}>Full conversation</p><pre className="srctext">{sourceText}</pre></> : <p className="cap" style={{ marginTop: 'var(--s2)' }}>Stoora read your screenshots. They aren’t kept after this page closes.</p>}
              </details>
            </div>
            <div>
              <section className="card stack" style={{ position: 'sticky', top: 80 }}>
                <h2 className="ct">Summary</h2>
                <p className="cap"><Badge tone="offer" icon="edit_note">Draft</Badge> from {source}</p>
                <div className="kv">
                  {lines.length ? lines.map((it, i) => { const p = product(it.productId)!; return <div className="r" key={i}><span>{p.name}{it.size ? ' · ' + it.size : ''} × {it.qty}</span><span>{rs(p.price * Number(it.qty))}</span></div>; }) : <div className="r"><span>No products confirmed yet</span><span>—</span></div>}
                  <div className="r"><span>Delivery</span><span>{toNum(draft.ship) ? rs(toNum(draft.ship)) : 'Free'}</span></div>
                  <div className="r t"><span>Total</span><span>{issues.length ? 'Not ready yet' : rs(subtotal + toNum(draft.ship))}</span></div>
                </div>
                {issues.length > 0 && <p className="cap fl"><Icon name="flag" size="xs" />Fix {plural(issues.length, 'thing')} above to see the total.</p>}
                <Button kind="primary" full icon="check" busy={busy} busyLabel="Creating order…" onClick={approve}>Approve and create order</Button>
                <Button kind="quiet" full onClick={reset}>Cancel draft</Button>
              </section>
            </div>
          </div>
        </>}

        {stage === 'done' && created && (
          <section className="card stack done-card" role="status">
            <span className="ic big-ok"><Icon name="check_circle" size="lg" /></span>
            <h2 className="h2">Order created.</h2>
            <p className="t-soft">Order <b className="t-ink">#{created}</b> is now in your orders list, marked as coming from {source}. Stock has gone down for the products in it.</p>
            <div className="btns"><Link className="btn ink" href={`/orders/${created}`}>View order #{created}</Link><Button onClick={reset}>Create another</Button></div>
          </section>
        )}
      </div>
    </>
  );
}
