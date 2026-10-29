# Stoora web (React + TypeScript)

The Stoora front end: public site, login, store setup, seller dashboard, buyer storefront and account, legal pages, demo pages and admin.
Built with **Next.js 14 (App Router), React 18 and TypeScript**. Styling is plain CSS (Brand Kit v2 tokens), no CSS framework.

> Without Supabase keys the app runs on **demo data** ("Meera Studio") kept in the browser. With keys it uses Supabase (see below).
> All reads and writes go through `src/lib/store.tsx`, so the screens work the same in both modes.

## Run it

```bash
cd web
npm install
npm run dev          # http://localhost:3100   (the Node server in the folder above uses 3000)
npm run build && npm start     # production build, also on 3100
npm run typecheck
```

Open **http://localhost:3100/design** to see every screen, each in a phone or laptop frame.
Demo login code is always **123456**.

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
  (site)/        landing, demo, privacy, terms, seller consent, data requests     (public header + footer)
  (flow)/        seller and buyer login, code entry, store setup, signed out      (no header)
  (dashboard)/   seller app: dashboard, orders, products (+ import), customers, money, analytics, settings ...
  (shop)/        s/[handle] storefront, product, bag, wishlist, checkout, payment results; buyer/* account and orders
  (admin)/       admin overview and enquiry inbox
  auth/callback  Google sign-in return route (swaps the code for a login cookie)
  (design)/      /design (index of every screen), /design/preview (device frames), /design/states/*
  not-found.tsx  error.tsx  loading.tsx   (global states)  ·  (dashboard)/loading.tsx
src/components/
  ui.tsx         buttons, badges, cards, fields, switch, chips, dialog (sheet on phones, modal on laptops), toasts, charts
  bits.tsx       logo, one-time-code input, stars, product picture, accordion, stepper, state screens
  AppShell.tsx   seller sidebar / bottom bar / menu drawer / search / alerts
  site/ shop/ admin/   frames and parts for each area  ·  RefundDialog, OrderTaking, WhatsAppVerify
src/lib/         store (demo data or Supabase), auth, supabase/ (client, server, data), stats, bag (cart + wishlist), catalog, enquiries, nav, types, format
supabase/        database migration, seed, local config, tests and the setup guide (supabase/README.md)
src/styles/      fonts.css, globals.css (tokens + base components, in src/app), site.css, shop.css, admin.css
public/          fonts/ (self-hosted), images/ (logo, wordmark, share card)
handoff/         screenshots and the handoff notes
scripts/         capture-screenshots.js, e2e-flows.js
```

## Design rules (Brand Kit v2)

- One light palette: white page, grey cards, cream inside cards, ink-blue sidebar. Tokens are CSS variables at the top of `src/app/globals.css`.
- Everything clickable is a pill. Badges use deep text on a tint, with an icon and a word (never colour alone).
- Spacing uses the 6, 10, 16, 26, 42, 68 px scale (`--s1` to `--s6`).
- Responsive: phone under 760px (floating bottom bar), tablet 760 to 1099 (icon rail), laptop 1100+ (full sidebar).
- Respects reduced motion. Every field has a label, errors say what to do, dialogs trap focus and close with Escape.
