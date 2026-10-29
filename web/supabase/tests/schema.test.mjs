// Runs web/supabase/migrations/*.sql and seed.sql in an embedded Postgres and checks the security rules and place_order().
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const db = new PGlite();
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); };

// stand-ins for what Supabase provides
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, phone text, raw_user_meta_data jsonb default '{}', phone_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
  grant usage on schema public, auth, storage to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  grant select on auth.users to authenticated; grant all on all tables in schema storage to anon, authenticated, service_role;
`);
for (const f of fs.readdirSync(ROOT + 'migrations').sort()) await db.exec(fs.readFileSync(ROOT + 'migrations/' + f, 'utf8'));
ok(true, 'migration runs without errors');
await db.exec(fs.readFileSync(ROOT + 'seed.sql', 'utf8'));
ok(true, 'seed.sql loads');

const as = async (role, uid) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role ${role};`); };
const q = async (sql, params) => (await db.query(sql, params)).rows;
const fails = async (sql) => { try { await db.query(sql); return false; } catch (e) { return e.message; } };

await db.exec('reset role');
const seller = (await q(`insert into auth.users (email, raw_user_meta_data) values ('meera@example.in', '{"full_name":"Meera","picture":"http://x/p.png"}') returning id`))[0].id;
const buyer = (await q(`insert into auth.users (email, raw_user_meta_data) values ('priya@example.in', '{"name":"Priya"}') returning id`))[0].id;
const other = (await q(`insert into auth.users (email) values ('other@example.in') returning id`))[0].id;
const admin = (await q(`insert into auth.users (email) values ('admin@example.in') returning id`))[0].id;
await db.exec(`update public.profiles set role = 'admin' where id = '${admin}'`);

ok((await q('select role, full_name, avatar_url from public.profiles where id = $1', [seller]))[0].full_name === 'Meera', 'a profile is created automatically at first login (Google name and photo)');
await as('authenticated', seller);
await db.exec('select public.become_seller()');
ok((await q('select role from public.profiles where id = $1', [seller]))[0].role === 'seller', 'a person can choose to become a seller');
ok(!!(await fails(`update public.profiles set role = 'admin' where id = '${seller}'`)), 'a user cannot make themselves admin');

// create the shop as the seller, then seed it
await db.exec(`insert into public.shops (owner_id, name, handle, city) values ('${seller}', 'Meera Studio', 'meera', 'Jaipur')`);
ok(!!(await fails(`insert into public.shops (owner_id, name, handle) values ('${seller}', 'Second', 'second')`)), 'one shop per owner');
ok(!!(await fails(`insert into public.shops (owner_id, name, handle) values ('${other}', 'Bad', 'Bad Handle')`)), 'a bad shop link is refused');
ok(!!(await fails(`update public.shops set whatsapp_verified = true where owner_id = '${seller}'`)), 'a seller cannot mark their own WhatsApp as verified');
ok(!!(await fails(`update public.shops set next_order_no = 1 where owner_id = '${seller}'`)), 'a seller cannot change order numbering');
await db.exec('reset role'); await db.exec(`delete from public.shops where owner_id = '${seller}'`);
const shopId = (await q(`select public.seed_demo_shop('${seller}') as id`))[0].id;
ok(!!shopId, 'seed_demo_shop() builds the sample shop');
ok(Number((await q('select count(*)::int n from public.products'))[0].n) === 5, 'sample products created');
ok((await q('select min(order_no) a, max(order_no) b from public.orders'))[0].a === 1001, 'order numbers start at 1001');

// anonymous visitor: public shop page only
await as('anon');
ok((await q(`select name from public.public_shops where handle = 'meera'`)).length === 1, 'the public shop page can be read by anyone');
ok(!!(await fails('select email from public.shops')), 'anyone cannot read the shops table (email, phone, settings)');
const live = await q('select name from public.products');
ok(live.length === 5 && live.every((p) => p.name), 'visitors see live products');
ok(!!(await fails('select * from public.orders')), 'visitors cannot read orders');
ok(!!(await fails(`insert into public.orders (shop_id, buyer_name, total) values ('${shopId}', 'X', 1)`)), 'visitors cannot insert orders directly');

// checkout as a guest
await db.exec('reset role');
const kurta = (await q(`select id from public.products where name = 'Handblock cotton kurta'`))[0].id;
const sold = (await q(`select id from public.products where stock = 0`))[0].id;
await as('anon');
const r = (await q(`select public.place_order('meera', 'Guest Buyer', '9876501234', 'Pune', '1 MG Road', 'gift wrap', 'upi', $1::jsonb) as r`, [JSON.stringify([{ productId: kurta, qty: 2, size: 'M' }])]))[0].r;
ok(r.total === 2998 && r.shipping === 0 && r.paid === false, 'guest checkout: total worked out on the server (2 x 1499, free delivery), unpaid');
await db.exec('reset role');
ok((await q('select stock from public.products where id = $1', [kurta]))[0].stock === 22, 'stock goes down by the quantity ordered');
ok((await q('select order_no from public.orders where id = $1', [r.id]))[0].order_no === 1004, 'the order gets the next number (1004)');
ok(Number((await q('select count(*)::int n from public.order_lines where order_id = $1', [r.id]))[0].n) === 1, 'order lines are stored');
await as('anon');
const small = (await q(`select public.place_order('meera', 'Guest', '9876501234', 'Pune', 'x', null, 'cod', $1::jsonb) as r`, [JSON.stringify([{ productId: kurta, qty: 1 }])]))[0].r;
ok(small.shipping === 60 && small.total === 1559, 'under Rs 1,500 a delivery fee of Rs 60 is added by the server');
ok(!!(await fails(`select public.place_order('meera', 'G', '9876501234', 'Pune', 'x', null, 'upi', '[{"productId":"${sold}","qty":1}]'::jsonb)`)), 'a sold-out item cannot be ordered');
ok(!!(await fails(`select public.place_order('meera', 'G', '123', 'Pune', 'x', null, 'upi', '[{"productId":"${kurta}","qty":1}]'::jsonb)`)), 'a bad phone number is refused');
ok(!!(await fails(`select public.place_order('meera', 'G', '9876501234', 'Pune', 'x', null, 'upi', '[{"productId":"${kurta}","qty":99}]'::jsonb)`)), 'ordering 99 of one item is refused');
ok(!!(await fails(`select public.place_order('nobody', 'G', '9876501234', 'Pune', 'x', null, 'upi', '[]'::jsonb)`)), 'an unknown shop is refused');

// a signed-in buyer sees only their own orders
await as('authenticated', buyer);
await db.query(`select public.place_order('meera', 'Priya Sharma', '9811100000', 'Pune', 'x', null, 'cod', $1::jsonb)`, [JSON.stringify([{ productId: kurta, qty: 1 }])]);
const mine = await q('select buyer_name from public.orders');
ok(mine.length === 1 && mine[0].buyer_name === 'Priya Sharma', 'a buyer sees only their own order');
ok(Number((await q('select count(*)::int n from public.order_lines'))[0].n) === 1, 'and only its lines');
ok(!!(await fails(`update public.orders set paid = true`)) || (await q('select count(*)::int n from public.orders where paid')).filter((x) => x.n > 0).length === 0, 'a buyer cannot mark an order paid');
ok((await q('select count(*)::int n from public.shops'))[0].n === 0, 'a buyer cannot read the shops table');

// another seller sees nothing of this shop
await as('authenticated', other);
ok((await q('select count(*)::int n from public.orders'))[0].n === 0, 'another seller cannot see these orders');
ok((await q('select count(*)::int n from public.customers'))[0].n === 0, 'or these customers');
await db.query(`update public.products set price = 1 where shop_id = '${shopId}'`);
await db.exec('reset role');
ok(Number((await q('select count(*)::int n from public.products where price = 1'))[0].n) === 0, 'another seller cannot change these products');

// the owner
await as('authenticated', seller);
ok((await q('select count(*)::int n from public.orders'))[0].n >= 6, 'the owner sees all orders of their shop');
await db.exec(`select public.mark_order_paid('${r.id}')`);
ok((await q('select paid from public.orders where id = $1', [r.id]))[0].paid === true, 'the owner can mark an order paid');
await db.query(`insert into public.refunds (order_id, amount, reason) values ('${r.id}', 500, 'Changed mind')`);
ok((await q('select count(*)::int n from public.refunds'))[0].n === 1, 'the owner can refund');
await as('authenticated', other);
ok(!!(await fails(`insert into public.refunds (order_id, amount, reason) values ('${r.id}', 1, 'x')`)), 'another seller cannot refund it');

// WhatsApp verification
await as('authenticated', seller);
await db.exec(`update public.shops set whatsapp_number = '+91 98765 43210' where id = '${shopId}'`);
ok(!!(await fails(`select public.confirm_shop_whatsapp('${shopId}')`)), 'WhatsApp cannot be confirmed before the phone code was entered');
await db.exec('reset role'); await db.exec(`update auth.users set phone = '919876543210', phone_confirmed_at = now() where id = '${seller}'`);
await as('authenticated', seller);
await db.exec(`select public.confirm_shop_whatsapp('${shopId}')`);
ok((await q('select whatsapp_verified from public.shops where id = $1', [shopId]))[0].whatsapp_verified === true, 'a verified phone confirms the shop\'s WhatsApp number');
await db.exec(`update public.shops set whatsapp_number = '+91 90000 00000' where id = '${shopId}'`);
ok((await q('select whatsapp_verified from public.shops where id = $1', [shopId]))[0].whatsapp_verified === false, 'changing the number resets the verification');
await as('anon');
ok((await q(`select whatsapp_number from public.public_shops where handle = 'meera'`))[0].whatsapp_number === null, 'an unverified number is not shown on the public shop');

// enquiries and data requests
await as('anon');
await db.exec(`insert into public.enquiries (name, contact, topic, message) values ('Visitor', 'v@example.in', 'Pricing and plans', 'Is there any monthly fee please?')`);
ok(!!(await fails(`insert into public.enquiries (name, contact, topic, message, status) values ('V', 'v@example.in', 'x', 'long enough message here', 'Closed')`)), 'visitors can only create "New" enquiries');
ok(!!(await fails('select * from public.enquiries')), 'visitors cannot read enquiries');
await db.exec(`insert into public.data_requests (kind, name, contact) values ('delete', 'Visitor', 'v@example.in')`);
await as('authenticated', seller);
ok((await q('select count(*)::int n from public.enquiries'))[0].n === 0, 'sellers cannot read enquiries');
await as('authenticated', admin);
ok((await q('select count(*)::int n from public.enquiries'))[0].n === 1, 'an admin reads enquiries');
ok((await q('select count(*)::int n from public.data_requests'))[0].n === 1, 'an admin reads data requests');
await db.exec(`update public.enquiries set status = 'Answered'`);
ok((await q('select status from public.enquiries'))[0].status === 'Answered', 'an admin updates enquiry status');
ok((await q('select count(*)::int n from public.shops'))[0].n === 1, 'an admin can see shops');

// storage policy
await as('authenticated', seller);
await db.query(`insert into storage.objects (bucket_id, name) values ('product-images', '${shopId}/photo.jpg')`);
ok(!!(await fails(`insert into storage.objects (bucket_id, name) values ('product-images', '${crypto.randomUUID()}/photo.jpg')`)), 'a seller cannot upload into another shop\'s folder');
ok(!!(await fails(`insert into storage.objects (bucket_id, name) values ('product-images', 'not-a-uuid/photo.jpg')`)), 'a bad folder name is refused');

console.log(`\n${fail ? fail + ' FAILED' : 'All ' + pass + ' database checks passed'}`);
process.exit(fail ? 1 : 0);
