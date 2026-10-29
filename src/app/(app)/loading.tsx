import { StateScreen } from '@/components/bits';

export default function Loading() { return <main style={{ minHeight: '100dvh', background: 'var(--surface)' }}><StateScreen kind="loading" title="Loading…" text="Just a moment." /></main>; }
