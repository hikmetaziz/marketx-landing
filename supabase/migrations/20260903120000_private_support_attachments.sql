begin;

insert into storage.buckets (id, name, public, allowed_mime_types)
values (
  'support-attachments',
  'support-attachments',
  false,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = false,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.marktx_can_access_support_attachment(
  p_object_name text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_conversation_id uuid;
  v_conversation_type text;
begin
  if auth.uid() is null
     or p_object_name !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.(jpg|jpeg|png|webp)$'
  then
    return false;
  end if;

  begin
    v_conversation_id := pg_catalog.split_part(p_object_name, '/', 1)::uuid;
  exception
    when invalid_text_representation then return false;
  end;

  select c.conversation_type
  into v_conversation_type
  from public.conversations as c
  where c.id = v_conversation_id;

  if v_conversation_type not in ('customer_support', 'store_support') then
    return false;
  end if;

  return public.marktx_can_access_conversation(v_conversation_id);
end;
$$;

revoke all on function public.marktx_can_access_support_attachment(text)
from public, anon;

grant execute on function public.marktx_can_access_support_attachment(text)
to authenticated;

drop policy if exists "support_attachments_select_authorized" on storage.objects;
create policy "support_attachments_select_authorized"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'support-attachments'
    and public.marktx_can_access_support_attachment(name)
  );

drop policy if exists "support_attachments_insert_authorized" on storage.objects;
create policy "support_attachments_insert_authorized"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'support-attachments'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.marktx_can_access_support_attachment(name)
  );

drop policy if exists "support_attachments_delete_authorized" on storage.objects;
create policy "support_attachments_delete_authorized"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'support-attachments'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or (
        public.marktx_is_support_admin()
        and public.marktx_can_access_support_attachment(name)
      )
    )
  );

-- No UPDATE policy: support attachment objects are immutable.

create or replace function public.update_my_store_application_attachment_refs(
  p_application_id uuid,
  p_logo_reference text default null,
  p_cover_reference text default null
)
returns table (
  application_id uuid,
  logo_url text,
  cover_url text,
  updated_at timestamp with time zone
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation_id uuid;
  v_logo_reference text := nullif(pg_catalog.btrim(coalesce(p_logo_reference, '')), '');
  v_cover_reference text := nullif(pg_catalog.btrim(coalesce(p_cover_reference, '')), '');
  v_logo_path text;
  v_cover_path text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select sa.conversation_id
  into v_conversation_id
  from public.store_applications as sa
  where sa.id = p_application_id
    and sa.applicant_user_id = v_user_id
    and sa.status in ('submitted', 'under_review', 'needs_review');

  if not found then
    raise exception 'Store application assets cannot be updated' using errcode = '42501';
  end if;

  v_logo_path := pg_catalog.substring(v_logo_reference, '^support-attachment:(.+)$');
  v_cover_path := pg_catalog.substring(v_cover_reference, '^support-attachment:(.+)$');

  if v_logo_reference is not null and (
    v_logo_path is null
    or not pg_catalog.starts_with(v_logo_path, v_conversation_id::text || '/' || v_user_id::text || '/')
    or not public.marktx_can_access_support_attachment(v_logo_path)
    or not exists (
      select 1 from storage.objects as object
      where object.bucket_id = 'support-attachments' and object.name = v_logo_path
    )
  ) then
    raise exception 'Invalid store application logo' using errcode = '22023';
  end if;

  if v_cover_reference is not null and (
    v_cover_path is null
    or not pg_catalog.starts_with(v_cover_path, v_conversation_id::text || '/' || v_user_id::text || '/')
    or not public.marktx_can_access_support_attachment(v_cover_path)
    or not exists (
      select 1 from storage.objects as object
      where object.bucket_id = 'support-attachments' and object.name = v_cover_path
    )
  ) then
    raise exception 'Invalid store application cover' using errcode = '22023';
  end if;

  return query
  update public.store_applications as sa
  set
    logo_url = case when p_logo_reference is null then sa.logo_url else v_logo_reference end,
    cover_url = case when p_cover_reference is null then sa.cover_url else v_cover_reference end,
    updated_at = pg_catalog.now()
  where sa.id = p_application_id
    and sa.applicant_user_id = v_user_id
  returning sa.id, sa.logo_url, sa.cover_url, sa.updated_at;
end;
$$;

revoke all on function public.update_my_store_application_attachment_refs(uuid, text, text)
from public, anon;

grant execute on function public.update_my_store_application_attachment_refs(uuid, text, text)
to authenticated;

commit;
