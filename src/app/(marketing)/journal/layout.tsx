import '../../../styles/brand/journal.css';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { SiteNav } from '@/components/marketing/SiteNav';

/** The Journal: the public site's top bar and footer around its own stories. */
export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="jr">
      <a className="jr-skip" href="#main">Skip to the content</a>
      <SiteNav page="journal" solidAlways />
      <main id="main" className="jr-main">{children}</main>
      <SiteFooter />
    </div>
  );
}
