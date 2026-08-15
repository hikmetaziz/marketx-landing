-- Verify admin-only store ownership transfer RPC.
-- Read-only: inspects function metadata, grants, owner-switch guards, listing integrity and audit behavior.

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
    and p.proname = 'admin_transfer_store_owner'
    and pg_get_function_identity_arguments(p.oid) = 'p_store_id uuid, p_new_user_id uuid'
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
  select 'rpc_uses_new_user_id_not_phone', exists (
    select 1 from rpc
    where definition ilike '%p_new_user_id uuid%'
      and definition not ilike '%p_phone%'
      and definition not ilike '%submitted_phone%'
  )
  union all
  select 'rpc_requires_existing_new_profile', exists (
    select 1 from rpc
    where definition ilike '%from public.profiles%'
      and definition ilike '%where id = p_new_user_id%'
  )
  union all
  select 'rpc_locks_exact_store', exists (
    select 1 from rpc
    where definition ilike '%from public.stores%'
      and definition ilike '%where id = p_store_id%'
      and definition ilike '%for update%'
  )
  union all
  select 'rpc_locks_existing_owner_membership', exists (
    select 1 from rpc
    where definition ilike '%from public.store_members as sm%'
      and definition ilike '%sm.store_id = p_store_id%'
      and definition ilike '%sm.role = ''owner''%'
      and definition ilike '%for update%'
  )
  union all
  select 'rpc_requires_existing_old_owner', exists (
    select 1 from rpc
    where definition ilike '%store_owner_assignment_required_before_transfer%'
  )
  union all
  select 'rpc_requires_different_new_owner', exists (
    select 1 from rpc
    where definition ilike '%store_owner_transfer_requires_different_user%'
  )
  union all
  select 'rpc_removes_old_owner_access', exists (
    select 1 from rpc
    where definition ilike '%delete from public.store_members as sm%'
      and definition ilike '%sm.store_id = p_store_id%'
      and definition ilike '%sm.role = ''owner''%'
      and definition ilike '%sm.user_id <> p_new_user_id%'
  )
  union all
  select 'rpc_upserts_new_owner_membership', exists (
    select 1 from rpc
    where definition ilike '%insert into public.store_members%'
      and definition ilike '%values (p_store_id, p_new_user_id, ''owner'')%'
      and definition ilike '%on conflict on constraint store_members_store_id_user_id_key%'
      and definition ilike '%do update set role = ''owner''%'
  )
  union all
  select 'rpc_updates_canonical_owner_id', exists (
    select 1 from rpc
    where definition ilike '%update public.stores%'
      and definition ilike '%owner_id = p_new_user_id%'
      and definition ilike '%status = ''claimed''%'
  )
  union all
  select 'rpc_checks_listing_count_unchanged', exists (
    select 1 from rpc
    where definition ilike '%v_listing_count_before%'
      and definition ilike '%v_listing_count_after%'
      and definition ilike '%from public.listings as l%'
      and definition ilike '%l.store_id = p_store_id%'
      and definition ilike '%store_owner_transfer_listing_integrity_failed%'
      and definition not ilike '%update public.listings%'
      and definition not ilike '%delete from public.listings%'
  )
  union all
  select 'rpc_writes_transfer_audit', exists (
    select 1 from rpc
    where definition ilike '%public.store_audit%'
      and definition ilike '%store_owner_admin_transferred%'
      and definition ilike '%old_owner_id%'
      and definition ilike '%new_owner_id%'
  )
  union all
  select 'anon_cannot_execute_rpc', not has_function_privilege(
    'anon',
    'public.admin_transfer_store_owner(uuid, uuid)',
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
    'public.admin_transfer_store_owner(uuid, uuid)',
    'execute'
  )
  union all
  select 'store_member_upsert_constraint_exists', exists (
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
      and p.proname = 'admin_transfer_store_owner'
      and pg_get_function_identity_arguments(p.oid) = 'p_store_id uuid, p_new_user_id uuid'
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
    select 'rpc_uses_new_user_id_not_phone', exists (
      select 1 from rpc
      where definition ilike '%p_new_user_id uuid%'
        and definition not ilike '%p_phone%'
        and definition not ilike '%submitted_phone%'
    )
    union all
    select 'rpc_requires_existing_new_profile', exists (
      select 1 from rpc
      where definition ilike '%from public.profiles%'
        and definition ilike '%where id = p_new_user_id%'
    )
    union all
    select 'rpc_locks_exact_store', exists (
      select 1 from rpc
      where definition ilike '%from public.stores%'
        and definition ilike '%where id = p_store_id%'
        and definition ilike '%for update%'
    )
    union all
    select 'rpc_locks_existing_owner_membership', exists (
      select 1 from rpc
      where definition ilike '%from public.store_members as sm%'
        and definition ilike '%sm.store_id = p_store_id%'
        and definition ilike '%sm.role = ''owner''%'
        and definition ilike '%for update%'
    )
    union all
    select 'rpc_requires_existing_old_owner', exists (
      select 1 from rpc
      where definition ilike '%store_owner_assignment_required_before_transfer%'
    )
    union all
    select 'rpc_requires_different_new_owner', exists (
      select 1 from rpc
      where definition ilike '%store_owner_transfer_requires_different_user%'
    )
    union all
    select 'rpc_removes_old_owner_access', exists (
      select 1 from rpc
      where definition ilike '%delete from public.store_members as sm%'
        and definition ilike '%sm.store_id = p_store_id%'
        and definition ilike '%sm.role = ''owner''%'
        and definition ilike '%sm.user_id <> p_new_user_id%'
    )
    union all
    select 'rpc_upserts_new_owner_membership', exists (
      select 1 from rpc
      where definition ilike '%insert into public.store_members%'
        and definition ilike '%values (p_store_id, p_new_user_id, ''owner'')%'
        and definition ilike '%on conflict on constraint store_members_store_id_user_id_key%'
        and definition ilike '%do update set role = ''owner''%'
    )
    union all
    select 'rpc_updates_canonical_owner_id', exists (
      select 1 from rpc
      where definition ilike '%update public.stores%'
        and definition ilike '%owner_id = p_new_user_id%'
        and definition ilike '%status = ''claimed''%'
    )
    union all
    select 'rpc_checks_listing_count_unchanged', exists (
      select 1 from rpc
      where definition ilike '%v_listing_count_before%'
        and definition ilike '%v_listing_count_after%'
        and definition ilike '%from public.listings as l%'
        and definition ilike '%l.store_id = p_store_id%'
        and definition ilike '%store_owner_transfer_listing_integrity_failed%'
        and definition not ilike '%update public.listings%'
        and definition not ilike '%delete from public.listings%'
    )
    union all
    select 'rpc_writes_transfer_audit', exists (
      select 1 from rpc
      where definition ilike '%public.store_audit%'
        and definition ilike '%store_owner_admin_transferred%'
        and definition ilike '%old_owner_id%'
        and definition ilike '%new_owner_id%'
    )
    union all
    select 'anon_cannot_execute_rpc', not has_function_privilege(
      'anon',
      'public.admin_transfer_store_owner(uuid, uuid)',
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
      'public.admin_transfer_store_owner(uuid, uuid)',
      'execute'
    )
    union all
    select 'store_member_upsert_constraint_exists', exists (
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
    raise exception 'admin_transfer_store_owner_verification_failed: %', failures;
  end if;
end $$;

begin;

create temporary table marktx_admin_transfer_runtime (
  check_name text primary key,
  ok boolean not null,
  detail text
) on commit drop;

do $$
declare
  v_admin uuid;
  v_moderator uuid;
  v_old_owner uuid;
  v_new_owner uuid;
  v_store uuid;
  v_listing uuid;
  v_listing_count_before bigint;
  v_listing_count_after bigint;
  v_owner_rows integer;
  v_audit_before integer;
  v_audit_after integer;
  v_canonical_owner uuid;
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

  select p.id into v_old_owner
  from public.profiles as p
  where coalesce(p.role, 'user') = 'user'
  order by p.created_at nulls last, p.id
  limit 1;

  select p.id into v_new_owner
  from public.profiles as p
  where p.id is distinct from v_old_owner
    and coalesce(p.role, 'user') = 'user'
  order by p.created_at nulls last, p.id
  limit 1;

  if v_admin is null or v_moderator is null or v_old_owner is null or v_new_owner is null then
    insert into marktx_admin_transfer_runtime
    values ('fixture_availability', false, 'missing admin/moderator/old_owner/new_owner fixtures');
    return;
  end if;

  perform set_config('marktx.store_rpc', 'on', true);
  insert into public.stores (name, slug, status)
  values (
    'Admin Transfer Verify Store',
    'admin-transfer-verify-' || left(replace(gen_random_uuid()::text, '-', ''), 10),
    'unclaimed'
  )
  returning id into v_store;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  perform public.admin_assign_store_owner(v_store, v_old_owner);
  reset role;

  insert into public.listings (user_id, store_id, title, price, category, city, condition, status)
  values (v_old_owner, v_store, 'Transfer Verify Listing', 100, 'Test', 'Bakı', 'Yeni', 'active')
  returning id into v_listing;

  select count(*) into v_listing_count_before from public.listings where store_id = v_store;
  select count(*) into v_audit_before
  from public.store_audit_logs
  where store_id = v_store
    and action = 'store_owner_admin_transferred';

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  perform public.admin_transfer_store_owner(v_store, v_new_owner);
  reset role;

  select owner_id into v_canonical_owner from public.stores where id = v_store;
  select count(*) into v_owner_rows
  from public.store_members
  where store_id = v_store
    and role = 'owner';
  select count(*) into v_listing_count_after from public.listings where store_id = v_store;
  select count(*) into v_audit_after
  from public.store_audit_logs
  where store_id = v_store
    and action = 'store_owner_admin_transferred';

  insert into marktx_admin_transfer_runtime
  values ('admin_allowed', v_canonical_owner = v_new_owner, 'owner_id=' || coalesce(v_canonical_owner::text, 'null'));
  insert into marktx_admin_transfer_runtime
  values ('old_owner_loses_owner_access', not exists (
    select 1 from public.store_members where store_id = v_store and user_id = v_old_owner and role = 'owner'
  ), 'rolled back');
  insert into marktx_admin_transfer_runtime
  values ('new_owner_gains_exact_store_access', exists (
    select 1 from public.store_members where store_id = v_store and user_id = v_new_owner and role = 'owner'
  ), 'rolled back');
  insert into marktx_admin_transfer_runtime
  values ('stores_owner_id_matches_membership', v_canonical_owner = v_new_owner, 'rolled back');
  insert into marktx_admin_transfer_runtime
  values ('listings_remain_linked_to_same_store_id', exists (
    select 1 from public.listings where id = v_listing and store_id = v_store
  ), 'rolled back');
  insert into marktx_admin_transfer_runtime
  values ('listings_count_unchanged', v_listing_count_after = v_listing_count_before, 'before=' || v_listing_count_before || ',after=' || v_listing_count_after);
  insert into marktx_admin_transfer_runtime
  values ('single_owner_after_transfer', v_owner_rows = 1, 'owner_rows=' || v_owner_rows);
  insert into marktx_admin_transfer_runtime
  values ('audit_row_created', v_audit_after = v_audit_before + 1, 'before=' || v_audit_before || ',after=' || v_audit_after);

  begin
    perform set_config('request.jwt.claim.sub', v_old_owner::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    set local role authenticated;
    perform public.admin_transfer_store_owner(v_store, v_old_owner);
    reset role;
    insert into marktx_admin_transfer_runtime values ('ordinary_user_denied', false, 'rpc unexpectedly succeeded');
  exception
    when others then
      get stacked diagnostics v_sqlerrm = message_text;
      reset role;
      insert into marktx_admin_transfer_runtime
      values ('ordinary_user_denied', v_sqlerrm like '%admin_store_owner_transfer_denied%', v_sqlerrm);
  end;

  begin
    perform set_config('request.jwt.claim.sub', v_moderator::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    set local role authenticated;
    perform public.admin_transfer_store_owner(v_store, v_old_owner);
    reset role;
    insert into marktx_admin_transfer_runtime values ('moderator_denied', false, 'rpc unexpectedly succeeded');
  exception
    when others then
      get stacked diagnostics v_sqlerrm = message_text;
      reset role;
      insert into marktx_admin_transfer_runtime
      values ('moderator_denied', v_sqlerrm like '%admin_store_owner_transfer_denied%', v_sqlerrm);
  end;

  perform set_config('marktx.store_rpc', 'on', true);
  insert into public.stores (name, slug, status)
  values (
    'Admin Transfer Fail Preserve Store',
    'admin-transfer-fail-' || left(replace(gen_random_uuid()::text, '-', ''), 10),
    'unclaimed'
  )
  returning id into v_store;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  perform public.admin_assign_store_owner(v_store, v_old_owner);
  reset role;

  begin
    perform set_config('request.jwt.claim.sub', v_admin::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    set local role authenticated;
    perform public.admin_transfer_store_owner(v_store, gen_random_uuid());
    reset role;
    insert into marktx_admin_transfer_runtime
    values ('failed_transfer_preserves_old_owner', false, 'invalid transfer unexpectedly succeeded');
  exception
    when others then
      reset role;
      insert into marktx_admin_transfer_runtime
      values (
        'failed_transfer_preserves_old_owner',
        exists (
          select 1
          from public.store_members
          where store_id = v_store
            and user_id = v_old_owner
            and role = 'owner'
        ),
        'old owner preserved after failed transfer'
      );
  end;

  begin
    perform set_config('request.jwt.claim.sub', v_admin::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    set local role authenticated;
    perform public.admin_transfer_store_owner(v_store, v_old_owner);
    reset role;
    insert into marktx_admin_transfer_runtime
    values ('duplicate_transfer_to_current_owner_denied', false, 'self-transfer unexpectedly succeeded');
  exception
    when others then
      get stacked diagnostics v_sqlerrm = message_text;
      reset role;
      select count(*) into v_owner_rows
      from public.store_members
      where store_id = v_store
        and role = 'owner';
      insert into marktx_admin_transfer_runtime
      values (
        'duplicate_transfer_to_current_owner_denied',
        v_sqlerrm like '%store_owner_transfer_requires_different_user%' and v_owner_rows = 1,
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
  from marktx_admin_transfer_runtime
  where not ok;

  if failures is not null then
    raise exception 'admin_transfer_store_owner_runtime_failed: %', failures;
  end if;
end $$;

rollback;
