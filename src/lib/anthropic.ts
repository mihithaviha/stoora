// SERVER ONLY. Calls the Anthropic Messages API with the key from the environment.
// The key is never sent to the browser and must never use a NEXT_PUBLIC_ prefix.
import 'server-only';

/** The doc's AI_API_KEY and AI_MODEL come first; the older ANTHROPIC_* names still work. */
const apiKey = () => process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY || '';
export const aiConfigured = () => !!apiKey();

type Block = { type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

export interface AskOptions { /** Use this model instead of ANTHROPIC_MODEL. */ model?: string; /** Give up after this long (default 60 s). */ timeoutMs?: number; /** Told how many tokens the call used, so the cost per product can be counted. */ onUsage?: (u: { input: number; output: number }) => void }

export async function askClaudeJSON(system: string, content: Block[], maxTokens = 1200, opts: AskOptions = {}): Promise<unknown> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey(), 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: opts.model || process.env.AI_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: maxTokens, system, messages: [{ role: 'user', content }] }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
  });
  if (!r.ok) throw Object.assign(new Error('upstream_' + r.status), { code: 'upstream', status: r.status });
  const j = await r.json();
  if (opts.onUsage) opts.onUsage({ input: Number(j?.usage?.input_tokens) || 0, output: Number(j?.usage?.output_tokens) || 0 });
  const text: string = (j?.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw Object.assign(new Error('invalid_json'), { code: 'invalid_json' });
  try { return JSON.parse(m[0]); } catch { throw Object.assign(new Error('invalid_json'), { code: 'invalid_json' }); }
}
