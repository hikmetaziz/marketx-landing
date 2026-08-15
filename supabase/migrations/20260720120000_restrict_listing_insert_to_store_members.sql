-- MarktX listing creation access hardening.
-- Direct authenticated client inserts must be tied to an approved store access row.

begin;

drop policy if exists "listings_insert_own" on public.listings;
drop policy if exists "listings_insert_store_member" on public.listings;

create policy "listings_insert_store_member"
  on public.listings for insert to authenticated
  with check (
    auth.uid() = user_id
    and store_id is not null
    and exists (
      select 1
      from public.stores as s
      where s.id = listings.store_id
        and s.status = 'claimed'
    )
    and exists (
      select 1
      from public.store_members as m
      where m.store_id = listings.store_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'staff')
    )
  );

comment on policy "listings_insert_store_member" on public.listings is
  'Allows listing creation only for the authenticated row owner with active claimed-store membership.';

commit;
