import Link from 'next/link';
import { Icon, PageHeader } from '@/components/ui';
import { SETTINGS, slug } from '@/lib/settings';

const BUILT = ['General', 'Order-taking', 'WhatsApp verification', 'Notifications', 'Sales channels'];
export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" lede="Everything about how your shop runs." />
      <div className="setlist card flush">
        {SETTINGS.map(([name, icon, desc]) => (
          <Link key={name} className="set-row" href={`/settings/${slug(name)}`}>
            <Icon name={icon} /><span className="grow"><span className="t-ink" style={{ fontWeight: 500, display: 'block' }}>{name}</span><span className="cap">{desc}</span></span>
            {!BUILT.includes(name) && <span className="cap">Coming soon</span>}<Icon name="chevron_right" size="sm" className="t-cap" />
          </Link>
        ))}
      </div>
    </>
  );
}
