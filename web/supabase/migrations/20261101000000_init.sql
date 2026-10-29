-- =====================================================================================================
-- Stoora database (Supabase / Postgres). Run once on a new project: Supabase dashboard > SQL editor > paste > Run,
-- or with the CLI:  supabase db push   (see web/supabase/README.md).
--
-- Who can see what (row level security is ON for every table):
--   * a seller sees and changes only their own shop, products, orders, offers, customers
--   * a "packing" helper (shop_members) can see orders/products of that shop and update orders
--   * a buyer sees only their own orders, addresses and wishlist
--   * anyone can read the public shop page data (public_shops view + active products) and send an enquiry
--   * admins (profiles.role = 'admin') can read enquiries, data requests and every shop
--   * prices, stock and delivery are ALWAYS worked out inside place_order(), never trusted from the browser
-- =====================================================================================================

-- ---------- helpers ----------------------------------------------------------------------------
create or replace function public.safe_uuid(p text) returns uuid language plpgsql immutable as $$
begin return p::uuid; exception when others then return null; end $$;

-- ---------- profiles: one row per signed-in person (created automatically at first login) ----------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'buyer' check (role in ('seller', 'buyer', 'admin')),
  full_name   text,
  email       text,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email,
    new.phone,
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  ) on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- keep email / phone in step when they change on the auth side (e.g. a verified phone)
create or replace function public.sync_profile_contact() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = coalesce(new.email, email), phone = coalesce(new.phone, phone) where id = new.id;
  return new;
end $$;
create trigger on_auth_user_updated after update of email, phone on auth.users for each row execute function public.sync_profile_contact();

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- A signed-in person chooses to sell. Admin can never be reached this way.
create or replace function public.become_seller() returns void language sql security definer set search_path = public as $$
  update public.profiles set role = 'seller' where id = auth.uid() and role = 'buyer';
$$;

-- ---------- shops -----------------------------------------------------------------------------
create table public.shops (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null unique references public.profiles (id) on delete cascade,
  name                  text not null check (char_length(name) between 1 and 80),
  handle                text not null unique check (handle ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$'),
  owner_name            text,
  email                 text,
  phone                 text,
  city                  text,
  tagline               text,
  category              text,
  is_open               boolean not null default true,
  show_prices           boolean not null default true,
  accepts_cod           boolean not null default true,
  accepts_online        boolean not null default true,
  look                  text not null default 'Warm' check (look in ('Warm', 'Indigo', 'Plain')),
  upi_id                text,
  whatsapp_number       text,
  whatsapp_verified     boolean not null default false,
  show_whatsapp_button  boolean not null default true,
  -- Settings > Order-taking: { "minimum": 0, "daily": 0, "prep": 2, "area": "India|City|States", "closedNote": "", "reopen": "manual" }
  order_settings        jsonb not null default '{}'::jsonb,
  next_order_no         integer not null default 1001,
  created_at            timestamptz not null default now()
);

create table public.shop_members (
  shop_id  uuid not null references public.shops (id) on delete cascade,
  user_id  uuid not null references public.profiles (id) on delete cascade,
  role     text not null default 'packing' check (role in ('packing')),
  added_at timestamptz not null default now(),
  primary key (shop_id, user_id)
);

create or replace function public.is_shop_owner(p_shop uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.shops where id = p_shop and owner_id = auth.uid());
$$;
create or replace function public.is_shop_member(p_shop uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_shop_owner(p_shop) or exists (select 1 from public.shop_members where shop_id = p_shop and user_id = auth.uid());
$$;

-- What the public shop page may read (no email, phone or settings). WhatsApp number only when verified and switched on.
create view public.public_shops as
  select id, name, handle, city, tagline, category, is_open, show_prices, accepts_cod, accepts_online, look, upi_id is not null as has_upi,
         case when whatsapp_verified and show_whatsapp_button then whatsapp_number end as whatsapp_number,
         order_settings ->> 'closedNote' as closed_note
  from public.shops;

-- ---------- catalogue ----------------------------------------------------------------------------
create table public.products (
  id              uuid primary key default gen_random_uuid(),
  shop_id         uuid not null references public.shops (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 120),
  category        text not null default 'Other',
  color           text,
  sizes           text[] not null default '{}',
  price           integer not null check (price >= 0),
  compare_price   integer check (compare_price >= 0),
  stock           integer not null default 0 check (stock >= 0),
  status          text not null default 'Active' check (status in ('Active', 'Draft')),
  sold_last_30    integer not null default 0,
  views_yesterday integer not null default 0,
  icon            text not null default 'sell',
  description     text,
  photos          text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index products_shop_idx on public.products (shop_id);

create table public.services (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops (id) on delete cascade,
  name       text not null,
  type       text not null default 'Class' check (type in ('Class', '1-on-1', 'Digital')),
  price      integer not null check (price >= 0),
  minutes    integer not null default 60,
  next_slot  text,
  icon       text not null default 'self_improvement',
  created_at timestamptz not null default now()
);
create index services_shop_idx on public.services (shop_id);

-- ---------- customers, orders, refunds -----------------------------------------------------------------
create table public.customers (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references public.shops (id) on delete cascade,
  name          text not null,
  phone         text,
  city          text,
  source        text not null default 'Shop link',
  orders_count  integer not null default 0,
  spent         integer not null default 0,
  last_order_at timestamptz,
  created_at    timestamptz not null default now(),
  unique (shop_id, phone)
);

create table public.orders (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops (id) on delete cascade,
  order_no    integer not null,
  buyer_id    uuid references public.profiles (id) on delete set null,
  buyer_name  text not null,
  phone       text,
  city        text,
  address     text,
  shipping    integer not null default 0,
  total       integer not null check (total >= 0),
  paid        boolean not null default false,
  method      text not null default 'upi' check (method in ('upi', 'card', 'cod', 'cash')),
  shipped     boolean not null default false,
  courier     text,
  tracking    text,
  source      text not null default 'Shop link' check (source in ('WhatsApp', 'Instagram', 'Shop link', 'In person', 'Phone call', 'Other')),
  notes       text,
  created_by  text not null default 'buyer' check (created_by in ('buyer', 'manual', 'ai')),
  created_at  timestamptz not null default now(),
  unique (shop_id, order_no)
);
create index orders_shop_idx on public.orders (shop_id, created_at desc);
create index orders_buyer_idx on public.orders (buyer_id);

-- order numbers: 1001, 1002 ... per shop, handed out under a row lock so two orders never share a number
create or replace function public.assign_order_no() returns trigger language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.shops set next_order_no = next_order_no + 1 where id = new.shop_id returning next_order_no - 1 into n;
  new.order_no := n;
  return new;
end $$;
create trigger orders_assign_no before insert on public.orders for each row execute function public.assign_order_no();

create table public.order_lines (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  product_id  uuid references public.products (id) on delete set null,
  name        text not null,
  size        text,
  qty         integer not null check (qty > 0),
  price       integer not null check (price >= 0)
);
create index order_lines_order_idx on public.order_lines (order_id);

create table public.refunds (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  amount     integer not null check (amount > 0),
  reason     text not null,
  notified   boolean not null default true,
  created_at timestamptz not null default now()
);
create index refunds_order_idx on public.refunds (order_id);

create table public.bookings (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops (id) on delete cascade,
  ref         text not null,
  buyer_name  text not null,
  service_id  uuid references public.services (id) on delete set null,
  when_label  text not null,
  day_label   text,
  paid        boolean not null default false,
  status      text not null default 'Upcoming' check (status in ('Upcoming', 'Done')),
  created_at  timestamptz not null default now(),
  unique (shop_id, ref)
);

create table public.offers (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops (id) on delete cascade,
  code       text not null,
  what       text not null,
  used       integer not null default 0,
  ends_label text not null default 'No end date',
  is_on      boolean not null default true,
  unique (shop_id, code)
);

-- ---------- buyer side -------------------------------------------------------------------------------------
create table public.buyer_addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  label      text not null,
  line       text not null,
  city       text not null,
  pin        text not null check (pin ~ '^[0-9]{6}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.wishlist_items (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ---------- site: enquiries, data requests, seller consent --------------------------------------------------
create table public.enquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 120),
  contact    text not null check (char_length(contact) between 5 and 160),
  topic      text not null,
  message    text not null check (char_length(message) between 10 and 4000),
  source     text not null default 'Landing page' check (source in ('Landing page', 'Storefront', 'Seller help')),
  status     text not null default 'New' check (status in ('New', 'Open', 'Answered', 'Closed')),
  created_at timestamptz not null default now()
);
create index enquiries_status_idx on public.enquiries (status, created_at desc);

create table public.enquiry_replies (
  id         uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries (id) on delete cascade,
  admin_id   uuid references public.profiles (id) on delete set null,
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table public.data_requests (
  id           uuid primary key default gen_random_uuid(),
  ref          text not null unique default ('DR-' || lpad((floor(random() * 1000000))::int::text, 6, '0')),
  kind         text not null check (kind in ('access', 'correct', 'delete', 'consent')),
  name         text not null,
  contact      text not null,
  details      text,
  status       text not null default 'Open' check (status in ('Open', 'Verified', 'Done', 'Rejected')),
  requester_id uuid references public.profiles (id) on delete set null,
  due_at       timestamptz not null default (now() + interval '30 days'),
  created_at   timestamptz not null default now()
);

create table public.seller_consents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  version     text not null,
  items       jsonb not null,
  accepted_at timestamptz not null default now()
);

-- =====================================================================================================
-- Row level security
-- =====================================================================================================
alter table public.profiles         enable row level security;
alter table public.shops            enable row level security;
alter table public.shop_members     enable row level security;
alter table public.products         enable row level security;
alter table public.services         enable row level security;
alter table public.customers        enable row level security;
alter table public.orders           enable row level security;
alter table public.order_lines      enable row level security;
alter table public.refunds          enable row level security;
alter table public.bookings         enable row level security;
alter table public.offers           enable row level security;
alter table public.buyer_addresses  enable row level security;
alter table public.wishlist_items   enable row level security;
alter table public.enquiries        enable row level security;
alter table public.enquiry_replies  enable row level security;
alter table public.data_requests    enable row level security;
alter table public.seller_consents  enable row level security;

-- profiles
create policy profiles_read   on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated, anon;
grant  update (full_name, phone, avatar_url) on public.profiles to authenticated;
revoke insert, delete on public.profiles from authenticated, anon;

-- shops: members read; the owner creates and edits (but never the money-sensitive columns, see grants below)
create policy shops_read   on public.shops for select to authenticated using (public.is_shop_member(id) or public.is_admin());
create policy shops_insert on public.shops for insert to authenticated with check (owner_id = auth.uid());
create policy shops_update on public.shops for update to authenticated using (public.is_shop_owner(id)) with check (public.is_shop_owner(id));
revoke insert, update, delete on public.shops from authenticated, anon;
grant insert (owner_id, name, handle, owner_name, email, phone, city, tagline, category, is_open, show_prices, accepts_cod, accepts_online, look, upi_id, whatsapp_number, show_whatsapp_button, order_settings) on public.shops to authenticated;
grant update (name, handle, owner_name, email, phone, city, tagline, category, is_open, show_prices, accepts_cod, accepts_online, look, upi_id, whatsapp_number, show_whatsapp_button, order_settings) on public.shops to authenticated;
revoke select on public.shops from anon;
grant select on public.public_shops to anon, authenticated;

-- a new or changed WhatsApp number is "not verified" until confirm_shop_whatsapp() says otherwise
create or replace function public.reset_whatsapp_verified() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.whatsapp_verified := false;
  elsif new.whatsapp_number is distinct from old.whatsapp_number then
    new.whatsapp_verified := false;
  end if;
  return new;
end $$;
create trigger shops_reset_whatsapp before insert or update of whatsapp_number on public.shops for each row execute function public.reset_whatsapp_verified();

-- shop_members: the owner manages helpers; helpers can see their own row
create policy members_read   on public.shop_members for select to authenticated using (user_id = auth.uid() or public.is_shop_owner(shop_id));
create policy members_write  on public.shop_members for all    to authenticated using (public.is_shop_owner(shop_id)) with check (public.is_shop_owner(shop_id));

-- products + services: the public sees live products; only the owner changes them
create policy products_read   on public.products for select using (status = 'Active' or public.is_shop_member(shop_id) or public.is_admin());
create policy products_write   on public.products for all    to authenticated using (public.is_shop_owner(shop_id)) with check (public.is_shop_owner(shop_id));
create policy services_read   on public.services for select using (true);
create policy services_write   on public.services for all    to authenticated using (public.is_shop_owner(shop_id)) with check (public.is_shop_owner(shop_id));

-- customers, bookings, offers: shop members only
create policy customers_all on public.customers for all to authenticated using (public.is_shop_member(shop_id)) with check (public.is_shop_member(shop_id));
create policy bookings_all  on public.bookings  for all to authenticated using (public.is_shop_member(shop_id)) with check (public.is_shop_member(shop_id));
create policy offers_all    on public.offers    for all to authenticated using (public.is_shop_member(shop_id)) with check (public.is_shop_member(shop_id));

-- orders: members and the buyer who placed it can read; members create manual orders and update; buyers order through place_order()
create policy orders_read   on public.orders for select to authenticated using (public.is_shop_member(shop_id) or buyer_id = auth.uid() or public.is_admin());
create policy orders_insert on public.orders for insert to authenticated with check (public.is_shop_member(shop_id));
create policy orders_update on public.orders for update to authenticated using (public.is_shop_member(shop_id)) with check (public.is_shop_member(shop_id));
create policy orders_delete on public.orders for delete to authenticated using (public.is_shop_owner(shop_id));
revoke select on public.orders from anon;

create policy lines_read   on public.order_lines for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (public.is_shop_member(o.shop_id) or o.buyer_id = auth.uid() or public.is_admin())));
create policy lines_write  on public.order_lines for all    to authenticated using (exists (select 1 from public.orders o where o.id = order_id and public.is_shop_member(o.shop_id))) with check (exists (select 1 from public.orders o where o.id = order_id and public.is_shop_member(o.shop_id)));
create policy refunds_read  on public.refunds for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (public.is_shop_member(o.shop_id) or o.buyer_id = auth.uid() or public.is_admin())));
create policy refunds_write on public.refunds for insert to authenticated with check (exists (select 1 from public.orders o where o.id = order_id and public.is_shop_owner(o.shop_id)));
revoke select on public.order_lines, public.refunds from anon;

-- buyer-owned rows
create policy addresses_all on public.buyer_addresses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy wishlist_all  on public.wishlist_items  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy consents_read   on public.seller_consents for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy consents_insert on public.seller_consents for insert to authenticated with check (user_id = auth.uid());

-- site forms: anyone may send; only admins read and answer
create policy enquiries_send   on public.enquiries for insert to anon, authenticated with check (status = 'New');
create policy enquiries_admin  on public.enquiries for select to authenticated using (public.is_admin());
create policy enquiries_update on public.enquiries for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy replies_admin    on public.enquiry_replies for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy datareq_send     on public.data_requests for insert to anon, authenticated with check (status = 'Open');
create policy datareq_read     on public.data_requests for select to authenticated using (requester_id = auth.uid() or public.is_admin());
create policy datareq_update   on public.data_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke select on public.enquiries, public.data_requests from anon;

-- =====================================================================================================
-- Functions the app calls
-- =====================================================================================================

-- Buyer checkout. Works for signed-in buyers and guests. Prices, stock and delivery are read from the database here.
--   p_lines: [{ "productId": "<uuid>", "qty": 2, "size": "M" }]      p_pay: 'upi' | 'card' | 'cod'
-- Returns { id, orderNo, total, shipping, paid } . Online payments start unpaid: a payment provider confirms them.
create or replace function public.place_order(
  p_handle text, p_name text, p_phone text, p_city text, p_address text, p_note text, p_pay text, p_lines jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_shop public.shops%rowtype; v_item jsonb; v_prod public.products%rowtype; v_qty integer;
  v_sub integer := 0; v_ship integer := 0; v_order public.orders%rowtype; v_min integer; v_cap integer; v_today integer;
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
    update public.products set stock = stock - v_qty where id = v_prod.id;
    v_sub := v_sub + v_prod.price * v_qty;
  end loop;

  v_min := nullif(v_shop.order_settings ->> 'minimum', '')::integer;
  if v_min is not null and v_sub < v_min then raise exception 'The smallest order is Rs %', v_min; end if;
  v_cap := nullif(v_shop.order_settings ->> 'daily', '')::integer;
  if v_cap is not null then
    select count(*) into v_today from public.orders where shop_id = v_shop.id and created_at >= date_trunc('day', now());
    if v_today >= v_cap then raise exception 'This shop has reached its limit of orders for today'; end if;
  end if;

  v_ship := case when v_sub >= 1500 then 0 else 60 end;
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

-- The seller marks an order paid. Keeps the customer's "spent" total in step.
create or replace function public.mark_order_paid(p_order uuid) returns void language plpgsql security definer set search_path = public as $$
declare v public.orders%rowtype;
begin
  select * into v from public.orders where id = p_order;
  if not found or not public.is_shop_member(v.shop_id) then raise exception 'Order not found'; end if;
  if v.paid then return; end if;
  update public.orders set paid = true where id = p_order;
  update public.customers set spent = spent + v.total where shop_id = v.shop_id and phone is not distinct from v.phone and v.phone is not null;
end $$;
grant execute on function public.mark_order_paid(uuid) to authenticated;

-- Settings > WhatsApp verification. The seller proves the number with a one-time code (Supabase phone login), then calls this.
create or replace function public.confirm_shop_whatsapp(p_shop uuid) returns void language plpgsql security definer set search_path = public, auth as $$
declare v_phone text; v_conf timestamptz; v_num text;
begin
  select phone, phone_confirmed_at into v_phone, v_conf from auth.users where id = auth.uid();
  select whatsapp_number into v_num from public.shops where id = p_shop and owner_id = auth.uid();
  if v_num is null or v_conf is null or v_phone is null
     or right(regexp_replace(v_phone, '\D', '', 'g'), 10) <> right(regexp_replace(v_num, '\D', '', 'g'), 10) then
    raise exception 'That number has not been verified yet';
  end if;
  update public.shops set whatsapp_verified = true where id = p_shop;
end $$;
grant execute on function public.confirm_shop_whatsapp(uuid) to authenticated;

-- =====================================================================================================
-- Storage: product photos. Public to read; only the shop's members write inside their own folder  <shop id>/<file>
-- =====================================================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 2621440, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "product images: anyone can look" on storage.objects for select using (bucket_id = 'product-images');
create policy "product images: shop members upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_shop_member(public.safe_uuid((storage.foldername(name))[1])));
create policy "product images: shop members replace" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_shop_member(public.safe_uuid((storage.foldername(name))[1])));
create policy "product images: shop members delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_shop_member(public.safe_uuid((storage.foldername(name))[1])));
