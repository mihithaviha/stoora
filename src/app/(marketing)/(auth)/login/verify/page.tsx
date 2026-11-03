import type { Metadata } from 'next';
import { flatQuery, type SearchParamsProp } from '@/lib/query';
import { VerifyScreen } from '@/components/marketing/auth/Screens';

export const metadata: Metadata = { title: 'Enter your code' };
export default async function VerifyPage({ searchParams }: { searchParams: SearchParamsProp }) { return <VerifyScreen q={await flatQuery(searchParams)} />; }
