-- =====================================================================
-- FIX: stores base-table anonymous SELECT exposure
-- Audit finding M1 (2026-07-13)
--
-- PROBLEM:
--   Policy "stores_select_public" (STORES_AND_CLAIM_FLOW.sql) grants
--   `anon` direct SELECT on public.stores for public statuses. This
--   exposes owner_id, created_by, status and other base columns to
--   anonymous clients, bypassing the sanitized public_store_profiles view.
--
--   Reproduced with the anon key:
--     GET /rest/v1/stores?select=* -> HTTP 200, returns owner_id, created_by, status
--
-- GOAL:
--   Anonymous users must NOT read owner_id / created_by / non-public
--   statuses from the base table. Public store data must be served ONLY
--   through public.public_store_profiles (sanitized; excludes owner_id,
--   created_by, status; hides 'suspended').
--
-- SAFETY:
--   * Authenticated owners / admins keep base-table access (unchanged).
--   * public.public_store_profiles is SECURITY DEFINER, so it keeps
--     working for anon AFTER the base-table anon grant is revoked.
--     >>> Do NOT switch that view to SECURITY INVOKER while anon lacks
--         base-table SELECT, or the public view will break for anon. <<<
--
-- STATUS: PREPARED FOR REVIEW — DO NOT APPLY BLINDLY.
--   Before applying, confirm no client path reads public.stores directly
--   as an anonymous (logged-out) user. Verified during audit: web/mobile
--   public store pages use public_store_profiles.
-- =====================================================================

begin;

-- 1) Restrict the SELECT policy to authenticated owner/admin only.
--    (Removes `anon` from the policy roles.)
drop policy if exists "stores_select_public" on public.stores;

create policy "stores_select_owner_admin"
  on public.stores
  for select
  to authenticated
  using (
    (auth.uid() is not null and auth.uid() = owner_id)
    or public.is_admin()
    or exists (
      select 1
      from public.store_members m
      where m.store_id = public.stores.id
        and m.user_id = auth.uid()
    )
  );

-- 2) Revoke the base-table SELECT grant from anon (PostgREST requires the
--    table privilege AND a passing policy; revoking the grant is the hard stop).
revoke select on public.stores from anon;

-- 3) Ensure the sanitized public view remains readable by anon.
grant select on public.public_store_profiles to anon, authenticated;

commit;

-- =====================================================================
-- VERIFICATION (run as anon key AFTER apply):
--   GET /rest/v1/stores?select=*            -> expect 401/permission denied or 0 rows
--   GET /rest/v1/public_store_profiles?...  -> expect sanitized rows (no owner_id)
--
-- ROLLBACK:
--   begin;
--   drop policy if exists "stores_select_owner_admin" on public.stores;
--   create policy "stores_select_public"
--     on public.stores for select to anon, authenticated
--     using (
--       status in ('unclaimed', 'claim_pending', 'claimed')
--       or (auth.uid() is not null and auth.uid() = owner_id)
--     );
--   grant select on public.stores to anon;
--   commit;
-- =====================================================================
