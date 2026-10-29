# Stoora.in

A complete website for small sellers: the public site, sign-up and login, a shop dashboard for laptop and phone,
a public page for each shop, a JSON API and a database.

- Node 22.5 or newer (built and tested on Node 24). **No npm packages to install.**
- Everything that needs an outside service (payments, email, the writing helpers, Google sign-in)
  has a place in the `.env` file. Leave a line empty and that feature stays off; the dashboard shows what is on.

## Run it

```
cp .env.example .env     # then fill in the keys you have (all optional)
npm start                # http://localhost:3000
npm test                 # 243 API checks on a temporary database
```

| What | Where |
| --- | --- |
| Public site | http://localhost:3000 |
| Sample shop (read-only) | log in with `demo@stoora.in` / `meera2026` |
| Your shop | sign up. A new account starts empty |
| The dashboard | http://localhost:3000/dashboard (pages have no `.html`; old `.html` addresses redirect) |
| A shop's public page | http://localhost:3000/s/`your-shop-link` |
| The database | the file `data/stoora.db` (delete it to start fresh) |

## What it does

**For sellers (the dashboard)**
- Sign up, log in, log out, forgot password, confirm email, sign in with Google.
- Add and edit products and services with photos; stock goes down when something is bought.
- Orders: create, mark paid, ship with courier and tracking number, refund, export. Bookings, customers, offers.
- Home, Money and Analytics worked out from the shop's own orders: sales, best sellers, channels, ratings from buyer reviews.
- "Write it for me" for product descriptions, and "Read a chat" to turn a pasted buyer message into an order draft.
- The Home screen shows an "Ask Stoora" box, blurred with a "Coming soon" button: the assistant is not switched on yet.
- Helpers: add people who log in with their own email and see only what their role allows (packing: orders).
- Settings: all 18 pages work and save: delivery fee, free-delivery amount, GST, address, policies, UPI ID, WhatsApp and Instagram, Meta Pixel and Google Analytics ids, own web address, email alerts, Razorpay guide.
- Works on laptops, tablets and phones (360px and up).

**For buyers (the shop page)**
- See products, classes and services with ratings, add to a cart, check out with name, phone and address.
- Pay online with Razorpay (cards, UPI, netbanking), or pay by UPI to the seller, or pay on contact.
- "Where is my order?": order number plus phone number shows the status, courier and tracking number, and lets the buyer rate what they bought.
- Chat on WhatsApp, Instagram link, refund / shipping / privacy / terms policies, GSTIN and address.

## Keys and settings (the `.env` file)

Every value below is optional. Where to get each one is also written next to it in `.env.example`.

| Feature | `.env` lines | Where to get it |
| --- | --- | --- |
| Online payments | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Razorpay Dashboard › Account & Settings › API keys and Webhooks. Use test keys first |
| Pay each seller directly | `RAZORPAY_ROUTE=1` | Needs Razorpay Route on your account; sellers add their linked account id in Settings › Payments |
| Email (confirm, reset, order alerts) | `EMAIL_PROVIDER` + `RESEND_API_KEY` or `SMTP_*`, and `EMAIL_FROM` | resend.com, or any SMTP mailbox |
| Writing helpers | `ANTHROPIC_API_KEY` | console.anthropic.com. Without it they use a simple template |
| Sign in with Google | `GOOGLE_CLIENT_ID` | Google Cloud Console › Credentials › OAuth client ID (Web) |
| Public address | `APP_URL`, `COOKIE_SECURE=1`, `TRUST_PROXY=1` | Your own domain, once the site is online |

After editing `.env`, restart the server. **Settings › Apps** in the dashboard shows which keys the server found.

### Connecting Razorpay (one time)

1. Create a Razorpay account and finish its business verification.
2. In Test Mode generate API keys and put them in `.env`. Restart.
3. In Razorpay › Webhooks add the address shown in Settings › Payments, with a secret, and put that secret in `.env`.
4. Buy something for ₹1 on a shop page. The order turns **Paid** in the dashboard. When ready, switch to live keys.

## Putting it on the internet

The server is one Node program plus one database file.

- Run it on any host that has Node (a VPS, Render, Railway ...) or use the included `Dockerfile`:
  `docker build -t stoora .` then `docker run -p 3000:3000 --env-file .env -v stoora-data:/app/data stoora`.
- Keep `data/` on a disk that survives restarts (that is the database).
- Put https in front (a reverse proxy or your host's built-in https), then set `APP_URL`, `COOKIE_SECURE=1` and `TRUST_PROXY=1`.
- Razorpay can only send webhooks to a public https address, so do the webhook steps after this.
- For a seller's own web address (Settings › Domains), point their domain at your server and give it a certificate.

## How the code is organised

```
server/
  index.js        starts the server and wires the routes
  config.js       reads .env; says what is switched on
  db.js           the SQLite database: tables and small helpers
  router.js       a tiny router (login checks, JSON in and out)
  http.js         replies, cookies, rate limiting, static files
  auth.js         passwords, sessions, email links, input checks
  stats.js        numbers for Home, Money and Analytics
  orders.js       changes the server makes to orders
  demo.js, seed.js   the read-only sample shop
  routes/         auth, account (+ helpers), shop (public), payments, channels, ai
  services/       razorpay, email, ai, google, shop-stats
  test-api.js     243 end-to-end API checks
public/
  index.html, js/site/, css/   public site, login, sign-up, onboarding
  dashboard.html, dashboard-phone.html   the dashboard (laptop / phone layouts)
  js/dashboard/   api.js (load + save), actions, forms, live screens, settings, account-tools, pages, transitions
  shop.html       a shop's public page
```

Format the code with `npm run format` (Prettier, fetched on demand).

## Security notes

- Passwords are stored with scrypt; sessions are random tokens in an HttpOnly cookie; only the token's hash is stored.
- Requests from other websites are refused. Login, sign-up, checkout, reviews and writing-helper calls are rate limited.
- Prices, stock and delivery fees are always worked out on the server, never trusted from the browser.
- Razorpay payments are confirmed only after their signature is checked; webhook events are checked and applied once.
- `.env` and `data/` are never served. The sample shop cannot be changed by visitors.
- Secret keys live only in `.env`. They are never sent to the browser, and no screen asks for them.

## Good to know

- The sample shop (Meera Studio) is made-up sample data: its numbers and ratings are examples.
- One Razorpay account serves the whole server. To pay each seller to their own bank, turn on Razorpay Route.
- A helper needs an email and password that the owner chooses; helpers do not get a shop of their own.
- The public site's feature previews reuse an older copy of the dashboard code in `public/js/site/`; signed-in users always get the dashboard in `public/js/dashboard/`.

## Payments, analytics and going live (newer additions)

- **Payments page:** every online payment with status (paid, waiting, failed, refunded), method, buyer and order, filters, search,
  date ranges and a detail view. Customer payments are kept apart from bank settlements, which Razorpay shows in its own dashboard.
- **Pay online from an order**, retry after a cancelled payment, and **refund through Razorpay** (partial or full).
- **Payout accounts (Razorpay Route):** a seller links their own `acc_...` account; money is sent to it only once Razorpay says it is activated. See `docs/INTEGRATIONS.md`.
- **Order from a chat:** paste a WhatsApp chat, review the editable draft, then create the order. Nothing is created automatically.
- **Analytics** for today, 7, 30 or 90 days, compared with the range before; honest empty states for ratings and trends.
- **Business type** (Settings › General) changes the words in the menu (Classes and Students for a tutor).
- **Spacing and layout** are tuned in one place: `public/css/dashboard.css` (spacing scale, card padding, page gutters).
- **Database migrations** run on start (`server/migrations.js`). `/api/ready` reports the schema version.
- **Deployment:** `Dockerfile`, `render.yaml`, `docs/DEPLOYMENT.md` (https, domain, webhooks, backups), `docs/INTEGRATIONS.md` (every key, where to get it, approvals).

### Status: what has been tested

| Area | Status |
| --- | --- |
| Sign-up, login, reset, helpers, tenant isolation, payments list, webhooks (signed, repeated, failed, refund), retries, refund validation, order drafts, analytics, WhatsApp webhooks, headers, migrations | Tested: 121 automated API checks |
| Dashboard screens, payments page, analytics range, order drafts, category words, phone and tablet layouts | Tested in a real browser (no page errors, no sideways overflow from 360px to 1440px) |
| Razorpay API calls (create order, refund), Checkout in the browser, linked-account lookup | Implemented; **not run against Razorpay** (needs your test keys) |
| Email delivery (Resend / SMTP) | Implemented; **not run against a provider** (needs your key and a verified domain) |
| Claude answers and tool use | Implemented; **not run against the API** (needs `ANTHROPIC_API_KEY`) |
| Razorpay Route payouts | Architecture, database and checks built; needs Route enabled by Razorpay and a real linked account |
| Public deployment, https, live webhooks | **Not deployed.** Steps are in `docs/DEPLOYMENT.md` |

## Storefront builder

Dashboard › Storefront turns a shop into a website. A seller picks one of five templates, makes it theirs, previews it, and publishes.

- **Five distinct templates:** Boutique (editorial), Minimal (catalogue first), Studio (warm and personal), Services (tutors, coaches, consultants: services only, with credentials and FAQs), Signature (bold brand typography, trust facts from real data).
- **Six colour themes** built only from Brand Kit v2 colours, each checked for readable text and buttons (WCAG AA). Plus six approved accent colours. Colours apply to the public storefront only; the dashboard never changes.
- **Editor:** panels on the left, a live preview of the real template on the right (desktop and mobile), undo and redo, autosave with a clear status, "Preview storefront" in a new tab (private to the owner), and a publish flow with a final preview and checks.
- **Real data:** products and services come from the shop's own catalogue (nothing is copied). The seller chooses what to show and what to feature. Reviews, ratings and bestsellers appear only when they are real. A shop with nothing to show gets an honest empty state.
- **Draft and published versions:** edits go to a draft. Publishing copies it to the version buyers see; a refused publish leaves the earlier version online. Status: not started, draft, ready, published, changes not yet published.
- **Public address:** `<site>/s/<shop-link>` (the same address as before). Shops that never publish keep the simple page they had.
- **Images:** uploaded through Stoora (JPG, PNG or WebP up to 2.5 MB, real file type checked), stored on disk in `data/uploads/<seller>/`, shrunk in the browser first. Outside image addresses are refused.
- **Safety:** each seller can only read and change their own storefront; the public reply contains no orders, customers or private settings; the sample shop is read-only.
- **Where the code is:** `public/js/storefront/shared.js` (templates, themes, limits), `templates.js` (the five renderers), `public/css/storefront.css`, `public/js/dashboard/storefront.js` (gallery and editor), `server/storefront.js` and `server/routes/storefront.js` (validation, drafts, publishing, images). Database migration 4 adds the `storefronts` table.

## Premium templates

Three paid storefront templates (Atelier Luxe, Heritage Craft, Signature Studio) sit beside the five free ones. Preview is free; access is bought per template through Razorpay and enforced on the server. See `docs/INTEGRATIONS.md` and the `PREMIUM_*` variables in `.env.example`.

## The Journal

`/journal` is a server-rendered editorial section of the public site (home with topic filter and search, and one page per story at `/journal/<slug>`, each with its own title, description and canonical address; `/sitemap.xml` lists them). Content lives in one file, `server/journal/articles.js`; pages are rendered by `server/journal/render.js`; styles are `public/css/journal.css`; photos are in `public/assets/journal` (credits in `CREDITS.md` there). The current stories are editorial examples: replace them with your own. To add a story, add an entry to `ARTICLES` (and, for a new photo, a `<name>-720.jpg` and `<name>-1400.jpg`).

## Storefront shopping and payments

Published storefronts are working shops: buyers browse, pick sizes, add to a bag, check out as guests and pay online
(Razorpay) or pay the seller directly; sellers manage payment status and fulfilment from the dashboard. How the money
reaches each seller (Razorpay Route or operator collection) and what to set up is in `docs/INTEGRATIONS.md`.

## If it will not start

| Message | Fix |
| --- | --- |
| `Could not read package.json` / `ENOENT` | You are in the wrong folder. Run `npm start` in the folder that contains `package.json` and `server/`. |
| `Port 3000 is busy ... Trying 3001` | An earlier copy is still running. Use the address printed (`Stoora is running at ...`), or stop the old one (close its terminal, or Ctrl+C). |
| `This needs Node 22.5 or newer` | Install the current LTS from nodejs.org, open a new terminal, run `npm start` again. |

To start fresh, stop the server and delete the `data/` folder (this erases the database and uploads).

## Project layout

This folder holds the whole project:

- `server/` (API + database), `public/` (the working website, dashboard and shop pages), `docs/`, `data/` (database and uploads, git-ignored).
- `web/` is the new **React + TypeScript (Next.js)** front end: landing page, login with codes, store setup, seller dashboard, storefront, checkout, buyer account, legal pages, demo and admin. It runs on demo data for now. See `web/README.md`.
  Run it with `npm run web:install` once, then `npm run web:dev` (http://localhost:3100, preview of every screen at `/design`).
- `archive/` keeps an older static prototype that the app does not use; delete it if you do not need it.
