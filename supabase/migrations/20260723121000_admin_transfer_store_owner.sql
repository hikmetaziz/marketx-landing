-- MarktX admin-only store ownership transfer.
-- Transfers one canonical owner to another existing user without touching listings.

begin;

create or replace function public.admin_transfer_store_owner(
  p_store_id uuid,
  p_new_user_id uuid
)
returns table (
  store_id uuid,
  old_owner_id uuid,
  new_owner_id uuid,
  new_membership_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store public.stores%rowtype;
  v_new_profile public.profiles%rowtype;
  v_old_owner_id uuid;
  v_existing_owner_id uuid;
  v_new_membership_id uuid;
  v_listing_count_before bigint;
  v_listing_count_after bigint;
begin
  if not public.is_admin() then
    raise exception 'admin_store_owner_transfer_denied';
  end if;

  select *
  into v_new_profile
  from public.profiles
  where id = p_new_user_id;

  if v_new_profile.id is null then
    raise exception 'admin_store_owner_transfer_denied';
  end if;

  select *
  into v_store
  from public.stores
  where id = p_store_id
  for update;

  if v_store.id is null or v_store.status = 'suspended' then
    raise exception 'admin_store_owner_transfer_denied';
  end if;

  select sm.user_id
  into v_existing_owner_id
  from public.store_members as sm
  where sm.store_id = p_store_id
    and sm.role = 'owner'
  limit 1
  for update;

  v_old_owner_id := coalesce(v_store.owner_id, v_existing_owner_id);

  if v_old_owner_id is null then
    raise exception 'store_owner_assignment_required_before_transfer';
  end if;

  if v_old_owner_id = p_new_user_id then
    raise exception 'store_owner_transfer_requires_different_user';
  end if;

  select count(*)
  into v_listing_count_before
  from public.listings as l
  where l.store_id = p_store_id;

  delete from public.store_members as sm
  where sm.store_id = p_store_id
    and sm.role = 'owner'
    and sm.user_id <> p_new_user_id;

  insert into public.store_members (store_id, user_id, role)
  values (p_store_id, p_new_user_id, 'owner')
  on conflict on constraint store_members_store_id_user_id_key
  do update set role = 'owner'
  returning id into v_new_membership_id;

  perform pg_catalog.set_config('marktx.store_rpc', 'on', true);
  update public.stores
  set owner_id = p_new_user_id,
      status = 'claimed'
  where id = p_store_id;
  perform pg_catalog.set_config('marktx.store_rpc', '', true);

  select count(*)
  into v_listing_count_after
  from public.listings as l
  where l.store_id = p_store_id;

  if v_listing_count_after <> v_listing_count_before then
    raise exception 'store_owner_transfer_listing_integrity_failed';
  end if;

  perform public.store_audit(
    p_store_id,
    'store_owner_admin_transferred',
    jsonb_build_object(
      'old_owner_id', v_old_owner_id,
      'new_owner_id', p_new_user_id,
      'new_membership_id', v_new_membership_id,
      'listing_count', v_listing_count_after
    )
  );

  return query
  select p_store_id, v_old_owner_id, p_new_user_id, v_new_membership_id;
end;
$$;

revoke all on function public.admin_transfer_store_owner(uuid, uuid) from public, anon;
grant execute on function public.admin_transfer_store_owner(uuid, uuid) to authenticated;

comment on function public.admin_transfer_store_owner(uuid, uuid) is
  'Admin-only atomic transfer of the canonical store owner. Listings remain linked by store_id.';

commit;
