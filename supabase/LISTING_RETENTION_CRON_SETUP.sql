-- SUPERSEDED / DO NOT RUN.
-- MarktX now keeps deleted listings as database history and does not hard-delete them.
-- See supabase/LISTING_DELETED_HISTORY_NO_PURGE.sql.
--
-- Previous draft: daily listing retention cleanup cron.
-- Do not run this file until the Edge Function is deployed and dry-run output is reviewed.
-- Secrets are referenced from Supabase Vault; do not paste secret values into this file.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;
create extension if not exists supabase_vault with schema vault;

-- One-time secret setup, run manually with your real values:
--
-- select vault.create_secret(
--   'https://<project-ref>.functions.supabase.co/listing-retention-cleanup',
--   'listing_retention_cleanup_url'
-- );
--
-- select vault.create_secret(
--   '<strong-random-cleanup-secret>',
--   'listing_retention_cleanup_secret'
-- );
--
-- Also set the same secret for the Edge Function:
-- supabase secrets set LISTING_CLEANUP_SECRET=<strong-random-cleanup-secret>

-- Dry-run invocation for SQL Editor review. This does not delete files or rows.
select net.http_post(
  url := (
    select decrypted_secret
    from vault.decrypted_secrets
    where name = 'listing_retention_cleanup_url'
  ),
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'listing_retention_cleanup_secret'
    )
  ),
  body := jsonb_build_object('dryRun', true, 'limit', 50)
) as dry_run_request_id;

-- Enable only after dry-run review.
-- Preferred schedule: 03:00 UTC daily.
--
-- select cron.unschedule('marktx-listing-retention-cleanup');
--
-- select cron.schedule(
--   'marktx-listing-retention-cleanup',
--   '0 3 * * *',
--   $$
--   select net.http_post(
--     url := (
--       select decrypted_secret
--       from vault.decrypted_secrets
--       where name = 'listing_retention_cleanup_url'
--     ),
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || (
--         select decrypted_secret
--         from vault.decrypted_secrets
--         where name = 'listing_retention_cleanup_secret'
--       )
--     ),
--     body := jsonb_build_object('dryRun', false, 'limit', 50)
--   );
--   $$
-- );
