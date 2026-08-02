-- Verification for 20260714114500_support_agent_admin_support_access.sql.
-- Run manually only after applying the migration to the intended project.

with checks as (
  select
    'profiles_role_check_allows_support_agent' as check_name,
    exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'profiles'
        and c.conname = 'profiles_role_check'
        and pg_get_constraintdef(c.oid) ilike '%support_agent%'
    ) as passed

  union all
  select
    'support_role_helpers_exist' as check_name,
    count(*) = 4 as passed
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'marktx_is_admin',
      'marktx_is_support_staff',
      'marktx_can_access_support_panel',
      'marktx_is_support_admin'
    )

  union all
  select
    'support_role_helpers_use_empty_search_path' as check_name,
    bool_and(coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=%') as passed
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'marktx_is_admin',
      'marktx_is_support_staff',
      'marktx_can_access_support_panel',
      'marktx_is_support_admin'
    )

  union all
  select
    'admin_support_queue_uses_support_panel_helper' as check_name,
    pg_get_functiondef('public.list_admin_support_conversations(integer, integer)'::regprocedure)
      ilike '%marktx_can_access_support_panel%' as passed

  union all
  select
    'customer_store_queue_uses_support_panel_helper' as check_name,
    pg_get_functiondef('public.list_reported_customer_store_conversations(integer, integer)'::regprocedure)
      ilike '%marktx_can_access_support_panel%' as passed

  union all
  select
    'audited_customer_store_uses_support_panel_helper' as check_name,
    pg_get_functiondef('public.get_audited_customer_store_conversation(uuid, text, jsonb)'::regprocedure)
      ilike '%marktx_can_access_support_panel%' as passed

  union all
  select
    'audited_customer_store_requires_existing_report_or_escalation' as check_name,
    pg_get_functiondef('public.get_audited_customer_store_conversation(uuid, text, jsonb)'::regprocedure)
      ilike '%from public.conversation_access_audit caa_scope%'
    and pg_get_functiondef('public.get_audited_customer_store_conversation(uuid, text, jsonb)'::regprocedure)
      not ilike '%or p_access_reason in (''escalated'', ''moderation'', ''legal'', ''security'', ''support_assignment'')%' as passed

  union all
  select
    'audited_store_support_uses_support_panel_helper' as check_name,
    pg_get_functiondef('public.get_audited_store_support_conversation(uuid, text, jsonb)'::regprocedure)
      ilike '%marktx_can_access_support_panel%' as passed

  union all
  select
    'support_queues_return_no_message_body_columns' as check_name,
    not (
      pg_get_functiondef('public.list_admin_support_conversations(integer, integer)'::regprocedure)
        ilike any (array[
        '% body %',
        '% message_body %',
        '% last_message %',
        '% messages %'
      ])
    )
    and not (
      pg_get_functiondef('public.list_reported_customer_store_conversations(integer, integer)'::regprocedure)
        ilike any (array[
        '% body %',
        '% message_body %',
        '% last_message %',
        '% messages %'
      ])
    ) as passed

  union all
  select
    'anon_cannot_execute_support_panel_helpers' as check_name,
    not has_function_privilege('anon', 'public.marktx_can_access_support_panel()', 'execute')
    and not has_function_privilege('anon', 'public.marktx_is_support_staff()', 'execute') as passed

  union all
  select
    'anon_cannot_execute_support_queue_rpcs' as check_name,
    not has_function_privilege('anon', 'public.list_admin_support_conversations(integer, integer)', 'execute')
    and not has_function_privilege('anon', 'public.list_reported_customer_store_conversations(integer, integer)', 'execute') as passed
)
select check_name, passed
from checks
order by check_name;
