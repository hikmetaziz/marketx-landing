-- Listing taxonomy groundwork for the next UI phase.
--
-- Keep the current listings.category text column working, but add normalized
-- category/subcategory ids plus a jsonb attributes bag for dynamic fields.
-- The UI can move to these fields gradually without breaking existing listings.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  slug text not null,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, slug)
);

create table if not exists public.category_attribute_definitions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  subcategory_id uuid references public.subcategories (id) on delete cascade,
  key text not null,
  label text not null,
  value_type text not null check (value_type in ('text', 'number', 'boolean', 'select', 'multiselect')),
  options jsonb not null default '[]'::jsonb,
  unit text,
  is_required boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(options) = 'array')
);

alter table public.listings
  add column if not exists category_id uuid references public.categories (id) on delete set null,
  add column if not exists subcategory_id uuid references public.subcategories (id) on delete set null,
  add column if not exists attributes jsonb not null default '{}'::jsonb;

alter table public.listings
  add constraint listings_attributes_is_object check (jsonb_typeof(attributes) = 'object') not valid;

alter table public.listings validate constraint listings_attributes_is_object;

create index if not exists listings_category_id_idx on public.listings (category_id);
create index if not exists listings_subcategory_id_idx on public.listings (subcategory_id);
create index if not exists listings_attributes_gin_idx on public.listings using gin (attributes);
create index if not exists subcategories_category_id_idx on public.subcategories (category_id);
create index if not exists category_attribute_definitions_category_idx
  on public.category_attribute_definitions (category_id, subcategory_id, sort_order);
create unique index if not exists category_attribute_definitions_category_key
  on public.category_attribute_definitions (category_id, key)
  where subcategory_id is null;
create unique index if not exists category_attribute_definitions_subcategory_key
  on public.category_attribute_definitions (category_id, subcategory_id, key)
  where subcategory_id is not null;

create or replace function public.set_taxonomy_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row
  execute function public.set_taxonomy_updated_at();

drop trigger if exists subcategories_set_updated_at on public.subcategories;
create trigger subcategories_set_updated_at
  before update on public.subcategories
  for each row
  execute function public.set_taxonomy_updated_at();

drop trigger if exists category_attribute_definitions_set_updated_at
  on public.category_attribute_definitions;
create trigger category_attribute_definitions_set_updated_at
  before update on public.category_attribute_definitions
  for each row
  execute function public.set_taxonomy_updated_at();

insert into public.categories (slug, name, sort_order)
values
  ('nəqliyyat vasitələri', 'Nəqliyyat vasitələri', 10),
  ('telefon', 'Telefon', 20),
  ('elektronika', 'Elektronika', 30),
  ('dasinmaz-emlak', 'Daşınmaz əmlak', 40),
  ('ev-ve-bag', 'Ev və bağ', 50),
  ('geyim', 'Geyim', 60),
  ('usaq-alemi', 'Uşaq aləmi', 70),
  ('xidmetler', 'Xidmətlər', 80),
  ('diger', 'Digər', 90)
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true;

with seeded_subcategories(category_slug, slug, name, sort_order) as (
  values
    ('telefon', 'smartfonlar', 'Smartfonlar', 10),
    ('telefon', 'aksesuarlar', 'Telefon aksesuarları', 20),
    ('elektronika', 'komputerler', 'Kompüterlər', 10),
    ('elektronika', 'televizorlar', 'Televizorlar', 20),
    ('avto', 'avtomobiller', 'Avtomobillər', 10),
    ('avto', 'ehtiyat-hisseleri', 'Ehtiyat hissələri', 20),
    ('dasinmaz-emlak', 'menziller', 'Mənzillər', 10),
    ('dasinmaz-emlak', 'heyet-evleri', 'Həyət evləri', 20),
    ('ev-ve-bag', 'mebel', 'Mebel', 10),
    ('ev-ve-bag', 'meiset-texnikasi', 'Məişət texnikası', 20),
    ('geyim', 'qadin-geyimleri', 'Qadın geyimləri', 10),
    ('geyim', 'kisi-geyimleri', 'Kişi geyimləri', 20),
    ('usaq-alemi', 'usaq-geyimleri', 'Uşaq geyimləri', 10),
    ('usaq-alemi', 'oyuncaqlar', 'Oyuncaqlar', 20),
    ('xidmetler', 'temir', 'Təmir', 10),
    ('xidmetler', 'dersler', 'Dərslər', 20),
    ('diger', 'diger', 'Digər', 10)
)
insert into public.subcategories (category_id, slug, name, sort_order)
select c.id, s.slug, s.name, s.sort_order
from seeded_subcategories s
join public.categories c on c.slug = s.category_slug
on conflict (category_id, slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true;

alter table public.listings disable trigger listings_before_update;

update public.listings as l
set category_id = c.id
from public.categories c
where l.category_id is null
  and (
    l.category = c.name
    or (c.slug = 'avto' and l.category = 'Avtomobil')
    or (c.slug = 'ev-ve-bag' and l.category in ('Ev əşyaları', 'Mebel'))
  );

alter table public.listings enable trigger listings_before_update;

create or replace function public.sync_listing_taxonomy_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_category public.categories%rowtype;
  matched_subcategory public.subcategories%rowtype;
begin
  if new.attributes is null then
    new.attributes := '{}'::jsonb;
  end if;

  if jsonb_typeof(new.attributes) <> 'object' then
    raise exception 'listing attributes must be a JSON object';
  end if;

  if new.subcategory_id is not null then
    select *
      into matched_subcategory
    from public.subcategories
    where id = new.subcategory_id;

    if matched_subcategory.id is null then
      raise exception 'subcategory_id is invalid';
    end if;

    if new.category_id is null then
      new.category_id := matched_subcategory.category_id;
    elsif new.category_id is distinct from matched_subcategory.category_id then
      raise exception 'subcategory_id does not belong to category_id';
    end if;
  end if;

  if new.category_id is null and nullif(trim(coalesce(new.category, '')), '') is not null then
    select *
      into matched_category
    from public.categories
    where name = new.category
      or (slug = 'avto' and new.category = 'Avtomobil')
      or (slug = 'ev-ve-bag' and new.category in ('Ev əşyaları', 'Mebel'))
    order by sort_order asc
    limit 1;

    if matched_category.id is not null then
      new.category_id := matched_category.id;
    end if;
  end if;

  if new.category_id is not null and nullif(trim(coalesce(new.category, '')), '') is null then
    select *
      into matched_category
    from public.categories
    where id = new.category_id;

    if matched_category.id is not null then
      new.category := matched_category.name;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists listings_sync_taxonomy_fields on public.listings;
create trigger listings_sync_taxonomy_fields
  before insert or update on public.listings
  for each row
  execute function public.sync_listing_taxonomy_fields();

create or replace function public.listings_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review_sensitive_changed boolean;
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

alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.category_attribute_definitions enable row level security;

drop policy if exists "categories_select_active" on public.categories;
create policy "categories_select_active"
  on public.categories
  for select
  to anon, authenticated
  using (is_active or public.is_admin());

drop policy if exists "subcategories_select_active" on public.subcategories;
create policy "subcategories_select_active"
  on public.subcategories
  for select
  to anon, authenticated
  using (is_active or public.is_admin());

drop policy if exists "category_attribute_definitions_select_active"
  on public.category_attribute_definitions;
create policy "category_attribute_definitions_select_active"
  on public.category_attribute_definitions
  for select
  to anon, authenticated
  using (is_active or public.is_admin());

drop policy if exists "categories_admin_all" on public.categories;
create policy "categories_admin_all"
  on public.categories
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "subcategories_admin_all" on public.subcategories;
create policy "subcategories_admin_all"
  on public.subcategories
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "category_attribute_definitions_admin_all"
  on public.category_attribute_definitions;
create policy "category_attribute_definitions_admin_all"
  on public.category_attribute_definitions
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
