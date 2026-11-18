'use client';
import { useEffect, useState, type CSSProperties } from 'react';

/** The four looks of the physical storefront: colours and the two typefaces, as designed. */
export interface PhysLook { n: string; pr: string; ac: string; bg: string; tx: string; sf: string; hf: string; bf: string }
export const PHYS_LOOKS: PhysLook[] = [
  { n: 'Heritage maroon', pr: '#5E1531', ac: '#B8893A', bg: '#FFFFFF', tx: '#1E1B1D', sf: '#F7F2EC', hf: 'Cormorant Garamond', bf: 'DM Sans' },
  { n: 'Emerald silk', pr: '#0F4C3A', ac: '#C79A3B', bg: '#FFFFFF', tx: '#16201C', sf: '#F0F4F0', hf: 'Playfair Display', bf: 'DM Sans' },
  { n: 'Midnight indigo', pr: '#1F2A5A', ac: '#D9A441', bg: '#FFFFFF', tx: '#1A1C2B', sf: '#F2F3F8', hf: 'Cormorant Garamond', bf: 'DM Sans' },
  { n: 'Mono studio', pr: '#141414', ac: '#8A7F72', bg: '#FFFFFF', tx: '#141414', sf: '#F4F3F1', hf: 'Bricolage Grotesque', bf: 'DM Sans' },
];

export const lookOf = (config: { look?: number }): PhysLook => PHYS_LOOKS[Math.max(0, Math.min(PHYS_LOOKS.length - 1, Math.round(config.look ?? 0)))];

/** A heading font that is not shipped with the app falls back to the design's serif (Cormorant Garamond) so the page never shows a stranger. */
const HEADINGS: Record<string, string> = {
  'Cormorant Garamond': "'Cormorant Garamond', Georgia, serif",
  'Playfair Display': "'Cormorant Garamond', Georgia, serif",
  'Bricolage Grotesque': "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif",
};

/** The CSS variables the physical storefront reads. */
export function physVars(config: { look?: number }): CSSProperties {
  const t = lookOf(config);
  return { '--pr': t.pr, '--ac': t.ac, '--bg': t.bg, '--tx': t.tx, '--sf': t.sf, '--hf': HEADINGS[t.hf] || HEADINGS['Cormorant Garamond'], '--bf': "'DM Sans', system-ui, sans-serif", '--rd': '10px' } as CSSProperties;
}

/** The screen width class the layout uses: phone below 640, tablet below 1024. It is measured in the window the page is drawn in, so the editor preview behaves like a real phone. */
export function useDev() {
  const [w, setW] = useState(1280);
  useEffect(() => {
    const f = () => setW(window.innerWidth);
    f();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return { mob: w < 640, tab: w >= 640 && w < 1024, w };
}
