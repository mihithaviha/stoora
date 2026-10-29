import { EnquiryInbox } from '@/components/admin/EnquiryInbox';

export default async function EnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EnquiryInbox selectedId={id} />;
}
