'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, ButtonLink, Card, EmptyState, Icon, Skeleton, useToast } from '@/components/ui';
import { ProductArt } from '@/components/bits';
import { shopBase } from '@/components/shop/ShopChrome';
import { useBag, FREE_DELIVERY_OVER } from '@/lib/bag';
import { useStore } from '@/lib/store';
import { rs } from '@/lib/format';

export default function BagPage() {
  const { handle } = useParams<{ handle: string }>(); const base = shopBase(handle); const bag = useBag(); const { db } = useStore(); const toast = useToast();
  if (!bag.ready) return <div className="wrap" style={{ padding: 'var(--s4) 16px' }}><Skeleton rows={3} height={110} /></div>;
  if (!bag.detailed.length) return <div className="wrap"><EmptyState icon="shopping_bag" title="Your bag is empty" text="Add something you like and it will wait for you here." action={<ButtonLink href={base} kind="primary">Start shopping</ButtonLink>} /></div>;
  const toFree = Math.max(0, FREE_DELIVERY_OVER - bag.subtotal);
  return (
    <div className="wrap">
      <h1 className="h1" style={{ padding: 'var(--s3) 0 0' }}>Your bag</h1>
      <div className="bagpage">
        <div className="stack">
          {bag.detailed.map(({ line, product, index }) => (
            <div className="bagline" key={index}>
              <Link href={`${base}/p/${product.id}`}><ProductArt product={product} /></Link>
              <div className="stack tight">
                <div className="row"><Link className="nm grow" href={`${base}/p/${product.id}`}>{product.name}</Link><span className="money">{rs(product.price * line.qty)}</span></div>
                <span className="cap">{line.size ? `Size ${line.size} · ` : ''}{rs(product.price)} each{product.stock <= 3 && product.stock > 0 ? ` · only ${product.stock} left` : ''}</span>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div className="step" role="group" aria-label={`Quantity of ${product.name}`}><button type="button" onClick={() => bag.setQty(index, line.qty - 1)} aria-label="One less" disabled={line.qty <= 1}><Icon name="remove" size="sm" /></button><output aria-live="polite">{line.qty}</output><button type="button" onClick={() => bag.setQty(index, line.qty + 1)} aria-label="One more"><Icon name="add" size="sm" /></button></div>
                  <Button kind="danger" small icon="delete" onClick={() => { const saved = { ...line }; bag.remove(index); toast(`${product.name} removed.`, { icon: 'delete', undo: () => bag.add(saved.productId, saved.size, saved.qty) }); }}>Remove</Button>
                </div>
              </div>
            </div>
          ))}
          <ButtonLink href={base} icon="arrow_back">Keep shopping</ButtonLink>
        </div>
        <Card className="sumbox" title="Order summary">
          <div className="freebar">{toFree > 0 ? <span>Add <b className="num t-ink">{rs(toFree)}</b> more for free delivery</span> : <span className="verified"><Icon name="local_shipping" size="sm" />You get free delivery</span>}<div className="meter"><i style={{ width: `${Math.min(100, (bag.subtotal / FREE_DELIVERY_OVER) * 100)}%` }} /></div></div>
          <div className="kv"><div className="r"><span>Subtotal</span><span>{rs(bag.subtotal)}</span></div><div className="r"><span>Delivery</span><span>{bag.delivery ? rs(bag.delivery) : 'Free'}</span></div><div className="r t"><span>Total</span><span>{rs(bag.total)}</span></div></div>
          {!db.shop.open && <div className="banner warn"><Icon name="pause_circle" /><span>{db.shop.name} isn’t taking orders right now.</span></div>}
          <ButtonLink href={`${base}/checkout`} kind="primary" full>Checkout</ButtonLink>
          <p className="cap">Taxes included. You pay on the next step.</p>
        </Card>
      </div>
    </div>
  );
}
