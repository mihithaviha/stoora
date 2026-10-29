'use client';
import type { Product } from '@/lib/types';
import { Badge, Icon } from './ui';

export const StatusBadge = ({ p }: { p: Product }) => p.status === 'Draft' ? <Badge tone="neutral" icon="edit_note">Draft</Badge> : <Badge tone="ok" icon="visibility">Live</Badge>;
export const StockText = ({ p }: { p: Product }) => p.stock === 0 ? <Badge tone="bad" icon="block">Sold out</Badge> : p.stock <= 3 ? <Badge tone="warn" icon="inventory_2">Only {p.stock} left</Badge> : <span className="cap num">{p.stock} in stock</span>;
export const Thumb = ({ p, sm }: { p: Product; sm?: boolean }) => <span className={`thumb ${sm ? 'sm' : ''}`} style={p.photos?.[0] ? { backgroundImage: `url(${p.photos[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>{!p.photos?.[0] && <Icon name={p.icon} size={sm ? 'sm' : undefined} />}</span>;

