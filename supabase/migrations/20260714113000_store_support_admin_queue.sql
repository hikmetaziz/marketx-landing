-- MarktX store-support admin queue and audited detail access.
--
-- Additive only:
-- - Does not grant broad admin SELECT access.
-- - Does not expose message bodies in queue results.
-- - Does not modify customer_store, customer_support, legacy data, or RLS enforcement.

begin;

create index if not exists conversations_support_admin_queue_idx
  on public.conversations (conversation_type, status, last_message_at desc, updated_at desc, id)
  where conversation_type in ('customer_support', 'store_support');

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

  if not public.marktx_is_support_admin() then
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

  if not public.marktx_is_support_admin() then
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

create or replace function public.marktx_can_select_message_after_store_support_audit(
  p_conversation_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_conversation public.conversations;
begin
  if auth.uid() is null then
    return false;
  end if;

  select * into v_conversation
  from public.conversations
  where id = p_conversation_id;

  if not found then
    return false;
  end if;

  if v_conversation.conversation_type <> 'store_support' then
    return public.marktx_can_access_conversation(p_conversation_id);
  end if;

  if public.marktx_store_member_has_role(v_conversation.store_id, auth.uid(), array['owner', 'manager', 'staff']) then
    return true;
  end if;

  if not public.marktx_is_support_admin() then
    return false;
  end if;

  return exists (
    select 1
    from public.conversation_access_audit caa
    where caa.conversation_id = p_conversation_id
      and caa.actor_id = auth.uid()
      and caa.access_reason in ('support_assignment', 'moderation', 'security')
      and caa.created_at >= now() - interval '30 minutes'
  );
end;
$$;

drop policy if exists "messages_select_accessible_phase2" on public.messages;
create policy "messages_select_accessible_phase2"
  on public.messages for select to authenticated
  using (public.marktx_can_select_message_after_store_support_audit(conversation_id));

revoke all on function public.list_admin_support_conversations(integer, integer) from public, anon;
revoke all on function public.get_audited_store_support_conversation(uuid, text, jsonb) from public, anon;
revoke all on function public.marktx_can_select_message_after_store_support_audit(uuid) from public, anon;

grant execute on function public.list_admin_support_conversations(integer, integer) to authenticated;
grant execute on function public.get_audited_store_support_conversation(uuid, text, jsonb) to authenticated;
grant execute on function public.marktx_can_select_message_after_store_support_audit(uuid) to authenticated;

comment on function public.list_admin_support_conversations(integer, integer) is
  'Admin/moderator queue for customer_support and store_support conversation summaries. Metadata only; no message bodies.';

comment on function public.get_audited_store_support_conversation(uuid, text, jsonb) is
  'Audited admin/moderator detail gate for store_support conversations only.';

comment on function public.marktx_can_select_message_after_store_support_audit(uuid) is
  'Preserves existing message access except store_support support/admin reads, which require a recent audited detail access record.';

commit;
