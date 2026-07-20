-- MarktX first-response analytics view v1 verification.
--
-- Read-only verification. Does not create, update, delete, grant, revoke, or
-- apply migrations.
--
-- This file has two layers:
-- 1. Synthetic semantic checks for the documented first-response algorithm.
-- 2. Live view contract checks for output columns, row grain, status semantics,
--    grants, and security options.
--
-- Synthetic checks cannot prove production-data correctness by themselves; they
-- protect the intended edge cases without writing fixture rows.

do $$
declare
  rec record;
  failed_checks text := '';
  checked_count integer := 0;
begin
  for rec in
    with synthetic_conversations (
      conversation_id,
      conversation_type,
      store_id,
      listing_id,
      current_status,
      conversation_created_at,
      conversation_closed_at
    ) as (
      values
        (
          '11111111-1111-1111-1111-111111111111'::uuid,
          'customer_store',
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
          'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
          'open',
          '2026-07-19 10:00:00+00'::timestamptz,
          null::timestamptz
        ),
        (
          '22222222-2222-2222-2222-222222222222'::uuid,
          'customer_store',
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
          'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
          'open',
          '2026-07-19 11:00:00+00'::timestamptz,
          null::timestamptz
        ),
        (
          '33333333-3333-3333-3333-333333333333'::uuid,
          'customer_store',
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
          'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
          'open',
          '2026-07-19 12:00:00+00'::timestamptz,
          null::timestamptz
        ),
        (
          '44444444-4444-4444-4444-444444444444'::uuid,
          'customer_store',
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
          'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
          'open',
          '2026-07-19 13:00:00+00'::timestamptz,
          null::timestamptz
        ),
        (
          '55555555-5555-5555-5555-555555555555'::uuid,
          'customer_store',
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
          'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
          'closed',
          '2026-07-19 14:00:00+00'::timestamptz,
          '2026-07-19 14:20:00+00'::timestamptz
        ),
        (
          '66666666-6666-6666-6666-666666666666'::uuid,
          'customer_support',
          null::uuid,
          null::uuid,
          'open',
          '2026-07-19 15:00:00+00'::timestamptz,
          null::timestamptz
        ),
        (
          '77777777-7777-7777-7777-777777777777'::uuid,
          'store_support',
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
          null::uuid,
          'open',
          '2026-07-19 16:00:00+00'::timestamptz,
          null::timestamptz
        ),
        (
          '88888888-8888-8888-8888-888888888888'::uuid,
          'customer_support',
          null::uuid,
          null::uuid,
          'open',
          '2026-07-19 17:00:00+00'::timestamptz,
          null::timestamptz
        ),
        (
          '99999999-9999-9999-9999-999999999999'::uuid,
          'legacy_user_user',
          null::uuid,
          null::uuid,
          'open',
          '2026-07-19 18:00:00+00'::timestamptz,
          null::timestamptz
        )
    ),
    synthetic_messages (
      message_id,
      conversation_id,
      sender_context,
      created_at,
      metadata
    ) as (
      values
        (
          '10000000-0000-0000-0000-000000000001'::uuid,
          '11111111-1111-1111-1111-111111111111'::uuid,
          'customer',
          '2026-07-19 10:00:00+00'::timestamptz,
          '{}'::jsonb
        ),
        (
          '10000000-0000-0000-0000-000000000002'::uuid,
          '11111111-1111-1111-1111-111111111111'::uuid,
          'customer',
          '2026-07-19 10:01:00+00'::timestamptz,
          '{}'::jsonb
        ),
        (
          '10000000-0000-0000-0000-000000000003'::uuid,
          '11111111-1111-1111-1111-111111111111'::uuid,
          'store',
          '2026-07-19 10:07:00+00'::timestamptz,
          '{}'::jsonb
        ),
        (
          '10000000-0000-0000-0000-000000000004'::uuid,
          '11111111-1111-1111-1111-111111111111'::uuid,
          'customer',
          '2026-07-19 10:10:00+00'::timestamptz,
          '{}'::jsonb
        ),
        (
          '10000000-0000-0000-0000-000000000005'::uuid,
          '11111111-1111-1111-1111-111111111111'::uuid,
          'store',
          '2026-07-19 10:12:00+00'::timestamptz,
          '{}'::jsonb
        ),
        (
          '20000000-0000-0000-0000-000000000001'::uuid,
          '22222222-2222-2222-2222-222222222222'::uuid,
          'store',
          '2026-07-19 11:00:00+00'::timestamptz,
          '{}'::jsonb
        ),
        (
          '30000000-0000-0000-0000-000000000001'::uuid,
          '33333333-3333-3333-3333-333333333333'::uuid,
          'customer',
          '2026-07-19 12:00:00+00'::timestamptz,
          '{"deleted_at": "2026-07-19T12:01:00Z"}'::jsonb
        ),
        (
          '30000000-0000-0000-0000-000000000002'::uuid,
          '33333333-3333-3333-3333-333333333333'::uuid,
          'customer',
          '2026-07-19 12:05:00+00'::timestamptz,
          '{}'::jsonb
        ),
        (
          '30000000-0000-0000-0000-000000000003'::uuid,
          '33333333-3333-3333-3333-333333333333'::uuid,
          'store',
          '2026-07-19 12:20:00+00'::timestamptz,
          '{}'::jsonb
        ),
        (
          '55500000-0000-0000-0000-000000000001'::uuid,
          '55555555-5555-5555-5555-555555555555'::uuid,
          'customer',
          '2026-07-19 14:00:00+00'::timestamptz,
          '{}'::jsonb
        ),
        (
          '66600000-0000-0000-0000-000000000001'::uuid,
          '66666666-6666-6666-6666-666666666666'::uuid,
          'customer',
          '2026-07-19 15:00:00+00'::timestamptz,
          '{}'::jsonb
        ),
        (
          '77700000-0000-0000-0000-000000000001'::uuid,
          '77777777-7777-7777-7777-777777777777'::uuid,
          'store',
          '2026-07-19 16:00:00+00'::timestamptz,
          '{}'::jsonb
        ),
        (
          '88800000-0000-0000-0000-000000000001'::uuid,
          '88888888-8888-8888-8888-888888888888'::uuid,
          'customer',
          '2026-07-19 17:00:00+00'::timestamptz,
          '{}'::jsonb
        ),
        (
          '88800000-0000-0000-0000-000000000002'::uuid,
          '88888888-8888-8888-8888-888888888888'::uuid,
          'support',
          '2026-07-19 17:03:00+00'::timestamptz,
          '{}'::jsonb
        ),
        (
          '99900000-0000-0000-0000-000000000001'::uuid,
          '99999999-9999-9999-9999-999999999999'::uuid,
          'customer',
          '2026-07-19 18:00:00+00'::timestamptz,
          '{}'::jsonb
        )
    ),
    synthetic_scoped as (
      select
        c.conversation_id,
        c.conversation_type,
        c.store_id,
        c.listing_id,
        c.current_status,
        c.conversation_created_at,
        c.conversation_closed_at,
        case
          when c.conversation_type in ('customer_store', 'customer_support') then 'customer'
          when c.conversation_type = 'store_support' then 'store'
          else null
        end as requester_context,
        case
          when c.conversation_type = 'customer_store' then 'store'
          when c.conversation_type in ('customer_support', 'store_support') then 'support'
          else null
        end as responder_context,
        case
          when c.conversation_type = 'customer_store' then 'store first response time'
          when c.conversation_type in ('customer_support', 'store_support') then 'support first response'
          else null
        end as metric_name
      from synthetic_conversations c
      where c.conversation_type in ('customer_store', 'customer_support', 'store_support')
    ),
    synthetic_valid_messages as (
      select
        m.message_id,
        m.conversation_id,
        m.sender_context,
        m.created_at,
        sc.requester_context,
        sc.responder_context
      from synthetic_scoped sc
      join synthetic_messages m on m.conversation_id = sc.conversation_id
      where m.sender_context in (sc.requester_context, sc.responder_context)
        and not (coalesce(m.metadata, '{}'::jsonb) ? 'deleted_at')
    ),
    synthetic_ordered_messages as (
      select
        vm.*,
        lag(vm.sender_context) over (
          partition by vm.conversation_id
          order by vm.created_at, vm.message_id
        ) as previous_sender_context
      from synthetic_valid_messages vm
    ),
    synthetic_sequenced_messages as (
      select
        om.*,
        sum(
          case
            when om.previous_sender_context is null
              or om.previous_sender_context <> om.sender_context
            then 1
            else 0
          end
        ) over (
          partition by om.conversation_id
          order by om.created_at, om.message_id
          rows between unbounded preceding and current row
        ) as side_run_id
      from synthetic_ordered_messages om
    ),
    synthetic_side_runs as (
      select
        sm.conversation_id,
        sm.sender_context,
        min(sm.created_at) as run_started_at,
        count(*)::integer as message_count_in_run,
        sm.side_run_id
      from synthetic_sequenced_messages sm
      group by
        sm.conversation_id,
        sm.sender_context,
        sm.side_run_id
    ),
    synthetic_requester_runs as (
      select
        sc.conversation_id,
        sc.conversation_type,
        sc.store_id,
        sc.listing_id,
        sc.requester_context,
        sc.responder_context,
        sc.metric_name,
        sc.current_status,
        sc.conversation_created_at,
        sc.conversation_closed_at,
        rr.run_started_at as waiting_sequence_started_at,
        rr.message_count_in_run as requester_message_count_in_sequence,
        rr.side_run_id,
        row_number() over (
          partition by sc.conversation_id
          order by rr.run_started_at, rr.side_run_id
        )::integer as sequence_ordinal,
        (
          select min(resp.run_started_at)
          from synthetic_side_runs resp
          where resp.conversation_id = rr.conversation_id
            and resp.sender_context = sc.responder_context
            and resp.side_run_id > rr.side_run_id
        ) as first_response_at
      from synthetic_scoped sc
      join synthetic_side_runs rr on rr.conversation_id = sc.conversation_id
        and rr.sender_context = sc.requester_context
    ),
    synthetic_first_requester_sequence as (
      select *
      from synthetic_requester_runs
      where sequence_ordinal = 1
    ),
    synthetic_analytics as (
      select
        rs.conversation_id,
        rs.conversation_type,
        rs.store_id,
        rs.listing_id,
        rs.metric_name,
        rs.requester_context,
        rs.responder_context,
        rs.waiting_sequence_started_at,
        rs.first_response_at,
        case
          when rs.first_response_at is null then null::bigint
          else floor(extract(epoch from (rs.first_response_at - rs.waiting_sequence_started_at)))::bigint
        end as response_seconds,
        (rs.first_response_at is not null) as is_answered,
        (
          rs.first_response_at is null
          and rs.current_status in (
            'open',
            'waiting_customer',
            'waiting_store',
            'waiting_support'
          )
        ) as is_currently_unanswered,
        rs.current_status,
        rs.conversation_created_at,
        rs.conversation_closed_at,
        rs.requester_message_count_in_sequence,
        rs.sequence_ordinal,
        'DERIVED'::text as metric_confidence,
        'PARTIAL_CURRENT_MARKERS_ONLY'::text as exclusion_quality,
        true as deleted_message_exclusion_applied,
        false as spam_exclusion_available,
        false as system_message_exclusion_available,
        false as test_data_exclusion_available
      from synthetic_first_requester_sequence rs
    ),
    expected_columns as (
      select array[
        'conversation_id',
        'conversation_type',
        'store_id',
        'listing_id',
        'metric_name',
        'requester_context',
        'responder_context',
        'waiting_sequence_started_at',
        'first_response_at',
        'response_seconds',
        'is_answered',
        'is_currently_unanswered',
        'current_status',
        'conversation_created_at',
        'conversation_closed_at',
        'requester_message_count_in_sequence',
        'sequence_ordinal',
        'metric_confidence',
        'exclusion_quality',
        'deleted_message_exclusion_applied',
        'spam_exclusion_available',
        'system_message_exclusion_available',
        'test_data_exclusion_available'
      ]::text[] as cols
    ),
    view_column_list as (
      select coalesce(array_agg(c.column_name::text order by c.ordinal_position), array[]::text[]) as cols
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'marktx_first_response_analytics_v1'
    ),
    view_relation as (
      select coalesce(c.reloptions, array[]::text[]) as reloptions
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'marktx_first_response_analytics_v1'
        and c.relkind = 'v'
    ),
    view_grants as (
      select g.grantee, g.privilege_type
      from information_schema.role_table_grants g
      where g.table_schema = 'public'
        and g.table_name = 'marktx_first_response_analytics_v1'
    ),
    analytics as (
      select *
      from public.marktx_first_response_analytics_v1
    ),
    live_support_unanswered_candidates as (
      select c.id as conversation_id, c.conversation_type
      from public.conversations c
      where c.conversation_type in ('customer_support', 'store_support')
        and exists (
          select 1
          from public.messages m
          where m.conversation_id = c.id
            and not (coalesce(m.metadata, '{}'::jsonb) ? 'deleted_at')
            and m.sender_context = case
              when c.conversation_type = 'customer_support' then 'customer'
              when c.conversation_type = 'store_support' then 'store'
              else null
            end
        )
        and not exists (
          select 1
          from public.messages m
          where m.conversation_id = c.id
            and not (coalesce(m.metadata, '{}'::jsonb) ? 'deleted_at')
            and m.sender_context = 'support'
        )
    ),
    checks as (
      select
        'synthetic_customer_store_first_response_only'::text as check_name,
        coalesce((
          select
            count(*) = 1
            and min(response_seconds) = 420
            and min(requester_message_count_in_sequence) = 2
            and bool_and(is_answered)
            and bool_and(not is_currently_unanswered)
          from synthetic_analytics
          where conversation_id = '11111111-1111-1111-1111-111111111111'::uuid
        ), false) as passed,
        'expected one first requester sequence with 420 seconds'::text as observed
      union all
      select
        'synthetic_responder_only_is_omitted',
        not exists (
          select 1
          from synthetic_analytics
          where conversation_id = '22222222-2222-2222-2222-222222222222'::uuid
        ),
        'conversation with only responder messages must not create a requester row'
      union all
      select
        'synthetic_deleted_at_timestamp_excludes_message',
        coalesce((
          select
            count(*) = 1
            and min(waiting_sequence_started_at) = '2026-07-19 12:05:00+00'::timestamptz
            and min(response_seconds) = 900
          from synthetic_analytics
          where conversation_id = '33333333-3333-3333-3333-333333333333'::uuid
        ), false),
        'metadata deleted_at string timestamp excludes the message'
      union all
      select
        'synthetic_no_message_conversation_is_omitted',
        not exists (
          select 1
          from synthetic_analytics
          where conversation_id = '44444444-4444-4444-4444-444444444444'::uuid
        ),
        'conversation without requester messages must not create a row'
      union all
      select
        'synthetic_closed_unanswered_not_current',
        coalesce((
          select
            count(*) = 1
            and bool_and(not is_answered)
            and bool_and(not is_currently_unanswered)
            and bool_and(response_seconds is null)
          from synthetic_analytics
          where conversation_id = '55555555-5555-5555-5555-555555555555'::uuid
        ), false),
        'closed unanswered conversations may remain historical but are not current unanswered'
      union all
      select
        'synthetic_customer_support_unanswered_supported',
        coalesce((
          select
            count(*) = 1
            and bool_and(conversation_type = 'customer_support')
            and bool_and(requester_context = 'customer')
            and bool_and(responder_context = 'support')
            and bool_and(metric_name = 'support first response')
            and bool_and(not is_answered)
            and bool_and(is_currently_unanswered)
          from synthetic_analytics
          where conversation_id = '66666666-6666-6666-6666-666666666666'::uuid
        ), false),
        'customer_support requester-without-support-response must be tracked'
      union all
      select
        'synthetic_store_support_unanswered_supported',
        coalesce((
          select
            count(*) = 1
            and bool_and(conversation_type = 'store_support')
            and bool_and(requester_context = 'store')
            and bool_and(responder_context = 'support')
            and bool_and(metric_name = 'support first response')
            and bool_and(not is_answered)
            and bool_and(is_currently_unanswered)
          from synthetic_analytics
          where conversation_id = '77777777-7777-7777-7777-777777777777'::uuid
        ), false),
        'store_support requester-without-support-response must be tracked'
      union all
      select
        'synthetic_customer_support_answered_supported',
        coalesce((
          select
            count(*) = 1
            and min(response_seconds) = 180
            and bool_and(is_answered)
            and bool_and(not is_currently_unanswered)
          from synthetic_analytics
          where conversation_id = '88888888-8888-8888-8888-888888888888'::uuid
        ), false),
        'customer_support first support response must be measured'
      union all
      select
        'synthetic_legacy_user_user_excluded',
        not exists (
          select 1
          from synthetic_analytics
          where conversation_id = '99999999-9999-9999-9999-999999999999'::uuid
        ),
        'legacy_user_user is outside this analytics contract'
      union all
      select
        'view_exact_column_whitelist',
        (select cols from view_column_list) = (select cols from expected_columns),
        'columns=' || coalesce(array_to_string((select cols from view_column_list), ','), '')
      union all
      select
        'view_security_invoker_enabled',
        exists (
          select 1
          from view_relation
          where 'security_invoker=true' = any(reloptions)
        ),
        'reloptions=' || coalesce(array_to_string((select reloptions from view_relation), ','), '')
      union all
      select
        'view_security_barrier_enabled',
        exists (
          select 1
          from view_relation
          where 'security_barrier=true' = any(reloptions)
        ),
        'reloptions=' || coalesce(array_to_string((select reloptions from view_relation), ','), '')
      union all
      select
        'view_no_public_anon_authenticated_select',
        not exists (
          select 1
          from view_grants
          where grantee in ('PUBLIC', 'anon', 'authenticated')
            and privilege_type = 'SELECT'
        ),
        'restricted_grants=' || (
          select count(*)::text
          from view_grants
          where grantee in ('PUBLIC', 'anon', 'authenticated')
            and privilege_type = 'SELECT'
        )
      union all
      select
        'view_service_role_select_granted',
        exists (
          select 1
          from view_grants
          where grantee = 'service_role'
            and privilege_type = 'SELECT'
        ),
        'service_role_select_grants=' || (
          select count(*)::text
          from view_grants
          where grantee = 'service_role'
            and privilege_type = 'SELECT'
        )
      union all
      select
        'view_has_table_privilege_expectations',
        not has_table_privilege('anon', 'public.marktx_first_response_analytics_v1', 'select')
        and not has_table_privilege('authenticated', 'public.marktx_first_response_analytics_v1', 'select')
        and has_table_privilege('service_role', 'public.marktx_first_response_analytics_v1', 'select'),
        'anon_select='
          || has_table_privilege('anon', 'public.marktx_first_response_analytics_v1', 'select')::text
          || ', authenticated_select='
          || has_table_privilege('authenticated', 'public.marktx_first_response_analytics_v1', 'select')::text
          || ', service_role_select='
          || has_table_privilege('service_role', 'public.marktx_first_response_analytics_v1', 'select')::text
      union all
      select
        'view_one_row_per_conversation',
        not exists (
          select 1
          from analytics
          group by conversation_id
          having count(*) > 1
        ),
        'duplicate_conversation_rows=' || (
          select count(*)::text
          from (
            select conversation_id
            from analytics
            group by conversation_id
            having count(*) > 1
          ) dup
        )
      union all
      select
        'view_sequence_ordinal_first_only',
        not exists (
          select 1
          from analytics
          where sequence_ordinal <> 1
        ),
        'non_first_sequence_rows=' || (
          select count(*)::text
          from analytics
          where sequence_ordinal <> 1
        )
      union all
      select
        'view_no_legacy_user_user_rows',
        not exists (
          select 1
          from analytics
          where conversation_type = 'legacy_user_user'
        ),
        'legacy_rows=' || (
          select count(*)::text
          from analytics
          where conversation_type = 'legacy_user_user'
        )
      union all
      select
        'view_metric_mapping_is_exact',
        not exists (
          select 1
          from analytics
          where (
            conversation_type = 'customer_store'
            and (
              requester_context <> 'customer'
              or responder_context <> 'store'
              or metric_name <> 'store first response time'
            )
          )
          or (
            conversation_type = 'customer_support'
            and (
              requester_context <> 'customer'
              or responder_context <> 'support'
              or metric_name <> 'support first response'
            )
          )
          or (
            conversation_type = 'store_support'
            and (
              requester_context <> 'store'
              or responder_context <> 'support'
              or metric_name <> 'support first response'
            )
          )
          or conversation_type not in ('customer_store', 'customer_support', 'store_support')
        ),
        'mapping_violations=' || (
          select count(*)::text
          from analytics
          where (
            conversation_type = 'customer_store'
            and (
              requester_context <> 'customer'
              or responder_context <> 'store'
              or metric_name <> 'store first response time'
            )
          )
          or (
            conversation_type = 'customer_support'
            and (
              requester_context <> 'customer'
              or responder_context <> 'support'
              or metric_name <> 'support first response'
            )
          )
          or (
            conversation_type = 'store_support'
            and (
              requester_context <> 'store'
              or responder_context <> 'support'
              or metric_name <> 'support first response'
            )
          )
          or conversation_type not in ('customer_store', 'customer_support', 'store_support')
        )
      union all
      select
        'view_response_seconds_consistent',
        not exists (
          select 1
          from analytics
          where (
            is_answered
            and (
              first_response_at is null
              or response_seconds is null
            )
          )
          or (
            not is_answered
            and (
              first_response_at is not null
              or response_seconds is not null
            )
          )
        ),
        'response_consistency_violations=' || (
          select count(*)::text
          from analytics
          where (
            is_answered
            and (
              first_response_at is null
              or response_seconds is null
            )
          )
          or (
            not is_answered
            and (
              first_response_at is not null
              or response_seconds is not null
            )
          )
        )
      union all
      select
        'view_response_seconds_not_negative',
        not exists (
          select 1
          from analytics
          where response_seconds < 0
        ),
        'negative_response_rows=' || (
          select count(*)::text
          from analytics
          where response_seconds < 0
        )
      union all
      select
        'view_current_unanswered_semantics',
        not exists (
          select 1
          from analytics
          where is_currently_unanswered is distinct from (
            first_response_at is null
            and current_status in (
              'open',
              'waiting_customer',
              'waiting_store',
              'waiting_support'
            )
          )
        ),
        'unanswered_semantic_violations=' || (
          select count(*)::text
          from analytics
          where is_currently_unanswered is distinct from (
            first_response_at is null
            and current_status in (
              'open',
              'waiting_customer',
              'waiting_store',
              'waiting_support'
            )
          )
        )
      union all
      select
        'view_closed_or_resolved_not_current_unanswered',
        not exists (
          select 1
          from analytics
          where current_status in ('closed', 'resolved')
            and is_currently_unanswered
        ),
        'closed_current_unanswered_rows=' || (
          select count(*)::text
          from analytics
          where current_status in ('closed', 'resolved')
            and is_currently_unanswered
        )
      union all
      select
        'view_quality_flags_are_declared',
        not exists (
          select 1
          from analytics
          where metric_confidence <> 'DERIVED'
            or exclusion_quality <> 'PARTIAL_CURRENT_MARKERS_ONLY'
            or deleted_message_exclusion_applied is distinct from true
            or spam_exclusion_available is distinct from false
            or system_message_exclusion_available is distinct from false
            or test_data_exclusion_available is distinct from false
        ),
        'quality_flag_violations=' || (
          select count(*)::text
          from analytics
          where metric_confidence <> 'DERIVED'
            or exclusion_quality <> 'PARTIAL_CURRENT_MARKERS_ONLY'
            or deleted_message_exclusion_applied is distinct from true
            or spam_exclusion_available is distinct from false
            or system_message_exclusion_available is distinct from false
            or test_data_exclusion_available is distinct from false
        )
      union all
      select
        'view_live_support_unanswered_candidates_reflected',
        not exists (
          select 1
          from live_support_unanswered_candidates cand
          where not exists (
            select 1
            from analytics a
            where a.conversation_id = cand.conversation_id
              and a.conversation_type = cand.conversation_type
              and a.first_response_at is null
              and a.response_seconds is null
              and not a.is_answered
          )
        ),
        'live_support_unanswered_candidates=' || (
          select count(*)::text
          from live_support_unanswered_candidates
        )
    )
    select check_name, passed, observed
    from checks
    order by check_name
  loop
    checked_count := checked_count + 1;
    raise notice '% | % | %',
      rec.check_name,
      case when rec.passed then 'PASS' else 'FAIL' end,
      rec.observed;

    if rec.passed is distinct from true then
      failed_checks := case
        when failed_checks = '' then rec.check_name
        else failed_checks || ', ' || rec.check_name
      end;
    end if;
  end loop;

  if checked_count = 0 then
    raise exception 'first_response_analytics_verification_failed: no checks executed';
  end if;

  if failed_checks <> '' then
    raise exception 'first_response_analytics_verification_failed: %', failed_checks;
  end if;

  raise notice 'first_response_analytics_verification_passed: % checks', checked_count;
end
$$;
