'use client';
// Prepares a message for the seller to send themselves. Stoora's WhatsApp / Instagram sending is
// not connected in this build, so nothing here claims a message was sent.
import React, { useEffect, useState } from 'react';
import { Button, Dialog, Field, Icon, useToast } from './ui';

export function MessageDialog({ open, onClose, title, to, channel = 'WhatsApp', text: initial, phone }: { open: boolean; onClose: () => void; title: string; to: string; channel?: 'WhatsApp' | 'Instagram'; text: string; phone?: string }) {
  const [text, setText] = useState(initial);
  const toast = useToast();
  useEffect(() => { if (open) setText(initial); }, [open, initial]);
  const digits = (phone ?? '').replace(/\D/g, '');
  const canOpenWa = channel === 'WhatsApp' && digits.length >= 10 && !/x/i.test(phone ?? '');
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast('Message copied. Paste it into ' + channel + ' to send.', { icon: 'content_copy' }); onClose(); }
    catch { toast('Couldn’t copy automatically. Select the text and copy it yourself.', { icon: 'error' }); }
  };
  return (
    <Dialog open={open} onClose={onClose} title={title} footer={<>
      {canOpenWa && <a className="btn line" href={`https://wa.me/${digits}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><Icon name="open_in_new" />Open WhatsApp</a>}
      <Button kind="ink" icon="content_copy" onClick={copy} disabled={!text.trim()}>Copy message</Button>
    </>}>
      <div className="stack">
        <div className="banner"><Icon name="info" /><span>{channel} sending isn’t connected yet, so Stoora can’t send this for you. Copy it and send it from {channel} yourself.</span></div>
        <Field id="msg-text" label={`Message to ${to}`} hint="You can change anything before copying.">
          <textarea id="msg-text" className="input" rows={5} value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}
