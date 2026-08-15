-- Free image similarity index. Hashes are private metadata; public callers only use the safe RPC below.

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text,
  public_url text not null,
  image_hash text check (image_hash is null or image_hash ~ '^[0-9a-f]{16}$'),
  color_hash text check (color_hash is null or color_hash ~ '^[0-9a-f]{3}$'),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  created_at timestamptz not null default now(),
  unique (listing_id, public_url)
);

create index if not exists listing_images_listing_id_idx
  on public.listing_images (listing_id);

create index if not exists listing_images_hash_idx
  on public.listing_images (image_hash)
  where image_hash is not null;

alter table public.listing_images enable row level security;

create or replace function public.listing_image_storage_path(p_url text)
returns text
language sql
immutable
strict
as $$
  select nullif(
    regexp_replace(
      p_url,
      '^.*/storage/v1/object/public/listing-images/',
      ''
    ),
    ''
  );
$$;

create or replace function public.sync_listing_image_index()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_urls text[];
  v_url text;
begin
  select array_agg(distinct value)
  into v_urls
  from unnest(array_append(coalesce(new.image_urls, '{}'::text[]), new.image_url)) as value
  where value is not null and btrim(value) <> '';

  if coalesce(array_length(v_urls, 1), 0) = 0 then
    delete from public.listing_images where listing_id = new.id;
    return new;
  end if;

  delete from public.listing_images
  where listing_id = new.id
    and public_url <> all(v_urls);

  foreach v_url in array v_urls loop
    insert into public.listing_images (listing_id, storage_path, public_url)
    values (new.id, public.listing_image_storage_path(v_url), v_url)
    on conflict (listing_id, public_url)
    do update set storage_path = excluded.storage_path;
  end loop;

  return new;
end;
$$;

drop trigger if exists listing_images_sync_from_listing on public.listings;
create trigger listing_images_sync_from_listing
  after insert or update of image_url, image_urls on public.listings
  for each row
  execute function public.sync_listing_image_index();

create or replace function public.hex_hamming_distance(p_left text, p_right text)
returns integer
language plpgsql
immutable
strict
as $$
declare
  v_index integer;
  v_left_nibble integer;
  v_right_nibble integer;
  v_xor integer;
  v_distance integer := 0;
  v_hex constant text := '0123456789abcdef';
begin
  if lower(p_left) !~ '^[0-9a-f]{16}$' or lower(p_right) !~ '^[0-9a-f]{16}$' then
    return null;
  end if;

  for v_index in 1..16 loop
    v_left_nibble := strpos(v_hex, substr(lower(p_left), v_index, 1)) - 1;
    v_right_nibble := strpos(v_hex, substr(lower(p_right), v_index, 1)) - 1;
    v_xor := v_left_nibble # v_right_nibble;

    while v_xor > 0 loop
      v_distance := v_distance + 1;
      v_xor := v_xor & (v_xor - 1);
    end loop;
  end loop;

  return v_distance;
end;
$$;

create or replace function public.color_hash_distance(p_left text, p_right text)
returns integer
language plpgsql
immutable
strict
as $$
declare
  v_index integer;
  v_distance integer := 0;
  v_hex constant text := '0123456789abcdef';
begin
  if lower(p_left) !~ '^[0-9a-f]{3}$' or lower(p_right) !~ '^[0-9a-f]{3}$' then
    return null;
  end if;

  for v_index in 1..3 loop
    v_distance := v_distance + abs(
      (strpos(v_hex, substr(lower(p_left), v_index, 1)) - 1)
      -
      (strpos(v_hex, substr(lower(p_right), v_index, 1)) - 1)
    );
  end loop;

  return v_distance;
end;
$$;

create or replace function public.search_listing_images(
  p_image_hash text,
  p_color_hash text,
  p_limit integer default 20
)
returns table (
  id uuid,
  listing_number bigint,
  user_id uuid,
  title text,
  price numeric,
  category text,
  category_id uuid,
  subcategory_id uuid,
  attributes jsonb,
  listing_type text,
  price_type text,
  delivery_type text,
  city text,
  condition text,
  condition_code text,
  description text,
  delivery_available boolean,
  is_sample boolean,
  source text,
  image_url text,
  image_urls text[],
  status public.listing_status,
  sold_at timestamptz,
  created_at timestamptz,
  match_label text,
  similarity_score integer,
  hash_distance integer
)
language sql
security definer
set search_path = public
as $$
  with ranked_images as (
    select
      l.id as listing_id,
      public.hex_hamming_distance(li.image_hash, p_image_hash) as image_distance,
      public.color_hash_distance(li.color_hash, p_color_hash) as image_color_distance,
      row_number() over (
        partition by l.id
        order by
          public.hex_hamming_distance(li.image_hash, p_image_hash),
          public.color_hash_distance(li.color_hash, p_color_hash),
          li.created_at asc
      ) as image_rank
    from public.listing_images li
    join public.listings l on l.id = li.listing_id
    where l.status = 'active'
      and coalesce(l.is_sample, false) = false
      and lower(coalesce(l.source, '')) not in ('sample', 'old_ai_draft', 'import_test', 'test')
      and coalesce(l.source_url, '') not like 'import-test://%'
      and lower(coalesce(l.title, '')) not like '%import test%'
      and li.image_hash is not null
      and li.color_hash is not null
  ), candidates as (
    select *
    from ranked_images
    where image_rank = 1
      and image_distance <= 28
  )
  select
    l.id,
    l.listing_number,
    l.user_id,
    l.title,
    l.price,
    l.category,
    l.category_id,
    l.subcategory_id,
    l.attributes,
    l.listing_type::text,
    l.price_type::text,
    l.delivery_type::text,
    l.city,
    l.condition,
    l.condition_code::text,
    l.description,
    l.delivery_available,
    l.is_sample,
    l.source,
    l.image_url,
    l.image_urls,
    l.status,
    l.sold_at,
    l.created_at,
    case
      when c.image_distance <= 8 then 'Eyni şəkilə yaxın'
      when c.image_distance <= 16 then 'Çox oxşar şəkil'
      else 'Oxşar elan'
    end as match_label,
    greatest(
      0,
      100 - round((c.image_distance::numeric / 28) * 80 + (c.image_color_distance::numeric / 45) * 20)
    )::integer as similarity_score,
    c.image_distance as hash_distance
  from candidates c
  join public.listings l on l.id = c.listing_id
  order by
    c.image_distance asc,
    c.image_color_distance asc,
    l.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 20);
$$;

revoke all on function public.search_listing_images(text, text, integer) from public;
grant execute on function public.search_listing_images(text, text, integer) to anon, authenticated;
