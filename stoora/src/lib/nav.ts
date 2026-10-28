import type { Db } from './types';
import { orderFilters } from './store';

export interface NavItem { href: string; icon: string; label: string; desc: string; count?: (db: Db) => number; hot?: boolean; match?: (path: string, src: string | null) => boolean; sub?: { href: string; label: string }[] }

export const NAV: [string, NavItem[]][] = [
  ['My business', [
    { href: '/', icon: 'home', label: 'Home', desc: 'Today’s summary and what needs you', match: (p) => p === '/' },
    { href: '/assistant', icon: 'auto_awesome', label: 'Ask Stoora', desc: 'Ask questions about your shop' },
    { href: '/orders', icon: 'inbox', label: 'Orders', desc: 'Orders and bookings from every place', count: (db) => db.orders.filter(orderFilters['To ship']).length, sub: [{ href: '/orders/new', label: 'Create order' }] },
    { href: '/products', icon: 'sell', label: 'Products', desc: 'What you sell and how much stock is left' },
    { href: '/customers', icon: 'group', label: 'Customers', desc: 'People who bought or booked with you' },
  ]],
  ['Customer connections', [
    { href: '/chats', icon: 'forum', label: 'Chats', desc: 'All buyer messages, sorted for you', count: (db) => db.chats.filter((c) => c.unread).length, hot: true },
    { href: '/whatsapp', icon: 'chat', label: 'WhatsApp', desc: 'Connection and WhatsApp chats' },
    { href: '/instagram', icon: 'photo_camera', label: 'Instagram', desc: 'Connection and Instagram DMs' },
  ]],
  ['Selling', [
    { href: '/storefront', icon: 'storefront', label: 'Storefront', desc: 'Your shop page and its link' },
    { href: '/discounts', icon: 'local_offer', label: 'Discounts', desc: 'Codes and offers for your buyers' },
  ]],
  ['Money and insights', [
    { href: '/money', icon: 'account_balance_wallet', label: 'Money', desc: 'Payments received and money still owed' },
    { href: '/analytics', icon: 'bar_chart', label: 'Analytics', desc: 'How your sales are doing over time' },
  ]],
  ['Account', [
    { href: '/notifications', icon: 'notifications', label: 'Notifications', desc: 'Alerts about orders, stock and money' },
    { href: '/settings', icon: 'settings', label: 'Settings', desc: 'Shop details, payments and shipping' },
    { href: '/account', icon: 'person', label: 'Account', desc: 'Your login, plan and sign out' },
  ]],
];

export function isOn(item: NavItem, path: string, src: string | null) {
  if (item.match) return item.match(path, src);
  return path === item.href || path.startsWith(item.href + '/');
}

/** Page titles + breadcrumbs, worked out from the URL. */
const TITLES: Record<string, string> = {
  '': 'Home', assistant: 'Ask Stoora', orders: 'Orders', new: 'Create order', manual: 'Add it yourself', ai: 'Create with AI', products: 'Products', customers: 'Customers',
  chats: 'Chats', whatsapp: 'WhatsApp', instagram: 'Instagram', storefront: 'Storefront', discounts: 'Discounts', money: 'Money', analytics: 'Analytics',
  notifications: 'Notifications', settings: 'Settings', account: 'Account',
};
export function crumbsFor(path: string, label?: (seg: string, i: number, parts: string[]) => string | undefined) {
  const parts = path.split('/').filter(Boolean);
  if (!parts.length) return { trail: [] as [string, string][], title: 'Home' };
  const names = parts.map((s, i) => label?.(s, i, parts) ?? TITLES[s] ?? decodeURIComponent(s).replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()));
  const trail = parts.slice(0, -1).map((_, i) => [names[i], '/' + parts.slice(0, i + 1).join('/')] as [string, string]);
  return { trail, title: names[names.length - 1] };
}
