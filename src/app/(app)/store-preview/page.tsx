'use client';
// What a storefront looks like, drawn on its own page so it behaves exactly like a real shop at this screen width.
//   /store-preview?sample=<template>&theme=<theme>   a template with labelled sample content (gallery and full preview)
//   /store-preview?draft=1                           the seller's draft with their own products
//   /store-preview                                   waits for the editor to send what to draw (postMessage)
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { StoreFront, type StoreExtras } from '@/components/storefront/Templates';
import { shopAnnounce } from '@/lib/storefront/announce';
import { deliveryLine, deliveryRule } from '@/lib/delivery';
import { useStore } from '@/lib/store';
import { loadDraft } from '@/lib/storefront/draft';
import { startingConfig, toStoreData } from '@/lib/storefront/map';
import { sampleData } from '@/lib/storefront/sample';
import { visibleData, type StoreConfig, type StoreData } from '@/lib/storefront/shared';

interface Frame { config: StoreConfig; data: StoreData; extras?: StoreExtras; sample?: boolean }

function Preview() {
  const params = useSearchParams();
  const { db, ready } = useStore();
  const sample = params.get('sample');
  const theme = params.get('theme');
  const wantsDraft = params.get('draft') === '1';
  const [sent, setSent] = useState<Frame | null>(null);

  // the editor sends its working copy; ask for it once we are listening
  useEffect(() => {
    if (sample || wantsDraft) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || !event.data || event.data.type !== 'render') return;
      setSent({ config: event.data.config, data: event.data.data, extras: event.data.extras });
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: 'ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, [sample, wantsDraft]);

  const frame = useMemo<Frame | null>(() => {
    if (sample) {
      const made = sampleData(sample);
      const extras = { payments: { online: true, upi: true }, announce: ['Free delivery on orders over ₹1,500', 'Ships from Jaipur', 'UPI, cards and netbanking', 'Cash on delivery available'], delivery: 'Free delivery on orders over ₹1,500', cod: true };
      return { config: theme ? { ...made.config, theme } : made.config, data: made.data, extras, sample: true };
    }
    if (wantsDraft) {
      if (!ready) return null;
      const config = loadDraft(db.shop.handle) ?? db.shop.storefront ?? startingConfig(db);
      const rule = deliveryRule(db.shop);
      return { config, data: visibleData(toStoreData(db), config), extras: { payments: { online: db.shop.online !== false, upi: true }, announce: shopAnnounce(db, rule), delivery: deliveryLine(rule), cod: Boolean(db.shop.cod) } };
    }
    return sent;
  }, [sample, theme, wantsDraft, ready, db, sent]);

  if (!frame) return <div style={{ minHeight: '100vh', background: '#fff' }} aria-busy="true" />;
  return (
    <>
      {frame.sample && <div role="note" style={{ position: 'sticky', top: 0, zIndex: 50, background: '#171C3C', color: '#fff', padding: '8px 16px', fontSize: 13, textAlign: 'center' }}>Sample content so you can see the design. Your own products and photos replace it.</div>}
      <StoreFront templateId={frame.sample ? frame.config.template : 'standard'} ctx={{ config: frame.config, data: frame.data, extras: frame.extras, preview: true, sample: frame.sample }} />
    </>
  );
}

export default function StorePreviewPage() {
  return <Suspense fallback={null}><Preview /></Suspense>;
}
