-- Add product: what Stoora sets by itself and never asks the seller about.
alter table public.products
  add column if not exists country     text not null default 'India',
  add column if not exists tax         text,
  add column if not exists google_text text;
