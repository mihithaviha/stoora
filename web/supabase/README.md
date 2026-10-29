# Supabase setup for Stoora

Everything the database needs is in this folder:

| File | What it is |
| --- | --- |
| `migrations/20261101000000_init.sql` | The whole database: tables, security rules, the checkout function, photo storage |
| `seed.sql` | Optional sample shop ("Meera Studio"), created only when you call it |
| `config.toml` | Settings for running Supabase on your own computer (`supabase start`) |
| `tests/schema.test.mjs` | 50 checks that run the SQL in an embedded Postgres: `npm run db:test` |

The app works **without** any of this (demo mode). Do the steps below to switch it to a real database and real sign-in.

## 1. Create the project and the database

1. Go to https://supabase.com/dashboard, **New project**. Pick a region near your sellers (for India: Mumbai, `ap-south-1`). Save the database password.
2. Open **SQL editor > New query**, paste all of `migrations/20261101000000_init.sql`, and **Run**. (Or, with the CLI: `supabase link --project-ref <ref>` then `supabase db push`.)
3. Check **Table editor**: you should see `profiles`, `shops`, `products`, `orders`, `enquiries` and more, each marked "RLS enabled".

## 2. Put the keys in the app

1. **Project Settings > API**: copy the **Project URL** and the **anon / publishable key**.
2. In `web/`, copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Keep `SUPABASE_SERVICE_ROLE_KEY` private.
3. Restart `npm run dev`. The login page now shows real sign-in, and the "Demo mode" banner disappears.

## 3. Turn on "Continue with Google"

1. Google Cloud Console > **APIs & Services > OAuth consent screen**: set the app name (Stoora), support email, and add your domain.
2. **Credentials > Create credentials > OAuth client ID > Web application**.
   - Authorized JavaScript origins: `http://localhost:3100` and your live site.
   - Authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback` (shown in step 3 below).
3. Supabase **Authentication > Providers > Google**: switch on, paste the **Client ID** and **Client secret**.
4. Supabase **Authentication > URL Configuration**:
   - **Site URL**: `http://localhost:3100` (change to your live address later).
   - **Redirect URLs**: add `http://localhost:3100/auth/callback` and `https://<your-site>/auth/callback`.

How it works: the button calls `signInWithOAuth`. Google returns to Supabase, Supabase returns to `/auth/callback` (`src/app/auth/callback/route.ts`), which swaps the code for a login cookie and sends the person on. A profile row is created automatically for every new person.

## 4. Turn on WhatsApp / SMS codes (optional)

Used by "Get WhatsApp code" on the login pages and by Settings > WhatsApp verification.

1. Create a Twilio account and either a WhatsApp sender or a Messaging Service.
2. Supabase **Authentication > Providers > Phone**: switch on, choose **Twilio**, paste the Account SID, Auth Token and Message Service SID.
3. Without this step Google sign-in still works; the phone form shows the error Supabase returns.

## 5. Make yourself an admin

Admins can open `/admin` and read enquiries and data requests. Sign in once with Google, then in the SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@yourcompany.com';
```

## 6. Sample data (development only)

Sign in once, copy your user id from **Authentication > Users**, then run `seed.sql` once (it only defines a function) and:

```sql
select public.seed_demo_shop('<your user id>');
```

## What each part of the app reads and writes

| Screen | Supabase |
| --- | --- |
| Sign in (Google, code) | Auth, `profiles` (created by a trigger), `become_seller()` |
| Store setup | `shops`, `products` |
| Seller dashboard: products, orders, offers, bookings, customers, money, analytics | `shops`, `products`, `services`, `orders`, `order_lines`, `refunds`, `bookings`, `offers`, `customers` |
| Product photos | Storage bucket `product-images` (folder = shop id) |
| Public shop `/s/<handle>` | `public_shops` view, live `products`, `services` |
| Buyer checkout | `place_order()` (prices, stock, delivery and limits are decided in the database) |
| Buyer orders and addresses | `orders` (own rows only), `buyer_addresses` |
| Order-taking settings | `shops.is_open`, `accepts_cod`, `order_settings` (enforced by `place_order()`) |
| WhatsApp verification | Auth phone verification + `confirm_shop_whatsapp()` |
| Enquiries, data requests, seller consent | `enquiries`, `enquiry_replies`, `data_requests`, `seller_consents` |
| Admin inbox | `enquiries` (admins only) |

Still on the device for now: the bag and wishlist (browser storage), and the admin overview numbers (sample data). Online payments are not connected: an online order is saved as "waiting for payment" and the seller marks it paid (`mark_order_paid()`). Connect Razorpay (see `../../docs/INTEGRATIONS.md`) and have its webhook set `orders.paid` with the service role key.

## Security notes

- The **anon key is public by design**. What protects data is row level security: every table has it on, and `npm run db:test` proves who can and cannot read what.
- Buyers can never change prices, stock or order numbers: checkout runs inside `place_order()`; the shop's money-sensitive columns cannot be edited from the browser.
- The **service role key** skips all rules. Keep it on the server only, never in a `NEXT_PUBLIC_` variable, never in Git.
- Turn on **leaked password protection** and **CAPTCHA / rate limits** under Authentication > Attack protection before launch, so the phone-code form cannot be abused.
