# Nexa: free internet messaging setup

This setup uses Supabase's free tier for accounts, database, realtime signalling, and media storage. Text messaging and peer-to-peer WebRTC calls can be launched without paying to create the app.

> Never share your Supabase account password or `service_role` secret. The Project URL and publishable/anon key are intended for use by the web client.

## 1. Create the free backend

1. Open **https://supabase.com**.
2. Choose **Start your project** and create an account.
3. Select **New project**.
4. Create or select an organisation on the Free plan.
5. Enter:
   - Project name: `nexa-chat`
   - A strong database password — save it privately.
   - A region close to the first users.
6. Confirm project creation and wait until the project dashboard opens.

## 2. Keep email login enabled

1. In the project dashboard, open **Authentication**.
2. Open **Providers** (sometimes shown as Sign In / Providers).
3. Confirm **Email** is enabled.
4. For testing, you may turn off **Confirm email**. Turn it back on before a public launch.
5. Do not enable phone/SMS login: SMS verification is not reliably free.

## 3. Copy only the public connection values

1. Open **Project Settings → API**, or use the project's **Connect** button.
2. Copy:
   - **Project URL** — looks like `https://xxxxx.supabase.co`
   - **Publishable key** or legacy **anon public key**
3. Do **not** copy or share the `service_role` key.

These will be placed in a local `.env` file like this:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
```

The `.env` file must not be committed to a public repository, even though these client values are public. Database security will be enforced using Row Level Security policies.

## 4. Calls without per-minute app fees

Nexa will use **WebRTC**:

- Audio/video travels directly between users where possible.
- Supabase Realtime carries only call offers, answers, and ICE candidates.
- A public STUN server helps devices discover a connection path.
- No call recordings are stored by default.

This means ordinary peer-to-peer calls do not have a per-minute provider fee. Some restrictive mobile networks, offices, and carrier-grade NAT connections require a **TURN relay**. A reliable TURN server consumes bandwidth and cannot be guaranteed permanently free at unlimited scale. Nexa can initially use STUN-only calls, clearly reporting when a connection cannot be established.

## 5. Free deployment later

The web client can be deployed on a free static-hosting tier such as **Cloudflare Pages**, **Vercel**, or **Netlify**. Add the same two environment variables in the host's project settings.

## 6. What remains free and what has limits

The app can be free to download and use, with no paid features. The initial infrastructure can cost zero, but free providers impose quotas for database size, storage, bandwidth, realtime connections, builds, and inactivity. A growing public service cannot honestly promise unlimited hosting at zero operating cost forever.

To minimise usage:

- Compress images and videos before upload.
- Limit attachment sizes.
- Automatically expire status media.
- Use peer-to-peer calls.
- Store message thumbnails separately.
- Add sensible anti-spam and upload-rate limits.

## Next action

After creating the Supabase project, provide only the **Project URL** and **publishable/anon key**. Do not provide the database password or `service_role` key. The next implementation step is to add:

1. Email registration and login
2. User profiles and contacts
3. Realtime direct/group messaging
4. Uploads and message receipts
5. WebRTC voice/video call signalling
6. Presence and typing indicators
7. Row Level Security policies
