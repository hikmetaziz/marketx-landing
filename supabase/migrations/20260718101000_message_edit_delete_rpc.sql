-- MarktX message edit/delete-text RPCs.
--
-- Additive only:
-- - No direct message UPDATE/DELETE policy is added.
-- - No message rows are deleted.
-- - Only the original sender can edit or delete their own message text.
-- - Deleted message text is replaced with a neutral placeholder and marked in
--   metadata so existing reads, audits and realtime subscriptions keep working.

begin;

create or replace function public.edit_conversation_message(
  p_message_id uuid,
  p_body text
)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
  v_message public.messages;
  v_conversation public.conversations;
begin
  if v_user_id is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  if p_message_id is null then
    raise exception 'message_required' using errcode = '23514';
  end if;

  if nullif(v_body, '') is null then
    raise exception 'message_body_required' using errcode = '23514';
  end if;

  if char_length(v_body) > 1000 then
    raise exception 'message_body_too_long' using errcode = '23514';
  end if;

  select * into v_message
  from public.messages
  where id = p_message_id
  for update;

  if not found then
    raise exception 'message_not_found' using errcode = '23514';
  end if;

  if v_message.sender_id <> v_user_id then
    raise exception 'message_edit_denied' using errcode = '42501';
  end if;

  if not public.marktx_can_access_conversation(v_message.conversation_id) then
    raise exception 'conversation_access_denied' using errcode = '42501';
  end if;

  select * into v_conversation
  from public.conversations
  where id = v_message.conversation_id;

  if not found then
    raise exception 'conversation_not_found' using errcode = '23514';
  end if;

  if v_conversation.conversation_type = 'legacy_user_user' then
    raise exception 'legacy_message_edit_disabled' using errcode = '23514';
  end if;

  if v_conversation.status in ('resolved', 'closed') then
    raise exception 'conversation_closed' using errcode = '23514';
  end if;

  if coalesce(v_message.metadata, '{}'::jsonb) ? 'deleted_at' then
    raise exception 'message_deleted' using errcode = '23514';
  end if;

  update public.messages
  set
    body = v_body,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('edited_at', now())
  where id = p_message_id
  returning * into v_message;

  return v_message;
end;
$$;

create or replace function public.delete_conversation_message_text(
  p_message_id uuid
)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_message public.messages;
  v_conversation public.conversations;
begin
  if v_user_id is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  if p_message_id is null then
    raise exception 'message_required' using errcode = '23514';
  end if;

  select * into v_message
  from public.messages
  where id = p_message_id
  for update;

  if not found then
    raise exception 'message_not_found' using errcode = '23514';
  end if;

  if v_message.sender_id <> v_user_id then
    raise exception 'message_delete_denied' using errcode = '42501';
  end if;

  if not public.marktx_can_access_conversation(v_message.conversation_id) then
    raise exception 'conversation_access_denied' using errcode = '42501';
  end if;

  select * into v_conversation
  from public.conversations
  where id = v_message.conversation_id;

  if not found then
    raise exception 'conversation_not_found' using errcode = '23514';
  end if;

  if v_conversation.conversation_type = 'legacy_user_user' then
    raise exception 'legacy_message_delete_disabled' using errcode = '23514';
  end if;

  if v_conversation.status in ('resolved', 'closed') then
    raise exception 'conversation_closed' using errcode = '23514';
  end if;

  if coalesce(v_message.metadata, '{}'::jsonb) ? 'deleted_at' then
    return v_message;
  end if;

  update public.messages
  set
    body = 'Mesaj silindi',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('deleted_at', now())
  where id = p_message_id
  returning * into v_message;

  return v_message;
end;
$$;

revoke all on function public.edit_conversation_message(uuid, text) from public, anon;
revoke all on function public.delete_conversation_message_text(uuid) from public, anon;

grant execute on function public.edit_conversation_message(uuid, text) to authenticated;
grant execute on function public.delete_conversation_message_text(uuid) to authenticated;

comment on function public.edit_conversation_message(uuid, text) is
  'Edits only the authenticated sender own message text in an active non-legacy conversation.';
comment on function public.delete_conversation_message_text(uuid) is
  'Soft-deletes only the authenticated sender own message text by replacing the body and marking metadata.deleted_at.';

commit;
