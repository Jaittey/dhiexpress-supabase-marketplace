# Activate Google Login for DhiExpress

## 1. Supabase URL configuration

In Supabase open **Authentication → URL Configuration**.

Set:

- Site URL: `https://dhiexpress-marketplace.netlify.app`
- Redirect URL: `https://dhiexpress-marketplace.netlify.app/**`
- Redirect URL: `https://dhiexpress-marketplace.netlify.app/dashboard.html`

## 2. Enable Google provider

Open **Authentication → Providers → Google**. Copy the callback URL shown by Supabase. It should be similar to:

`https://ccppmnukjmihtxfwqpeq.supabase.co/auth/v1/callback`

Do not use the Netlify URL as Google's redirect URI.

## 3. Google Cloud OAuth client

In Google Cloud Console:

1. Create or choose the DhiExpress project.
2. Configure **Google Auth Platform → Branding**.
3. Under **Audience**, choose External and add `jaeitte@gmail.com` as a test user while the app is in testing mode.
4. Create a **Web application** OAuth client.
5. Authorized JavaScript origin:
   - `https://dhiexpress-marketplace.netlify.app`
6. Authorized redirect URI:
   - Paste the exact callback URL copied from Supabase.
7. Copy the Google Client ID and Client Secret.

## 4. Save credentials in Supabase

Return to **Supabase → Authentication → Providers → Google** and paste the Client ID and Client Secret. Enable Google and save. Never put the Google Client Secret in GitHub.

## 5. Deploy

Upload the updated project to GitHub. In Netlify use **Deploys → Trigger deploy → Clear cache and deploy site**. Then clear the old service worker/site data in the browser.

## 6. Test

Open:

`https://dhiexpress-marketplace.netlify.app/login.html`

Click **Continue with Google**. The expected flow is Google → Supabase callback → DhiExpress dashboard.

If Google shows `redirect_uri_mismatch`, compare the URI in Google Cloud with the exact callback URL displayed by Supabase.
