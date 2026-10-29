import { Suspense } from 'react';
import { ButtonLink, Icon } from '@/components/ui';
import { Accordion } from '@/components/bits';
import { EnquiryButton } from '@/components/site/Enquiry';

const FEATURES: [string, string, string, string][] = [
  ['storefront', 'A shop page with your own link', 'Pick a template, add your photos and share stoora.in/yourshop anywhere. It works on every phone.', 'shop'],
  ['payments', 'UPI, cards and cash, your way', 'Buyers pay online or pay you directly. An order is only marked paid when the payment is confirmed.', 'pay'],
  ['inbox', 'Every order in one list', 'See what is paid, what to pack and what has shipped. Add tracking and refund with a tap.', 'reel'],
  ['sell', 'Products and stock that stay in step', 'Add products with photos and sizes, import a spreadsheet, and stock goes down when something sells.', 'shop'],
  ['account_balance_wallet', 'Money you can follow', 'Payments received, money still owed and your next payout, worked out from your own orders.', 'pay'],
  ['local_offer', 'Offers and repeat buyers', 'Make a discount code in a minute and see who your best customers are.', 'reel'],
];
const FAQ: [string, string][] = [
  ['Does Stoora cost anything?', 'Opening a shop, adding products and taking orders is free. Premium storefront templates are optional and paid for once per template. Online payments carry the payment provider’s normal fee.'],
  ['How do I get paid?', 'Buyers can pay online by UPI, card or netbanking, or pay you directly. Online payments go to your linked account; you confirm direct payments yourself.'],
  ['Do I need a website or a developer?', 'No. You add products, pick a look and share your link. Everything is set up from your phone.'],
  ['Can I bring my products over from a spreadsheet?', 'Yes. Upload a CSV file, check how its columns match, and review any rows that need fixing before they are added.'],
  ['Who can see my customers’ details?', 'Only you and the helpers you add. Buyers can ask for their data to be exported or deleted, and you can see those requests in one place.'],
];

export default function Landing() {
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div className="hero-copy">
            <span className="eyebrow">For small sellers in India</span>
            <h1 className="display">Your shop, your link, <span className="em">your money.</span></h1>
            <p className="lede">Stoora gives you a shop page, an order book and UPI payments in one place. Set it up from your phone in minutes. It is free to start.</p>
            <div className="btns"><ButtonLink href="/onboarding" kind="primary">Start your shop</ButtonLink><ButtonLink href="/demo" icon="play_circle">See the demo</ButtonLink></div>
            <div className="hero-note"><span><Icon name="check_circle" />No card needed</span><span><Icon name="check_circle" />Works on any phone</span><span><Icon name="check_circle" />Pay by UPI</span></div>
          </div>
          <div className="mock" aria-hidden="true">
            <div className="win">
              <div className="bar"><i /><i /><i /></div>
              <div className="tiles">{[['Sales today', '₹8,195'], ['Orders', '4'], ['To ship', '2']].map(([k, v]) => <div className="tile" key={k}><span className="k">{k}</span><span className="v big">{v}</span></div>)}</div>
              {[['#1012', 'Priya Sharma', '₹3,798', 'ok', 'Paid'], ['#1011', 'Rahul Verma', '₹1,499', 'warn', 'Unpaid'], ['#1010', 'Anjali Rao', '₹2,899', 'neutral', 'Shipped']].map(([id, who, amt, tone, label]) => (
                <div className="row-li" key={id}><b>{id}</b><span className="grow">{who}</span><span className="money">{amt}</span><span className={`bdg ${tone}`}>{label}</span></div>
              ))}
            </div>
            <div className="phone"><div className="ph-h">Meera Studio</div><div className="ph-b">{[['#EFE6D6', 'checkroom'], ['#2F3B7A', 'apparel'], ['#8E2B3C', 'dry_cleaning'], ['#D9A21B', 'texture']].map(([c, i]) => <div key={i} className="part" style={{ ['--tint' as string]: c, color: c === '#EFE6D6' || c === '#D9A21B' ? 'var(--ink)' : '#fff' }}><span className="ms">{i}</span></div>)}</div></div>
          </div>
        </div>
      </section>

      <div className="wrap proof"><span><Icon name="storefront" />Boutiques</span><span><Icon name="self_improvement" />Tutors and coaches</span><span><Icon name="restaurant" />Home bakers</span><span><Icon name="diamond" />Jewellers</span><span><Icon name="palette" />Artisans</span></div>

      <section className="sec" id="features"><div className="wrap">
        <div className="sec-h"><span className="eyebrow">What you get</span><h2>Everything you need to sell, in one place</h2><p className="lede">No plug-ins, no juggling five apps. Stoora keeps your shop, orders and money together.</p></div>
        <div className="fgrid">{FEATURES.map(([icon, t, d, k]) => <article className="fcard" key={t}><span className={`ic ${k}`} style={{ background: 'var(--inner)' }}><Icon name={icon} /></span><h3 className="ct">{t}</h3><p className="t-body">{d}</p></article>)}</div>
      </div></section>

      <section className="sec alt" id="how"><div className="wrap">
        <div className="sec-h"><span className="eyebrow">How it works</span><h2>From idea to first order in an afternoon</h2></div>
        <ol className="steps3">
          <li><h3 className="ct">Add your products</h3><p className="t-body">Photos, a name and a price. Or import a spreadsheet if you already have a list.</p></li>
          <li><h3 className="ct">Share your link</h3><p className="t-body">Pick a look, publish, and send stoora.in/yourshop to your buyers.</p></li>
          <li><h3 className="ct">Get paid and ship</h3><p className="t-body">Orders land in one list. Mark them packed, add tracking and see your money.</p></li>
        </ol>
      </div></section>

      <section className="sec" id="pricing"><div className="wrap">
        <div className="sec-h center"><span className="eyebrow">Pricing</span><h2>Free to start. Pay only for extras.</h2></div>
        <div className="pgrid">
          <article className="plan hot"><span className="bdg ok"><Icon name="check_circle" />Everything you need</span><h3 className="ct">Free</h3><div className="price">₹0</div>
            <ul>{['Shop page and your own link', 'Unlimited products and orders', 'UPI, card and cash payments', 'Money, analytics and offers', 'Helpers with their own login'].map((x) => <li key={x}><Icon name="check" />{x}</li>)}</ul><ButtonLink href="/onboarding" kind="primary" full>Start free</ButtonLink></article>
          <article className="plan"><span className="bdg offer"><Icon name="palette" />Optional</span><h3 className="ct">Premium templates</h3><div className="price" style={{ fontSize: 28 }}>Pay once per template</div>
            <ul>{['Three extra storefront designs', 'Preview free before you buy', 'Yours to keep once bought'].map((x) => <li key={x}><Icon name="check" />{x}</li>)}</ul><ButtonLink href="/demo" full>See a premium look</ButtonLink></article>
        </div>
        <p className="cap" style={{ textAlign: 'center', marginTop: 'var(--s3)' }}>Online payments carry the payment provider’s normal fee. Stoora does not add its own.</p>
      </div></section>

      <section className="sec alt" id="faq"><div className="wrap narrow">
        <div className="sec-h"><span className="eyebrow">Questions</span><h2>Good to know</h2></div>
        {FAQ.map(([q, a], i) => <Accordion key={q} title={q} open={i === 0}><p>{a}</p></Accordion>)}
      </div></section>

      <div className="wrap"><div className="cta-band">
        <h2>Ready to open your shop?</h2><p>It takes a few minutes, and you can change anything later.</p>
        <div className="btns" style={{ justifyContent: 'center' }}><ButtonLink href="/onboarding" kind="primary">Start your shop</ButtonLink><Suspense fallback={null}><EnquiryButton label="Talk to us" /></Suspense></div>
      </div></div>
    </>
  );
}
