import { Skeleton } from '@/components/ui';

/** Shown inside the seller frame while a page loads. */
export default function Loading() { return <><Skeleton rows={1} height={72} /><div style={{ height: 16 }} /><Skeleton rows={3} height={120} /></>; }
