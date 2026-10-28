'use client';
import { ChatsView } from './ChatsView';
import { Badge, Card, DemoBar, Icon, PageHeader, Switch, useToast } from './ui';
import { useStore } from '@/lib/store';

const INFO = {
  WhatsApp: {
    icon: 'chat', lede: 'Buyer messages from WhatsApp, and what Stoora could do once WhatsApp Business is connected.',
    needs: ['A WhatsApp Business account for your shop number', 'Approval from Meta for the WhatsApp Business Platform', 'Stoora’s server connected to it (not built yet)'],
    perks: ['Buyer messages arrive here on their own', 'Send replies, order confirmations and UPI reminders from Stoora', 'Share your catalogue in chats'],
  },
  Instagram: {
    icon: 'photo_camera', lede: 'Instagram DMs about your products, and what Stoora could do once Instagram is connected.',
    needs: ['An Instagram professional account', 'A Facebook Page linked to it', 'Stoora’s server connected to Instagram messaging (not built yet)'],
    perks: ['DMs arrive here on their own', 'Reply to DMs from Stoora', 'Turn “price?” comments into chats'],
  },
} as const;

export function ChannelPage({ channel, openId }: { channel: 'WhatsApp' | 'Instagram'; openId: string | null }) {
  const i = INFO[channel]; const toast = useToast(); const { db } = useStore();
  const count = db.chats.filter((c) => c.source === channel).length;
  return (
    <>
      <DemoBar />
      <div className={openId ? 'hide-narrow' : ''}>
        <PageHeader title={channel} lede={i.lede} />
        <div className="home-row" style={{ marginBottom: 'var(--s3)' }}>
          <Card title="Connection" icon={i.icon} aside={<Badge tone="warn" icon="link_off">Not connected</Badge>}>
            <p className="t-soft">{channel} isn’t connected to Stoora yet, so nothing is sent from here. The {count} sample {count === 1 ? 'chat' : 'chats'} below show how it will look.</p>
            <p className="label" style={{ margin: 'var(--s3) 0 var(--s1)' }}>What connecting needs</p>
            <ol className="chan-steps">{i.needs.map((n) => <li key={n}>{n}</li>)}</ol>
            <button className="btn line sm" style={{ marginTop: 'var(--s3)' }} onClick={() => toast(`${channel} connection isn’t available in this build yet.`, { icon: 'info' })}><Icon name="link" />Connect {channel}</button>
          </Card>
          <Card title="Once connected" icon="bolt">
            <div className="stack tight">{i.perks.map((p) => (
              <div key={p} className="toggle-row"><span className="grow t-soft">{p}</span><Switch checked={false} onChange={() => toast('Connect ' + channel + ' first.', { icon: 'info' })} label={p} /></div>))}</div>
          </Card>
        </div>
      </div>
      <ChatsView src={channel} openId={openId} basePath={'/' + channel.toLowerCase()} />
    </>
  );
}
