'use client';
// Who is signed in. Two modes:
//   live  - Supabase is configured: Google sign-in and one-time codes are real, the session is a cookie.
//   demo  - no Supabase keys: a flag in this browser stands in for a login, so every screen can be tried.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase } from './supabase/client';
import { isSupabaseConfigured, safeNext } from './supabase/config';

export type Role = 'seller' | 'buyer' | 'admin';
export interface Person { id: string; name: string; email: string; avatar?: string; phone?: string }
interface AuthCtx {
  mode: 'live' | 'demo';
  ready: boolean;
  user: Person | null;
  role: Role | null;
  /** Google: redirects away in live mode. Returns an error message, or null when it worked. */
  signInWithGoogle: (as: 'seller' | 'buyer', next?: string) => Promise<string | null>;
  /** Sends a 6-digit code to the phone (WhatsApp where the project has it, otherwise SMS). */
  sendCode: (phone: string) => Promise<string | null>;
  verifyCode: (phone: string, code: string, as: 'seller' | 'buyer') => Promise<string | null>;
  signOut: () => Promise<void>;
}

const SESSION_KEY = 'stoora.session';
const DEMO_USER: Person = { id: 'demo', name: 'Meera Iyer', email: 'meera.studio@example.in' };
const Ctx = createContext<AuthCtx | null>(null);
export const toE164 = (phone: string) => '+91' + phone.replace(/\D/g, '').slice(-10);

const person = (u: User): Person => ({ id: u.id, email: u.email ?? '', phone: u.phone || undefined, name: (u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'You') as string, avatar: (u.user_metadata?.avatar_url || u.user_metadata?.picture) as string | undefined });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const sb = getSupabase();
  const [user, setUser] = useState<Person | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!sb) { try { setUser(localStorage.getItem(SESSION_KEY) ? DEMO_USER : null); } catch { setUser(null); } setRole(null); setReady(true); return; }
    let alive = true;
    const apply = async (u: User | null) => {
      if (!alive) return;
      setUser(u ? person(u) : null);
      if (u) { const { data } = await sb.from('profiles').select('role').eq('id', u.id).maybeSingle(); if (alive) setRole((data?.role as Role) ?? 'buyer'); } else setRole(null);
      if (alive) setReady(true);
    };
    sb.auth.getUser().then(({ data }) => apply(data.user));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => { apply(session?.user ?? null); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [sb]);

  // demo mode: the flag can change in another tab or page
  useEffect(() => {
    if (sb) return;
    const on = () => { try { setUser(localStorage.getItem(SESSION_KEY) ? DEMO_USER : null); } catch { /* ignore */ } };
    window.addEventListener('storage', on); window.addEventListener('stoora-session', on);
    return () => { window.removeEventListener('storage', on); window.removeEventListener('stoora-session', on); };
  }, [sb]);

  const signInWithGoogle = useCallback<AuthCtx['signInWithGoogle']>(async (as, next) => {
    const target = safeNext(next, as === 'seller' ? '/dashboard' : '/buyer/orders');
    if (!sb) { try { localStorage.setItem(SESSION_KEY, 'demo'); window.dispatchEvent(new Event('stoora-session')); } catch { /* ignore */ } window.location.assign(target); return null; }
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback?role=${as}&next=${encodeURIComponent(target)}`, queryParams: { prompt: 'select_account' } } });
    return error ? error.message : null;
  }, [sb]);

  const sendCode = useCallback<AuthCtx['sendCode']>(async (phone) => {
    if (!sb) return null; // demo: the code is always 123456
    const { error } = await sb.auth.signInWithOtp({ phone: toE164(phone), options: { channel: 'whatsapp' } });
    return error ? error.message : null;
  }, [sb]);

  const verifyCode = useCallback<AuthCtx['verifyCode']>(async (phone, code, as) => {
    if (!sb) { if (code !== '123456') return 'That code isn’t right.'; try { localStorage.setItem(SESSION_KEY, 'demo'); window.dispatchEvent(new Event('stoora-session')); } catch { /* ignore */ } return null; }
    const { error } = await sb.auth.verifyOtp({ phone: toE164(phone), token: code, type: 'sms' });
    if (error) return error.message;
    if (as === 'seller') await sb.rpc('become_seller');
    return null;
  }, [sb]);

  const signOut = useCallback(async () => {
    if (sb) await sb.auth.signOut();
    try { localStorage.removeItem(SESSION_KEY); window.dispatchEvent(new Event('stoora-session')); } catch { /* ignore */ }
    setUser(null); setRole(null);
  }, [sb]);

  const value = useMemo<AuthCtx>(() => ({ mode: isSupabaseConfigured ? 'live' : 'demo', ready, user, role, signInWithGoogle, sendCode, verifyCode, signOut }), [ready, user, role, signInWithGoogle, sendCode, verifyCode, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() { const c = useContext(Ctx); if (!c) throw new Error('useAuth must be used inside <AuthProvider>'); return c; }
