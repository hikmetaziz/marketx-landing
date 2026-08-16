-- Security hotfix: Restrict public_store_profiles view to read-only access
--
-- The public_store_profiles view should only allow SELECT operations for anonymous
-- and authenticated users. This migration explicitly revokes INSERT, UPDATE, and DELETE
-- privileges to prevent unauthorized write access to store profile data.
--
-- SELECT is already granted by existing migrations (FIX_STORES_ANON_SELECT_EXPOSURE.sql).
-- This migration ensures that only SELECT remains available; all write operations are revoked.

begin;

-- Revoke INSERT privilege from public_store_profiles
revoke insert on public.public_store_profiles from anon, authenticated;

-- Revoke UPDATE privilege from public_store_profiles
revoke update on public.public_store_profiles from anon, authenticated;

-- Revoke DELETE privilege from public_store_profiles
revoke delete on public.public_store_profiles from anon, authenticated;

commit;
