# Luma email confirmation and password recovery

## Supabase settings

1. Open **Supabase → Authentication → Providers → Email**.
2. Keep **Email provider** enabled.
3. Enable **Confirm email**.
4. Save.

## URL configuration

Open **Authentication → URL Configuration** and set:

- **Site URL:** your current public Netlify URL
- **Redirect URLs:** your public URL followed by `/**`

Example:

```text
https://your-luma-site.netlify.app
https://your-luma-site.netlify.app/**
```

Also add a custom-domain URL later if you connect one.

## Email templates

In **Authentication → Email Templates**:

- Keep **Confirm signup** enabled and ensure it contains the confirmation URL variable supplied by Supabase.
- Keep **Reset password / Change Email Address** enabled and ensure it contains the recovery URL variable supplied by Supabase.
- Change visible wording and sender branding to Luma if desired.

Do not replace Supabase's confirmation or recovery template variable with a fixed URL.

## Test confirmation

1. Register with a new email address.
2. Luma displays a confirmation-sent message.
3. Open the email and select the confirmation link.
4. Return to Luma and sign in.
5. If the email is missing, check spam or use **Resend confirmation email**.

## Test password recovery

1. On the sign-in screen, tap **Forgot password?**.
2. Enter the account email.
3. Open the reset email.
4. Select its secure link.
5. Luma opens the **Choose a new password** screen.
6. Enter and confirm a password of at least eight characters.
7. After updating, sign in with the new password.
