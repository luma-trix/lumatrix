# Luma embedded LiveKit conference setup

Luma V17 removes Jitsi and uses an embedded LiveKit client. Calls will display a configuration message until the steps below are completed.

## 1. Create a LiveKit Cloud project

1. Open https://cloud.livekit.io and create an account.
2. Create a project named `Luma`.
3. The current LiveKit Cloud interface does not ask you to choose a region. Cloud projects use LiveKit's global mesh and connect each participant to a nearby edge automatically.
4. Open the new project, then go to **Settings → Keys**.
5. Copy the project's WebSocket URL, which starts with `wss://`.
6. Create an API key and secret.

For 100+ concurrent participants, review LiveKit's current capacity and paid usage limits. A free testing allowance does not guarantee this scale.

## 2. Add Supabase Edge Function secrets

In Supabase, open **Edge Functions → Secrets** and add:

```text
LIVEKIT_URL=wss://YOUR-LIVEKIT-HOST
LIVEKIT_API_KEY=YOUR_API_KEY
LIVEKIT_API_SECRET=YOUR_API_SECRET
```

The API secret must exist only in Supabase Edge Function secrets. Never put it in Netlify, frontend source code, a browser environment variable, or chat.

## 3. Deploy the token function

1. Open **Supabase → Edge Functions**.
2. Select **Deploy a new function → Via Editor**.
3. Name it exactly:

```text
livekit-token
```

4. Replace the template with all content from:

```text
supabase/functions/livekit-token/index.ts
```

5. Deploy it with JWT verification enabled.

The token function verifies that the signed-in user is invited to the conference before issuing a two-hour room token.

## 4. Run the conference SQL

Run all of:

```text
supabase/v16_conference_rooms.sql
```

in the Supabase SQL Editor.

## 5. Deploy Luma V17

Upload `luma-chat-deploy-v17.zip` to Netlify.

## What V17 supports

- Fully embedded LiveKit rooms without Jitsi
- Group and ad-hoc conferences
- Add-participant control during direct calls
- Realtime invitation banners
- Pending invitations for users who reopen Luma later
- Camera, microphone, screen sharing, mute, and leave controls
- Adaptive stream and dynacast
- Active-speaker highlighting
- Per-participant network-strength bars
- Pagination for large conferences

## PWA background-calling limitation

A browser PWA cannot provide the same incoming-call behavior as a native WhatsApp application on iPhone:

- If Luma is open, foreground realtime invitations can appear immediately.
- A home-screen PWA can receive ordinary web push on supported systems after permission is granted, but iOS controls notification sound and requires the user to tap the notification.
- A PWA cannot use iOS CallKit, VoIP push, or display a native full-screen incoming-call screen while another app is active.
- If the phone has no internet connection, no service can make it ring immediately. A notification can only arrive after connectivity returns.

Native CallKit/Android Telecom behavior requires separate native iOS and Android applications, APNs/FCM configuration, and developer accounts.
