import type { Metadata } from 'next';
import { LoginScreen } from '@/components/marketing/auth/Screens';

export const metadata: Metadata = { title: 'Log in' };
export default function LoginPage() { return <LoginScreen />; }
