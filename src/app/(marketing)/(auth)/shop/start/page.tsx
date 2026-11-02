import type { Metadata } from 'next';
import { StartScreen } from '@/components/marketing/auth/Screens';

export const metadata: Metadata = { title: 'Start for Free' };
export default function StartPage() { return <StartScreen />; }
