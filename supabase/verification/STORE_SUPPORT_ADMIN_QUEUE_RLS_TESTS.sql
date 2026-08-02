-- Verification for 20260714113000_store_support_admin_queue.sql.
-- Run manually after applying the migration in the intended Supabase project.
--
-- This file is intentionally read/execute verification only for the prepared
-- RPCs. It does not create, update, or delete application data.

select
  'list_admin_support_conversations_exists' as check_name,
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'list_admin_support_conversations'
  ) as passed;

select
  'get_audited_store_support_conversation_exists' as check_name,
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_audited_store_support_conversation'
  ) as passed;

select
  'store_support_message_audit_gate_exists' as check_name,
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'marktx_can_select_message_after_store_support_audit'
  ) as passed;

select
  'messages_select_policy_uses_store_support_audit_gate' as check_name,
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'messages'
      and policyname = 'messages_select_accessible_phase2'
      and qual ilike '%marktx_can_select_message_after_store_support_audit%'
  ) as passed;

select
  'admin_support_queue_has_no_body_column' as check_name,
  not exists (
    select 1
    from information_schema.routine_columns
    where specific_schema = 'public'
      and routine_name = 'list_admin_support_conversations'
      and column_name in ('body', 'message_body', 'last_message')
  ) as passed;

select
  'store_support_detail_function_has_empty_search_path' as check_name,
  coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=%' as passed
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'get_audited_store_support_conversation';

select
  'anon_cannot_execute_store_support_queue' as check_name,
  not has_function_privilege(
    'anon',
    'public.list_admin_support_conversations(integer, integer)',
    'execute'
  ) as passed;

select
  'anon_cannot_execute_store_support_audit_detail' as check_name,
  not has_function_privilege(
    'anon',
    'public.get_audited_store_support_conversation(uuid, text, jsonb)',
    'execute'
  ) as passed;

select
  'anon_cannot_execute_store_support_message_gate' as check_name,
  not has_function_privilege(
    'anon',
    'public.marktx_can_select_message_after_store_support_audit(uuid)',
    'execute'
  ) as passed;
