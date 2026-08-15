with fn as (
  select
    p.oid,
    pg_get_functiondef(p.oid) as definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'block_customer_store_conversation'
),
checks as (
  select
    'block_customer_store_conversation_exists' as check_name,
    exists(select 1 from fn) as passed
  union all
  select
    'security_definer',
    exists(select 1 from fn where definition ilike '%security definer%')
  union all
  select
    'search_path_empty',
    exists(select 1 from fn where definition ilike '%set search_path = ''''%')
  union all
  select
    'scoped_to_customer_store',
    exists(select 1 from fn where definition ilike '%conversation_type = ''customer_store''%')
  union all
  select
    'customer_can_self_block',
    exists(select 1 from fn where definition ilike '%v_user_id = v_conversation.customer_user_id%')
  union all
  select
    'store_owner_manager_can_block',
    exists(
      select 1
      from fn
      where definition ilike '%marktx_store_member_has_role%'
        and definition ilike '%owner%'
        and definition ilike '%manager%'
    )
  union all
  select
    'support_admin_can_block',
    exists(select 1 from fn where definition ilike '%marktx_is_support_admin%')
  union all
  select
    'support_block_is_reported_or_audited_only',
    exists(
      select 1
      from fn
      where definition ilike '%v_conversation.reported_at is not null%'
        and definition ilike '%public.conversation_access_audit%'
        and definition ilike '%caa.actor_id = v_user_id%'
    )
  union all
  select
    'closes_conversation',
    exists(select 1 from fn where definition ilike '%status = ''closed''%')
  union all
  select
    'does_not_delete_messages',
    exists(select 1 from fn where definition not ilike '%delete from public.messages%')
  union all
  select
    'anon_cannot_execute',
    coalesce((select not has_function_privilege('anon', oid, 'execute') from fn limit 1), false)
  union all
  select
    'authenticated_can_execute',
    coalesce((select has_function_privilege('authenticated', oid, 'execute') from fn limit 1), false)
)
select check_name, passed
from checks
order by check_name;
