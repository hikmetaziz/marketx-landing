-- MarktX: Storage-da faylı olmayan (qırıq şəkil) elanları silmək
-- Supabase SQL Editor — addımları SIRAYLA işlədin.
--
-- Xəta səbəbi: reports.listing_id → ON DELETE SET NULL, amma
-- reports_target_context tələb edir: target_type='listing' → listing_id NOT NULL
-- Ona görə əvvəl reports silinməlidir.

-- === 0) Köməkçi: silinəcək elan id-ləri ===
-- (yalnız baxış üçün)
with broken as (
  select
    l.id,
    l.slug,
    l.title,
    l.status,
    public.listing_image_storage_path(l.image_url) as storage_path
  from public.listings l
  where l.status in ('active', 'sold', 'pending')
    and coalesce(nullif(trim(l.image_url), ''), '') <> ''
)
select b.id, b.slug, b.title, b.status, b.storage_path
from broken b
where b.storage_path is not null
  and not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'listing-images'
      and o.name = b.storage_path
  )
order by b.title;

-- Neçə elan + neçə report?
with broken_ids as (
  select l.id
  from public.listings l
  where l.status in ('active', 'sold', 'pending')
    and coalesce(nullif(trim(l.image_url), ''), '') <> ''
    and public.listing_image_storage_path(l.image_url) is not null
    and not exists (
      select 1
      from storage.objects o
      where o.bucket_id = 'listing-images'
        and o.name = public.listing_image_storage_path(l.image_url)
    )
)
select
  (select count(*) from broken_ids) as broken_listings,
  (
    select count(*)
    from public.reports r
    where r.target_type = 'listing'
      and r.listing_id in (select id from broken_ids)
  ) as related_reports;

-- === 1) Əvvəl reports (MÜTLƏQ) ===
-- delete from public.reports r
-- where r.target_type = 'listing'
--   and r.listing_id in (
--     select l.id
--     from public.listings l
--     where l.status in ('active', 'sold', 'pending')
--       and coalesce(nullif(trim(l.image_url), ''), '') <> ''
--       and public.listing_image_storage_path(l.image_url) is not null
--       and not exists (
--         select 1
--         from storage.objects o
--         where o.bucket_id = 'listing-images'
--           and o.name = public.listing_image_storage_path(l.image_url)
--       )
--   );

-- === 2) Sonra elanlar ===
-- delete from public.listings l
-- where l.id in (
--   select l2.id
--   from public.listings l2
--   where l2.status in ('active', 'sold', 'pending')
--     and coalesce(nullif(trim(l2.image_url), ''), '') <> ''
--     and public.listing_image_storage_path(l2.image_url) is not null
--     and not exists (
--       select 1
--       from storage.objects o
--       where o.bucket_id = 'listing-images'
--         and o.name = public.listing_image_storage_path(l2.image_url)
--     )
-- );

-- === 3) Yoxlama ===
-- select status, count(*) from public.listings group by status;
