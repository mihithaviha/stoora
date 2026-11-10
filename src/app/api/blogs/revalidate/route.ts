import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabase } from '@/lib/supabase/server';

// POST (no body) → the public Blogs pages are rebuilt now. Only a signed-in admin may ask; anyone else gets 403.
// The admin screens call this after Publish, Save and Delete so a change shows to visitors at once, not after a minute.
export async function POST() {
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true, demo: true });
  const sb = await createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ code: 'signed_out' }, { status: 401 });
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return NextResponse.json({ code: 'not_admin' }, { status: 403 });
  revalidatePath('/blogs');
  revalidatePath('/blogs/[slug]', 'page');
  return NextResponse.json({ ok: true });
}
