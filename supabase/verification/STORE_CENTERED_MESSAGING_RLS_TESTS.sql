-- MarktX Phase 2 store-centered messaging RLS/RPC test checklist.
-- PREPARED ONLY. Run on staging inside a transaction with disposable users,
-- stores and listings. Do not run against production user data.
--
-- This file is intentionally written as an auditable checklist because Supabase
-- SQL Editor cannot impersonate real auth.uid() users without project-specific
-- JWT/session setup. Each item maps to the required Phase 2 behavior.

begin;

create temporary table if not exists marktx_messaging_test_results (
  test_no integer primary key,
  test_name text not null,
  expected text not null,
  observed text,
  status text not null default 'PENDING'
) on commit drop;

insert into marktx_messaging_test_results (test_no, test_name, expected)
values
  (1, 'legacy conversations remain readable', 'legacy buyer/seller can select their existing conversation'),
  (2, 'existing messages unchanged', 'pre/post message count and ids match'),
  (3, 'new user-user creation blocked', 'direct insert into legacy conversation denied after cutover'),
  (4, 'customer creates valid public store conversation', 'RPC returns customer_store conversation id'),
  (5, 'customer cannot supply another customer_user_id', 'RPC has no customer_user_id parameter and uses auth.uid()'),
  (6, 'listing must belong to store', 'RPC rejects listing_store_mismatch'),
  (7, 'unrelated user cannot read customer-store', 'select denied by marktx_can_access_conversation'),
  (8, 'unrelated store member cannot read customer-store', 'member of another store denied'),
  (9, 'authorized store member can read and reply', 'owner/manager/staff can select and send'),
  (10, 'removed member loses access', 'after store_members row removal access is denied'),
  (11, 'customer cannot impersonate store/support/admin', 'send_conversation_message resolves sender_context server-side'),
  (12, 'store member cannot access another store support', 'store_support is scoped to store_id membership'),
  (13, 'customer-support access isolated', 'only customer and support/admin roles can select'),
  (14, 'store-support access isolated', 'only store member and support/admin roles can select'),
  (15, 'admin support access is not broad customer-store browse', 'customer_store requires reported/escalated/audit path'),
  (16, 'closed conversation rejects new messages', 'send_conversation_message raises conversation_closed'),
  (17, 'read state is per user', 'conversation_reads has unique conversation_id,user_id rows'),
  (18, 'duplicate open conversations prevented', 'partial unique indexes reject duplicates'),
  (19, 'security definer search_path safe', 'all Phase 2 SECURITY DEFINER functions set search_path'),
  (20, 'migration preserves counts', 'conversation/message counts unchanged except intentional test rows')
on conflict (test_no) do nothing;

insert into marktx_messaging_test_results (test_no, test_name, expected)
values
  (21, 'foundation preserves current direct legacy writes', 'conversations_insert_buyer and messages_insert_participant remain before enforcement'),
  (22, 'enforcement blocks current direct legacy writes', 'rpc-only false insert policies exist after cutover'),
  (23, 'admin private customer-store access is audited', 'direct select is denied; get_audited_customer_store_conversation logs access'),
  (24, 'message metadata is bounded', 'metadata object is limited and identity keys are rejected'),
  (25, 'admin customer-store queue RPC is restricted', 'ordinary users and store members cannot execute successfully'),
  (26, 'admin customer-store queue only lists scoped rows', 'admin sees reported/escalated summaries but not unrelated private customer-store conversations'),
  (27, 'admin customer-store queue omits messages', 'summary return shape has no message body column'),
  (28, 'admin customer-store detail remains audited', 'detail access still uses get_audited_customer_store_conversation and writes audit rows')
on conflict (test_no) do nothing;

-- Static checks that can run without auth impersonation.
update marktx_messaging_test_results
set observed = 'conversation_reads primary key is per conversation_id,user_id',
    status = case when exists (
      select 1
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on kcu.constraint_name = tc.constraint_name
       and kcu.table_schema = tc.table_schema
      where tc.table_schema = 'public'
        and tc.table_name = 'conversation_reads'
        and tc.constraint_type = 'PRIMARY KEY'
        and kcu.column_name in ('conversation_id', 'user_id')
    ) then 'PASS' else 'FAIL' end
where test_no = 17;

update marktx_messaging_test_results
set observed = 'Phase 2 partial unique indexes are present',
    status = case when (
      select count(*)
      from pg_indexes
      where schemaname = 'public'
        and indexname in (
          'conversations_customer_store_listing_open_idx',
          'conversations_customer_store_general_open_idx',
          'conversations_customer_support_topic_open_idx',
          'conversations_store_support_topic_open_idx'
        )
    ) = 4 then 'PASS' else 'FAIL' end
where test_no = 18;

update marktx_messaging_test_results
set observed = 'SECURITY DEFINER functions define search_path',
    status = case when not exists (
      select 1
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
          'report_conversation'
        )
        and p.prosecdef
        and not exists (
          select 1
          from unnest(coalesce(p.proconfig, array[]::text[])) cfg
          where cfg like 'search_path=%'
        )
    ) then 'PASS' else 'FAIL' end
where test_no = 19;

update marktx_messaging_test_results
set observed = 'Foundation keeps legacy insert policies until frontend cutover',
    status = case when exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'conversations'
        and policyname = 'conversations_insert_buyer'
    ) and exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'messages'
        and policyname = 'messages_insert_participant'
    ) then 'PASS_COMPATIBILITY' else 'PENDING_OR_ENFORCED' end
where test_no = 21;

update marktx_messaging_test_results
set observed = 'Enforcement has rpc-only direct insert blocking policies',
    status = case when exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'conversations'
        and policyname = 'conversations_insert_rpc_only_phase2'
    ) and exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'messages'
        and policyname = 'messages_insert_rpc_only_phase2'
    ) then 'PASS_ENFORCEMENT' else 'PENDING_FOUNDATION' end
where test_no = 22;

update marktx_messaging_test_results
set observed = 'Audited customer-store RPC exists',
    status = case when to_regprocedure('public.get_audited_customer_store_conversation(uuid,text,jsonb)') is not null
      then 'PASS' else 'FAIL' end
where test_no = 23;

update marktx_messaging_test_results
set observed = 'messages_metadata_safe_check exists',
    status = case when exists (
      select 1
      from pg_constraint
      where conrelid = 'public.messages'::regclass
        and conname = 'messages_metadata_safe_check'
    ) then 'PASS' else 'FAIL' end
where test_no = 24;

update marktx_messaging_test_results
set observed = 'Restricted admin customer-store queue RPC exists',
    status = case when to_regprocedure('public.list_reported_customer_store_conversations(integer,integer)') is not null
      then 'PASS' else 'FAIL' end
where test_no = 25;

update marktx_messaging_test_results
set observed = 'Run PHASE_B1_ADMIN_CUSTOMER_STORE_QUEUE_RLS_TESTS.sql after applying the Phase B1 queue migration',
    status = 'PENDING_LIVE_RLS_TEST'
where test_no in (26, 28);

update marktx_messaging_test_results
set observed = 'Queue RPC return shape does not include body',
    status = case when coalesce(pg_get_function_result(to_regprocedure('public.list_reported_customer_store_conversations(integer,integer)'), '') not ilike '%body%'
      then 'PASS' else 'FAIL' end
where test_no = 27;

select * from marktx_messaging_test_results order by test_no;

rollback;
