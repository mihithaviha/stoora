'use client';
import React from 'react';
import { StoreProvider } from '@/lib/store';
import { BagProvider } from '@/lib/bag';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from './ui';

/** Shop data (demo), the buyer's bag and toasts. The seller frame is added by app/(dashboard)/layout.tsx. */
export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider><ToastProvider><StoreProvider><BagProvider>{children}</BagProvider></StoreProvider></ToastProvider></AuthProvider>;
}
