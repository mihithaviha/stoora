import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthFrame, VerifyForm } from '@/components/site/Auth';

export const metadata: Metadata = { title: 'Enter your code' };
export default function BuyerVerify() { return <AuthFrame role="buyer"><Suspense fallback={null}><VerifyForm role="buyer" /></Suspense></AuthFrame>; }
