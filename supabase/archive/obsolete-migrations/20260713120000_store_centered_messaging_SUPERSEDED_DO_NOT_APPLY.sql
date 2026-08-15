-- SUPERSEDED / DO NOT APPLY.
--
-- The original single-step Phase 2 migration could break deployed web/mobile
-- clients because they still create legacy conversations and messages through
-- direct table inserts. Use the phased rollout instead:
-- 1) 20260713120000_store_centered_messaging_foundation.sql
-- 2) deploy web/mobile RPC cutover
-- 3) 20260713121000_store_centered_messaging_enforcement.sql
do $$
begin
  raise exception 'superseded_migration_use_store_centered_messaging_foundation_then_enforcement';
end $$;

-- Legacy body retained below only for review history. It is unreachable.
-- MarktX Phase 2: store-centered messaging foundation.
-- Status: PREPARED ONLY. Do not apply to production without staging verification.
--
-- Design goals:
-- - Preserve existing conversations/messages and legacy buyer/seller semantics.
-- - Add customer-store, customer-support and store-support conversations.
-- - Keep store access dynamic through public.store_members.
-- - Avoid broad admin access to private customer-store chats.
-- - Use RPCs for creation, message insertion, read-state, close and report actions.

begin;

-- ---------------------------------------------------------------------------
-- 1) Canonical contract constraints on existing tables
-- ---------------------------------------------------------------------------

alter table public.conversations
  add column if not exists conversation_type text,
  add column if not exists customer_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists store_id uuid references public.stores(id) on delete set null,
  add column if not exists subject text,
  add column if not exists support_topic text,
  add column if not exists assigned_admin_id uuid references auth.users(id) on delete set null,
  add column if not exists status text,
  add column if not exists last_message_at timestamptz,
  add column if not exists reported_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists closed_at timestamptz;

update public.conversations
set
  conversation_type = coalesce(conversation_type, 'legacy_user_user'),
  status = coalesce(status, 'open'),
  customer_user_id = coalesce(customer_user_id, buyer_id),
  last_message_at = coalesce(last_message_at, updated_at, created_at)
where conversation_type is null
   or status is null
   or customer_user_id is null
   or last_message_at is null;

alter table public.conversations
  alter column conversation_type set default 'legacy_user_user',
  alter column status set default 'open';

alter table public.conversations
  drop constraint if exists conversations_type_check,
  add constraint conversations_type_check check (
    conversation_type in (
      'legacy_user_user',
      'customer_store',
      'customer_support',
      'store_support'
    )
  );

alter table public.conversations
  drop constraint if exists conversations_status_check,
  add constraint conversations_status_check check (
    status in (
      'open',
      'waiting_customer',
      'waiting_store',
      'waiting_support',
      'resolved',
      'closed'
    )
  );

alter table public.conversations
  drop constraint if exists conversations_support_topic_check,
  add constraint conversations_support_topic_check check (
    support_topic is null
    or support_topic in (
      'account',
      'store_or_product_complaint',
      'incorrect_price',
      'technical_problem',
      'claim',
      'product_import',
      'subscription',
      'moderation',
      'store_information',
      'other'
    )
  );

alter table public.conversations
  drop constraint if exists conversations_phase2_shape_check,
  add constraint conversations_phase2_shape_check check (
    (
      conversation_type = 'legacy_user_user'
      and listing_id is not null
      and buyer_id is not null
      and seller_id is not null
      and buyer_id <> seller_id
    )
    or (
      conversation_type = 'customer_store'
      and customer_user_id is not null
      and store_id is not null
    )
    or (
      conversation_type = 'customer_support'
      and customer_user_id is not null
      and store_id is null
    )
    or (
      conversation_type = 'store_support'
      and store_id is not null
    )
  );

create index if not exists conversations_type_status_idx
  on public.conversations (conversation_type, status, last_message_at desc);

create index if not exists conversations_customer_user_idx
  on public.conversations (customer_user_id, last_message_at desc);

create index if not exists conversations_store_idx
  on public.conversations (store_id, last_message_at desc)
  where store_id is not null;

create unique index if not exists conversations_customer_store_listing_open_idx
  on public.conversations (customer_user_id, store_id, listing_id)
  where conversation_type = 'customer_store'
    and listing_id is not null
    and status in ('open', 'waiting_customer', 'waiting_store', 'waiting_support');

create unique index if not exists conversations_customer_store_general_open_idx
  on public.conversations (customer_user_id, store_id)
  where conversation_type = 'customer_store'
    and listing_id is null
    and status in ('open', 'waiting_customer', 'waiting_store', 'waiting_support');

create unique index if not exists conversations_customer_support_topic_open_idx
  on public.conversations (customer_user_id, coalesce(support_topic, 'other'))
  where conversation_type = 'customer_support'
    and status in ('open', 'waiting_customer', 'waiting_store', 'waiting_support');

create unique index if not exists conversations_store_support_topic_open_idx
  on public.conversations (store_id, coalesce(support_topic, 'other'))
  where conversation_type = 'store_support'
    and status in ('open', 'waiting_customer', 'waiting_store', 'waiting_support');

alter table public.messages
  add column if not exists sender_context text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.messages
set sender_context = 'legacy_user'
where sender_context is null;

alter table public.messages
  alter column sender_context set default 'legacy_user';

alter table public.messages
  drop constraint if exists messages_sender_context_check,
  add constraint messages_sender_context_check check (
    sender_context in ('customer', 'store', 'support', 'legacy_user')
  );

create index if not exists messages_sender_context_idx
  on public.messages (sender_context, created_at desc);

-- ---------------------------------------------------------------------------
-- 2) Read state and privacy audit
-- ---------------------------------------------------------------------------

create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_message_id uuid references public.messages(id) on delete set null,
  last_read_at timestamptz not null default now(),
  archived_at timestamptz,
  muted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists conversation_reads_user_idx
  on public.conversation_reads (user_id, updated_at desc);

create table if not exists public.conversation_access_audit (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  access_reason text not null check (
    access_reason in ('reported', 'escalated', 'moderation', 'legal', 'security', 'support_assignment')
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists conversation_access_audit_conversation_idx
  on public.conversation_access_audit (conversation_id, created_at desc);

create table if not exists public.conversation_blocks (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_by uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now(),
  unique (store_id, customer_user_id)
);

-- ---------------------------------------------------------------------------
-- 3) Helper functions
-- ---------------------------------------------------------------------------

create or replace function public.marktx_store_member_has_role(
  p_store_id uuid,
  p_user_id uuid,
  p_allowed_roles text[] default array['owner', 'manager', 'staff']
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.store_members sm
    join public.stores s on s.id = sm.store_id
    where sm.store_id = p_store_id
      and sm.user_id = p_user_id
      and sm.role = any(p_allowed_roles)
      and s.status = 'claimed'
  );
$$;

create or replace function public.marktx_is_support_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'moderator')
  );
$$;

create or replace function public.marktx_can_access_conversation(p_conversation_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v public.conversations;
begin
  select * into v from public.conversations where id = p_conversation_id;
  if not found or auth.uid() is null then
    return false;
  end if;

  if v.conversation_type = 'legacy_user_user' then
    return auth.uid() = v.buyer_id or auth.uid() = v.seller_id;
  end if;

  if v.conversation_type = 'customer_store' then
    if auth.uid() = v.customer_user_id then
      return true;
    end if;
    if public.marktx_store_member_has_role(v.store_id, auth.uid(), array['owner', 'manager', 'staff']) then
      return true;
    end if;
    return v.reported_at is not null and public.marktx_is_support_admin();
  end if;

  if v.conversation_type = 'customer_support' then
    return auth.uid() = v.customer_user_id or public.marktx_is_support_admin();
  end if;

  if v.conversation_type = 'store_support' then
    return public.marktx_store_member_has_role(v.store_id, auth.uid(), array['owner', 'manager', 'staff'])
      or public.marktx_is_support_admin();
  end if;

  return false;
end;
$$;

create or replace function public.marktx_resolve_sender_context(
  p_conversation public.conversations,
  p_requested_context text
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  if p_conversation.conversation_type = 'legacy_user_user' then
    if auth.uid() in (p_conversation.buyer_id, p_conversation.seller_id) then
      return 'legacy_user';
    end if;
    raise exception 'conversation_access_denied' using errcode = '42501';
  end if;

  if p_conversation.conversation_type = 'customer_store' then
    if auth.uid() = p_conversation.customer_user_id then
      return 'customer';
    end if;
    if public.marktx_store_member_has_role(p_conversation.store_id, auth.uid(), array['owner', 'manager', 'staff']) then
      return 'store';
    end if;
    raise exception 'conversation_access_denied' using errcode = '42501';
  end if;

  if p_conversation.conversation_type = 'customer_support' then
    if auth.uid() = p_conversation.customer_user_id then
      return 'customer';
    end if;
    if public.marktx_is_support_admin() then
      return 'support';
    end if;
    raise exception 'conversation_access_denied' using errcode = '42501';
  end if;

  if p_conversation.conversation_type = 'store_support' then
    if public.marktx_store_member_has_role(p_conversation.store_id, auth.uid(), array['owner', 'manager', 'staff']) then
      return 'store';
    end if;
    if public.marktx_is_support_admin() then
      return 'support';
    end if;
    raise exception 'conversation_access_denied' using errcode = '42501';
  end if;

  raise exception 'unknown_conversation_type' using errcode = '23514';
end;
$$;

create or replace function public.marktx_touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set
    updated_at = now(),
    last_message_at = new.created_at,
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

drop trigger if exists messages_touch_conversation on public.messages;
drop trigger if exists marktx_messages_touch_conversation on public.messages;
create trigger marktx_messages_touch_conversation
  after insert on public.messages
  for each row
  execute function public.marktx_touch_conversation();

create or replace function public.marktx_conversation_reads_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists conversation_reads_set_updated_at on public.conversation_reads;
create trigger conversation_reads_set_updated_at
  before update on public.conversation_reads
  for each row
  execute function public.marktx_conversation_reads_set_updated_at();

-- ---------------------------------------------------------------------------
-- 4) Secure RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_or_create_customer_store_conversation(
  p_store_id uuid,
  p_listing_id uuid default null,
  p_subject text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_store public.stores;
  v_listing record;
  v_conversation_id uuid;
begin
  if v_user_id is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  select * into v_store from public.stores where id = p_store_id;
  if not found or v_store.status <> 'claimed' then
    raise exception 'store_not_messageable' using errcode = '23514';
  end if;

  if public.marktx_store_member_has_role(p_store_id, v_user_id, array['owner', 'manager', 'staff']) then
    raise exception 'store_member_cannot_message_own_store' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.conversation_blocks b
    where b.store_id = p_store_id and b.customer_user_id = v_user_id
  ) then
    raise exception 'customer_store_contact_blocked' using errcode = '42501';
  end if;

  if p_listing_id is not null then
    select id, store_id, status into v_listing
    from public.listings
    where id = p_listing_id;

    if not found then
      raise exception 'listing_not_found' using errcode = '23514';
    end if;
    if v_listing.store_id is distinct from p_store_id then
      raise exception 'listing_store_mismatch' using errcode = '23514';
    end if;
    if v_listing.status::text <> 'active' then
      raise exception 'listing_not_messageable' using errcode = '23514';
    end if;
  end if;

  select id into v_conversation_id
  from public.conversations
  where conversation_type = 'customer_store'
    and customer_user_id = v_user_id
    and store_id = p_store_id
    and status in ('open', 'waiting_customer', 'waiting_store', 'waiting_support')
    and (
      (p_listing_id is null and listing_id is null)
      or (p_listing_id is not null and listing_id = p_listing_id)
    )
  order by created_at asc
  limit 1;

  if v_conversation_id is null then
    insert into public.conversations (
      conversation_type,
      customer_user_id,
      store_id,
      listing_id,
      subject,
      status,
      last_message_at
    )
    values (
      'customer_store',
      v_user_id,
      p_store_id,
      p_listing_id,
      nullif(btrim(p_subject), ''),
      'open',
      now()
    )
    returning id into v_conversation_id;
  end if;

  return v_conversation_id;
end;
$$;

create or replace function public.get_or_create_customer_support_conversation(
  p_support_topic text default 'other',
  p_subject text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_topic text := coalesce(nullif(btrim(p_support_topic), ''), 'other');
  v_conversation_id uuid;
begin
  if v_user_id is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if v_topic not in ('account', 'store_or_product_complaint', 'incorrect_price', 'technical_problem', 'other') then
    raise exception 'invalid_support_topic' using errcode = '23514';
  end if;

  select id into v_conversation_id
  from public.conversations
  where conversation_type = 'customer_support'
    and customer_user_id = v_user_id
    and coalesce(support_topic, 'other') = v_topic
    and status in ('open', 'waiting_customer', 'waiting_store', 'waiting_support')
  order by created_at asc
  limit 1;

  if v_conversation_id is null then
    insert into public.conversations (
      conversation_type,
      customer_user_id,
      support_topic,
      subject,
      status,
      last_message_at
    )
    values (
      'customer_support',
      v_user_id,
      v_topic,
      nullif(btrim(p_subject), ''),
      'open',
      now()
    )
    returning id into v_conversation_id;
  end if;

  return v_conversation_id;
end;
$$;

create or replace function public.get_or_create_store_support_conversation(
  p_store_id uuid,
  p_support_topic text default 'other',
  p_subject text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_topic text := coalesce(nullif(btrim(p_support_topic), ''), 'other');
  v_conversation_id uuid;
begin
  if v_user_id is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if v_topic not in ('claim', 'product_import', 'subscription', 'moderation', 'store_information', 'technical_problem', 'other') then
    raise exception 'invalid_support_topic' using errcode = '23514';
  end if;
  if not public.marktx_store_member_has_role(p_store_id, v_user_id, array['owner', 'manager', 'staff']) then
    raise exception 'store_access_denied' using errcode = '42501';
  end if;

  select id into v_conversation_id
  from public.conversations
  where conversation_type = 'store_support'
    and store_id = p_store_id
    and coalesce(support_topic, 'other') = v_topic
    and status in ('open', 'waiting_customer', 'waiting_store', 'waiting_support')
  order by created_at asc
  limit 1;

  if v_conversation_id is null then
    insert into public.conversations (
      conversation_type,
      store_id,
      support_topic,
      subject,
      status,
      last_message_at
    )
    values (
      'store_support',
      p_store_id,
      v_topic,
      nullif(btrim(p_subject), ''),
      'open',
      now()
    )
    returning id into v_conversation_id;
  end if;

  return v_conversation_id;
end;
$$;

create or replace function public.send_conversation_message(
  p_conversation_id uuid,
  p_body text,
  p_sender_context text default null
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation public.conversations;
  v_context text;
  v_message public.messages;
begin
  if v_user_id is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if nullif(btrim(coalesce(p_body, '')), '') is null then
    raise exception 'message_body_required' using errcode = '23514';
  end if;

  select * into v_conversation
  from public.conversations
  where id = p_conversation_id;

  if not found then
    raise exception 'conversation_not_found' using errcode = '23514';
  end if;

  if v_conversation.status in ('resolved', 'closed') then
    raise exception 'conversation_closed' using errcode = '23514';
  end if;

  if v_conversation.conversation_type = 'legacy_user_user' then
    raise exception 'new_legacy_messages_disabled' using errcode = '23514';
  end if;

  v_context := public.marktx_resolve_sender_context(v_conversation, p_sender_context);

  insert into public.messages (conversation_id, sender_id, body, sender_context)
  values (p_conversation_id, v_user_id, btrim(p_body), v_context)
  returning * into v_message;

  insert into public.conversation_reads (
    conversation_id,
    user_id,
    last_read_message_id,
    last_read_at
  )
  values (
    p_conversation_id,
    v_user_id,
    v_message.id,
    now()
  )
  on conflict (conversation_id, user_id) do update
  set
    last_read_message_id = excluded.last_read_message_id,
    last_read_at = excluded.last_read_at,
    updated_at = now();

  return v_message;
end;
$$;

create or replace function public.mark_conversation_read(
  p_conversation_id uuid,
  p_last_read_message_id uuid default null
)
returns public.conversation_reads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_read public.conversation_reads;
begin
  if v_user_id is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if not public.marktx_can_access_conversation(p_conversation_id) then
    raise exception 'conversation_access_denied' using errcode = '42501';
  end if;
  if p_last_read_message_id is not null and not exists (
    select 1 from public.messages m
    where m.id = p_last_read_message_id
      and m.conversation_id = p_conversation_id
  ) then
    raise exception 'message_not_in_conversation' using errcode = '23514';
  end if;

  insert into public.conversation_reads (
    conversation_id,
    user_id,
    last_read_message_id,
    last_read_at
  )
  values (
    p_conversation_id,
    v_user_id,
    p_last_read_message_id,
    now()
  )
  on conflict (conversation_id, user_id) do update
  set
    last_read_message_id = excluded.last_read_message_id,
    last_read_at = excluded.last_read_at,
    updated_at = now()
  returning * into v_read;

  return v_read;
end;
$$;

create or replace function public.close_conversation(p_conversation_id uuid)
returns public.conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation public.conversations;
begin
  if v_user_id is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  select * into v_conversation from public.conversations where id = p_conversation_id;
  if not found then
    raise exception 'conversation_not_found' using errcode = '23514';
  end if;

  if v_conversation.conversation_type = 'customer_store'
     and not (
       auth.uid() = v_conversation.customer_user_id
       or public.marktx_store_member_has_role(v_conversation.store_id, auth.uid(), array['owner', 'manager'])
     ) then
    raise exception 'conversation_close_denied' using errcode = '42501';
  end if;

  if v_conversation.conversation_type = 'customer_support'
     and not (auth.uid() = v_conversation.customer_user_id or public.marktx_is_support_admin()) then
    raise exception 'conversation_close_denied' using errcode = '42501';
  end if;

  if v_conversation.conversation_type = 'store_support'
     and not (
       public.marktx_store_member_has_role(v_conversation.store_id, auth.uid(), array['owner', 'manager'])
       or public.marktx_is_support_admin()
     ) then
    raise exception 'conversation_close_denied' using errcode = '42501';
  end if;

  if v_conversation.conversation_type = 'legacy_user_user' then
    raise exception 'legacy_close_disabled' using errcode = '23514';
  end if;

  update public.conversations
  set status = 'closed', closed_at = now(), updated_at = now()
  where id = p_conversation_id
  returning * into v_conversation;

  return v_conversation;
end;
$$;

create or replace function public.report_conversation(
  p_conversation_id uuid,
  p_reported_user_id uuid,
  p_reason text,
  p_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation public.conversations;
  v_report_id uuid;
begin
  if v_user_id is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if not public.marktx_can_access_conversation(p_conversation_id) then
    raise exception 'conversation_access_denied' using errcode = '42501';
  end if;

  select * into v_conversation from public.conversations where id = p_conversation_id;
  if v_conversation.conversation_type = 'customer_store'
     and p_reported_user_id = v_conversation.customer_user_id then
    raise exception 'cannot_report_customer_in_store_thread_without_message_target' using errcode = '23514';
  end if;

  insert into public.reports (
    reporter_id,
    target_type,
    conversation_id,
    reported_user_id,
    reason,
    details,
    status
  )
  values (
    v_user_id,
    'conversation',
    p_conversation_id,
    p_reported_user_id,
    p_reason,
    nullif(btrim(p_details), ''),
    'pending'
  )
  returning id into v_report_id;

  update public.conversations
  set reported_at = coalesce(reported_at, now()), updated_at = now()
  where id = p_conversation_id;

  return v_report_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) RLS
-- ---------------------------------------------------------------------------

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_reads enable row level security;
alter table public.conversation_access_audit enable row level security;
alter table public.conversation_blocks enable row level security;

drop policy if exists "conversations_select_participant" on public.conversations;
drop policy if exists "conversations_insert_buyer" on public.conversations;
drop policy if exists "conversations_select_accessible_phase2" on public.conversations;
create policy "conversations_select_accessible_phase2"
  on public.conversations for select to authenticated
  using (public.marktx_can_access_conversation(id));

-- Direct inserts are blocked. Creation must go through RPCs.
drop policy if exists "conversations_insert_rpc_only_phase2" on public.conversations;
create policy "conversations_insert_rpc_only_phase2"
  on public.conversations for insert to authenticated
  with check (false);

drop policy if exists "messages_select_participant" on public.messages;
drop policy if exists "messages_insert_participant" on public.messages;
drop policy if exists "messages_select_accessible_phase2" on public.messages;
create policy "messages_select_accessible_phase2"
  on public.messages for select to authenticated
  using (public.marktx_can_access_conversation(conversation_id));

-- Direct inserts are blocked. send_conversation_message() records auth.uid().
drop policy if exists "messages_insert_rpc_only_phase2" on public.messages;
create policy "messages_insert_rpc_only_phase2"
  on public.messages for insert to authenticated
  with check (false);

drop policy if exists "conversation_reads_select_own" on public.conversation_reads;
create policy "conversation_reads_select_own"
  on public.conversation_reads for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "conversation_reads_write_own_accessible" on public.conversation_reads;
create policy "conversation_reads_write_own_accessible"
  on public.conversation_reads for all to authenticated
  using (user_id = auth.uid() and public.marktx_can_access_conversation(conversation_id))
  with check (user_id = auth.uid() and public.marktx_can_access_conversation(conversation_id));

drop policy if exists "conversation_access_audit_support_read" on public.conversation_access_audit;
create policy "conversation_access_audit_support_read"
  on public.conversation_access_audit for select to authenticated
  using (public.marktx_is_support_admin());

drop policy if exists "conversation_access_audit_support_insert" on public.conversation_access_audit;
create policy "conversation_access_audit_support_insert"
  on public.conversation_access_audit for insert to authenticated
  with check (actor_id = auth.uid() and public.marktx_is_support_admin());

drop policy if exists "conversation_blocks_store_admin" on public.conversation_blocks;
create policy "conversation_blocks_store_admin"
  on public.conversation_blocks for all to authenticated
  using (
    public.is_admin()
    or public.marktx_store_member_has_role(store_id, auth.uid(), array['owner', 'manager'])
  )
  with check (
    public.is_admin()
    or public.marktx_store_member_has_role(store_id, auth.uid(), array['owner', 'manager'])
  );

-- Reports policy extension for new conversation types.
drop policy if exists "reports_insert_conversation" on public.reports;
create policy "reports_insert_conversation"
  on public.reports for insert to authenticated
  with check (
    auth.uid() = reporter_id
    and target_type = 'conversation'
    and status in ('pending', 'open')
    and conversation_id is not null
    and reported_user_id is not null
    and reported_user_id <> auth.uid()
    and public.marktx_can_access_conversation(conversation_id)
  );

-- Optional realtime publication. RLS still controls delivery.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'messages'
    ) then
      alter publication supabase_realtime add table public.messages;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'conversations'
    ) then
      alter publication supabase_realtime add table public.conversations;
    end if;
  end if;
end $$;

revoke all on function public.get_or_create_customer_store_conversation(uuid, uuid, text) from public, anon;
revoke all on function public.get_or_create_customer_support_conversation(text, text) from public, anon;
revoke all on function public.get_or_create_store_support_conversation(uuid, text, text) from public, anon;
revoke all on function public.send_conversation_message(uuid, text, text) from public, anon;
revoke all on function public.mark_conversation_read(uuid, uuid) from public, anon;
revoke all on function public.close_conversation(uuid) from public, anon;
revoke all on function public.report_conversation(uuid, uuid, text, text) from public, anon;

grant execute on function public.get_or_create_customer_store_conversation(uuid, uuid, text) to authenticated;
grant execute on function public.get_or_create_customer_support_conversation(text, text) to authenticated;
grant execute on function public.get_or_create_store_support_conversation(uuid, text, text) to authenticated;
grant execute on function public.send_conversation_message(uuid, text, text) to authenticated;
grant execute on function public.mark_conversation_read(uuid, uuid) to authenticated;
grant execute on function public.close_conversation(uuid) to authenticated;
grant execute on function public.report_conversation(uuid, uuid, text, text) to authenticated;

comment on column public.conversations.conversation_type is
  'Phase 2 canonical type: legacy_user_user, customer_store, customer_support, store_support.';
comment on column public.conversations.store_id is
  'Store-owned threads attach to store_id; store owner changes do not reassign history.';
comment on table public.conversation_reads is
  'Per-user read/archive/mute state for customers, store members and support agents.';
comment on table public.conversation_access_audit is
  'Audit log for support/admin access to private customer-store conversations.';

commit;
