import Link from 'next/link';
import { Ic } from '../bits';

/** The big call to action on the home page: one "Start for Free" button that opens /shop/start. */
export function ClaimForm({ button = 'Start for Free' }: { id?: string; button?: string }) {
  return (
    <div className="claim-cta">
      <Link className="btn primary" href="/shop/start">{button}<Ic n="arrow_forward" c="sm" /></Link>
    </div>
  );
}
