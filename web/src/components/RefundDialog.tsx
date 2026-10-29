'use client';
// Refund dialog for a paid order: full or partial amount, a reason, and whether to tell the buyer.
// API_TODO: POST /api/orders/:id/refunds. Money only moves when the payment provider confirms it.
import React, { useEffect, useState } from 'react';
import { Button, Dialog, Field, Icon, Switch } from './ui';
import { rs } from '@/lib/format';
import type { Order, Refund } from '@/lib/types';

const REASONS = ['Buyer changed their mind', 'Item damaged or wrong', 'Out of stock', 'Order cancelled', 'Other'];

export function RefundDialog({ open, onClose, order, alreadyRefunded, onRefund }: { open: boolean; onClose: () => void; order: Order; alreadyRefunded: number; onRefund: (r: Refund) => void }) {
  const left = order.total - alreadyRefunded;
  const [mode, setMode] = useState<'full' | 'part'>('full');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [notify, setNotify] = useState(true);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setMode('full'); setAmount(''); setReason(REASONS[0]); setNotify(true); setTried(false); setBusy(false); } }, [open]);

  const value = mode === 'full' ? left : Number(amount.replace(/[^\d.]/g, ''));
  const error = mode === 'part' && (!value ? 'Enter how much to refund.' : value > left ? `You can refund at most ${rs(left)}.` : value < 1 ? 'The smallest refund is ₹1.' : '');
  const submit = () => {
    setTried(true); if (error) return; setBusy(true);
    setTimeout(() => { onRefund({ amount: value, reason, when: 'Just now', notified: notify }); setBusy(false); onClose(); }, 500);
  };
  return (
    <Dialog open={open} onClose={onClose} title={`Refund order #${order.id}`} footer={<><Button onClick={onClose}>Cancel</Button><Button kind="ink" icon="undo" busy={busy} busyLabel="Starting refund…" onClick={submit}>Refund {rs(value || 0)}</Button></>}>
      <div className="stack">
        <div className="banner warn"><Icon name="warning" /><span>A refund goes back to the buyer’s original payment method and can’t be undone. It can take 5 to 7 working days to show up.</span></div>
        <div className="kv"><div className="r"><span>Order total</span><span>{rs(order.total)}</span></div>{alreadyRefunded > 0 && <div className="r"><span>Already refunded</span><span>− {rs(alreadyRefunded)}</span></div>}<div className="r t"><span>You can still refund</span><span>{rs(left)}</span></div></div>
        <div className="seg" role="tablist" aria-label="How much to refund">
          <button type="button" role="tab" aria-selected={mode === 'full'} className={mode === 'full' ? 'on' : ''} onClick={() => setMode('full')}>Full refund</button>
          <button type="button" role="tab" aria-selected={mode === 'part'} className={mode === 'part' ? 'on' : ''} onClick={() => setMode('part')}>Part refund</button>
        </div>
        {mode === 'part' && <Field id="rf-amt" label="Amount to refund" required error={tried && error ? error : undefined}><div className={`affix ${tried && error ? 'bad' : ''}`}><span aria-hidden="true">₹</span><input id="rf-amt" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(left)} /></div></Field>}
        <Field id="rf-why" label="Reason" required><select id="rf-why" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS.map((r) => <option key={r}>{r}</option>)}</select></Field>
        <div className="toggle-row"><span className="grow"><span className="t-ink" style={{ fontWeight: 500, display: 'block' }}>Tell the buyer</span><span className="cap">Sends a short message that the refund has started.</span></span><Switch checked={notify} onChange={setNotify} label="Tell the buyer" /></div>
      </div>
    </Dialog>
  );
}
