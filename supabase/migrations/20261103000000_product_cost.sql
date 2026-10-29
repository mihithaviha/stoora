-- What one item costs the seller (optional, shown only on the seller's own product page).
alter table public.products add column cost integer check (cost is null or cost >= 0);
