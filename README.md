# DhiExpress — Netlify + GitHub + Supabase

A static, mobile-friendly B2C/C2C marketplace frontend connected to Supabase Auth, PostgreSQL, Storage and Row Level Security, designed for automatic Netlify deployment from GitHub.

## Start here

1. Read `docs/SETUP_GUIDE.md`.
2. Create a free Supabase project.
3. Run `supabase/schema.sql` in the Supabase SQL Editor.
4. Copy the Supabase Project URL and anon/publishable key into `assets/js/config.js`.
5. Upload the folder contents to a new GitHub repository.
6. Import the repository into Netlify and deploy the repository root.
7. Add the Netlify URL to Supabase Authentication URL Configuration.

## Important security rule

The browser may contain the Supabase URL and anon/publishable key. Never place the `service_role` key in GitHub or frontend JavaScript.

## Preview mode

Until `assets/js/config.js` is configured, the app opens with local sample data for interface testing.
