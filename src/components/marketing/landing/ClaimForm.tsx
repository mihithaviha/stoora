'use client';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { Ic } from '../bits';
import { useClaim } from './LandingContext';

/** "stoora.in/yourshop" and a button. Sends the visitor to sign-up with the link they chose. */
export function ClaimForm({ id, button = 'Get started' }: { id: string; button?: string }) {
  const router = useRouter();
  const { typed, setTyped, handle } = useClaim();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    router.push(handle ? `/signup?shop=${encodeURIComponent(handle)}` : '/signup');
  };
  return (
    <form className="claim" onSubmit={submit} noValidate>
      <label className="box" htmlFor={id}>
        <span className="pre">stoora.in/</span>
        <input
          id={id}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder="yourshop"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="url"
          maxLength={30}
          aria-label="Choose your shop link"
        />
      </label>
      <button className="btn primary" type="submit">{button}<Ic n="arrow_forward" c="sm" /></button>
    </form>
  );
}
