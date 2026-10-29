import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { SellerGate } from '@/components/SellerGate';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}><AppShell><SellerGate>{children}</SellerGate></AppShell></Suspense>;
}
