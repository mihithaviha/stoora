import type { ReactNode } from 'react';

/** Class names of the standard storefront all start with "sx-". This writes "btn btn-go" as "sx-btn sx-btn-go". */
export const cx = (names: string) => names.split(' ').filter(Boolean).map((n) => 'sx-' + n).join(' ');

/** A Material Symbols icon at the standard storefront's sizes. */
export function I({ n, c = '' }: { n: string; c?: '' | 's' | 'l' }) {
  return <span className={`ms ${cx(`i ${c}`)}`} aria-hidden="true">{n}</span>;
}

export const rupees = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

/** The painted awning: scallops in two colours across the top of the shopfront (drawn in SVG at the width it is given). */
export function AwningSvg({ width, colors }: { width: number; colors: [string, string] }) {
  const ink = '#171C3C';
  const n = Math.max(5, Math.round(width / 34));
  const s = width / n, h = 22, r = s / 2, y0 = 6;
  const fills = [colors[0], '#FFFFFF', colors[1], '#FFFFFF'];
  return (
    <svg width={width} height={y0 + h + r + 2} viewBox={`0 0 ${width} ${y0 + h + r + 2}`} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const x0 = i * s, x1 = x0 + s;
        return <path key={i} d={`M${x0} ${y0} H${x1} V${y0 + h} A${r} ${r} 0 0 1 ${x0} ${y0 + h} Z`} fill={fills[i % 4]} stroke={ink} strokeWidth="2" strokeLinejoin="round" />;
      })}
      <rect x="0" y="1" width={width} height="9" rx="3" fill={ink} />
    </svg>
  );
}

/** The painted shopfront drawn for an empty cart, and (with a parcel and a tick) for a placed order. */
export function ShopfrontArt({ name, done = false }: { name: string; done?: boolean }): ReactNode {
  const ink = '#171C3C';
  const scallops = ['#f4a24a', '#FFFFFF', '#ef7f3d', '#FFFFFF', '#dc4a3a', '#FFFFFF'];
  return (
    <svg viewBox="0 0 320 232" role="img" aria-label={`Painted shopfront${done ? ' with a parcel ready to ship' : ''}`}>
      <rect x="14" y="214" width="292" height="12" rx="3" fill="#F7F7F7" stroke={ink} strokeWidth="2" />
      <rect x="50" y="52" width="220" height="162" fill="#FFFFFF" stroke={ink} strokeWidth="2" />
      <rect x="42" y="38" width="236" height="14" rx="3" fill="#F7F7F7" stroke={ink} strokeWidth="2" />
      <rect x="82" y="58" width="156" height="32" rx="4" fill="#FFFFFF" stroke={ink} strokeWidth="2" />
      <text x="160" y="80" textAnchor="middle" fontFamily="Bricolage Grotesque,Arial,sans-serif" fontWeight="800" fontSize={name.length > 14 ? 13 : 19} fill={ink}>{name.length > 22 ? name.slice(0, 21) + '…' : name}</text>
      <rect x="44" y="90" width="232" height="6" rx="2" fill={ink} />
      {scallops.map((c, i) => { const x = 44 + i * 38.67; return <path key={i} d={`M${x} 94 H${x + 38.67} V114 A19.33 19.33 0 0 1 ${x} 114 Z`} fill={c} stroke={ink} strokeWidth="2" strokeLinejoin="round" />; })}
      <rect x="68" y="142" width="44" height="72" rx="3" fill="#FFFFFF" stroke={ink} strokeWidth="2" />
      <rect x="76" y="150" width="28" height="30" rx="2" fill="#F7F7F7" stroke={ink} strokeWidth="2" />
      <circle cx="104" cy="190" r="3" fill={ink} />
      <rect x="130" y="144" width="122" height="62" rx="3" fill="#FFFFFF" stroke={ink} strokeWidth="2" />
      <path d="M138 152 H244" stroke={ink} strokeWidth="2" strokeLinecap="round" />
      <path d="M146 152 v36 q8 5 16 0 v-36 Z" fill="#262a7a" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
      <path d="M174 152 v44 q8 5 16 0 v-44 Z" fill="#dc4a3a" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
      <path d="M202 152 v32 q8 5 16 0 v-32 Z" fill="#f4a24a" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
      <rect x="266" y="178" width="36" height="36" rx="2" fill="#ef7f3d" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
      <path d="M266 192 H302 M284 178 V192" stroke={ink} strokeWidth="2" strokeLinecap="round" />
      {done ? <><circle cx="284" cy="190" r="13" fill="#0FA05C" stroke={ink} strokeWidth="2" /><path d="M277.5 190.5 l5 5 l9 -10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></> : null}
    </svg>
  );
}
