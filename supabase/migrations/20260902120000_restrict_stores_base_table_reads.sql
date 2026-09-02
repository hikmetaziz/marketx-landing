-- Keep public store discovery on the sanitized view while restricting the
-- stores base table to authenticated users with a legitimate relationship.

begin;

drop policy if exists "stores_select_public" on public.stores;
drop policy if exists "stores_select_owner_admin" on public.stores;

create policy "stores_select_owner_admin"
  on public.stores
  for select
  to authenticated
  using (
    public.is_admin()
    or owner_id = auth.uid()
    or exists (
      select 1
      from public.store_members as member
      where member.store_id = public.stores.id
        and member.user_id = auth.uid()
        and member.role in ('owner', 'manager', 'staff')
    )
  );

revoke select on public.stores from public, anon;
grant select on public.stores to authenticated, service_role;

grant select on public.public_store_profiles to anon, authenticated;

commit;
