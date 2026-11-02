import { NextResponse } from 'next/server';
import { aiConfigured, askClaudeJSON } from '@/lib/anthropic';
import { normaliseDraft, productPrompt } from '@/lib/product-ai';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabase } from '@/lib/supabase/server';

// POST { photos: [data URLs, at most 3, about 1000 px], categories: string[], shopName?: string } → a product draft.
// ONE AI call fills everything (PRD 5.3, "AI cost rules"). The cheapest model that passes the tests is the default;
// set ANTHROPIC_PRODUCT_MODEL to move up only if it fails them. 20 drafts per shop per day; calls and tokens are counted per day.
// Never blocks the seller: any problem answers with a code, and the screen shows empty boxes.
const OK_IMG = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const DAILY_LIMIT = 20;
const SECONDS = 15; // the screen also gives up after 15 s

export async function POST(req: Request) {
  if (!aiConfigured()) return NextResponse.json({ code: 'not_configured' }, { status: 503 });
  let b: { photos?: unknown; categories?: unknown; shopName?: unknown };
  try { b = await req.json(); } catch { return NextResponse.json({ code: 'bad_request' }, { status: 400 }); }
  const photos = (Array.isArray(b.photos) ? b.photos : []).slice(0, 3).flatMap((u) => {
    const m = typeof u === 'string' ? u.match(/^data:(image\/[a-z+.-]+);base64,([A-Za-z0-9+/=]+)$/) : null;
    return m && OK_IMG.includes(m[1]) && m[2].length < 4_000_000 ? [{ type: m[1], data: m[2] }] : [];
  });
  if (!photos.length) return NextResponse.json({ code: 'empty' }, { status: 400 });
  const categories = (Array.isArray(b.categories) ? b.categories : []).filter((c): c is string => typeof c === 'string').map((c) => c.slice(0, 40)).slice(0, 40);
  const shopName = typeof b.shopName === 'string' ? b.shopName.slice(0, 60) : '';

  // With a real database: only the shop's owner, and at most DAILY_LIMIT drafts a day. In demo mode the screen keeps its own count.
  let record: ((u: { input: number; output: number }) => void) | undefined;
  if (isSupabaseConfigured) {
    const sb = await createServerSupabase();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ code: 'signed_out' }, { status: 401 });
    const { data: shop } = await sb.from('shops').select('id').eq('owner_id', user.id).limit(1).maybeSingle();
    if (!shop) return NextResponse.json({ code: 'no_shop' }, { status: 403 });
    const { data: allowed } = await sb.rpc('ai_draft_take', { p_shop: shop.id, p_limit: DAILY_LIMIT });
    if (!allowed) return NextResponse.json({ code: 'limit', limit: DAILY_LIMIT }, { status: 429 });
    record = (u) => { void sb.rpc('ai_draft_record', { p_shop: shop.id, p_in: u.input, p_out: u.output }); };
  }

  try {
    const r = await askClaudeJSON('You list products for small sellers from photos. Reply with JSON only.', [
      ...photos.map((i) => ({ type: 'image' as const, source: { type: 'base64' as const, media_type: i.type, data: i.data } })),
      { type: 'text', text: productPrompt(categories, shopName) },
    ], 700, { model: process.env.AI_MODEL || process.env.ANTHROPIC_PRODUCT_MODEL || 'claude-haiku-5-5', timeoutMs: SECONDS * 1000, onUsage: (u) => { record?.(u); console.info(`[describe-product] tokens in=${u.input} out=${u.output}`); } });
    return NextResponse.json({ draft: normaliseDraft(r, categories) });
  } catch (e) {
    const code = (e as { code?: string }).code;
    return NextResponse.json({ code: code === 'invalid_json' ? 'no_draft' : 'failed' }, { status: code === 'invalid_json' ? 422 : 502 });
  }
}
