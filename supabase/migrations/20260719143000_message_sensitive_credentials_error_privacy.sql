-- MarktX Security Remediation 2D: sanitize sensitive-credential block errors.
--
-- Narrow follow-up only:
-- - Keeps the existing classifier behavior unchanged.
-- - Keeps the existing INSERT/UPDATE triggers unchanged.
-- - Removes actor_id, conversation_id and timestamp from client-visible error
--   details.
-- - Does not change RLS, RPC signatures, conversation types, or final
--   messaging enforcement.

begin;

create or replace function public.marktx_enforce_message_sensitive_credentials()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_category text;
  v_public_category text;
begin
  if new.body is not distinct from 'Mesaj silindi' then
    return new;
  end if;

  v_category := public.marktx_classify_message_sensitive_credentials(new.body);

  if v_category is null then
    return new;
  end if;

  v_public_category := case
    when v_category = 'card_photo' then 'card_photo_request'
    else v_category
  end;

  raise exception 'message_sensitive_credentials_blocked'
    using
      errcode = '23514',
      detail = jsonb_build_object('category', v_public_category)::text;
end;
$$;

revoke all on function public.marktx_enforce_message_sensitive_credentials() from public, anon, authenticated;

comment on function public.marktx_enforce_message_sensitive_credentials() is
  'BEFORE INSERT/UPDATE trigger for public.messages.body. Blocks only high-confidence sensitive banking credential categories with category-only sanitized client-visible error details.';

commit;
