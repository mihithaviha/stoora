# Stoora

One React + TypeScript app (Next.js 16, App Router) that runs the whole website on **one port, 3000**: the public site and Journal, sign-in,
store setup, the seller dashboard, storefronts and the public shop, the buyer account, legal pages, the demo pages and the admin.
Styling is plain CSS (Brand Kit v2 tokens), no CSS framework.

> Without Supabase keys the app runs on **demo data** ("Meera Studio") kept in the browser. With keys it uses Supabase (see below).
> All reads and writes go through `src/lib/store.tsx`, so the screens work the same in both modes.

## Run it

```bash
npm install
npm run dev                    # http://localhost:3000
npm run build && npm start     # production build, also on http://localhost:3000
npm run typecheck
```

Open **http://localhost:3000** for the website, **http://localhost:3000/dashboard** for the seller dashboard (demo login code is always **123456**),
and **http://localhost:3000/design** to see every screen, each in a phone or laptop frame. Needs Node 20.9 or newer.

## Real sign-in and a real database (Supabase)

Out of the box the app runs in **demo mode** (sample shop, no login needed). To switch to real accounts and a real database:

1. Create a Supabase project and run `supabase/migrations/20261101000000_init.sql` (the whole database).
2. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Turn on Google (and optionally WhatsApp codes) in Supabase. Full steps and every credential: **`supabase/README.md`**.

With the keys set, "Continue with Google" and the WhatsApp code are real, seller pages need a login, and shops, products, orders, refunds, enquiries and addresses are stored in Supabase.
`npm run db:test` runs 50 checks on the database rules (who can see what, the checkout function, stock) in an embedded Postgres.

## Checks

```bash
npm run build && npm start     # in one terminal
npm run e2e                    # 11 browser flows: login, buying, refund, import, WhatsApp, enquiry, onboarding ...
npm run screenshots            # saves handoff/screenshots/{desktop,mobile}/*.png and handoff/screenshots/index.html
```

Both scripts need Chrome or Edge (set `BROWSER=` to its path if it is not found).

## Folders

```
src/app/
  (marketing)/   the public site, its own root layout and stylesheet: home (+ /about, /how-it-works, /who-its-for, /features),
                 log in, open a shop, code entry, Journal (/journal, /journal/[slug]), privacy, terms
  (app)/         everything else, a second root layout with the seller app's stylesheet:
    (site)/      demo, seller consent, data requests                                 (older public header + footer)
    (flow)/      buyer login and code entry, store setup, signed out                  (no header)
    (dashboard)/ seller app: dashboard, orders, products (+ import), customers, money, analytics, settings ...
    (shop)/      s/[handle] storefront, product, bag, wishlist, checkout, payment results; buyer/* account and orders
    (admin)/     admin overview and enquiry inbox
    (design)/    /design (index of every screen), /design/preview (device frames), /design/states/*
    not-found.tsx  error.tsx  loading.tsx
  global-not-found.tsx   the 404 page for an address that matches nothing (public-site look)
  auth/callback  Google sign-in return route (swaps the code for a login cookie)
src/components/
  ui.tsx         buttons, badges, cards, fields, switch, chips, dialog (sheet on phones, modal on laptops), toasts, charts
  bits.tsx       logo, one-time-code input, stars, product picture, accordion, stepper, state screens
  AppShell.tsx   seller sidebar / bottom bar / menu drawer / search / alerts
  marketing/     the public site in the original design: landing/ (hero, About, Who it's for, How it works, Features), auth/, journal/ (story ring built on GSAP), SiteNav, SiteFooter, ShopFront (the painted shop)
  storefront/    the eight storefront templates (Templates.tsx), the template gallery, the editor and the live shop page (ShopStore.tsx)
  site/ shop/ admin/   frames and parts for each area  ·  RefundDialog, OrderTaking, WhatsAppVerify
src/lib/storefront/  shared.ts (themes, templates, default design), sample.ts (labelled sample shops), map.ts (shop data to storefront data), draft.ts (the editor's draft)
src/lib/         store (demo data or Supabase), auth, supabase/ (client, server, data), stats, bag (cart + wishlist), catalog, enquiries, nav, types, format
supabase/        database migrations (init, storefront), seed, local config, tests and the setup guide (supabase/README.md)
src/styles/      fonts.css, site.css, shop.css, admin.css (seller app; tokens in src/app/(app)/globals.css) · brand/ (main.css, features.css, journal.css, touch.css: the public site, copied from the original design)
public/          fonts/ (self-hosted), images/ (logo, wordmark, share card)
handoff/         screenshots and the handoff notes
scripts/         capture-screenshots.js, e2e-flows.js
```

## Design rules (Brand Kit v2)

- One light palette: white page, grey cards, cream inside cards, ink-blue sidebar. Tokens are CSS variables at the top of `src/app/(app)/globals.css` (and `src/styles/brand/main.css` for the public site).
- Everything clickable is a pill. Badges use deep text on a tint, with an icon and a word (never colour alone).
- Spacing uses the 6, 10, 16, 26, 42, 68 px scale (`--s1` to `--s6`).
- Responsive: phone under 760px (floating bottom bar), tablet 760 to 1099 (icon rail), laptop 1100+ (full sidebar).
- Respects reduced motion. Every field has a label, errors say what to do, dialogs trap focus and close with Escape.

## The storefront

Dashboard > Storefront has three tabs: Templates (a live thumbnail of each of the eight templates), Editor (controls beside a live preview) and Shop settings.
The preview is `/store-preview` in a frame, so a seller's colours never touch the dashboard and the page behaves like the real shop at that screen width.
The working copy is a draft in this browser; **Publish** saves the design on the shop (`shops.storefront`, a jsonb column added by
`supabase/migrations/20261102000000_storefront.sql`; in demo mode it is part of the demo data). Once published, `/s/<handle>` is drawn by the chosen template
and uses the shop's own bag, saved items and checkout. **Take offline** returns buyers to the simple shop page. The three premium templates can be previewed but not applied yet.

## Checking everything

```
npm run typecheck                         # TypeScript
npm run build && npm start                # production build on http://localhost:3000
node scripts/e2e-flows.js                 # 13 flows in a real browser (set BASE= for another address)
npm run db:test                           # the database rules (50 checks)
```
