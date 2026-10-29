import type { Metadata } from 'next';
import { ForgotScreen } from '@/components/marketing/auth/Screens';

export const metadata: Metadata = { title: 'Reset password' };
export default function ForgotPage() { return <ForgotScreen />; }
