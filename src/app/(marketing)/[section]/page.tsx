import { notFound } from 'next/navigation';
import { Landing } from '@/components/marketing/landing/Landing';
import { SECTIONS } from '@/components/marketing/sections';

/** /about, /how-it-works, /who-its-for and /features are the home page, opened at that section. */
export const dynamicParams = false;
export function generateStaticParams() {
  return SECTIONS.map((s) => ({ section: s.path.slice(1) }));
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const match = SECTIONS.find((s) => s.path === `/${section}`);
  if (!match) notFound();
  return <Landing initialSection={match.id} />;
}
