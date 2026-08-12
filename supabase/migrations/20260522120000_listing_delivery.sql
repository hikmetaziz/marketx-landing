alter table public.listings
  add column if not exists delivery_available boolean not null default false;
