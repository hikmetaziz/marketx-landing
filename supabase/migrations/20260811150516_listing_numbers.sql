-- Database-generated listing numbers (MX-000001, MX-000002, ...)

create sequence if not exists public.listings_listing_number_seq;

create or replace function public.format_listing_number(num bigint)
returns text
language sql
immutable
as $$
  select case
    when num >= 1 and num <= 999999 then 'MX-' || lpad(num::text, 6, '0')
    else 'MX-' || num::text
  end;
$$;

alter table public.listings
  add column if not exists listing_number bigint;

alter table public.listings disable trigger listings_before_update;

with numbered as (
  select
    id,
    row_number() over (order by created_at asc, id asc) as rn
  from public.listings
  where listing_number is null
)
update public.listings as l
set listing_number = numbered.rn
from numbered
where l.id = numbered.id;

alter table public.listings enable trigger listings_before_update;

select setval(
  'public.listings_listing_number_seq',
  coalesce((select max(listing_number) from public.listings), 1),
  exists(select 1 from public.listings)
);

alter table public.listings
  alter column listing_number set not null;

create unique index if not exists listings_listing_number_key
  on public.listings (listing_number);

create or replace function public.assign_listing_number()
returns trigger
language plpgsql
as $$
begin
  if new.listing_number is null then
    new.listing_number := nextval('public.listings_listing_number_seq');
  end if;

  return new;
end;
$$;

drop trigger if exists listings_assign_listing_number on public.listings;
create trigger listings_assign_listing_number
  before insert on public.listings
  for each row
  execute function public.assign_listing_number();

create or replace function public.protect_listing_number()
returns trigger
language plpgsql
as $$
begin
  new.listing_number := old.listing_number;
  return new;
end;
$$;

drop trigger if exists listings_protect_listing_number on public.listings;
create trigger listings_protect_listing_number
  before update on public.listings
  for each row
  execute function public.protect_listing_number();
