# Nexa V5 update

## 1. Run the V5 Supabase migration

In Supabase Dashboard, open **SQL Editor → New query**, copy all of `supabase/v5_features.sql`, paste it, and choose **Run**.

Expected result:

```text
Success. No rows returned
```

This migration adds:

- 24-hour photo, video, audio, and text status updates
- Private status-media storage
- iPhone audio MIME support
- Video and audio attachments
- Disappearing-message timers for 24 hours, 7 days, or 90 days
- Server-side protection that prevents expired messages from being read

## 2. Deploy V5

Upload `nexa-chat-deploy-v5.zip` as a new production deployment in Netlify.

## 3. Force the PWA update on iPhone

1. Remove the currently installed Nexa icon from the Home Screen.
2. Open the Netlify URL in Safari.
3. In Safari website settings, clear website data for the Nexa Netlify domain if the old interface remains.
4. Reload the website twice.
5. Use **Share → Add to Home Screen** again.

V5 uses `viewport-fit=cover`, safe-area insets, larger header controls, and 16px inputs to prevent automatic iPhone zoom and inaccessible controls around the notch and Home indicator.
