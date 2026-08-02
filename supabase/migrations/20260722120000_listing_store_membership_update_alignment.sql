-- MarktX listing UPDATE/SELECT authorization alignment to exact store_members roles.
-- Personal listings stay creator-owned; store listings use membership, not stores.owner_id alone.

begin;

drop policy if exists "listings_select_store_member" on public.listings;
create policy "listings_select_store_member"
  on public.listings for select to authenticated
  using (
    store_id is not null
    and exists (
      select 1
      from public.store_members as m
      where m.store_id = listings.store_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'staff')
    )
  );

drop policy if exists "listings_update_owner" on public.listings;
drop policy if exists "listings_update_personal_owner" on public.listings;
create policy "listings_update_personal_owner"
  on public.listings for update to authenticated
  using (
    store_id is null
    and auth.uid() = user_id
  )
  with check (
    store_id is null
    and auth.uid() = user_id
  );

drop policy if exists "listings_update_store_member" on public.listings;
drop policy if exists "listings_update_store_owner_manager" on public.listings;
create policy "listings_update_store_owner_manager"
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

drop policy if exists "listings_update_store_staff_nonarchive" on public.listings;
create policy "listings_update_store_staff_nonarchive"
  on public.listings for update to authenticated
  using (
    store_id is not null
    and status::text not in ('deleted', 'archived', 'sold')
    and exists (
      select 1
      from public.store_members as m
      where m.store_id = listings.store_id
        and m.user_id = auth.uid()
        and m.role = 'staff'
    )
  )
  with check (
    store_id is not null
    and status::text not in ('deleted', 'archived', 'sold')
    and exists (
      select 1
      from public.store_members as m
      where m.store_id = listings.store_id
        and m.user_id = auth.uid()
        and m.role = 'staff'
    )
  );

comment on policy "listings_select_store_member" on public.listings is
  'Store members with owner/manager/staff roles can read exact-store listings for edit screens.';
comment on policy "listings_update_personal_owner" on public.listings is
  'Personal listings remain editable only by their creator.';
comment on policy "listings_update_store_owner_manager" on public.listings is
  'Store owner/manager can edit and archive exact-store listings.';
comment on policy "listings_update_store_staff_nonarchive" on public.listings is
  'Store staff can edit exact-store listings but cannot move rows into archive/delete terminal states.';

commit;
