-- MarktX admin support: expose last message body in support queue summaries.
-- Additive only.

begin;

-- 1) Add last_message_body to conversations for admin queue previews.
alter table public.conversations
  add column if not exists last_message_body text;

-- 2) Update touch trigger to also store the latest message body.
create or replace function public.marktx_touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set
    updated_at = now(),
    last_message_at = new.created_at,
    last_message_body = new.body,
    status = case
      when conversation_type = 'customer_store' and new.sender_context = 'customer' then 'waiting_store'
      when conversation_type = 'customer_store' and new.sender_context = 'store' then 'waiting_customer'
      when conversation_type in ('customer_support', 'store_support') and new.sender_context <> 'support' then 'waiting_support'
      when conversation_type in ('customer_support', 'store_support') and new.sender_context = 'support' then 'waiting_customer'
      else status
    end
  where id = new.conversation_id;
  return new;
end;
$$;

-- 3) Update admin support queue function to return last_message_body.
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
  last_message_body text,
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
    c.last_message_body,
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

-- 4) Backfill existing conversations with their latest message body.
update public.conversations c
set last_message_body = m.body
from (
  select distinct on (conversation_id)
    conversation_id,
    body
  from public.messages
  order by conversation_id, created_at desc
) m
where c.id = m.conversation_id
  and c.last_message_body is null;

commit;
