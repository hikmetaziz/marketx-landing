-- Universal taxonomy model for listings.
--
-- This migration keeps the legacy listings.category text column intact, but
-- moves category meaning into stable top-level categories, subcategories, and
-- dynamic attributes. Legacy/free-text category names are mapped through
-- aliases so existing listings remain visible and editable.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'categories_slug_format'
  ) then
    alter table public.categories
      add constraint categories_slug_format
      check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'subcategories_slug_format'
  ) then
    alter table public.subcategories
      add constraint subcategories_slug_format
      check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$') not valid;
  end if;
end;
$$;

alter table public.categories validate constraint categories_slug_format;
alter table public.subcategories validate constraint subcategories_slug_format;

insert into public.categories (slug, name, sort_order, is_active)
values
  ('neqliyyat', 'Nəqliyyat', 10, true),
  ('dasinmaz-emlak', 'Daşınmaz əmlak', 20, true),
  ('elektronika', 'Elektronika', 30, true),
  ('ev-ve-bag', 'Ev və bağ', 40, true),
  ('geyim-ve-aksesuar', 'Geyim və aksesuar', 50, true),
  ('usaq-alemi', 'Uşaq aləmi', 60, true),
  ('idman-ve-hobbi', 'İdman və hobbi', 70, true),
  ('biznes-ve-avadanliq', 'Biznes və avadanlıq', 80, true),
  ('xidmetler', 'Xidmətlər', 90, true),
  ('diger', 'Digər', 100, true)
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- Legacy top-level categories are kept for foreign-key safety, but hidden from
-- future category pickers. Their old text values are mapped by aliases below.
update public.categories
set is_active = false
where slug in ('avto', 'telefon', 'geyim');

with seeded_subcategories(category_slug, slug, name, sort_order) as (
  values
    ('neqliyyat', 'minik-avtomobili', 'Minik avtomobili', 10),
    ('neqliyyat', 'motosiklet', 'Motosiklet', 20),
    ('neqliyyat', 'kommersiya-neqliyyati', 'Kommersiya nəqliyyatı', 30),
    ('neqliyyat', 'ehtiyat-hisseleri', 'Ehtiyat hissələri', 40),
    ('neqliyyat', 'avto-aksesuarlar', 'Avto aksesuarlar', 50),
    ('neqliyyat', 'avto-xidmetler', 'Avto xidmətlər', 60),
    ('dasinmaz-emlak', 'menzil', 'Mənzil', 10),
    ('dasinmaz-emlak', 'heyet-evi-villa', 'Həyət evi / villa', 20),
    ('dasinmaz-emlak', 'torpaq', 'Torpaq', 30),
    ('dasinmaz-emlak', 'obyekt-ofis', 'Obyekt / ofis', 40),
    ('dasinmaz-emlak', 'qaraj', 'Qaraj', 50),
    ('dasinmaz-emlak', 'gunluk-kiraye', 'Günlük kirayə', 60),
    ('elektronika', 'komputerler', 'Kompüterlər', 10),
    ('elektronika', 'telefonlar', 'Telefonlar', 20),
    ('elektronika', 'televizor-audio', 'Televizor / audio', 30),
    ('elektronika', 'foto-video', 'Foto / video', 40),
    ('elektronika', 'oyun-konsollari', 'Oyun konsolları', 50),
    ('elektronika', 'elektronika-aksesuarlari', 'Elektronika aksesuarları', 60),
    ('ev-ve-bag', 'mebel', 'Mebel', 10),
    ('ev-ve-bag', 'meiset-texnikasi', 'Məişət texnikası', 20),
    ('ev-ve-bag', 'ev-dekoru', 'Ev dekoru', 30),
    ('ev-ve-bag', 'temir-aletleri', 'Təmir alətləri', 40),
    ('ev-ve-bag', 'bag-heyet', 'Bağ / həyət', 50),
    ('ev-ve-bag', 'metbex-esyalari', 'Mətbəx əşyaları', 60),
    ('geyim-ve-aksesuar', 'kisi-geyimi', 'Kişi geyimi', 10),
    ('geyim-ve-aksesuar', 'qadin-geyimi', 'Qadın geyimi', 20),
    ('geyim-ve-aksesuar', 'usaq-geyimi', 'Uşaq geyimi', 30),
    ('geyim-ve-aksesuar', 'ayaqqabi', 'Ayaqqabı', 40),
    ('geyim-ve-aksesuar', 'canta-aksesuar', 'Çanta / aksesuar', 50),
    ('geyim-ve-aksesuar', 'saat-bijuteriya', 'Saat / bijuteriya', 60),
    ('usaq-alemi', 'oyuncaqlar', 'Oyuncaqlar', 10),
    ('usaq-alemi', 'usaq-arabasi', 'Uşaq arabası', 20),
    ('usaq-alemi', 'usaq-mebeli', 'Uşaq mebeli', 30),
    ('usaq-alemi', 'mekteb-levazimatlari', 'Məktəb ləvazimatları', 40),
    ('usaq-alemi', 'usaq-diger', 'Uşaq digər', 50),
    ('idman-ve-hobbi', 'idman-avadanligi', 'İdman avadanlığı', 10),
    ('idman-ve-hobbi', 'velosiped', 'Velosiped', 20),
    ('idman-ve-hobbi', 'musiqi-aletleri', 'Musiqi alətləri', 30),
    ('idman-ve-hobbi', 'kitablar', 'Kitablar', 40),
    ('idman-ve-hobbi', 'kolleksiya', 'Kolleksiya', 50),
    ('idman-ve-hobbi', 'hobbi-diger', 'Hobbi digər', 60),
    ('biznes-ve-avadanliq', 'ofis-avadanligi', 'Ofis avadanlığı', 10),
    ('biznes-ve-avadanliq', 'magaza-avadanligi', 'Mağaza avadanlığı', 20),
    ('biznes-ve-avadanliq', 'restoran-avadanligi', 'Restoran avadanlığı', 30),
    ('biznes-ve-avadanliq', 'tikinti-avadanligi', 'Tikinti avadanlığı', 40),
    ('biznes-ve-avadanliq', 'kend-teserrufati-avadanligi', 'Kənd təsərrüfatı avadanlığı', 50),
    ('xidmetler', 'temir', 'Təmir', 10),
    ('xidmetler', 'dasima', 'Daşıma', 20),
    ('xidmetler', 'tehsil', 'Təhsil', 30),
    ('xidmetler', 'gozellik-saglamliq', 'Gözəllik / sağlamlıq', 40),
    ('xidmetler', 'foto-video-xidmetleri', 'Foto / video xidmətləri', 50),
    ('xidmetler', 'diger-xidmetler', 'Digər xidmətlər', 60),
    ('diger', 'diger-elanlar', 'Digər elanlar', 10)
)
insert into public.subcategories (category_id, slug, name, sort_order, is_active)
select c.id, s.slug, s.name, s.sort_order, true
from seeded_subcategories s
join public.categories c on c.slug = s.category_slug
on conflict (category_id, slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true;

-- Hide legacy subcategories under legacy top-level categories. They are not
-- deleted so historical foreign keys and admin lookups remain safe.
update public.subcategories s
set is_active = false
from public.categories c
where s.category_id = c.id
  and c.slug in ('avto', 'telefon', 'geyim');

create table if not exists public.category_aliases (
  id uuid primary key default gen_random_uuid(),
  alias text not null unique,
  category_id uuid not null references public.categories (id) on delete cascade,
  subcategory_id uuid references public.subcategories (id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists category_aliases_set_updated_at on public.category_aliases;
create trigger category_aliases_set_updated_at
  before update on public.category_aliases
  for each row
  execute function public.set_taxonomy_updated_at();

with alias_seed(alias, category_slug, subcategory_slug) as (
  values
    ('telefon', 'elektronika', 'telefonlar'),
    ('telefonlar', 'elektronika', 'telefonlar'),
    ('avto', 'neqliyyat', 'minik-avtomobili'),
    ('avtomobil', 'neqliyyat', 'minik-avtomobili'),
    ('nəqliyyat', 'neqliyyat', null),
    ('neqliyyat', 'neqliyyat', null),
    ('əmlak', 'dasinmaz-emlak', null),
    ('emlak', 'dasinmaz-emlak', null),
    ('daşınmaz əmlak', 'dasinmaz-emlak', null),
    ('dasinmaz emlak', 'dasinmaz-emlak', null),
    ('elektronika', 'elektronika', null),
    ('ev və bağ', 'ev-ve-bag', null),
    ('ev ve bag', 'ev-ve-bag', null),
    ('ev əşyaları', 'ev-ve-bag', 'metbex-esyalari'),
    ('ev esyalari', 'ev-ve-bag', 'metbex-esyalari'),
    ('mebel', 'ev-ve-bag', 'mebel'),
    ('geyim', 'geyim-ve-aksesuar', null),
    ('geyim və aksesuar', 'geyim-ve-aksesuar', null),
    ('geyim ve aksesuar', 'geyim-ve-aksesuar', null),
    ('uşaq aləmi', 'usaq-alemi', null),
    ('usaq alemi', 'usaq-alemi', null),
    ('xidmətlər', 'xidmetler', null),
    ('xidmetler', 'xidmetler', null),
    ('digər', 'diger', 'diger-elanlar'),
    ('diger', 'diger', 'diger-elanlar')
)
insert into public.category_aliases (alias, category_id, subcategory_id, is_active)
select
  lower(trim(a.alias)),
  c.id,
  s.id,
  true
from alias_seed a
join public.categories c on c.slug = a.category_slug
left join public.subcategories s on s.category_id = c.id and s.slug = a.subcategory_slug
on conflict (alias) do update
set
  category_id = excluded.category_id,
  subcategory_id = excluded.subcategory_id,
  is_active = true;

alter table public.listings
  add column if not exists listing_type text not null default 'sell',
  add column if not exists price_type text not null default 'fixed',
  add column if not exists delivery_type text not null default 'pickup',
  add column if not exists condition_code text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'listings_listing_type_check'
  ) then
    alter table public.listings
      add constraint listings_listing_type_check
      check (listing_type in ('sell', 'buy', 'rent', 'service')) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'listings_price_type_check'
  ) then
    alter table public.listings
      add constraint listings_price_type_check
      check (price_type in ('fixed', 'negotiable', 'free', 'barter')) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'listings_delivery_type_check'
  ) then
    alter table public.listings
      add constraint listings_delivery_type_check
      check (delivery_type in ('pickup', 'delivery', 'both')) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'listings_condition_code_check'
  ) then
    alter table public.listings
      add constraint listings_condition_code_check
      check (
        condition_code is null
        or condition_code in ('new', 'excellent', 'good', 'fair', 'for_parts')
      ) not valid;
  end if;
end;
$$;

alter table public.listings validate constraint listings_listing_type_check;
alter table public.listings validate constraint listings_price_type_check;
alter table public.listings validate constraint listings_delivery_type_check;
alter table public.listings validate constraint listings_condition_code_check;

create index if not exists listings_listing_type_idx on public.listings (listing_type);
create index if not exists listings_price_type_idx on public.listings (price_type);
create index if not exists listings_delivery_type_idx on public.listings (delivery_type);
create index if not exists listings_condition_code_idx on public.listings (condition_code);
create index if not exists category_aliases_alias_idx on public.category_aliases (alias);

alter table public.category_attribute_definitions
  alter column category_id drop not null,
  add column if not exists label_az text,
  add column if not exists type text,
  add column if not exists is_filterable boolean not null default false;

update public.category_attribute_definitions
set
  label_az = coalesce(label_az, label),
  type = coalesce(
    type,
    case value_type
      when 'multiselect' then 'multi_select'
      else value_type
    end
  )
where label_az is null
   or type is null;

alter table public.category_attribute_definitions
  alter column label_az set not null,
  alter column type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'category_attribute_definitions_type_check_v2'
  ) then
    alter table public.category_attribute_definitions
      add constraint category_attribute_definitions_type_check_v2
      check (type in ('text', 'number', 'boolean', 'select', 'multi_select')) not valid;
  end if;
end;
$$;

alter table public.category_attribute_definitions
  validate constraint category_attribute_definitions_type_check_v2;

create unique index if not exists category_attribute_definitions_subcategory_only_key
  on public.category_attribute_definitions (subcategory_id, key)
  where subcategory_id is not null;

with attribute_seed(category_slug, subcategory_slug, key, label_az, type, options, is_required, is_filterable, sort_order) as (
  values
    ('neqliyyat', 'minik-avtomobili', 'brand', 'Marka', 'text', '[]'::jsonb, true, true, 10),
    ('neqliyyat', 'minik-avtomobili', 'model', 'Model', 'text', '[]'::jsonb, true, true, 20),
    ('neqliyyat', 'minik-avtomobili', 'year', 'Buraxılış ili', 'number', '[]'::jsonb, true, true, 30),
    ('neqliyyat', 'minik-avtomobili', 'mileage', 'Yürüş', 'number', '[]'::jsonb, false, true, 40),
    ('neqliyyat', 'minik-avtomobili', 'fuel_type', 'Yanacaq növü', 'select', '["benzin","dizel","hibrid","elektrik","qaz"]'::jsonb, false, true, 50),
    ('neqliyyat', 'minik-avtomobili', 'transmission', 'Sürətlər qutusu', 'select', '["mexaniki","avtomat","robot","variator"]'::jsonb, false, true, 60),
    ('neqliyyat', 'minik-avtomobili', 'body_type', 'Ban növü', 'select', '["sedan","hetcbek","universal","suv","kupe","pikap","miniven"]'::jsonb, false, true, 70),
    ('neqliyyat', 'minik-avtomobili', 'engine', 'Mühərrik', 'text', '[]'::jsonb, false, true, 80),
    ('neqliyyat', 'minik-avtomobili', 'color', 'Rəng', 'text', '[]'::jsonb, false, true, 90),
    ('elektronika', 'komputerler', 'brand', 'Marka', 'text', '[]'::jsonb, true, true, 10),
    ('elektronika', 'komputerler', 'model', 'Model', 'text', '[]'::jsonb, true, true, 20),
    ('elektronika', 'komputerler', 'storage', 'Yaddaş', 'number', '[]'::jsonb, false, true, 30),
    ('elektronika', 'komputerler', 'ram', 'RAM', 'number', '[]'::jsonb, false, true, 40),
    ('elektronika', 'komputerler', 'color', 'Rəng', 'text', '[]'::jsonb, false, true, 50),
    ('elektronika', 'komputerler', 'battery_percent', 'Batareya faizi', 'number', '[]'::jsonb, false, true, 60),
    ('elektronika', 'komputerler', 'warranty', 'Zəmanət', 'boolean', '[]'::jsonb, false, true, 70),
    ('elektronika', 'komputerler', 'box_included', 'Qutu var', 'boolean', '[]'::jsonb, false, false, 80),
    ('dasinmaz-emlak', 'menzil', 'room_count', 'Otaq sayı', 'number', '[]'::jsonb, true, true, 10),
    ('dasinmaz-emlak', 'menzil', 'area_m2', 'Sahə', 'number', '[]'::jsonb, true, true, 20),
    ('dasinmaz-emlak', 'menzil', 'floor', 'Mərtəbə', 'number', '[]'::jsonb, false, true, 30),
    ('dasinmaz-emlak', 'menzil', 'total_floors', 'Ümumi mərtəbə', 'number', '[]'::jsonb, false, true, 40),
    ('dasinmaz-emlak', 'menzil', 'document_type', 'Sənəd', 'select', '["kupca","muqavile","order","yoxdur"]'::jsonb, false, true, 50),
    ('dasinmaz-emlak', 'menzil', 'repair_status', 'Təmir vəziyyəti', 'select', '["temirsiz","orta","yaxsi","ela","yeni-temirli"]'::jsonb, false, true, 60),
    ('dasinmaz-emlak', 'menzil', 'building_type', 'Bina növü', 'select', '["yeni-tikili","kohne-tikili","heyet-evi"]'::jsonb, false, true, 70)
)
insert into public.category_attribute_definitions (
  category_id,
  subcategory_id,
  key,
  label,
  label_az,
  value_type,
  type,
  options,
  is_required,
  is_filterable,
  sort_order,
  is_active
)
select
  c.id,
  s.id,
  a.key,
  a.label_az,
  a.label_az,
  case a.type when 'multi_select' then 'multiselect' else a.type end,
  a.type,
  a.options,
  a.is_required,
  a.is_filterable,
  a.sort_order,
  true
from attribute_seed a
join public.categories c on c.slug = a.category_slug
join public.subcategories s on s.category_id = c.id and s.slug = a.subcategory_slug
on conflict (category_id, subcategory_id, key) where subcategory_id is not null do update
set
  label = excluded.label,
  label_az = excluded.label_az,
  value_type = excluded.value_type,
  type = excluded.type,
  options = excluded.options,
  is_required = excluded.is_required,
  is_filterable = excluded.is_filterable,
  sort_order = excluded.sort_order,
  is_active = true;

create or replace function public.resolve_listing_taxonomy_alias(input_value text)
returns table(category_id uuid, subcategory_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select lower(trim(coalesce(input_value, ''))) as alias
  ),
  alias_match as (
    select a.category_id, a.subcategory_id, 1 as rank
    from normalized n
    join public.category_aliases a on a.alias = n.alias
    where a.is_active
    limit 1
  ),
  category_match as (
    select c.id as category_id, null::uuid as subcategory_id, 2 as rank
    from normalized n
    join public.categories c on c.is_active and (c.slug = n.alias or lower(c.name) = n.alias)
    limit 1
  ),
  fallback_match as (
    select c.id as category_id, s.id as subcategory_id, 3 as rank
    from public.categories c
    left join public.subcategories s
      on s.category_id = c.id and s.slug = 'diger-elanlar'
    where c.slug = 'diger'
    limit 1
  )
  select m.category_id, m.subcategory_id
  from (
    select * from alias_match
    union all
    select * from category_match
    union all
    select * from fallback_match
  ) m
  order by m.rank
  limit 1;
$$;

create or replace function public.sync_listing_taxonomy_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_category public.categories%rowtype;
  matched_subcategory public.subcategories%rowtype;
  resolved_category_id uuid;
  resolved_subcategory_id uuid;
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
    select r.category_id, r.subcategory_id
      into resolved_category_id, resolved_subcategory_id
    from public.resolve_listing_taxonomy_alias(new.category) r;

    new.category_id := resolved_category_id;
    if new.subcategory_id is null then
      new.subcategory_id := resolved_subcategory_id;
    end if;
  end if;

  if new.category_id is null then
    select c.id, s.id
      into new.category_id, new.subcategory_id
    from public.categories c
    left join public.subcategories s on s.category_id = c.id and s.slug = 'diger-elanlar'
    where c.slug = 'diger'
    limit 1;
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

  if new.condition_code is null then
    if new.condition in ('Yeni', 'new') then
      new.condition_code := 'new';
    elsif new.condition in ('Əla', 'excellent') then
      new.condition_code := 'excellent';
    elsif new.condition in ('İşlənmiş', 'Yaxşı', 'good') then
      new.condition_code := 'good';
    elsif new.condition in ('Orta', 'fair') then
      new.condition_code := 'fair';
    end if;
  end if;

  return new;
end;
$$;

alter table public.listings disable trigger listings_before_update;

with legacy_target as (
  select
    l.id,
    r.category_id,
    r.subcategory_id
  from public.listings l
  cross join lateral public.resolve_listing_taxonomy_alias(l.category) r
)
update public.listings l
set
  category_id = lt.category_id,
  subcategory_id = coalesce(l.subcategory_id, lt.subcategory_id),
  delivery_type = case
    when l.delivery_available is true then 'both'
    else l.delivery_type
  end,
  condition_code = case
    when l.condition_code is not null then l.condition_code
    when l.condition in ('Yeni', 'new') then 'new'
    when l.condition in ('Əla', 'excellent') then 'excellent'
    when l.condition in ('İşlənmiş', 'Yaxşı', 'good') then 'good'
    when l.condition in ('Orta', 'fair') then 'fair'
    else null
  end
from legacy_target lt
where l.id = lt.id;

with old_category_target(old_slug, new_category_slug, new_subcategory_slug) as (
  values
    ('avto', 'neqliyyat', 'minik-avtomobili'),
    ('telefon', 'elektronika', 'telefonlar'),
    ('geyim', 'geyim-ve-aksesuar', null)
)
update public.listings l
set
  category_id = new_c.id,
  subcategory_id = coalesce(new_s.id, l.subcategory_id)
from old_category_target t
join public.categories old_c on old_c.slug = t.old_slug
join public.categories new_c on new_c.slug = t.new_category_slug
left join public.subcategories new_s
  on new_s.category_id = new_c.id and new_s.slug = t.new_subcategory_slug
where l.category_id = old_c.id;

update public.listings l
set
  category_id = c.id,
  subcategory_id = coalesce(l.subcategory_id, s.id)
from public.categories c
left join public.subcategories s on s.category_id = c.id and s.slug = 'diger-elanlar'
where c.slug = 'diger'
  and l.category_id is null;

alter table public.listings enable trigger listings_before_update;

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

alter table public.category_aliases enable row level security;

drop policy if exists "category_aliases_select_active" on public.category_aliases;
create policy "category_aliases_select_active"
  on public.category_aliases
  for select
  to anon, authenticated
  using (is_active or public.is_admin());

drop policy if exists "category_aliases_admin_all" on public.category_aliases;
create policy "category_aliases_admin_all"
  on public.category_aliases
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
