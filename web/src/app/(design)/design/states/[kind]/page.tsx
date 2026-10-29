'use client';
// One page per state screen, so each can be opened and checked on its own: /design/states/loading, empty, error, offline.
import { notFound, useParams } from 'next/navigation';
import { Button, ButtonLink } from '@/components/ui';
import { StateScreen } from '@/components/bits';

export default function StatePage() {
  const { kind } = useParams<{ kind: string }>();
  if (kind === 'loading') return <StateScreen kind="loading" title="Loading your shop…" text="Getting today’s orders and numbers." />;
  if (kind === 'empty') return <StateScreen kind="empty" title="No orders yet" text="When a buyer orders from your shop link, it will show up here. Share your link to get started." actions={<><ButtonLink href="/storefront" kind="primary" icon="link">Share my shop link</ButtonLink><ButtonLink href="/orders/new">Add an order myself</ButtonLink></>} />;
  if (kind === 'error') return <StateScreen kind="error" title="We couldn’t load your orders" text="Check your connection and try again. Your data is safe." actions={<><Button kind="ink" icon="refresh">Try again</Button><ButtonLink href="/dashboard">Go to my dashboard</ButtonLink></>} />;
  if (kind === 'offline') return <StateScreen kind="offline" title="You’re offline" text="Stoora will pick up where you left off as soon as you’re back online." />;
  notFound();
}
