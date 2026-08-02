-- Verify the admin store archive RPC after targeted migration application.

create temporary table marktx_admin_archive_store_checks (
  check_name text primary key,
  passed boolean not null
) on commit drop;

with rpc as (
  select
    p.oid,
    p.prosecdef,
    p.proconfig,
    p.proacl,
    p.proowner,
    lower(pg_get_functiondef(p.oid)) as definition
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'admin_archive_store'
    and pg_get_function_identity_arguments(p.oid) = 'p_store_id uuid, p_reason text'
)
insert into marktx_admin_archive_store_checks (check_name, passed)
select 'rpc_exists', exists (select 1 from rpc)
union all
select 'security_definer', coalesce((select prosecdef from rpc), false)
union all
select 'empty_search_path', coalesce((select proconfig @> array['search_path=""']::text[] from rpc), false)
union all
select 'admin_guard', coalesce((select definition like '%public.is_admin()%' from rpc), false)
union all
select 'store_row_locked', coalesce((select definition like '%for update%' from rpc), false)
union all
select 'listings_soft_deleted', coalesce((
  select definition like '%update public.listings%'
    and definition like '%status = ''deleted''%'
  from rpc
), false)
union all
select 'memberships_removed', coalesce((select definition like '%delete from public.store_members%' from rpc), false)
union all
select 'pending_claims_cancelled', coalesce((
  select definition like '%update public.store_claim_requests%'
    and definition like '%status = ''cancelled''%'
  from rpc
), false)
union all
select 'store_suspended_and_owner_cleared', coalesce((
  select definition like '%update public.stores%'
    and definition like '%owner_id = null%'
    and definition like '%status = ''suspended''%'
  from rpc
), false)
union all
select 'audit_recorded', coalesce((
  select definition like '%insert into public.store_audit_logs%'
    and definition like '%store_archived_admin%'
  from rpc
), false)
union all
select 'store_not_deleted', coalesce((select definition not like '%delete from public.stores%' from rpc), false)
union all
select 'listing_store_links_preserved', coalesce((select definition not like '%store_id = null%' from rpc), false)
union all
select 'conversations_preserved', coalesce((
  select definition not like '%delete from public.conversations%'
    and definition not like '%update public.conversations%'
  from rpc
), false)
union all
select 'messages_preserved', coalesce((
  select definition not like '%delete from public.messages%'
    and definition not like '%update public.messages%'
  from rpc
), false)
union all
select 'legacy_hard_delete_not_executable_by_authenticated', not has_function_privilege(
  'authenticated',
  'public.admin_delete_store(uuid)',
  'execute'
)
union all
select 'anon_cannot_execute', not has_function_privilege(
  'anon',
  'public.admin_archive_store(uuid, text)',
  'execute'
)
union all
select 'public_cannot_execute', not exists (
  select 1
  from rpc
  cross join aclexplode(coalesce(rpc.proacl, acldefault('f', rpc.proowner))) as acl
  where acl.grantee = 0
    and acl.privilege_type = 'EXECUTE'
)
union all
select 'authenticated_executes_with_internal_admin_guard', has_function_privilege(
  'authenticated',
  'public.admin_archive_store(uuid, text)',
  'execute'
);

do $$
declare
  v_failed text;
begin
  select string_agg(c.check_name, ', ' order by c.check_name)
    into v_failed
  from marktx_admin_archive_store_checks as c
  where not c.passed;

  if v_failed is not null then
    raise exception 'admin_archive_store_verification_failed: %', v_failed;
  end if;
end;
$$;

select check_name, passed
from marktx_admin_archive_store_checks
order by check_name;
