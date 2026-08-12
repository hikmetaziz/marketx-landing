-- MarktX: Storage cleanup queue
-- Elan silinəndə (mobil / veb / admin / birbaşa SQL) əlaqəli şəkil path-ləri
-- növbəyə yazılır; Edge Function (cleanup-storage-queue) service role ilə
-- həmin faylları `listing-images` bucket-indən silir.
-- Mövcud silmə kodları DƏYİŞMİR — bu, DB səviyyəsində avtomatik təhlükəsizlik şəbəkəsidir.

-- 1) Növbə cədvəli
create table if not exists public.storage_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null default 'listing-images',
  object_paths text[] not null,
  listing_id uuid,
  source text not null default 'listing_delete',
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint storage_cleanup_queue_status_check
    check (status in ('pending', 'done', 'failed'))
);

create index if not exists storage_cleanup_queue_pending_idx
  on public.storage_cleanup_queue (created_at)
  where status = 'pending';

-- 2) RLS: yalnız service role girə bilər (heç bir policy yoxdur → anon/authenticated bloklanır)
alter table public.storage_cleanup_queue enable row level security;

revoke all on public.storage_cleanup_queue from anon, authenticated;

-- 3) Elanın bütün şəkil path-lərini toplayan köməkçi funksiya
-- listing_images.storage_path + image_url/image_urls parse (təkrarsız)
create or replace function public.collect_listing_image_paths(p_listing_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct path), '{}'::text[])
  from (
    select storage_path as path
    from public.listing_images
    where listing_id = p_listing_id
      and storage_path is not null
      and btrim(storage_path) <> ''

    union

    select public.listing_image_storage_path(value) as path
    from public.listings l
    cross join lateral unnest(
      array_append(coalesce(l.image_urls, '{}'::text[]), l.image_url)
    ) as value
    where l.id = p_listing_id
      and value is not null
      and btrim(value) <> ''
      and public.listing_image_storage_path(value) is not null
  ) paths
  where path is not null and btrim(path) <> '';
$$;

-- 4) BEFORE DELETE trigger: path-ləri növbəyə yaz (cascade silməsindən əvvəl)
create or replace function public.enqueue_listing_image_cleanup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paths text[];
begin
  v_paths := public.collect_listing_image_paths(old.id);

  if coalesce(array_length(v_paths, 1), 0) > 0 then
    insert into public.storage_cleanup_queue (object_paths, listing_id, source)
    values (v_paths, old.id, 'listing_delete');
  end if;

  return old;
end;
$$;

drop trigger if exists listings_enqueue_image_cleanup on public.listings;
create trigger listings_enqueue_image_cleanup
  before delete on public.listings
  for each row
  execute function public.enqueue_listing_image_cleanup();

revoke all on function public.collect_listing_image_paths(uuid) from public;
revoke all on function public.enqueue_listing_image_cleanup() from public;