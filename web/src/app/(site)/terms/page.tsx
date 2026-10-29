import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/Legal';

export const metadata: Metadata = { title: 'Terms of use' };

export default function Terms() {
  return (
    <LegalPage title="Terms of use" intro="These terms are the agreement between you and Stoora when you use our website, dashboard and shop pages."
      sections={[
        { id: 'account', title: 'Your account', body: <p>You must be 18 or older and able to enter a contract. Keep your login safe. You are responsible for what happens under your account and for the accuracy of the details you give.</p> },
        { id: 'sellers', title: 'If you sell on Stoora', body: <><p>You are the seller. You are responsible for your products, prices, taxes, delivery and returns, and for following the laws that apply to your business. You must not list illegal, counterfeit or unsafe items.</p><p>Stoora provides the tools; the sale is between you and your buyer.</p></> },
        { id: 'buyers', title: 'If you buy from a shop', body: <p>Your order is a contract with the shop you buy from. Delivery, returns and refunds follow that shop’s policies, shown on its page. Stoora helps you place the order and pay.</p> },
        { id: 'payments', title: 'Payments and fees', body: <p>Online payments are processed by our payment provider, which charges its own fee. An order is marked paid only when the provider confirms the payment. Refunds go back to the original payment method.</p> },
        { id: 'content', title: 'Your content', body: <p>You keep ownership of your photos and text. You allow Stoora to show them on your shop page and in your dashboard so the service can work.</p> },
        { id: 'stop', title: 'Stopping and suspension', body: <p>You can close your shop at any time. We may suspend an account that breaks these terms or the law, after telling you why where we can.</p> },
        { id: 'liability', title: 'Limits', body: <p>Stoora is provided as is. To the extent the law allows, we are not liable for indirect losses, and our total liability is limited to the fees you paid us in the last 12 months.</p> },
        { id: 'law', title: 'Governing law', body: <p>Indian law applies. Courts in India have jurisdiction.</p> },
      ]} />
  );
}
