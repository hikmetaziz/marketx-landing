with functions as (
  select
    p.oid,
    p.proname,
    pg_get_functiondef(p.oid) as definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('edit_conversation_message', 'delete_conversation_message_text')
),
checks as (
  select
    'edit_conversation_message_exists' as check_name,
    exists(select 1 from functions where proname = 'edit_conversation_message') as passed
  union all
  select
    'delete_conversation_message_text_exists',
    exists(select 1 from functions where proname = 'delete_conversation_message_text')
  union all
  select
    'both_security_definer',
    not exists(select 1 from functions where definition not ilike '%security definer%')
    and (select count(*) from functions) = 2
  union all
  select
    'both_search_path_empty',
    not exists(select 1 from functions where definition not ilike '%set search_path = ''''%')
    and (select count(*) from functions) = 2
  union all
  select
    'sender_ownership_required',
    not exists(select 1 from functions where definition not ilike '%sender_id <> v_user_id%')
    and (select count(*) from functions) = 2
  union all
  select
    'conversation_access_required',
    not exists(select 1 from functions where definition not ilike '%marktx_can_access_conversation%')
    and (select count(*) from functions) = 2
  union all
  select
    'closed_conversations_blocked',
    not exists(select 1 from functions where definition not ilike '%status in (''resolved'', ''closed'')%')
    and (select count(*) from functions) = 2
  union all
  select
    'legacy_messages_blocked',
    not exists(select 1 from functions where definition not ilike '%conversation_type = ''legacy_user_user''%')
    and (select count(*) from functions) = 2
  union all
  select
    'delete_is_soft_delete_only',
    exists(
      select 1
      from functions
      where proname = 'delete_conversation_message_text'
        and definition ilike '%body = ''Mesaj silindi''%'
        and definition ilike '%deleted_at%'
        and definition not ilike '%delete from public.messages%'
    )
  union all
  select
    'edit_marks_metadata_only',
    exists(
      select 1
      from functions
      where proname = 'edit_conversation_message'
        and definition ilike '%edited_at%'
        and definition not ilike '%delete from public.messages%'
    )
  union all
  select
    'anon_cannot_execute_edit',
    coalesce((select not has_function_privilege('anon', oid, 'execute') from functions where proname = 'edit_conversation_message' limit 1), false)
  union all
  select
    'anon_cannot_execute_delete',
    coalesce((select not has_function_privilege('anon', oid, 'execute') from functions where proname = 'delete_conversation_message_text' limit 1), false)
  union all
  select
    'authenticated_can_execute_edit',
    coalesce((select has_function_privilege('authenticated', oid, 'execute') from functions where proname = 'edit_conversation_message' limit 1), false)
  union all
  select
    'authenticated_can_execute_delete',
    coalesce((select has_function_privilege('authenticated', oid, 'execute') from functions where proname = 'delete_conversation_message_text' limit 1), false)
)
select check_name, passed
from checks
order by check_name;
