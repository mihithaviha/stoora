import type { ReactElement } from 'react';

/**
 * The hand-painted shopfront: watercolour washes (filter #st-wc) with graphite pencil outlines (filter #st-pencil).
 * The shapes are drawn by a small seeded "hand", so every render of the same drawing is identical.
 * The name board text stays crisp and shows the seller's link.
 */

/** Shared SVG filters. Render once per page, anywhere in the body. */
export function WatercolorDefs() {
  return (
    <svg id="st-defs" width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <filter id="st-wc" x="-6%" y="-6%" width="112%" height="112%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="4" result="low" />
          <feDisplacementMap in="SourceGraphic" in2="low" scale="4" xChannelSelector="R" yChannelSelector="G" result="shape" />
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="4" seed="9" result="mid" />
          <feColorMatrix in="mid" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.7 0.55" result="pig" />
          <feComposite in="shape" in2="pig" operator="in" result="wash" />
          <feMorphology in="shape" operator="erode" radius="1.4" result="inner" />
          <feComposite in="shape" in2="inner" operator="out" result="rim" />
          <feGaussianBlur in="rim" stdDeviation="0.7" result="rimb" />
          <feColorMatrix in="rimb" type="matrix" values="0.72 0 0 0 0  0 0.72 0 0 0  0 0 0.72 0 0  0 0 0 0.5 0" result="pool" />
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="2" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.3  0 0 0 -0.9 0.42" result="g2" />
          <feComposite in="g2" in2="shape" operator="in" result="paper" />
          <feMerge><feMergeNode in="wash" /><feMergeNode in="pool" /><feMergeNode in="paper" /></feMerge>
        </filter>
        <filter id="st-pencil" x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="5" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.3" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="7" result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.5 -0.12" result="ga" />
          <feComposite in="d" in2="ga" operator="in" />
        </filter>
        <filter id="st-bloom" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="12" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="26" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation="2.2" />
        </filter>
      </defs>
    </svg>
  );
}

const LEAD = '#2A2E4D';
const CREAM = '#FFFAEF';
const MUTED = '#F2EADD';

function drawShop() {
  let seed = 11;
  const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
  const f = (n: number) => n.toFixed(1);
  const wash: ReactElement[] = [];
  const pencil: ReactElement[] = [];
  const light: ReactElement[] = [];
  let key = 0;
  const k = () => `e${key++}`;

  const wc = (tag: 'rect' | 'path' | 'ellipse' | 'circle', props: Record<string, string | number>) => {
    const Tag = tag;
    wash.push(<Tag key={k()} {...props} filter="url(#st-wc)" />);
  };
  const line = (a: number, b: number, c: number, d: number, w = 1.5) => {
    const stroke = (j: number) =>
      `M${f(a + R() * j)} ${f(b + R() * j)} Q${f((a + c) / 2 + R() * 2.6 * j)} ${f((b + d) / 2 + R() * 2.6 * j)} ${f(c + R() * j)} ${f(d + R() * j)}`;
    pencil.push(<path key={k()} d={stroke(1.3)} strokeWidth={w} pathLength={1} />);
    pencil.push(<path key={k()} className="p2" d={stroke(2.4)} strokeWidth={(w * 0.5).toFixed(2)} strokeOpacity={0.38} pathLength={1} />);
  };
  /** A pencil outline for a shape (the shape's own fill is dropped). */
  const out = (tag: 'rect' | 'path' | 'circle', props: Record<string, string | number>, w = 1.3) => {
    const Tag = tag;
    pencil.push(<Tag key={k()} {...props} strokeWidth={w} pathLength={1} />);
  };
  const box = (x: number, y: number, w: number, h: number, fill: string, sw = 1.5) => {
    wc('rect', { x, y, width: w, height: h, fill });
    line(x - 1.5, y, x + w + 1.5, y, sw);
    line(x + w, y - 1.5, x + w, y + h + 1.5, sw);
    line(x + w + 1.5, y + h, x - 1.5, y + h, sw);
    line(x, y + h + 1.5, x, y - 1.5, sw);
  };
  const kurta = (cx: number, t: number, c: string) => {
    const d = `M${cx - 13} ${t + 8} L${cx - 6} ${t} L${cx + 6} ${t} L${cx + 13} ${t + 8} L${cx + 20} ${t + 18} L${cx + 13} ${t + 23} L${cx + 13} ${t + 56} L${cx - 13} ${t + 56} L${cx - 13} ${t + 23} L${cx - 20} ${t + 18} Z`;
    wc('path', { d, fill: c });
    out('path', { d }, 1.3);
    line(cx, t + 2, cx, t + 26, 1);
    light.push(<path key={k()} d={`M${cx + 4} ${t + 30} L${cx + 9} ${t + 52}`} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={3} strokeLinecap="round" />);
  };

  // soft wash behind the shop (watercolour bloom), same footprint as the ground
  wash.push(
    <path key={k()} d="M70 300 C 40 230, 60 120, 150 100 C 230 80, 330 96, 352 170 C 372 240, 360 300, 300 312 C 230 326, 110 330, 70 300 Z" fill="#FFEFD5" opacity={0.85} filter="url(#st-bloom)" />,
  );
  wc('ellipse', { cx: 200, cy: 320, rx: 190, ry: 13, fill: MUTED });
  box(60, 136, 280, 172, CREAM);
  wc('rect', { x: 60, y: 136, width: 280, height: 16, fill: MUTED, opacity: 0.75 });
  line(130, 62, 130, 88, 1.3);
  line(270, 62, 270, 88, 1.3);
  wc('rect', { x: 88, y: 12, width: 224, height: 52, rx: 9, fill: '#171C3C' });
  pencil.push(<rect key={k()} x={88} y={12} width={224} height={52} rx={9} strokeWidth={1.2} pathLength={1} />);
  box(44, 88, 312, 22, '#DC4A3A');
  const scallop = ['#F4A24A', '#EF7F3D'];
  for (let i = 0; i < 8; i++) {
    const x = 52 + i * 37;
    wc('path', { d: `M${x} 110 L${x + 37} 110 L${x + 37} 136 A18.5 14 0 0 1 ${x} 136 Z`, fill: scallop[i % 2] });
    pencil.push(<path key={k()} d={`M${x} 136 A18.5 14 0 0 0 ${x + 37} 136`} strokeWidth={1.2} pathLength={1} />);
  }
  line(50, 110, 350, 110);
  line(350, 108, 350, 137);
  line(50, 137, 50, 108);
  box(80, 172, 140, 96, '#FFFFFF');
  light.push(<path key={k()} d="M92 260 L120 178 M104 262 L130 182" stroke="#EBE3DA" strokeWidth={3} strokeLinecap="round" opacity={0.7} />);
  line(86, 186, 214, 186, 1.2);
  kurta(110, 190, '#EF7F3D');
  kurta(150, 190, '#5F3BA8');
  kurta(190, 190, '#D13A5B');
  box(74, 268, 152, 8, '#F4A24A', 1.3);
  box(244, 172, 76, 136, '#5F3BA8');
  wc('rect', { x: 244, y: 172, width: 12, height: 136, fill: '#262A7A', opacity: 0.35 });
  wc('rect', { x: 254, y: 182, width: 56, height: 52, fill: CREAM });
  out('rect', { x: 254, y: 182, width: 56, height: 52 }, 1.2);
  wc('rect', { x: 262, y: 199, width: 40, height: 18, rx: 4, fill: '#FFE9B0' });
  out('rect', { x: 262, y: 199, width: 40, height: 18, rx: 4 }, 1);
  wc('circle', { cx: 307, cy: 254, r: 4, fill: '#FFB407' });
  out('circle', { cx: 307, cy: 254, r: 4 }, 1.1);
  box(236, 308, 92, 7, '#F4A24A', 1.2);
  pencil.push(<path key={k()} d="M56 140 Q200 184 344 140" strokeWidth={1.1} pathLength={1} />);

  // bunting
  const beads: ReactElement[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const x = (1 - t) * (1 - t) * 56 + 2 * (1 - t) * t * 200 + t * t * 344;
    const y = (1 - t) * (1 - t) * 140 + 2 * (1 - t) * t * 162 + t * t * 140;
    beads.push(<circle key={k()} cx={f(x)} cy={f(y)} r={5.2} fill={i % 2 ? '#EF7F3D' : '#FFB407'} />);
    pencil.push(<circle key={k()} cx={f(x)} cy={f(y)} r={5.2} strokeWidth={0.9} pathLength={1} />);
  }
  wash.push(<g key={k()} filter="url(#st-wc)">{beads}</g>);

  // pots and flowers
  const pot = (d: string, c: string) => {
    wc('path', { d, fill: c });
    out('path', { d }, 1.4);
  };
  pot('M30 284 L60 284 L56 310 L34 310 Z', '#DC4A3A');
  pot('M342 284 L372 284 L368 310 L346 310 Z', '#8B3A9E');
  const flowers: ReactElement[] = [];
  const blooms: [number, number, string, string][] = [
    [38, 272, '#FFB407', '#EF7F3D'], [47, 264, '#FFB407', '#EF7F3D'], [55, 274, '#FFB407', '#EF7F3D'], [45, 279, '#FFB407', '#EF7F3D'],
    [350, 272, '#EF7F3D', '#FFB407'], [359, 264, '#EF7F3D', '#FFB407'], [366, 274, '#EF7F3D', '#FFB407'],
  ];
  blooms.forEach(([x, y, a, b]) => {
    flowers.push(<circle key={k()} cx={x} cy={y} r={6.5} fill={a} />, <circle key={k()} cx={x} cy={y} r={1.8} fill={b} />);
    pencil.push(<circle key={k()} cx={x} cy={y} r={6.5} strokeWidth={1} pathLength={1} />);
  });
  wash.push(<g key={k()} filter="url(#st-wc)">{flowers}</g>);
  return { wash, pencil, light };
}

const DRAWING = drawShop();

export function ShopFront({ boardId, handle }: { boardId: string; handle?: string }) {
  const text = handle || 'your shop';
  const size = Math.max(10, Math.min(20, 190 / (text.length * 0.6)));
  return (
    <svg className="paint" viewBox="0 0 400 340" role="img" aria-label="A hand-drawn shopfront with a name board">
      <g className="wash">{DRAWING.wash}</g>
      <g className="light">{DRAWING.light}</g>
      <g className="pencil" fill="none" stroke={LEAD} strokeLinecap="round" strokeLinejoin="round" filter="url(#st-pencil)">{DRAWING.pencil}</g>
      <rect x={92} y={16} width={216} height={44} rx={6} fill="none" stroke={CREAM} strokeOpacity={0.4} />
      <text x={200} y={33} textAnchor="middle" fontSize={11} fontFamily="Lexend,sans-serif" fontWeight={600} letterSpacing={1.2} fill="#FFB407">STOORA.IN/</text>
      <text id={boardId} x={200} y={54} textAnchor="middle" fontSize={size.toFixed(1)} fontFamily="Bricolage Grotesque,sans-serif" fontWeight={800} fill="#FFFFFF">{text}</text>
      <text x={282} y={212} textAnchor="middle" fontSize={10} fontFamily="Lexend,sans-serif" fontWeight={700} fill="#171C3C">UPI</text>
    </svg>
  );
}
