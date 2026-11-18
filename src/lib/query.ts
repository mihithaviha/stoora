// The address's ?key=value parts, read on the server and handed to a screen as plain props.
// That way the screen is part of the page's HTML the moment it arrives, instead of waiting for JavaScript to read the address.
export type Query = Record<string, string>;
export type SearchParamsProp = Promise<Record<string, string | string[] | undefined>>;

/** Keeps the first value of each key. */
export async function flatQuery(sp: SearchParamsProp): Promise<Query> {
  const out: Query = {};
  for (const [k, v] of Object.entries(await sp)) { const one = Array.isArray(v) ? v[0] : v; if (typeof one === 'string') out[k] = one; }
  return out;
}
/** Reads like URLSearchParams.get. */
export const queryOf = (q: Query) => ({ get: (k: string): string | null => (k in q ? q[k] : null) });
