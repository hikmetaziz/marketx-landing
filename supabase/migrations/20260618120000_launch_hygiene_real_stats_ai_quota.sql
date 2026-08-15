-- Launch hygiene: public stats must be real-only, and AI image quota must be user-based.

create or replace function public.get_listing_stats(p_listing_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_owner uuid;
  listing_status text;
  real_fav_count integer;
  real_view_count integer;
  is_privileged boolean;
begin
  select user_id, status::text
  into listing_owner, listing_status
  from public.listings
  where id = p_listing_id;

  if listing_owner is null then
    return json_build_object('views', 0, 'favorites', 0, 'contacts', 0);
  end if;

  is_privileged := auth.uid() is not null and (auth.uid() = listing_owner or public.is_admin());

  if not is_privileged and listing_status <> 'active' then
    raise exception 'Not authorized';
  end if;

  select count(*)::integer
  into real_view_count
  from public.listing_views
  where listing_id = p_listing_id
    and is_owner_view = false;

  select count(*)::integer
  into real_fav_count
  from public.favorites
  where listing_id = p_listing_id;

  return json_build_object(
    'views', real_view_count,
    'favorites', real_fav_count,
    'contacts', 0
  );
end;
$$;

revoke all on function public.get_listing_stats(uuid) from public;
grant execute on function public.get_listing_stats(uuid) to anon, authenticated;

create table if not exists public.ai_usage_buckets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  feature text not null,
  bucket_type text not null check (bucket_type in ('daily', 'monthly')),
  bucket_start date not null,
  usage_count int not null default 0 check (usage_count >= 0),
  max_usage int not null check (max_usage > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, feature, bucket_type, bucket_start)
);

create index if not exists ai_usage_buckets_user_feature_idx
  on public.ai_usage_buckets (user_id, feature, bucket_type, bucket_start desc);

create or replace function public.set_ai_usage_buckets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ai_usage_buckets_set_updated_at on public.ai_usage_buckets;
create trigger ai_usage_buckets_set_updated_at
  before update on public.ai_usage_buckets
  for each row
  execute function public.set_ai_usage_buckets_updated_at();

alter table public.ai_usage_buckets enable row level security;

drop policy if exists "ai_usage_buckets_select_own" on public.ai_usage_buckets;
create policy "ai_usage_buckets_select_own"
  on public.ai_usage_buckets
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

revoke insert, update, delete on public.ai_usage_buckets from anon, authenticated;

create or replace function public.get_ai_feature_usage(
  p_feature text default 'ai_image_analysis',
  p_daily_limit int default 2,
  p_monthly_limit int default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean := false;
  v_daily_start date := current_date;
  v_monthly_start date := date_trunc('month', now())::date;
  v_daily_usage int := 0;
  v_monthly_usage int := 0;
  v_daily_max int := greatest(coalesce(p_daily_limit, 2), 1);
  v_monthly_max int := greatest(coalesce(p_monthly_limit, 20), 1);
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
      'max_usage', null,
      'daily_remaining', null,
      'monthly_remaining', null
    );
  end if;

  select usage_count, max_usage
  into v_daily_usage, v_daily_max
  from public.ai_usage_buckets
  where user_id = v_user_id
    and feature = p_feature
    and bucket_type = 'daily'
    and bucket_start = v_daily_start;

  if not found then
    v_daily_usage := 0;
    v_daily_max := greatest(coalesce(p_daily_limit, 2), 1);
  end if;

  select usage_count, max_usage
  into v_monthly_usage, v_monthly_max
  from public.ai_usage_buckets
  where user_id = v_user_id
    and feature = p_feature
    and bucket_type = 'monthly'
    and bucket_start = v_monthly_start;

  if not found then
    v_monthly_usage := 0;
    v_monthly_max := greatest(coalesce(p_monthly_limit, 20), 1);
  end if;

  return jsonb_build_object(
    'is_admin', false,
    'usage_count', v_daily_usage,
    'max_usage', v_daily_max,
    'remaining', greatest(v_daily_max - v_daily_usage, 0),
    'daily_remaining', greatest(v_daily_max - v_daily_usage, 0),
    'monthly_remaining', greatest(v_monthly_max - v_monthly_usage, 0),
    'monthly_usage_count', v_monthly_usage,
    'monthly_max_usage', v_monthly_max
  );
end;
$$;

create or replace function public.try_consume_ai_feature(
  p_feature text default 'ai_image_analysis',
  p_daily_limit int default 2,
  p_monthly_limit int default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean := false;
  v_daily_start date := current_date;
  v_monthly_start date := date_trunc('month', now())::date;
  v_daily_usage int;
  v_daily_max int := greatest(coalesce(p_daily_limit, 2), 1);
  v_monthly_usage int;
  v_monthly_max int := greatest(coalesce(p_monthly_limit, 20), 1);
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
      'remaining', null,
      'daily_remaining', null,
      'monthly_remaining', null
    );
  end if;

  insert into public.ai_usage_buckets (user_id, feature, bucket_type, bucket_start, usage_count, max_usage)
  values
    (v_user_id, p_feature, 'daily', v_daily_start, 0, v_daily_max),
    (v_user_id, p_feature, 'monthly', v_monthly_start, 0, v_monthly_max)
  on conflict (user_id, feature, bucket_type, bucket_start)
  do update set max_usage = excluded.max_usage;

  select usage_count, max_usage
  into v_daily_usage, v_daily_max
  from public.ai_usage_buckets
  where user_id = v_user_id
    and feature = p_feature
    and bucket_type = 'daily'
    and bucket_start = v_daily_start
  for update;

  select usage_count, max_usage
  into v_monthly_usage, v_monthly_max
  from public.ai_usage_buckets
  where user_id = v_user_id
    and feature = p_feature
    and bucket_type = 'monthly'
    and bucket_start = v_monthly_start
  for update;

  if v_daily_usage >= v_daily_max then
    return jsonb_build_object(
      'allowed', false,
      'is_admin', false,
      'remaining', 0,
      'daily_remaining', 0,
      'monthly_remaining', greatest(v_monthly_max - v_monthly_usage, 0),
      'message', 'Bu gün üçün Sİ emal limiti tamamlanıb. Məlumatları əl ilə redaktə edə bilərsiniz.'
    );
  end if;

  if v_monthly_usage >= v_monthly_max then
    return jsonb_build_object(
      'allowed', false,
      'is_admin', false,
      'remaining', greatest(v_daily_max - v_daily_usage, 0),
      'daily_remaining', greatest(v_daily_max - v_daily_usage, 0),
      'monthly_remaining', 0,
      'message', 'Bu ay üçün Sİ emal limiti tamamlanıb. Məlumatları əl ilə redaktə edə bilərsiniz.'
    );
  end if;

  update public.ai_usage_buckets
  set usage_count = usage_count + 1
  where user_id = v_user_id
    and feature = p_feature
    and bucket_type = 'daily'
    and bucket_start = v_daily_start
  returning usage_count, max_usage
  into v_daily_usage, v_daily_max;

  update public.ai_usage_buckets
  set usage_count = usage_count + 1
  where user_id = v_user_id
    and feature = p_feature
    and bucket_type = 'monthly'
    and bucket_start = v_monthly_start
  returning usage_count, max_usage
  into v_monthly_usage, v_monthly_max;

  return jsonb_build_object(
    'allowed', true,
    'is_admin', false,
    'remaining', greatest(v_daily_max - v_daily_usage, 0),
    'daily_remaining', greatest(v_daily_max - v_daily_usage, 0),
    'monthly_remaining', greatest(v_monthly_max - v_monthly_usage, 0),
    'usage_count', v_daily_usage,
    'max_usage', v_daily_max,
    'monthly_usage_count', v_monthly_usage,
    'monthly_max_usage', v_monthly_max
  );
end;
$$;

revoke all on function public.get_ai_feature_usage(text, int, int) from public;
revoke all on function public.try_consume_ai_feature(text, int, int) from public;
grant execute on function public.get_ai_feature_usage(text, int, int) to authenticated;
grant execute on function public.try_consume_ai_feature(text, int, int) to authenticated;

create or replace function public.listings_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(auth.role(), current_setting('request.jwt.claim.role', true));
  v_review_sensitive_changed boolean;
begin
  if v_role = 'service_role' then
    if current_setting('app.launch_cleanup', true) = 'on' then
      new.user_id := old.user_id;
      return new;
    end if;

    if old.user_id is null then
      raise exception 'listing owner is required for service role listing update';
    end if;

    new.user_id := old.user_id;
    new.status := old.status;
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
    new.rejected_reason := old.rejected_reason;
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if auth.uid() is distinct from old.user_id then
    raise exception 'Not authorized';
  end if;

  new.user_id := old.user_id;
  new.view_seed := old.view_seed;
  new.favorite_seed := old.favorite_seed;

  if new.status is distinct from old.status then
    if old.status = 'active' and new.status = 'sold' then
      new.reviewed_at := old.reviewed_at;
      new.reviewed_by := old.reviewed_by;
      new.rejected_reason := old.rejected_reason;
      return new;
    end if;

    raise exception 'Status change not permitted';
  end if;

  v_review_sensitive_changed :=
    old.status = 'active'
    and (
      new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.price is distinct from old.price
      or new.category is distinct from old.category
      or new.category_id is distinct from old.category_id
      or new.subcategory_id is distinct from old.subcategory_id
      or new.attributes is distinct from old.attributes
      or new.listing_type is distinct from old.listing_type
      or new.price_type is distinct from old.price_type
      or new.delivery_type is distinct from old.delivery_type
      or new.condition_code is distinct from old.condition_code
      or new.contact_phone is distinct from old.contact_phone
      or new.image_url is distinct from old.image_url
      or new.image_urls is distinct from old.image_urls
    );

  if v_review_sensitive_changed then
    new.status := 'pending';
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.rejected_reason := null;
  else
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
    new.rejected_reason := old.rejected_reason;
  end if;

  return new;
end;
$$;

create or replace function public.launch_cleanup_reject_listings(
  p_listing_ids uuid[],
  p_reason text default 'Launch cleanup: sample/test listing hidden before production'
)
returns table (
  id uuid,
  previous_status text,
  new_status text,
  title text,
  source text,
  is_sample boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(auth.role(), current_setting('request.jwt.claim.role', true));
begin
  if v_role <> 'service_role' and not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  perform set_config('app.launch_cleanup', 'on', true);

  return query
  with candidates as (
    select l.*
    from public.listings l
    where l.id = any(p_listing_ids)
      and (
        l.is_sample = true
        or coalesce(l.source, '') in ('sample', 'old_ai_draft')
        or coalesce(l.source_url, '') like 'import-test://%'
        or lower(coalesce(l.title, '')) like '%import test%'
        or lower(coalesce(l.title, '')) like '%sample%'
        or lower(coalesce(l.title, '')) like '%test%'
      )
  ),
  updated as (
    update public.listings l
    set
      status = 'rejected',
      rejected_reason = coalesce(nullif(trim(p_reason), ''), 'Launch cleanup'),
      reviewed_at = now(),
      reviewed_by = coalesce(auth.uid(), l.reviewed_by)
    from candidates c
    where l.id = c.id
    returning
      l.id,
      c.status::text as previous_status,
      l.status::text as new_status,
      l.title,
      l.source,
      l.is_sample
  )
  select updated.id, updated.previous_status, updated.new_status, updated.title, updated.source, updated.is_sample
  from updated
  order by updated.title;
end;
$$;

revoke all on function public.launch_cleanup_reject_listings(uuid[], text) from public;
grant execute on function public.launch_cleanup_reject_listings(uuid[], text) to authenticated, service_role;
