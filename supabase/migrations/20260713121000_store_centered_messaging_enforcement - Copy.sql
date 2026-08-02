- MarktX
-- Yeni mağaza support müraciətindən mağaza yaradılması üçün qalıcı idempotency.
-- Eyni conversation_id üzrə yalnız bir mağaza yaradılır.
--
-- Tətbiq:
-- 1. Bu faylı Supabase SQL Editor-də bir dəfə işə salın.
-- 2. Sonra frontend/server action admin_create_store_from_application RPC-sini çağırmalıdır.
--
-- Vacib:
-- Bu migration-dan əvvəl artıq yaradılmış mağaza avtomatik olaraq müraciətlə əlaqələndirilmir.
-- Belə mağaza varsa, faylın sonundakı BACKFILL nümunəsindən istifadə edin.

begin;

create table if not exists public.store_application_creations (
  conversation_id uuid primary key
    references public.conversations(id) on delete restrict,

  store_id uuid not null unique
    references public.stores(id) on delete restrict,

  created_by uuid not null
    references auth.users(id) on delete restrict,

  created_at timestamptz not null default now()
);

comment on table public.store_application_creations is
  'Yeni mağaza support müraciəti ilə yaradılmış mağazanın qalıcı əlaqəsi.';

comment on column public.store_application_creations.conversation_id is
  'Yeni mağaza müraciətinin public.conversations.id dəyəri.';

comment on column public.store_application_creations.store_id is
  'Bu müraciətdən yaradılmış public.stores.id dəyəri.';

comment on column public.store_application_creations.created_by is
  'Mağazanı müraciətdən yaradan admin istifadəçi.';

alter table public.store_application_creations enable row level security;

revoke all on table public.store_application_creations
from public, anon, authenticated;


create or replace function public.admin_get_store_application_creation(
  p_conversation_id uuid
)
returns table (
  store_id uuid,
  store_code text,
  store_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Yalnız admin bu məlumatı görə bilər.';
  end if;

  return query
  select
    s.id,
    s.store_code,
    s.name,
    sac.created_at
  from public.store_application_creations sac
  join public.stores s
    on s.id = sac.store_id
  where sac.conversation_id = p_conversation_id
  limit 1;
end;
$$;

revoke all on function public.admin_get_store_application_creation(uuid)
from public, anon;

grant execute on function public.admin_get_store_application_creation(uuid)
to authenticated;


create or replace function public.admin_create_store_from_application(
  p_conversation_id uuid,
  p_name text,
  p_category text default null,
  p_category_id uuid default null,
  p_city text default null,
  p_contact_phone text default null,
  p_whatsapp_phone text default null,
  p_address text default null,
  p_description text default null,
  p_map_url text default null
)
returns table (
  store_id uuid,
  store_code text,
  store_name text,
  already_created boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_conversation public.conversations%rowtype;
  v_first_message_body text;
  v_existing_store public.stores%rowtype;
  v_created_store public.stores%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Yalnız admin mağaza yarada bilər.';
  end if;

  if p_conversation_id is null then
    raise exception 'Müraciət ID-si boş ola bilməz.';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'Mağaza adı boş ola bilməz.';
  end if;

  /*
   * Conversation sətrini kilidləyirik.
   * Eyni müraciət üzrə paralel iki çağırış ardıcıl icra olunur.
   */
  select *
  into v_conversation
  from public.conversations
  where id = p_conversation_id
  for update;

  if not found then
    raise exception 'Müraciət tapılmadı.';
  end if;

  if v_conversation.conversation_type <> 'customer_support' then
    raise exception 'Bu söhbət mağaza müraciəti deyil.';
  end if;

  if coalesce(btrim(v_conversation.subject), '') <> 'Yeni mağaza müraciəti' then
    raise exception 'Bu söhbət mağaza müraciəti deyil.';
  end if;

  /*
   * Yalnız conversation subject-ə güvənmirik.
   * İlk mesajın başlığı da dəqiq yoxlanılır.
   */
  select m.body
  into v_first_message_body
  from public.messages m
  where m.conversation_id = p_conversation_id
  order by m.created_at asc, m.id asc
  limit 1;

  if v_first_message_body is null then
    raise exception 'Müraciətin ilkin mesajı tapılmadı.';
  end if;

  if btrim(split_part(replace(v_first_message_body, E'\r\n', E'\n'), E'\n', 1))
     <> 'MÜRACİƏT NÖVÜ: Yeni mağaza' then
    raise exception 'Müraciətin ilkin mesaj formatı düzgün deyil.';
  end if;

  /*
   * Əvvəl yaradılıbsa yeni mağaza yaratmırıq.
   * Mövcud mağazanı və kodu qaytarırıq.
   */
  select s.*
  into v_existing_store
  from public.store_application_creations sac
  join public.stores s
    on s.id = sac.store_id
  where sac.conversation_id = p_conversation_id;

  if found then
    return query
    select
      v_existing_store.id,
      v_existing_store.store_code,
      v_existing_store.name,
      true;

    return;
  end if;

  insert into public.stores (
    name,
    category,
    category_id,
    city,
    contact_phone,
    whatsapp_phone,
    address,
    description,
    map_url,
    status,
    owner_id,
    created_by
  )
  values (
    btrim(p_name),
    nullif(btrim(p_category), ''),
    p_category_id,
    nullif(btrim(p_city), ''),
    nullif(btrim(p_contact_phone), ''),
    nullif(btrim(p_whatsapp_phone), ''),
    nullif(btrim(p_address), ''),
    nullif(btrim(p_description), ''),
    nullif(btrim(p_map_url), ''),
    'unclaimed',
    null,
    auth.uid()
  )
  returning *
  into v_created_store;

  insert into public.store_application_creations (
    conversation_id,
    store_id,
    created_by
  )
  values (
    p_conversation_id,
    v_created_store.id,
    auth.uid()
  );

  perform public.store_audit(
    v_created_store.id,
    'store_created_from_application',
    jsonb_build_object(
      'name', v_created_store.name,
      'store_code', v_created_store.store_code,
      'conversation_id', p_conversation_id
    )
  );

  return query
  select
    v_created_store.id,
    v_created_store.store_code,
    v_created_store.name,
    false;
end;
$$;

revoke all on function public.admin_create_store_from_application(
  uuid,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text
)
from public, anon;

grant execute on function public.admin_create_store_from_application(
  uuid,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text
)
to authenticated;

commit;


/*
BACKFILL — yalnız migration-dan ƏVVƏL artıq yaradılmış mağaza üçün.

Aşağıdakı iki UUID-ni real dəyərlə dəyişin və ayrıca işə salın:

insert into public.store_application_creations (
  conversation_id,
  store_id,
  created_by
)
values (
  'CONVERSATION_UUID'::uuid,
  'STORE_UUID'::uuid,
  auth.uid()
)
on conflict (conversation_id) do nothing;

Sizin testdə artıq yaradılmış mağaza:
  store_code = MX-STORE-000042

Əvvəl store UUID-ni tapmaq üçün:

select id, store_code, name
from public.stores
where store_code = 'MX-STORE-000042';

Conversation UUID-ni /admin/support məlumatından və ya conversations cədvəlindən tapın.
*/