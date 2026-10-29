import type { Metadata } from 'next';
import { SignupScreen } from '@/components/marketing/auth/Screens';

export const metadata: Metadata = { title: 'Open a shop' };
export default function SignupPage() { return <SignupScreen />; }
