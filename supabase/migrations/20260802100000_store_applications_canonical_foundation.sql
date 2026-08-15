-- MarktX store applications: canonical structured foundation.
-- Prepared only. Apply manually after SQL review.

begin;

alter table public.store_applications
  add column if not exists store_id uuid references public.stores(id),
  add column if not exists category_id uuid,
  add column if not exists opening_time time,
  add column if not exists closing_time time,
  add column if not exists logo_url text,
  add column if not exists cover_url text;

create or replace function public.submit_store_application(
  p_application jsonb
)
returns table (
  application_id uuid,
  conversation_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation_id uuid;
  v_application_id uuid;

  v_name text := btrim(coalesce(p_application ->> 'name', ''));
  v_category text := btrim(coalesce(p_application ->> 'category', ''));
  v_category_id_text text := nullif(btrim(coalesce(p_application ->> 'categoryId', '')), '');
  v_category_id uuid;
  v_city text := btrim(coalesce(p_application ->> 'city', ''));
  v_description text := btrim(coalesce(p_application ->> 'description', ''));
  v_address text := btrim(coalesce(p_application ->> 'address', ''));
  v_working_days_json jsonb := p_application -> 'workingDays';
  v_working_days text;
  v_opening_time_text text := btrim(coalesce(p_application ->> 'openingTime', ''));
  v_closing_time_text text := btrim(coalesce(p_application ->> 'closingTime', ''));
  v_opening_time time;
  v_closing_time time;
  v_working_hours text;
  v_phone text := btrim(coalesce(p_application ->> 'phone', ''));
  v_whatsapp text := nullif(btrim(coalesce(p_application ->> 'whatsapp', '')), '');
  v_email text := nullif(btrim(coalesce(p_application ->> 'email', '')), '');
  v_body text;
begin
  if v_user_id is null then
    raise exception 'Daxil olmaq tələb olunur.' using errcode = '28000';
  end if;

  if p_application is null or jsonb_typeof(p_application) <> 'object' then
    raise exception 'Müraciət məlumatları düzgün deyil.' using errcode = '22023';
  end if;

  if v_category_id_text is not null then
    if v_category_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Kateqoriya ID-si düzgün deyil.' using errcode = '22023';
    end if;
    v_category_id := v_category_id_text::uuid;
  end if;

  if jsonb_typeof(v_working_days_json) = 'array' then
    select string_agg(nullif(btrim(value), ''), ', ' order by ordinality)
    into v_working_days
    from jsonb_array_elements_text(v_working_days_json) with ordinality as days(value, ordinality)
    where nullif(btrim(value), '') is not null;
  else
    v_working_days := nullif(btrim(coalesce(p_application ->> 'workingDays', '')), '');
  end if;

  if v_opening_time_text !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' then
    raise exception 'Açılış saatı düzgün deyil.' using errcode = '22023';
  end if;

  if v_closing_time_text !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' then
    raise exception 'Bağlanış saatı düzgün deyil.' using errcode = '22023';
  end if;

  v_opening_time := v_opening_time_text::time;
  v_closing_time := v_closing_time_text::time;
  v_working_hours := v_opening_time_text || '–' || v_closing_time_text;

  if v_name = ''
     or v_category = ''
     or v_city = ''
     or v_description = ''
     or v_address = ''
     or coalesce(v_working_days, '') = ''
     or v_phone = '' then
    raise exception 'Müraciət üçün tələb olunan məlumatlar tam deyil.' using errcode = '23514';
  end if;

  v_body := array_to_string(array[
    'MÜRACİƏT NÖVÜ: Yeni mağaza',
    'Mağaza adı: ' || v_name,
    'Kateqoriya: ' || v_category,
    'Şəhər: ' || v_city,
    'Təsvir: ' || v_description,
    'Ünvan: ' || v_address,
    'İş günləri: ' || v_working_days,
    'İş saatları: ' || v_working_hours,
    'Telefon: ' || v_phone,
    'WhatsApp: ' || coalesce(v_whatsapp, 'Qeyd edilməyib'),
    'E-poçt: ' || coalesce(v_email, 'Qeyd edilməyib'),
    '',
    'Qeyd: Bu müraciət mağaza və sahiblik yaratmır. MarktX yoxlamasından sonra mağaza ayrıca yaradılacaq.'
  ], E'\n');

  if char_length(v_body) > 1000 then
    raise exception 'Müraciət mətni çox uzundur.' using errcode = '23514';
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

  insert into public.store_applications (
    conversation_id,
    applicant_user_id,
    store_name,
    category_name,
    category_id,
    city,
    description,
    address,
    working_days,
    working_hours,
    opening_time,
    closing_time,
    phone,
    whatsapp,
    email,
    status
  )
  values (
    v_conversation_id,
    v_user_id,
    v_name,
    v_category,
    v_category_id,
    v_city,
    v_description,
    v_address,
    v_working_days,
    v_working_hours,
    v_opening_time,
    v_closing_time,
    v_phone,
    v_whatsapp,
    v_email,
    'submitted'
  )
  returning id into v_application_id;

  return query
  select v_application_id, v_conversation_id;
end;
$$;

revoke all on function public.submit_store_application(jsonb)
from public, anon;

grant execute on function public.submit_store_application(jsonb)
to authenticated;

create or replace function public.update_my_store_application_assets(
  p_application_id uuid,
  p_logo_url text default null,
  p_cover_url text default null
)
returns table (
  application_id uuid,
  logo_url text,
  cover_url text,
  updated_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_logo_url text := nullif(btrim(coalesce(p_logo_url, '')), '');
  v_cover_url text := nullif(btrim(coalesce(p_cover_url, '')), '');
  v_application_id uuid;
  v_result_logo_url text;
  v_result_cover_url text;
  v_result_updated_at timestamp with time zone;
begin
  if v_user_id is null then
    raise exception 'Daxil olmaq tələb olunur.' using errcode = '28000';
  end if;

  if p_application_id is null then
    raise exception 'Müraciət ID-si boş ola bilməz.' using errcode = '22023';
  end if;

  if v_logo_url is not null and v_logo_url !~* '^https?://[^[:space:]]+$' then
    raise exception 'Logo URL düzgün deyil.' using errcode = '22023';
  end if;

  if v_cover_url is not null and v_cover_url !~* '^https?://[^[:space:]]+$' then
    raise exception 'Örtük şəkli URL düzgün deyil.' using errcode = '22023';
  end if;

  update public.store_applications as sa
  set
    logo_url = case
      when p_logo_url is null then sa.logo_url
      else v_logo_url
    end,
    cover_url = case
      when p_cover_url is null then sa.cover_url
      else v_cover_url
    end,
    updated_at = now()
  where sa.id = p_application_id
    and sa.applicant_user_id = v_user_id
    and sa.status in ('submitted', 'under_review', 'needs_review')
  returning
    sa.id,
    sa.logo_url,
    sa.cover_url,
    sa.updated_at
  into
    v_application_id,
    v_result_logo_url,
    v_result_cover_url,
    v_result_updated_at;

  if not found then
    raise exception 'Müraciət şəkillərini yeniləmək mümkün deyil.' using errcode = '42501';
  end if;

  return query
  select
    v_application_id,
    v_result_logo_url,
    v_result_cover_url,
    v_result_updated_at;
end;
$$;

revoke all on function public.update_my_store_application_assets(uuid, text, text)
from public, anon;

grant execute on function public.update_my_store_application_assets(uuid, text, text)
to authenticated;

commit;
