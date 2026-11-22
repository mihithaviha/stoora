// Meta Pixel: a tracking script for Facebook/Instagram ads (see the email from the Stoora team, and
// https://www.facebook.com/business/help/402791146561655). The base code loads on every page (in each of the
// three root layouts); this file is the one place that calls it, so every call is safe if the script hasn't
// loaded yet (an ad blocker, or the moment right after a page loads).
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1534573061864648';

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[] };
  }
}

/** A Meta "standard event" (the ones Facebook pre-defines and can optimise ads for). */
export type PixelEvent = 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase' | 'Lead' | 'CompleteRegistration';

/** Fires a Pixel event. Does nothing (never throws) if the script hasn't loaded, is blocked, or this is a server render. */
export function trackPixel(event: PixelEvent, params?: Record<string, unknown>): void {
  try {
    if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
    if (params) window.fbq('track', event, params);
    else window.fbq('track', event);
  } catch { /* an ad blocker or a stray error here should never break the page */ }
}
