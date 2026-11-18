-- One round trip for the public shop page: the shop, its live products and its services together.
-- (The page used to ask for the shop first, then for the products and services: two trips on a slow phone connection.)
-- It runs as the caller (security invoker), so the same row level security applies as for the separate queries:
-- visitors only ever see the public shop view and products that are Active.
create or replace function public.load_public_shop(p_handle text) returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'shop', to_jsonb(s),
    'products', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc) from public.products p where p.shop_id = s.id and p.status = 'Active'), '[]'::jsonb),
    'services', coalesce((select jsonb_agg(to_jsonb(v) order by v.created_at) from public.services v where v.shop_id = s.id), '[]'::jsonb)
  )
  from public.public_shops s where s.handle = lower(p_handle) limit 1;
$$;
grant execute on function public.load_public_shop(text) to anon, authenticated;
