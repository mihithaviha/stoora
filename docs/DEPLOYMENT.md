# Putting Stoora on the internet

Stoora is one Node program (Node 22.5 or newer) plus one SQLite database file. There is no separate frontend build:
the server serves the website from `public/`. Nothing here has been deployed yet; these are the steps to do it.

## 1. Choose where to run it

Any host that runs Node or Docker and gives you a **persistent disk** for `data/`:

- **Render**: connect the repository, use `render.yaml` (Docker, a 1 GB disk, health check `/api/ready`).
- **Railway, Fly.io, a VPS**: run the `Dockerfile`, or `npm start`; mount a volume at `/app/data` (or set `DB_PATH`).

Do not use a host with a disk that is wiped on every deploy (that is where the database lives).

## 2. Domain and https

1. Point your domain (for example `stoora.in`) at the host (a CNAME or A record, as the host tells you).
2. Turn on https (Render, Railway and Fly do this for you; on a VPS use Caddy or nginx with Let's Encrypt).
3. Set these in the host's environment:

```
NODE_ENV=production
APP_URL=https://stoora.in
COOKIE_SECURE=1
TRUST_PROXY=1
```

`COOKIE_SECURE=1` makes the login cookie https-only and switches on the HSTS header. `TRUST_PROXY=1` lets rate limits
use the real visitor address behind the host's proxy. Without `APP_URL`, emails and webhook addresses would say `localhost`.

## 3. Add the secret keys

Add each key from `.env.example` in the host's **Environment** screen (never in the code or in Git).
`docs/INTEGRATIONS.md` says where to get each one.

## 4. Webhooks (only after https works)

Razorpay cannot reach `localhost`. Once the site is live:

| Service | Address | Where |
| --- | --- | --- |
| Razorpay | `https://stoora.in/api/webhooks/razorpay` | Dashboard › Account & Settings › Webhooks |

The exact addresses are also shown in the dashboard (Settings › Payments and Settings › Apps).

## 5. Check it

- `https://stoora.in/api/ready` returns `{"ok":true,"schema":3}` (database reachable, migrations applied).
- Sign up with a new email: you should receive the confirmation email.
- Razorpay in test mode: buy something for ₹1 on a shop page; the order turns Paid.
- Then switch to live keys.

## What the server already does for production

- **Migrations:** the database is upgraded automatically on start, one numbered step at a time (`server/migrations.js`). Existing data is kept.
- **Logging:** one JSON line per request (method, path, status, milliseconds). No query strings, bodies, cookies, tokens or reset links are logged.
- **Errors:** the browser gets a plain message; details stay in the server log.
- **CORS:** none is enabled and none is needed. The site and the API share one address, and requests from other sites are refused.
- **Security headers:** `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and HSTS over https.
- **Health checks:** `/api/health` (is it running) and `/api/ready` (is the database ready).
- **Shutdown:** on a stop signal the server finishes open requests first.

## Uploaded images (storefront builder)

Sellers' storefront images are saved as files in `data/uploads/<seller>/` (next to the database), not inside the database.
Keep that folder on the same persistent disk as `data/stoora.db`, and include it in backups. Each file has a random name and is
served with long browser caching. If you later move to cloud storage (S3, Cloudflare R2), replace `saveImage` and `uploadFile` in
`server/storefront.js`; nothing else needs to change.

## Backups

The database is the single file `data/stoora.db` (plus `-wal` and `-shm` files while running). Back it up with the host's disk
snapshots, or copy it with `sqlite3 data/stoora.db ".backup backup.db"`. Keep backups private: they hold your sellers' data.

## Moving to a bigger database later

The code talks to SQLite through `server/db.js` only. If you outgrow one file, that is the one module to port (for example to PostgreSQL);
the migrations already give you a numbered list of schema changes to translate.
