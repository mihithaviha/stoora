import { NextResponse } from 'next/server';
import { aiConfigured, askClaudeJSON } from '@/lib/anthropic';
import { extractPrompt, type CatalogItem } from '@/lib/order-draft';

// POST { text, source, images[{type,data}], catalog } → ExtractedOrder (a DRAFT; never creates an order)
// Audio is not accepted: speech-to-text is not connected.
const OK_IMG = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export async function POST(req: Request) {
  if (!aiConfigured()) return NextResponse.json({ code: 'not_configured' }, { status: 503 });
  let b: { text?: unknown; source?: unknown; images?: unknown; catalog?: unknown };
  try { b = await req.json(); } catch { return NextResponse.json({ code: 'bad_request' }, { status: 400 }); }
  const text = typeof b.text === 'string' ? b.text.slice(-8000) : '';
  const source = typeof b.source === 'string' ? b.source.slice(0, 30) : 'Other';
  const images = (Array.isArray(b.images) ? b.images : []).slice(0, 3).filter((i): i is { type: string; data: string } => !!i && OK_IMG.includes(i.type) && typeof i.data === 'string' && i.data.length < 6_000_000);
  // Production note: load the catalog from the seller's own products on the server.
  const catalog = (Array.isArray(b.catalog) ? b.catalog : []).slice(0, 300) as CatalogItem[];
  if (!text.trim() && !images.length) return NextResponse.json({ code: 'empty' }, { status: 400 });
  try {
    const r = await askClaudeJSON('You extract order drafts for a seller. Reply with JSON only.', [
      ...images.map((i) => ({ type: 'image' as const, source: { type: 'base64' as const, media_type: i.type, data: i.data } })),
      { type: 'text', text: extractPrompt(catalog, text, source, images.length > 0) },
    ], 1500);
    const o = r as { items?: unknown[] };
    if (!o || !Array.isArray(o.items)) return NextResponse.json({ code: 'no_order' }, { status: 422 });
    return NextResponse.json(r);
  } catch (e) {
    const code = (e as { code?: string }).code;
    return NextResponse.json({ code: code === 'invalid_json' ? 'no_order' : 'failed' }, { status: code === 'invalid_json' ? 422 : 502 });
  }
}
