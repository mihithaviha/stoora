import type { Metadata } from 'next';
import { AuthFrame, LoginForm } from '@/components/site/Auth';

export const metadata: Metadata = { title: 'Seller log in' };
export default function SellerLogin() { return <AuthFrame role="seller"><LoginForm role="seller" /></AuthFrame>; }
