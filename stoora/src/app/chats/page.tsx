'use client';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChatsView } from '@/components/ChatsView';
import { DemoBar, PageHeader } from '@/components/ui';

export default function ChatsPage() { const searchParams = Object.fromEntries(useSearchParams()) as { c?: string; src?: string };
  const src = searchParams.src === 'WhatsApp' || searchParams.src === 'Instagram' ? searchParams.src : null;
  return (
    <>
      <DemoBar />
      <div className={searchParams.c ? 'hide-narrow' : ''}>
        <PageHeader title={src ? `${src} chats` : 'Chats'} lede={src ? <>Only messages that came from {src}. <Link className="link" href="/chats">Show all chats</Link></> : 'Buyer messages from WhatsApp and Instagram, sorted by Stoora.'} />
      </div>
      <ChatsView src={src} openId={searchParams.c ?? null} basePath={src ? `/chats?src=${src}` : '/chats'} />
    </>
  );
}
