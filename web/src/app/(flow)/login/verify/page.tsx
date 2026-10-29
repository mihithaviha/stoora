import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthFrame, VerifyForm } from '@/components/site/Auth';

export const metadata: Metadata = { title: 'Enter your code' };
export default function SellerVerify() { return <AuthFrame role="seller"><Suspense fallback={null}><VerifyForm role="seller" /></Suspense></AuthFrame>; }
