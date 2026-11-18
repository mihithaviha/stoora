import { redirect } from 'next/navigation';

/** "Fill from a chat message" is hidden until it is built. The normal Create order page is the way to add an order by hand. */
export default function AiOrder() { redirect('/orders/new'); }
