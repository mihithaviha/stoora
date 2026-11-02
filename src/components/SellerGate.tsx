'use client';
// Wraps every seller page. With Supabase on: signed-out people go to the login page, and a signed-in person who has not
// created a shop yet goes to store setup. Someone who signed up with Google must verify a phone number first.
// In demo mode it otherwise lets everything through.
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { Skeleton } from './ui';
import { PhoneGate, useNeedsPhone } from './auth/PhoneGate';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';

export function SellerGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth(); const { needsShop, ready } = useStore(); const router = useRouter(); const path = usePathname() || '/dashboard';
  const live = auth.mode === 'live'; const needsPhone = useNeedsPhone();
  useEffect(() => {
    if (!live || !auth.ready) return;
    if (!auth.user) router.replace(`/login?next=${encodeURIComponent(path)}`);
    else if (needsShop) router.replace('/onboarding');
  }, [live, auth.ready, auth.user, needsShop, path, router]);
  if (live && (!auth.ready || !auth.user || needsShop || !ready)) return <div className="wrap" style={{ padding: 'var(--s4)' }}><Skeleton rows={1} height={72} /><div style={{ height: 16 }} /><Skeleton rows={3} height={120} /></div>;
  // signed up with Google: the dashboard stays closed until a WhatsApp number is added and verified (it cannot be skipped)
  if (needsPhone) return <PhoneGate />;
  return <>{children}</>;
}
