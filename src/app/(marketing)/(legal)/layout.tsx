import { SiteFooter } from '@/components/marketing/SiteFooter';
import { SiteNav } from '@/components/marketing/SiteNav';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav solidAlways />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
