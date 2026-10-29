import type { Metadata } from 'next';
import { VerifyScreen } from '@/components/marketing/auth/Screens';

export const metadata: Metadata = { title: 'Enter your code' };
export default function VerifyPage() { return <VerifyScreen />; }
