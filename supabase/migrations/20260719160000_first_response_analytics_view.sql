-- MarktX first-response analytics view v1.
--
-- Prepared only; do not apply without review.
-- This migration intentionally creates a new view and does not replace an
-- existing object.
-- If this view already exists in a live database, stop and review the
-- previous definition instead of silently replacing an analytics contract.
--
-- Purpose:
-- - Derive one privacy-safe first-response row per eligible conversation.
-- - Provide DERIVED metrics only, not contractual SLA.
-- - Exclude legacy_user_user and soft-deleted messages.
-- - Do not expose message bodies, user contact data, profile names, or raw metadata.
-- - Soft-delete semantics mirror the message delete RPC/UI: metadata.deleted_at
--   is added only when a message is soft-deleted.

begin;

create view public.marktx_first_response_analytics_v1
with (security_invoker = true, security_barrier = true)
as
with scoped_conversations as (
  select
    c.id as conversation_id,
    c.conversation_type,
    c.store_id,
    c.listing_id,
    c.status as current_status,
    c.created_at as conversation_created_at,
    c.closed_at as conversation_closed_at,
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
  from public.conversations c
  where c.conversation_type in ('customer_store', 'customer_support', 'store_support')
),
valid_messages as (
  select
    m.id,
    m.conversation_id,
    m.sender_context,
    m.created_at,
    sc.requester_context,
    sc.responder_context
  from scoped_conversations sc
  join public.messages m on m.conversation_id = sc.conversation_id
  where m.sender_context in (sc.requester_context, sc.responder_context)
    and not (coalesce(m.metadata, '{}'::jsonb) ? 'deleted_at')
),
ordered_messages as (
  select
    vm.*,
    lag(vm.sender_context) over (
      partition by vm.conversation_id
      order by vm.created_at, vm.id
    ) as previous_sender_context
  from valid_messages vm
),
sequenced_messages as (
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
      order by om.created_at, om.id
      rows between unbounded preceding and current row
    ) as side_run_id
  from ordered_messages om
),
side_runs as (
  select
    sm.conversation_id,
    sm.sender_context,
    min(sm.created_at) as run_started_at,
    max(sm.created_at) as run_last_message_at,
    count(*)::integer as message_count_in_run,
    sm.side_run_id
  from sequenced_messages sm
  group by
    sm.conversation_id,
    sm.sender_context,
    sm.side_run_id
),
requester_runs as (
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
      from side_runs resp
      where resp.conversation_id = rr.conversation_id
        and resp.sender_context = sc.responder_context
        and resp.side_run_id > rr.side_run_id
    ) as first_response_at
  from scoped_conversations sc
  join side_runs rr on rr.conversation_id = sc.conversation_id
    and rr.sender_context = sc.requester_context
),
first_requester_sequence as (
  select *
  from requester_runs
  where sequence_ordinal = 1
)
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
from first_requester_sequence rs;

comment on view public.marktx_first_response_analytics_v1 is
  'Privacy-safe derived first-response analytics: one row per eligible conversation first requester-side waiting sequence. Omits message bodies and contact data. Not contractual SLA; no status or assignment history is preserved.';

revoke all on table public.marktx_first_response_analytics_v1 from PUBLIC, anon, authenticated;
grant select on table public.marktx_first_response_analytics_v1 to service_role;

commit;
