import type { Metadata } from 'next';
import { flatQuery, type SearchParamsProp } from '@/lib/query';
import { StartScreen } from '@/components/marketing/auth/Screens';

export const metadata: Metadata = { title: 'Start for Free' };
export default async function StartPage({ searchParams }: { searchParams: SearchParamsProp }) { return <StartScreen q={await flatQuery(searchParams)} />; }
