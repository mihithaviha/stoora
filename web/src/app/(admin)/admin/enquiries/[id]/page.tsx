import { EnquiryInbox } from '@/components/admin/EnquiryInbox';

export default function EnquiryPage({ params }: { params: { id: string } }) { return <EnquiryInbox selectedId={params.id} />; }
