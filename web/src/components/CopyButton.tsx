'use client';
import { Button, useToast } from './ui';

export function CopyButton({ text, label = 'Copy', done = 'Copied.', small, kind = 'line' }: { text: string; label?: string; done?: string; small?: boolean; kind?: 'line' | 'ink' | 'quiet' }) {
  const toast = useToast();
  return <Button kind={kind} small={small} icon="content_copy" onClick={async () => {
    try { await navigator.clipboard.writeText(text); toast(done, { icon: 'content_copy' }); }
    catch { toast('Couldn’t copy automatically. Select it and copy it yourself.', { icon: 'error' }); }
  }}>{label}</Button>;
}
