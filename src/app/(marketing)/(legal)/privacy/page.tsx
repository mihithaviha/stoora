import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/Legal';

export const metadata: Metadata = { title: 'Privacy policy' };

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" intro="This explains what Stoora collects, why, who sees it and what choices you have. We keep it short and plain on purpose."
      sections={[
        { id: 'collect', title: 'What we collect', body: <><p>When you open a shop we collect your name, phone number, email, shop name, address and the details you choose to add (UPI ID, GST number, photos).</p><p>When a buyer orders from a shop we collect their name, phone number, delivery address and order details, and pass them to that shop so it can fulfil the order.</p><p>We also record simple visit counts for each shop page. We do not read buyers’ private messages.</p></> },
        { id: 'use', title: 'How we use it', body: <ul><li>To run your shop, take orders and process payments.</li><li>To send you order alerts, login codes and important account notices.</li><li>To keep Stoora safe and to follow the law.</li></ul> },
        { id: 'share', title: 'Who we share it with', body: <><p>Only with those who need it: the shop a buyer orders from, our payment provider (to take and refund payments), and service providers who send emails or host our systems. We do not sell personal data.</p></> },
        { id: 'keep', title: 'How long we keep it', body: <p>We keep account and order records while your shop is open and for the period the law requires for tax and payment records. After that we delete or anonymise them.</p> },
        { id: 'rights', title: 'Your choices', body: <><p>You can ask to see, correct, export or delete your personal data, or to withdraw consent, at any time. Use the <a href="/data-requests">data request form</a>. We reply within 30 days.</p></> },
        { id: 'security', title: 'Keeping it safe', body: <p>Passwords are stored as one-way hashes. Payment details are handled by our payment provider and never touch our servers. Access to shop data is limited to the shop’s owner and the helpers they add.</p> },
        { id: 'contact', title: 'Contact', body: <p>Stoora, India · privacy@stoora.in</p> },
      ]} />
  );
}
