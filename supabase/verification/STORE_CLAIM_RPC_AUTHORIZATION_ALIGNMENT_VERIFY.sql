-- Verify store claim RPC authorization alignment.
-- Read-only: checks function metadata, direct-RPC guard text, grants and same-store duplicate guard.

with rpc as (
  select
    p.oid,
    p.prosecdef,
    p.proacl,
    p.proowner,
    coalesce(array_to_string(p.proconfig, ','), '') as proconfig,
    pg_get_functiondef(p.oid) as definition
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'submit_store_claim_request'
    and pg_get_function_identity_arguments(p.oid) =
      'p_store_code text, p_claim_code text, p_phone text, p_note text, p_evidence_url text'
),
target_index as (
  select
    i.indisunique,
    pg_get_expr(i.indpred, i.indrelid) as predicate,
    array_agg(a.attname::text order by k.ordinality) as columns
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  join pg_index as i on i.indexrelid = c.oid
  join unnest(i.indkey) with ordinality as k(attnum, ordinality) on true
  join pg_attribute as a on a.attrelid = i.indrelid and a.attnum = k.attnum
  where n.nspname = 'public'
    and c.relname = 'store_claim_requests_unique_pending_idx'
  group by i.indisunique, i.indpred, i.indrelid
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
  select 'rpc_uses_auth_uid_not_client_user_id', exists (
    select 1
    from rpc
    where definition ilike '%v_uid uuid := auth.uid()%'
      and definition not ilike '%p_user_id%'
      and definition not ilike '%p_requested_by%'
  )
  union all
  select 'rpc_denies_admin_and_moderator', exists (
    select 1
    from rpc
    where definition ilike '%v_profile_role in (''admin'', ''moderator'')%'
  )
  union all
  select 'rpc_denies_active_store_members', exists (
    select 1
    from rpc
    where definition ilike '%from public.store_members as sm%'
      and definition ilike '%sm.user_id = v_uid%'
      and definition ilike '%sm.role in (''owner'', ''manager'', ''staff'')%'
  )
  union all
  select 'rpc_checks_same_store_pending_only', exists (
    select 1
    from rpc
    where definition ilike '%from public.store_claim_requests as scr%'
      and definition ilike '%scr.store_id = v_store.id%'
      and definition ilike '%scr.requested_by = v_uid%'
      and definition ilike '%scr.status = ''pending''%'
      and definition not ilike '%group by requested_by%'
  )
  union all
  select 'rpc_uses_sanitized_invalid_error', exists (
    select 1
    from rpc
    where definition ilike '%Mağaza kodu və ya sahiblik təsdiq kodu düzgün deyil, ya da bu müraciət qəbul edilmir.%'
      and definition not ilike '%Bu kodla mağaza tapılmadı%'
      and definition not ilike '%Claim kodu yanlışdır%'
      and definition not ilike '%Etibarlı claim kodu tapılmadı%'
      and definition not ilike '%Bu mağaza artıq sahiblənib%'
  )
  union all
  select 'rpc_locks_claim_code_before_insert', exists (
    select 1
    from rpc
    where position('for update' in lower(definition)) > 0
      and position('insert into public.store_claim_requests' in lower(definition)) >
        position('for update' in lower(definition))
  )
  union all
  select 'rpc_marks_code_used_before_insert', exists (
    select 1
    from rpc
    where position('update public.store_claim_codes' in lower(definition)) > 0
      and position('insert into public.store_claim_requests' in lower(definition)) >
        position('update public.store_claim_codes' in lower(definition))
  )
  union all
  select 'anon_cannot_execute_rpc', not has_function_privilege(
    'anon',
    'public.submit_store_claim_request(text, text, text, text, text)',
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
  select 'authenticated_can_execute_rpc', has_function_privilege(
    'authenticated',
    'public.submit_store_claim_request(text, text, text, text, text)',
    'execute'
  )
  union all
  select 'same_store_pending_index_exists', exists (select 1 from target_index)
  union all
  select 'same_store_pending_index_is_unique', exists (
    select 1 from target_index where indisunique
  )
  union all
  select 'same_store_pending_index_columns_exact', exists (
    select 1 from target_index where columns = array['store_id', 'requested_by']
  )
  union all
  select 'same_store_pending_index_predicate_exact', exists (
    select 1 from target_index where lower(predicate) like '%status = ''pending''%'
  )
  union all
  select 'global_pending_user_index_absent', not exists (
    select 1
    from pg_class as c
    join pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'store_claim_requests_one_pending_per_user_idx'
  )
  union all
  select 'no_existing_same_store_pending_duplicates', not exists (
    select 1
    from public.store_claim_requests
    where status = 'pending'
    group by store_id, requested_by
    having count(*) > 1
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
      coalesce(array_to_string(p.proconfig, ','), '') as proconfig,
      pg_get_functiondef(p.oid) as definition
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'submit_store_claim_request'
      and pg_get_function_identity_arguments(p.oid) =
        'p_store_code text, p_claim_code text, p_phone text, p_note text, p_evidence_url text'
  ),
  target_index as (
    select
      i.indisunique,
      pg_get_expr(i.indpred, i.indrelid) as predicate,
      array_agg(a.attname::text order by k.ordinality) as columns
    from pg_class as c
    join pg_namespace as n on n.oid = c.relnamespace
    join pg_index as i on i.indexrelid = c.oid
    join unnest(i.indkey) with ordinality as k(attnum, ordinality) on true
    join pg_attribute as a on a.attrelid = i.indrelid and a.attnum = k.attnum
    where n.nspname = 'public'
      and c.relname = 'store_claim_requests_unique_pending_idx'
    group by i.indisunique, i.indpred, i.indrelid
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
    select 'rpc_uses_auth_uid_not_client_user_id', exists (
      select 1
      from rpc
      where definition ilike '%v_uid uuid := auth.uid()%'
        and definition not ilike '%p_user_id%'
        and definition not ilike '%p_requested_by%'
    )
    union all
    select 'rpc_denies_admin_and_moderator', exists (
      select 1
      from rpc
      where definition ilike '%v_profile_role in (''admin'', ''moderator'')%'
    )
    union all
    select 'rpc_denies_active_store_members', exists (
      select 1
      from rpc
      where definition ilike '%from public.store_members as sm%'
        and definition ilike '%sm.user_id = v_uid%'
        and definition ilike '%sm.role in (''owner'', ''manager'', ''staff'')%'
    )
    union all
    select 'rpc_checks_same_store_pending_only', exists (
      select 1
      from rpc
      where definition ilike '%from public.store_claim_requests as scr%'
        and definition ilike '%scr.store_id = v_store.id%'
        and definition ilike '%scr.requested_by = v_uid%'
        and definition ilike '%scr.status = ''pending''%'
        and definition not ilike '%group by requested_by%'
    )
    union all
    select 'rpc_uses_sanitized_invalid_error', exists (
      select 1
      from rpc
      where definition ilike '%Mağaza kodu və ya sahiblik təsdiq kodu düzgün deyil, ya da bu müraciət qəbul edilmir.%'
        and definition not ilike '%Bu kodla mağaza tapılmadı%'
        and definition not ilike '%Claim kodu yanlışdır%'
        and definition not ilike '%Etibarlı claim kodu tapılmadı%'
        and definition not ilike '%Bu mağaza artıq sahiblənib%'
    )
    union all
    select 'rpc_locks_claim_code_before_insert', exists (
      select 1
      from rpc
      where position('for update' in lower(definition)) > 0
        and position('insert into public.store_claim_requests' in lower(definition)) >
          position('for update' in lower(definition))
    )
    union all
    select 'rpc_marks_code_used_before_insert', exists (
      select 1
      from rpc
      where position('update public.store_claim_codes' in lower(definition)) > 0
        and position('insert into public.store_claim_requests' in lower(definition)) >
          position('update public.store_claim_codes' in lower(definition))
    )
    union all
    select 'anon_cannot_execute_rpc', not has_function_privilege(
      'anon',
      'public.submit_store_claim_request(text, text, text, text, text)',
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
    select 'authenticated_can_execute_rpc', has_function_privilege(
      'authenticated',
      'public.submit_store_claim_request(text, text, text, text, text)',
      'execute'
    )
    union all
    select 'same_store_pending_index_exists', exists (select 1 from target_index)
    union all
    select 'same_store_pending_index_is_unique', exists (
      select 1 from target_index where indisunique
    )
    union all
    select 'same_store_pending_index_columns_exact', exists (
      select 1 from target_index where columns = array['store_id', 'requested_by']
    )
    union all
    select 'same_store_pending_index_predicate_exact', exists (
      select 1 from target_index where lower(predicate) like '%status = ''pending''%'
    )
    union all
    select 'global_pending_user_index_absent', not exists (
      select 1
      from pg_class as c
      join pg_namespace as n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'store_claim_requests_one_pending_per_user_idx'
    )
    union all
    select 'no_existing_same_store_pending_duplicates', not exists (
      select 1
      from public.store_claim_requests
      where status = 'pending'
      group by store_id, requested_by
      having count(*) > 1
    )
  )
  select string_agg(check_name, ', ' order by check_name)
  into failures
  from checks
  where not passed;

  if failures is not null then
    raise exception 'store_claim_rpc_authorization_alignment_verification_failed: %', failures;
  end if;
end $$;
