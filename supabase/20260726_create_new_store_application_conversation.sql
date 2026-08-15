-- MarktX
-- Hər "Yeni mağaza müraciəti" submit-i üçün ayrıca support conversation yaradır.
-- Conversation və ilkin mesaj eyni transaction daxilində yaradılır.

begin;

create or replace function public.create_new_store_application_conversation(
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if v_user_id is null then
    raise exception 'Daxil olmaq tələb olunur.';
  end if;

  if v_body = '' then
    raise exception 'Müraciət mətni boş ola bilməz.';
  end if;

  if char_length(v_body) > 1000 then
    raise exception 'Müraciət mətni çox uzundur.';
  end if;

  if btrim(
    split_part(
      replace(v_body, E'\r\n', E'\n'),
      E'\n',
      1
    )
  ) <> 'MÜRACİƏT NÖVÜ: Yeni mağaza' then
    raise exception 'Müraciət formatı düzgün deyil.';
  end if;

  insert into public.conversations (
    conversation_type,
    customer_user_id,
    subject,
    support_topic,
    status,
    last_message_at
  )
  values (
    'customer_support',
    v_user_id,
    'Yeni mağaza müraciəti',
    'other',
    'waiting_support',
    now()
  )
  returning id into v_conversation_id;

  perform public.send_conversation_message(
    v_conversation_id,
    v_body,
    null
  );

  return v_conversation_id;
end;
$$;

revoke all on function public.create_new_store_application_conversation(text)
from public, anon;

grant execute on function public.create_new_store_application_conversation(text)
to authenticated;

commit;
