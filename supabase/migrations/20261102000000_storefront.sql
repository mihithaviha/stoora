-- Storefront design: which template, theme, hero text, sections and so on the seller chose (see src/lib/storefront/shared.ts).
-- It is part of the shop row, so the same owner-only update rule that protects the shop protects it. The public shop page reads it
-- through the public_shops view, which holds no private fields.
alter table public.shops add column storefront jsonb;

create or replace view public.public_shops as
  select id, name, handle, city, tagline, category, is_open, show_prices, accepts_cod, accepts_online, look, upi_id is not null as has_upi,
         case when whatsapp_verified and show_whatsapp_button then whatsapp_number end as whatsapp_number,
         order_settings ->> 'closedNote' as closed_note,
         storefront
  from public.shops;
