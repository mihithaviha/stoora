'use client';
// Is a shop link (stoora.in/<handle>) free? Checked while the seller types (PRD S3): a green tick if free,
// a red "taken, try shaurya-studio" if not. With a database it asks the public shop list; in demo mode only the
// reserved words and a few pretend-taken links count as taken.
import { useEffect, useState } from 'react';
import { cleanHandle } from './format';
import { getSupabase } from './supabase/client';

/** Words that are never a shop link: they are Stoora's own addresses. */
export const RESERVED_HANDLES = ['admin', 'stoora', 'login', 'signup', 'api', 'app', 'www', 'support', 'help', 'shop', 'demo', 'dashboard', 'settings', 'account', 'orders', 'products', 'buyer', 'blogs', 'journal', 'privacy', 'terms'];
/** Demo mode has no database, so these pretend to be taken. */
const DEMO_TAKEN = ['meera', 'meerastudio', 'meera-studio'];

export const validHandle = (h: string) => /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(h);

async function isTaken(handle: string): Promise<boolean> {
  if (RESERVED_HANDLES.includes(handle)) return true;
  const sb = getSupabase();
  if (!sb) return DEMO_TAKEN.includes(handle);
  const { data, error } = await sb.from('public_shops').select('handle').eq('handle', handle).maybeSingle();
  if (error) throw error;
  return !!data;
}

export type HandleState = { status: 'idle' | 'checking' | 'free' | 'taken' | 'unknown'; suggestion?: string };

/** `name` is the shop name, used to suggest a nicer link like shaurya-studio. */
export function useHandleCheck(handle: string, name = ''): HandleState {
  const [state, setState] = useState<HandleState>({ status: 'idle' });
  useEffect(() => {
    if (!validHandle(handle)) { setState({ status: 'idle' }); return; }
    let alive = true;
    setState({ status: 'checking' });
    const t = setTimeout(async () => {
      try {
        if (!(await isTaken(handle))) { if (alive) setState({ status: 'free' }); return; }
        const dashed = cleanHandle(name);
        const tries = [dashed !== handle ? dashed : '', `${handle}-shop`, `${handle}-studio`, `${handle}-2`].filter((h) => validHandle(h) && h !== handle);
        let suggestion: string | undefined;
        for (const c of tries) { if (!(await isTaken(c))) { suggestion = c; break; } }
        if (alive) setState({ status: 'taken', suggestion });
      } catch { if (alive) setState({ status: 'unknown' }); }
    }, 400);
    return () => { alive = false; clearTimeout(t); };
  }, [handle, name]);
  return state;
}
