-- MarktX Phase 2 store-centered messaging verification.
-- Read-only checks. Safe to run before and after applying the prepared migration.

select 'conversation_count' as check_name, count(*)::text as result
from public.conversations
union all
select 'message_count', count(*)::text
from public.messages
union all
select 'orphan_messages', count(*)::text
from public.messages m
where not exists (
  select 1 from public.conversations c where c.id = m.conversation_id
)
union all
select 'legacy_user_user_conversations', count(*)::text
from public.conversations
where coalesce(conversation_type, 'legacy_user_user') = 'legacy_user_user'
union all
select 'customer_store_conversations', count(*)::text
from public.conversations
where conversation_type = 'customer_store'
union all
select 'customer_support_conversations', count(*)::text
from public.conversations
where conversation_type = 'customer_support'
union all
select 'store_support_conversations', count(*)::text
from public.conversations
where conversation_type = 'store_support';

select
  'duplicate_open_customer_store_listing' as check_name,
  customer_user_id,
  store_id,
  listing_id,
  count(*) as duplicate_count
from public.conversations
where conversation_type = 'customer_store'
  and listing_id is not null
  and status in ('open', 'waiting_customer', 'waiting_store', 'waiting_support')
group by customer_user_id, store_id, listing_id
having count(*) > 1;

select
  'duplicate_open_customer_store_general' as check_name,
  customer_user_id,
  store_id,
  count(*) as duplicate_count
from public.conversations
where conversation_type = 'customer_store'
  and listing_id is null
  and status in ('open', 'waiting_customer', 'waiting_store', 'waiting_support')
group by customer_user_id, store_id
having count(*) > 1;

select
  'invalid_customer_store_listing_relation' as check_name,
  c.id,
  c.store_id as conversation_store_id,
  l.store_id as listing_store_id
from public.conversations c
join public.listings l on l.id = c.listing_id
where c.conversation_type = 'customer_store'
  and c.listing_id is not null
  and l.store_id is distinct from c.store_id;

select
  'missing_required_phase2_fields' as check_name,
  id,
  conversation_type,
  customer_user_id,
  store_id,
  listing_id
from public.conversations
where (
    conversation_type = 'customer_store'
    and (customer_user_id is null or store_id is null)
  )
  or (
    conversation_type = 'customer_support'
    and customer_user_id is null
  )
  or (
    conversation_type = 'store_support'
    and store_id is null
  )
  or (
    coalesce(conversation_type, 'legacy_user_user') = 'legacy_user_user'
    and (listing_id is null or buyer_id is null or seller_id is null)
  );

select
  'security_definer_without_search_path' as check_name,
  n.nspname as schema_name,
  p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'get_or_create_customer_store_conversation',
    'get_or_create_customer_support_conversation',
    'get_or_create_store_support_conversation',
    'send_conversation_message',
    'mark_conversation_read',
    'close_conversation',
    'report_conversation',
    'marktx_can_access_conversation',
    'marktx_store_member_has_role',
    'marktx_is_support_admin',
    'list_reported_customer_store_conversations'
  )
  and p.prosecdef
  and not exists (
    select 1
    from unnest(coalesce(p.proconfig, array[]::text[])) cfg
    where cfg like 'search_path=%'
  );

select
  'foundation_legacy_insert_policy_present' as check_name,
  case when exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'conversations'
      and policyname = 'conversations_insert_buyer'
  ) then 'PRESENT_COMPATIBILITY_PHASE'
  else 'ABSENT_ENFORCEMENT_PHASE'
  end as result;

select
  'enforcement_rpc_only_insert_policy_present' as check_name,
  case when exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'messages'
      and policyname = 'messages_insert_rpc_only_phase2'
  ) then 'PRESENT_ENFORCEMENT_PHASE'
  else 'ABSENT_COMPATIBILITY_PHASE'
  end as result;

select
  'admin_customer_store_direct_select_bypass' as check_name,
  case when exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'conversations'
      and policyname = 'conversations_select_accessible_phase2'
      and qual ilike '%reported_at%'
      and qual ilike '%marktx_is_support_admin%'
  ) then 'FAIL_DIRECT_ADMIN_REPORTED_SELECT'
  else 'OK_NO_DIRECT_REPORTED_ADMIN_SELECT'
  end as result;

select
  'audited_customer_store_access_rpc' as check_name,
  case when to_regprocedure('public.get_audited_customer_store_conversation(uuid,text,jsonb)') is not null
    then 'PRESENT'
    else 'MISSING'
  end as result;

select
  'admin_customer_store_summary_queue_rpc' as check_name,
  case when to_regprocedure('public.list_reported_customer_store_conversations(integer,integer)') is not null
    then 'PRESENT'
    else 'MISSING'
  end as result;

select
  'admin_customer_store_summary_queue_no_body_column' as check_name,
  case when coalesce(pg_get_function_result(to_regprocedure('public.list_reported_customer_store_conversations(integer,integer)'), '') not ilike '%body%'
    then 'OK_NO_BODY_COLUMN'
    else 'FAIL_BODY_COLUMN_EXPOSED'
  end as result;

select
  'messages_metadata_safety_constraint' as check_name,
  case when exists (
    select 1
    from pg_constraint
    where conrelid = 'public.messages'::regclass
      and conname = 'messages_metadata_safe_check'
  ) then 'PRESENT'
  else 'MISSING'
  end as result;

select
  'rls_policy_inventory' as check_name,
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'conversations',
    'messages',
    'conversation_reads',
    'conversation_access_audit',
    'conversation_blocks',
    'reports'
  )
order by tablename, policyname;
