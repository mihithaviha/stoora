// SERVER ONLY. Calls the Anthropic Messages API with the key from the environment.
// The key is never sent to the browser and must never use a NEXT_PUBLIC_ prefix.
import 'server-only';

export const aiConfigured = () => !!process.env.ANTHROPIC_API_KEY;

type Block = { type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

export async function askClaudeJSON(system: string, content: Block[], maxTokens = 1200): Promise<unknown> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY as string, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: maxTokens, system, messages: [{ role: 'user', content }] }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!r.ok) throw Object.assign(new Error('upstream_' + r.status), { code: 'upstream', status: r.status });
  const j = await r.json();
  const text: string = (j?.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw Object.assign(new Error('invalid_json'), { code: 'invalid_json' });
  try { return JSON.parse(m[0]); } catch { throw Object.assign(new Error('invalid_json'), { code: 'invalid_json' }); }
}
