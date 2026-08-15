-- MarktX staging bootstrap base schema.
-- Use only for a confirmed staging Supabase project when the database is empty
-- and the repo migrations expect public.listings to already exist.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'listing_status'
  ) then
    create type public.listing_status as enum (
      'draft',
      'pending',
      'active',
      'sold',
      'rejected',
      'archived',
      'deleted'
    );
  end if;
end $$;

alter type public.listing_status add value if not exists 'draft';
alter type public.listing_status add value if not exists 'pending';
alter type public.listing_status add value if not exists 'active';
alter type public.listing_status add value if not exists 'sold';
alter type public.listing_status add value if not exists 'rejected';
alter type public.listing_status add value if not exists 'archived';
alter type public.listing_status add value if not exists 'deleted';

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin', 'moderator')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (btrim(title) <> ''),
  price integer not null check (price >= 0),
  category text not null,
  city text not null,
  condition text,
  description text,
  image_url text,
  image_urls text[],
  status public.listing_status not null default 'pending',
  delivery_available boolean not null default false,
  contact_phone text,
  email text,
  is_sample boolean not null default false,
  source text not null default 'user',
  slug text,
  view_count integer not null default 0,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  rejected_reason text,
  sold_at timestamptz,
  expires_at timestamptz,
  deleted_at timestamptz,
  purge_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_user_id_idx on public.listings (user_id);
create index if not exists listings_status_created_at_idx on public.listings (status, created_at desc);
create index if not exists listings_slug_idx on public.listings (slug) where slug is not null;
create index if not exists listings_view_count_idx on public.listings (view_count desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.generate_listing_slug(title text, listing_id uuid)
returns text
language sql
immutable
as $$
  select
    trim(both '-' from regexp_replace(
      lower(
        translate(
          coalesce(title, 'elan'),
          'əöüğıçşƏÖÜĞIÇŞ',
          'eouigcsEOUIGCS'
        )
      ),
      '[^a-z0-9]+',
      '-',
      'g'
    ))
    || '-'
    || left(replace(listing_id::text, '-', ''), 8);
$$;

create or replace function public.listings_set_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := public.generate_listing_slug(new.title, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists listings_set_slug on public.listings;
create trigger listings_set_slug
  before insert or update of title, slug on public.listings
  for each row
  execute function public.listings_set_slug();

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before update on public.listings
  for each row
  execute function public.set_updated_at();

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
