-- MarktX support-agent scoped admin support access.
--
-- Additive/compatibility intent:
-- - Adds the support_agent profile role as a support-only role.
-- - Keeps existing admin and moderator support access.
-- - Does not grant support_agent access to listing/store/admin management.
-- - Does not expose message bodies in queue summaries.
-- - Does not weaken customer_store privacy.

begin;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role is null or role in ('user', 'admin', 'moderator', 'support_agent'))
  not valid;

create or replace function public.marktx_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.marktx_is_support_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'moderator', 'support_agent')
  );
$$;

create or replace function public.marktx_can_access_support_panel()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.marktx_is_support_staff();
$$;

-- Backward-compatible alias used by existing messaging policies/RPCs.
create or replace function public.marktx_is_support_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.marktx_is_support_staff();
$$;

create or replace function public.list_admin_support_conversations(
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  conversation_type text,
  status text,
  store_id uuid,
  store_name text,
  store_slug text,
  customer_user_id uuid,
  support_topic text,
  subject text,
  assigned_admin_id uuid,
  last_message_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
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

  if not public.marktx_can_access_support_panel() then
    raise exception 'support_access_denied' using errcode = '42501';
  end if;

  return query
  select
    c.id,
    c.conversation_type,
    c.status,
    c.store_id,
    s.name,
    s.slug,
    c.customer_user_id,
    c.support_topic,
    c.subject,
    c.assigned_admin_id,
    c.last_message_at,
    c.created_at,
    c.updated_at
  from public.conversations c
  left join public.stores s on s.id = c.store_id
  where c.conversation_type in ('customer_support', 'store_support')
    and c.status in ('open', 'waiting_customer', 'waiting_store', 'waiting_support')
  order by
    coalesce(c.last_message_at, c.updated_at) desc,
    c.updated_at desc,
    c.id desc
  limit v_limit
  offset v_offset;
end;
$$;

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

  if not public.marktx_can_access_support_panel() then
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

create or replace function public.get_audited_customer_store_conversation(
  p_conversation_id uuid,
  p_access_reason text,
  p_metadata jsonb default '{}'::jsonb
)
returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation public.conversations;
begin
  if auth.uid() is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if not public.marktx_can_access_support_panel() then
    raise exception 'support_access_denied' using errcode = '42501';
  end if;
  if p_access_reason not in ('reported', 'escalated', 'moderation', 'legal', 'security', 'support_assignment') then
    raise exception 'invalid_access_reason' using errcode = '23514';
  end if;

  select * into v_conversation
  from public.conversations
  where id = p_conversation_id
    and conversation_type = 'customer_store'
    and (
      reported_at is not null
      or exists (
        select 1
        from public.conversation_access_audit caa_scope
        where caa_scope.conversation_id = p_conversation_id
          and caa_scope.access_reason in ('escalated', 'moderation', 'legal', 'security', 'support_assignment')
      )
    );

  if not found then
    raise exception 'audited_customer_store_conversation_not_available' using errcode = '42501';
  end if;

  insert into public.conversation_access_audit (
    conversation_id,
    actor_id,
    access_reason,
    metadata
  )
  values (
    p_conversation_id,
    auth.uid(),
    p_access_reason,
    case
      when p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then '{}'::jsonb
      when octet_length(p_metadata::text) > 4096 then '{}'::jsonb
      else p_metadata
    end
  );

  return v_conversation;
end;
$$;

create or replace function public.get_audited_store_support_conversation(
  p_conversation_id uuid,
  p_access_reason text,
  p_metadata jsonb default '{}'::jsonb
)
returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation public.conversations;
begin
  if auth.uid() is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  if not public.marktx_can_access_support_panel() then
    raise exception 'support_access_denied' using errcode = '42501';
  end if;

  if p_access_reason not in ('support_assignment', 'moderation', 'security') then
    raise exception 'invalid_access_reason' using errcode = '23514';
  end if;

  select * into v_conversation
  from public.conversations
  where id = p_conversation_id
    and conversation_type = 'store_support';

  if not found then
    raise exception 'audited_store_support_conversation_not_available' using errcode = '42501';
  end if;

  insert into public.conversation_access_audit (
    conversation_id,
    actor_id,
    access_reason,
    metadata
  )
  values (
    p_conversation_id,
    auth.uid(),
    p_access_reason,
    case
      when p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then '{}'::jsonb
      when octet_length(p_metadata::text) > 4096 then '{}'::jsonb
      else p_metadata
    end
  );

  return v_conversation;
end;
$$;

revoke all on function public.marktx_is_admin() from public, anon;
revoke all on function public.marktx_is_support_staff() from public, anon;
revoke all on function public.marktx_can_access_support_panel() from public, anon;
revoke all on function public.marktx_is_support_admin() from public, anon;
revoke all on function public.list_admin_support_conversations(integer, integer) from public, anon;
revoke all on function public.list_reported_customer_store_conversations(integer, integer) from public, anon;
revoke all on function public.get_audited_customer_store_conversation(uuid, text, jsonb) from public, anon;
revoke all on function public.get_audited_store_support_conversation(uuid, text, jsonb) from public, anon;

grant execute on function public.marktx_is_admin() to authenticated;
grant execute on function public.marktx_is_support_staff() to authenticated;
grant execute on function public.marktx_can_access_support_panel() to authenticated;
grant execute on function public.marktx_is_support_admin() to authenticated;
grant execute on function public.list_admin_support_conversations(integer, integer) to authenticated;
grant execute on function public.list_reported_customer_store_conversations(integer, integer) to authenticated;
grant execute on function public.get_audited_customer_store_conversation(uuid, text, jsonb) to authenticated;
grant execute on function public.get_audited_store_support_conversation(uuid, text, jsonb) to authenticated;

comment on function public.marktx_is_admin() is
  'True only for full MarktX administrators.';
comment on function public.marktx_is_support_staff() is
  'True for admin, moderator, or support_agent roles that may operate support queues.';
comment on function public.marktx_can_access_support_panel() is
  'Route/RPC authorization helper for the web admin support panel.';
comment on function public.marktx_is_support_admin() is
  'Compatibility alias for support-staff checks; prefer marktx_is_support_staff or marktx_can_access_support_panel in new code.';
comment on constraint profiles_role_check on public.profiles is
  'Allowed profile roles. support_agent is support-panel only and must be assigned through a privileged manual/admin path.';

commit;
