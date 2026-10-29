import { Suspense } from 'react';
import { AuthProvider } from '@/lib/auth';

/** Sign-in screens need to know who is signed in (and whether the site runs in demo mode). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider><Suspense fallback={null}>{children}</Suspense></AuthProvider>;
}
