# Luma account deletion — corrected setup

The earlier database-only approach was replaced because Supabase requires files to be deleted through the Storage API. The corrected implementation uses a protected Supabase Edge Function.

## Step 1 — run the corrected SQL

Open `supabase/v12_account_deletion_fixed.sql`, copy all of it, and run it in **Supabase → SQL Editor → New query**.

Expected result:

```text
Success. No rows returned
```

This removes the old function and installs `prepare_my_account_deletion`, which safely transfers group ownership before deletion.

## Step 2 — deploy the Edge Function from your phone

1. In Supabase, open **Edge Functions**.
2. Tap **Deploy a new function**.
3. Choose **Via Editor**.
4. Enter the function name exactly as:

```text
delete-account
```

5. Choose a blank function or replace the template code.
6. Open `supabase/functions/delete-account/index.ts` and copy all of it into the editor.
7. Tap **Deploy function**.
8. Keep JWT verification enabled. Do not make the function public.

Supabase automatically provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` inside its hosted Edge Function. Do not paste or expose the service-role key in Luma or Netlify.

## Step 3 — deploy the corrected app

Upload `luma-chat-deploy-v12-corrected.zip` to Netlify as a new production deployment.

## What happens after confirmation

The Edge Function:

1. Verifies the signed-in user's access token.
2. Accepts only the exact confirmation `DELETE`.
3. Finds the user's conversation media folders.
4. Removes profile pictures, Moment media, documents, videos, voice notes, and other uploads through the supported Supabase Storage API.
5. Transfers groups to another participant and removes empty conversations.
6. Permanently deletes the Supabase Auth user.
7. Database cascades remove profiles, messages, calls, reactions, votes, memberships, Moments, and saved records.
8. Luma clears the local session and returns to the sign-in screen.

The server function never accepts a target user ID, so a signed-in user can only delete their own account.
