-- MarktX customer-store conversation block RPC.
--
-- Additive only:
-- - No broad SELECT policy is added.
-- - No messages are deleted or rewritten.
-- - Customer and store owner/manager can block their scoped customer-store pair.
-- - Support staff can block only reported conversations or conversations they
--   opened through audited detail access.
-- - The conversation is closed after the block so the current thread cannot
--   continue after the relationship is blocked.

begin;

create or replace function public.block_customer_store_conversation(
  p_conversation_id uuid,
  p_reason text default 'messaging_block'
)
returns public.conversation_blocks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation public.conversations;
  v_block public.conversation_blocks;
  v_reason text := left(coalesce(nullif(btrim(p_reason), ''), 'messaging_block'), 500);
begin
  if v_user_id is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  if p_conversation_id is null then
    raise exception 'conversation_required' using errcode = '23514';
  end if;

  select * into v_conversation
  from public.conversations
  where id = p_conversation_id
    and conversation_type = 'customer_store';

  if not found then
    raise exception 'customer_store_conversation_not_available' using errcode = '42501';
  end if;

  if v_conversation.store_id is null or v_conversation.customer_user_id is null then
    raise exception 'conversation_not_blockable' using errcode = '23514';
  end if;

  if not (
    v_user_id = v_conversation.customer_user_id
    or public.marktx_store_member_has_role(v_conversation.store_id, v_user_id, array['owner', 'manager'])
    or (
      public.marktx_is_support_admin()
      and (
        v_conversation.reported_at is not null
        or exists (
          select 1
          from public.conversation_access_audit caa
          where caa.conversation_id = v_conversation.id
            and caa.actor_id = v_user_id
            and caa.access_reason in ('reported', 'escalated', 'moderation', 'legal', 'security', 'support_assignment')
        )
      )
    )
  ) then
    raise exception 'conversation_block_denied' using errcode = '42501';
  end if;

  insert into public.conversation_blocks (
    store_id,
    customer_user_id,
    blocked_by,
    reason
  )
  values (
    v_conversation.store_id,
    v_conversation.customer_user_id,
    v_user_id,
    v_reason
  )
  on conflict (store_id, customer_user_id) do update
  set
    blocked_by = excluded.blocked_by,
    reason = excluded.reason
  returning * into v_block;

  update public.conversations
  set
    status = 'closed',
    closed_at = coalesce(closed_at, now()),
    updated_at = now()
  where id = p_conversation_id
    and status not in ('resolved', 'closed');

  return v_block;
end;
$$;

revoke all on function public.block_customer_store_conversation(uuid, text) from public, anon;
grant execute on function public.block_customer_store_conversation(uuid, text) to authenticated;

comment on function public.block_customer_store_conversation(uuid, text) is
  'Blocks the scoped customer-store pair for an authorized customer, store owner/manager, or audited support actor and closes the current conversation.';

commit;
