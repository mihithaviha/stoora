import { redirect } from 'next/navigation';

/** The hand-made order form is the Create order page. */
export default function ManualOrder() { redirect('/orders/new'); }
