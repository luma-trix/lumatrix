# Install Nexa on Android and iOS

Nexa is now a Progressive Web App (PWA). It can be installed from a secure website without paying Google Play or Apple App Store developer fees.

## Requirements

- The app must be deployed using HTTPS. Free hosts provide HTTPS automatically.
- Camera and microphone access must be allowed for calls.
- The current build contains the installable interface and offline app shell. Internet messaging and real calls become active after the Supabase integration is connected.

## Android installation

### Google Chrome

1. Open the deployed Nexa website in Chrome.
2. Wait for the **Install Nexa** banner and tap **Install**.
3. If the banner is not visible, open Chrome's **⋮** menu.
4. Choose **Install app** or **Add to Home screen**.
5. Confirm **Install**.
6. Nexa will appear in the app drawer and on the home screen.

### Samsung Internet

1. Open the deployed Nexa website.
2. Open the browser menu.
3. Select **Add page to → Home screen**.
4. Confirm installation.

## iPhone and iPad installation

Apple does not show the same automatic install prompt. Use Safari:

1. Open the deployed Nexa website in **Safari**.
2. Tap the **Share** button — the square with an upward arrow.
3. Scroll and choose **Add to Home Screen**.
4. Keep the name **Nexa** and tap **Add**.
5. Launch Nexa using its new home-screen icon.

If **Add to Home Screen** is missing, scroll to the bottom of the Share sheet, select **Edit Actions**, and enable it. Do not use an embedded browser inside Instagram, Facebook, or another app.

## Allow camera, microphone, and notifications

### Android

1. Open Nexa and start a voice or video call.
2. Choose **Allow** when Chrome requests microphone/camera permission.
3. To change it later: Android **Settings → Apps → Nexa/Chrome → Permissions**.

### iPhone/iPad

1. Start a voice or video call in the installed app.
2. Tap **Allow** for microphone and camera.
3. To change permissions later: **Settings → Safari → Camera/Microphone**, or use the website settings in Safari.
4. Web push notifications on iOS require a home-screen-installed app and a supported iOS version. The user must grant permission after tapping a notification-enabling button.

## Free HTTPS deployment with Cloudflare Pages

1. Create a free account at **https://github.com**.
2. Create a repository named `nexa-chat`.
3. Upload the Nexa project files to that repository. Do not upload `node_modules`, `dist`, `.env`, or any secret keys.
4. Create a free account at **https://dash.cloudflare.com**.
5. Open **Workers & Pages → Create → Pages → Connect to Git**.
6. Select the `nexa-chat` repository.
7. Configure:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
8. Under environment variables, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
9. Select **Save and Deploy**.
10. Cloudflare supplies a free HTTPS address similar to `https://nexa-chat.pages.dev`.
11. Open that address on each phone and follow the installation steps above.

## Updating the installed app

When code changes are pushed to GitHub, Cloudflare rebuilds the site. Nexa's service worker checks for updates and installs a new version automatically. Closing and reopening the app activates the latest version.

## App-store publishing is optional

The PWA route does not require store fees. If you later want store listings:

- Android can be packaged as an APK/AAB, but Google Play registration may require a developer fee.
- Apple App Store distribution requires Apple's paid developer membership.
- The PWA remains installable without either store.

## Testing checklist

- [ ] Website opens using HTTPS
- [ ] Install icon and name appear correctly
- [ ] App opens without browser controls
- [ ] Existing app shell opens after temporarily disabling the network
- [ ] Registration and login work
- [ ] Messages appear on two different signed-in devices
- [ ] Camera and microphone prompts appear
- [ ] Voice and video connect on Wi-Fi and mobile data
- [ ] Upload size and anti-spam limits are enabled
