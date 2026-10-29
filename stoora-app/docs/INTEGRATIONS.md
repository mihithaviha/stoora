# Integrations: what to set up, where, and what is still needed

Every key goes in the `.env` file on the server (copy `.env.example`). Keys never reach the browser and no screen asks for them.
Open **Settings › Apps** in the dashboard to see which ones the server found.

## Razorpay (online payments)

| | |
| --- | --- |
| Provider | Razorpay, through its REST API |
| Variables | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| Where to get them | Razorpay Dashboard › Account & Settings › API keys; Webhooks (you choose the webhook secret) |
| Test or live | Decided by the key: `rzp_test_...` is test mode, `rzp_live_...` is live. Settings › Payments shows which |
| Webhook address | `<APP_URL>/api/webhooks/razorpay` (shown in Settings › Payments) |
| Webhook events | `payment.captured`, `order.paid`, `payment.failed`, `refund.processed` |
| Needs approval | Live keys need Razorpay's business verification (KYC) |

How a payment works here: the server creates the Razorpay order from the stored order total, Checkout opens in the browser,
the browser sends back the payment proof, and the server checks its signature before marking the order paid. Razorpay's
webhook confirms it a second time. Repeated webhook deliveries are ignored. A failed attempt never undoes a paid one.
Refunds are sent to Razorpay from the order page; the webhook finishes them.

Test it: use test keys, buy something for ₹1 on a shop page (test UPI `success@razorpay`), and watch the order turn Paid.

### Paying each seller directly (Razorpay Route)

By default all online payments go to the one Razorpay account that owns the keys. To pay each seller to their own bank:

1. Ask Razorpay to enable **Route** on your account (it needs their approval).
2. Create a linked account for each seller in your Razorpay dashboard (their KYC and bank details are collected by Razorpay).
3. Set `RAZORPAY_ROUTE=1` and restart.
4. The seller pastes their linked account id (`acc_...`) in Settings › Payments. Stoora asks Razorpay for its status and
   sends money to it **only when the status is `activated`**. Until then payments go to your own account.

What is NOT built: creating linked accounts and collecting sellers' KYC from inside Stoora. That needs Razorpay's account
onboarding APIs and your approval, so it is done in the Razorpay dashboard. This part has not been run against a real Route account.

## Email (confirmation, password reset, new-order alerts)

| | |
| --- | --- |
| Provider | Resend (`EMAIL_PROVIDER=resend`) or any SMTP mailbox over TLS (`EMAIL_PROVIDER=smtp`) |
| Variables | `EMAIL_FROM` and `RESEND_API_KEY`, or `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` |
| Also accepted | `EMAIL_FROM_ADDRESS`, `EMAIL_PROVIDER_API_KEY`, `APP_BASE_URL` |
| Where to get them | resend.com › API keys, and Domains (verify the domain you send from) |
| Needs | A verified sending domain (DNS records at your domain provider) |

Links are single use. Confirmation links last 48 hours, reset links 1 hour. Without email configured, development mode
prints the link in the server window and confirms addresses automatically; **production mode prints nothing, confirms
nothing automatically, and the dashboard says email is not set up.**

## The assistant

| | |
| --- | --- |
| Provider | Anthropic Claude (Messages API with tool use) |
| Variables | `ANTHROPIC_API_KEY` (also `AI_PROVIDER_API_KEY`), optional `AI_MODEL` |
| Where to get it | console.anthropic.com › API keys |

The model never sees the database. It can only call six small functions (sales summary, orders needing attention, online
payments, top products, low stock, ratings), each of which reads the signed-in seller's own records. Cards and charts in
the answer are built from those functions' numbers, not from the model's words. The assistant can suggest and link to pages;
it cannot create orders, refund, or send messages. "Read a chat" turns pasted text into an editable draft that the seller must approve.
Without a key the same questions get a plain summary, labelled "The AI assistant is not connected".

## WhatsApp and Instagram chats

| | |
| --- | --- |
| Provider | Meta (WhatsApp Business Cloud API, Instagram messaging) through the Graph API |
| Variables | `META_APP_SECRET`, `META_VERIFY_TOKEN`, `WHATSAPP_TOKEN`, `INSTAGRAM_TOKEN` |
| Where to get them | developers.facebook.com/apps: app secret (Settings › Basic), access tokens (WhatsApp / Instagram product setup) |
| Webhook addresses | `<APP_URL>/api/webhooks/whatsapp` and `<APP_URL>/api/webhooks/instagram`; subscribe to `messages` |
| Per seller | WhatsApp Phone number ID or Instagram account id, pasted in Settings › Apps |
| Needs approval | Meta business verification and app review for the permissions, a WhatsApp business number, and an Instagram professional account linked to a Facebook page |

Incoming messages are checked against Meta's signature, stored once (duplicates are ignored), sorted by mood, and get a drafted
reply. Delivery status (sent, delivered, read) is stored for WhatsApp. Replies are sent from the dashboard.
This has been tested with simulated, correctly signed webhook bodies; it has not been run against a live Meta account.

## Sign in with Google

`GOOGLE_CLIENT_ID` from Google Cloud Console › APIs & Services › Credentials › OAuth client ID (Web). Add your site address
under "Authorised JavaScript origins". The button appears only when the variable is set.

## Required to go live

`APP_URL` (your https address), `COOKIE_SECURE=1`, `TRUST_PROXY=1` behind a proxy, `NODE_ENV=production`, a disk for the database.
See `DEPLOYMENT.md`.

## Premium storefront templates

Atelier Luxe, Heritage Craft and Signature Studio can be previewed free by every seller. Using one on a live store needs an entitlement.

- Configure `PREMIUM_PRICE_INR`, `PREMIUM_PURCHASES_ENABLED=1` and your Razorpay keys. With any of these missing the dashboard shows previews only and no price.
- The server creates the Razorpay order (`POST /api/storefront/premium/:id/order`), verifies the checkout signature (`POST /api/storefront/premium/verify`) and also accepts the `payment.captured` / `order.paid` webhook. Both paths are idempotent and write `template_entitlements`. The browser's success message grants nothing.
- Template purchases live in `template_purchases`, apart from buyers' `payments`.
- `PREMIUM_GRANT_EMAILS` gives named accounts access without paying.
- Saving or publishing a premium template without an entitlement is refused with 403.

## Storefront checkout and payments (all templates)

Every template sells the same way: the cart, product page, checkout, payment and order-status screens are one shared
module (`public/js/storefront/commerce.js`) talking to `/api/public/<shop>/...`. A template only changes how things look.

**What a buyer can do (no account needed):** open a product (sizes, stock, delivery and returns info), add to a bag that
is kept on their device (one bag per shop), change quantities, check out with name, phone, optional email and a
delivery address (services skip the address), pay online or pay the shop directly, see a success / pending / failed
page, retry a payment, and follow the order with "Where is my order?".

**Rules the server enforces:** prices, stock, sizes and the delivery fee always come from the database; stock is checked
and taken in one transaction; a repeated click or a reload gives back the same order (`requestId`); an order is never
"paid" because the browser said so.

### Who receives the money

| Server setting | What a seller needs | Where the money goes |
| --- | --- | --- |
| `RAZORPAY_ROUTE=1` | A Razorpay Route linked account (`acc_...`) that Razorpay has **activated** | Straight to the seller's linked account (the order carries a transfer to it) |
| `RAZORPAY_COLLECT_TO_PLATFORM=1` (no Route) | Nothing | Your own Razorpay account; you pay sellers out yourself |
| neither | Cannot take online payments | Not offered. Buyers can still order and pay the seller directly |

A seller's payment setup is shown in Settings › Payments as Not configured, Setup required, Pending verification,
Active or Temporarily unavailable. It only becomes Active from real facts (an activated linked account, or the operator's
explicit collect-for-sellers choice). The seller then chooses whether to accept online payments, and whether buyers may
pay them directly (with instructions the buyer reads). Direct-payment orders are never marked paid until the seller does it.

### Webhook (Razorpay Dashboard › Settings › Webhooks)

Address `<APP_URL>/api/webhooks/razorpay`, secret = `RAZORPAY_WEBHOOK_SECRET`. Subscribe to `payment.captured`,
`payment.failed`, `order.paid`, `refund.processed` and, with Route, the `account.*` events (so activation or suspension
updates a seller's status). Signatures are checked and each event is processed once.

### Payment states

Payment and fulfilment are kept apart on every order. Payment: awaiting payment, failed, to be arranged, paid, refunded.
Fulfilment: order received, confirmed, being prepared, shipped, delivered, cancelled. An online order nobody pays within
`ORDER_PAYMENT_HOLD_MINUTES` is cancelled and its stock released; if the payment arrives late the order is reopened. If a
webhook is late, the buyer's status check asks Razorpay directly whether the payment was captured.

### Before going live

1. Put live `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` in `.env`, and set `APP_URL`.
2. Choose the money model above (Route, or explicit platform collection). Do not guess.
3. Add the webhook in Razorpay and subscribe to the events listed.
4. Run a small test-mode purchase end to end (`success@razorpay` and `failure@razorpay` UPI ids) before switching to live keys.
