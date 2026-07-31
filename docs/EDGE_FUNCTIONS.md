# Optional Production Edge Functions

The included database RPC securely creates orders and reduces stock. Add Supabase Edge Functions later for operations requiring private secrets or Admin Auth API access:

- Delete or ban an Auth user
- Verify payment-provider webhooks
- Send transactional email through an external provider
- Process refunds
- Run scheduled membership expiry and abandoned-upload cleanup

Store `SUPABASE_SERVICE_ROLE_KEY`, payment secrets and email secrets only as Edge Function secrets. Never expose them in frontend files.
