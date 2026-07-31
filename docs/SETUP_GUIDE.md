# Complete Setup Guide

## Part A — Supabase

### 1. Create the project

1. Sign in at Supabase and choose **New project**.
2. Select an organization.
3. Name the project `DhiExpress Marketplace`.
4. Create and safely save a strong database password.
5. Choose the nearest available region.
6. Create the project and wait for the dashboard to finish provisioning.

### 2. Create the complete backend

1. Open **SQL Editor**.
2. Choose **New query**.
3. Open `supabase/schema.sql` from this project.
4. Copy the entire file into the SQL Editor.
5. Select **Run**.

This creates profiles, sellers, products, orders, order items, reviews, messages, notifications, complaints, payments, memberships, settings, storage buckets, RLS policies, seed categories, seed plans, and the secure checkout database function.

### 3. Copy the public connection values

1. Open **Project Settings → API** or **Connect**.
2. Copy the **Project URL**.
3. Copy the browser-safe **anon** or **publishable** key.
4. Open `assets/js/config.js`.
5. Replace:

```js
url: "https://YOUR_PROJECT_REF.supabase.co",
anonKey: "YOUR_SUPABASE_ANON_KEY"
```

Never copy the `service_role` key into this file.

### 4. Configure authentication URLs

Initially set:

- Site URL: `http://localhost:5500`
- Redirect URL: `http://localhost:5500/**`

After Netlify deployment, replace or add:

- Site URL: `https://YOUR-SITE-NAME.netlify.app`
- Redirect URL: `https://YOUR-SITE-NAME.netlify.app/**`

The wildcard lets email confirmation, password recovery and Google OAuth return to the correct HTML page.

### 5. Email authentication

Open **Authentication → Providers → Email** and keep Email enabled. For testing, you may disable email confirmation temporarily. For production, enable confirmation and configure an SMTP provider before inviting many users.

### 6. Google login

1. In Google Cloud, create or select a project.
2. Configure the OAuth consent screen.
3. Create a Web application OAuth client.
4. In Supabase, open **Authentication → Providers → Google**.
5. Copy the callback URL shown by Supabase.
6. Add that exact URL to Google’s Authorized redirect URIs.
7. Copy the Google Client ID and Client Secret into the Supabase Google provider settings.
8. Enable and save the provider.

Do not put the Google Client Secret in GitHub.

### 7. Create the first admin

1. Deploy the site or run it locally.
2. Sign up with the intended administrator email.
3. In Supabase, open **Table Editor → profiles**.
4. Find that user and change `role` from `user` to `admin`.
5. Keep `status` as `active`.
6. Sign out and sign back in.

Only admin profiles pass the database `is_admin()` check.

### 8. Approve a seller

1. A user submits the seller form.
2. Open `seller_applications` in Table Editor.
3. Review the information and change the application status to `approved`.
4. Open `profiles` and set:
   - `role = seller`
   - `seller_status = approved`
   - `plan_id = bronze`, `silver`, or `gold`
5. Add or update the seller’s row in `seller_profiles` with `status = approved`.

### 9. Product approval

Seller-created products start as `pending`. An administrator opens the product row and changes `status` to `approved`. Public users can only read approved products because of RLS.

## Part B — GitHub

### 10. Create the repository

1. Create a new public or private GitHub repository named `dhiexpress-supabase-marketplace`.
2. Do not initialize it with another README when using the web uploader.
3. Extract the ZIP.
4. Upload every file inside the extracted folder—not the outer folder itself.
5. Confirm `index.html`, `assets`, `supabase`, `netlify.toml` and `_redirects` are in the repository root.
6. Commit the upload.

GitHub stores the source. Netlify hosts the website.

## Part C — Netlify

### 11. Deploy from GitHub

1. Sign in to Netlify using GitHub.
2. Select **Add new project → Import an existing project**.
3. Select GitHub and choose the repository.
4. Use:
   - Production branch: `main`
   - Base directory: blank
   - Build command: blank
   - Publish directory: `.`
5. Deploy the project.

`netlify.toml` already contains the static publishing and security header settings.

### 12. Choose the Netlify site name

Open **Project configuration → General → Project details** and change the generated name, for example `dhiexpress-marketplace`. The URL becomes `https://dhiexpress-marketplace.netlify.app` when available.

### 13. Return to Supabase URL Configuration

Add the exact Netlify address:

- Site URL: `https://dhiexpress-marketplace.netlify.app`
- Redirect URL: `https://dhiexpress-marketplace.netlify.app/**`

Save, then test signup, email confirmation, Google login and password recovery again.

## Part D — Testing order

Test in this sequence:

1. Home page loads without red console errors.
2. Signup creates a user in Authentication and a row in `profiles`.
3. Email/password login and logout work.
4. Password recovery opens `reset-password.html` and accepts a new password.
5. Google login returns to `dashboard.html`.
6. Categories and plans load.
7. Seller application creates a row.
8. Approved seller uploads an image and creates a pending product.
9. Admin approves the product.
10. Product becomes publicly visible.
11. Cart and wishlist synchronize after login.
12. Checkout creates an order and order items, recalculates prices, and reduces stock.
13. Buyer and seller can see permitted order data.
14. Messages and notifications work.
15. Non-admin users cannot open protected admin data.

## Common errors

### Preview mode remains visible
The URL or anon key in `assets/js/config.js` still contains placeholder text.

### `new row violates row-level security policy`
The user is not approved for that operation, a row owner ID is wrong, or the SQL schema was not completely executed.

### Signup works but no profile exists
Re-run the `handle_new_user` trigger section of `schema.sql`, then create the profile manually for an already-existing Auth user.

### Product image upload fails
Confirm the user is signed in, the file is JPEG/PNG/WebP, is below 5 MB, and the upload path starts with the current user ID. The included code already follows this path format.

### OAuth redirects to localhost or an error page
Correct **Authentication → URL Configuration** and ensure the exact Netlify URL is listed.

### Netlify shows Page not found
Confirm `index.html` is in the publish root and Publish directory is `.`. The included `_redirects` file provides clean aliases for common pages.

### Old JavaScript remains cached
Open browser developer tools, unregister the service worker, clear site data, and reload. Increase the cache version in `sw.js` after major releases.

## Production items still recommended

Before accepting real payments, add a Supabase Edge Function or verified payment-provider webhook for payment confirmation. Auth-user deletion also requires server-side code using a service-role secret; the frontend intentionally does not include that secret.
