-- Verify owner-only store archive RPC after targeted migration application.

create temporary table marktx_user_archive_own_store_checks (
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
    and p.proname = 'delete_my_store'
    and pg_get_function_identity_arguments(p.oid) = 'p_store_id uuid'
)
insert into marktx_user_archive_own_store_checks (check_name, passed)
select 'rpc_exists', exists (select 1 from rpc)
union all
select 'security_definer', coalesce((select prosecdef from rpc), false)
union all
select 'empty_search_path', coalesce((select proconfig @> array['search_path=""']::text[] from rpc), false)
union all
select 'uses_auth_uid', coalesce((select definition like '%auth.uid()%' from rpc), false)
union all
select 'claimed_store_required', coalesce((select definition like '%v_store.status <> ''claimed''%' from rpc), false)
union all
select 'canonical_owner_allowed', coalesce((select definition like '%v_store.owner_id = v_actor%' from rpc), false)
union all
select 'store_member_owner_allowed', coalesce((
  select definition like '%from public.store_members as sm%'
    and definition like '%sm.role = ''owner''%'
    and definition like '%sm.user_id = v_actor%'
  from rpc
), false)
union all
select 'store_rpc_flag_used_for_sensitive_update', coalesce((
  select definition like '%marktx.store_rpc%'
    and definition like '%pg_catalog.set_config%'
  from rpc
), false)
union all
select 'store_suspended_and_owner_cleared', coalesce((
  select definition like '%update public.stores as s%'
    and definition like '%status = ''suspended''%'
    and definition like '%owner_id = null%'
  from rpc
), false)
union all
select 'memberships_removed', coalesce((select definition like '%delete from public.store_members as sm%' from rpc), false)
union all
select 'pending_claims_cancelled', coalesce((
  select definition like '%update public.store_claim_requests as scr%'
    and definition like '%status = ''cancelled''%'
  from rpc
), false)
union all
select 'claim_codes_consumed', coalesce((select definition like '%update public.store_claim_codes as scc%' from rpc), false)
union all
select 'audit_recorded', coalesce((
  select definition like '%insert into public.store_audit_logs%'
    and definition like '%store_archived_owner%'
  from rpc
), false)
union all
select 'store_not_hard_deleted', coalesce((select definition not like '%delete from public.stores%' from rpc), false)
union all
select 'store_listings_archived', coalesce((
  select definition like '%update public.listings as l%'
    and definition like '%status = ''archived''::public.listing_status%'
    and definition like '%l.status::text in (''active'', ''sold'')%'
  from rpc
), false)
union all
select 'listings_archived_before_members_removed', coalesce((
  select strpos(definition, 'update public.listings as l') > 0
    and strpos(definition, 'delete from public.store_members as sm') > 0
    and strpos(definition, 'update public.listings as l') < strpos(definition, 'delete from public.store_members as sm')
  from rpc
), false)
union all
select 'listing_rows_not_deleted', coalesce((select definition not like '%delete from public.listings%' from rpc), false)
union all
select 'listing_store_links_preserved', coalesce((
  select definition not like '%store_id = null%'
    and definition not like '%store_id=null%'
  from rpc
), false)
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
select 'anon_cannot_execute', not has_function_privilege(
  'anon',
  'public.delete_my_store(uuid)',
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
select 'authenticated_can_execute_with_internal_owner_guard', has_function_privilege(
  'authenticated',
  'public.delete_my_store(uuid)',
  'execute'
);

do $$
declare
  v_failed text;
begin
  select string_agg(c.check_name, ', ' order by c.check_name)
    into v_failed
  from marktx_user_archive_own_store_checks as c
  where not c.passed;

  if v_failed is not null then
    raise exception 'user_archive_own_store_verification_failed: %', v_failed;
  end if;
end;
$$;

select check_name, passed
from marktx_user_archive_own_store_checks
order by check_name;
