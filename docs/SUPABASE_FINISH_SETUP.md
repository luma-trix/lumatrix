# Finish connecting the Nexa Supabase project

The supplied Project URL and publishable key have been connected locally. The key was correctly recognised by Supabase Auth. Complete the database setup below from your phone.

## 1. Run the database schema

1. Open **https://supabase.com/dashboard** in Chrome or Safari.
2. Open your `nexa-chat` project.
3. Open the left menu and select **SQL Editor**.
4. Tap **New query**.
5. Open the project file `supabase/schema.sql` and copy all of its contents.
6. Paste it into the Supabase SQL Editor.
7. Tap **Run**.
8. Wait for **Success. No rows returned**.

Run this schema only once. It creates profiles, conversations, members, messages, reactions, calls, call signalling, realtime configuration, a private media bucket, and Row Level Security policies.

## 2. Check email authentication

1. Open **Authentication → Providers**.
2. Select **Email**.
3. Confirm that email/password login is enabled.
4. During testing, you may disable **Confirm email**.
5. Before public launch, enable email confirmation to reduce fake accounts.

## 3. Configure website URLs

After deploying to Cloudflare Pages:

1. Open **Authentication → URL Configuration**.
2. Set **Site URL** to your deployed HTTPS address, for example:
   `https://nexa-chat.pages.dev`
3. Add these **Redirect URLs**:
   - `https://nexa-chat.pages.dev/**`
   - Your final custom domain followed by `/**`, if you add one later.
4. Save.

For local development, also add:

```text
http://localhost:5173/**
```

## 4. Set Cloudflare environment variables

The Nexa project uses Vite, so the required names begin with `VITE_`, not `NEXT_PUBLIC_`.

In Cloudflare Pages, open **Settings → Environment variables** and add:

```text
VITE_SUPABASE_URL=<your Supabase Project URL>
VITE_SUPABASE_ANON_KEY=<your Supabase publishable key>
```

Add them to both **Production** and **Preview**, then redeploy.

## 5. Test registration

1. Open Nexa.
2. Choose **Create an account**.
3. Enter a display name, email, and password of at least six characters.
4. If email confirmation is enabled, open the confirmation email.
5. Sign in.
6. Open Supabase **Table Editor → profiles** and confirm that the new profile exists.

## Security reminders

- The publishable key is a browser key; Row Level Security protects the data.
- Never put a `service_role` or secret key in the web application.
- Never disable Row Level Security on messaging tables.
- Do not post the database password publicly.
