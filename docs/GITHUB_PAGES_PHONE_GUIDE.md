# Deploy Luma to GitHub Pages from a phone

Prepared for:

- GitHub username: `everydaydrama8364-netizen`
- Repository: `luma-trix`
- Final address: `https://everydaydrama8364-netizen.github.io/luma-trix/`

## 1. Create the repository

1. Open https://github.com/new in Chrome or Safari.
2. Set **Repository name** to `luma-trix`.
3. Choose **Public**.
4. Enable **Add a README file**.
5. Tap **Create repository**.

## 2. Extract the prepared ZIP

Download `luma-trix-github-pages.zip`, then extract it in the phone's Files application. Do not upload the ZIP itself to the repository because GitHub Pages does not extract it.

The extracted folder contains 16 deployable files. The paths are already configured for `/luma-trix/`.

## 3. Upload root files

In the GitHub repository:

1. Tap **Add file → Upload files**.
2. Select these files from the extracted folder:
   - `404.html`
   - `favicon.svg`
   - `icons.svg`
   - `index.html`
   - `manifest.webmanifest`
   - `registerSW.js`
   - `sw.js`
   - `workbox-9c191d2f.js`
3. Commit directly to `main`.

Create `.nojekyll` separately if the phone file picker hides it:

1. Tap **Add file → Create new file**.
2. Enter `.nojekyll` as the filename.
3. Leave the file empty and commit it.

## 4. Create and fill the assets folder

1. Tap **Add file → Create new file**.
2. Enter `assets/.keep` as the filename and commit.
3. Open the new `assets` folder.
4. Tap **Add file → Upload files**.
5. Upload all three files from the extracted `assets` folder:
   - `LiveKitConference-DO6M_yAk.js`
   - `index-BefTQL0n.js`
   - `index-sMrEtsON.css`
6. Commit.

The hashed filenames must remain unchanged.

## 5. Create and fill the icons folder

1. Return to the repository root.
2. Create `icons/.keep` and commit it.
3. Open the `icons` folder.
4. Upload:
   - `apple-touch-icon.png`
   - `icon-192.png`
   - `icon-512.png`
   - `icon-maskable-512.png`
5. Commit.

## 6. Enable GitHub Pages

1. Open repository **Settings**.
2. Select **Pages** under Code and automation.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Branch: `main`.
5. Folder: `/ (root)`.
6. Tap **Save**.
7. Wait 2–10 minutes.

Open:

```text
https://everydaydrama8364-netizen.github.io/luma-trix/
```

## 7. Update Supabase authentication URLs

In **Supabase → Authentication → URL Configuration** set:

Site URL:

```text
https://everydaydrama8364-netizen.github.io/luma-trix/
```

Add this Redirect URL:

```text
https://everydaydrama8364-netizen.github.io/luma-trix/**
```

This GitHub-specific build has corrected confirmation and password-reset paths for the `/luma-trix/` subfolder.

## 8. Install Luma

On iPhone, open the GitHub Pages address in Safari and choose **Share → Add to Home Screen**.

On Android, open it in Chrome and choose **Install app**.
