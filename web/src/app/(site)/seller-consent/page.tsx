'use client';
// Seller consent: what a seller agrees to before taking orders. Each item is a separate, required tick.
import Link from 'next/link';
import { useState } from 'react';
import { Button, ButtonLink, Card, Icon, useToast } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase/client';
import { recordConsent } from '@/lib/supabase/data';

const ITEMS: [string, string, string][] = [
  ['buyers', 'I will look after my buyers’ data', 'I will use buyers’ names, phone numbers and addresses only to fulfil their orders, and will not sell or share them.'],
  ['marketing', 'I will only message buyers who said yes', 'I will send offers only to buyers who agreed to receive them, and stop when they ask.'],
  ['kyc', 'I will give true business and bank details', 'Stoora and its payment provider may verify my identity and bank account before paying me out.'],
  ['products', 'I am allowed to sell what I list', 'My products are legal, safe and not counterfeit, and I will state prices, taxes and delivery times honestly.'],
  ['policies', 'I will publish clear return and refund rules', 'Buyers can see them on my shop page before they order.'],
];

export default function SellerConsent() {
  const toast = useToast(); const auth = useAuth();
  const agree = async () => {
    const sb = getSupabase();
    if (sb) { if (!auth.user) { toast('Please sign in first.', { icon: 'login' }); return; } try { await recordConsent(sb, auth.user.id, ITEMS.map(([k]) => k)); } catch (e) { toast(`Couldn’t save: ${(e as Error).message}`, { icon: 'error' }); return; } }
    setDone(true);
  };
  const [on, setOn] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const all = ITEMS.every(([k]) => on[k]);
  if (done) return (
    <div className="wrap narrow" style={{ padding: 'var(--s5) 16px var(--s6)' }}>
      <div className="payres"><span className="big-ok"><Icon name="verified" size="lg" /></span><h1 className="h1">Consent saved</h1><p className="t-body">We recorded your agreement on 29 Oct 2026. You can read or withdraw it any time from Settings.</p><div className="btns"><ButtonLink href="/dashboard" kind="primary">Go to my dashboard</ButtonLink><ButtonLink href="/terms">Read the terms</ButtonLink></div></div>
    </div>
  );
  return (
    <div className="wrap narrow" style={{ padding: 'var(--s5) 16px var(--s6)', display: 'grid', gap: 'var(--s3)' }}>
      <span className="eyebrow">Before you take orders</span>
      <h1 className="display" style={{ fontSize: 'clamp(30px,5vw,44px)' }}>Seller consent</h1>
      <p className="lede">Please read each point and tick it. These promises protect your buyers and you. See also the <Link className="link" href="/terms">terms of use</Link> and <Link className="link" href="/privacy">privacy policy</Link>.</p>
      <Card className="stack">
        {ITEMS.map(([k, t, d]) => (
          <label key={k} className="trow radio" style={{ cursor: 'pointer', alignItems: 'flex-start', ...(on[k] ? { borderColor: 'var(--ink)', background: 'var(--surface)' } : {}) }}>
            <input type="checkbox" className="sr" checked={!!on[k]} onChange={(e) => setOn({ ...on, [k]: e.target.checked })} />
            <span className="rdot" style={{ borderRadius: 7, ...(on[k] ? { background: 'var(--ink)', borderColor: 'var(--ink)', color: '#fff' } : {}) }} aria-hidden="true">{on[k] && <Icon name="check" size="xs" />}</span>
            <span className="grow"><span className="t">{t}</span><span className="s">{d}</span></span>
          </label>
        ))}
        <div className="btns"><Button kind="primary" disabled={!all} onClick={agree}>I agree and continue</Button><ButtonLink href="/dashboard" kind="quiet">Not now</ButtonLink></div>
        {!all && <p className="cap">Tick all {ITEMS.length} points to continue.</p>}
      </Card>
    </div>
  );
}
