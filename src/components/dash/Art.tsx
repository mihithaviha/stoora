import type { ReactElement } from 'react';

/**
 * The painted-sign drawings on the dashboard's empty and setup screens: wobbly ink lines over flat fills, in the brand colours.
 * A small seeded "hand" draws them, so the same drawing always looks the same.
 */
const INK = '#171C3C';
const CREAM = '#FFFAEF';
const MUTED = '#F2EADD';

export type ArtKey = 'product' | 'chat' | 'camera' | 'upi' | 'look' | 'link' | 'gift' | 'done';

function draw(key: ArtKey): ReactElement[] {
  let seed = [...key].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 2147483646 + 1;
  const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
  let n = 0;
  const k = () => `a${n++}`;
  const out: ReactElement[] = [];
  const push = (el: ReactElement) => out.push(el);

  const ln = (a: number, b: number, c: number, d: number, w = 2) => {
    const path = `M${(a + R() * 1.2).toFixed(1)} ${(b + R() * 1.2).toFixed(1)} Q${((a + c) / 2 + R() * 2.2).toFixed(1)} ${((b + d) / 2 + R() * 2.2).toFixed(1)} ${(c + R() * 1.2).toFixed(1)} ${(d + R() * 1.2).toFixed(1)}`;
    push(<path key={k()} d={path} fill="none" stroke={INK} strokeWidth={w} strokeLinecap="round" pathLength={1} />);
  };
  const box = (x: number, y: number, w: number, h: number, fill: string, sw = 2) => {
    push(<rect key={k()} x={x} y={y} width={w} height={h} fill={fill} />);
    ln(x - 1.5, y, x + w + 1.5, y, sw); ln(x + w, y - 1.5, x + w, y + h + 1.5, sw); ln(x + w + 1.5, y + h, x - 1.5, y + h, sw); ln(x, y + h + 1.5, x, y - 1.5, sw);
  };
  const ground = () => push(<ellipse key={k()} cx={60} cy={92} rx={44} ry={5} fill={MUTED} />);
  const awning = (x: number, y: number, w: number, c: string) => {
    box(x, y, w, 14, c);
    const count = Math.round(w / 14);
    const r = w / count / 2;
    for (let i = 0; i < count; i++) {
      const cx = x + r + i * 2 * r;
      push(<path key={k()} d={`M${cx - r} ${y + 14} A${r} ${r * 0.8} 0 0 0 ${cx + r} ${y + 14}`} fill={c} stroke={INK} strokeWidth={1.8} />);
    }
  };
  const board = (cx: number, y: number, text: string, fs = 10) => {
    const w = text.length * fs * 0.56 + 18;
    const h = fs + 12;
    ln(cx - w / 2 + 8, y - 10, cx - w / 2 + 11, y, 1.4); ln(cx + w / 2 - 8, y - 10, cx + w / 2 - 11, y, 1.4);
    push(<rect key={k()} x={cx - w / 2} y={y} width={w} height={h} rx={6} fill={INK} />);
    push(<rect key={k()} x={cx - w / 2 + 3} y={y + 3} width={w - 6} height={h - 6} rx={4} fill="none" stroke={CREAM} strokeOpacity={0.5} />);
    push(<text key={k()} x={cx} y={y + h / 2 + fs * 0.36} textAnchor="middle" fontSize={fs} fontFamily="Bricolage Grotesque,sans-serif" fontWeight={800} fill="#FFFFFF">{text}</text>);
  };
  const tick = (d: string, stroke: string, w = 2.6) => push(<path key={k()} d={d} fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />);

  switch (key) {
    case 'product':
      ground(); ln(60, 10, 60, 18, 1.8);
      push(<path key={k()} d="M40 28 L60 18 L80 28" fill="none" stroke={INK} strokeWidth={2} strokeLinejoin="round" />);
      push(<path key={k()} d="M44 28 L76 28 L84 40 L76 45 L76 86 L44 86 L44 45 L36 40 Z" fill="#EF7F3D" stroke={INK} strokeWidth={2} strokeLinejoin="round" />);
      ln(60, 30, 60, 54, 1.6); push(<circle key={k()} cx={60} cy={62} r={2} fill={INK} />); push(<circle key={k()} cx={60} cy={70} r={2} fill={INK} />);
      break;
    case 'chat':
      ground(); box(22, 18, 58, 38, '#D13A5B');
      push(<path key={k()} d="M32 56 l-5 13 l16 -13" fill="#D13A5B" stroke={INK} strokeWidth={2} strokeLinejoin="round" />);
      [39, 51, 63].forEach((cx) => push(<circle key={k()} cx={cx} cy={37} r={3} fill="#FFFFFF" />));
      box(62, 52, 40, 26, CREAM);
      push(<path key={k()} d="M92 78 l4 10 l-12 -10" fill={CREAM} stroke={INK} strokeWidth={2} strokeLinejoin="round" />);
      ln(70, 61, 94, 61, 1.6); ln(70, 69, 86, 69, 1.6);
      break;
    case 'camera':
      ground(); box(26, 32, 68, 48, '#5F3BA8'); box(40, 24, 18, 8, '#5F3BA8', 1.8);
      push(<circle key={k()} cx={60} cy={56} r={15} fill={CREAM} stroke={INK} strokeWidth={2} />); push(<circle key={k()} cx={60} cy={56} r={7} fill={INK} />);
      push(<circle key={k()} cx={83} cy={41} r={3} fill="#FFB407" stroke={INK} strokeWidth={1.4} />);
      break;
    case 'upi':
      ground(); box(38, 10, 40, 76, '#FFFFFF'); ln(52, 16, 64, 16, 1.6);
      push(<circle key={k()} cx={58} cy={46} r={12} fill="#DCEFDF" />); tick('M52 46 l4 4 l8 -8', '#065F37'); ln(48, 70, 68, 70, 1.6);
      push(<circle key={k()} cx={86} cy={72} r={13} fill="#FFB407" stroke={INK} strokeWidth={2} />);
      push(<text key={k()} x={86} y={77} textAnchor="middle" fontSize={14} fontFamily="Lexend,sans-serif" fontWeight={600} fill={INK}>₹</text>);
      break;
    case 'look':
      ground(); box(28, 44, 64, 44, CREAM); awning(24, 38, 72, '#F4A24A'); box(34, 60, 22, 16, '#FFFFFF', 1.6); box(66, 60, 18, 28, '#FFFFFF', 1.6); board(60, 14, 'your shop', 9); ln(18, 89, 102, 89, 2);
      break;
    case 'link':
      ground(); board(60, 20, 'stoora.in/meera', 10); ln(28, 62, 92, 62, 1.6);
      tick('M44 74 a7 7 0 0 1 0 -10 l6 -6 a7 7 0 0 1 10 10', '#DC4A3A', 3); tick('M76 66 a7 7 0 0 1 0 10 l-6 6 a7 7 0 0 1 -10 -10', '#DC4A3A', 3);
      break;
    case 'gift':
      ground(); box(30, 42, 60, 44, '#DC4A3A'); box(26, 32, 68, 12, '#DC4A3A'); box(54, 32, 12, 54, CREAM, 1.8);
      tick('M60 32 c-10 -16 -24 -8 -12 0 M60 32 c10 -16 24 -8 12 0', INK, 2); box(84, 52, 20, 12, '#FFE9B0', 1.6);
      push(<text key={k()} x={94} y={61} textAnchor="middle" fontSize={8} fontFamily="Lexend,sans-serif" fontWeight={600} fill={INK}>%</text>);
      break;
    default:
      ground(); box(30, 40, 60, 44, '#F4A24A'); ln(60, 40, 60, 84, 1.6); ln(30, 56, 90, 56, 1.6);
      push(<circle key={k()} cx={86} cy={34} r={13} fill="#DCEFDF" stroke={INK} strokeWidth={2} />); tick('M80 34 l4 4 l8 -8', '#065F37');
  }
  return out;
}

export function Art({ k, height = 100 }: { k: ArtKey; height?: number }) {
  return (
    <svg className="art" viewBox="0 0 120 100" height={height} width={height * 1.2} role="img" aria-hidden="true" style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }}>
      {draw(k)}
    </svg>
  );
}
