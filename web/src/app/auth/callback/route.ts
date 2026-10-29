// Google sign-in lands here. Supabase gives us a one-time code; we swap it for a login cookie and send the person on.
//   /auth/callback?code=...&next=/dashboard&role=seller
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured, safeNext } from '@/lib/supabase/config';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const role = searchParams.get('role') === 'seller' ? 'seller' : 'buyer';
  const login = role === 'seller' ? '/login' : '/buyer/login';
  const next = safeNext(searchParams.get('next'), role === 'seller' ? '/dashboard' : '/buyer/orders');

  if (!isSupabaseConfigured) return NextResponse.redirect(`${origin}${login}?error=not_configured`);
  const failed = searchParams.get('error_description') || searchParams.get('error');
  const code = searchParams.get('code');
  if (failed || !code) return NextResponse.redirect(`${origin}${login}?error=${encodeURIComponent(failed || 'missing_code')}`);

  const supabase = createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}${login}?error=${encodeURIComponent(error.message)}`);

  if (role === 'seller') await supabase.rpc('become_seller'); // a new seller starts as a buyer profile; this switches it
  return NextResponse.redirect(`${origin}${next}`);
}
