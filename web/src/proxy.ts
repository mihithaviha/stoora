// (Next 16 calls this file "proxy"; it was "middleware" before.) Keeps the Supabase login fresh and sends signed-out people to the right login page.
// In demo mode (no Supabase keys) it does nothing, so every page opens without logging in.
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_PATHS, BUYER_PATHS, SELLER_PATHS, SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured, startsWithAny } from '@/lib/supabase/config';

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const toLogin = (login: string) => { const url = request.nextUrl.clone(); url.pathname = login; url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`; return NextResponse.redirect(url); };
  if (!user) {
    if (startsWithAny(path, BUYER_PATHS)) return toLogin('/buyer/login');
    if (startsWithAny(path, SELLER_PATHS) || startsWithAny(path, ADMIN_PATHS)) return toLogin('/login');
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|fonts|images|favicon.ico).*)'],
};
