'use client';
import { useState } from 'react';
import { Ic } from '../bits';

/** "Copy link": uses the clipboard when the browser allows it and says what happened. */
export function CopyLink({ url }: { url: string }) {
  const [label, setLabel] = useState('Copy link');
  const done = (text: string) => {
    setLabel(text);
    window.setTimeout(() => setLabel('Copy link'), 2200);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      done('Link copied');
    } catch {
      const field = document.createElement('input');
      field.value = url;
      document.body.appendChild(field);
      field.select();
      done(document.execCommand('copy') ? 'Link copied' : 'Press Ctrl+C to copy');
      field.remove();
    }
  };
  return <button className="btn line sm" type="button" onClick={copy}><Ic n="link" c="xs" /><span>{label}</span></button>;
}
