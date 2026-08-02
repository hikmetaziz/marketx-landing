-- Manual rollback for 20260722120000_listing_store_membership_update_alignment.sql.
-- Restores pre-alignment UPDATE policies; removes store-member SELECT helper policy.

begin;

drop policy if exists "listings_select_store_member" on public.listings;
drop policy if exists "listings_update_personal_owner" on public.listings;
drop policy if exists "listings_update_store_owner_manager" on public.listings;
drop policy if exists "listings_update_store_staff_nonarchive" on public.listings;

create policy "listings_update_owner"
  on public.listings for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "listings_update_store_member"
  on public.listings for update to authenticated
  using (
    store_id is not null
    and exists (
      select 1
      from public.store_members as m
      where m.store_id = listings.store_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  )
  with check (
    store_id is not null
    and exists (
      select 1
      from public.store_members as m
      where m.store_id = listings.store_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  );

commit;
