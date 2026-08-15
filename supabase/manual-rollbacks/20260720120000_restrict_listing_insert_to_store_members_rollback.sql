-- Manual rollback for 20260720120000_restrict_listing_insert_to_store_members.sql.
-- This restores the previous broad authenticated owner insert policy.
-- Run only if the targeted store-member insert policy must be reverted.

begin;

drop policy if exists "listings_insert_store_member" on public.listings;
drop policy if exists "listings_insert_own" on public.listings;

create policy "listings_insert_own"
  on public.listings for insert to authenticated
  with check (auth.uid() = user_id);

comment on policy "listings_insert_own" on public.listings is
  'Rollback: legacy broad owner insert policy restored.';

commit;
