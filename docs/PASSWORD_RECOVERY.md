# AMO AI — password recovery setup

## Current root cause

An account exists in Supabase Auth, but regular password sign-in returned
invalid_credentials. Supabase logged a recovery email and email-link sign-in;
those events do NOT prove the account password was updated.

## Configure Supabase once

Open Supabase > Authentication > URL Configuration:
https://supabase.com/dashboard/project/ebcizvddyjdemefvfbit/auth/url-configuration

- Set the Site URL to https://amoaica.vercel.app
- Allow redirect URL https://amoaica.vercel.app/auth/callback**
  (includes ?next=/reset-password and Supabase PKCE query params).
- For local development, also allow http://localhost:3001/auth/callback**
  if you need to test recovery links locally.
- Keep the reset email template's standard ConfirmationURL link, so that
  Supabase verifies the one-time token before redirecting to our callback.
- Avoid wildcard redirect URLs for unknown domains.

## Test

1. Go to https://amoaica.vercel.app/sign-in
2. Click Forgot password?
3. Enter test@amoai.ca and request a reset email.
4. Open the NEWEST email; previous or pre-fetched links may be expired.
5. The recovery link should go through /auth/callback and land on
   /reset-password with an authenticated session.
6. Choose a new password (12+ chars), submit, then sign in with that password.
7. Verify Super Admin app_metadata remains set, and the app loads.
8. Check expired-link and mismatch-password errors do not expose secrets.

Never reset auth.users.encrypted_password directly with SQL.
Use Supabase Auth's updateUser() or admin.updateUserById() API.
Changing the password must not remove existing app_metadata or the user ID.

NOTE: Automated smoke checks do not send reset mail or mutate user passwords.
They only verify pages, redirects, and unauthorized API access.
