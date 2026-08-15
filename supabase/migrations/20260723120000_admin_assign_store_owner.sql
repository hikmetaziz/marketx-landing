-- MarktX admin-only store owner assignment.
-- First store can use claim flow; second/later stores are assigned by admin to an existing user_id.

begin;

create or replace function public.admin_assign_store_owner(
  p_store_id uuid,
  p_user_id uuid
)
returns table (membership_id uuid, assigned_user_id uuid, store_id uuid, role text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store public.stores%rowtype;
  v_profile public.profiles%rowtype;
  v_membership_id uuid;
begin
  if not public.is_admin() then
    raise exception 'admin_store_owner_assignment_denied';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_user_id;

  if v_profile.id is null then
    raise exception 'admin_store_owner_assignment_denied';
  end if;

  select *
  into v_store
  from public.stores
  where id = p_store_id
  for update;

  if v_store.id is null or v_store.status = 'suspended' then
    raise exception 'admin_store_owner_assignment_denied';
  end if;

  if v_store.owner_id is not null and v_store.owner_id <> p_user_id then
    raise exception 'store_owner_transfer_requires_replacement_flow';
  end if;

  if exists (
    select 1
    from public.store_members as sm
    where sm.store_id = p_store_id
      and sm.role = 'owner'
      and sm.user_id <> p_user_id
  ) then
    raise exception 'store_owner_transfer_requires_replacement_flow';
  end if;

  insert into public.store_members (store_id, user_id, role)
  values (p_store_id, p_user_id, 'owner')
  on conflict on constraint store_members_store_id_user_id_key
  do update set role = 'owner'
  returning id into v_membership_id;

  perform pg_catalog.set_config('marktx.store_rpc', 'on', true);
  update public.stores
  set owner_id = p_user_id,
      status = 'claimed'
  where id = p_store_id
    and (owner_id is null or owner_id = p_user_id);
  perform pg_catalog.set_config('marktx.store_rpc', '', true);

  if not found then
    raise exception 'store_owner_assignment_failed';
  end if;

  perform public.store_audit(
    p_store_id,
    'store_owner_admin_assigned',
    jsonb_build_object('assigned_user_id', p_user_id, 'membership_id', v_membership_id)
  );

  return query
  select v_membership_id, p_user_id, p_store_id, 'owner'::text;
end;
$$;

revoke all on function public.admin_assign_store_owner(uuid, uuid) from public, anon;
grant execute on function public.admin_assign_store_owner(uuid, uuid) to authenticated;

comment on function public.admin_assign_store_owner(uuid, uuid) is
  'Admin-only assignment of an existing user_id as store owner. Does not perform owner replacement.';

commit;
