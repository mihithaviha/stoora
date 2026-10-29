'use client';
import { useState } from 'react';
import { ComingSoon, DI } from './parts';
import { useDash } from './DashShell';
import { useToast } from '../ui';

/** The big "Ask Stoora anything" box on Home, with a few questions to start from. */
export function AskBox({ suggestions }: { suggestions: string[] }) {
  const { openAsk } = useDash();
  const toast = useToast();
  const [v, setV] = useState('');
  const send = (text = v) => {
    const q = text.trim();
    if (!q) { document.getElementById('homeask')?.focus(); return; }
    openAsk(q);
    setV('');
  };
  const soon = (what: string) => toast(`${what} is coming soon.`, { icon: 'info' });
  return (
    <ComingSoon>
      <div className="askcard">
        <textarea id="homeask" rows={2} value={v} onChange={(e) => setV(e.target.value)} placeholder="Ask Stoora anything…" aria-label="Ask Stoora anything"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <div className="tools">
          <div className="smark" style={{ width: 24, height: 24, fontSize: 13 }}>S</div><span className="sp" />
          <button className="tb" type="button" onClick={() => soon('Recent questions')}><DI n="clock" s={15} /> Recents</button>
          <button className="tb" type="button" aria-label="Add a photo" onClick={() => soon('Adding a photo')}><DI n="plus" s={17} /></button>
          <button className="tb" type="button" aria-label="Speak" onClick={() => soon('Speaking to Stoora')}><DI n="mic" s={17} /></button>
          <button className="go" type="button" aria-label="Send" onClick={() => send()}><DI n="send" s={16} /></button>
        </div>
      </div>
      <div className="sugg">{suggestions.map((q) => <button key={q} type="button" onClick={() => send(q)}>{q}</button>)}</div>
    </ComingSoon>
  );
}
