import type { Metadata } from 'next';
import { flatQuery, type SearchParamsProp } from '@/lib/query';
import { LoginScreen } from '@/components/marketing/auth/Screens';

export const metadata: Metadata = { title: 'Log in' };
export default async function LoginPage({ searchParams }: { searchParams: SearchParamsProp }) { return <LoginScreen q={await flatQuery(searchParams)} />; }
