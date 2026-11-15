'use client';
import { useId } from 'react';

/**
 * The painted shopfront on the Storefront page: an orange awning, shirts swaying in the window, a UPI sign on the door, coins floating up.
 * The sign shows the shop's own address. Everything moves gently (and stands still for people who turned motion off, see storefront-editor.css).
 */
export function ShopSign({ handle, name }: { handle: string; name: string }) {
  const uid = useId().replace(/:/g, '');
  const signText = handle.length > 18 ? handle.slice(0, 17) + '…' : handle || 'your shop';
  // the sign is 252 wide: shorter addresses are large, longer ones get smaller so they always fit
  const signSize = Math.max(17, Math.min(33, Math.floor(236 / (0.58 * Math.max(signText.length, 1)))));
  return (
    <svg className="sfx-rise" viewBox="0 0 560 430" role="img" aria-label={`Illustration of ${name}, a small painted shopfront with an orange awning, shirts in the window and a UPI sign on the door`} style={{ width: "100%", maxWidth: 620, height: "auto", display: "block", overflow: "visible" }}>
<defs>
<radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
<stop offset="0" stopColor="#ffd98a" stopOpacity="0.8"/>
<stop offset="1" stopColor="#ffd98a" stopOpacity="0"/>
</radialGradient>
<clipPath id={`${uid}-win`}><rect x="108" y="222" width="170" height="128"/></clipPath>
</defs>

<ellipse cx="280" cy="404" rx="258" ry="20" fill="#e8dfd0"/>
<ellipse className="sfx-glow" cx="486" cy="310" rx="46" ry="100" fill={`url(#${uid}-glow)`}/>

<g shapeRendering="geometricPrecision" stroke="#2a2c4d" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">

<g className="sfx-sign">
<line x1="212" y1="94" x2="212" y2="130"/>
<line x1="350" y1="94" x2="350" y2="130"/>
<rect x="146" y="20" width="268" height="76" rx="14" fill="#1b1f45"/>
<rect x="154" y="27" width="252" height="62" rx="10" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5"/>
<text x="280" y="52" textAnchor="middle" fontFamily="'Bricolage Grotesque', 'Lexend', system-ui, sans-serif" fontSize="15" fontWeight="800" letterSpacing="3" fill="#f5a912" stroke="none">STOORA.IN/</text>
<text x="280" y="82" textAnchor="middle" fontFamily="'Bricolage Grotesque', 'Lexend', system-ui, sans-serif" fontWeight="800" fill="#ffffff" stroke="none" fontSize={signSize}>{signText}</text>
</g>

<rect x="88" y="190" width="384" height="204" fill="#fbf5ea"/>

<rect x="108" y="222" width="170" height="128" fill="#ffffff"/>
<line x1="118" y1="240" x2="268" y2="240"/>
<g transform="translate(150 240)"><g className="sfx-sway" style={{ animationDelay: "0s" }}><line x1="0" y1="0" x2="0" y2="8"/><path d="M-22 16 L-8 9 Q0 15 8 9 L22 16 L31 33 L21 37 L16 30 V68 H-16 V30 L-21 37 L-31 33 Z" fill="#ee8a3c"/></g></g>
<g transform="translate(193 240)"><g className="sfx-sway" style={{ animationDelay: "-0.9s" }}><line x1="0" y1="0" x2="0" y2="8"/><path d="M-22 16 L-8 9 Q0 15 8 9 L22 16 L31 33 L21 37 L16 30 V68 H-16 V30 L-21 37 L-31 33 Z" fill="#5a3aa6"/></g></g>
<g transform="translate(236 240)"><g className="sfx-sway" style={{ animationDelay: "-1.8s" }}><line x1="0" y1="0" x2="0" y2="8"/><path d="M-22 16 L-8 9 Q0 15 8 9 L22 16 L31 33 L21 37 L16 30 V68 H-16 V30 L-21 37 L-31 33 Z" fill="#c8325a"/></g></g>
<g clipPath={`url(#${uid}-win)`} stroke="none"><g className="sfx-shine"><rect x="40" y="200" width="14" height="170" fill="#ffffff" fillOpacity="0.7" transform="rotate(18 47 285)"/><rect x="66" y="200" width="6" height="170" fill="#ffffff" fillOpacity="0.7" transform="rotate(18 69 285)"/></g></g>
<rect x="108" y="222" width="170" height="128" fill="none"/>
<rect x="104" y="350" width="178" height="11" fill="#ee9a3c"/>

<rect x="300" y="222" width="112" height="172" fill="#4f2fa0"/>
<rect x="316" y="238" width="80" height="66" fill="#efe9f5"/>
<g className="sfx-pulse"><rect x="330" y="259" width="52" height="25" rx="6" fill="#f9e3a6"/><text x="356" y="277" textAnchor="middle" fontFamily="'Bricolage Grotesque', 'Lexend', system-ui, sans-serif" fontSize="14" fontWeight="800" letterSpacing="1" fill="#1b1f45" stroke="none">UPI</text></g>
<circle cx="400" cy="320" r="5.5" fill="#f0a921"/>
<rect x="294" y="394" width="124" height="9" fill="#ee9a3c"/>

<rect x="70" y="128" width="420" height="34" fill="#d8453a"/>
<rect x="78" y="162" width="404" height="28" fill="#ee8a3c" stroke="none"/>
<circle cx="104" cy="190" r="26" fill="#ee8a3c"/><circle cx="156" cy="190" r="26" fill="#f29a4f"/>
<circle cx="208" cy="190" r="26" fill="#ee8a3c"/><circle cx="260" cy="190" r="26" fill="#f29a4f"/>
<circle cx="312" cy="190" r="26" fill="#ee8a3c"/><circle cx="364" cy="190" r="26" fill="#f29a4f"/>
<circle cx="416" cy="190" r="26" fill="#ee8a3c"/><circle cx="468" cy="190" r="26" fill="#f29a4f"/>
<rect x="78" y="158" width="404" height="10" fill="#ee8a3c" stroke="none"/>
<line x1="78" y1="162" x2="78" y2="192"/><line x1="482" y1="162" x2="482" y2="192"/>

<g strokeWidth="1.6">
<circle className="sfx-bob" style={{ animationDelay: "0s" }} cx="84" cy="212" r="8" fill="#f5b324"/>
<circle className="sfx-bob" style={{ animationDelay: "-0.2s" }} cx="112" cy="222" r="8" fill="#d9703a"/>
<circle className="sfx-bob" style={{ animationDelay: "-0.4s" }} cx="140" cy="229" r="8" fill="#f5b324"/>
<circle className="sfx-bob" style={{ animationDelay: "-0.6s" }} cx="168" cy="234" r="8" fill="#d9703a"/>
<circle className="sfx-bob" style={{ animationDelay: "-0.8s" }} cx="196" cy="237" r="8" fill="#f5b324"/>
<circle className="sfx-bob" style={{ animationDelay: "-1s" }} cx="224" cy="239" r="8" fill="#d9703a"/>
<circle className="sfx-bob" style={{ animationDelay: "-1.2s" }} cx="252" cy="240" r="8" fill="#f5b324"/>
<circle className="sfx-bob" style={{ animationDelay: "-1.4s" }} cx="280" cy="240" r="8" fill="#d9703a"/>
<circle className="sfx-bob" style={{ animationDelay: "-1.6s" }} cx="308" cy="239" r="8" fill="#f5b324"/>
<circle className="sfx-bob" style={{ animationDelay: "-1.8s" }} cx="336" cy="237" r="8" fill="#d9703a"/>
<circle className="sfx-bob" style={{ animationDelay: "-2s" }} cx="364" cy="234" r="8" fill="#f5b324"/>
<circle className="sfx-bob" style={{ animationDelay: "-2.2s" }} cx="392" cy="229" r="8" fill="#d9703a"/>
<circle className="sfx-bob" style={{ animationDelay: "-2.4s" }} cx="420" cy="222" r="8" fill="#f5b324"/>
<circle className="sfx-bob" style={{ animationDelay: "-2.6s" }} cx="448" cy="212" r="8" fill="#d9703a"/>
<circle className="sfx-bob" style={{ animationDelay: "-2.8s" }} cx="476" cy="205" r="8" fill="#f5b324"/>
</g>

<path d="M52 364 H94 L90 402 H56 Z" fill="#d8453a"/>
<g className="sfx-flower" style={{ animationDelay: "0s" }}><circle cx="73" cy="336" r="11" fill="#f5b324"/><circle cx="58" cy="348" r="10" fill="#f5b324"/><circle cx="88" cy="348" r="10" fill="#f5b324"/><circle cx="73" cy="356" r="9" fill="#f5b324"/><circle cx="73" cy="336" r="4" fill="#ee8a3c" stroke="none"/><circle cx="58" cy="348" r="3.5" fill="#ee8a3c" stroke="none"/><circle cx="88" cy="348" r="3.5" fill="#ee8a3c" stroke="none"/></g>
<path d="M452 364 H496 L492 402 H456 Z" fill="#8e3aa3"/>
<g className="sfx-flower" style={{ animationDelay: "-1.2s" }}><circle cx="474" cy="338" r="11" fill="#ee8a3c"/><circle cx="458" cy="350" r="10" fill="#ee8a3c"/><circle cx="490" cy="350" r="10" fill="#ee8a3c"/><circle cx="474" cy="338" r="4" fill="#f5b324" stroke="none"/><circle cx="458" cy="350" r="3.5" fill="#f5b324" stroke="none"/><circle cx="490" cy="350" r="3.5" fill="#f5b324" stroke="none"/></g>
</g>

<g stroke="none" fontFamily="'Bricolage Grotesque', 'Lexend', system-ui, sans-serif" fontWeight="800" textAnchor="middle">
<g className="sfx-coin" style={{ animationDelay: "0s" }}><circle cx="356" cy="250" r="10" fill="#f5b324"/><text x="356" y="255" fontSize="13" fill="#1b1f45">₹</text></g>
<g className="sfx-coin" style={{ animationDelay: "-1.4s" }}><circle cx="340" cy="250" r="8" fill="#f5b324"/><text x="340" y="254.5" fontSize="11" fill="#1b1f45">₹</text></g>
<g className="sfx-coin" style={{ animationDelay: "-2.8s" }}><circle cx="372" cy="250" r="8" fill="#f5b324"/><text x="372" y="254.5" fontSize="11" fill="#1b1f45">₹</text></g>
</g>
<g fill="#f5a912" stroke="none">
<path className="sfx-twinkle" style={{ animationDelay: "0s" }} d="M120 40 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z"/>
<path className="sfx-twinkle" style={{ animationDelay: "-1s" }} d="M452 52 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z"/>
<path className="sfx-twinkle" style={{ animationDelay: "-1.8s" }} d="M432 24 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"/>
</g>
</svg>
  );
}
