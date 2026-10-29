# Stoora — seller dashboard (frontend)

Next.js 14 (App Router) + TypeScript. Brand Kit v2 styling lives in `src/app/globals.css`.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Production check: `npm run typecheck && npm run build && npm start`.

## Open in VS Code

1. Unzip `stoora.zip`, then **File › Open Folder…** and pick the `stoora` folder.
2. Open the terminal (**View › Terminal**) and run `npm install`, then `npm run dev`.
3. Open http://localhost:3000.

Needs Node.js 18.17 or newer.

## What is real and what is demo

| Part | Status |
|---|---|
| Every page, form, filter, search (Ctrl K), dialog, toast, undo | Working |
| Data | **Demo adapter**: a sample shop ("Meera Studio") in `src/lib/demo-data.ts`, saved in this browser's localStorage. Every page shows a "Demo shop" note. Reset it under Account. |
| Ask Stoora (assistant) | Calls `/api/assistant`. With no API key, it gives labelled **demo answers** worked out from the shop's numbers. |
| Create order with AI | Calls `/api/extract-order` (pasted chat, .txt export or screenshots). With no key it says **not connected** and offers a labelled example draft. The AI only makes a draft; nothing is added until you approve it. |
| Call recordings | Not supported. Speech-to-text isn't connected, and the page says so. |
| Sending WhatsApp / Instagram messages | Not connected. Replies are copied for you to send yourself, then you can log them as sent by you. Nothing claims a message was sent. |
| Payments | Never marked paid automatically. You confirm "Mark as paid" yourself. |
| Sign in | Not connected. The login page fails honestly. "Open the demo shop" is the only way in. |

## Turning on the AI

Create `.env.local` (never commit it):

```
ANTHROPIC_API_KEY=your-key
ANTHROPIC_MODEL=claude-sonnet-5-5
```

Restart `npm run dev`. The key is only read on the server (`src/lib/anthropic.ts`, `import 'server-only'`). Never give it a `NEXT_PUBLIC_` prefix.

## Connecting the real backend

All writes go through `src/lib/store.tsx`. The `API_TODO` list at the top names the endpoints the backend must provide. Swap each store function for the matching call. The two API routes have production notes too: build the shop data and catalog on the server from the signed-in seller's own records, so one seller never sees another's data.

## Layout

```
src/app/                 pages (one folder per route) + api/assistant, api/extract-order
src/components/          AppShell, Assistant, ui (buttons, badges, cards, dialogs, charts…), ChatsView…
src/lib/                 types, demo-data, store (demo adapter), derive, assistant, order-draft, anthropic
```
