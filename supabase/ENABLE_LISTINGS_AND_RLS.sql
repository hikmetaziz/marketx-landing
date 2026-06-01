-- MarktX: listings RLS + storage + elan yerləşdirmə
-- Supabase Dashboard → SQL Editor → New query → yapışdır → Run
--
-- Əvvəl listings cədvəli olmalıdır. Xəta alarsanız, listings cədvəli yoxdursa
-- əvvəlcə mobil app migration-larını işlədin.

-- 1) Admin helper
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- 2) Listings sütunları
alter table public.listings add column if not exists reviewed_at timestamptz;
alter table public.listings add column if not exists reviewed_by uuid references auth.users (id) on delete set null;
alter table public.listings add column if not exists rejected_reason text;
alter table public.listings add column if not exists delivery_available boolean default false;
alter table public.listings add column if not exists contact_phone text;

-- 3) RLS aktiv
alter table public.listings enable row level security;

-- 4) Insert/update trigger-lər
create or replace function public.listings_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if new.user_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'user_id must match authenticated user';
  end if;

  if not public.is_admin() then
    new.status := 'pending';
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.rejected_reason := null;
  end if;

  return new;
end;
$$;

create or replace function public.listings_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if auth.uid() is distinct from old.user_id then
    raise exception 'Not authorized';
  end if;

  new.user_id := old.user_id;

  if new.status is distinct from old.status then
    if old.status = 'active' and new.status = 'sold' then
      null;
    else
      raise exception 'Status change not permitted';
    end if;
  end if;

  new.reviewed_at := old.reviewed_at;
  new.reviewed_by := old.reviewed_by;
  new.rejected_reason := old.rejected_reason;

  return new;
end;
$$;

drop trigger if exists listings_before_insert on public.listings;
create trigger listings_before_insert
  before insert on public.listings
  for each row
  execute function public.listings_before_insert();

drop trigger if exists listings_before_update on public.listings;
create trigger listings_before_update
  before update on public.listings
  for each row
  execute function public.listings_before_update();

-- 5) Policies
drop policy if exists "listings_select_visible" on public.listings;
create policy "listings_select_visible"
  on public.listings for select to anon, authenticated
  using (
    status = 'active'
    or (auth.uid() is not null and auth.uid() = user_id)
    or public.is_admin()
  );

drop policy if exists "listings_insert_own" on public.listings;
create policy "listings_insert_own"
  on public.listings for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "listings_update_owner" on public.listings;
create policy "listings_update_owner"
  on public.listings for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "listings_update_admin" on public.listings;
create policy "listings_update_admin"
  on public.listings for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "listings_delete_owner" on public.listings;
create policy "listings_delete_owner"
  on public.listings for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "listings_delete_admin" on public.listings;
create policy "listings_delete_admin"
  on public.listings for delete to authenticated
  using (public.is_admin());

-- 6) Şəkil storage bucket + RLS
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "listing_images_public_read" on storage.objects;
create policy "listing_images_public_read"
  on storage.objects for select to public
  using (bucket_id = 'listing-images');

drop policy if exists "listing_images_insert_own" on storage.objects;
create policy "listing_images_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "listing_images_update_own" on storage.objects;
create policy "listing_images_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "listing_images_delete_own" on storage.objects;
create policy "listing_images_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
