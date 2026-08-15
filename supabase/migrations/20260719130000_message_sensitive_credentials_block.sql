-- MarktX Security Remediation 2C: high-confidence banking credential block.
--
-- Prepared only. Do not apply without SQL review and isolated/staging runtime
-- verification.
--
-- Scope:
-- - Centralized message-body validation on public.messages.body.
-- - No RLS policy changes.
-- - No RPC signature changes.
-- - No final messaging enforcement.
--
-- Limitations:
-- - This is not complete fraud detection.
-- - It does not inspect image or attachment contents.
-- - It intentionally under-blocks ambiguous terms to reduce marketplace false
--   positives.

begin;

create or replace function public.marktx_normalize_payment_safety_text(p_body text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_text text := coalesce(p_body, '');
begin
  v_text := lower(normalize(v_text, NFKC));
  v_text := translate(v_text, 'ıİəƏğĞşŞçÇöÖüÜ', 'iieeggssccoouu');
  v_text := regexp_replace(v_text, '[^a-z0-9а-яё[:space:]/]', ' ', 'gi');
  v_text := regexp_replace(v_text, '[[:space:]]+', ' ', 'g');

  return ' ' || btrim(v_text) || ' ';
end;
$$;

create or replace function public.marktx_text_has_any(
  p_text text,
  p_terms text[]
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select exists (
    select 1
    from unnest(coalesce(p_terms, array[]::text[])) as term(value)
    where position(term.value in coalesce(p_text, '')) > 0
  );
$$;

create or replace function public.marktx_luhn_valid(p_digits text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_digits text := coalesce(p_digits, '');
  v_sum integer := 0;
  v_digit integer;
  v_double boolean := false;
  v_i integer;
begin
  if v_digits !~ '^[0-9]{13,19}$' then
    return false;
  end if;

  for v_i in reverse char_length(v_digits)..1 loop
    v_digit := substr(v_digits, v_i, 1)::integer;

    if v_double then
      v_digit := v_digit * 2;
      if v_digit > 9 then
        v_digit := v_digit - 9;
      end if;
    end if;

    v_sum := v_sum + v_digit;
    v_double := not v_double;
  end loop;

  return (v_sum % 10) = 0;
end;
$$;

create or replace function public.marktx_has_card_number_like(p_body text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_candidate text;
  v_digits text;
begin
  for v_candidate in
    select m.match_text[1]
    from regexp_matches(coalesce(p_body, ''), '(([0-9][ .-]?){13,19})', 'g') as m(match_text)
  loop
    v_digits := regexp_replace(v_candidate, '[^0-9]', '', 'g');

    if char_length(v_digits) between 13 and 19
       and public.marktx_luhn_valid(v_digits) then
      return true;
    end if;
  end loop;

  return false;
end;
$$;

create or replace function public.marktx_classify_message_sensitive_credentials(p_body text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_norm text := public.marktx_normalize_payment_safety_text(p_body);

  v_request_context boolean;
  v_banking_context boolean;
  v_card_context boolean;
  v_payment_card_safe_exclusion boolean;
  v_auth_context boolean;
  v_remote_context boolean;
  v_photo_context boolean;
  v_side_context boolean;
  v_has_cvv boolean;
  v_has_pin boolean;
  v_has_auth_code boolean;
  v_has_banking_password boolean;
  v_has_expiry boolean;
  v_has_card_number_term boolean;
  v_has_luhn_card_number boolean;
begin
  if nullif(btrim(coalesce(p_body, '')), '') is null then
    return null;
  end if;

  v_request_context := public.marktx_text_has_any(v_norm, array[
    ' gonder ', ' gonderin ', ' gonderir ', ' atin ', ' at ',
    ' yaz ', ' yazin ', ' dey ', ' deyin ', ' ver ', ' verin ',
    ' paylas ', ' paylasin ', ' send ', ' share ', ' tell ', ' write ',
    ' provide ', ' give me ', ' отправ', ' пришл', ' скаж', ' напиш'
  ]);

  v_banking_context := public.marktx_text_has_any(v_norm, array[
    ' bank ', ' bankdan ', ' banka ', ' banking ', ' mobil bank ',
    ' internet bank ', ' online bank ', ' bank tetbiq ', ' bank app ',
    ' odeme', ' odenis', ' payment ', ' transfer ', ' kocurme ',
    ' kartdan karta ', ' hesaba ', ' hesabima ', ' account access ',
    ' банк', ' банков', ' платеж', ' перевод', ' приложение банка'
  ]);

  v_card_context := public.marktx_text_has_any(v_norm, array[
    ' kart ', ' kartin ', ' karta ', ' kartdan ', ' card ', ' credit card ',
    ' debit card ', ' payment card ', ' kredi kart ', ' карта ', ' карты ',
    ' карточ'
  ]);

  v_payment_card_safe_exclusion := public.marktx_text_has_any(v_norm, array[
    ' sim kart ', ' sd kart ', ' yaddas kart ', ' memory card ',
    ' uzvluk kart ', ' member card ', ' product card ', ' hediye kart ',
    ' gift card '
  ]);

  v_auth_context := public.marktx_text_has_any(v_norm, array[
    ' otp ', ' one time password ', ' verification ', ' authentication ',
    ' auth ', ' tesdiq ', ' dogrulama ', ' sms kod ', ' sms code ',
    ' пароль ', ' подтвержд', ' провероч'
  ]);

  v_remote_context := public.marktx_text_has_any(v_norm, array[
    ' anydesk ', ' teamviewer ', ' remote access ', ' uzaqdan qosul',
    ' ekran paylas', ' ekrani paylas', ' ekranini paylas',
    ' screen share ', ' screen sharing ', ' удаленн',
    ' демонстрация экрана ', ' доступ к экран'
  ]);

  v_photo_context := public.marktx_text_has_any(v_norm, array[
    ' sekil', ' sekl', ' foto', ' fotos', ' photo ', ' picture ',
    ' image ', ' фотограф', ' фото '
  ]);

  v_side_context := public.marktx_text_has_any(v_norm, array[
    ' on ve arxa ', ' on arxa ', ' arxa teref ', ' uz teref ',
    ' front ', ' back ', ' both sides ', ' reverse side ', ' лицевая ',
    ' обратн'
  ]);

  v_has_cvv := public.marktx_text_has_any(v_norm, array[
    ' cvv ', ' cvc ', ' cav2 ', ' card security code ', ' security code ',
    ' guvenlik kodu ', ' kod cvv ', ' kod cvc ', ' код cvv ', ' код cvc ',
    ' секретный код карты '
  ]);

  v_has_pin := public.marktx_text_has_any(v_norm, array[
    ' pin ', ' pin kod ', ' pin code ', ' banking pin ', ' bank pin ',
    ' payment pin ', ' пин ', ' пин-код '
  ]);

  v_has_auth_code := public.marktx_text_has_any(v_norm, array[
    ' otp ', ' one time password ', ' sms kod ', ' sms code ',
    ' tesdiq kod ', ' dogrulama kod ', ' verification code ',
    ' auth code ', ' bank code ', ' code from your bank ',
    ' код из sms ', ' код из смс ', ' смс код ', ' код подтверждения '
  ]);

  v_has_banking_password := public.marktx_text_has_any(v_norm, array[
    ' mobil bank parol', ' mobil bank sifr', ' internet bank parol',
    ' internet bank sifr', ' online banking password',
    ' mobile banking password', ' bank password', ' bank parol',
    ' bank sifr', ' bank tetbiq parol',
    ' bank app password ', ' пароль банка ', ' пароль мобильного банка ',
    ' пароль интернет банка '
  ]);

  v_has_expiry := public.marktx_text_has_any(v_norm, array[
    ' son istifade ', ' bitme tarixi ', ' skt ', ' expiry ', ' expiration ',
    ' exp date ', ' expires ', ' срок действия ', ' дата истечения '
  ]);

  v_has_card_number_term := public.marktx_text_has_any(v_norm, array[
    ' kart nomre', ' kartin nomre', ' karta nomre',
    ' card number ', ' pan ', ' номер карты ', ' номер карточ'
  ]);

  v_has_luhn_card_number := public.marktx_has_card_number_like(p_body);

  if (v_has_luhn_card_number or v_has_card_number_term)
     and (
       v_has_cvv
       or v_has_auth_code
       or (v_has_expiry and (v_request_context or v_card_context))
     ) then
    return 'card_auth_combo';
  end if;

  if public.marktx_text_has_any(v_norm, array[' cvv ', ' cvc ', ' cav2 ', ' kod cvv ', ' kod cvc ', ' код cvv ', ' код cvc ']) then
    return 'cvv';
  end if;

  if v_has_cvv and (v_card_context or v_banking_context or v_request_context) then
    return 'cvv';
  end if;

  if v_has_pin
     and not public.marktx_text_has_any(v_norm, array[
       ' pin kodlu ', ' mehsulun pin ', ' router pin ', ' product pin '
     ])
     and (v_banking_context or v_card_context or v_auth_context or v_request_context) then
    return 'pin';
  end if;

  if v_has_auth_code
     and (
       v_request_context
       or v_banking_context
       or public.marktx_text_has_any(v_norm, array[
         ' otp ', ' one time password ', ' verification code ',
         ' auth code ', ' tesdiq kod ', ' dogrulama kod ',
         ' код подтверждения '
       ])
     ) then
    return 'otp';
  end if;

  if v_has_banking_password then
    return 'banking_password';
  end if;

  if v_card_context
     and not v_payment_card_safe_exclusion
     and v_photo_context
     and (v_side_context or v_request_context)
     and (v_side_context or v_banking_context or v_request_context) then
    return 'card_photo_request';
  end if;

  if v_remote_context and (v_banking_context or v_auth_context) then
    return 'remote_banking_access';
  end if;

  return null;
end;
$$;

create or replace function public.marktx_enforce_message_sensitive_credentials()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_category text;
begin
  if new.body is not distinct from 'Mesaj silindi' then
    return new;
  end if;

  v_category := public.marktx_classify_message_sensitive_credentials(new.body);

  if v_category is null then
    return new;
  end if;

  raise exception 'message_sensitive_credentials_blocked'
    using
      errcode = '23514',
      detail = jsonb_build_object('category', v_category)::text;
end;
$$;

drop trigger if exists marktx_messages_sensitive_credentials_bi on public.messages;
create trigger marktx_messages_sensitive_credentials_bi
  before insert on public.messages
  for each row
  execute function public.marktx_enforce_message_sensitive_credentials();

drop trigger if exists marktx_messages_sensitive_credentials_bu on public.messages;
create trigger marktx_messages_sensitive_credentials_bu
  before update of body on public.messages
  for each row
  when (new.body is distinct from old.body)
  execute function public.marktx_enforce_message_sensitive_credentials();

revoke all on function public.marktx_normalize_payment_safety_text(text) from public, anon, authenticated;
revoke all on function public.marktx_text_has_any(text, text[]) from public, anon, authenticated;
revoke all on function public.marktx_luhn_valid(text) from public, anon, authenticated;
revoke all on function public.marktx_has_card_number_like(text) from public, anon, authenticated;
revoke all on function public.marktx_classify_message_sensitive_credentials(text) from public, anon, authenticated;
revoke all on function public.marktx_enforce_message_sensitive_credentials() from public, anon, authenticated;

comment on function public.marktx_classify_message_sensitive_credentials(text) is
  'Returns a block category for high-confidence sensitive banking credentials, or NULL to allow. No raw message content is logged or persisted by this function.';

comment on function public.marktx_enforce_message_sensitive_credentials() is
  'BEFORE INSERT/UPDATE trigger for public.messages.body. Blocks only high-confidence sensitive banking credential categories with sanitized error details.';

comment on trigger marktx_messages_sensitive_credentials_bi on public.messages is
  'Blocks prohibited sensitive banking credential content before message insert.';

comment on trigger marktx_messages_sensitive_credentials_bu on public.messages is
  'Blocks prohibited sensitive banking credential content only when public.messages.body changes.';

commit;
