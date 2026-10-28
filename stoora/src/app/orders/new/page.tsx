import Link from 'next/link';
import { Icon, PageHeader } from '@/components/ui';

export default function CreateOrderChooser() {
  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader title="Create order" lede="For orders that came by phone, chat or in person. Orders from your shop link arrive on their own." />
      <div className="choose">
        <Link className="card choice" href="/orders/new/manual">
          <span className="ic shop"><Icon name="edit_note" /></span>
          <span className="grow"><h2 className="ct">Add it yourself</h2><span className="t-soft">You know the buyer, the products and the price. Fill in a short form.</span></span>
          <Icon name="arrow_forward" className="t-cap" />
        </Link>
        <Link className="card choice ai" href="/orders/new/ai">
          <span className="ic chat"><Icon name="auto_awesome" /></span>
          <span className="grow"><h2 className="ct">Create order with AI</h2><span className="t-soft">Got an order through a chat or a call? Paste the chat or upload a WhatsApp export. Stoora prepares a draft, and you check it before anything is added.</span></span>
          <Icon name="arrow_forward" className="t-cap" />
        </Link>
      </div>
      <p className="cap" style={{ marginTop: 'var(--s3)' }}>Both ways end the same: an order in your list, only after you approve it.</p>
    </div>
  );
}
