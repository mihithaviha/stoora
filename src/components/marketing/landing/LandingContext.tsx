'use client';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/** What the visitor typed as their shop link. Both "claim" forms, the painted board and the step phone show it. */
type Claim = { typed: string; setTyped: (value: string) => void; handle: string };

const Ctx = createContext<Claim>({ typed: '', setTyped: () => {}, handle: '' });
export const useClaim = () => useContext(Ctx);

/** Lowercase letters, digits and dashes, 30 characters at most, no dash at either end. */
export const cleanHandle = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);

export function ClaimProvider({ children }: { children: ReactNode }) {
  const [typed, setTypedRaw] = useState('');
  const value = useMemo<Claim>(() => {
    const setTyped = (next: string) => setTypedRaw(next.toLowerCase().replace(/[^a-z0-9-]/g, ''));
    return { typed, setTyped, handle: cleanHandle(typed) };
  }, [typed]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
