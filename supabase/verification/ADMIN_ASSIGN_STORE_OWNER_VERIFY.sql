-- Verify admin-only store owner assignment RPC.
-- Read-only: inspects function metadata, grants, and duplicate/role guards.

with rpc as (
  select
    p.oid,
    p.prosecdef,
    p.proacl,
    p.proowner,
    pg_get_functiondef(p.oid) as definition
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'admin_assign_store_owner'
    and pg_get_function_identity_arguments(p.oid) = 'p_store_id uuid, p_user_id uuid'
),
store_member_unique_constraint as (
  select true as exists_ok
  from pg_constraint as con
  join pg_class as rel on rel.oid = con.conrelid
  join pg_namespace as n on n.oid = rel.relnamespace
  where n.nspname = 'public'
    and rel.relname = 'store_members'
    and con.conname = 'store_members_store_id_user_id_key'
    and con.contype = 'u'
),
single_owner_index as (
  select
    i.indisunique,
    pg_get_expr(i.indpred, i.indrelid) as predicate
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  join pg_index as i on i.indexrelid = c.oid
  where n.nspname = 'public'
    and c.relname = 'store_members_single_owner_idx'
),
checks as (
  select 'rpc_exists' as check_name, exists (select 1 from rpc) as passed
  union all
  select 'rpc_is_security_definer', exists (select 1 from rpc where prosecdef)
  union all
  select 'rpc_search_path_empty', exists (
    select 1 from rpc where definition ilike '%SET search_path TO ''''%'
  )
  union all
  select 'rpc_admin_only_guard', exists (
    select 1 from rpc where definition ilike '%if not public.is_admin() then%'
  )
  union all
  select 'rpc_assigns_by_user_id_not_phone', exists (
    select 1 from rpc
    where definition ilike '%p_user_id uuid%'
      and definition not ilike '%p_phone%'
      and definition not ilike '%submitted_phone%'
  )
  union all
  select 'rpc_requires_existing_profile', exists (
    select 1 from rpc
    where definition ilike '%from public.profiles%'
      and definition ilike '%where id = p_user_id%'
  )
  union all
  select 'rpc_locks_exact_store', exists (
    select 1 from rpc
    where definition ilike '%from public.stores%'
      and definition ilike '%where id = p_store_id%'
      and definition ilike '%for update%'
  )
  union all
  select 'rpc_blocks_replacement_flow', exists (
    select 1 from rpc
    where definition ilike '%store_owner_transfer_requires_replacement_flow%'
      and definition ilike '%sm.role = ''owner''%'
      and definition ilike '%sm.user_id <> p_user_id%'
  )
  union all
  select 'rpc_upserts_owner_role_only', exists (
    select 1 from rpc
    where definition ilike '%insert into public.store_members%'
      and definition ilike '%values (p_store_id, p_user_id, ''owner'')%'
      and definition ilike '%on conflict on constraint store_members_store_id_user_id_key%'
      and definition ilike '%do update set role = ''owner''%'
      and definition not ilike '%''manager''%'
      and definition not ilike '%''staff''%'
  )
  union all
  select 'rpc_sets_claimed_store_owner', exists (
    select 1 from rpc
    where definition ilike '%update public.stores%'
      and definition ilike '%owner_id = p_user_id%'
      and definition ilike '%status = ''claimed''%'
  )
  union all
  select 'anon_cannot_execute_rpc', not has_function_privilege(
    'anon',
    'public.admin_assign_store_owner(uuid, uuid)',
    'execute'
  )
  union all
  select 'public_cannot_execute_rpc', not exists (
    select 1
    from rpc
    cross join aclexplode(coalesce(rpc.proacl, acldefault('f', rpc.proowner))) as acl
    where acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  )
  union all
  select 'authenticated_can_execute_rpc_with_internal_admin_guard', has_function_privilege(
    'authenticated',
    'public.admin_assign_store_owner(uuid, uuid)',
    'execute'
  )
  union all
  select 'same_user_store_duplicate_prevented', exists (
    select 1 from store_member_unique_constraint
  )
  union all
  select 'single_owner_per_store_index_exists', exists (
    select 1 from single_owner_index
    where indisunique
      and lower(predicate) like '%role = ''owner''%'
  )
)
select check_name, passed
from checks
order by check_name;

do $$
declare
  failures text;
begin
  with rpc as (
    select
      p.oid,
      p.prosecdef,
      p.proacl,
      p.proowner,
      pg_get_functiondef(p.oid) as definition
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'admin_assign_store_owner'
      and pg_get_function_identity_arguments(p.oid) = 'p_store_id uuid, p_user_id uuid'
  ),
  store_member_unique_constraint as (
    select true as exists_ok
    from pg_constraint as con
    join pg_class as rel on rel.oid = con.conrelid
    join pg_namespace as n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'store_members'
      and con.conname = 'store_members_store_id_user_id_key'
      and con.contype = 'u'
  ),
  single_owner_index as (
    select
      i.indisunique,
      pg_get_expr(i.indpred, i.indrelid) as predicate
    from pg_class as c
    join pg_namespace as n on n.oid = c.relnamespace
    join pg_index as i on i.indexrelid = c.oid
    where n.nspname = 'public'
      and c.relname = 'store_members_single_owner_idx'
  ),
  checks as (
    select 'rpc_exists' as check_name, exists (select 1 from rpc) as passed
    union all
    select 'rpc_is_security_definer', exists (select 1 from rpc where prosecdef)
    union all
    select 'rpc_search_path_empty', exists (
      select 1 from rpc where definition ilike '%SET search_path TO ''''%'
    )
    union all
    select 'rpc_admin_only_guard', exists (
      select 1 from rpc where definition ilike '%if not public.is_admin() then%'
    )
    union all
    select 'rpc_assigns_by_user_id_not_phone', exists (
      select 1 from rpc
      where definition ilike '%p_user_id uuid%'
        and definition not ilike '%p_phone%'
        and definition not ilike '%submitted_phone%'
    )
    union all
    select 'rpc_requires_existing_profile', exists (
      select 1 from rpc
      where definition ilike '%from public.profiles%'
        and definition ilike '%where id = p_user_id%'
    )
    union all
    select 'rpc_locks_exact_store', exists (
      select 1 from rpc
      where definition ilike '%from public.stores%'
        and definition ilike '%where id = p_store_id%'
        and definition ilike '%for update%'
    )
    union all
    select 'rpc_blocks_replacement_flow', exists (
      select 1 from rpc
      where definition ilike '%store_owner_transfer_requires_replacement_flow%'
        and definition ilike '%sm.role = ''owner''%'
        and definition ilike '%sm.user_id <> p_user_id%'
    )
    union all
    select 'rpc_upserts_owner_role_only', exists (
      select 1 from rpc
      where definition ilike '%insert into public.store_members%'
        and definition ilike '%values (p_store_id, p_user_id, ''owner'')%'
        and definition ilike '%on conflict on constraint store_members_store_id_user_id_key%'
        and definition ilike '%do update set role = ''owner''%'
        and definition not ilike '%''manager''%'
        and definition not ilike '%''staff''%'
    )
    union all
    select 'rpc_sets_claimed_store_owner', exists (
      select 1 from rpc
      where definition ilike '%update public.stores%'
        and definition ilike '%owner_id = p_user_id%'
        and definition ilike '%status = ''claimed''%'
    )
    union all
    select 'anon_cannot_execute_rpc', not has_function_privilege(
      'anon',
      'public.admin_assign_store_owner(uuid, uuid)',
      'execute'
    )
    union all
    select 'public_cannot_execute_rpc', not exists (
      select 1
      from rpc
      cross join aclexplode(coalesce(rpc.proacl, acldefault('f', rpc.proowner))) as acl
      where acl.grantee = 0
        and acl.privilege_type = 'EXECUTE'
    )
    union all
    select 'authenticated_can_execute_rpc_with_internal_admin_guard', has_function_privilege(
      'authenticated',
      'public.admin_assign_store_owner(uuid, uuid)',
      'execute'
    )
    union all
    select 'same_user_store_duplicate_prevented', exists (
      select 1 from store_member_unique_constraint
    )
    union all
    select 'single_owner_per_store_index_exists', exists (
      select 1 from single_owner_index
      where indisunique
        and lower(predicate) like '%role = ''owner''%'
    )
  )
  select string_agg(check_name, ', ' order by check_name)
  into failures
  from checks
  where not passed;

  if failures is not null then
    raise exception 'admin_assign_store_owner_verification_failed: %', failures;
  end if;
end $$;

begin;

create temporary table marktx_admin_assign_runtime (
  check_name text primary key,
  ok boolean not null,
  detail text
) on commit drop;

do $$
declare
  v_admin uuid;
  v_moderator uuid;
  v_ordinary uuid;
  v_target uuid;
  v_other_owner uuid;
  v_store uuid;
  v_owned_store uuid;
  v_listing_count_before bigint;
  v_listing_count_after bigint;
  v_member_count integer;
  v_sqlerrm text;
begin
  select p.id into v_admin
  from public.profiles as p
  where p.role = 'admin'
  order by p.created_at nulls last, p.id
  limit 1;

  select p.id into v_moderator
  from public.profiles as p
  where p.role = 'moderator'
  order by p.created_at nulls last, p.id
  limit 1;

  select p.id into v_ordinary
  from public.profiles as p
  where coalesce(p.role, 'user') = 'user'
  order by p.created_at nulls last, p.id
  limit 1;

  select p.id into v_target
  from public.profiles as p
  where p.id is distinct from v_ordinary
    and coalesce(p.role, 'user') = 'user'
  order by p.created_at nulls last, p.id
  limit 1;

  select p.id into v_other_owner
  from public.profiles as p
  where p.id not in (v_ordinary, v_target)
    and coalesce(p.role, 'user') = 'user'
  order by p.created_at nulls last, p.id
  limit 1;

  if v_admin is null or v_moderator is null or v_ordinary is null or v_target is null or v_other_owner is null then
    insert into marktx_admin_assign_runtime
    values ('fixture_availability', false, 'missing admin/moderator/ordinary/target/other_owner fixtures');
    return;
  end if;

  perform set_config('marktx.store_rpc', 'on', true);
  insert into public.stores (name, slug, status)
  values (
    'Admin Assign Verify Store',
    'admin-assign-verify-' || left(replace(gen_random_uuid()::text, '-', ''), 10),
    'unclaimed'
  )
  returning id into v_store;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  insert into public.listings (user_id, store_id, title, price, category, city, condition, status)
  values (v_target, v_store, 'Assign Verify Listing', 100, 'Test', 'Bakı', 'Yeni', 'pending');
  select count(*) into v_listing_count_before from public.listings where store_id = v_store;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  perform public.admin_assign_store_owner(v_store, v_target);
  perform public.admin_assign_store_owner(v_store, v_target);
  reset role;

  select count(*) into v_member_count
  from public.store_members
  where store_id = v_store
    and user_id = v_target
    and role = 'owner';

  select count(*) into v_listing_count_after from public.listings where store_id = v_store;

  insert into marktx_admin_assign_runtime
  values ('admin_allowed', v_member_count = 1, 'owner_rows=' || v_member_count);
  insert into marktx_admin_assign_runtime
  values ('same_user_store_idempotent', v_member_count = 1, 'duplicate rpc left one owner row');
  insert into marktx_admin_assign_runtime
  values ('listings_unchanged', v_listing_count_after = v_listing_count_before, 'before=' || v_listing_count_before || ',after=' || v_listing_count_after);

  begin
    perform set_config('request.jwt.claim.sub', v_ordinary::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    set local role authenticated;
    perform public.admin_assign_store_owner(v_store, v_ordinary);
    reset role;
    insert into marktx_admin_assign_runtime values ('ordinary_user_denied', false, 'rpc unexpectedly succeeded');
  exception
    when others then
      get stacked diagnostics v_sqlerrm = message_text;
      reset role;
      insert into marktx_admin_assign_runtime
      values ('ordinary_user_denied', v_sqlerrm like '%admin_store_owner_assignment_denied%', v_sqlerrm);
  end;

  begin
    perform set_config('request.jwt.claim.sub', v_moderator::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    set local role authenticated;
    perform public.admin_assign_store_owner(v_store, v_ordinary);
    reset role;
    insert into marktx_admin_assign_runtime values ('moderator_denied', false, 'rpc unexpectedly succeeded');
  exception
    when others then
      get stacked diagnostics v_sqlerrm = message_text;
      reset role;
      insert into marktx_admin_assign_runtime
      values ('moderator_denied', v_sqlerrm like '%admin_store_owner_assignment_denied%', v_sqlerrm);
  end;

  insert into public.stores (name, slug, status, owner_id)
  values (
    'Admin Assign Protected Owner Store',
    'admin-assign-protected-' || left(replace(gen_random_uuid()::text, '-', ''), 10),
    'claimed',
    v_other_owner
  )
  returning id into v_owned_store;

  insert into public.store_members (store_id, user_id, role)
  values (v_owned_store, v_other_owner, 'owner')
  on conflict on constraint store_members_store_id_user_id_key do update set role = excluded.role;

  begin
    perform set_config('request.jwt.claim.sub', v_admin::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    set local role authenticated;
    perform public.admin_assign_store_owner(v_owned_store, v_target);
    reset role;
    insert into marktx_admin_assign_runtime
    values ('different_existing_owner_protected', false, 'replacement rpc unexpectedly succeeded');
  exception
    when others then
      get stacked diagnostics v_sqlerrm = message_text;
      reset role;
      insert into marktx_admin_assign_runtime
      values (
        'different_existing_owner_protected',
        v_sqlerrm like '%store_owner_transfer_requires_replacement_flow%',
        v_sqlerrm
      );
  end;
end $$;

do $$
declare
  failures text;
begin
  select string_agg(check_name, ', ' order by check_name)
  into failures
  from marktx_admin_assign_runtime
  where not ok;

  if failures is not null then
    raise exception 'admin_assign_store_owner_runtime_failed: %', failures;
  end if;
end $$;

rollback;
