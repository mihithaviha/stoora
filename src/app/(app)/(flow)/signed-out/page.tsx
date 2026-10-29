import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui';
import { Logo, StateScreen } from '@/components/bits';

export const metadata: Metadata = { title: 'Signed out' };
export default function SignedOut() {
  return (
    <div className="authwrap" style={{ gridTemplateColumns: '1fr' }}>
      <main id="main" className="auth-main"><div className="auth-top"><Logo /></div>
        <StateScreen kind="signedout" title="You’re signed out" text="You were logged out because you chose to, or because you were away for a while. Your shop and orders are safe." actions={<><ButtonLink href="/login" kind="primary" icon="login">Seller log in</ButtonLink><ButtonLink href="/buyer/login" icon="shopping_bag">Buyer log in</ButtonLink></>} />
        <p className="cap" style={{ textAlign: 'center' }}><Link className="link" href="/">Back to the Stoora site</Link></p></main>
    </div>
  );
}
