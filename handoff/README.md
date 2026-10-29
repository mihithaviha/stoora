# Handoff: Stoora front-end design

Written in **React + TypeScript (`.tsx`)** in the **Next.js** project at the repository root, styled with plain CSS.
Open `screenshots/index.html` for every screen on a laptop and a phone, or run the app and open **http://localhost:3000/design**.

## Checklist, item by item

### Format
- [x] React + TypeScript, compatible with the Next.js project: the repository root *is* that project (App Router, `.tsx` everywhere, strict mode, `npm run typecheck` and `npm run build` pass).
- [x] CSS only (no framework): `src/app/globals.css` (tokens + base components), `src/styles/site.css`, `shop.css`, `admin.css`, `fonts.css`.
- [x] Mobile and desktop layouts with shared fonts, colours and components: phone under 760px, tablet 760 to 1099, laptop 1100+. Every screen was captured at 1440×900 and 390×844, and checked for sideways scrolling at phone width.

### Pages and screens

| Checklist item | Screens (path) |
| --- | --- |
| Landing page | `/`, mobile menu `/?menu=1`, enquiry dialog `/?dialog=enquiry` |
| Seller and buyer sign-in: Continue with Google, or a WhatsApp code (no passwords) | `/login`, `/login/verify`, `/buyer/login`, `/buyer/login/verify` (+ wrong-code and too-many-tries states) |
| Store setup / onboarding | `/onboarding` (5 steps + "shop is live") |
| Seller dashboard, sidebar and navigation | `/dashboard`; desktop sidebar, tablet rail, phone bottom bar and menu drawer, search (Ctrl K), alerts |
| Products: list, add/edit, import | `/products`, `/products/new`, `/products/[id]`, `/products/import` (upload, match columns, review, done) |
| Orders: list, details, refund dialog | `/orders`, `/orders/[id]`, `/orders/[id]?dialog=refund`, `/orders/new` |
| Money overview | `/money`, `/analytics` |
| Settings, with order-taking and WhatsApp verification | `/settings`, `/settings/general`, `/settings/order-taking`, `/settings/whatsapp-verification` (not verified, code sent, wrong code, verified) |
| Storefront and product details | `/s/meera`, `/s/meera/p/[id]` |
| Bag, wishlist, quick view | `/s/meera/bag`, bag drawer, `/s/meera/wishlist`, quick view `/s/meera?quick=p3` |
| Checkout and payment results | `/s/meera/checkout`, `/s/meera/payment/success`, `/failed`, `/pending` |
| Buyer account and order history | `/buyer/orders`, `/buyer/orders/[id]` (tracking), `/buyer/account` (details, saved addresses) |
| Legal | `/privacy`, `/terms`, `/seller-consent`, `/data-requests` |
| Demo pages, admin dashboard, enquiry inbox | `/demo`, `/admin`, `/admin/enquiries`, `/admin/enquiries/[id]` |
| Loading, empty, error, not found, signed out | `/design/states/loading`, `/empty`, `/error`; `not-found.tsx` (any unknown path); `/signed-out`; buyer signed-out; unknown shop; per-page empty states and skeletons |

### Complete handoff
- [x] All page designs together, including dialogs (refund, quick view, bag, enquiry, address, confirm) and mobile menus (site, shop, seller drawer, admin drawer).
- [x] Source code (`src/`), shared components (`src/components`), images and icons (`public/images`, Material Symbols Rounded), fonts (`public/fonts`, self-hosted).
- [x] Screenshots of the complete design (`handoff/screenshots/`, 68 screens × laptop and phone) and a live preview (`/design`).

## Decisions to know about

- **WhatsApp verification** means proving the shop's WhatsApp *contact number* with a code, so buyers get a "Chat on WhatsApp" button. There is **no chat inbox, WhatsApp or Instagram section and no assistant chat**: the earlier decision to remove those stands. The "Ask Stoora" box shows blurred with a "Coming soon" button.
- **Demo mode and Supabase.** With no keys the app runs on sample data in the browser (codes are `123456`, payments simulated, "Continue with Google" signs in as the sample shop). With the keys from `.env.example` it uses Supabase for sign-in (Google, WhatsApp code) and the database. See `supabase/README.md`.
- **Legal text** is a plain-language draft. Have a lawyer review it before launch.
- **Stats in the admin overview and the landing mock-up are made-up sample numbers** and are labelled as sample data. There are no invented customer testimonials or ratings claims on the landing page.
- **One app.** The earlier Node server and HTML website have been retired: this Next.js app is the whole site and runs on one port. The endpoints a real server would need are listed in `API_TODO` comments, mainly in `src/lib/store.tsx`.

## What is *not* in the design (and why)
- Real login, payments, SMS/WhatsApp codes, email and file storage: they need the server. Every screen already has its loading, empty, error and success state, so wiring them in does not change the layout.
- Dark mode: the Brand Kit defines one light palette.
