'use client';
import { AssistantChat } from '@/components/Assistant';
import { PageHeader } from '@/components/ui';

export default function AssistantPage() {
  return (
    <>
      <PageHeader title="Ask Stoora" lede="Ask about sales, orders, payments, products or chats. Answers come only from your shop’s data, with a chart when it helps." />
      <section className="card flush" style={{ height: 'min(72dvh, 760px)', display: 'flex', overflow: 'hidden', padding: 0 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex' }}><AssistantChat page /></div>
      </section>
    </>
  );
}
