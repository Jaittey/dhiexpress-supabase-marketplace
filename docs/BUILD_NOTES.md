# Build Notes

Converted from the previous Appwrite edition to Supabase:

- Appwrite SDK removed
- Supabase JS v2 browser client added
- Email/password, Google OAuth, reset password and email confirmation adapted
- PostgreSQL tables and RLS policies supplied in one SQL file
- Public and private Storage buckets supplied in SQL
- Transactional `create_marketplace_order` database function added
- Role-escalation protection trigger added
- Netlify configuration, headers and clean path rewrites added
- Local demo mode retained until Supabase credentials are entered

Admin Auth-user deletion and external payment verification remain optional server-side Edge Function tasks because they require private service credentials.
