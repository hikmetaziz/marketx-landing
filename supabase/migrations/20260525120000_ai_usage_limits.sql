-- AI image analysis usage limits (normal users: 2 per listing; admins: unlimited)

create table if not exists public.ai_usage_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  feature text not null,
  usage_count int not null default 0 check (usage_count >= 0),
  max_usage int not null default 2 check (max_usage > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, listing_id, feature)
);

create index if not exists ai_usage_limits_user_listing_idx
  on public.ai_usage_limits (user_id, listing_id);

create or replace function public.set_ai_usage_limits_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ai_usage_limits_set_updated_at on public.ai_usage_limits;
create trigger ai_usage_limits_set_updated_at
  before update on public.ai_usage_limits
  for each row
  execute function public.set_ai_usage_limits_updated_at();

alter table public.ai_usage_limits enable row level security;

drop policy if exists "ai_usage_limits_select_own" on public.ai_usage_limits;
create policy "ai_usage_limits_select_own"
  on public.ai_usage_limits
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

revoke insert, update, delete on public.ai_usage_limits from authenticated, anon;

create or replace function public.get_ai_image_analysis_usage(p_listing_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean := false;
  v_owner uuid;
  v_usage_count int := 0;
  v_max_usage int := 2;
begin
  if v_user_id is null then
    raise exception 'Sİ funksiyasından istifadə üçün daxil olun.'
      using errcode = 'P0001';
  end if;

  select (p.role = 'admin')
  into v_is_admin
  from public.profiles as p
  where p.id = v_user_id;

  if coalesce(v_is_admin, false) then
    return jsonb_build_object(
      'is_admin', true,
      'remaining', null,
      'usage_count', 0,
      'max_usage', null
    );
  end if;

  select l.user_id
  into v_owner
  from public.listings as l
  where l.id = p_listing_id;

  if v_owner is null then
    raise exception 'Elan tapılmadı.'
      using errcode = 'P0001';
  end if;

  if v_owner is distinct from v_user_id then
    raise exception 'Bu elan üçün Sİ emalı icazəsi yoxdur.'
      using errcode = 'P0001';
  end if;

  select a.usage_count, a.max_usage
  into v_usage_count, v_max_usage
  from public.ai_usage_limits as a
  where a.user_id = v_user_id
    and a.listing_id = p_listing_id
    and a.feature = 'ai_image_analysis';

  if not found then
    v_usage_count := 0;
    v_max_usage := 2;
  end if;

  return jsonb_build_object(
    'is_admin', false,
    'usage_count', v_usage_count,
    'max_usage', v_max_usage,
    'remaining', greatest(v_max_usage - v_usage_count, 0)
  );
end;
$$;

create or replace function public.try_consume_ai_image_analysis(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean := false;
  v_owner uuid;
  v_usage_count int;
  v_max_usage int;
  v_remaining int;
begin
  if v_user_id is null then
    raise exception 'Sİ funksiyasından istifadə üçün daxil olun.'
      using errcode = 'P0001';
  end if;

  select (p.role = 'admin')
  into v_is_admin
  from public.profiles as p
  where p.id = v_user_id;

  if coalesce(v_is_admin, false) then
    return jsonb_build_object(
      'allowed', true,
      'is_admin', true,
      'remaining', null
    );
  end if;

  select l.user_id
  into v_owner
  from public.listings as l
  where l.id = p_listing_id;

  if v_owner is null then
    raise exception 'Elan tapılmadı.'
      using errcode = 'P0001';
  end if;

  if v_owner is distinct from v_user_id then
    raise exception 'Bu elan üçün Sİ emalı icazəsi yoxdur.'
      using errcode = 'P0001';
  end if;

  insert into public.ai_usage_limits (user_id, listing_id, feature, usage_count, max_usage)
  values (v_user_id, p_listing_id, 'ai_image_analysis', 0, 2)
  on conflict (user_id, listing_id, feature) do nothing;

  select a.usage_count, a.max_usage
  into v_usage_count, v_max_usage
  from public.ai_usage_limits as a
  where a.user_id = v_user_id
    and a.listing_id = p_listing_id
    and a.feature = 'ai_image_analysis'
  for update;

  if v_usage_count >= v_max_usage then
    return jsonb_build_object(
      'allowed', false,
      'is_admin', false,
      'remaining', 0,
      'message', 'Bu elan üçün Sİ emal limiti tamamlanıb. Məlumatları əl ilə redaktə edə bilərsiniz.'
    );
  end if;

  update public.ai_usage_limits
  set usage_count = usage_count + 1
  where user_id = v_user_id
    and listing_id = p_listing_id
    and feature = 'ai_image_analysis'
    and usage_count < max_usage
  returning usage_count, max_usage
  into v_usage_count, v_max_usage;

  if not found then
    return jsonb_build_object(
      'allowed', false,
      'is_admin', false,
      'remaining', 0,
      'message', 'Bu elan üçün Sİ emal limiti tamamlanıb. Məlumatları əl ilə redaktə edə bilərsiniz.'
    );
  end if;

  v_remaining := greatest(v_max_usage - v_usage_count, 0);

  return jsonb_build_object(
    'allowed', true,
    'is_admin', false,
    'remaining', v_remaining,
    'usage_count', v_usage_count,
    'max_usage', v_max_usage
  );
end;
$$;

create or replace function public.create_listing_draft_for_ai()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_listing_id uuid;
begin
  if v_user_id is null then
    raise exception 'Sİ funksiyasından istifadə üçün daxil olun.'
      using errcode = 'P0001';
  end if;

  insert into public.listings (
    user_id,
    title,
    price,
    category,
    city,
    condition,
    description
  )
  values (
    v_user_id,
    'Qaralama',
    1,
    'Digər',
    'Bakı',
    'İşlənmiş',
    null
  )
  returning id into v_listing_id;

  return v_listing_id;
end;
$$;

revoke all on function public.get_ai_image_analysis_usage(uuid) from public;
revoke all on function public.try_consume_ai_image_analysis(uuid) from public;
revoke all on function public.create_listing_draft_for_ai() from public;

grant execute on function public.get_ai_image_analysis_usage(uuid) to authenticated;
grant execute on function public.try_consume_ai_image_analysis(uuid) to authenticated;
grant execute on function public.create_listing_draft_for_ai() to authenticated;
