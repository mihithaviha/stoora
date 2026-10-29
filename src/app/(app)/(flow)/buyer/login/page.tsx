import type { Metadata } from 'next';
import { AuthFrame, LoginForm } from '@/components/site/Auth';

export const metadata: Metadata = { title: 'Buyer log in' };
export default function BuyerLogin() { return <AuthFrame role="buyer"><LoginForm role="buyer" /></AuthFrame>; }
