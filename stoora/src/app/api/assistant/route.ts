import { NextResponse } from 'next/server';
import { aiConfigured, askClaudeJSON } from '@/lib/anthropic';
import { assistantRules, cleanAnswer } from '@/lib/assistant';

// POST { question, history, snapshot } → AssistantAnswer
// Production note: build `snapshot` here from the signed-in seller's own records instead of trusting
// the browser, so one seller can never ask about another seller's data.
export async function POST(req: Request) {
  if (!aiConfigured()) return NextResponse.json({ code: 'not_configured' }, { status: 503 });
  let body: { question?: unknown; history?: unknown; snapshot?: Record<string, unknown> };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }
  const q = typeof body.question === 'string' ? body.question.trim().slice(0, 500) : '';
  if (!q || !body.snapshot) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const snap = JSON.stringify(body.snapshot);
  if (snap.length > 40_000) return NextResponse.json({ error: 'too_large' }, { status: 413 });
  const history = Array.isArray(body.history) ? JSON.stringify(body.history).slice(0, 3000) : '[]';
  const owner = String(body.snapshot.owner ?? 'the seller'), shop = String(body.snapshot.shop ?? 'their shop');
  try {
    const r = await askClaudeJSON(assistantRules(owner, shop), [{ type: 'text', text: `SHOP DATA: ${snap}\nEARLIER IN THIS CHAT: ${history}\nQUESTION: ${q}` }], 900);
    return NextResponse.json(cleanAnswer(r, 'ai'));
  } catch (e) {
    return NextResponse.json({ error: (e as { code?: string }).code ?? 'failed' }, { status: 502 });
  }
}
