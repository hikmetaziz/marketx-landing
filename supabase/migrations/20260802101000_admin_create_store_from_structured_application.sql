-- MarktX store applications: canonical structured admin store creation RPC.
-- Captures the current production definition after structured applications exist.

begin;

create or replace function public.admin_create_store_from_application(
  p_conversation_id uuid,
  p_name text,
  p_category text default null::text,
  p_category_id uuid default null::uuid,
  p_city text default null::text,
  p_contact_phone text default null::text,
  p_whatsapp_phone text default null::text,
  p_address text default null::text,
  p_description text default null::text,
  p_map_url text default null::text
)
returns table (
  store_id uuid,
  store_code text,
  store_name text,
  already_created boolean
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_admin_id uuid := auth.uid();

  v_conversation public.conversations%rowtype;
  v_application public.store_applications%rowtype;

  v_first_message_body text;
  v_existing_store public.stores%rowtype;
  v_created_store public.stores%rowtype;
begin
  if v_admin_id is null then
    raise exception 'auth_required'
      using errcode = '28000';
  end if;

  if not public.is_admin() then
    raise exception 'Yalnız admin mağaza yarada bilər.'
      using errcode = '42501';
  end if;

  if p_conversation_id is null then
    raise exception 'Müraciət ID-si boş ola bilməz.'
      using errcode = '23514';
  end if;

  if p_name is null
     or pg_catalog.btrim(p_name) = ''
  then
    raise exception 'Mağaza adı boş ola bilməz.'
      using errcode = '23514';
  end if;

  select c.*
  into v_conversation
  from public.conversations as c
  where c.id = p_conversation_id
  for update;

  if not found then
    raise exception 'Müraciət tapılmadı.'
      using errcode = '23514';
  end if;

  if v_conversation.conversation_type <> 'customer_support' then
    raise exception 'Bu söhbət mağaza müraciəti deyil.'
      using errcode = '23514';
  end if;

  if coalesce(
       pg_catalog.btrim(v_conversation.subject),
       ''
     ) <> 'Yeni mağaza müraciəti'
  then
    raise exception 'Bu söhbət mağaza müraciəti deyil.'
      using errcode = '23514';
  end if;

  select sa.*
  into v_application
  from public.store_applications as sa
  where sa.conversation_id = p_conversation_id
  for update;

  if not found then
    raise exception 'Müraciətin strukturlaşdırılmış qeydi tapılmadı.'
      using errcode = '23514';
  end if;

  if v_application.applicant_user_id
     <> v_conversation.customer_user_id
  then
    raise exception 'Müraciətin istifadəçi məlumatları uyğun deyil.'
      using errcode = '23514';
  end if;

  select m.body
  into v_first_message_body
  from public.messages as m
  where m.conversation_id = p_conversation_id
  order by m.created_at asc, m.id asc
  limit 1;

  if v_first_message_body is null then
    raise exception 'Müraciətin ilkin mesajı tapılmadı.'
      using errcode = '23514';
  end if;

  if pg_catalog.btrim(
       pg_catalog.split_part(
         pg_catalog.replace(
           v_first_message_body,
           E'\r\n',
           E'\n'
         ),
         E'\n',
         1
       )
     ) <> 'MÜRACİƏT NÖVÜ: Yeni mağaza'
  then
    raise exception 'Müraciətin ilkin mesaj formatı düzgün deyil.'
      using errcode = '23514';
  end if;

  select s.*
  into v_existing_store
  from public.store_application_creations as sac
  join public.stores as s
    on s.id = sac.store_id
  where sac.conversation_id = p_conversation_id;

  if found then
    update public.store_applications as sa
    set
      status =
        case
          when v_existing_store.status = 'claimed'
               and v_existing_store.owner_id is not null
            then 'approved'

          when v_existing_store.status in (
                 'unclaimed',
                 'claim_pending'
               )
               and v_existing_store.owner_id is null
            then 'activation_pending'

          else sa.status
        end,

      reviewed_by = coalesce(
        sa.reviewed_by,
        v_admin_id
      ),

      reviewed_at = coalesce(
        sa.reviewed_at,
        pg_catalog.now()
      ),

      updated_at = pg_catalog.now()

    where sa.conversation_id = p_conversation_id;

    if v_existing_store.owner_id is null
       and v_existing_store.status in (
         'unclaimed',
         'claim_pending'
       )
       and v_conversation.status not in (
         'resolved',
         'closed'
       )
    then
      update public.conversations as c
      set
        status = 'waiting_customer',
        updated_at = pg_catalog.now()
      where c.id = p_conversation_id;
    end if;

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
    pg_catalog.btrim(p_name),
    nullif(pg_catalog.btrim(p_category), ''),
    p_category_id,
    nullif(pg_catalog.btrim(p_city), ''),
    nullif(pg_catalog.btrim(p_contact_phone), ''),
    nullif(pg_catalog.btrim(p_whatsapp_phone), ''),
    nullif(pg_catalog.btrim(p_address), ''),
    nullif(pg_catalog.btrim(p_description), ''),
    nullif(pg_catalog.btrim(p_map_url), ''),
    'unclaimed',
    null,
    v_admin_id
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
    v_admin_id
  );

  update public.store_applications as sa
  set
    status = 'activation_pending',
    reviewed_by = v_admin_id,
    reviewed_at = pg_catalog.now(),
    updated_at = pg_catalog.now()
  where sa.conversation_id = p_conversation_id;

  update public.conversations as c
  set
    status = 'waiting_customer',
    updated_at = pg_catalog.now()
  where c.id = p_conversation_id
    and c.status not in (
      'resolved',
      'closed'
    );

  perform public.store_audit(
    v_created_store.id,
    'store_created_from_application',
    pg_catalog.jsonb_build_object(
      'name',
      v_created_store.name,
      'store_code',
      v_created_store.store_code,
      'conversation_id',
      p_conversation_id,
      'application_id',
      v_application.id
    )
  );

  return query
  select
    v_created_store.id,
    v_created_store.store_code,
    v_created_store.name,
    false;
end;
$function$;

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
