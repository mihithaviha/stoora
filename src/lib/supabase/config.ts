// Supabase settings come from environment variables (see .env.example).
// When they are empty the app runs in DEMO MODE: sample data in the browser, no login needed, nothing sent anywhere.
// NEXT_PUBLIC_* values are written into the browser code at build time, so rebuild after changing them.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = /^https?:\/\/.+/.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 20;

/** Pages that need a signed-in seller, buyer or admin. In demo mode none of them are protected. */
export const SELLER_PATHS = ['/dashboard', '/orders', '/bookings', '/chats', '/products', '/customers', '/money', '/analytics', '/settings', '/discounts', '/storefront', '/notifications', '/account'];
export const BUYER_PATHS = ['/buyer/orders', '/buyer/account'];
export const ADMIN_PATHS = ['/admin'];

export const startsWithAny = (path: string, list: string[]) => list.some((p) => path === p || path.startsWith(p + '/'));
/** Only same-site paths are allowed as a "go back to" address after login. */
export const safeNext = (next: string | null | undefined, fallback: string) => (next && /^\/(?!\/)/.test(next) ? next : fallback);
