# Luma

**A self-hostable, realtime messaging PWA — built with React 19, TypeScript, Supabase and LiveKit.**

Luma is a complete, production-grade reference implementation of a realtime chat application: direct and group messaging, ephemeral Moments, media handling, polls, peer-to-peer WebRTC calls and multi-party LiveKit conferences — all as an installable, offline-capable Progressive Web App.

The full source, Postgres schema, row-level-security policies and Supabase Edge Functions are published here. Nothing is hidden behind a hosted service: clone it, point it at your own Supabase project, and run it.

**Live demo:** https://everydaydrama8364-netizen.github.io/lumatrix/

---

## Why this repository exists

Most chat tutorials stop at "insert a row, subscribe to a channel". The hard parts of a real messaging app — multi-tenant row-level security, presence, media authorisation, token issuance for an SFU, GDPR-grade account deletion — are usually left as an exercise, or hidden inside a paid SDK.

Luma publishes all of it. It is intended as a working, readable reference for patterns that are otherwise poorly documented:

| Problem | How Luma solves it | Where to look |
|---|---|---|
| Multi-tenant chat security without recursive RLS | `SECURITY DEFINER` helper functions (`is_conversation_member`, `is_conversation_admin`) used as policy predicates, avoiding infinite policy recursion on join tables | [`supabase/schema.sql`](supabase/schema.sql) |
| Issuing SFU tokens without leaking API secrets | A JWT-verified Deno Edge Function validates conference membership and room expiry server-side before minting a scoped, 2-hour LiveKit token | [`supabase/functions/livekit-token/index.ts`](supabase/functions/livekit-token/index.ts) |
| WebRTC signalling with no signalling server | Offer/answer/ICE candidates exchanged as rows in `call_signals` over Supabase Realtime | [`src/RealtimeApp.tsx`](src/RealtimeApp.tsx) |
| Genuine account deletion | Edge Function purges owned objects via the Storage API, runs a `prepare_my_account_deletion` RPC, then removes the auth user with a service-role client | [`supabase/functions/delete-account/index.ts`](supabase/functions/delete-account/index.ts) |
| Private media in a public-ish app | Per-bucket storage policies plus signed URLs for downloads | [`supabase/schema.sql`](supabase/schema.sql) |
| Offline app shell + installability | `vite-plugin-pwa` / Workbox with a navigation fallback and runtime font caching | [`vite.config.ts`](vite.config.ts) |
| Disappearing messages | Postgres-side expiry via `set_disappearing_messages` + `clean_expired_messages` | [`supabase/v7_features.sql`](supabase/v7_features.sql) |

If you are building anything realtime on Supabase, the SQL in this repo is probably the most useful part.

---

## Stack

- **React 19** + **TypeScript** + **Vite 8**
- **Supabase** — Auth, Postgres, Realtime, Storage, RLS, Edge Functions (Deno)
- **LiveKit** — multi-party audio/video conferences (lazy-loaded into a separate chunk)
- **vite-plugin-pwa / Workbox** — service worker, offline shell, installability
- **Phosphor Icons** — duotone icon system

No CSS framework and no component library — the interface is hand-written CSS (`src/realtime.css`), with 12 responsive breakpoints and full iOS safe-area handling.

---

## Features

**Messaging** — realtime direct, group and channel conversations · replies, edits, forwards, copy, delete-for-me / delete-for-everyone · emoji reactions · starred messages · saved and custom stickers · typing presence · pinned, archived and read/unread states · configurable left/right swipe actions · disappearing messages

**Media** — images, video, audio, documents and archives · in-app image rotate/crop/filters · captions and rename · voice messages with pause/resume · location sharing · signed-URL downloads

**Moments (status)** — text, image, video and audio · styles, scheduling and expiration · selected audiences · view counts, reactions and private replies

**Calls** — peer-to-peer WebRTC direct calls · embedded LiveKit group conferences · upgrade a direct call to a conference with a participant picker · pending invitations · per-participant network-strength indicators · pagination for large conferences

**Polls** — up to 12 options · quiz mode with explanations · multiple answers · anonymous voting · closing and result-visibility controls

**Personalisation** — light/dark modes · 8 themes · general and per-chat wallpapers · text size and font-style preferences

**Account** — email registration with confirmation, resend, and password reset · profile pictures · full account deletion

---

## Architecture

```
src/
  main.tsx                 entry
  AuthGate.tsx             login / signup / password reset; renders RealtimeApp once authenticated
  RealtimeApp.tsx          the application shell — conversations, messages, composer, calls, conferences
  RealtimeFeatures.tsx     EmojiPicker · SettingsPanel · UpdatesPanel · ChatInfoPanel
                           MediaEditor · GroupModal · PollMessage · MediaMessage
  LiveKitConference.tsx    lazy-loaded conference UI (separate ~498 kB chunk)
  Brand.tsx  icons.tsx     Luma mark and icon layer
  lib/supabase.ts          typed Supabase client
  realtime.css             application styling, 12 breakpoints, iOS safe areas

supabase/
  schema.sql               base tables, RLS policies, helper functions, storage buckets
  v5…v18_*.sql             ordered migrations
  functions/               Deno Edge Functions
```

**Data model** — 17 tables: `profiles`, `conversations`, `conversation_members`, `messages`, `message_reactions`, `message_hidden`, `starred_messages`, `poll_votes`, `status_updates`, `status_views`, `status_reactions`, `status_replies`, `status_audience`, `call_sessions`, `call_signals`, `conference_rooms`, `conference_participants`.

**Storage buckets** — `chat-media`, `profile-media`, `status-media`.

---

## Running locally

```bash
git clone https://github.com/everydaydrama8364-netizen/lumatrix.git
cd lumatrix
npm install
cp .env.example .env.local     # then fill in your own Supabase project values
npm run dev
```

### Environment variables

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase publishable (anon) key |
| `BASE_PATH` | Build-time only. `/` for root or custom-domain hosting, `/lumatrix/` for a GitHub Pages project sub-path. Defaults to `/`. |

> **On the committed `.env.production`:** it contains the demo deployment's Supabase URL and *publishable* anon key. These are browser-side values by design — they are already visible in any built bundle and are protected by row-level security. The service-role key, LiveKit API secret and database password are **not** in this repository and must never be.

---

## Self-hosting

### 1. Database

Run the SQL files against a fresh Supabase project **in this order**:

1. `schema.sql`
2. `v5_features.sql`
3. `v6_features.sql`
4. `v7_features.sql`
5. `v8_features.sql`
6. `v9_features.sql`
7. `v12_account_deletion_fixed.sql`
8. `v15_poll_upgrade.sql`
9. `v16_conference_rooms.sql`
10. `v18_conference_invite_fix.sql`

`v12_account_deletion.sql` is superseded by the `_fixed` version — do not run it. `v6_complete_update.sql` is a consolidated alternative to `v6_features.sql`. `fix_membership_policy.sql` is only needed on older schemas lacking the corrected conversation-view policy.

### 2. Edge Functions

```bash
supabase functions deploy delete-account
supabase functions deploy livekit-token
```

Both must be deployed **with JWT verification enabled**. Set these function secrets for `livekit-token`:

```
LIVEKIT_URL
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
```

### 3. Auth URLs

In Supabase → Authentication → URL Configuration, set your Site URL and add `https://your-domain/**` as a redirect URL, or email confirmation and password reset will fail.

---

## Deployment

A GitHub Actions workflow ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) builds and publishes to GitHub Pages on every push to `main`.

Set the repository variable **`BASE_PATH`** (Settings → Secrets and variables → Actions → Variables):

- `/lumatrix/` — serving from `username.github.io/lumatrix/`
- `/` — serving from a custom domain or a root Pages repo

Because the site is published by a workflow rather than from a branch, a `CNAME` file is **not** honoured. Configure a custom domain through Settings → Pages instead.

---

## Additional guides

Step-by-step setup notes live in [`docs/`](docs): Supabase completion, email auth, account deletion, LiveKit/PWA configuration, GitHub Pages hosting and mobile installation.

---

## Known platform limitations

Stated plainly, because they are properties of the web platform rather than bugs:

- A PWA **cannot** replicate native iOS CallKit/VoIP push behaviour while another app is in the foreground.
- A device with no network connection cannot be rung instantly.
- WhatsApp-style background calling requires native iOS/Android apps with APNs/FCM, CallKit / Android Telecom and supporting infrastructure.
- Conferences beyond roughly 100 participants require LiveKit Cloud capacity or a scaled self-hosted SFU. No provider offers this free and unlimited.

---

## Licence

[MIT](LICENSE)
