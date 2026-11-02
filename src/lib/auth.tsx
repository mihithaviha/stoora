'use client';
// Who is signed in. Two modes:
//   live  - Supabase is configured: Google sign-in and one-time codes are real, the session is a cookie.
//   demo  - no Supabase keys: a flag in this browser stands in for a login, so every screen can be tried.
//
// One person, one shop. A login can have two identities, a verified phone number and a Google account, and both open the SAME account:
//   - Google first: the phone must be added and verified (a code) before the dashboard opens.      -> addPhone / confirmPhone
//   - Phone first: Google is offered after login; "Later" is allowed and stays in the setup list.  -> linkGoogle
// Identities are only ever joined by proving both (the code, and the Google sign-in), never because an email or number looks alike.
// A phone number or Google account can belong to one Stoora account only; Supabase refuses a second one and we say so plainly.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthError, User } from '@supabase/supabase-js';
import { getSupabase } from './supabase/client';
import { isSupabaseConfigured, safeNext } from './supabase/config';

export type Role = 'seller' | 'buyer' | 'admin';
export interface Person { id: string; name: string; email: string; avatar?: string; phone?: string; /** A phone number that was proven with a code is linked to this login. */ hasPhone?: boolean; /** A Google account is linked to this login. */ hasGoogle?: boolean }

export interface CodeRequest { ok: boolean; /** The number has no Stoora account (only reported when asked not to create one). */ unknown?: boolean; error?: string }
interface AuthCtx {
  mode: 'live' | 'demo';
  ready: boolean;
  user: Person | null;
  role: Role | null;
  /** Google: redirects away in live mode. Returns an error message, or null when it worked. */
  signInWithGoogle: (as: 'seller' | 'buyer', next?: string, opts?: { sample?: boolean }) => Promise<string | null>;
  /** Sends a 6-digit code to the phone. With createUser false an unknown number is reported as `unknown` and no account is made. */
  requestLoginCode: (phone: string, createUser: boolean) => Promise<CodeRequest>;
  /** Sends a 6-digit code to the phone (WhatsApp where the project has it, otherwise SMS). */
  sendCode: (phone: string) => Promise<string | null>;
  verifyCode: (phone: string, code: string, as: 'seller' | 'buyer') => Promise<string | null>;
  /** Start adding a verified phone number to the signed-in account. Returns an error message, or null when the code was sent. */
  addPhone: (phone: string) => Promise<string | null>;
  /** Finish adding the phone with the code that was sent. Returns an error message, or null when it is linked. */
  confirmPhone: (phone: string, code: string) => Promise<string | null>;
  /** Add Google to the signed-in account. Redirects away in live mode. Returns an error message, or null. */
  linkGoogle: (next?: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const SESSION_KEY = 'stoora.session';
const IDS_KEY = 'stoora.demo.identities';
const DEMO_USER: Person = { id: 'demo', name: 'Meera Iyer', email: 'meera.studio@example.in' };
/** Demo only: the sample seller's number is known, and this one pretends to belong to another account. */
export const DEMO_KNOWN_PHONE = '9876543210';
export const DEMO_TAKEN_PHONE = '9000000001';
const Ctx = createContext<AuthCtx | null>(null);
export const toE164 = (phone: string) => '+91' + phone.replace(/\D/g, '').slice(-10);

/** Plain words for what Supabase says, so nobody sees a raw error. */
export function friendly(error: Pick<AuthError, 'message'> & { code?: string; status?: number }): string {
  const m = `${error.code ?? ''} ${error.message}`;
  if (/phone_exists|already (been )?(registered|exists|taken|used)|phone.*already/i.test(m)) return 'This number is already used by another Stoora account.';
  if (/identity_already_exists|identity.*(already|exists)|already linked/i.test(m)) return 'This Google account is already used by another Stoora account.';
  if (/rate.?limit|too many|over_sms_send_rate_limit|over_request_rate_limit|429/i.test(m) || error.status === 429) return 'Too many tries. Please wait a few minutes and try again.';
  if (/otp_expired|expired|invalid/i.test(m)) return 'That code isn’t right. Check the latest message and try again.';
  return error.message;
}

interface DemoIds { phone: string; google: boolean }
const readIds = (): DemoIds | null => { try { const v = localStorage.getItem(IDS_KEY); return v ? (JSON.parse(v) as DemoIds) : null; } catch { return null; } };
const writeIds = (v: DemoIds) => { try { localStorage.setItem(IDS_KEY, JSON.stringify(v)); window.dispatchEvent(new Event('stoora-session')); } catch { /* ignore */ } };
const startDemoSession = () => { try { localStorage.setItem(SESSION_KEY, 'demo'); window.dispatchEvent(new Event('stoora-session')); } catch { /* ignore */ } };
/** The demo person. With no identity record yet (the plain sample session) both logins count as linked. */
const demoPerson = (ids: DemoIds | null): Person => ({ ...DEMO_USER, phone: ids ? (ids.phone ? '+91' + ids.phone : undefined) : '+91' + DEMO_KNOWN_PHONE, hasPhone: ids ? !!ids.phone : true, hasGoogle: ids ? ids.google : true });

const person = (u: User): Person => ({ id: u.id, email: u.email ?? '', phone: u.phone || undefined, hasPhone: !!u.phone && !!u.phone_confirmed_at, hasGoogle: (u.identities ?? []).some((i) => i.provider === 'google'), name: (u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'You') as string, avatar: (u.user_metadata?.avatar_url || u.user_metadata?.picture) as string | undefined });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const sb = getSupabase();
  const [user, setUser] = useState<Person | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!sb) { try { setUser(localStorage.getItem(SESSION_KEY) ? demoPerson(readIds()) : null); } catch { setUser(null); } setRole(null); setReady(true); return; }
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
    const on = () => { try { setUser(localStorage.getItem(SESSION_KEY) ? demoPerson(readIds()) : null); } catch { /* ignore */ } };
    window.addEventListener('storage', on); window.addEventListener('stoora-session', on);
    return () => { window.removeEventListener('storage', on); window.removeEventListener('stoora-session', on); };
  }, [sb]);

  const signInWithGoogle = useCallback<AuthCtx['signInWithGoogle']>(async (as, next, opts) => {
    const target = safeNext(next, as === 'seller' ? '/dashboard' : '/buyer/orders');
    if (!sb) {
      // demo: Google signs in as the sample shop. The sample shop button also counts its phone as linked; a plain Google sign-in does not.
      startDemoSession();
      const cur = readIds();
      writeIds({ phone: opts?.sample ? DEMO_KNOWN_PHONE : cur?.phone ?? '', google: true });
      window.location.assign(target); return null;
    }
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback?role=${as}&next=${encodeURIComponent(target)}`, queryParams: { prompt: 'select_account' } } });
    return error ? friendly(error) : null;
  }, [sb]);

  const requestLoginCode = useCallback<AuthCtx['requestLoginCode']>(async (phone, createUser) => {
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (!sb) {
      if (!createUser && digits !== DEMO_KNOWN_PHONE && readIds()?.phone !== digits) return { ok: true, unknown: true }; // demo: code is always 123456
      return { ok: true };
    }
    const { error } = await sb.auth.signInWithOtp({ phone: toE164(digits), options: { channel: 'whatsapp', shouldCreateUser: createUser } });
    if (!error) return { ok: true };
    // Supabase answers "signups not allowed for otp" when the number has no account and we asked it not to make one
    if (!createUser && (error.code === 'otp_disabled' || error.code === 'user_not_found' || /signups? not allowed|user not found/i.test(error.message))) return { ok: false, unknown: true };
    return { ok: false, error: friendly(error) };
  }, [sb]);

  const sendCode = useCallback<AuthCtx['sendCode']>(async (phone) => {
    const r = await requestLoginCode(phone, true);
    return r.ok ? null : r.error ?? 'We could not send the code. Try again.';
  }, [requestLoginCode]);

  const verifyCode = useCallback<AuthCtx['verifyCode']>(async (phone, code, as) => {
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (!sb) {
      if (code !== '123456') return 'That code isn’t right. Check the latest message and try again.';
      startDemoSession();
      const cur = readIds();
      writeIds({ phone: digits, google: cur?.google ?? false });
      return null;
    }
    const { error } = await sb.auth.verifyOtp({ phone: toE164(digits), token: code, type: 'sms' });
    if (error) return friendly(error);
    if (as === 'seller') await sb.rpc('become_seller');
    return null;
  }, [sb]);

  const addPhone = useCallback<AuthCtx['addPhone']>(async (phone) => {
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) return 'Enter a 10-digit mobile number.';
    if (!sb) return digits === DEMO_TAKEN_PHONE ? 'This number is already used by another Stoora account.' : null;
    const { error } = await sb.auth.updateUser({ phone: toE164(digits) });
    return error ? friendly(error) : null;
  }, [sb]);

  const confirmPhone = useCallback<AuthCtx['confirmPhone']>(async (phone, code) => {
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (!sb) {
      if (code !== '123456') return 'That code isn’t right. Check the latest message and try again.';
      const cur = readIds();
      writeIds({ phone: digits, google: cur ? cur.google : true });
      return null;
    }
    const { error } = await sb.auth.verifyOtp({ phone: toE164(digits), token: code, type: 'phone_change' });
    if (error) return friendly(error);
    await sb.auth.refreshSession();
    return null;
  }, [sb]);

  const linkGoogle = useCallback<AuthCtx['linkGoogle']>(async (next) => {
    const target = safeNext(next, '/dashboard');
    if (!sb) { const cur = readIds(); writeIds({ phone: cur ? cur.phone : DEMO_KNOWN_PHONE, google: true }); return null; }
    const { error } = await sb.auth.linkIdentity({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback?role=seller&link=1&next=${encodeURIComponent(target)}` } });
    return error ? friendly(error) : null;
  }, [sb]);

  const signOut = useCallback(async () => {
    if (sb) await sb.auth.signOut();
    try { localStorage.removeItem(SESSION_KEY); window.dispatchEvent(new Event('stoora-session')); } catch { /* ignore */ }
    setUser(null); setRole(null);
  }, [sb]);

  const value = useMemo<AuthCtx>(() => ({ mode: isSupabaseConfigured ? 'live' : 'demo', ready, user, role, signInWithGoogle, requestLoginCode, sendCode, verifyCode, addPhone, confirmPhone, linkGoogle, signOut }), [ready, user, role, signInWithGoogle, requestLoginCode, sendCode, verifyCode, addPhone, confirmPhone, linkGoogle, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() { const c = useContext(Ctx); if (!c) throw new Error('useAuth must be used inside <AuthProvider>'); return c; }
