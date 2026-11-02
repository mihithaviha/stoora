-- PRD part 1, "Add product": the details AI and Stoora fill in, a product number, and a daily count of AI drafts.

-- Details on a product. Everything has a default, so older rows and the sample shop keep working.
alter table public.products add column colors        text[]  not null default '{}';
alter table public.products add column option_stock  jsonb   not null default '{}'::jsonb;   -- stock for each size (or each colour when there are no sizes)
alter table public.products add column material      text;
alter table public.products add column weight_grams  integer check (weight_grams is null or weight_grams between 0 and 100000);
alter table public.products add column box_cm        jsonb;                                    -- {"l":20,"w":15,"h":5}, for shipping
alter table public.products add column tags          text[]  not null default '{}';
alter table public.products add column product_number text;                                   -- set by Stoora, like SHAURYA-0001

-- The product number: the first part of the shop link in capitals, then a running number for that shop. Never typed by the seller.
create or replace function public.set_product_number() returns trigger language plpgsql security definer set search_path = public as $$
declare prefix text; nxt integer;
begin
  if new.product_number is not null and new.product_number <> '' then return new; end if;
  perform pg_advisory_xact_lock(hashtext(new.shop_id::text));
  select upper(regexp_replace(split_part(handle, '-', 1), '[^a-z0-9]', '', 'gi')) into prefix from public.shops where id = new.shop_id;
  select coalesce(max(nullif(regexp_replace(product_number, '^.*-', ''), '')::integer), 0) + 1 into nxt from public.products where shop_id = new.shop_id and product_number ~ '-[0-9]+$';
  new.product_number := coalesce(nullif(prefix, ''), 'SHOP') || '-' || lpad(nxt::text, 4, '0');
  return new;
end $$;
create trigger products_number before insert on public.products for each row execute function public.set_product_number();
do $$ declare r record; n integer; p text; cur uuid; begin
  n := 0; cur := null;
  for r in select id, shop_id from public.products where product_number is null order by shop_id, created_at, id loop
    if cur is distinct from r.shop_id then
      cur := r.shop_id; n := 0;
      select upper(regexp_replace(split_part(handle, '-', 1), '[^a-z0-9]', '', 'gi')) into p from public.shops where id = r.shop_id;
    end if;
    n := n + 1;
    update public.products set product_number = coalesce(nullif(p, ''), 'SHOP') || '-' || lpad(n::text, 4, '0') where id = r.id;
  end loop;
end $$;
create unique index products_number_uq on public.products (shop_id, product_number);

-- (added after the numbering above, so it does not undo it) a seller may not rewrite the number afterwards
create or replace function public.keep_product_number() returns trigger language plpgsql as $$
begin new.product_number := old.product_number; return new; end $$;
create trigger products_keep_number before update on public.products for each row execute function public.keep_product_number();

-- AI drafts: one row per shop per day, so we can limit it (20 a day) and see what a product costs.
create table public.ai_usage (
  shop_id       uuid not null references public.shops (id) on delete cascade,
  day           date not null default current_date,
  calls         integer not null default 0,
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  primary key (shop_id, day)
);
alter table public.ai_usage enable row level security;
create policy ai_usage_read on public.ai_usage for select to authenticated using (public.is_shop_member(shop_id) or public.is_admin());

-- Take one AI draft. Returns true when the shop still has drafts left today, false when it has used them all.
create or replace function public.ai_draft_take(p_shop uuid, p_limit integer default 20) returns boolean language plpgsql security definer set search_path = public as $$
declare used integer;
begin
  if not public.is_shop_member(p_shop) then return false; end if;
  insert into public.ai_usage (shop_id, day, calls) values (p_shop, current_date, 0) on conflict do nothing;
  update public.ai_usage set calls = calls + 1 where shop_id = p_shop and day = current_date and calls < p_limit returning calls into used;
  return used is not null;
end $$;
-- Record what the draft cost in tokens (called after the AI answers).
create or replace function public.ai_draft_record(p_shop uuid, p_in integer, p_out integer) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_shop_member(p_shop) then return; end if;
  update public.ai_usage set input_tokens = input_tokens + greatest(coalesce(p_in, 0), 0), output_tokens = output_tokens + greatest(coalesce(p_out, 0), 0) where shop_id = p_shop and day = current_date;
end $$;
revoke all on function public.ai_draft_take(uuid, integer) from public, anon;
revoke all on function public.ai_draft_record(uuid, integer, integer) from public, anon;
grant execute on function public.ai_draft_take(uuid, integer) to authenticated;
grant execute on function public.ai_draft_record(uuid, integer, integer) to authenticated;

-- Buyer checkout again: stock for each size is taken from the size the buyer picked, and delivery follows the seller's own rule.
create or replace function public.place_order(
  p_handle text, p_name text, p_phone text, p_city text, p_address text, p_note text, p_pay text, p_lines jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_shop public.shops%rowtype; v_item jsonb; v_prod public.products%rowtype; v_qty integer;
  v_sub integer := 0; v_ship integer := 0; v_order public.orders%rowtype; v_min integer; v_cap integer; v_today integer; v_size text; v_left integer; v_fee integer; v_free integer;
begin
  select * into v_shop from public.shops where handle = lower(p_handle);
  if not found then raise exception 'We could not find that shop'; end if;
  if not v_shop.is_open then raise exception '% is not taking orders right now', v_shop.name; end if;
  if p_pay not in ('upi', 'card', 'cod') then raise exception 'Choose how you want to pay'; end if;
  if p_pay = 'cod' and not v_shop.accepts_cod then raise exception 'This shop does not offer cash on delivery'; end if;
  if p_pay <> 'cod' and not v_shop.accepts_online then raise exception 'This shop does not take online payments'; end if;
  if coalesce(char_length(trim(p_name)), 0) < 2 then raise exception 'Tell us your name'; end if;
  if regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') !~ '^(91)?[0-9]{10}$' then raise exception 'Enter a 10-digit mobile number'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'Your bag is empty'; end if;

  -- check every line and take the stock; rows are locked so two buyers cannot take the last item together
  for v_item in select * from jsonb_array_elements(p_lines) loop
    v_qty := (v_item ->> 'qty')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 10 then raise exception 'Pick between 1 and 10 of each item'; end if;
    select * into v_prod from public.products where id = public.safe_uuid(v_item ->> 'productId') and shop_id = v_shop.id and status = 'Active' for update;
    if not found then raise exception 'One of the items is no longer available'; end if;
    if v_prod.stock < v_qty then raise exception '% is out of stock (only % left)', v_prod.name, v_prod.stock; end if;
    -- a product with stock for each size: take it from the size the buyer picked
    v_size := nullif(v_item ->> 'size', '');
    if v_size is not null and v_prod.option_stock ? v_size then
      v_left := (v_prod.option_stock ->> v_size)::integer;
      if v_left < v_qty then raise exception '% in % is out of stock (only % left)', v_prod.name, v_size, v_left; end if;
      update public.products set stock = stock - v_qty, option_stock = jsonb_set(option_stock, array[v_size], to_jsonb(v_left - v_qty)) where id = v_prod.id;
    else
      update public.products set stock = stock - v_qty where id = v_prod.id;
    end if;
    v_sub := v_sub + v_prod.price * v_qty;
  end loop;

  v_min := nullif(v_shop.order_settings ->> 'minimum', '')::integer;
  if v_min is not null and v_sub < v_min then raise exception 'The smallest order is Rs %', v_min; end if;
  v_cap := nullif(v_shop.order_settings ->> 'daily', '')::integer;
  if v_cap is not null then
    select count(*) into v_today from public.orders where shop_id = v_shop.id and created_at >= date_trunc('day', now());
    if v_today >= v_cap then raise exception 'This shop has reached its limit of orders for today'; end if;
  end if;

  -- the seller's own delivery rule (Settings > Delivery); the same defaults as the app: Rs 60, free from Rs 1500
  v_fee := coalesce(nullif(regexp_replace(coalesce(v_shop.order_settings ->> 'fee', ''), '\D', '', 'g'), '')::integer, 60);
  v_free := coalesce(nullif(regexp_replace(coalesce(v_shop.order_settings ->> 'freeOver', ''), '\D', '', 'g'), '')::integer, 1500);
  v_ship := case when v_fee = 0 or (v_free > 0 and v_sub >= v_free) then 0 else v_fee end;
  insert into public.orders (shop_id, buyer_id, buyer_name, phone, city, address, shipping, total, paid, method, source, notes, created_by)
  values (v_shop.id, auth.uid(), trim(p_name), p_phone, nullif(trim(p_city), ''), nullif(trim(p_address), ''), v_ship, v_sub + v_ship, false, p_pay, 'Shop link', nullif(trim(p_note), ''), 'buyer')
  returning * into v_order;

  insert into public.order_lines (order_id, product_id, name, size, qty, price)
  select v_order.id, pr.id, pr.name, nullif(it ->> 'size', ''), (it ->> 'qty')::integer, pr.price
  from jsonb_array_elements(p_lines) it join public.products pr on pr.id = public.safe_uuid(it ->> 'productId');

  insert into public.customers (shop_id, name, phone, city, source, orders_count, spent, last_order_at)
  values (v_shop.id, trim(p_name), p_phone, nullif(trim(p_city), ''), 'Shop link', 1, 0, now())
  on conflict (shop_id, phone) do update set orders_count = public.customers.orders_count + 1, last_order_at = now(), name = excluded.name, city = coalesce(excluded.city, public.customers.city);

  return jsonb_build_object('id', v_order.id, 'orderNo', v_order.order_no, 'total', v_order.total, 'shipping', v_order.shipping, 'paid', v_order.paid);
end $$;
grant execute on function public.place_order(text, text, text, text, text, text, text, jsonb) to anon, authenticated;

-- =====================================================================================================
-- PRD P0-5: workshops, classes, 1-on-1 sessions and downloads keep their own details (date, time slots, seats, file).
-- =====================================================================================================
alter table public.services add column kind       text check (kind in ('workshop', 'class', 'session', 'digital'));
alter table public.services add column starts_on  date;                          -- a workshop's date
alter table public.services add column days       text[] not null default '{}';  -- classes and sessions: the weekdays they run
alter table public.services add column times      text[] not null default '{}';  -- the time slots (a workshop has one)
alter table public.services add column seats      integer check (seats is null or seats between 1 and 1000);
alter table public.services add column place      text;                          -- Online / At my studio / At buyer's home
alter table public.services add column file_name  text;                          -- a download: what the buyer receives
alter table public.services add column file_path  text;                          -- where it is kept in the private "service-files" bucket

-- Downloads are private: only the shop's own members can read or write them. (Sending a file to a buyer who has paid is fulfilment, built later.)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('service-files', 'service-files', false, 52428800, array['application/pdf', 'application/zip', 'application/epub+zip', 'audio/mpeg', 'video/mp4', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "service files: members read" on storage.objects for select to authenticated
  using (bucket_id = 'service-files' and public.is_shop_member(public.safe_uuid((storage.foldername(name))[1])));
create policy "service files: members upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'service-files' and public.is_shop_member(public.safe_uuid((storage.foldername(name))[1])));
create policy "service files: members replace" on storage.objects for update to authenticated
  using (bucket_id = 'service-files' and public.is_shop_member(public.safe_uuid((storage.foldername(name))[1])));
create policy "service files: members delete" on storage.objects for delete to authenticated
  using (bucket_id = 'service-files' and public.is_shop_member(public.safe_uuid((storage.foldername(name))[1])));
