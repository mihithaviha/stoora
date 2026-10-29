-- Sample data for development. This file only defines a function: nothing is inserted until you call it.
--
--   1. Sign in to the app once (so you have a user), copy your user id from Supabase > Authentication > Users.
--   2. In the SQL editor run:   select public.seed_demo_shop('<your user id>');
--   It creates "Meera Studio" (handle "meera") with products, a service, offers and a few orders for you to play with.
--   Never run this on a production project that has real sellers.

create or replace function public.seed_demo_shop(p_owner uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare v_shop uuid; v_kurta uuid; v_dup uuid; v_set uuid; v_yoga uuid; v_o uuid;
begin
  update public.profiles set role = 'seller' where id = p_owner and role = 'buyer';
  insert into public.shops (owner_id, name, handle, owner_name, email, phone, city, tagline, category, look)
  values (p_owner, 'Meera Studio', 'meera', 'Meera', 'meera.studio@example.in', '+91 98480 21234', 'Jaipur',
          'Hand block-printed kurtas, dupattas and yoga classes from Jaipur.', 'Clothing', 'Warm')
  on conflict (owner_id) do update set name = excluded.name returning id into v_shop;

  insert into public.products (shop_id, name, category, color, sizes, price, stock, sold_last_30, views_yesterday, icon) values
    (v_shop, 'Handblock cotton kurta', 'Kurtas', 'Natural white', '{S,M,L,XL}', 1499, 24, 31, 9, 'checkroom'),
    (v_shop, 'Silk dupatta, maroon', 'Dupattas', 'Maroon', '{}', 2299, 7, 12, 4, 'dry_cleaning'),
    (v_shop, 'Indigo kurta set', 'Kurtas', 'Indigo blue', '{M,L}', 2899, 3, 22, 12, 'apparel'),
    (v_shop, 'Handblock kurta, sky blue', 'Kurtas', 'Sky blue', '{S,M,L,XL}', 1599, 10, 14, 7, 'checkroom'),
    (v_shop, 'Cotton dupatta, mustard', 'Dupattas', 'Mustard', '{}', 699, 0, 18, 6, 'texture');
  select id into v_kurta from public.products where shop_id = v_shop and name = 'Handblock cotton kurta';
  select id into v_dup   from public.products where shop_id = v_shop and name = 'Silk dupatta, maroon';
  select id into v_set   from public.products where shop_id = v_shop and name = 'Indigo kurta set';

  insert into public.services (shop_id, name, type, price, minutes, next_slot, icon) values
    (v_shop, 'Morning yoga (group class)', 'Class', 499, 60, 'Wed 7:00 am · 4 seats left', 'self_improvement'),
    (v_shop, '1-on-1 yoga session', '1-on-1', 1200, 60, 'Thu 6:00 pm', 'person'),
    (v_shop, 'Yoga for beginners e-book', 'Digital', 299, 0, 'Instant download', 'menu_book');
  select id into v_yoga from public.services where shop_id = v_shop and name like 'Morning yoga%';
  insert into public.bookings (shop_id, ref, buyer_name, service_id, when_label, day_label, paid, status) values
    (v_shop, 'B-209', 'Arjun Mehta', v_yoga, 'Thu 30 Oct, 6:00 pm', 'Thu 30 Oct', false, 'Upcoming'),
    (v_shop, 'B-210', 'Sneha Kulkarni', v_yoga, 'Wed 29 Oct, 7:00 am', 'Wed 29 Oct', true, 'Upcoming');

  insert into public.offers (shop_id, code, what, used, ends_label, is_on) values
    (v_shop, 'DIWALI10', '10% off everything', 14, 'Ends 2 Nov', true),
    (v_shop, 'FIRSTKURTA', 'Rs 150 off first order', 41, 'No end date', false);

  insert into public.orders (shop_id, buyer_name, phone, city, address, shipping, total, paid, method, shipped, source, created_by, created_at)
  values (v_shop, 'Priya Sharma', '+91 98765 43210', 'Pune', '12 Lake View Road, Indiranagar, Pune 411001', 0, 3798, true, 'upi', false, 'Shop link', 'buyer', now() - interval '2 hours')
  returning id into v_o;
  insert into public.order_lines (order_id, product_id, name, size, qty, price) values (v_o, v_kurta, 'Handblock cotton kurta', 'M', 1, 1499), (v_o, v_dup, 'Silk dupatta, maroon', null, 1, 2299);
  insert into public.orders (shop_id, buyer_name, phone, city, shipping, total, paid, method, shipped, source, created_by, created_at)
  values (v_shop, 'Rahul Verma', '+91 90000 44410', 'Lucknow', 0, 1499, false, 'upi', false, 'Instagram', 'manual', now() - interval '1 day') returning id into v_o;
  insert into public.order_lines (order_id, product_id, name, size, qty, price) values (v_o, v_kurta, 'Handblock cotton kurta', 'L', 1, 1499);
  insert into public.orders (shop_id, buyer_name, phone, city, shipping, total, paid, method, shipped, courier, tracking, source, created_by, created_at)
  values (v_shop, 'Anjali Rao', '+91 99000 55521', 'Bengaluru', 0, 2899, true, 'upi', true, 'Delhivery', 'DL4482190', 'Shop link', 'buyer', now() - interval '5 days') returning id into v_o;
  insert into public.order_lines (order_id, product_id, name, size, qty, price) values (v_o, v_set, 'Indigo kurta set', 'M', 1, 2899);

  insert into public.customers (shop_id, name, phone, city, source, orders_count, spent, last_order_at) values
    (v_shop, 'Priya Sharma', '+91 98765 43210', 'Pune', 'Shop link', 3, 7196, now()),
    (v_shop, 'Anjali Rao', '+91 99000 55521', 'Bengaluru', 'Shop link', 2, 4398, now() - interval '5 days'),
    (v_shop, 'Rahul Verma', '+91 90000 44410', 'Lucknow', 'Instagram', 1, 0, now() - interval '1 day')
  on conflict (shop_id, phone) do nothing;
  return v_shop;
end $$;
revoke execute on function public.seed_demo_shop(uuid) from public, anon, authenticated;
