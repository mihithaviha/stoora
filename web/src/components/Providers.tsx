'use client';
import React from 'react';
import { StoreProvider } from '@/lib/store';
import { ToastProvider } from './ui';
import { AssistantProvider } from './Assistant';
import { AppShell } from './AppShell';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <ToastProvider>
        <AssistantProvider>
          <AppShell>{children}</AppShell>
        </AssistantProvider>
      </ToastProvider>
    </StoreProvider>
  );
}
