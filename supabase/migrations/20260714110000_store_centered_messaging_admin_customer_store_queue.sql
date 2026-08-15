-- MarktX Phase B1: restricted admin queue for reported/escalated customer-store conversations.
--
-- Additive only:
-- - Does not add direct admin SELECT access to private customer_store chats.
-- - Does not expose message bodies.
-- - Detail access remains through public.get_audited_customer_store_conversation(...).

begin;

create index if not exists conversations_customer_store_reported_queue_idx
  on public.conversations (reported_at desc, updated_at desc, id)
  where conversation_type = 'customer_store'
    and reported_at is not null;

create index if not exists conversation_access_audit_escalated_queue_idx
  on public.conversation_access_audit (access_reason, conversation_id, created_at desc)
  where access_reason in ('escalated', 'moderation', 'legal', 'security', 'support_assignment');

create or replace function public.list_reported_customer_store_conversations(
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  status text,
  queue_reason text,
  store_id uuid,
  store_name text,
  store_slug text,
  listing_id uuid,
  listing_title text,
  listing_slug text,
  subject text,
  reported_at timestamptz,
  escalated_at timestamptz,
  last_message_at timestamptz,
  updated_at timestamptz,
  report_count bigint,
  latest_report_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if auth.uid() is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  if not public.marktx_is_support_admin() then
    raise exception 'support_access_denied' using errcode = '42501';
  end if;

  return query
  with scoped as (
    select
      c.id as conversation_id,
      c.status as conversation_status,
      case when c.reported_at is not null then 'reported' else 'escalated' end as conversation_queue_reason,
      c.store_id as conversation_store_id,
      s.name as conversation_store_name,
      s.slug as conversation_store_slug,
      c.listing_id as conversation_listing_id,
      l.title as conversation_listing_title,
      l.slug as conversation_listing_slug,
      c.subject as conversation_subject,
      c.reported_at as conversation_reported_at,
      (
        select max(caa.created_at)
        from public.conversation_access_audit caa
        where caa.conversation_id = c.id
          and caa.access_reason in ('escalated', 'moderation', 'legal', 'security', 'support_assignment')
      ) as conversation_escalated_at,
      c.last_message_at as conversation_last_message_at,
      c.updated_at as conversation_updated_at,
      (
        select count(*)::bigint
        from public.reports r
        where r.target_type = 'conversation'
          and r.conversation_id = c.id
      ) as conversation_report_count,
      (
        select max(r.created_at)
        from public.reports r
        where r.target_type = 'conversation'
          and r.conversation_id = c.id
      ) as conversation_latest_report_at
    from public.conversations c
    left join public.stores s on s.id = c.store_id
    left join public.listings l on l.id = c.listing_id
    where c.conversation_type = 'customer_store'
      and (
        c.reported_at is not null
        or exists (
          select 1
          from public.conversation_access_audit caa_scope
          where caa_scope.conversation_id = c.id
            and caa_scope.access_reason in ('escalated', 'moderation', 'legal', 'security', 'support_assignment')
        )
      )
  )
  select
    scoped.conversation_id,
    scoped.conversation_status,
    scoped.conversation_queue_reason,
    scoped.conversation_store_id,
    scoped.conversation_store_name,
    scoped.conversation_store_slug,
    scoped.conversation_listing_id,
    scoped.conversation_listing_title,
    scoped.conversation_listing_slug,
    scoped.conversation_subject,
    scoped.conversation_reported_at,
    scoped.conversation_escalated_at,
    scoped.conversation_last_message_at,
    scoped.conversation_updated_at,
    scoped.conversation_report_count,
    scoped.conversation_latest_report_at
  from scoped
  order by
    greatest(
      coalesce(scoped.conversation_reported_at, '1970-01-01 00:00:00+00'::timestamptz),
      coalesce(scoped.conversation_escalated_at, '1970-01-01 00:00:00+00'::timestamptz),
      coalesce(scoped.conversation_last_message_at, '1970-01-01 00:00:00+00'::timestamptz),
      scoped.conversation_updated_at
    ) desc,
    scoped.conversation_updated_at desc,
    scoped.conversation_id desc
  limit v_limit
  offset v_offset;
end;
$$;

revoke all on function public.list_reported_customer_store_conversations(integer, integer) from public, anon;
grant execute on function public.list_reported_customer_store_conversations(integer, integer) to authenticated;

comment on function public.list_reported_customer_store_conversations(integer, integer) is
  'Restricted admin/moderator queue for reported or explicitly escalated customer-store conversation summaries. Returns metadata only; message bodies and broad private chat browsing stay blocked.';

commit;
